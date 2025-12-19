"""태스크 레지스트리 및 기본 태스크 클래스"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Type, Any, Callable
from datetime import datetime
import logging
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class TaskConfig:
    """태스크 설정 데이터 클래스"""
    name: str
    target_devices: List[str] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    retry_count: int = 3
    timeout: int = 300  # 5분


@dataclass
class TaskResult:
    """태스크 실행 결과"""
    ip: str
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    executed_at: datetime = field(default_factory=datetime.now)
    duration: float = 0.0


class BaseTask:
    """모든 태스크의 기본 클래스"""
    
    def __init__(self, config: TaskConfig):
        """
        Args:
            config: 태스크 설정
        """
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def execute(self, device) -> Any:
        """
        태스크 실행 (오버라이드 필수)
        
        Args:
            device: uiautomator2 Device 객체
            
        Returns:
            실행 결과
        """
        raise NotImplementedError("execute() must be implemented")
    
    def execute_sync(self, device) -> Any:
        """
        동기 태스크 실행 (오버라이드 가능)
        
        Args:
            device: uiautomator2 Device 객체
            
        Returns:
            실행 결과
        """
        # 기본적으로 비동기 실행을 동기로 래핑
        return asyncio.get_event_loop().run_until_complete(self.execute(device))
    
    async def on_success(self, device, result: Any):
        """
        성공 콜백 (오버라이드 가능)
        
        Args:
            device: uiautomator2 Device 객체
            result: 실행 결과
        """
        self.logger.info(f"Task completed successfully: {result}")
    
    async def on_failure(self, device, error: Exception):
        """
        실패 콜백 (오버라이드 가능)
        
        Args:
            device: uiautomator2 Device 객체
            error: 발생한 예외
        """
        self.logger.error(f"Task failed: {error}")
    
    async def before_execute(self, device):
        """
        실행 전 훅 (오버라이드 가능)
        
        Args:
            device: uiautomator2 Device 객체
        """
        pass
    
    async def after_execute(self, device, result: Any):
        """
        실행 후 훅 (오버라이드 가능)
        
        Args:
            device: uiautomator2 Device 객체
            result: 실행 결과
        """
        pass
    
    def validate_config(self) -> bool:
        """
        설정 유효성 검사 (오버라이드 가능)
        
        Returns:
            유효성 여부
        """
        return True


class TaskRegistry:
    """태스크 등록 및 관리 싱글톤"""
    
    _tasks: Dict[str, Type[BaseTask]] = {}
    _metadata: Dict[str, Dict[str, Any]] = {}
    
    @classmethod
    def register(cls, name: str, description: str = "", version: str = "1.0.0"):
        """
        태스크 등록 데코레이터
        
        Args:
            name: 태스크 이름
            description: 태스크 설명
            version: 태스크 버전
        """
        def decorator(task_class: Type[BaseTask]) -> Type[BaseTask]:
            cls._tasks[name] = task_class
            cls._metadata[name] = {
                "description": description,
                "version": version,
                "class_name": task_class.__name__
            }
            logger.info(f"Task registered: {name} ({task_class.__name__})")
            return task_class
        return decorator
    
    @classmethod
    def get(cls, name: str) -> Optional[Type[BaseTask]]:
        """
        태스크 클래스 조회
        
        Args:
            name: 태스크 이름
            
        Returns:
            태스크 클래스 또는 None
        """
        return cls._tasks.get(name)
    
    @classmethod
    def create(cls, name: str, config: TaskConfig) -> Optional[BaseTask]:
        """
        태스크 인스턴스 생성
        
        Args:
            name: 태스크 이름
            config: 태스크 설정
            
        Returns:
            태스크 인스턴스 또는 None
        """
        task_class = cls.get(name)
        if task_class:
            return task_class(config)
        return None
    
    @classmethod
    def list_tasks(cls) -> List[str]:
        """
        등록된 태스크 이름 목록
        
        Returns:
            태스크 이름 리스트
        """
        return list(cls._tasks.keys())
    
    @classmethod
    def get_metadata(cls, name: str) -> Optional[Dict[str, Any]]:
        """
        태스크 메타데이터 조회
        
        Args:
            name: 태스크 이름
            
        Returns:
            메타데이터 딕셔너리 또는 None
        """
        return cls._metadata.get(name)
    
    @classmethod
    def get_all_metadata(cls) -> Dict[str, Dict[str, Any]]:
        """
        모든 태스크 메타데이터 조회
        
        Returns:
            {태스크이름: 메타데이터} 딕셔너리
        """
        return cls._metadata.copy()
    
    @classmethod
    def unregister(cls, name: str) -> bool:
        """
        태스크 등록 해제
        
        Args:
            name: 태스크 이름
            
        Returns:
            해제 성공 여부
        """
        if name in cls._tasks:
            del cls._tasks[name]
            del cls._metadata[name]
            logger.info(f"Task unregistered: {name}")
            return True
        return False
    
    @classmethod
    def clear(cls):
        """모든 태스크 등록 해제"""
        cls._tasks.clear()
        cls._metadata.clear()
        logger.info("All tasks cleared")

