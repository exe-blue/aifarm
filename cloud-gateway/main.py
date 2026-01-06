"""
DoAi.Me Cloud Gateway - The Brain
Vultr FastAPI Server

Mission: 단순함이 전부다.
- /ws/node: 노드 연결 관리
- /api/command: 프론트엔드 → 노드 명령 전달

Protocol:
- HELLO → HELLO_ACK (연결)
- HEARTBEAT → HEARTBEAT_ACK (30초 간격)
- COMMAND → RESULT (명령 실행)

"복잡한 생각은 버려라." - Orion
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Dict, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ============================================================
# 로깅 설정
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ============================================================
# Connection Pool (메모리 기반)
# ============================================================

class NodeConnection:
    """노드 연결 정보"""
    def __init__(self, node_id: str, websocket: WebSocket):
        self.node_id = node_id
        self.websocket = websocket
        self.connected_at = datetime.utcnow()
        self.last_heartbeat = datetime.utcnow()
        self.device_count = 0
        self.status = "online"


class ConnectionPool:
    """노드 연결 풀 관리"""
    
    def __init__(self):
        self._nodes: Dict[str, NodeConnection] = {}
        self._lock = asyncio.Lock()
    
    async def add(self, node_id: str, websocket: WebSocket) -> NodeConnection:
        """노드 연결 추가"""
        async with self._lock:
            # 기존 연결이 있으면 끊기
            if node_id in self._nodes:
                old = self._nodes[node_id]
                try:
                    await old.websocket.close()
                except:
                    pass
                logger.warning(f"[{node_id}] 기존 연결 대체")
            
            conn = NodeConnection(node_id, websocket)
            self._nodes[node_id] = conn
            logger.info(f"[{node_id}] 연결됨 (총 {len(self._nodes)}개 노드)")
            return conn
    
    async def remove(self, node_id: str):
        """노드 연결 제거"""
        async with self._lock:
            if node_id in self._nodes:
                del self._nodes[node_id]
                logger.info(f"[{node_id}] 연결 해제 (총 {len(self._nodes)}개 노드)")
    
    async def get(self, node_id: str) -> Optional[NodeConnection]:
        """노드 연결 조회"""
        return self._nodes.get(node_id)
    
    async def update_heartbeat(self, node_id: str, device_count: int = 0):
        """하트비트 업데이트"""
        if node_id in self._nodes:
            self._nodes[node_id].last_heartbeat = datetime.utcnow()
            self._nodes[node_id].device_count = device_count
    
    async def send_to_node(self, node_id: str, message: dict) -> bool:
        """특정 노드에 메시지 전송"""
        conn = self._nodes.get(node_id)
        if not conn:
            return False
        
        try:
            await conn.websocket.send_json(message)
            return True
        except Exception as e:
            logger.error(f"[{node_id}] 전송 실패: {e}")
            return False
    
    async def broadcast(self, message: dict):
        """모든 노드에 브로드캐스트"""
        for node_id in list(self._nodes.keys()):
            await self.send_to_node(node_id, message)
    
    def list_nodes(self) -> list:
        """연결된 노드 목록"""
        return [
            {
                "node_id": conn.node_id,
                "connected_at": conn.connected_at.isoformat(),
                "last_heartbeat": conn.last_heartbeat.isoformat(),
                "device_count": conn.device_count,
                "status": conn.status
            }
            for conn in self._nodes.values()
        ]


# Connection Pool 싱글톤
pool = ConnectionPool()

# Pending 명령 응답 대기
pending_commands: Dict[str, asyncio.Future] = {}

# ============================================================
# FastAPI App
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 라이프사이클"""
    logger.info("🧠 Cloud Gateway 시작")
    logger.info("🌌 \"복잡한 생각은 버려라.\" - Orion")
    yield
    logger.info("🧠 Cloud Gateway 종료")


