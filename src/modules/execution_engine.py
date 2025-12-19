"""태스크 실행 엔진"""

import asyncio
import time
import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from src.modules.task_registry import BaseTask, TaskResult
from src.controller.device_manager import DeviceManager
from src.core.exceptions import TaskExecutionError

logger = logging.getLogger(__name__)


@dataclass
class BatchResult:
    """배치 실행 결과"""
    batch_index: int
    results: List[TaskResult]
    started_at: datetime
    completed_at: datetime
    
    @property
    def success_count(self) -> int:
        return sum(1 for r in self.results if r.success)
    
    @property
    def failure_count(self) -> int:
        return sum(1 for r in self.results if not r.success)


class ExecutionEngine:
    """태스크 실행 엔진"""
    
    def __init__(self, device_manager: DeviceManager):
        """
        Args:
            device_manager: 디바이스 매니저 인스턴스
        """
        self.device_manager = device_manager
        self.results: List[TaskResult] = []
        self.batch_results: List[BatchResult] = []
        self.logger = logging.getLogger(__name__)
    
    async def run_task(
        self,
        task: BaseTask,
        devices: Optional[List[str]] = None,
        batch_size: int = 50,
        batch_delay: float = 1.0
    ) -> List[TaskResult]:
        """
        태스크 비동기 실행
        
        Args:
            task: 실행할 태스크
            devices: 대상 디바이스 IP 목록 (None이면 전체)
            batch_size: 배치 크기
            batch_delay: 배치 간 대기 시간 (초)
            
        Returns:
            태스크 결과 리스트
        """
        self.results = []
        self.batch_results = []
        
        target_devices = devices or list(self.device_manager.connections.keys())
        total_devices = len(target_devices)
        
        if total_devices == 0:
            self.logger.warning("No devices to execute task on")
            return []
        
        self.logger.info(f"Starting task on {total_devices} devices (batch_size={batch_size})")
        
        for i in range(0, total_devices, batch_size):
            batch = target_devices[i:i+batch_size]
            batch_index = i // batch_size + 1
            total_batches = (total_devices + batch_size - 1) // batch_size
            
            self.logger.info(f"Processing batch {batch_index}/{total_batches} ({len(batch)} devices)")
            
            started_at = datetime.now()
            
            # 비동기 배치 실행
            batch_tasks = [
                self._execute_on_device_async(task, ip)
                for ip in batch
            ]
            results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # 결과 처리
            processed_results = []
            for ip, result in zip(batch, results):
                if isinstance(result, Exception):
                    processed_results.append(TaskResult(
                        ip=ip,
                        success=False,
                        error=str(result)
                    ))
                else:
                    processed_results.append(result)
            
            completed_at = datetime.now()
            
            # 배치 결과 저장
            batch_result = BatchResult(
                batch_index=batch_index,
                results=processed_results,
                started_at=started_at,
                completed_at=completed_at
            )
            self.batch_results.append(batch_result)
            self.results.extend(processed_results)
            
            self.logger.info(
                f"Batch {batch_index} completed: "
                f"{batch_result.success_count}/{len(batch)} success"
            )
            
            # 배치 간 대기
            if i + batch_size < total_devices:
                await asyncio.sleep(batch_delay)
        
        success_count = sum(1 for r in self.results if r.success)
        self.logger.info(f"Task completed: {success_count}/{total_devices} success")
        
        return self.results
    
    def run_task_sync(
        self,
        task: BaseTask,
        devices: Optional[List[str]] = None,
        batch_size: int = 50,
        max_workers: int = 50
    ) -> List[TaskResult]:
        """
        태스크 동기 실행 (ThreadPoolExecutor 사용)
        
        Args:
            task: 실행할 태스크
            devices: 대상 디바이스 IP 목록
            batch_size: 배치 크기
            max_workers: 최대 동시 실행 수
            
        Returns:
            태스크 결과 리스트
        """
        self.results = []
        
        target_devices = devices or list(self.device_manager.connections.keys())
        total_devices = len(target_devices)
        
        if total_devices == 0:
            self.logger.warning("No devices to execute task on")
            return []
        
        self.logger.info(f"Starting task on {total_devices} devices")
        
        for i in range(0, total_devices, batch_size):
            batch = target_devices[i:i+batch_size]
            batch_index = i // batch_size + 1
            
            self.logger.info(f"Processing batch {batch_index} ({len(batch)} devices)")
            
            with ThreadPoolExecutor(max_workers=min(max_workers, len(batch))) as executor:
                futures = {
                    executor.submit(self._execute_on_device_sync, task, ip): ip
                    for ip in batch
                }
                
                for future in futures:
                    ip = futures[future]
                    try:
                        result = future.result()
                        self.results.append(result)
                    except Exception as e:
                        self.results.append(TaskResult(
                            ip=ip,
                            success=False,
                            error=str(e)
                        ))
            
            # 배치 간 대기
            if i + batch_size < total_devices:
                time.sleep(1)
        
        success_count = sum(1 for r in self.results if r.success)
        self.logger.info(f"Task completed: {success_count}/{total_devices} success")
        
        return self.results
    
    async def _execute_on_device_async(self, task: BaseTask, ip: str) -> TaskResult:
        """
        단일 디바이스에서 비동기 태스크 실행
        
        Args:
            task: 실행할 태스크
            ip: 디바이스 IP
            
        Returns:
            태스크 결과
        """
        start_time = time.time()
        
        try:
            device = self.device_manager.get_device(ip)
            if not device:
                return TaskResult(
                    ip=ip,
                    success=False,
                    error="Device not connected"
                )
            
            # 실행 전 훅
            await task.before_execute(device)
            
            # 태스크 실행
            result = await task.execute(device)
            
            # 실행 후 훅
            await task.after_execute(device, result)
            
            # 성공 콜백
            await task.on_success(device, result)
            
            duration = time.time() - start_time
            
            return TaskResult(
                ip=ip,
                success=True,
                result=result if isinstance(result, dict) else {"result": result},
                duration=duration
            )
            
        except Exception as e:
            duration = time.time() - start_time
            
            # 실패 콜백
            try:
                device = self.device_manager.get_device(ip)
                if device:
                    await task.on_failure(device, e)
            except:
                pass
            
            return TaskResult(
                ip=ip,
                success=False,
                error=str(e),
                duration=duration
            )
    
    def _execute_on_device_sync(self, task: BaseTask, ip: str) -> TaskResult:
        """
        단일 디바이스에서 동기 태스크 실행
        
        Args:
            task: 실행할 태스크
            ip: 디바이스 IP
            
        Returns:
            태스크 결과
        """
        start_time = time.time()
        
        try:
            device = self.device_manager.get_device(ip)
            if not device:
                return TaskResult(
                    ip=ip,
                    success=False,
                    error="Device not connected"
                )
            
            # 동기 실행
            result = task.execute_sync(device)
            
            duration = time.time() - start_time
            
            return TaskResult(
                ip=ip,
                success=True,
                result=result if isinstance(result, dict) else {"result": result},
                duration=duration
            )
            
        except Exception as e:
            duration = time.time() - start_time
            
            return TaskResult(
                ip=ip,
                success=False,
                error=str(e),
                duration=duration
            )
    
    def get_summary(self) -> Dict[str, Any]:
        """
        실행 결과 요약
        
        Returns:
            요약 딕셔너리
        """
        if not self.results:
            return {"total": 0, "success": 0, "failure": 0}
        
        success_count = sum(1 for r in self.results if r.success)
        total_duration = sum(r.duration for r in self.results)
        avg_duration = total_duration / len(self.results) if self.results else 0
        
        return {
            "total": len(self.results),
            "success": success_count,
            "failure": len(self.results) - success_count,
            "success_rate": success_count / len(self.results) * 100,
            "total_duration": total_duration,
            "avg_duration": avg_duration,
            "batch_count": len(self.batch_results)
        }
    
    def get_failed_devices(self) -> List[str]:
        """
        실패한 디바이스 IP 목록
        
        Returns:
            IP 주소 리스트
        """
        return [r.ip for r in self.results if not r.success]
    
    def get_successful_devices(self) -> List[str]:
        """
        성공한 디바이스 IP 목록
        
        Returns:
            IP 주소 리스트
        """
        return [r.ip for r in self.results if r.success]

