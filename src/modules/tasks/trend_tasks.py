"""트렌드 분석 태스크 모음

600대 디바이스에서 실행되는 트렌드 분석 태스크 6종입니다.
- 검색 분석 (search_analysis)
- 채널 추적 (channel_tracking)
- 댓글 수집 (comment_collection)
- 추천 경로 추적 (recommendation_path)
- 광고 패턴 수집 (ad_pattern)
- 썸네일 분석 (thumbnail_analysis)
"""

import logging
import asyncio
import random
from datetime import datetime
from typing import Dict, Any, List, Optional

from src.modules.task_registry import BaseTask, TaskConfig, TaskResult, TaskRegistry

logger = logging.getLogger(__name__)


# ============================================
# 1. 검색 분석 태스크
# ============================================

@TaskRegistry.register(
    name="trend_search_analysis",
    description="YouTube 검색 결과 순위별 영상 분석",
    version="1.0.0"
)
class TrendSearchAnalysisTask(BaseTask):
    """
    검색 분석 태스크
    
    목적: 특정 키워드 검색 결과의 순위별 영상 분석
    수집 데이터:
    - 검색 순위 (1~100위)
    - 영상 제목, 채널, 조회수
    - 검색 결과 내 광고 위치
    - 추천 영상 목록
    """
    
    async def execute(self, device) -> Dict[str, Any]:
        """
        검색 분석 실행
        
        Args:
            device: uiautomator2 Device 객체
            
        Returns:
            분석 결과
        """
        keyword = self.config.parameters.get('keyword', '')
        search_position = self.config.parameters.get('search_position', 1)
        max_results = self.config.parameters.get('max_results', 10)
        
        self.logger.info(f"검색 분석 시작: '{keyword}' (위치 {search_position})")
        
        try:
            # YouTube 앱 실행
            await self._launch_youtube(device)
            
            # 검색 실행
            await self._search_keyword(device, keyword)
            
            # 검색 결과 수집
            results = await self._collect_search_results(device, max_results, search_position)
            
            # 광고 위치 확인
            ad_positions = await self._detect_ad_positions(device)
            
            return {
                'keyword': keyword,
                'position': search_position,
                'results': results,
                'ad_positions': ad_positions,
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"검색 분석 실패: {e}")
            raise
    
    async def _launch_youtube(self, device):
        """YouTube 앱 실행"""
        device.app_start('com.google.android.youtube')
        await asyncio.sleep(3)
    
    async def _search_keyword(self, device, keyword: str):
        """키워드 검색"""
        # 검색 버튼 클릭
        search_btn = device(resourceId='com.google.android.youtube:id/menu_search')
        if search_btn.exists:
            search_btn.click()
            await asyncio.sleep(1)
        
        # 검색어 입력
        search_input = device(resourceId='com.google.android.youtube:id/search_edit_text')
        if search_input.exists:
            search_input.set_text(keyword)
            await asyncio.sleep(0.5)
            device.press('enter')
            await asyncio.sleep(2)
    
    async def _collect_search_results(
        self, device, max_results: int, start_position: int
    ) -> List[Dict[str, Any]]:
        """검색 결과 수집"""
        results = []
        
        # 스크롤하며 결과 수집
        for i in range(max_results):
            # 영상 카드 찾기
            video_cards = device(resourceId='com.google.android.youtube:id/video_card')
            
            if video_cards.count >= 1:
                for j in range(min(video_cards.count, 5)):
                    card = video_cards[j]
                    
                    title_elem = card.child(resourceId='com.google.android.youtube:id/title')
                    channel_elem = card.child(resourceId='com.google.android.youtube:id/channel_name')
                    views_elem = card.child(resourceId='com.google.android.youtube:id/video_info')
                    
                    result = {
                        'position': start_position + len(results),
                        'title': title_elem.get_text() if title_elem.exists else '',
                        'channel': channel_elem.get_text() if channel_elem.exists else '',
                        'info': views_elem.get_text() if views_elem.exists else ''
                    }
                    results.append(result)
                    
                    if len(results) >= max_results:
                        break
            
            # 스크롤
            device.swipe(500, 1500, 500, 500, duration=0.5)
            await asyncio.sleep(1)
            
            if len(results) >= max_results:
                break
        
        return results
    
    async def _detect_ad_positions(self, device) -> List[int]:
        """광고 위치 감지"""
        ad_positions = []
        
        # 광고 레이블 찾기
        ad_labels = device(text='광고')
        for i in range(ad_labels.count):
            ad_positions.append(i + 1)
        
        return ad_positions