app = FastAPI(
    title="DoAi.Me Cloud Gateway",
    description="The Brain - Node Connection Manager",
    version="2.0.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# WebSocket: 노드 연결
# ============================================================

@app.websocket("/ws/node")
async def websocket_node(websocket: WebSocket):
    """
    노드 WebSocket 연결
    
    Protocol:
    1. 연결 시 HELLO 메시지로 node_id 전송
    2. 30초마다 HEARTBEAT (HEARTBEAT_ACK 응답)
    3. COMMAND 수신 → Laixi 실행 → RESULT 응답
    """
    await websocket.accept()
    node_id = None
    
    try:
        # 1. HELLO 대기 (10초 타임아웃)
        try:
            hello = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
        except asyncio.TimeoutError:
            await websocket.close(code=4001, reason="HELLO timeout")
            return
        
        if hello.get("type") != "HELLO":
            await websocket.close(code=4002, reason="Expected HELLO")
            return
        
        node_id = hello.get("node_id")
        if not node_id:
            await websocket.close(code=4003, reason="Missing node_id")
            return
        
        # 2. 연결 풀에 추가
        conn = await pool.add(node_id, websocket)
        
        # HELLO_ACK 응답
        await websocket.send_json({
            "type": "HELLO_ACK",
            "server_time": datetime.utcnow().isoformat()
        })
        
        # 초기 디바이스 정보 업데이트
        await pool.update_heartbeat(node_id, hello.get("device_count", 0))
        
        # 3. 메시지 수신 루프
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            
            if msg_type == "HEARTBEAT":
                # 하트비트 처리
                await pool.update_heartbeat(
                    node_id, 
                    message.get("device_count", 0)
                )
                await websocket.send_json({
                    "type": "HEARTBEAT_ACK",
                    "server_time": datetime.utcnow().isoformat()
                })
            
            elif msg_type == "RESULT":
                # 명령 결과 처리
                cmd_id = message.get("command_id")
                if cmd_id and cmd_id in pending_commands:
                    pending_commands[cmd_id].set_result(message)
                logger.info(f"[{node_id}] RESULT: {message.get('success')}")
            
            elif msg_type == "EVENT":
                # 이벤트 로깅
                logger.info(f"[{node_id}] EVENT: {message.get('event')}")
            
            else:
                logger.warning(f"[{node_id}] 알 수 없는 메시지: {msg_type}")
    
    except WebSocketDisconnect:
        logger.info(f"[{node_id or 'unknown'}] 연결 끊김")
    except Exception as e:
        logger.error(f"[{node_id or 'unknown'}] 에러: {e}")
    finally:
        if node_id:
            await pool.remove(node_id)


# ============================================================
# REST API: 명령 전송
# ============================================================

class CommandRequest(BaseModel):
    """명령 요청"""
    node_id: str
    action: str  # 'watch', 'tap', 'swipe', 'adb', etc.
    device_id: str = "all"
    params: dict = {}


class CommandResponse(BaseModel):
    """명령 응답"""
    success: bool
    command_id: str
    result: Optional[dict] = None
    error: Optional[str] = None


@app.post("/api/command", response_model=CommandResponse)
async def send_command(request: CommandRequest):
    """
    노드에 명령 전송
    
    프론트엔드 → Gateway → Node → Laixi
    """
    conn = await pool.get(request.node_id)
    if not conn:
        raise HTTPException(
            status_code=404, 
            detail=f"Node not found: {request.node_id}"
        )
    
    command_id = str(uuid.uuid4())[:8]
    
    # 명령 전송
    command = {
        "type": "COMMAND",
        "command_id": command_id,
        "action": request.action,
        "device_id": request.device_id,
        "params": request.params
    }
    
    # Future 생성 (응답 대기용)
    future = asyncio.get_event_loop().create_future()
    pending_commands[command_id] = future
    
    try:
        success = await pool.send_to_node(request.node_id, command)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send command")
        
        # 60초 타임아웃으로 응답 대기 (Laixi 작업은 오래 걸릴 수 있음)
        try:
            result = await asyncio.wait_for(future, timeout=60.0)
            return CommandResponse(
                success=result.get("success", False),
                command_id=command_id,
                result=result.get("data"),
                error=result.get("error")
            )
        except asyncio.TimeoutError:
            return CommandResponse(
                success=False,
                command_id=command_id,
                error="Command timeout (60s)"
            )
    finally:
        pending_commands.pop(command_id, None)


# ============================================================
# REST API: 노드 상태
# ============================================================

@app.get("/api/nodes")
async def list_nodes():
    """연결된 노드 목록"""
    return {
        "nodes": pool.list_nodes(),
        "total": len(pool.list_nodes())
    }


@app.get("/api/nodes/{node_id}")
async def get_node(node_id: str):
    """특정 노드 상태"""
    conn = await pool.get(node_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return {
        "node_id": conn.node_id,
        "connected_at": conn.connected_at.isoformat(),
        "last_heartbeat": conn.last_heartbeat.isoformat(),
        "device_count": conn.device_count,
        "status": conn.status
    }


@app.get("/health")
async def health():
    """헬스체크"""
    return {
        "status": "ok",
        "nodes_connected": len(pool.list_nodes())
    }


# ============================================================
# 메인
# ============================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
