"""
PC Agent - 마스터 PC에서 실행되는 워커
Laixi와 중앙 서버 사이의 브릿지 역할

실행: python pc_agent.py --pc-id PC1 --server https://your-server.com
"""
import asyncio
import argparse
import json
import subprocess
import httpx
from datetime import datetime
from typing import Optional, Dict, Any
import logging
import sys
from pathlib import Path

# shared 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.laixi_client import LaixiClient, LaixiConfig

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('pc_agent.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class PCAgent:
    """
    PC Agent - 중앙 서버와 Laixi 사이의 브릿지
    
    역할:
    1. 중앙 서버에서 작업 가져오기 (폴링)
    2. Laixi에 작업 전달 (WebSocket)
    3. 결과를 중앙 서버에 보고
    4. 기기 상태 하트비트 전송
    """
    
    def __init__(self, pc_id: str, server_url: str, api_key: str):
        self.pc_id = pc_id
        self.server_url = server_url.rstrip('/')
        self.api_key = api_key

        self.is_running = False
        self.current_task: Optional[Dict] = None
        self.devices: Dict[str, Dict] = {}  # device_id -> device_info

        # HTTP 클라이언트
        self.http_client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )

        # Laixi 클라이언트 (ws://127.0.0.1:22221/)
        self.laixi = LaixiClient()
    
    async def start(self):
        """에이전트 시작"""
        logger.info(f"PC Agent 시작: PC_ID={self.pc_id}")
        logger.info(f"서버: {self.server_url}")

        self.is_running = True

        # 1. Laixi 연결
        if not await self.laixi.connect():
            logger.error("Laixi 연결 실패")
            return

        # 2. 연결된 기기 등록
        await self.register_devices()

        # 3. 병렬 태스크 시작
        await asyncio.gather(
            self.heartbeat_loop(),      # 하트비트 (10초마다)
            self.task_polling_loop()    # 작업 폴링 (5초마다)
        )
    
    async def stop(self):
        """에이전트 중지"""
        logger.info("PC Agent 중지 중...")
        self.is_running = False
        await self.http_client.aclose()
        await self.laixi.disconnect()
    
    # ==================== 기기 관리 ====================
    
    async def register_devices(self):
        """ADB로 연결된 기기 등록"""
        logger.info("연결된 기기 검색 중...")
        
        try:
            # ADB 기기 목록 가져오기
            result = subprocess.run(
                ['adb', 'devices'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            lines = result.stdout.strip().split('\n')[1:]  # 첫 줄 헤더 제외
            
            for line in lines:
                if '\tdevice' in line:
                    serial = line.split('\t')[0]
                    
                    # 서버에 기기 등록
                    response = await self.http_client.post(
                        f"{self.server_url}/devices",
                        json={
                            "serial_number": serial,
                            "pc_id": self.pc_id,
                            "model": await self.get_device_model(serial)
                        }
                    )
                    
                    if response.status_code == 200:
                        device_data = response.json()
                        self.devices[device_data['id']] = device_data
                        logger.info(f"기기 등록 완료: {serial}")
                    else:
                        logger.warning(f"기기 등록 실패: {serial}")
            
            logger.info(f"총 {len(self.devices)}대 기기 등록됨")
            
        except Exception as e:
            logger.error(f"기기 등록 오류: {e}")
    
    async def get_device_model(self, serial: str) -> str:
        """기기 모델명 가져오기"""
        try:
            result = subprocess.run(
                ['adb', '-s', serial, 'shell', 'getprop', 'ro.product.model'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip() or "Unknown"
        except:
            return "Unknown"
    
    async def get_device_health(self, serial: str) -> Dict:
        """기기 상태 가져오기"""
        health = {
            "battery_temp": None,
            "cpu_usage": None,
            "battery_level": None
        }
        
        try:
            # 배터리 정보
            result = subprocess.run(
                ['adb', '-s', serial, 'shell', 'dumpsys', 'battery'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            for line in result.stdout.split('\n'):
                if 'temperature' in line.lower():
                    temp = int(line.split(':')[1].strip()) / 10
                    health['battery_temp'] = temp
                elif 'level' in line.lower():
                    health['battery_level'] = int(line.split(':')[1].strip())
            
        except Exception as e:
            logger.debug(f"헬스 정보 가져오기 실패: {e}")
        
        return health
    
    # ==================== 서버 통신 ====================
    
    async def heartbeat_loop(self):
        """하트비트 전송 (10초마다)"""
        while self.is_running:
            try:
                for device_id, device_info in self.devices.items():
                    health = await self.get_device_health(device_info['serial_number'])
                    
                    await self.http_client.post(
                        f"{self.server_url}/devices/{device_id}/heartbeat",
                        json=health
                    )
                
                logger.debug(f"하트비트 전송: {len(self.devices)}대")
                
            except Exception as e:
                logger.error(f"하트비트 오류: {e}")
            
            await asyncio.sleep(10)
    
    async def task_polling_loop(self):
        """작업 폴링 (5초마다)"""
        while self.is_running:
            try:
                # 현재 작업 중이면 스킵
                if self.current_task:
                    await asyncio.sleep(5)
                    continue
                
                # 대기 중인 기기 찾기
                idle_device = self.find_idle_device()
                if not idle_device:
                    await asyncio.sleep(5)
                    continue
                
                # 작업 요청
                response = await self.http_client.get(
                    f"{self.server_url}/tasks/next",
                    params={"device_id": idle_device['id']}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('task'):
                        task = data['task']
                        video = data.get('video', {})
                        
                        logger.info(f"새 작업 수신: {task['id'][:8]}...")
                        
                        # Laixi로 작업 전달
                        await self.execute_task(task, video, idle_device)
                
            except Exception as e:
                logger.error(f"폴링 오류: {e}")
            
            await asyncio.sleep(5)
    
    def find_idle_device(self) -> Optional[Dict]:
        """대기 중인 기기 찾기"""
        for device_id, device_info in self.devices.items():
            if device_info.get('status') in ['idle', None]:
                return {'id': device_id, **device_info}
        return None
    
    # ==================== Laixi 연동 ====================
    
    async def execute_task(self, task: Dict, video: Dict, device: Dict):
        """Laixi로 작업 실행"""
        self.current_task = task

        try:
            # 작업 시작 알림
            await self.http_client.post(
                f"{self.server_url}/tasks/{task['id']}/start"
            )

            # Laixi를 통해 YouTube 앱 실행 및 시청
            serial = device.get('serial_number', '')
            video_url = video.get('url', '')

            logger.info(f"Laixi로 작업 실행: {task['id'][:8]}... on {serial}")

            # 1. YouTube 앱 실행
            await self.laixi.execute_adb(
                serial,
                f"am start -a android.intent.action.VIEW -d {video_url}"
            )
            await asyncio.sleep(3)

            # 2. 시청 시간
            watch_time = task.get('watch_time_seconds', 30)
            logger.info(f"시청 중... ({watch_time}초)")
            await asyncio.sleep(watch_time)

            # 3. 작업 완료 처리
            await self.on_task_complete({
                "task_id": task['id'],
                "device_id": device['id'],
                "watch_time": watch_time,
                "total_duration": watch_time,
                "liked": False,
                "commented": False
            })

        except Exception as e:
            logger.error(f"작업 실행 오류: {e}")
            await self.on_task_error({
                "task_id": task['id'],
                "error": str(e)
            })
    
    async def on_task_complete(self, data: Dict):
        """작업 완료 처리"""
        if not self.current_task:
            return
        
        task_id = self.current_task['id']
        
        try:
            # 결과 전송
            await self.http_client.post(
                f"{self.server_url}/tasks/{task_id}/complete",
                params={"success": True}
            )
            
            # 상세 결과 전송
            await self.http_client.post(
                f"{self.server_url}/results",
                json={
                    "task_id": task_id,
                    "device_id": data.get('device_id', ''),
                    "watch_time": data.get('watch_time', 0),
                    "total_duration": data.get('total_duration', 0),
                    "liked": data.get('liked', False),
                    "commented": data.get('commented', False),
                    "comment_text": data.get('comment_text'),
                    "search_type": data.get('search_type', 1),
                    "search_rank": data.get('search_rank', 0)
                }
            )
            
            logger.info(f"작업 완료: {task_id[:8]}...")
            
        except Exception as e:
            logger.error(f"완료 보고 오류: {e}")
        
        finally:
            self.current_task = None
    
    async def on_task_error(self, data: Dict):
        """작업 실패 처리"""
        if not self.current_task:
            return
        
        task_id = self.current_task['id']
        error_msg = data.get('error', 'Unknown error')
        
        try:
            await self.http_client.post(
                f"{self.server_url}/tasks/{task_id}/complete",
                params={"success": False, "error_message": error_msg}
            )
            
            logger.error(f"작업 실패: {task_id[:8]}... - {error_msg}")
            
        except Exception as e:
            logger.error(f"실패 보고 오류: {e}")
        
        finally:
            self.current_task = None


# ==================== 메인 ====================

async def main():
    parser = argparse.ArgumentParser(description='PC Agent for YouTube Automation with Laixi')
    parser.add_argument('--pc-id', required=True, help='PC 식별자 (예: PC1)')
    parser.add_argument('--server', required=True, help='중앙 서버 URL')
    parser.add_argument('--api-key', default='test-key-123', help='API 키')

    args = parser.parse_args()

    agent = PCAgent(
        pc_id=args.pc_id,
        server_url=args.server,
        api_key=args.api_key
    )

    try:
        await agent.start()
    except KeyboardInterrupt:
        logger.info("종료 요청...")
    finally:
        await agent.stop()


if __name__ == "__main__":
    asyncio.run(main())

