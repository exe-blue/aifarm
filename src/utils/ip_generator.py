"""IP 주소 생성 유틸리티"""

from typing import List
import yaml
import os


def generate_ips_from_config(config_path: str = "config/config.yaml") -> List[str]:
    """
    설정 파일에서 IP 목록 생성
    
    Args:
        config_path: 설정 파일 경로
        
    Returns:
        IP 주소 리스트 (예: ["10.0.10.1", "10.0.10.2", ...])
    """
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    
    ips = []
    for base_ip in config['network']['base_ips']:
        subnet = base_ip['subnet']
        start, end = base_ip['range']
        for i in range(start, end + 1):
            ips.append(f"{subnet}.{i}")
    
    return ips


def generate_ips() -> List[str]:
    """
    기본 설정으로 600대 IP 생성
    
    Returns:
        IP 주소 리스트 (총 600개)
    """
    ips = []
    
    # 10.0.10.1 ~ 10.0.10.254 (254대)
    for i in range(1, 255):
        ips.append(f"10.0.10.{i}")
    
    # 10.0.11.1 ~ 10.0.11.254 (254대)
    for i in range(1, 255):
        ips.append(f"10.0.11.{i}")
    
    # 10.0.12.1 ~ 10.0.12.92 (92대)
    for i in range(1, 93):
        ips.append(f"10.0.12.{i}")
    
    return ips  # 총 600개


def format_device_address(ip: str, port: int = 5555) -> str:
    """
    디바이스 주소 포맷팅
    
    Args:
        ip: IP 주소
        port: 포트 번호
        
    Returns:
        포맷된 주소 (예: "10.0.10.1:5555")
    """
    return f"{ip}:{port}"

