"""Google Sheets 연동 예제"""

import asyncio
import os
import yaml

from src.controller.device_manager import DeviceManager
from src.modules.execution_engine import ExecutionEngine
from src.modules.tasks.youtube_task import YouTubeWatchTask, YouTubeTaskConfig
from src.data.sheet_loader import GoogleSheetLoader, YouTubeSheetLoader


def load_config():
    """설정 파일 로드"""
    with open('config/config.yaml', 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


async def run_with_sheets():
    """Google Sheets 데이터로 자동화 실행"""
    
    config = load_config()
    sheets_config = config.get('google_sheets', {})
    
    # 1. Google Sheets에서 데이터 로드
    print("=== Google Sheets 데이터 로드 ===")
    
    credentials_path = os.getenv(
        'GOOGLE_CREDENTIALS_PATH',
        sheets_config.get('credentials_path', 'config/google_credentials.json')
    )
    sheet_url = os.getenv('GOOGLE_SHEET_URL', sheets_config.get('sheet_url'))
    
    if not sheet_url:
        print("GOOGLE_SHEET_URL 환경변수 또는 config.yaml에 sheet_url을 설정하세요.")
        return
    
    try:
        loader = YouTubeSheetLoader(
            credentials_path=credentials_path,
            sheet_url=sheet_url,
            keywords_worksheet=sheets_config.get('keywords_worksheet', 'keywords'),
            comments_worksheet=sheets_config.get('comments_worksheet', 'comments')
        )
        
        # 키워드 및 댓글 로드
        youtube_data = loader.load_youtube_config()
        keywords = youtube_data.get('keywords', [])
        comments = youtube_data.get('comments', [])
        
        print(f"로드된 키워드: {len(keywords)}개")
        print(f"로드된 댓글: {len(comments)}개")
        
    except Exception as e:
        print(f"Google Sheets 연결 실패: {e}")
        print("기본 설정을 사용합니다.")
        
        youtube_config = config.get('youtube', {})
        keywords = youtube_config.get('keywords', ['AI 뉴스'])
        comments = youtube_config.get('comments', ['좋은 영상 감사합니다!'])
    
    # 2. 디바이스 연결
    print("\n=== 디바이스 연결 ===")
    manager = DeviceManager()
    manager.connect_device("10.0.10.1")  # 테스트용
    
    print(f"연결된 디바이스: {len(manager.connections)}대")
    
    if not manager.connections:
        print("연결된 디바이스가 없습니다.")
        return
    
    # 3. 태스크 설정 (시트에서 로드한 데이터 사용)
    task_config = YouTubeTaskConfig(
        name="youtube_from_sheets",
        keywords=keywords,
        comments=comments,
        watch_time_range=(30, 120),
        like_probability=0.5,
        comment_probability=0.2
    )
    
    # 4. 실행
    print("\n=== 자동화 실행 ===")
    task = YouTubeWatchTask(task_config)
    engine = ExecutionEngine(manager)
    
    results = await engine.run_task(task)
    
    # 5. 결과 출력
    summary = engine.get_summary()
    print(f"\n=== 결과 ===")
    print(f"성공: {summary['success']}/{summary['total']}")
    
    # 6. 결과를 시트에 저장 (선택사항)
    try:
        if hasattr(loader, 'write_results'):
            result_data = [
                {
                    "ip": r.ip,
                    "success": r.success,
                    "result": str(r.result),
                    "error": r.error or "",
                    "duration": f"{r.duration:.2f}s"
                }
                for r in results
            ]
            loader.write_results(
                sheet_url,
                sheets_config.get('results_worksheet', 'results'),
                result_data
            )
            print("결과가 시트에 저장되었습니다.")
    except Exception as e:
        print(f"결과 저장 실패: {e}")


if __name__ == "__main__":
    asyncio.run(run_with_sheets())

