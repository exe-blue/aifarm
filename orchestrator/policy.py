"""
Policy Engine
오프라인 판정 및 자동복구 정책

역할:
- 하트비트 타임아웃 감시 (30초)
- 오프라인 노드 자동 복구
- 디바이스 드롭 감지

@author Axon (Builder)
@version 1.0.0 (P0)
"""

import asyncio
import time
from typing import List

from state import StateManager, NodeStatus


class PolicyEngine:
    """
    정책 엔진
    
    오리온의 지시:
    \"노드는 판단하지 않는다. 중앙이 판단한다.\"
    """
    
    def __init__(self, state: StateManager, logger):
        self.state = state
        self.logger = logger
        
        self.heartbeat_timeout = 30  # 30초
        self.device_drop_threshold = 0.1  # 10% 드롭
    
    async def monitor_loop(self):
        """
        감시 루프 (백그라운드)
        
        작업:
        1. 하트비트 타임아웃 체크 (10초마다)
        2. 디바이스 드롭 감지
        3. 자동복구 Job 발행
        """
        self.logger.info("🔍 정책 엔진 시작 (감시 루프)")
        
        while True:
            try:
                await asyncio.sleep(10)  # 10초마다 체크
                
                # 1. 하트비트 타임아웃 체크
                timed_out = self.state.check_node_timeout(self.heartbeat_timeout)
                
                for node_id in timed_out:
                    self.logger.error(f"🚨 하트비트 타임아웃: {node_id}")
                    
                    # TODO: 알림 전송 (SMS/이메일)
                    # TODO: 자동복구 Job 발행
                    await self.trigger_recovery(node_id, "HEARTBEAT_TIMEOUT")
                
                # 2. 디바이스 드롭 감지
                # (구현 예정)
                
            except Exception as e:
                self.logger.error(f"감시 루프 에러: {e}")
    
    async def trigger_recovery(self, node_id: str, reason: str):
        """
        자동복구 트리거
        
        복구 전략:
        1. RECOVER_LAIXI: Laixi 프로세스 재시작
        2. RECOVER_ADB: ADB 서버 재시작
        """
        self.logger.warn(f"🔧 자동복구 시작: {node_id} (이유: {reason})")
        
        # 복구 Job 생성
        recovery_job_id = f"recovery-{node_id}-{int(time.time())}"
        
        # Job 등록
        self.state.register_job(
            job_id=recovery_job_id,
            target=node_id,
            action="RECOVER_LAIXI",  # 1단계: Laixi 재시작
            params={"reason": reason},
            device_ids=["all"]
        )
        
        # TODO: 실제 전송은 active_connections를 통해
        # (app.py에서 구현 필요)
        
        self.logger.info(f"📝 복구 Job 등록: {recovery_job_id}")
