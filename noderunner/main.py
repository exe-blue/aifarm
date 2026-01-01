"""
NodeRunner (T5810 Gateway - The Muscle)
P0: Reverse WSS Client Implementation

역할:
- Vultr Orchestrator에 WSS 연결
- HELLO 및 HEARTBEAT 전송
- JOB_ASSIGN 수신 및 실행
- 자동 재연결 (Exponential Backoff)

오리온의 지시:
\"노드는 판단하지 않는다. 노드는 연결하고, 수행하고, 보고한다.\"

@author Axon (Builder)
@version 1.0.0 (P0)
"""

import asyncio
import time
import json
import logging
import os
import sys
from typing import Optional

import websockets
from websockets.exceptions import ConnectionClosed

from executor import JobExecutor
from recovery import RecoveryManager

# ==================== 로깅 ====================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ==================== 설정 ====================
NODE_ID = os.getenv('NODE_ID', 'node-001')
WSS_SERVER_URL = os.getenv('WSS_SERVER_URL', 'wss://doai.me:8443/node')
HEARTBEAT_INTERVAL = int(os.getenv('HEARTBEAT_INTERVAL', '10'))  # 10초

# ==================== NodeRunner ====================

class NodeRunner:
    """
    NodeRunner 메인 클래스
    
    생명주기:
    1. 연결 시도 (Exponential Backoff)
    2. HELLO 전송
    3. HEARTBEAT 루프 시작
    4. JOB_ASSIGN 수신 대기
    5. 연결 끊김 시 재연결
    """
    
    def __init__(self):
        self.node_id = NODE_ID
        self.ws = None
        self.is_connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        
        self.seq = 0
        self.ack_seq = 0
        
        # Job 실행기
        self.executor = JobExecutor(logger)
        
        # 복구 관리자
        self.recovery = RecoveryManager(logger)
        
        # 멱등성 체크
        self.executed_jobs = set()
    
    async def connect(self):
        """WSS 연결"""
        logger.info(f"🔗 WSS 연결 시도: {WSS_SERVER_URL}")
        
        try:
            self.ws = await websockets.connect(
                WSS_SERVER_URL,
                ssl=True,  # SSL 인증서 검증
                ping_interval=20,
                ping_timeout=10
            )
            
            self.is_connected = True
            self.reconnect_attempts = 0
            
            logger.info("✅ WSS 연결 성공")
            
            # HELLO 전송
            await self.send_hello()
            
            # 하트비트 루프 시작
            asyncio.create_task(self.heartbeat_loop())
            
            # 메시지 수신 루프
            await self.receive_loop()
            
        except Exception as e:
            logger.error(f"❌ 연결 실패: {e}")
            self.is_connected = False
            await self.reconnect()
    
    async def send_hello(self):
        """HELLO 전송"""
        hello_msg = {
            'type': 'HELLO',
            'node_id': self.node_id,
            'ts': int(time.time()),
            'seq': self.get_next_seq(),
            'ack_seq': self.ack_seq,
            'payload': {
                'version': 'noderunner/1.0.0-P0',
                'capabilities': ['laixi_wsapi', 'adb_control'],
                'last_job_result_seq': 0
            }
        }
        
        await self.ws.send(json.dumps(hello_msg))
        logger.info("📤 HELLO 전송")
    
    async def heartbeat_loop(self):
        """하트비트 루프 (10초마다)"""
        logger.info(f"💓 하트비트 루프 시작 (간격: {HEARTBEAT_INTERVAL}초)")
        
        while self.is_connected:
            try:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                
                if self.ws and not self.ws.closed:
                    # 디바이스 상태 수집
                    device_count = self.executor.get_device_count()
                    laixi_status = self.executor.check_laixi_status()
                    adb_status = self.executor.check_adb_status()
                    
                    heartbeat_msg = {
                        'type': 'HEARTBEAT',
                        'node_id': self.node_id,
                        'ts': int(time.time()),
                        'seq': self.get_next_seq(),
                        'ack_seq': self.ack_seq,
                        'payload': {
                            'device_count': device_count,
                            'laixi_status': laixi_status,
                            'adb_status': adb_status,
                            'cpu': 0.0,  # TODO: psutil
                            'mem': 0.0   # TODO: psutil
                        }
                    }
                    
                    await self.ws.send(json.dumps(heartbeat_msg))
                    logger.debug(f"💓 HEARTBEAT (device: {device_count})")
                
            except Exception as e:
                logger.error(f"하트비트 에러: {e}")
                break
    
    async def receive_loop(self):
        """메시지 수신 루프"""
        try:
            async for message in self.ws:
                msg = json.loads(message)
                await self.handle_message(msg)
        except ConnectionClosed:
            logger.warn("🔌 연결 종료")
            self.is_connected = False
        except Exception as e:
            logger.error(f"수신 에러: {e}")
            self.is_connected = False
    
    async def handle_message(self, msg: dict):
        """메시지 핸들러"""
        msg_type = msg.get('type')
        self.ack_seq = msg.get('seq', 0)
        
        logger.debug(f"📨 수신: {msg_type} (ack_seq: {self.ack_seq})")
        
        if msg_type == 'HELLO_ACK':
            logger.info("✅ HELLO_ACK 수신 (인증 완료)")
        
        elif msg_type == 'HEARTBEAT_ACK':
            # 하트비트 응답 (옵션)
            pass
        
        elif msg_type == 'JOB_ASSIGN':
            # Job 수신
            payload = msg.get('payload', {})
            job_id = payload.get('job_id')
            idempotency_key = payload.get('idempotency_key')
            
            # 멱등성 체크
            if idempotency_key in self.executed_jobs:
                logger.warn(f"⚠️  중복 Job 무시: {job_id} (already done)")
                
                # ACK 전송 (이미 완료)
                await self.send_job_ack(job_id, 'already_done')
                return
            
            logger.info(f"📋 Job 수신: {job_id} (action: {payload.get('action')})")
            
            # JOB_ACK 즉시 전송
            await self.send_job_ack(job_id, 'started')
            
            # Job 실행 (비동기)
            asyncio.create_task(self.execute_job(job_id, payload))
        
        elif msg_type == 'SERVER_SHUTDOWN':
            logger.warn("🛑 서버 종료 알림")
            self.is_connected = False
    
    async def send_job_ack(self, job_id: str, state: str):
        """JOB_ACK 전송"""
        ack_msg = {
            'type': 'JOB_ACK',
            'node_id': self.node_id,
            'ts': int(time.time()),
            'seq': self.get_next_seq(),
            'ack_seq': self.ack_seq,
            'payload': {
                'job_id': job_id,
                'state': state
            }
        }
        
        await self.ws.send(json.dumps(ack_msg))
        logger.info(f"📤 JOB_ACK: {job_id} (state: {state})")
    
    async def execute_job(self, job_id: str, payload: dict):
        """Job 실행 (비동기)"""
        action = payload.get('action')
        params = payload.get('params', {})
        device_ids = payload.get('device_ids', ['all'])
        idempotency_key = payload.get('idempotency_key')
        
        logger.info(f"🎬 Job 실행 시작: {job_id}")
        
        start_time = time.time()
        
        try:
            # Executor를 통해 실행
            result = await self.executor.execute(action, params, device_ids)
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            # JOB_RESULT 전송 (성공)
            await self.send_job_result(
                job_id=job_id,
                state='success',
                metrics={'duration_ms': duration_ms},
                error=None
            )
            
            # 멱등성 마킹
            self.executed_jobs.add(idempotency_key)
            
            logger.info(f"✅ Job 완료: {job_id} ({duration_ms}ms)")
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            
            logger.error(f"❌ Job 실패: {job_id} - {e}")
            
            # JOB_RESULT 전송 (실패)
            await self.send_job_result(
                job_id=job_id,
                state='failed',
                metrics={'duration_ms': duration_ms},
                error=str(e)
            )
    
    async def send_job_result(self, job_id: str, state: str, metrics: dict, error: Optional[str]):
        """JOB_RESULT 전송"""
        result_msg = {
            'type': 'JOB_RESULT',
            'node_id': self.node_id,
            'ts': int(time.time()),
            'seq': self.get_next_seq(),
            'ack_seq': self.ack_seq,
            'payload': {
                'job_id': job_id,
                'state': state,
                'metrics': metrics,
                'error': error
            }
        }
        
        await self.ws.send(json.dumps(result_msg))
        logger.info(f"📤 JOB_RESULT: {job_id} (state: {state})")
    
    async def reconnect(self):
        """재연결 (Exponential Backoff)"""
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error(f"🚨 재연결 실패 (최대 시도 초과: {self.reconnect_attempts})")
            sys.exit(1)
        
        self.reconnect_attempts += 1
        
        # Exponential Backoff: 1s, 2s, 4s, 8s, 16s, 32s (최대 30초)
        delay = min(2 ** self.reconnect_attempts, 30)
        
        logger.info(f"🔄 재연결 시도 {self.reconnect_attempts}/{self.max_reconnect_attempts} (대기: {delay}초)")
        
        await asyncio.sleep(delay)
        await self.connect()
    
    def get_next_seq(self) -> int:
        """다음 시퀀스 번호"""
        self.seq += 1
        return self.seq
    
    async def run(self):
        """메인 실행"""
        logger.info("╔════════════════════════════════════════════════════════╗")
        logger.info("║  NodeRunner (T5810 Gateway - The Muscle)             ║")
        logger.info("║  P0: Reverse WSS Client                               ║")
        logger.info("╚════════════════════════════════════════════════════════╝")
        logger.info(f"🆔 Node ID: {self.node_id}")
        logger.info(f"🌐 Server: {WSS_SERVER_URL}")
        
        # 연결 시작
        await self.connect()


# ==================== 메인 ====================

async def main():
    runner = NodeRunner()
    
    try:
        await runner.run()
    except KeyboardInterrupt:
        logger.info("⏹️  사용자 중단")
    except Exception as e:
        logger.error(f"❌ 치명적 에러: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
