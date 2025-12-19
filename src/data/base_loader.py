"""데이터 로더 베이스 클래스"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
from src.modules.task_registry import TaskConfig


class DataLoader(ABC):
    """데이터 로더 추상 베이스 클래스"""
    
    @abstractmethod
    async def load_tasks(self) -> List[TaskConfig]:
        """
        태스크 설정 목록 로드
        
        Returns:
            TaskConfig 리스트
        """
        raise NotImplementedError
    
    @abstractmethod
    async def load_raw_data(self) -> List[Dict[str, Any]]:
        """
        원시 데이터 로드
        
        Returns:
            딕셔너리 리스트
        """
        raise NotImplementedError
    
    def parse_task_config(self, data: Dict[str, Any]) -> TaskConfig:
        """
        딕셔너리를 TaskConfig로 변환
        
        Args:
            data: 원시 데이터 딕셔너리
            
        Returns:
            TaskConfig 인스턴스
        """
        return TaskConfig(
            name=data.get("name", "unnamed"),
            target_devices=data.get("target_devices", []),
            parameters=data.get("parameters", {}),
            retry_count=data.get("retry_count", 3),
            timeout=data.get("timeout", 300)
        )

