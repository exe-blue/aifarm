"""FastAPI 서버"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import yaml
import os
import asyncio

from src.controller.device_manager import DeviceManager
from src.controller.adb_controller import ADBController
from src.modules import TaskRegistry, TaskConfig
from src.modules.execution_engine import ExecutionEngine

# 내장 태스크 로드
from src.modules.tasks import *

app = FastAPI(title="AIFarm API", version="1.0.0")

# 전역 인스턴스
device_manager: Optional[DeviceManager] = None
adb_controller: Optional[ADBController] = None
execution_engine: Optional[ExecutionEngine] = None


def load_config():
    """설정 파일 로드"""
    config_path = "config/config.yaml"
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    return {}


@app.on_event("startup")
async def startup_event():
    """서버 시작 시 초기화"""
    global device_manager, adb_controller, execution_engine
    config = load_config()
    
    port = config.get('network', {}).get('port', 5555)
    wait_timeout = config.get('automation', {}).get('default_wait_timeout', 5)
    
    device_manager = DeviceManager(port=port, wait_timeout=wait_timeout)
    adb_controller = ADBController()
    execution_engine = ExecutionEngine(device_manager)


# ==================== Request Models ====================

class ConnectRequest(BaseModel):
    ips: Optional[List[str]] = None
    max_workers: int = 50


class ExecuteCommandRequest(BaseModel):
    command: str
    max_workers: int = 50


class TaskRequest(BaseModel):
    task_type: str
    parameters: Dict[str, Any] = {}
    devices: Optional[List[str]] = None
    batch_size: int = 50


class YouTubeTaskRequest(BaseModel):
    keywords: List[str] = ["AI 뉴스"]
    watch_time_range: List[int] = [30, 120]
    like_probability: float = 0.5
    comment_probability: float = 0.2
    comments: List[str] = ["좋은 영상 감사합니다!"]
    devices: Optional[List[str]] = None
    batch_size: int = 50


# ==================== Basic Endpoints ====================

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "AIFarm API",
        "version": "1.0.0",
        "status": "running",
        "connected_devices": len(device_manager.connections) if device_manager else 0
    }


@app.get("/health")
async def health():
    """헬스 체크"""
    return {"status": "healthy"}


# ==================== Device Endpoints ====================

@app.post("/devices/connect")
async def connect_devices(request: ConnectRequest):
    """디바이스 연결"""
    if device_manager is None:
        raise HTTPException(status_code=500, detail="DeviceManager not initialized")
    
    results = device_manager.connect_all(ips=request.ips, max_workers=request.max_workers)
    success_count = sum(results.values())
    
    return {
        "success": success_count,
        "total": len(results),
        "results": results
    }


@app.get("/devices")
async def get_devices():
    """연결된 디바이스 목록"""
    if device_manager is None:
        raise HTTPException(status_code=500, detail="DeviceManager not initialized")
    
    ips = device_manager.get_connected_ips()
    return {
        "count": len(ips),
        "devices": ips
    }


@app.post("/devices/disconnect")
async def disconnect_devices():
    """전체 디바이스 연결 해제"""
    if device_manager is None:
        raise HTTPException(status_code=500, detail="DeviceManager not initialized")
    
    device_manager.disconnect_all()
    return {"message": "All devices disconnected"}


# ==================== ADB Endpoints ====================

@app.post("/adb/connect")
async def adb_connect(request: ConnectRequest):
    """ADB 연결"""
    if adb_controller is None:
        raise HTTPException(status_code=500, detail="ADBController not initialized")
    
    results = adb_controller.connect_all(ips=request.ips, max_workers=request.max_workers)
    success_count = sum(results.values())
    
    return {
        "success": success_count,
        "total": len(results)
    }


@app.post("/adb/execute")
async def adb_execute(request: ExecuteCommandRequest):
    """ADB 명령 실행"""
    if adb_controller is None:
        raise HTTPException(status_code=500, detail="ADBController not initialized")
    
    results = adb_controller.execute_on_all(request.command, max_workers=request.max_workers)
    success_count = sum(results.values())
    
    return {
        "success": success_count,
        "total": len(results),
        "command": request.command
    }


# ==================== Task Endpoints ====================

@app.get("/tasks")
async def list_tasks():
    """등록된 태스크 목록"""
    tasks = []
    for name in TaskRegistry.list_tasks():
        metadata = TaskRegistry.get_metadata(name)
        tasks.append({
            "name": name,
            "description": metadata.get("description", ""),
            "version": metadata.get("version", "1.0.0")
        })
    
    return {"tasks": tasks}


@app.post("/tasks/execute")
async def execute_task(request: TaskRequest, background_tasks: BackgroundTasks):
    """태스크 실행"""
    if device_manager is None or execution_engine is None:
        raise HTTPException(status_code=500, detail="Not initialized")
    
    if len(device_manager.connections) == 0:
        raise HTTPException(status_code=400, detail="No connected devices")
    
    # 태스크 클래스 조회
    task_class = TaskRegistry.get(request.task_type)
    if not task_class:
        raise HTTPException(status_code=404, detail=f"Task not found: {request.task_type}")
    
    # 태스크 설정 생성
    config = TaskConfig(
        name=request.task_type,
        target_devices=request.devices or [],
        parameters=request.parameters
    )
    
    # 태스크 인스턴스 생성
    task = task_class(config)
    
    # 비동기 실행
    results = await execution_engine.run_task(
        task,
        devices=request.devices,
        batch_size=request.batch_size
    )
    
    summary = execution_engine.get_summary()
    
    return {
        "task_type": request.task_type,
        "summary": summary,
        "results": [
            {
                "ip": r.ip,
                "success": r.success,
                "result": r.result,
                "error": r.error,
                "duration": r.duration
            }
            for r in results
        ]
    }


@app.post("/tasks/youtube")
async def youtube_task(request: YouTubeTaskRequest):
    """YouTube 자동화 태스크 실행"""
    if device_manager is None or execution_engine is None:
        raise HTTPException(status_code=500, detail="Not initialized")
    
    if len(device_manager.connections) == 0:
        raise HTTPException(status_code=400, detail="No connected devices")
    
    from src.modules.tasks.youtube_task import YouTubeWatchTask, YouTubeTaskConfig
    
    # YouTube 태스크 설정
    config = YouTubeTaskConfig(
        name="youtube_api_task",
        keywords=request.keywords,
        watch_time_range=tuple(request.watch_time_range),
        like_probability=request.like_probability,
        comment_probability=request.comment_probability,
        comments=request.comments
    )
    
    # 태스크 실행
    task = YouTubeWatchTask(config)
    results = await execution_engine.run_task(
        task,
        devices=request.devices,
        batch_size=request.batch_size
    )
    
    summary = execution_engine.get_summary()
    
    return {
        "task": "youtube_watch",
        "summary": summary
    }


# ==================== Config Endpoints ====================

@app.get("/config")
async def get_config():
    """현재 설정 조회"""
    config = load_config()
    # 민감한 정보 제외
    safe_config = {
        "network": config.get("network", {}),
        "automation": config.get("automation", {}),
        "execution": config.get("execution", {}),
        "youtube": config.get("youtube", {})
    }
    return safe_config


@app.get("/config/youtube")
async def get_youtube_config():
    """YouTube 설정 조회"""
    config = load_config()
    return config.get("youtube", {})


# ==================== Main ====================

if __name__ == "__main__":
    config = load_config()
    api_config = config.get('api', {})
    host = api_config.get('host', '0.0.0.0')
    port = api_config.get('port', 8000)
    
    uvicorn.run(app, host=host, port=port)
