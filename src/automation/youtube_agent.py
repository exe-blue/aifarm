"""YouTube 자동화 에이전트"""

import time
import random
import logging
from typing import Optional

import uiautomator2 as u2
from src.automation.base_agent import BaseAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class YouTubeAgent(BaseAgent):
    """YouTube 자동화 에이전트"""
    
    def __init__(self, device: u2.Device):
        """
        Args:
            device: uiautomator2 Device 객체
        """
        super().__init__(device, "com.google.android.youtube")
    
    def start_youtube(self):
        """YouTube 앱 시작"""
        self.start_app()
        logger.info("YouTube 앱 시작")
    
    def search_video(self, keyword: str) -> bool:
        """
        영상 검색
        
        Args:
            keyword: 검색 키워드
            
        Returns:
            검색 성공 여부
        """
        try:
            # 검색 버튼 클릭
            if not self.click_element(description="검색"):
                # 대체 방법: 검색 아이콘 찾기
                self.click_element(resourceId="com.google.android.youtube:id/menu_item_1")
            
            time.sleep(1)
            
            # 검색어 입력
            if self.set_text(keyword, resourceId="com.google.android.youtube:id/search_edit_text"):
                self.device.press("enter")
                time.sleep(2)
                logger.info(f"검색 완료: {keyword}")
                return True
            else:
                logger.warning("검색 입력창을 찾을 수 없음")
                return False
        except Exception as e:
            logger.error(f"검색 실패: {e}")
            return False
    
    def play_first_video(self) -> bool:
        """
        첫 번째 영상 재생
        
        Returns:
            재생 성공 여부
        """
        try:
            # 첫 번째 썸네일 클릭
            if self.click_element(resourceId="com.google.android.youtube:id/thumbnail"):
                time.sleep(2)
                logger.info("첫 번째 영상 재생")
                return True
            else:
                logger.warning("영상을 찾을 수 없음")
                return False
        except Exception as e:
            logger.error(f"영상 재생 실패: {e}")
            return False
    
    def watch_video(self, duration_seconds: int):
        """
        영상 시청 (지정 시간)
        
        Args:
            duration_seconds: 시청 시간 (초)
        """
        logger.info(f"영상 시청 중... {duration_seconds}초")
        time.sleep(duration_seconds)
    
    def like_video(self) -> bool:
        """
        좋아요 클릭
        
        Returns:
            좋아요 성공 여부
        """
        try:
            if self.click_element(description="이 동영상이 마음에 듭니다."):
                logger.info("좋아요 완료")
                return True
            else:
                logger.info("좋아요 버튼 없음 (이미 좋아요 했거나 버튼 없음)")
                return False
        except Exception as e:
            logger.warning(f"좋아요 실패: {e}")
            return False
    
    def subscribe_channel(self) -> bool:
        """
        채널 구독
        
        Returns:
            구독 성공 여부
        """
        try:
            if self.click_element(textContains="구독"):
                logger.info("구독 완료")
                return True
            else:
                logger.info("이미 구독 중이거나 버튼 없음")
                return False
        except Exception as e:
            logger.warning(f"구독 실패: {e}")
            return False
    
    def add_comment(self, comment: str) -> bool:
        """
        댓글 작성
        
        Args:
            comment: 댓글 내용
            
        Returns:
            댓글 작성 성공 여부
        """
        try:
            # 댓글 영역으로 스크롤
            self.swipe(500, 1500, 500, 500)
            time.sleep(1)
            
            # 댓글 입력창 클릭
            if self.click_element(textContains="공개 댓글 추가"):
                time.sleep(1)
                
                # 댓글 입력
                self.input_text(comment)
                time.sleep(0.5)
                
                # 전송
                if self.click_element(description="댓글 보내기"):
                    logger.info(f"댓글 완료: {comment}")
                    return True
            
            logger.warning("댓글 입력 실패")
            return False
        except Exception as e:
            logger.error(f"댓글 실패: {e}")
            return False
    
    def scroll_feed(self, times: int = 5):
        """
        피드 스크롤
        
        Args:
            times: 스크롤 횟수
        """
        for i in range(times):
            self.swipe(500, 1500, 500, 500)
            time.sleep(random.uniform(1, 3))
    
    def close_youtube(self):
        """YouTube 종료"""
        self.stop_app()
        logger.info("YouTube 종료")
    
    def run_automation_task(
        self,
        keyword: str,
        watch_time_range: tuple = (30, 120),
        like_probability: float = 0.5,
        comment_probability: float = 0.2,
        comment: Optional[str] = None
    ) -> bool:
        """
        전체 자동화 태스크 실행
        
        Args:
            keyword: 검색 키워드
            watch_time_range: 시청 시간 범위 (초)
            like_probability: 좋아요 확률 (0.0 ~ 1.0)
            comment_probability: 댓글 확률 (0.0 ~ 1.0)
            comment: 댓글 내용 (None이면 댓글 안 남김)
            
        Returns:
            태스크 성공 여부
        """
        try:
            self.start_youtube()
            time.sleep(random.uniform(1, 3))
            
            if not self.search_video(keyword):
                return False
            
            if not self.play_first_video():
                return False
            
            # 랜덤 시청 시간
            watch_time = random.randint(watch_time_range[0], watch_time_range[1])
            self.watch_video(watch_time)
            
            # 좋아요
            if random.random() < like_probability:
                self.like_video()
            
            # 댓글
            if comment and random.random() < comment_probability:
                self.add_comment(comment)
            
            self.close_youtube()
            return True
            
        except Exception as e:
            logger.error(f"자동화 태스크 실패: {e}")
            return False

