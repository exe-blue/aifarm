"""커스텀 태스크 생성 예제"""

import asyncio
import time
import random
from dataclasses import dataclass, field
from typing import List

from src.modules.task_registry import TaskRegistry, BaseTask, TaskConfig
from src.automation.base_agent import BaseAgent
from src.controller.device_manager import DeviceManager
from src.modules.execution_engine import ExecutionEngine


# ============================================================
# 1. 커스텀 에이전트 정의
# ============================================================

class InstagramAgent(BaseAgent):
    """Instagram 자동화 에이전트"""
    
    def __init__(self, device):
        super().__init__(device, "com.instagram.android")
    
    def search_hashtag(self, hashtag: str) -> bool:
        """해시태그 검색"""
        try:
            # 검색 탭으로 이동
            self.click_element(description="검색 및 탐색")
            time.sleep(1)
            
            # 검색창 클릭
            self.click_element(
                resourceId="com.instagram.android:id/action_bar_search_edit_text"
            )
            time.sleep(0.5)
            
            # 해시태그 입력
            self.input_text(f"#{hashtag}")
            time.sleep(1)
            
            # 첫 번째 결과 클릭
            self.click_element(
                resourceId="com.instagram.android:id/row_search_user_username"
            )
            time.sleep(2)
            
            return True
        except Exception as e:
            self.logger.error(f"해시태그 검색 실패: {e}")
            return False
    
    def like_post(self) -> bool:
        """좋아요 누르기"""
        return self.click_element(description="좋아요")
    
    def follow_user(self) -> bool:
        """팔로우하기"""
        try:
            # "팔로우" 버튼 찾기 (이미 팔로잉이 아닌 경우)
            element = self.device(textContains="팔로우")
            if element.exists:
                text = element.get_text()
                if "팔로잉" not in text:
                    element.click()
                    return True
        except:
            pass
        return False


# ============================================================
# 2. 커스텀 태스크 설정
# ============================================================

@dataclass
class InstagramTaskConfig(TaskConfig):
    """Instagram 태스크 설정"""
    hashtags: List[str] = field(default_factory=list)
    like_probability: float = 0.7
    follow_probability: float = 0.3
    scroll_count: int = 10


# ============================================================
# 3. 커스텀 태스크 정의 (데코레이터로 자동 등록)
# ============================================================

@TaskRegistry.register(
    "instagram_engagement",
    description="Instagram 해시태그 검색 및 좋아요/팔로우",
    version="1.0.0"
)
class InstagramEngagementTask(BaseTask):
    """Instagram 참여 자동화 태스크"""
    
    def __init__(self, config: InstagramTaskConfig):
        super().__init__(config)
        self.config: InstagramTaskConfig = config
    
    async def execute(self, device) -> dict:
        """태스크 실행"""
        agent = InstagramAgent(device)
        
        results = {
            "hashtags_searched": 0,
            "likes": 0,
            "follows": 0
        }
        
        try:
            agent.start_app()
            await asyncio.sleep(2)
            
            for hashtag in self.config.hashtags:
                try:
                    if agent.search_hashtag(hashtag):
                        results["hashtags_searched"] += 1
                        
                        # 피드 스크롤하며 좋아요/팔로우
                        for _ in range(self.config.scroll_count):
                            # 좋아요
                            if random.random() < self.config.like_probability:
                                if agent.like_post():
                                    results["likes"] += 1
                            
                            # 팔로우
                            if random.random() < self.config.follow_probability:
                                if agent.follow_user():
                                    results["follows"] += 1
                            
                            # 스크롤
                            agent.swipe(500, 1500, 500, 500)
                            await asyncio.sleep(random.uniform(1, 3))
                            
                except Exception as e:
                    self.logger.warning(f"해시태그 {hashtag} 처리 실패: {e}")
                    
        finally:
            agent.stop_app()
        
        return results
    
    async def on_success(self, device, result):
        """성공 콜백"""
        self.logger.info(
            f"Instagram 태스크 완료: "
            f"검색 {result['hashtags_searched']}개, "
            f"좋아요 {result['likes']}개, "
            f"팔로우 {result['follows']}개"
        )


# ============================================================
# 4. 사용 예제
# ============================================================

async def main():
    """커스텀 태스크 실행 예제"""
    
    print("=== 등록된 태스크 확인 ===")
    for name in TaskRegistry.list_tasks():
        print(f"  - {name}")
    print()
    
    # 디바이스 연결
    print("=== 디바이스 연결 ===")
    manager = DeviceManager()
    manager.connect_device("10.0.10.1")  # 테스트용
    
    if not manager.connections:
        print("연결된 디바이스가 없습니다.")
        return
    
    # 커스텀 태스크 설정
    config = InstagramTaskConfig(
        name="instagram_test",
        hashtags=["cats", "dogs", "nature"],
        like_probability=0.7,
        follow_probability=0.2,
        scroll_count=5
    )
    
    # 태스크 생성 (직접 또는 레지스트리 통해)
    # 방법 1: 직접 생성
    task = InstagramEngagementTask(config)
    
    # 방법 2: 레지스트리 통해 생성
    # task = TaskRegistry.create("instagram_engagement", config)
    
    # 실행
    print("\n=== Instagram 태스크 실행 ===")
    engine = ExecutionEngine(manager)
    
    results = await engine.run_task(task)
    
    # 결과 출력
    print("\n=== 결과 ===")
    print(engine.get_summary())


if __name__ == "__main__":
    asyncio.run(main())

