"""YouTube 자동화 태스크"""

from dataclasses import dataclass, field
from typing import List, Optional, Any
import random
import time
import asyncio

from src.modules.task_registry import TaskRegistry, BaseTask, TaskConfig
from src.automation.youtube_agent import YouTubeAgent


@dataclass
class YouTubeTaskConfig(TaskConfig):
    """YouTube 태스크 설정"""
    keywords: List[str] = field(default_factory=list)
    watch_time_range: tuple = (30, 120)
    like_probability: float = 0.5
    comment_probability: float = 0.2
    comments: List[str] = field(default_factory=list)


@TaskRegistry.register(
    "youtube_watch",
    description="YouTube 영상 검색 및 시청 자동화",
    version="1.0.0"
)
class YouTubeWatchTask(BaseTask):
    """YouTube 시청 태스크"""
    
    def __init__(self, config: YouTubeTaskConfig):
        super().__init__(config)
        self.config: YouTubeTaskConfig = config
    
    async def execute(self, device) -> dict:
        """YouTube 시청 태스크 실행"""
        agent = YouTubeAgent(device)
        
        # 랜덤 키워드 선택
        keyword = random.choice(self.config.keywords) if self.config.keywords else "trending"
        
        results = {
            "keyword": keyword,
            "watched": False,
            "liked": False,
            "commented": False,
            "watch_time": 0
        }
        
        try:
            # YouTube 시작
            agent.start_youtube()
            await asyncio.sleep(random.uniform(1, 3))
            
            # 검색
            if not agent.search_video(keyword):
                return results
            
            # 첫 번째 영상 재생
            if not agent.play_first_video():
                return results
            
            # 시청
            watch_time = random.randint(
                self.config.watch_time_range[0],
                self.config.watch_time_range[1]
            )
            agent.watch_video(watch_time)
            results["watched"] = True
            results["watch_time"] = watch_time
            
            # 좋아요
            if random.random() < self.config.like_probability:
                results["liked"] = agent.like_video()
            
            # 댓글
            if (self.config.comments and 
                random.random() < self.config.comment_probability):
                comment = random.choice(self.config.comments)
                results["commented"] = agent.add_comment(comment)
            
        finally:
            agent.close_youtube()
        
        return results
    
    def execute_sync(self, device) -> dict:
        """동기 실행"""
        agent = YouTubeAgent(device)
        
        keyword = random.choice(self.config.keywords) if self.config.keywords else "trending"
        
        results = {
            "keyword": keyword,
            "watched": False,
            "liked": False,
            "commented": False,
            "watch_time": 0
        }
        
        try:
            agent.start_youtube()
            time.sleep(random.uniform(1, 3))
            
            if not agent.search_video(keyword):
                return results
            
            if not agent.play_first_video():
                return results
            
            watch_time = random.randint(
                self.config.watch_time_range[0],
                self.config.watch_time_range[1]
            )
            agent.watch_video(watch_time)
            results["watched"] = True
            results["watch_time"] = watch_time
            
            if random.random() < self.config.like_probability:
                results["liked"] = agent.like_video()
            
            if (self.config.comments and 
                random.random() < self.config.comment_probability):
                comment = random.choice(self.config.comments)
                results["commented"] = agent.add_comment(comment)
            
        finally:
            agent.close_youtube()
        
        return results


@TaskRegistry.register(
    "youtube_search",
    description="YouTube 검색만 수행",
    version="1.0.0"
)
class YouTubeSearchTask(BaseTask):
    """YouTube 검색 태스크"""
    
    async def execute(self, device) -> dict:
        """YouTube 검색 태스크 실행"""
        agent = YouTubeAgent(device)
        keyword = self.config.parameters.get("keyword", "trending")
        
        try:
            agent.start_youtube()
            await asyncio.sleep(2)
            
            success = agent.search_video(keyword)
            
            return {
                "keyword": keyword,
                "success": success
            }
        finally:
            agent.close_youtube()

