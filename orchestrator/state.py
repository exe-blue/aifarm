"""
State Manager
노드/Job 상태 관리 (In-Memory)

@author Axon (Builder)
@version 1.0.0 (P0)
"""

import time
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class NodeStatus(Enum):
    """노드 상태"""
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"  # 하트비트 지연


class JobState(Enum):
    """Job 상태"""
    PENDING = "pending"
    ASSIGNED = "assigned"
    ACKED = "acked"
    SUCCESS = "success"
    FAILED = "failed"


@dataclass
class NodeInfo:
    """노드 정보"""
    node_id: str
    status: NodeStatus = NodeStatus.ONLINE
    
    # 연결 정보
    connected_at: float = field(default_factory=time.time)
    last_heartbeat: float = field(default_factory=time.time)
    last_seq: int = 0
    
    # 디바이스 정보
    device_count: int = 0
    laixi_status: str = "unknown"
    adb_status: str = "unknown"
    
    # 메트릭
    cpu_usage: float = 0.0
    mem_usage: float = 0.0
    
    # Capabilities
    capabilities: List[str] = field(default_factory=list)
    
    # 스냅샷
    devices: List[dict] = field(default_factory=list)


@dataclass
class JobInfo:
    """Job 정보"""
    job_id: str
    target: str  # node_id or "all"
    action: str
    params: dict
    device_ids: List[str]
    
    state: JobState = JobState.PENDING
    assigned_nodes: List[str] = field(default_factory=list)
    acked_nodes: List[str] = field(default_factory=list)
    completed_nodes: Dict[str, dict] = field(default_factory=dict)  # node_id → result
    
    created_at: float = field(default_factory=time.time)
    assigned_at: Optional[float] = None
    completed_at: Optional[float] = None
    
    # 멱등성
    idempotency_key: str = ""


class StateManager:
    """
    상태 관리자 (In-Memory)
    
    노드 및 Job 상태를 메모리에 저장
    """
    
    def __init__(self):
        self.nodes: Dict[str, NodeInfo] = {}
        self.jobs: Dict[str, JobInfo] = {}
        
        self.orchestrator_seq = 0
        self.start_time = time.time()
        
        self.executed_jobs: Set[str] = set()  # 멱등성 체크용
    
    # ==================== Node 관리 ====================
    
    def register_node(self, node_id: str, connection, hello_payload: dict):
        """노드 등록"""
        self.nodes[node_id] = NodeInfo(
            node_id=node_id,
            status=NodeStatus.ONLINE,
            capabilities=hello_payload.get('capabilities', []),
            last_seq=hello_payload.get('seq', 0)
        )
    
    def unregister_node(self, node_id: str):
        """노드 등록 해제"""
        if node_id in self.nodes:
            self.nodes[node_id].status = NodeStatus.OFFLINE
    
    def update_heartbeat(self, node_id: str, device_count: int, status: str, metrics: dict):
        """하트비트 업데이트"""
        if node_id in self.nodes:
            node = self.nodes[node_id]
            node.last_heartbeat = time.time()
            node.status = NodeStatus.ONLINE
            node.device_count = device_count or 0
            node.laixi_status = status or "unknown"
            node.cpu_usage = metrics.get('cpu', 0.0)
            node.mem_usage = metrics.get('mem', 0.0)
            node.adb_status = metrics.get('adb_status', 'unknown')
    
    def update_device_snapshot(self, node_id: str, devices: List[dict]):
        """디바이스 스냅샷 업데이트"""
        if node_id in self.nodes:
            self.nodes[node_id].devices = devices
    
    def get_node(self, node_id: str) -> Optional[NodeInfo]:
        """노드 정보 조회"""
        return self.nodes.get(node_id)
    
    def get_all_nodes(self) -> List[dict]:
        """전체 노드 목록"""
        now = time.time()
        return [
            {
                'node_id': node.node_id,
                'status': node.status.value,
                'device_count': node.device_count,
                'laixi_status': node.laixi_status,
                'adb_status': node.adb_status,
                'last_seen': datetime.fromtimestamp(node.last_heartbeat).isoformat(),
                'seconds_since_heartbeat': int(now - node.last_heartbeat),
                'uptime': int(now - node.connected_at),
                'cpu': node.cpu_usage,
                'mem': node.mem_usage
            }
            for node in self.nodes.values()
        ]
    
    def get_online_nodes(self) -> List[str]:
        """온라인 노드 목록"""
        return [
            node_id 
            for node_id, node in self.nodes.items() 
            if node.status == NodeStatus.ONLINE
        ]
    
    def check_node_timeout(self, timeout_seconds: int = 30) -> List[str]:
        """타임아웃된 노드 찾기"""
        now = time.time()
        timed_out = []
        
        for node_id, node in self.nodes.items():
            if node.status == NodeStatus.ONLINE:
                elapsed = now - node.last_heartbeat
                if elapsed > timeout_seconds:
                    node.status = NodeStatus.OFFLINE
                    timed_out.append(node_id)
        
        return timed_out
    
    def get_node_seq(self, node_id: str) -> int:
        """노드의 마지막 seq 조회"""
        node = self.nodes.get(node_id)
        return node.last_seq if node else 0
    
    # ==================== Job 관리 ====================
    
    def register_job(self, job_id: str, target: str, action: str, params: dict, device_ids: List[str]):
        """Job 등록"""
        self.jobs[job_id] = JobInfo(
            job_id=job_id,
            target=target,
            action=action,
            params=params,
            device_ids=device_ids,
            idempotency_key=job_id
        )
    
    def mark_job_acked(self, job_id: str, node_id: str):
        """Job ACK 처리"""
        if job_id in self.jobs:
            job = self.jobs[job_id]
            job.state = JobState.ACKED
            if node_id not in job.acked_nodes:
                job.acked_nodes.append(node_id)
    
    def mark_job_completed(self, job_id: str, node_id: str, state: str, metrics: dict, error: Optional[str]):
        """Job 완료 처리"""
        if job_id in self.jobs:
            job = self.jobs[job_id]
            job.state = JobState.SUCCESS if state == 'success' else JobState.FAILED
            job.completed_nodes[node_id] = {
                'state': state,
                'metrics': metrics,
                'error': error,
                'completed_at': time.time()
            }
            job.completed_at = time.time()
    
    def is_job_executed(self, idempotency_key: str) -> bool:
        """멱등성 체크: 이미 실행된 Job인가?"""
        return idempotency_key in self.executed_jobs
    
    def mark_job_executed(self, idempotency_key: str):
        """Job 실행 완료 마킹"""
        self.executed_jobs.add(idempotency_key)
    
    # ==================== Sequence 관리 ====================
    
    def get_next_seq(self, entity: str = 'orchestrator') -> int:
        """다음 시퀀스 번호"""
        self.orchestrator_seq += 1
        return self.orchestrator_seq