# ============================================
# 2. 채널 추적 태스크
# ============================================

@TaskRegistry.register(
    name="trend_channel_tracking",
    description="관련 채널 구독자 변화 추적",
    version="1.0.0"
)
class TrendChannelTrackingTask(BaseTask):
    """
    채널 추적 태스크
    
    목적: 관련 채널의 구독자 수 및 변화 추적
    수집 데이터:
    - 채널 구독자 수
    - 최근 영상 조회수
    - 채널 성장률
    """
    
    async def execute(self, device) -> Dict[str, Any]:
        """채널 정보 수집"""
        channel_id = self.config.parameters.get('channel_id', '')
        
        self.logger.info(f"채널 추적 시작: {channel_id}")
        
        try:
            await self._launch_youtube(device)
            
            # 채널 페이지 접근
            channel_info = await self._get_channel_info(device, channel_id)
            
            # 최근 영상 목록
            recent_videos = await self._get_recent_videos(device)
            
            return {
                'channel_id': channel_id,
                'channel_info': channel_info,
                'recent_videos': recent_videos,
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"채널 추적 실패: {e}")
            raise
    
    async def _launch_youtube(self, device):
        """YouTube 앱 실행"""
        device.app_start('com.google.android.youtube')
        await asyncio.sleep(3)
    
    async def _get_channel_info(self, device, channel_id: str) -> Dict[str, Any]:
        """채널 정보 수집"""
        # 채널 URL로 이동
        device.shell(f'am start -a android.intent.action.VIEW -d "https://www.youtube.com/channel/{channel_id}"')
        await asyncio.sleep(3)
        
        info = {
            'name': '',
            'subscriber_count': '',
            'video_count': ''
        }
        
        # 채널명
        name_elem = device(resourceId='com.google.android.youtube:id/channel_name')
        if name_elem.exists:
            info['name'] = name_elem.get_text()
        
        # 구독자 수
        sub_elem = device(resourceId='com.google.android.youtube:id/subscriber_count')
        if sub_elem.exists:
            info['subscriber_count'] = sub_elem.get_text()
        
        return info
    
    async def _get_recent_videos(self, device, count: int = 5) -> List[Dict[str, Any]]:
        """최근 영상 목록"""
        videos = []
        
        # 동영상 탭 클릭
        videos_tab = device(text='동영상')
        if videos_tab.exists:
            videos_tab.click()
            await asyncio.sleep(2)
        
        # 영상 정보 수집
        video_items = device(resourceId='com.google.android.youtube:id/video_card')
        for i in range(min(video_items.count, count)):
            item = video_items[i]
            
            title_elem = item.child(resourceId='com.google.android.youtube:id/title')
            views_elem = item.child(resourceId='com.google.android.youtube:id/video_info')
            
            videos.append({
                'title': title_elem.get_text() if title_elem.exists else '',
                'info': views_elem.get_text() if views_elem.exists else ''
            })
        
        return videos


# ============================================
# 3. 댓글 수집 태스크
# ============================================

