"""YouTube 자동화 예제"""

import asyncio
import yaml
from src.controller.device_manager import DeviceManager
from src.modules.execution_engine import ExecutionEngine
from src.modules.tasks.youtube_task import YouTubeWatchTask, YouTubeTaskConfig


def load_config():
    """설정 파일 로드"""
    with open('config/config.yaml', 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


async def run_youtube_automation():
    """YouTube 자동화 실행"""
    
    config = load_config()
    youtube_config = config.get('youtube', {})
    
    # 1. 디바이스 연결
    print("=== 디바이스 연결 ===")
    manager = DeviceManager()
    
    # 전체 연결 (또는 테스트용 단일 연결)
    # manager.connect_all(max_workers=50)
    manager.connect_device("10.0.10.1")  # 테스트용
    
    print(f"연결된 디바이스: {len(manager.connections)}대")
    
    if not manager.connections:
        print("연결된 디바이스가 없습니다.")
        return
    
    # 2. YouTube 태스크 설정
    task_config = YouTubeTaskConfig(
        name="youtube_watch_test",
        keywords=youtube_config.get('keywords', ['AI 뉴스']),
        watch_time_range=tuple(youtube_config.get('watch_time_range', [30, 120])),
        like_probability=youtube_config.get('like_probability', 0.5),
        comment_probability=youtube_config.get('comment_probability', 0.2),
        comments=youtube_config.get('comments', ['좋은 영상 감사합니다!'])
    )
    
    # 3. 태스크 생성
    task = YouTubeWatchTask(task_config)
    
    # 4. 실행 엔진으로 실행
    print("\n=== YouTube 자동화 시작 ===")
    engine = ExecutionEngine(manager)
    
    results = await engine.run_task(task, batch_size=50)
    
    # 5. 결과 출력
    print("\n=== 실행 결과 ===")
    summary = engine.get_summary()
    print(f"총 디바이스: {summary['total']}")
    print(f"성공: {summary['success']}")
    print(f"실패: {summary['failure']}")
    print(f"성공률: {summary['success_rate']:.1f}%")
    print(f"평균 실행 시간: {summary['avg_duration']:.1f}초")
    
    # 6. 실패한 디바이스 목록
    failed = engine.get_failed_devices()
    if failed:
        print(f"\n실패한 디바이스: {failed}")


if __name__ == "__main__":
    asyncio.run(run_youtube_automation())

