"""
Job Executor
실제 작업 실행 (Laixi, ADB 제어)

@author Axon (Builder)
@version 1.0.0 (P0)
"""

import subprocess
import json
from typing import List, Dict, Any


class JobExecutor:
    """
    Job 실행기
    
    Laixi WSAPI를 통해 실제 디바이스 제어
    """
    
    def __init__(self, logger):
        self.logger = logger
    
    async def execute(self, action: str, params: dict, device_ids: List[str]) -> Dict[str, Any]:
        """
        Job 실행
        
        Args:
            action: 작업 유형 (YOUTUBE_OPEN_URL, RECOVER_LAIXI 등)
            params: 작업 파라미터
            device_ids: 대상 디바이스 (['all'] 또는 특정 ID)
        
        Returns:
            실행 결과
        """
        self.logger.info(f"🎬 Job 실행: {action}")
        
        if action == 'YOUTUBE_OPEN_URL':
            return await self.youtube_open_url(params, device_ids)
        
        elif action == 'RECOVER_LAIXI':
            return await self.recover_laixi(params)
        
        elif action == 'RECOVER_ADB':
            return await self.recover_adb(params)
        
        elif action == 'DEVICE_SNAPSHOT':
            return await self.get_device_snapshot()
        
        else:
            raise ValueError(f"알 수 없는 action: {action}")
    
    async def youtube_open_url(self, params: dict, device_ids: List[str]) -> dict:
        """
        YouTube URL 열기
        
        Laixi를 통해 디바이스에 명령 전송
        """
        url = params.get('url')
        
        self.logger.info(f"📺 YouTube 열기: {url}")
        
        # TODO: Laixi WSAPI 호출
        # 현재는 시뮬레이션
        
        # 예시: doai-sdk 사용
        # from doai_sdk import LaixiClient
        # client = LaixiClient('localhost', 8800)
        # result = client.execute_script('自动上传脚本本.js', params={'url': url})
        
        # 시뮬레이션
        self.logger.info(f"  → {len(device_ids)}대 디바이스에 전송")
        
        return {
            'success': True,
            'device_count': len(device_ids) if device_ids != ['all'] else 120,
            'url': url
        }
    
    async def recover_laixi(self, params: dict) -> dict:
        """
        Laixi 프로세스 재시작
        
        자동복구: RECOVER_LAIXI
        """
        self.logger.warn("🔧 Laixi 재시작 시작")
        
        try:
            # Laixi 프로세스 종료
            result = subprocess.run(
                ['taskkill', '/F', '/IM', 'touping.exe'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            self.logger.info(f"  → 프로세스 종료: {result.returncode}")
            
            # Laixi 재시작
            subprocess.Popen(
                ['C:\\path\\to\\laixi\\touping.exe'],  # 실제 경로로 변경
                cwd='C:\\path\\to\\laixi'
            )
            
            self.logger.info("✅ Laixi 재시작 완료")
            
            return {'success': True, 'message': 'Laixi restarted'}
            
        except Exception as e:
            self.logger.error(f"❌ Laixi 재시작 실패: {e}")
            return {'success': False, 'error': str(e)}
    
    async def recover_adb(self, params: dict) -> dict:
        """
        ADB 서버 재시작
        
        자동복구: RECOVER_ADB
        """
        self.logger.warn("🔧 ADB 재시작 시작")
        
        try:
            # ADB 서버 종료
            subprocess.run(['adb', 'kill-server'], timeout=5)
            self.logger.info("  → ADB 서버 종료")
            
            # ADB 서버 시작
            subprocess.run(['adb', 'start-server'], timeout=10)
            self.logger.info("  → ADB 서버 시작")
            
            # 디바이스 목록 확인
            result = subprocess.run(
                ['adb', 'devices'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            device_count = len([line for line in result.stdout.split('\n') if '\tdevice' in line])
            
            self.logger.info(f"✅ ADB 재시작 완료 (디바이스: {device_count}대)")
            
            return {
                'success': True,
                'device_count': device_count
            }
            
        except Exception as e:
            self.logger.error(f"❌ ADB 재시작 실패: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_device_snapshot(self) -> dict:
        """
        디바이스 스냅샷 조회
        
        ADB devices 목록 반환
        """
        try:
            result = subprocess.run(
                ['adb', 'devices', '-l'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            devices = []
            for line in result.stdout.split('\n'):
                if '\tdevice' in line:
                    serial = line.split('\t')[0]
                    devices.append({
                        'id': serial,
                        'status': 'idle'  # TODO: 실제 상태 조회
                    })
            
            return {
                'success': True,
                'devices': devices
            }
            
        except Exception as e:
            self.logger.error(f"디바이스 조회 실패: {e}")
            return {'success': False, 'devices': []}
    
    def get_device_count(self) -> int:
        """연결된 디바이스 수"""
        try:
            result = subprocess.run(
                ['adb', 'devices'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return len([line for line in result.stdout.split('\n') if '\tdevice' in line])
        except:
            return 0
    
    def check_laixi_status(self) -> str:
        """Laixi 상태 확인"""
        try:
            # Windows: tasklist로 프로세스 확인
            result = subprocess.run(
                ['tasklist', '/FI', 'IMAGENAME eq touping.exe'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if 'touping.exe' in result.stdout:
                return 'ok'
            else:
                return 'not_running'
        except:
            return 'unknown'
    
    def check_adb_status(self) -> str:
        """ADB 상태 확인"""
        try:
            subprocess.run(['adb', 'version'], capture_output=True, timeout=3)
            return 'ok'
        except:
            return 'error'
