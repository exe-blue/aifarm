"""
AIFarm API Server - Production Deployment
Vultr 서버 배포용 FastAPI 백엔드
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import asyncio
import httpx
from datetime import datetime
import uuid
import logging

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

# Supabase 클라이언트
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    logger.warning("Supabase credentials not found. Running in mock mode.")
    supabase = None
else:
    supabase: Client = create_client(supabase_url, supabase_key)

app = FastAPI(
    title="AIFarm API",
    description="YouTube Intelligence System Backend - 600대 디바이스 자동화 플랫폼",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 설정
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Models ====================

class DeviceCommand(BaseModel):
    device_id: int
    command: str
    params: Optional[dict] = None

class ActivityAssignment(BaseModel):
    activity_id: str
    device_ids: List[int]

class ChannelUpdate(BaseModel):
    channel_id: str
    stats: Optional[dict] = None
    experience_points: Optional[int] = None

class DORequestCreate(BaseModel):
    type: str = "youtube_watch"
    title: str
    keyword: str
    video_title: Optional[str] = None
    video_url: Optional[str] = None
    channel_name: Optional[str] = None
    agent_start: int = 1
    agent_end: int = 100
    batch_size: int = 5
    like_probability: int = 30
    comment_probability: int = 10
    subscribe_probability: int = 5
    watch_time_min: int = 60
    watch_time_max: int = 180
    ai_comment_enabled: bool = True
    execute_immediately: bool = True
    priority: int = 2
    memo: Optional[str] = None

class BattleLogCreate(BaseModel):
    event_type: str
    description: str
    our_channel_id: Optional[str] = None
    our_channel_name: Optional[str] = None
    impact_score: int = 0

# ==================== Health Check ====================

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AIFarm API",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    try:
        db_status = "disconnected"
        device_count = 0
        
        if supabase:
            result = supabase.table("devices").select("count", count="exact").execute()
            db_status = "connected"
            device_count = result.count or 0
        
        return {
            "status": "healthy",
            "database": db_status,
            "device_count": device_count,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

# ==================== Dashboard Stats ====================

@app.get("/api/stats")
async def get_dashboard_stats():
    """대시보드 전체 통계"""
    try:
        if not supabase:
            return get_mock_stats()
        
        # 디바이스 통계
        devices = supabase.table("devices").select("status").execute()
        device_stats = {"total": 0, "active": 0, "idle": 0, "error": 0}
        for d in devices.data:
            device_stats["total"] += 1
            status = d.get("status", "idle")
            device_stats[status] = device_stats.get(status, 0) + 1
        
        # 활동 통계
        activities = supabase.table("activities").select("*").execute()
        
        # 오늘 트렌드
        today = datetime.utcnow().date().isoformat()
        trends = supabase.table("trending_shorts").select("count", count="exact").gte("detected_at", today).execute()
        
        # 오늘 아이디어
        ideas = supabase.table("remix_ideas").select("count", count="exact").gte("created_at", today).execute()
        
        # 채널 정보
        channels = supabase.table("channels").select("level").execute()
        avg_level = sum(c.get("level", 0) for c in channels.data) / len(channels.data) if channels.data else 0
        
        return {
            "devices": device_stats,
            "activities": activities.data,
            "trends_today": trends.count or 0,
            "ideas_today": ideas.count or 0,
            "total_channels": len(channels.data),
            "avg_channel_level": round(avg_level, 1)
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return get_mock_stats()

def get_mock_stats():
    """Mock 통계 데이터"""
    return {
        "devices": {"total": 600, "active": 546, "idle": 42, "error": 12},
        "activities": [
            {"id": "shorts_remix", "name": "Shorts 리믹스 팩토리", "active_devices": 118, "allocated_devices": 125},
            {"id": "playlist_curator", "name": "AI DJ 플레이리스트", "active_devices": 95, "allocated_devices": 100},
            {"id": "persona_commenter", "name": "페르소나 코멘터", "active_devices": 119, "allocated_devices": 125},
            {"id": "trend_scout", "name": "트렌드 스카우터", "active_devices": 87, "allocated_devices": 90},
            {"id": "challenge_hunter", "name": "챌린지 헌터", "active_devices": 66, "allocated_devices": 70},
            {"id": "thumbnail_lab", "name": "썸네일/제목 랩", "active_devices": 61, "allocated_devices": 65},
        ],
        "trends_today": 156,
        "ideas_today": 23,
        "total_channels": 10,
        "avg_channel_level": 51.8
    }

# ==================== Device Management ====================

@app.get("/api/devices")
async def get_devices(
    phoneboard_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = Query(default=100, le=600)
):
    """디바이스 목록 조회"""
    try:
        if not supabase:
            return {"devices": generate_mock_devices(limit)}
        
        query = supabase.table("devices").select("*")
        
        if phoneboard_id:
            query = query.eq("phoneboard_id", phoneboard_id)
        if status:
            query = query.eq("status", status)
        
        result = query.order("id").limit(limit).execute()
        return {"devices": result.data}
    except Exception as e:
        logger.error(f"Get devices error: {e}")
        return {"devices": generate_mock_devices(limit)}

def generate_mock_devices(count: int = 100):
    """Mock 디바이스 데이터 생성"""
    return [
        {
            "id": i + 1,
            "device_id": f"device_{i+1:03d}",
            "phoneboard_id": (i // 20) + 1,
            "slot_number": (i % 20) + 1,
            "status": "active" if i < count * 0.9 else "idle",
            "current_activity": ["shorts_remix", "playlist_curator", "persona_commenter"][i % 3] if i < count * 0.9 else None,
            "ip_address": f"192.168.1.{100 + i}"
        }
        for i in range(count)
    ]

@app.post("/api/devices/{device_id}/command")
async def send_device_command(device_id: int, command: DeviceCommand, background_tasks: BackgroundTasks):
    """디바이스에 명령 전송"""
    try:
        if supabase:
            device = supabase.table("devices").select("*").eq("id", device_id).single().execute()
            if not device.data:
                raise HTTPException(status_code=404, detail="Device not found")
            background_tasks.add_task(execute_device_command, device.data, command)
        
        return {
            "status": "command_queued",
            "device_id": device_id,
            "command": command.command
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Device command error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def execute_device_command(device: dict, command: DeviceCommand):
    """실제 디바이스 명령 실행 (백그라운드)"""
    try:
        mini_pc_ip = f"192.168.1.{device['phoneboard_id'] + 10}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"http://{mini_pc_ip}:5000/device/{device['slot_number']}/command",
                json={"command": command.command, "params": command.params}
            )
            
            if supabase:
                supabase.table("activity_logs").insert({
                    "device_id": device["id"],
                    "activity_id": device.get("current_activity"),
                    "action": command.command,
                    "result": response.json()
                }).execute()
    except Exception as e:
        logger.error(f"Device command execution error: {e}")

@app.post("/api/devices/heartbeat")
async def device_heartbeat(device_ids: List[int]):
    """디바이스 하트비트 업데이트"""
    try:
        now = datetime.utcnow().isoformat()
        updated = 0
        
        if supabase:
            for device_id in device_ids:
                supabase.table("devices").update({
                    "last_heartbeat": now,
                    "status": "active"
                }).eq("id", device_id).execute()
                updated += 1
        
        return {"status": "ok", "updated": updated or len(device_ids)}
    except Exception as e:
        logger.error(f"Heartbeat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Activity Management ====================

@app.get("/api/activities")
async def get_activities():
    """활동 목록 조회"""
    try:
        if not supabase:
            return {"activities": get_mock_stats()["activities"]}
        
        result = supabase.table("activities").select("*").execute()
        return {"activities": result.data}
    except Exception as e:
        logger.error(f"Get activities error: {e}")
        return {"activities": get_mock_stats()["activities"]}

@app.post("/api/activities/{activity_id}/assign")
async def assign_devices_to_activity(activity_id: str, assignment: ActivityAssignment):
    """디바이스를 활동에 할당"""
    try:
        if supabase:
            for device_id in assignment.device_ids:
                supabase.table("devices").update({
                    "current_activity": activity_id,
                    "status": "active"
                }).eq("id", device_id).execute()
            
            supabase.table("activities").update({
                "active_devices": len(assignment.device_ids)
            }).eq("id", activity_id).execute()
        
        return {"status": "assigned", "count": len(assignment.device_ids)}
    except Exception as e:
        logger.error(f"Activity assignment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/activities/{activity_id}/start")
async def start_activity(activity_id: str, background_tasks: BackgroundTasks):
    """활동 시작"""
    background_tasks.add_task(run_activity, activity_id)
    return {"status": "started", "activity_id": activity_id}

async def run_activity(activity_id: str):
    """활동 실행 로직"""
    logger.info(f"Starting activity: {activity_id}")
    # 활동별 로직은 별도 모듈에서 구현

# ==================== Channel Management ====================

@app.get("/api/channels")
async def get_channels():
    """채널 목록 조회"""
    try:
        if not supabase:
            return {"channels": get_mock_channels()}
        
        result = supabase.table("channels").select("*").order("level", desc=True).execute()
        return {"channels": result.data}
    except Exception as e:
        logger.error(f"Get channels error: {e}")
        return {"channels": get_mock_channels()}

def get_mock_channels():
    """Mock 채널 데이터"""
    return [
        {"id": "1", "name": "게임마스터TV", "category": "게임", "level": 67, "subscriber_count": 847000},
        {"id": "2", "name": "뷰티퀸소희", "category": "뷰티", "level": 54, "subscriber_count": 523000},
        {"id": "3", "name": "테크리뷰현우", "category": "IT/테크", "level": 42, "subscriber_count": 312000},
    ]

@app.get("/api/channels/{channel_id}")
async def get_channel(channel_id: str):
    """채널 상세 조회"""
    try:
        if not supabase:
            channels = get_mock_channels()
            channel = next((c for c in channels if c["id"] == channel_id), None)
            if not channel:
                raise HTTPException(status_code=404, detail="Channel not found")
            return channel
        
        result = supabase.table("channels").select("*").eq("id", channel_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Channel not found")
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get channel error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/channels/{channel_id}")
async def update_channel(channel_id: str, update: ChannelUpdate):
    """채널 업데이트"""
    try:
        data = {"updated_at": datetime.utcnow().isoformat()}
        if update.stats:
            data["stats"] = update.stats
        if update.experience_points:
            data["experience_points"] = update.experience_points
        
        if supabase:
            result = supabase.table("channels").update(data).eq("id", channel_id).execute()
            return result.data
        
        return {"status": "updated", "channel_id": channel_id}
    except Exception as e:
        logger.error(f"Update channel error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Trends & Ideas ====================

@app.get("/api/trending")
async def get_trending_shorts(limit: int = Query(default=20, le=100)):
    """트렌딩 Shorts 조회"""
    try:
        if not supabase:
            return {"trending": get_mock_trending(limit)}
        
        result = supabase.table("trending_shorts").select("*").order("detected_at", desc=True).limit(limit).execute()
        return {"trending": result.data}
    except Exception as e:
        logger.error(f"Get trending error: {e}")
        return {"trending": get_mock_trending(limit)}

def get_mock_trending(limit: int = 20):
    """Mock 트렌딩 데이터"""
    return [
        {
            "id": f"trend_{i}",
            "title": f"트렌딩 영상 #{i+1}",
            "channel_name": f"채널{i+1}",
            "view_count": 1000000 - i * 50000,
            "viral_score": 0.95 - i * 0.02
        }
        for i in range(min(limit, 10))
    ]

@app.get("/api/ideas")
async def get_remix_ideas(status: Optional[str] = None):
    """리믹스 아이디어 조회"""
    try:
        if not supabase:
            return {"ideas": []}
        
        query = supabase.table("remix_ideas").select("*")
        if status:
            query = query.eq("status", status)
        result = query.order("created_at", desc=True).execute()
        return {"ideas": result.data}
    except Exception as e:
        logger.error(f"Get ideas error: {e}")
        return {"ideas": []}

@app.patch("/api/ideas/{idea_id}")
async def update_idea_status(idea_id: str, status: str):
    """아이디어 상태 업데이트"""
    try:
        if supabase:
            result = supabase.table("remix_ideas").update({"status": status}).eq("id", idea_id).execute()
            return result.data
        return {"status": "updated", "idea_id": idea_id}
    except Exception as e:
        logger.error(f"Update idea error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DO Requests ====================

@app.get("/api/do-requests")
async def get_do_requests(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200)
):
    """DO 요청 목록 조회"""
    try:
        if not supabase:
            return {"requests": []}
        
        query = supabase.table("do_requests").select("*")
        if status:
            query = query.eq("status", status)
        result = query.order("created_at", desc=True).limit(limit).execute()
        return {"requests": result.data}
    except Exception as e:
        logger.error(f"Get DO requests error: {e}")
        return {"requests": []}

@app.post("/api/do-requests")
async def create_do_request(request: DORequestCreate, background_tasks: BackgroundTasks):
    """새 DO 요청 생성"""
    try:
        request_id = str(uuid.uuid4())
        total_agents = request.agent_end - request.agent_start + 1
        
        data = {
            "id": request_id,
            "type": request.type,
            "title": request.title,
            "keyword": request.keyword,
            "video_title": request.video_title,
            "video_url": request.video_url,
            "channel_name": request.channel_name,
            "agent_start": request.agent_start,
            "agent_end": request.agent_end,
            "batch_size": request.batch_size,
            "like_probability": request.like_probability,
            "comment_probability": request.comment_probability,
            "subscribe_probability": request.subscribe_probability,
            "watch_time_min": request.watch_time_min,
            "watch_time_max": request.watch_time_max,
            "ai_comment_enabled": request.ai_comment_enabled,
            "execute_immediately": request.execute_immediately,
            "priority": request.priority,
            "memo": request.memo,
            "status": "pending" if not request.execute_immediately else "in_progress",
            "total_agents": total_agents,
            "completed_agents": 0,
            "failed_agents": 0
        }
        
        if supabase:
            result = supabase.table("do_requests").insert(data).execute()
            
            if request.execute_immediately:
                background_tasks.add_task(process_do_request, request_id)
            
            return {"status": "created", "request": result.data[0] if result.data else data}
        
        return {"status": "created", "request": data}
    except Exception as e:
        logger.error(f"Create DO request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_do_request(request_id: str):
    """DO 요청 처리 (백그라운드)"""
    logger.info(f"Processing DO request: {request_id}")
    # 실제 처리 로직은 별도 모듈에서 구현

@app.patch("/api/do-requests/{request_id}")
async def update_do_request(request_id: str, status: Optional[str] = None):
    """DO 요청 상태 업데이트"""
    try:
        data = {"updated_at": datetime.utcnow().isoformat()}
        if status:
            data["status"] = status
            if status == "completed":
                data["completed_at"] = datetime.utcnow().isoformat()
        
        if supabase:
            result = supabase.table("do_requests").update(data).eq("id", request_id).execute()
            return result.data
        
        return {"status": "updated", "request_id": request_id}
    except Exception as e:
        logger.error(f"Update DO request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Battle Log ====================

@app.get("/api/battle-log")
async def get_battle_log(limit: int = Query(default=50, le=200)):
    """배틀 로그 조회"""
    try:
        if not supabase:
            return {"logs": get_mock_battle_log(limit)}
        
        result = supabase.table("battle_logs").select("*").order("created_at", desc=True).limit(limit).execute()
        return {"logs": result.data}
    except Exception as e:
        logger.error(f"Get battle log error: {e}")
        return {"logs": get_mock_battle_log(limit)}

def get_mock_battle_log(limit: int = 50):
    """Mock 배틀 로그"""
    return [
        {"id": "1", "event_type": "viral_hit", "description": "🔥 바이럴 영상 발생!", "impact_score": 95},
        {"id": "2", "event_type": "rank_up", "description": "📈 순위 상승!", "impact_score": 70},
    ]

@app.post("/api/battle-log")
async def create_battle_log(log: BattleLogCreate):
    """배틀 로그 생성"""
    try:
        log_id = str(uuid.uuid4())
        data = {
            "id": log_id,
            "event_type": log.event_type,
            "description": log.description,
            "our_channel_id": log.our_channel_id,
            "our_channel_name": log.our_channel_name,
            "impact_score": log.impact_score
        }
        
        if supabase:
            result = supabase.table("battle_logs").insert(data).execute()
            return result.data[0] if result.data else data
        
        return data
    except Exception as e:
        logger.error(f"Create battle log error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Notifications ====================

@app.get("/api/notifications")
async def get_notifications(unread_only: bool = False):
    """알림 조회"""
    try:
        if not supabase:
            return {"notifications": []}
        
        query = supabase.table("notifications").select("*")
        if unread_only:
            query = query.eq("is_read", False)
        result = query.order("created_at", desc=True).execute()
        return {"notifications": result.data}
    except Exception as e:
        logger.error(f"Get notifications error: {e}")
        return {"notifications": []}

@app.patch("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """알림 읽음 처리"""
    try:
        if supabase:
            supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Mark notification read error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Scheduler ====================

@app.post("/api/scheduler/rotate")
async def rotate_devices(background_tasks: BackgroundTasks):
    """디바이스 로테이션 실행"""
    background_tasks.add_task(perform_device_rotation)
    return {"status": "rotation_started"}

async def perform_device_rotation():
    """디바이스 로테이션 로직"""
    logger.info("Performing device rotation...")
    # 로테이션 로직 구현

# ==================== Unified Logs ====================

@app.get("/api/unified-logs")
async def get_unified_logs(
    source: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """통합 로그 조회"""
    try:
        if not supabase:
            return {"logs": []}
        
        query = supabase.table("unified_logs").select("*")
        if source:
            query = query.eq("source", source)
        result = query.order("timestamp", desc=True).limit(limit).execute()
        return {"logs": result.data}
    except Exception as e:
        logger.error(f"Get unified logs error: {e}")
        return {"logs": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "false").lower() == "true"
    )

