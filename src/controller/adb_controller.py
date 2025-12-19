"""ADB 명령 실행 컨트롤러"""

import subprocess
import logging
from typing import List, Optional, Dict
from concurrent.futures import ThreadPoolExecutor

from src.utils.ip_generator import generate_ips, format_device_address

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ADBController:
    """ADB 명령 실행 클래스"""
    
    def __init__(self, adb_path: str = "adb"):
        """
        Args:
            adb_path: ADB 실행 파일 경로
        """
        self.adb_path = adb_path
    
    def connect_device(self, ip: str, port: int = 5555) -> bool:
        """
        단일 디바이스 연결
        
        Args:
            ip: 디바이스 IP 주소
            port: 포트 번호
            
        Returns:
            연결 성공 여부
        """
        try:
            address = format_device_address(ip, port)
            result = subprocess.run(
                [self.adb_path, "connect", address],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                logger.info(f"✓ {address} 연결 성공")
                return True
            else:
                logger.error(f"✗ {address} 연결 실패: {result.stderr}")
                return False
        except Exception as e:
            logger.error(f"✗ {ip}:{port} 연결 실패: {e}")
            return False
    
    def connect_all(self, ips: Optional[List[str]] = None, port: int = 5555, max_workers: int = 50) -> Dict[str, bool]:
        """
        전체 디바이스 병렬 연결
        
        Args:
            ips: IP 주소 리스트 (None이면 기본 600대 생성)
            port: 포트 번호
            max_workers: 최대 동시 연결 수
            
        Returns:
            연결 결과 딕셔너리
        """
        if ips is None:
            ips = generate_ips()
        
        results = {}
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.connect_device, ip, port): ip for ip in ips}
            for future in futures:
                ip = futures[future]
                results[ip] = future.result()
        
        success_count = sum(results.values())
        logger.info(f"\n=== 연결 완료: {success_count}/{len(ips)} ===")
        
        return results
    
    def execute_command(self, ip: str, command: str, port: int = 5555) -> Optional[str]:
        """
        단일 디바이스에 ADB 명령 실행
        
        Args:
            ip: 디바이스 IP 주소
            command: 실행할 명령어
            port: 포트 번호
            
        Returns:
            명령 실행 결과 또는 None
        """
        try:
            address = format_device_address(ip, port)
            result = subprocess.run(
                [self.adb_path, "-s", address, "shell", command],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                return result.stdout
            else:
                logger.error(f"✗ {address} 명령 실행 실패: {result.stderr}")
                return None
        except Exception as e:
            logger.error(f"✗ {ip}:{port} 명령 실행 실패: {e}")
            return None
    
    def execute_on_all(self, command: str, port: int = 5555, max_workers: int = 50) -> Dict[str, bool]:
        """
        전체 디바이스에 동시 명령 실행
        
        Args:
            command: 실행할 명령어
            port: 포트 번호
            max_workers: 최대 동시 실행 수
            
        Returns:
            실행 결과 딕셔너리
        """
        ips = generate_ips()
        results = {}
        
        def wrapper(ip):
            result = self.execute_command(ip, command, port)
            return result is not None
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(wrapper, ip): ip for ip in ips}
            for future in futures:
                ip = futures[future]
                results[ip] = future.result()
        
        success_count = sum(results.values())
        logger.info(f"=== 전체 실행 완료: {success_count}/{len(ips)} ===")
        
        return results
    
    def get_devices(self) -> List[str]:
        """
        연결된 디바이스 목록 가져오기
        
        Returns:
            디바이스 주소 리스트
        """
        try:
            result = subprocess.run(
                [self.adb_path, "devices"],
                capture_output=True,
                text=True,
                timeout=10
            )
            devices = []
            for line in result.stdout.split('\n')[1:]:
                if line.strip() and '\tdevice' in line:
                    devices.append(line.split('\t')[0])
            return devices
        except Exception as e:
            logger.error(f"디바이스 목록 가져오기 실패: {e}")
            return []

