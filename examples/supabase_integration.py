"""Supabase 연동 예제"""

import asyncio
import os
from dotenv import load_dotenv

from src.controller.device_manager import DeviceManager
from src.data.supabase_executor import SupabaseExecutor, TaskScheduler

# 내장 태스크 로드
from src.modules.tasks import *

# .env 파일 로드
load_dotenv()


async def create_and_execute_task():
    """Supabase에 태스크 생성 및 실행"""
    
    # 환경 변수에서 설정 로드
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("SUPABASE_URL과 SUPABASE_KEY 환경변수를 설정하세요.")
        print("config/.env.example 파일을 참고하여 .env 파일을 생성하세요.")
        return
    
    # 1. 디바이스 연결
    print("=== 디바이스 연결 ===")
    manager = DeviceManager()
    manager.connect_device("10.0.10.1")  # 테스트용
    
    print(f"연결된 디바이스: {len(manager.connections)}대")
    
    if not manager.connections:
        print("연결된 디바이스가 없습니다.")
        return
    
    # 2. Supabase 실행기 생성
    executor = SupabaseExecutor(supabase_url, supabase_key, manager)
    
    # 3. 새 태스크 생성
    print("\n=== 태스크 생성 ===")
    task_data = await executor.supabase.create_task(
        name="YouTube 시청 테스트",
        task_type="youtube_watch",
        parameters={
            "keywords": ["AI 뉴스", "기술 트렌드"],
            "watch_time_range": [30, 60],
            "like_probability": 0.5,
            "comment_probability": 0.1,
            "comments": ["좋은 영상입니다!"]
        },
        target_device_count=len(manager.connections)
    )
    
    print(f"생성된 태스크 ID: {task_data['id']}")
    
    # 4. 대기 중인 태스크 처리
    print("\n=== 태스크 실행 ===")
    results = await executor.process_pending_tasks()
    
    for result in results:
        status = "성공" if result['success'] else "실패"
        print(f"태스크 {result['task_id']}: {status}")


async def run_daemon_mode():
    """데몬 모드로 실행 (주기적으로 태스크 확인)"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("SUPABASE_URL과 SUPABASE_KEY 환경변수를 설정하세요.")
        return
    
    # 1. 디바이스 연결
    print("=== 디바이스 연결 ===")
    manager = DeviceManager()
    
    # 전체 연결
    manager.connect_all(max_workers=50)
    
    print(f"연결된 디바이스: {len(manager.connections)}대")
    
    # 2. 실행기 생성 및 데몬 시작
    executor = SupabaseExecutor(supabase_url, supabase_key, manager)
    
    print("\n=== 데몬 모드 시작 (30초 간격) ===")
    print("Ctrl+C로 종료")
    
    try:
        await executor.run_daemon(interval=30)
    except KeyboardInterrupt:
        print("\n데몬 종료")
        executor.stop_daemon()


async def schedule_task_example():
    """태스크 스케줄링 예제"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("환경변수를 설정하세요.")
        return
    
    # 디바이스 연결
    manager = DeviceManager()
    manager.connect_device("10.0.10.1")
    
    # 실행기 및 스케줄러 생성
    executor = SupabaseExecutor(supabase_url, supabase_key, manager)
    scheduler = TaskScheduler(executor)
    
    # 10초 후 실행되는 태스크 스케줄링
    print("=== 태스크 스케줄링 (10초 후 실행) ===")
    task_id = await scheduler.schedule_task(
        name="스케줄된 화면 캡처",
        task_type="screenshot",
        parameters={"save_dir": "scheduled_screenshots"},
        delay_seconds=10
    )
    
    print(f"스케줄된 태스크 ID: {task_id}")
    print("10초 대기 중...")
    
    await asyncio.sleep(15)
    print("완료")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        mode = sys.argv[1]
        if mode == "daemon":
            asyncio.run(run_daemon_mode())
        elif mode == "schedule":
            asyncio.run(schedule_task_example())
        else:
            asyncio.run(create_and_execute_task())
    else:
        asyncio.run(create_and_execute_task())

