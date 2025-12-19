"""디바이스 연결 및 관리"""

import uiautomator2 as u2
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Optional, Callable
import logging

from src.utils.ip_generator import generate_ips, format_device_address

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeviceManager:
    """디바이스 연결 및 관리 클래스"""
    
    def __init__(self, port: int = 5555, wait_timeout: int = 5):
        """
        Args:
            port: ADB 포트 번호
            wait_timeout: 대기 타임아웃 (초)
        """
        self.port = port
        self.wait_timeout = wait_timeout
        self.connections: Dict[str, u2.Device] = {}
    
    def connect_device(self, ip: str) -> bool:
        """
        단일 디바이스 연결
        
        Args:
            ip: 디바이스 IP 주소
            
        Returns:
            연결 성공 여부
        """
        try:
            address = format_device_address(ip, self.port)
            device = u2.connect(address)
            device.settings["wait_timeout"] = self.wait_timeout
            self.connections[ip] = device
            logger.info(f"✓ {ip} 연결 성공")
            return True
        except Exception as e:
            logger.error(f"✗ {ip} 연결 실패: {e}")
            return False
    
    def connect_all(self, ips: Optional[List[str]] = None, max_workers: int = 50) -> Dict[str, bool]:
        """
        전체 디바이스 병렬 연결
        
        Args:
            ips: IP 주소 리스트 (None이면 기본 600대 생성)
            max_workers: 최대 동시 연결 수
            
        Returns:
            연결 결과 딕셔너리 {ip: success}
        """
        if ips is None:
            ips = generate_ips()
        
        results = {}
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.connect_device, ip): ip for ip in ips}
            for future in futures:
                ip = futures[future]
                results[ip] = future.result()
        
        success_count = sum(results.values())
        logger.info(f"\n=== 연결 완료: {success_count}/{len(ips)} ===")
        
        return results
    
    def disconnect_device(self, ip: str) -> bool:
        """
        단일 디바이스 연결 해제
        
        Args:
            ip: 디바이스 IP 주소
            
        Returns:
            해제 성공 여부
        """
        if ip in self.connections:
            del self.connections[ip]
            logger.info(f"✓ {ip} 연결 해제")
            return True
        return False
    
    def disconnect_all(self):
        """전체 디바이스 연결 해제"""
        self.connections.clear()
        logger.info("전체 디바이스 연결 해제 완료")
    
    def get_device(self, ip: str) -> Optional[u2.Device]:
        """
        디바이스 객체 가져오기
        
        Args:
            ip: 디바이스 IP 주소
            
        Returns:
            uiautomator2 Device 객체 또는 None
        """
        return self.connections.get(ip)
    
    def get_connected_ips(self) -> List[str]:
        """
        연결된 디바이스 IP 목록 반환
        
        Returns:
            연결된 IP 주소 리스트
        """
        return list(self.connections.keys())
    
    def execute_on_device(self, ip: str, action: Callable[[u2.Device], any]) -> bool:
        """
        단일 디바이스에 액션 실행
        
        Args:
            ip: 디바이스 IP 주소
            action: 실행할 액션 함수 (device를 인자로 받음)
            
        Returns:
            실행 성공 여부
        """
        try:
            device = self.connections.get(ip)
            if device:
                action(device)
                return True
            else:
                logger.warning(f"✗ {ip}: 연결되지 않은 디바이스")
                return False
        except Exception as e:
            logger.error(f"✗ {ip} 실행 실패: {e}")
            return False
    
    def execute_on_all(self, action: Callable[[u2.Device], any], max_workers: int = 50) -> Dict[str, bool]:
        """
        전체 디바이스에 액션 실행
        
        Args:
            action: 실행할 액션 함수 (device를 인자로 받음)
            max_workers: 최대 동시 실행 수
            
        Returns:
            실행 결과 딕셔너리 {ip: success}
        """
        ips = list(self.connections.keys())
        results = {}
        
        def wrapper(ip):
            return self.execute_on_device(ip, action)
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(wrapper, ip): ip for ip in ips}
            for future in futures:
                ip = futures[future]
                results[ip] = future.result()
        
        success_count = sum(results.values())
        logger.info(f"=== 실행 완료: {success_count}/{len(ips)} ===")
        
        return results
    
    def execute_batch(self, action: Callable[[u2.Device], any], batch_size: int = 50) -> Dict[str, bool]:
        """
        배치 단위로 액션 실행
        
        Args:
            action: 실행할 액션 함수
            batch_size: 배치 크기
            
        Returns:
            실행 결과 딕셔너리
        """
        ips = list(self.connections.keys())
        all_results = {}
        
        for i in range(0, len(ips), batch_size):
            batch = ips[i:i+batch_size]
            logger.info(f"\n배치 {i//batch_size + 1} 시작 ({len(batch)}대)")
            
            batch_results = {}
            with ThreadPoolExecutor(max_workers=batch_size) as executor:
                futures = {executor.submit(self.execute_on_device, ip, action): ip for ip in batch}
                for future in futures:
                    ip = futures[future]
                    batch_results[ip] = future.result()
            
            all_results.update(batch_results)
            success = sum(batch_results.values())
            logger.info(f"배치 완료: {success}/{len(batch)}")
        
        return all_results

