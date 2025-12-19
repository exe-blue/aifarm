"""Supabase 클라이언트"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from src.data.base_loader import DataLoader
from src.modules.task_registry import TaskConfig
from src.core.exceptions import DataLoadError, AuthenticationError

logger = logging.getLogger(__name__)


class SupabaseClient(DataLoader):
    """
    Supabase 데이터 로더 및 클라이언트
    
    Supabase에서 태스크 데이터를 로드하고 결과를 저장합니다.
    """
    
    def __init__(self, url: str, key: str):
        """
        Args:
            url: Supabase 프로젝트 URL
            key: Supabase anon/service key
        """
        self.url = url
        self.key = key
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Supabase 클라이언트 초기화"""
        try:
            from supabase import create_client, Client
            
            self.client: Client = create_client(self.url, self.key)
            logger.info("Supabase client initialized")
            
        except ImportError:
            logger.warning("supabase not installed. Run: pip install supabase")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise AuthenticationError(f"Supabase authentication failed: {e}")
    
    def _ensure_client(self):
        """클라이언트 초기화 확인"""
        if not self.client:
            raise DataLoadError("Supabase client not initialized")
    
    # ==================== 태스크 관리 ====================
    
    async def get_pending_tasks(self) -> List[Dict[str, Any]]:
        """
        대기 중인 태스크 조회
        
        Returns:
            태스크 딕셔너리 리스트
        """
        self._ensure_client()
        
        response = self.client.table("tasks") \
            .select("*") \
            .eq("status", "pending") \
            .order("created_at") \
            .execute()
        
        logger.info(f"Found {len(response.data)} pending tasks")
        return response.data
    
    async def get_task_by_id(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        ID로 태스크 조회
        
        Args:
            task_id: 태스크 UUID
            
        Returns:
            태스크 딕셔너리 또는 None
        """
        self._ensure_client()
        
        response = self.client.table("tasks") \
            .select("*") \
            .eq("id", task_id) \
            .single() \
            .execute()
        
        return response.data
    
    async def create_task(
        self,
        name: str,
        task_type: str,
        parameters: Dict[str, Any] = None,
        target_device_count: int = 0
    ) -> Dict[str, Any]:
        """
        새 태스크 생성
        
        Args:
            name: 태스크 이름
            task_type: 태스크 타입 (레지스트리 이름)
            parameters: 태스크 파라미터
            target_device_count: 대상 디바이스 수
            
        Returns:
            생성된 태스크 딕셔너리
        """
        self._ensure_client()
        
        response = self.client.table("tasks") \
            .insert({
                "name": name,
                "task_type": task_type,
                "parameters": parameters or {},
                "target_device_count": target_device_count,
                "status": "pending"
            }) \
            .execute()
        
        logger.info(f"Created task: {name} ({task_type})")
        return response.data[0] if response.data else None
    
    async def update_task_status(
        self,
        task_id: str,
        status: str,
        result: Dict[str, Any] = None
    ):
        """
        태스크 상태 업데이트
        
        Args:
            task_id: 태스크 UUID
            status: 새 상태 (pending, running, completed, failed)
            result: 실행 결과 (optional)
        """
        self._ensure_client()
        
        update_data = {"status": status}
        
        if status == "running":
            update_data["started_at"] = datetime.now().isoformat()
        elif status in ("completed", "failed"):
            update_data["completed_at"] = datetime.now().isoformat()
            if result:
                update_data["result"] = result
        
        self.client.table("tasks") \
            .update(update_data) \
            .eq("id", task_id) \
            .execute()
        
        logger.info(f"Updated task {task_id} status to {status}")
    
    async def start_task(self, task_id: str):
        """태스크 시작 상태로 변경"""
        await self.update_task_status(task_id, "running")
    
    async def complete_task(self, task_id: str, result: Dict[str, Any]):
        """태스크 완료 상태로 변경"""
        await self.update_task_status(task_id, "completed", result)
    
    async def fail_task(self, task_id: str, error: str):
        """태스크 실패 상태로 변경"""
        await self.update_task_status(task_id, "failed", {"error": error})
    
    # ==================== 결과 관리 ====================
    
    async def save_device_result(
        self,
        task_id: str,
        device_ip: str,
        success: bool,
        result: Dict[str, Any] = None,
        error: str = None
    ):
        """
        디바이스별 실행 결과 저장
        
        Args:
            task_id: 태스크 UUID
            device_ip: 디바이스 IP
            success: 성공 여부
            result: 실행 결과
            error: 에러 메시지
        """
        self._ensure_client()
        
        self.client.table("task_results") \
            .insert({
                "task_id": task_id,
                "device_ip": device_ip,
                "success": success,
                "result": result,
                "error": error
            }) \
            .execute()
    
    async def save_batch_results(
        self,
        task_id: str,
        results: List[Dict[str, Any]]
    ):
        """
        배치 결과 저장
        
        Args:
            task_id: 태스크 UUID
            results: 결과 리스트 [{ip, success, result, error}, ...]
        """
        self._ensure_client()
        
        records = [
            {
                "task_id": task_id,
                "device_ip": r["ip"],
                "success": r["success"],
                "result": r.get("result"),
                "error": r.get("error")
            }
            for r in results
        ]
        
        # 배치로 삽입
        self.client.table("task_results") \
            .insert(records) \
            .execute()
        
        logger.info(f"Saved {len(records)} results for task {task_id}")
    
    async def get_task_results(self, task_id: str) -> List[Dict[str, Any]]:
        """
        태스크 결과 조회
        
        Args:
            task_id: 태스크 UUID
            
        Returns:
            결과 딕셔너리 리스트
        """
        self._ensure_client()
        
        response = self.client.table("task_results") \
            .select("*") \
            .eq("task_id", task_id) \
            .execute()
        
        return response.data
    
    # ==================== DataLoader 인터페이스 ====================
    
    async def load_raw_data(self) -> List[Dict[str, Any]]:
        """대기 중인 태스크를 원시 데이터로 로드"""
        return await self.get_pending_tasks()
    
    async def load_tasks(self) -> List[TaskConfig]:
        """대기 중인 태스크를 TaskConfig로 로드"""
        raw_data = await self.load_raw_data()
        
        tasks = []
        for data in raw_data:
            config = TaskConfig(
                name=data.get("name", "unnamed"),
                target_devices=[],
                parameters=data.get("parameters", {}),
                retry_count=3,
                timeout=300
            )
            # 추가 정보 저장
            config.id = data.get("id")
            config.task_type = data.get("task_type")
            tasks.append(config)
        
        return tasks

