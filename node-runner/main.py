"""
DoAi.Me NodeRunner - The Muscle
Local T5810 Agent

단순함이 핵심이다:
- Cloud Gateway에 WebSocket 연결
- COMMAND → Laixi → RESULT
- 30초마다 HEARTBEAT
- Self-Healing (Laixi 재시작)
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime
from typing import Optional, Dict, Any

try:
    import websockets
    from websockets.exceptions import ConnectionClosed
except ImportError:
    print("websockets 패키지가 필요합니다: pip install websockets")
    sys.exit(1)

# ============================================================
# 설정
# ============================================================

# 환경변수 또는 기본값
GATEWAY_URL = os.getenv("GATEWAY_URL", "wss://api.doai.me/ws/node")
NODE_ID = os.getenv("NODE_ID", "node_01")
LAIXI_WS_URL = os.getenv("LAIXI_WS_URL", "ws://127.0.0.1:22221/")
LAIXI_EXE_PATH = os.getenv("LAIXI_EXE_PATH", r"C:\Program Files\touping\touping.exe")

HEARTBEAT_INTERVAL = 30  # 초
RECONNECT_MIN_DELAY = 1  # 초
RECONNECT_MAX_DELAY = 60  # 초

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
# Laixi Client (간단한 WebSocket 클라이언트)
# ============================================================

class LaixiClient:
    """로컬 Laixi와 통신"""
    
    def __init__(self, ws_url: str = LAIXI_WS_URL):
        self.ws_url = ws_url
        self._ws = None
        self._connected = False
        self._lock = asyncio.Lock()
        self._device_count = 0
    
    async def connect(self) -> bool:
        """Laixi 연결"""
        if self._connected:
            return True
        
        try:
            self._ws = await asyncio.wait_for(
                websockets.connect(self.ws_url),
                timeout=5.0
            )
            self._connected = True
            
            # 디바이스 목록 조회
            await self._sync_devices()
            logger.info(f"Laixi 연결됨 ({self._device_count}대 디바이스)")
            return True
            
        except Exception as e:
            logger.error(f"Laixi 연결 실패: {e}")
            self._connected = False
            return False
    
    async def disconnect(self):
        """Laixi 연결 해제"""
        if self._ws:
            try:
                await self._ws.close()
            except:
                pass
        self._ws = None
        self._connected = False
    
    async def _sync_devices(self):
        """디바이스 목록 동기화"""
        response = await self.send_command({"action": "List"})
        if response and response.get("StatusCode") == 200:
            devices = response.get("devices", [])
            self._device_count = len(devices)
    
    async def send_command(self, command: dict, timeout: float = 10.0) -> Optional[dict]:
        """Laixi에 명령 전송"""
        if not self._connected or not self._ws:
            if not await self.connect():
                return None
        
        async with self._lock:
            try:
                await self._ws.send(json.dumps(command))
                response_text = await asyncio.wait_for(
                    self._ws.recv(),
                    timeout=timeout
                )
                return json.loads(response_text)
            except Exception as e:
                logger.error(f"Laixi 명령 실패: {e}")
                self._connected = False
                return None
    
    @property
    def device_count(self) -> int:
        return self._device_count
    
    @property
    def is_connected(self) -> bool:
        return self._connected


# ============================================================
# Self-Healing: Laixi 재시작
# ============================================================

async def restart_laixi():
    """Laixi 앱 재시작 (비동기)"""
    logger.warning("Laixi 재시작 시도...")
    
    try:
        # 기존 프로세스 종료 (비동기로 실행)
        await asyncio.to_thread(
            subprocess.run,
            ["taskkill", "/f", "/im", "touping.exe"],
            capture_output=True,
            timeout=10
        )
        await asyncio.sleep(2)
        
        # 재시작
        if os.path.exists(LAIXI_EXE_PATH):
            # 프로세스 시작은 빠르므로 to_thread로 실행
            await asyncio.to_thread(
                subprocess.Popen,
                [LAIXI_EXE_PATH],
                creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
            )
            logger.info("Laixi 재시작됨")
            await asyncio.sleep(5)  # 시작 대기
            return True
        else:
            logger.error(f"Laixi 실행 파일 없음: {LAIXI_EXE_PATH}")
            return False
            
    except Exception as e:
        logger.error(f"Laixi 재시작 실패: {e}")
        return False


# ============================================================
# NodeRunner
# ============================================================

class NodeRunner:
    """
    메인 에이전트
    
    - Gateway에 WebSocket 연결
    - COMMAND 수신 → Laixi 실행 → RESULT 전송
    - 30초마다 HEARTBEAT
    """
    
    def __init__(self, gateway_url: str, node_id: str):
        self.gateway_url = gateway_url
        self.node_id = node_id
        self.laixi = LaixiClient()
        
        self._ws = None
        self._connected = False
        self._reconnect_delay = RECONNECT_MIN_DELAY
        self._should_run = True
        
        # 연속 Laixi 실패 카운트
        self._laixi_failures = 0
        self._max_laixi_failures = 5
    
    async def run(self):
        """메인 실행 루프 (무한 재접속)"""
        logger.info(f"NodeRunner 시작: {self.node_id}")
        logger.info(f"Gateway: {self.gateway_url}")
        
        while self._should_run:
            try:
                await self._connect_and_run()
            except Exception as e:
                logger.error(f"연결 에러: {e}")
            
            if self._should_run:
                logger.info(f"{self._reconnect_delay}초 후 재접속...")
                await asyncio.sleep(self._reconnect_delay)
                
                # Exponential Backoff
                self._reconnect_delay = min(
                    self._reconnect_delay * 2,
                    RECONNECT_MAX_DELAY
                )
    
    async def _connect_and_run(self):
        """Gateway 연결 및 메시지 루프"""
        try:
            logger.info("Gateway 연결 중...")
            
            async with websockets.connect(
                self.gateway_url,
                ping_interval=20,
                ping_timeout=10
            ) as ws:
                self._ws = ws
                self._connected = True
                self._reconnect_delay = RECONNECT_MIN_DELAY  # 성공 시 리셋
                
                # HELLO 전송
                await self._send_hello()
                
                # Laixi 연결
                await self.laixi.connect()
                
                # HEARTBEAT 태스크 시작
                heartbeat_task = asyncio.create_task(self._heartbeat_loop())
                
                try:
                    # 메시지 수신 루프
                    await self._message_loop()
                finally:
                    heartbeat_task.cancel()
                    try:
                        await heartbeat_task
                    except asyncio.CancelledError:
                        pass
        
        except ConnectionClosed as e:
            logger.warning(f"연결 끊김: {e.code} {e.reason}")
        except Exception as e:
            logger.error(f"연결 에러: {e}")
        finally:
            self._connected = False
            self._ws = None
    
    async def _send_hello(self):
        """HELLO 메시지 전송"""
        hello = {
            "type": "HELLO",
            "node_id": self.node_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self._ws.send(json.dumps(hello))
        
        # HELLO_ACK 대기
        response = await asyncio.wait_for(
            self._ws.recv(),
            timeout=10.0
        )
        data = json.loads(response)
        
        if data.get("type") == "HELLO_ACK":
            logger.info(f"Gateway 연결 성공 (server: {data.get('server_time')})")
        else:
            raise Exception(f"Unexpected response: {data}")
    
    async def _heartbeat_loop(self):
        """30초마다 HEARTBEAT 전송"""
        while self._connected:
            try:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                
                if not self._connected:
                    break
                
                # Laixi 상태 확인
                if not self.laixi.is_connected:
                    await self.laixi.connect()
                
                heartbeat = {
                    "type": "HEARTBEAT",
                    "node_id": self.node_id,
                    "device_count": self.laixi.device_count,
                    "laixi_connected": self.laixi.is_connected,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                await self._ws.send(json.dumps(heartbeat))
                logger.debug(f"HEARTBEAT 전송 ({self.laixi.device_count}대)")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"HEARTBEAT 에러: {e}")
    
    async def _message_loop(self):
        """메시지 수신 및 처리"""
        async for message in self._ws:
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                
                if msg_type == "HEARTBEAT_ACK":
                    # ACK 무시
                    pass
                
                elif msg_type == "COMMAND":
                    # 명령 처리
                    asyncio.create_task(self._handle_command(data))
                
                else:
                    logger.warning(f"알 수 없는 메시지: {msg_type}")
                    
            except json.JSONDecodeError:
                logger.error(f"JSON 파싱 실패: {message}")
    
    async def _handle_command(self, command: dict):
        """명령 처리 → Laixi → 결과 전송"""
        command_id = command.get("command_id")
        action = command.get("action")
        device_id = command.get("device_id", "all")
        params = command.get("params", {})
        
        logger.info(f"COMMAND 수신: {action} (id={command_id})")
        
        result = {
            "type": "RESULT",
            "command_id": command_id,
            "success": False,
            "data": None,
            "error": None
        }
        
        try:
            # Laixi 연결 확인
            if not self.laixi.is_connected:
                if not await self.laixi.connect():
                    # Self-Healing: Laixi 재시작
                    self._laixi_failures += 1
                    
                    if self._laixi_failures >= self._max_laixi_failures:
                        await restart_laixi()
                        await asyncio.sleep(5)
                        self._laixi_failures = 0
                    
                    if not await self.laixi.connect():
                        raise Exception("Laixi 연결 불가")
            
            # 명령 실행
            laixi_response = await self._execute_action(action, device_id, params)
            
            if laixi_response:
                result["success"] = laixi_response.get("StatusCode") == 200
                result["data"] = laixi_response
                self._laixi_failures = 0  # 성공 시 리셋
            else:
                result["error"] = "Laixi 응답 없음"
                self._laixi_failures += 1
        
        except Exception as e:
            logger.error(f"명령 처리 실패: {e}")
            result["error"] = str(e)
        
        # 결과 전송
        if self._connected and self._ws:
            await self._ws.send(json.dumps(result))
            logger.info(f"RESULT 전송: {result['success']} (id={command_id})")
    
    async def _execute_action(
        self, 
        action: str, 
        device_id: str, 
        params: dict
    ) -> Optional[dict]:
        """액션 → Laixi 명령 변환 및 실행"""
        
        # 액션별 Laixi 명령 매핑
        if action == "list":
            return await self.laixi.send_command({"action": "List"})
        
        elif action == "watch":
            # YouTube 시청
            url = params.get("url", "")
            return await self.laixi.send_command({
                "action": "adb",
                "comm": {
                    "deviceIds": device_id,
                    "cmd": f"am start -a android.intent.action.VIEW -d \"{url}\""
                }
            })
        
        elif action == "tap":
            x = params.get("x", 0)
            y = params.get("y", 0)
            return await self.laixi.send_command({
                "action": "onTap",
                "comm": {
                    "deviceIds": device_id,
                    "x": x,
                    "y": y
                }
            })
        
        elif action == "swipe":
            x1, y1 = params.get("x1", 0), params.get("y1", 0)
            x2, y2 = params.get("x2", 0), params.get("y2", 0)
            duration = params.get("duration", 300)
            return await self.laixi.send_command({
                "action": "onSwipe",
                "comm": {
                    "deviceIds": device_id,
                    "x1": x1, "y1": y1,
                    "x2": x2, "y2": y2,
                    "duration": duration
                }
            })
        
        elif action == "adb":
            cmd = params.get("cmd", "")
            return await self.laixi.send_command({
                "action": "adb",
                "comm": {
                    "deviceIds": device_id,
                    "cmd": cmd
                }
            })
        
        elif action == "home":
            return await self.laixi.send_command({
                "action": "adb",
                "comm": {
                    "deviceIds": device_id,
                    "cmd": "input keyevent 3"
                }
            })
        
        elif action == "back":
            return await self.laixi.send_command({
                "action": "adb",
                "comm": {
                    "deviceIds": device_id,
                    "cmd": "input keyevent 4"
                }
            })
        
        elif action == "current_app":
            return await self.laixi.send_command({
                "action": "CurrentAppInfo",
                "comm": {"deviceIds": device_id}
            })
        
        else:
            logger.warning(f"알 수 없는 액션: {action}")
            return {"StatusCode": 400, "Message": f"Unknown action: {action}"}
    
    def stop(self):
        """종료"""
        self._should_run = False


# ============================================================
# 메인
# ============================================================

async def main():
    """메인 진입점"""
    gateway_url = os.getenv("GATEWAY_URL", GATEWAY_URL)
    node_id = os.getenv("NODE_ID", NODE_ID)
    
    # 로컬 테스트용: ws:// 대신 wss:// 또는 ws://localhost
    if "--local" in sys.argv:
        gateway_url = "ws://localhost:8000/ws/node"
        logger.info("로컬 테스트 모드")
    
    runner = NodeRunner(gateway_url, node_id)
    
    try:
        await runner.run()
    except KeyboardInterrupt:
        logger.info("종료 요청")
        runner.stop()


if __name__ == "__main__":
    asyncio.run(main())


