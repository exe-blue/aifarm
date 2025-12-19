"""Supabase 기반 태스크 실행기"""

import asyncio
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from src.controller.device_manager import DeviceManager
from src.modules.task_registry import TaskRegistry, TaskConfig
from src.modules.execution_engine import ExecutionEngine
from src.data.supabase_client import SupabaseClient
from src.core.exceptions import TaskNotFoundError, TaskExecutionError

logger = logging.getLogger(__name__)


@dataclass
class SupabaseTask:
    """Supabase 태스크 데이터 모델"""
    id: str
    name: str
    task_type: str
    parameters: dict
    target_device_count: int
    status: str
    
    @classmethod
    def from_dict(cls, data: dict) -> 'SupabaseTask':
        return cls(
            id=data.get("id"),
            name=data.get("name", "unnamed"),
            task_type=data.get("task_type"),
            parameters=data.get("parameters", {}),
            target_device_count=data.get("target_device_count", 0),
            status=data.get("status", "pending")
        )


class SupabaseExecutor:
    """
    Supabase 기반 태스크 실행기
    
    Supabase에서 대기 중인 태스크를 조회하고 실행합니다.
    """
    
    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        device_manager: DeviceManager
    ):
        """
        Args:
            supabase_url: Supabase 프로젝트 URL
            supabase_key: Supabase anon/service key
            device_manager: DeviceManager 인스턴스
        """
        self.supabase = SupabaseClient(supabase_url, supabase_key)
        self.device_manager = device_manager
        self.engine = ExecutionEngine(device_manager)
        self.is_running = False
    
    async def get_pending_tasks(self) -> List[SupabaseTask]:
        """대기 중인 태스크 조회"""
        raw_tasks = await self.supabase.get_pending_tasks()
        return [SupabaseTask.from_dict(t) for t in raw_tasks]
    
    async def execute_task(self, supabase_task: SupabaseTask) -> Dict[str, Any]:
        """
        단일 태스크 실행
        
        Args:
            supabase_task: Supabase 태스크 데이터
            
        Returns:
            실행 결과 딕셔너리
        """
        task_id = supabase_task.id
        task_type = supabase_task.task_type
        
        logger.info(f"Starting task: {supabase_task.name} ({task_type})")
        
        try:
            # 1. 태스크 시작 상태로 업데이트
            await self.supabase.start_task(task_id)
            
            # 2. 태스크 클래스 조회
            task_class = TaskRegistry.get(task_type)
            if not task_class:
                raise TaskNotFoundError(f"Unknown task type: {task_type}")
            
            # 3. 태스크 인스턴스 생성
            config = TaskConfig(
                name=supabase_task.name,
                parameters=supabase_task.parameters
            )
            task = task_class(config)
            
            # 4. 실행
            results = await self.engine.run_task(task, batch_size=50)
            
            # 5. 결과 저장
            await self.supabase.save_batch_results(
                task_id,
                [
                    {
                        "ip": r.ip,
                        "success": r.success,
                        "result": r.result,
                        "error": r.error
                    }
                    for r in results
                ]
            )
            
            # 6. 태스크 완료
            summary = self.engine.get_summary()
            await self.supabase.complete_task(task_id, summary)
            
            logger.info(
                f"Task completed: {supabase_task.name} "
                f"({summary['success']}/{summary['total']} success)"
            )
            
            return summary
            
        except Exception as e:
            logger.error(f"Task failed: {supabase_task.name} - {e}")
            await self.supabase.fail_task(task_id, str(e))
            raise TaskExecutionError(f"Task execution failed: {e}")
    
    async def process_pending_tasks(self) -> List[Dict[str, Any]]:
        """
        대기 중인 모든 태스크 처리
        
        Returns:
            각 태스크의 실행 결과 리스트
        """
        tasks = await self.get_pending_tasks()
        
        if not tasks:
            logger.info("No pending tasks")
            return []
        
        logger.info(f"Found {len(tasks)} pending tasks")
        
        results = []
        for task in tasks:
            try:
                result = await self.execute_task(task)
                results.append({"task_id": task.id, "success": True, "result": result})
            except Exception as e:
                results.append({"task_id": task.id, "success": False, "error": str(e)})
        
        return results
    
    async def run_daemon(self, interval: int = 30):
        """
        데몬 모드: 주기적으로 태스크 확인 및 실행
        
        Args:
            interval: 확인 주기 (초)
        """
        logger.info(f"Starting Supabase Executor daemon (interval: {interval}s)")
        self.is_running = True
        
        while self.is_running:
            try:
                await self.process_pending_tasks()
            except Exception as e:
                logger.error(f"Error in daemon loop: {e}")
            
            await asyncio.sleep(interval)
    
    def stop_daemon(self):
        """데몬 중지"""
        logger.info("Stopping Supabase Executor daemon")
        self.is_running = False


class TaskScheduler:
    """
    태스크 스케줄러
    
    Supabase에서 스케줄된 태스크를 관리합니다.
    """
    
    def __init__(self, executor: SupabaseExecutor):
        self.executor = executor
        self.scheduled_tasks: Dict[str, asyncio.Task] = {}
    
    async def schedule_task(
        self,
        name: str,
        task_type: str,
        parameters: Dict[str, Any],
        delay_seconds: int = 0
    ) -> str:
        """
        태스크 스케줄링
        
        Args:
            name: 태스크 이름
            task_type: 태스크 타입
            parameters: 파라미터
            delay_seconds: 지연 시간 (초)
            
        Returns:
            생성된 태스크 ID
        """
        # Supabase에 태스크 생성
        task_data = await self.executor.supabase.create_task(
            name=name,
            task_type=task_type,
            parameters=parameters,
            target_device_count=len(self.executor.device_manager.connections)
        )
        
        task_id = task_data["id"]
        
        # 지연 실행
        if delay_seconds > 0:
            async def delayed_execute():
                await asyncio.sleep(delay_seconds)
                task = SupabaseTask.from_dict(task_data)
                await self.executor.execute_task(task)
            
            self.scheduled_tasks[task_id] = asyncio.create_task(delayed_execute())
        
        return task_id
    
    def cancel_scheduled(self, task_id: str) -> bool:
        """
        스케줄된 태스크 취소
        
        Args:
            task_id: 태스크 ID
            
        Returns:
            취소 성공 여부
        """
        if task_id in self.scheduled_tasks:
            self.scheduled_tasks[task_id].cancel()
            del self.scheduled_tasks[task_id]
            return True
        return False

