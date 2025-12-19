"""AIFarm 메인 실행 파일"""

import argparse
import logging
from src.controller.device_manager import DeviceManager
from src.automation.youtube_agent import YouTubeAgent
from src.utils.ip_generator import generate_ips
import yaml
import random

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_config():
    """설정 파일 로드"""
    try:
        with open('config/config.yaml', 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        logger.warning("설정 파일을 찾을 수 없습니다. 기본 설정을 사용합니다.")
        return {}


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='AIFarm - 폰보드 자동화 시스템')
    parser.add_argument('--mode', choices=['connect', 'youtube', 'test'], default='connect',
                        help='실행 모드')
    parser.add_argument('--keyword', type=str, help='YouTube 검색 키워드')
    parser.add_argument('--max-workers', type=int, default=50, help='최대 동시 작업 수')
    parser.add_argument('--batch-size', type=int, default=50, help='배치 크기')
    
    args = parser.parse_args()
    config = load_config()
    
    # 네트워크 설정
    port = config.get('network', {}).get('port', 5555)
    wait_timeout = config.get('automation', {}).get('default_wait_timeout', 5)
    max_workers = args.max_workers or config.get('network', {}).get('max_workers', 50)
    
    device_manager = DeviceManager(port=port, wait_timeout=wait_timeout)
    
    if args.mode == 'connect':
        # 연결 모드
        logger.info("디바이스 연결 시작...")
        device_manager.connect_all(max_workers=max_workers)
        logger.info(f"연결된 디바이스: {len(device_manager.get_connected_ips())}대")
    
    elif args.mode == 'youtube':
        # YouTube 자동화 모드
        logger.info("YouTube 자동화 시작...")
        
        # 먼저 연결
        device_manager.connect_all(max_workers=max_workers)
        connected_ips = device_manager.get_connected_ips()
        logger.info(f"연결된 디바이스: {len(connected_ips)}대")
        
        if len(connected_ips) == 0:
            logger.error("연결된 디바이스가 없습니다.")
            return
        
        # YouTube 설정
        youtube_config = config.get('youtube', {})
        keywords = youtube_config.get('keywords', ['AI 뉴스'])
        comments = youtube_config.get('comments', ['좋은 영상 감사합니다!'])
        watch_time_range = youtube_config.get('watch_time_range', [30, 120])
        like_probability = youtube_config.get('like_probability', 0.5)
        comment_probability = youtube_config.get('comment_probability', 0.2)
        
        keyword = args.keyword or random.choice(keywords)
        logger.info(f"사용 키워드: {keyword}")
        
        def youtube_action(device):
            agent = YouTubeAgent(device)
            comment = random.choice(comments) if random.random() < comment_probability else None
            agent.run_automation_task(
                keyword=keyword,
                watch_time_range=tuple(watch_time_range),
                like_probability=like_probability,
                comment_probability=comment_probability,
                comment=comment
            )
        
        # 배치 실행
        device_manager.execute_batch(youtube_action, batch_size=args.batch_size)
    
    elif args.mode == 'test':
        # 테스트 모드 (단일 디바이스)
        logger.info("테스트 모드 - 단일 디바이스 연결...")
        test_ip = "10.0.10.1"
        
        if device_manager.connect_device(test_ip):
            device = device_manager.get_device(test_ip)
            if device:
                logger.info("테스트 디바이스 연결 성공")
                # 간단한 테스트
                device.screen_on()
                logger.info("화면 켜기 완료")
            else:
                logger.error("디바이스 객체를 가져올 수 없습니다.")
        else:
            logger.error("디바이스 연결 실패")


if __name__ == "__main__":
    main()

