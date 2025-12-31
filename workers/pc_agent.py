"""
PC Agent - 마스터 PC에서 실행되는 워커
Laixi와 Supabase(DB) 사이의 브릿지 역할

실행 방법:
  python pc_agent.py --pc-id 1

환경 변수 (.env):
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=xxx
  PC_ID=1 (선택, CLI 인자로 대체 가능)
"""

import asyncio
import argparse
import os
import subprocess
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import logging
import sys
from pathlib import Path
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# shared 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.laixi_client import LaixiClient, LaixiConfig
from shared.supabase_client import DeviceSync, JobSync, get_client

# 로깅 설정
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('pc_agent.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class PCAgent:
    """
    PC Agent - Supabase와 Laixi 사이의 브릿지
    
    역할:
    1. ADB 기기를 Supabase devices 테이블에 동기화 (Upsert)
    2. 대기 중인 작업(jobs)을 가져와 Laixi로 실행
    3. 작업 결과를 Supabase에 보고
    4. 주기적 하트비트로 기기 상태 유지
    """
    
    # 상수 정의 (매직 넘버 방지)
    HEARTBEAT_INTERVAL_SEC = 10
    TASK_POLL_INTERVAL_SEC = 5
    ADB_TIMEOUT_SEC = 10
    VIDEO_LOAD_WAIT_SEC = 3
    DEFAULT_WATCH_TIME_SEC = 30
    
    def __init__(self, pc_id: int):
        """
        Args:
            pc_id: 워크스테이션 ID (1, 2, 3...)
        """
        self.pc_id = pc_id
        self.is_running = False
        
        # 기기 관리: serial_number -> device_info (DB 데이터)
        self.devices: Dict[str, Dict] = {}
        
        # 현재 실행 중인 작업: device_serial -> job
        self.running_jobs: Dict[str, Dict] = {}
        
        # Supabase 동기화 클라이언트
        self.device_sync = DeviceSync(pc_id)
        self.job_sync = JobSync(pc_id)
        
        # Laixi 클라이언트 (ws://127.0.0.1:22221/)
        laixi_url = os.getenv("LAIXI_WS_URL", "ws://127.0.0.1:22221/")
        self.laixi = LaixiClient(LaixiConfig(ws_url=laixi_url))
        
        logger.info(f"PC Agent 초기화: PC_ID={pc_id}")
    
    async def start(self):
        """에이전트 시작"""
        logger.info(f"=== PC Agent 시작 (PC{self.pc_id}) ===")
        self.is_running = True
        
        try:
            # 1. Supabase 연결 테스트
            logger.info("Supabase 연결 확인...")
            get_client()  # 연결 실패 시 예외 발생
            logger.info("✓ Supabase 연결 성공")
            
            # 2. Laixi 연결
            logger.info("Laixi 연결 중...")
            if not await self.laixi.connect():
                logger.error("✗ Laixi 연결 실패 - touping.exe가 실행 중인지 확인하세요")
                return
            logger.info("✓ Laixi 연결 성공")
            
            # 3. 연결된 기기 Supabase에 동기화
            await self.sync_devices_to_supabase()
            
            # 4. 병렬 태스크 시작
            await asyncio.gather(
                self.heartbeat_loop(),      # 하트비트 (10초마다)
                self.task_polling_loop(),   # 작업 폴링 (5초마다)
                self.device_monitor_loop()  # 기기 모니터링 (30초마다)
            )
            
        except KeyboardInterrupt:
            logger.info("종료 요청 감지...")
        except Exception as e:
            logger.error(f"에이전트 실행 오류: {e}")
            raise
        finally:
            await self.stop()
    
    async def stop(self):
        """에이전트 중지"""
        logger.info("PC Agent 종료 중...")
        self.is_running = False
        
        # 모든 기기 offline 처리
        try:
            await self.device_sync.set_offline_all()
        except Exception as e:
            logger.error(f"기기 offline 처리 실패: {e}")
        
        # Laixi 연결 해제
        await self.laixi.disconnect()
        
        logger.info("=== PC Agent 종료 완료 ===")
    
    # ==================== 기기 관리 ====================
    
    async def sync_devices_to_supabase(self):
        """
        ADB 연결된 기기를 Supabase devices 테이블에 동기화
        
        시작 시 한 번 호출, 이후 device_monitor_loop에서 주기적 확인
        """
        logger.info("ADB 기기 검색 및 Supabase 동기화...")
        
        try:
            # ADB 기기 목록 가져오기
            result = subprocess.run(
                ['adb', 'devices'],
                capture_output=True,
                text=True,
                timeout=self.ADB_TIMEOUT_SEC
            )
            
            lines = result.stdout.strip().split('\n')[1:]  # 첫 줄 헤더 제외
            found_devices = []
            
            for line in lines:
                if '\tdevice' in line:
                    serial = line.split('\t')[0]
                    model = await self._get_device_model(serial)
                    found_devices.append({
                        "serial_number": serial,
                        "model": model
                    })
            
            if not found_devices:
                logger.warning("ADB 연결된 기기 없음")
                return
            
            # Supabase에 일괄 Upsert
            synced = await self.device_sync.bulk_upsert(found_devices)
            
            # 로컬 캐시 업데이트
            for device in synced:
                serial = device.get("serial_number")
                if serial:
                    self.devices[serial] = device
            
            logger.info(f"✓ {len(self.devices)}대 기기 동기화 완료")
            
            # 기기 목록 출력
            for serial, info in self.devices.items():
                logger.info(f"  - {serial} ({info.get('model', 'Unknown')}) [id={info.get('id')}]")
            
        except subprocess.TimeoutExpired:
            logger.error("ADB 명령 타임아웃")
        except FileNotFoundError:
            logger.error("ADB를 찾을 수 없음 - PATH에 adb가 있는지 확인하세요")
        except Exception as e:
            logger.error(f"기기 동기화 오류: {e}")
    
    async def _get_device_model(self, serial: str) -> str:
        """기기 모델명 가져오기 (ADB)"""
        try:
            result = subprocess.run(
                ['adb', '-s', serial, 'shell', 'getprop', 'ro.product.model'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip() or "Unknown"
        except Exception:
            return "Unknown"
    
    async def _get_device_health(self, serial: str) -> Dict:
        """기기 헬스 정보 가져오기 (ADB)"""
        health = {
            "battery_temp": None,
            "battery_level": None
        }
        
        try:
            result = subprocess.run(
                ['adb', '-s', serial, 'shell', 'dumpsys', 'battery'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            for line in result.stdout.split('\n'):
                if 'temperature' in line.lower():
                    # 배터리 온도는 10분의 1 단위 (예: 320 → 32.0°C)
                    temp = int(line.split(':')[1].strip()) / 10
                    health['battery_temp'] = temp
                elif 'level' in line.lower() and 'level:' in line.lower():
                    health['battery_level'] = int(line.split(':')[1].strip())
                    
        except Exception as e:
            logger.debug(f"헬스 정보 조회 실패: {serial} - {e}")
        
        return health
    
    # ==================== 주기적 태스크 ====================
    
    async def heartbeat_loop(self):
        """
        하트비트 전송 (10초마다)
        
        Supabase devices 테이블의 last_seen 업데이트
        """
        while self.is_running:
            try:
                for serial in list(self.devices.keys()):
                    health = await self._get_device_health(serial)
                    await self.device_sync.heartbeat(serial, health)
                
                logger.debug(f"하트비트 전송: {len(self.devices)}대")
                
            except Exception as e:
                logger.error(f"하트비트 오류: {e}")
            
            await asyncio.sleep(self.HEARTBEAT_INTERVAL_SEC)
    
    async def task_polling_loop(self):
        """
        작업 폴링 (5초마다)
        
        대기 중인 기기에 할당된 pending 작업을 가져와 실행
        """
        while self.is_running:
            try:
                # 대기 중인 기기 찾기
                for serial, device_info in list(self.devices.items()):
                    # 이미 작업 중이면 스킵
                    if serial in self.running_jobs:
                        continue
                    
                    device_id = device_info.get('id')
                    if not device_id:
                        continue
                    
                    # 해당 기기의 대기 작업 조회
                    job = await self.job_sync.get_pending_job(device_id)
                    
                    if job:
                        # 작업 실행 (비동기)
                        asyncio.create_task(
                            self._execute_job(serial, job)
                        )
                
            except Exception as e:
                logger.error(f"작업 폴링 오류: {e}")
            
            await asyncio.sleep(self.TASK_POLL_INTERVAL_SEC)
    
    async def device_monitor_loop(self):
        """
        기기 모니터링 (30초마다)
        
        ADB 연결 상태 확인 및 새 기기 발견 시 등록
        """
        while self.is_running:
            await asyncio.sleep(30)
            
            try:
                # ADB 기기 목록 확인
                result = subprocess.run(
                    ['adb', 'devices'],
                    capture_output=True,
                    text=True,
                    timeout=self.ADB_TIMEOUT_SEC
                )
                
                lines = result.stdout.strip().split('\n')[1:]
                current_serials = set()
                
                for line in lines:
                    if '\tdevice' in line:
                        serial = line.split('\t')[0]
                        current_serials.add(serial)
                        
                        # 새 기기 발견
                        if serial not in self.devices:
                            logger.info(f"새 기기 발견: {serial}")
                            model = await self._get_device_model(serial)
                            device = await self.device_sync.upsert_device(
                                serial, "idle", model
                            )
                            if device:
                                self.devices[serial] = device
                
                # 연결 해제된 기기 처리
                disconnected = set(self.devices.keys()) - current_serials
                for serial in disconnected:
                    logger.warning(f"기기 연결 해제: {serial}")
                    await self.device_sync.set_status(serial, "offline")
                    del self.devices[serial]
                
            except Exception as e:
                logger.error(f"기기 모니터링 오류: {e}")
    
    # ==================== 작업 실행 ====================
    
    async def _execute_job(self, serial: str, job: Dict):
        """
        Laixi를 통해 작업 실행
        
        Args:
            serial: 기기 시리얼 번호
            job: 작업 데이터 (videos 정보 포함)
        """
        job_id = job.get('id')
        video = job.get('videos', {})  # JOIN된 영상 정보
        
        logger.info(f"작업 시작: job={job_id}, device={serial}")
        
        # 실행 중 표시
        self.running_jobs[serial] = job
        await self.device_sync.set_status(serial, "busy")
        
        try:
            # 1. 작업 시작 알림
            await self.job_sync.start_job(job_id)
            
            # 2. YouTube 영상 실행
            video_url = video.get('url', '')
            if not video_url:
                raise ValueError("영상 URL이 없습니다")
            
            logger.info(f"YouTube 실행: {video_url[:50]}...")
            
            await self.laixi.execute_adb(
                serial,
                f"am start -a android.intent.action.VIEW -d {video_url}"
            )
            
            # 영상 로딩 대기
            await asyncio.sleep(self.VIDEO_LOAD_WAIT_SEC)
            
            # 3. 시청 시간
            watch_time = video.get('duration') or self.DEFAULT_WATCH_TIME_SEC
            logger.info(f"시청 중... ({watch_time}초)")
            await asyncio.sleep(watch_time)
            
            # 4. 작업 완료
            await self.job_sync.complete_job(job_id, watch_time)
            logger.info(f"작업 완료: job={job_id}")
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"작업 실패: job={job_id} - {error_msg}")
            await self.job_sync.fail_job(job_id, error_msg)
            
        finally:
            # 실행 완료 처리
            self.running_jobs.pop(serial, None)
            await self.device_sync.set_status(serial, "idle")


# ==================== 메인 ====================

async def main():
    parser = argparse.ArgumentParser(
        description='PC Agent for YouTube Automation with Laixi + Supabase'
    )
    parser.add_argument(
        '--pc-id',
        type=int,
        default=int(os.getenv('PC_ID', '1')),
        help='워크스테이션 ID (기본값: 환경변수 PC_ID 또는 1)'
    )
    
    args = parser.parse_args()
    
    agent = PCAgent(pc_id=args.pc_id)
    
    try:
        await agent.start()
    except KeyboardInterrupt:
        logger.info("Ctrl+C 감지...")
    finally:
        await agent.stop()


if __name__ == "__main__":
    asyncio.run(main())