@TaskRegistry.register(
    name="trend_comment_collection",
    description="영상 댓글 감성 분석용 데이터 수집",
    version="1.0.0"
)
class TrendCommentCollectionTask(BaseTask):
    """
    댓글 수집 태스크
    
    목적: 영상 댓글 수집 (감성 분석용)
    수집 데이터:
    - 최신 댓글 100개
    - 좋아요 많은 댓글 50개
    - 댓글 작성 시간
    """
    
    async def execute(self, device) -> Dict[str, Any]:
        """댓글 수집"""
        video_id = self.config.parameters.get('video_id', '')
        keyword = self.config.parameters.get('keyword', '')
        max_comments = self.config.parameters.get('max_comments', 100)
        
        self.logger.info(f"댓글 수집 시작: {video_id or keyword}")
        
        try:
            await self._launch_youtube(device)
            
            if video_id:
                await self._open_video(device, video_id)
            elif keyword:
                await self._search_and_open_first(device, keyword)
            
            # 댓글 수집
            comments = await self._collect_comments(device, max_comments)
            
            return {
                'video_id': video_id,
                'keyword': keyword,
                'comments': comments,
                'comment_count': len(comments),
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"댓글 수집 실패: {e}")
            raise
    
    async def _launch_youtube(self, device):
        """YouTube 앱 실행"""
        device.app_start('com.google.android.youtube')
        await asyncio.sleep(3)
    
    async def _open_video(self, device, video_id: str):
        """영상 열기"""
        device.shell(f'am start -a android.intent.action.VIEW -d "https://www.youtube.com/watch?v={video_id}"')
        await asyncio.sleep(5)
    
    async def _search_and_open_first(self, device, keyword: str):
        """검색 후 첫 번째 영상 열기"""
        # 검색
        search_btn = device(resourceId='com.google.android.youtube:id/menu_search')
        if search_btn.exists:
            search_btn.click()
            await asyncio.sleep(1)
        
        search_input = device(resourceId='com.google.android.youtube:id/search_edit_text')
        if search_input.exists:
            search_input.set_text(keyword)
            device.press('enter')
            await asyncio.sleep(2)
        
        # 첫 번째 결과 클릭
        first_result = device(resourceId='com.google.android.youtube:id/video_card')
        if first_result.exists:
            first_result.click()
            await asyncio.sleep(5)
    
    async def _collect_comments(self, device, max_count: int) -> List[Dict[str, Any]]:
        """댓글 수집"""
        comments = []
        
        # 댓글 섹션으로 스크롤
        for _ in range(3):
            device.swipe(500, 1500, 500, 800, duration=0.5)
            await asyncio.sleep(1)
        
        # 댓글 수집
        for _ in range(max_count // 10):
            comment_items = device(resourceId='com.google.android.youtube:id/comment_content')
            
            for i in range(comment_items.count):
                item = comment_items[i]
                
                text = item.get_text() if item.exists else ''
                if text and text not in [c['text'] for c in comments]:
                    comments.append({
                        'text': text,
                        'index': len(comments) + 1
                    })
                
                if len(comments) >= max_count:
                    break
            
            if len(comments) >= max_count:
                break
            
            # 스크롤
            device.swipe(500, 1500, 500, 800, duration=0.3)
            await asyncio.sleep(0.5)
        
        return comments


# ============================================
# 4. 추천 경로 추적 태스크
# ============================================

@TaskRegistry.register(
    name="trend_recommendation_tracking",
    description="추천 알고리즘 경로 분석",
    version="1.0.0"
)
class TrendRecommendationTrackingTask(BaseTask):
    """
    추천 경로 추적 태스크
    
    목적: 추천 알고리즘 경로 분석
    수집 데이터:
    - 홈피드 추천 영상
    - 영상 시청 후 추천 목록
    - 추천 순서 및 위치
    """
    
    async def execute(self, device) -> Dict[str, Any]:
        """추천 경로 추적"""
        video_id = self.config.parameters.get('video_id', '')
        track_depth = self.config.parameters.get('track_depth', 3)
        
        self.logger.info(f"추천 경로 추적 시작: {video_id}")
        
        try:
            await self._launch_youtube(device)
            
            # 홈피드 추천 수집
            home_recommendations = await self._get_home_recommendations(device)
            
            # 영상 시청 후 추천 추적
            watch_recommendations = []
            if video_id:
                watch_recommendations = await self._track_watch_recommendations(
                    device, video_id, track_depth
                )
            
            return {
                'video_id': video_id,
                'home_recommendations': home_recommendations,
                'watch_recommendations': watch_recommendations,
                'track_depth': track_depth,
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"추천 경로 추적 실패: {e}")
            raise
    
    async def _launch_youtube(self, device):
        """YouTube 앱 실행"""
        device.app_start('com.google.android.youtube')
        await asyncio.sleep(3)
    
    async def _get_home_recommendations(self, device, count: int = 20) -> List[Dict[str, Any]]:
        """홈피드 추천 영상 수집"""
        recommendations = []
        
        # 홈 탭으로 이동
        home_btn = device(resourceId='com.google.android.youtube:id/bottom_bar_home')
        if home_btn.exists:
            home_btn.click()
            await asyncio.sleep(2)
        
        # 추천 영상 수집
        for _ in range(count // 5):
            video_cards = device(resourceId='com.google.android.youtube:id/video_card')
            
            for i in range(video_cards.count):
                card = video_cards[i]
                title_elem = card.child(resourceId='com.google.android.youtube:id/title')
                channel_elem = card.child(resourceId='com.google.android.youtube:id/channel_name')
                
                rec = {
                    'position': len(recommendations) + 1,
                    'title': title_elem.get_text() if title_elem.exists else '',
                    'channel': channel_elem.get_text() if channel_elem.exists else '',
                    'type': 'home_feed'
                }
                
                if rec['title'] and rec['title'] not in [r['title'] for r in recommendations]:
                    recommendations.append(rec)
                
                if len(recommendations) >= count:
                    break
            
            if len(recommendations) >= count:
                break
            
            device.swipe(500, 1500, 500, 500, duration=0.5)
            await asyncio.sleep(1)
        
        return recommendations
    
    async def _track_watch_recommendations(
        self, device, video_id: str, depth: int
    ) -> List[Dict[str, Any]]:
        """영상 시청 후 추천 추적"""
        all_recommendations = []
        current_video = video_id
        
        for d in range(depth):
            # 영상 열기
            device.shell(f'am start -a android.intent.action.VIEW -d "https://www.youtube.com/watch?v={current_video}"')
            await asyncio.sleep(5)
            
            # 추천 영상 목록 수집
            recs = await self._get_watch_next_recommendations(device)
            
            for rec in recs:
                rec['depth'] = d + 1
                rec['source_video'] = current_video
                all_recommendations.append(rec)
            
            # 다음 추천 영상으로 이동
            if recs:
                current_video = recs[0].get('video_id', '')
            else:
                break
        
        return all_recommendations
    
    async def _get_watch_next_recommendations(self, device, count: int = 10) -> List[Dict[str, Any]]:
        """시청 중 추천 영상 수집"""
        recommendations = []
        
        # 아래로 스크롤하여 추천 목록 표시
        device.swipe(500, 1500, 500, 800, duration=0.5)
        await asyncio.sleep(1)
        
        video_cards = device(resourceId='com.google.android.youtube:id/video_card')
        
        for i in range(min(video_cards.count, count)):
            card = video_cards[i]
            title_elem = card.child(resourceId='com.google.android.youtube:id/title')
            
            recommendations.append({
                'position': i + 1,
                'title': title_elem.get_text() if title_elem.exists else '',
                'type': 'watch_next'
            })
        
        return recommendations


# ============================================
# 5. 광고 패턴 수집 태스크
# ============================================

@TaskRegistry.register(
    name="trend_ad_pattern",
    description="광고 타입 및 빈도 패턴 수집",
    version="1.0.0"
)
class TrendAdPatternTask(BaseTask):
    """
    광고 패턴 수집 태스크
    
    목적: 광고 타입 및 패턴 분석
    수집 데이터:
    - 광고 타입 (스킵 가능/불가능, 배너 등)
    - 광고 빈도
    - 광고 길이
    """
    
    async def execute(self, device) -> Dict[str, Any]:
        """광고 패턴 수집"""
        keyword = self.config.parameters.get('keyword', '')
        video_count = self.config.parameters.get('video_count', 5)
        
        self.logger.info(f"광고 패턴 수집 시작: {keyword}")
        
        try:
            await self._launch_youtube(device)
            
            # 키워드 검색
            await self._search_keyword(device, keyword)
            
            # 여러 영상의 광고 패턴 수집
            ad_patterns = []
            for i in range(video_count):
                pattern = await self._collect_ad_pattern(device, i)
                ad_patterns.append(pattern)
                
                # 뒤로 가기
                device.press('back')
                await asyncio.sleep(2)
            
            return {
                'keyword': keyword,
                'ad_patterns': ad_patterns,
                'total_videos': video_count,
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"광고 패턴 수집 실패: {e}")
            raise
    
    async def _launch_youtube(self, device):
        """YouTube 앱 실행"""
        device.app_start('com.google.android.youtube')
        await asyncio.sleep(3)
    
    async def _search_keyword(self, device, keyword: str):
        """키워드 검색"""
        search_btn = device(resourceId='com.google.android.youtube:id/menu_search')
        if search_btn.exists:
            search_btn.click()
            await asyncio.sleep(1)
        
        search_input = device(resourceId='com.google.android.youtube:id/search_edit_text')
        if search_input.exists:
            search_input.set_text(keyword)
            device.press('enter')
            await asyncio.sleep(2)
    
    async def _collect_ad_pattern(self, device, video_index: int) -> Dict[str, Any]:
        """단일 영상 광고 패턴 수집"""
        pattern = {
            'video_index': video_index,
            'has_preroll_ad': False,
            'ad_type': None,
            'ad_length': None,
            'is_skippable': False
        }
        
        # 영상 클릭
        video_cards = device(resourceId='com.google.android.youtube:id/video_card')
        if video_cards.count > video_index:
            video_cards[video_index].click()
            await asyncio.sleep(3)
        
        # 광고 확인
        skip_btn = device(resourceId='com.google.android.youtube:id/skip_ad_button')
        ad_indicator = device(text='광고')
        
        if skip_btn.exists or ad_indicator.exists:
            pattern['has_preroll_ad'] = True
            pattern['is_skippable'] = skip_btn.exists
            pattern['ad_type'] = 'skippable' if skip_btn.exists else 'non_skippable'
            
            # 광고 길이 확인
            ad_time = device(resourceId='com.google.android.youtube:id/ad_countdown')
            if ad_time.exists:
                pattern['ad_length'] = ad_time.get_text()
        
        return pattern


# ============================================
# 6. 썸네일 분석 태스크
# ============================================

@TaskRegistry.register(
    name="trend_thumbnail_analysis",
    description="썸네일 특성 및 클릭률 예측 분석",
    version="1.0.0"
)
class TrendThumbnailAnalysisTask(BaseTask):
    """
    썸네일 분석 태스크
    
    목적: 썸네일 특성 분석 (클릭률 예측용)
    수집 데이터:
    - 썸네일 이미지 URL
    - 텍스트 오버레이 유무
    - 얼굴 유무
    - 색상 구성
    """
    
    async def execute(self, device) -> Dict[str, Any]:
        """썸네일 분석"""
        keyword = self.config.parameters.get('keyword', '')
        count = self.config.parameters.get('count', 20)
        
        self.logger.info(f"썸네일 분석 시작: {keyword}")
        
        try:
            await self._launch_youtube(device)
            
            # 키워드 검색
            await self._search_keyword(device, keyword)
            
            # 썸네일 정보 수집
            thumbnails = await self._collect_thumbnails(device, count)
            
            return {
                'keyword': keyword,
                'thumbnails': thumbnails,
                'total_count': len(thumbnails),
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"썸네일 분석 실패: {e}")
            raise
    
    async def _launch_youtube(self, device):
        """YouTube 앱 실행"""
        device.app_start('com.google.android.youtube')
        await asyncio.sleep(3)
    
    async def _search_keyword(self, device, keyword: str):
        """키워드 검색"""
        search_btn = device(resourceId='com.google.android.youtube:id/menu_search')
        if search_btn.exists:
            search_btn.click()
            await asyncio.sleep(1)
        
        search_input = device(resourceId='com.google.android.youtube:id/search_edit_text')
        if search_input.exists:
            search_input.set_text(keyword)
            device.press('enter')
            await asyncio.sleep(2)
    
    async def _collect_thumbnails(self, device, count: int) -> List[Dict[str, Any]]:
        """썸네일 정보 수집"""
        thumbnails = []
        
        for _ in range(count // 5):
            video_cards = device(resourceId='com.google.android.youtube:id/video_card')
            
            for i in range(video_cards.count):
                card = video_cards[i]
                
                title_elem = card.child(resourceId='com.google.android.youtube:id/title')
                thumbnail_elem = card.child(resourceId='com.google.android.youtube:id/thumbnail')
                duration_elem = card.child(resourceId='com.google.android.youtube:id/duration')
                
                thumb_info = {
                    'position': len(thumbnails) + 1,
                    'title': title_elem.get_text() if title_elem.exists else '',
                    'duration': duration_elem.get_text() if duration_elem.exists else '',
                    'has_duration_badge': duration_elem.exists,
                    # 썸네일 특성은 이미지 분석 필요 (추후 구현)
                    'characteristics': {
                        'has_text_overlay': None,  # 이미지 분석 필요
                        'has_face': None,
                        'dominant_color': None
                    }
                }
                
                title = thumb_info['title']
                if title and title not in [t['title'] for t in thumbnails]:
                    thumbnails.append(thumb_info)
                
                if len(thumbnails) >= count:
                    break
            
            if len(thumbnails) >= count:
                break
            
            device.swipe(500, 1500, 500, 500, duration=0.5)
            await asyncio.sleep(1)
        
        return thumbnails
