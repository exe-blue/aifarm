"""기본 사용 예제"""

import asyncio
from src.controller.device_manager import DeviceManager
from src.modules import TaskRegistry, TaskConfig
from src.modules.execution_engine import ExecutionEngine

# 내장 태스크 로드
from src.modules.tasks import *


async def main():
    """기본 사용 예제"""
    
    # 1. 등록된 태스크 확인
    print("=== 등록된 태스크 ===")
    for name in TaskRegistry.list_tasks():
        metadata = TaskRegistry.get_metadata(name)
        print(f"  - {name}: {metadata['description']}")
    print()
    
    # 2. 디바이스 연결
    print("=== 디바이스 연결 ===")
    manager = DeviceManager()
    
    # 테스트용: 단일 디바이스만 연결
    test_ip = "10.0.10.1"
    success = manager.connect_device(test_ip)
    print(f"연결 결과: {success}")
    print()
    
    if not manager.connections:
        print("연결된 디바이스가 없습니다. 종료합니다.")
        return
    
    # 3. 실행 엔진 생성
    engine = ExecutionEngine(manager)
    
    # 4. 화면 켜기 태스크 실행
    print("=== 화면 켜기 태스크 ===")
    screen_on_task = TaskRegistry.create(
        "screen_on",
        TaskConfig(name="screen_on_test")
    )
    
    results = await engine.run_task(screen_on_task)
    print(f"결과: {engine.get_summary()}")
    print()
    
    # 5. 앱 시작 태스크 실행
    print("=== YouTube 앱 시작 ===")
    app_start_task = TaskRegistry.create(
        "app_start",
        TaskConfig(
            name="start_youtube",
            parameters={"package_name": "com.google.android.youtube"}
        )
    )
    
    results = await engine.run_task(app_start_task)
    print(f"결과: {engine.get_summary()}")
    print()
    
    # 6. 잠시 대기
    await asyncio.sleep(3)
    
    # 7. 앱 종료 태스크 실행
    print("=== YouTube 앱 종료 ===")
    app_stop_task = TaskRegistry.create(
        "app_stop",
        TaskConfig(
            name="stop_youtube",
            parameters={"package_name": "com.google.android.youtube"}
        )
    )
    
    results = await engine.run_task(app_stop_task)
    print(f"결과: {engine.get_summary()}")


if __name__ == "__main__":
    asyncio.run(main())

