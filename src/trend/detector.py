"""트렌드 감지기

YouTube에서 급상승 중인 키워드와 영상을 실시간으로 감지합니다.
- 조회수 급상승 영상 감지
- 키워드 클러스터링
- 트렌드 점수 계산
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, field
from collections import Counter
import re

from src.youtube.api_client import YouTubeAPIClient, VideoInfo, SearchResult

logger = logging.getLogger(__name__)


@dataclass
class TrendKeyword:
    """트렌드 키워드"""
    keyword: str
    search_volume: int  # 관련 영상 수
    growth_rate: float  # 성장률 (%)
    confidence_score: float  # 신뢰도 (0-1)
    category: Optional[str] = None
    related_keywords: List[str] = field(default_factory=list)
    detected_at: datetime = field(default_factory=datetime.now)
    video_ids: List[str] = field(default_factory=list)


@dataclass
class TrendVideo:
    """트렌드 영상"""
    video_id: str
    title: str
    channel_id: str
    channel_name: str
    view_count: int
    like_count: int
    comment_count: int
    published_at: datetime
    thumbnail_url: str
    growth_rate: float  # 시간당 조회수 성장률
    trend_score: float  # 트렌드 점수 (0-100)
    detected_at: datetime = field(default_factory=datetime.now)
    keywords: List[str] = field(default_factory=list)


# 카테고리 ID 매핑
YOUTUBE_CATEGORIES = {
    '1': '영화/애니메이션',
    '2': '자동차',
    '10': '음악',
    '15': '동물',
    '17': '스포츠',
    '19': '여행/이벤트',
    '20': '게임',
    '22': '인물/블로그',
    '23': '코미디',
    '24': '엔터테인먼트',
    '25': '뉴스/정치',
    '26': '노하우/스타일',
    '27': '교육',
    '28': '과학기술',
    '29': '비영리/사회운동',
}


class TrendDetector:
    """
    트렌드 감지기
    
    YouTube API를 활용하여 급상승 중인 키워드와 영상을 감지합니다.
    """
    
    def __init__(
        self, 
        youtube_client: YouTubeAPIClient,
        min_view_count: int = 10000,
        min_growth_rate: float = 10.0,
        lookback_hours: int = 24
    ):
        """
        Args:
            youtube_client: YouTube API 클라이언트
            min_view_count: 최소 조회수 기준
            min_growth_rate: 최소 성장률 (%)
            lookback_hours: 분석 기간 (시간)
        """
        self.youtube = youtube_client
        self.min_view_count = min_view_count
        self.min_growth_rate = min_growth_rate
        self.lookback_hours = lookback_hours
        
        # 내부 캐시
        self._keyword_cache: Dict[str, TrendKeyword] = {}
        self._video_cache: Dict[str, TrendVideo] = {}
    
    # ==================== 트렌드 영상 감지 ====================
    
    def detect_trending_videos(
        self,
        region_code: str = 'KR',
        category_id: Optional[str] = None,
        limit: int = 50
    ) -> List[TrendVideo]:
        """
        인기 급상승 영상 감지
        
        Args:
            region_code: 지역 코드
            category_id: 카테고리 ID (옵션)
            limit: 최대 결과 수
            
        Returns:
            TrendVideo 리스트 (점수순 정렬)
        """
        # 트렌드 영상 조회
        videos = self.youtube.get_trending_videos(
            region_code=region_code,
            category_id=category_id,
            max_results=limit
        )
        
        if not videos:
            logger.warning("트렌드 영상 조회 결과 없음")
            return []
        
        # 트렌드 점수 계산 및 변환
        trend_videos = []
        for video in videos:
            trend_video = self._calculate_trend_score(video)
            if trend_video:
                trend_videos.append(trend_video)
                self._video_cache[video.video_id] = trend_video
        
        # 점수순 정렬
        trend_videos.sort(key=lambda v: v.trend_score, reverse=True)
        
        logger.info(f"트렌드 영상 {len(trend_videos)}건 감지 완료")
        return trend_videos
    
    def _calculate_trend_score(self, video: VideoInfo) -> Optional[TrendVideo]:
        """트렌드 점수 계산"""
        # 최소 조회수 필터
        if video.view_count < self.min_view_count:
            return None
        
        # 게시 후 경과 시간 (시간)
        hours_since_publish = max(1, (datetime.now(video.published_at.tzinfo) - video.published_at).total_seconds() / 3600)
        
        # 시간당 조회수 성장률
        growth_rate = video.view_count / hours_since_publish
        
        # 트렌드 점수 계산 (0-100)
        # 요소: 조회수, 좋아요율, 댓글 참여도, 신선도
        view_score = min(30, (video.view_count / 1000000) * 30)  # 최대 30점
        
        like_ratio = video.like_count / max(1, video.view_count)
        like_score = min(20, like_ratio * 1000)  # 최대 20점
        
        comment_ratio = video.comment_count / max(1, video.view_count)
        comment_score = min(20, comment_ratio * 2000)  # 최대 20점
        
        # 신선도 점수 (24시간 이내면 높은 점수)
        freshness_score = max(0, 30 - (hours_since_publish / 24) * 30)  # 최대 30점
        
        trend_score = view_score + like_score + comment_score + freshness_score
        
        # 제목에서 키워드 추출
        keywords = self._extract_keywords(video.title)
        
        return TrendVideo(
            video_id=video.video_id,
            title=video.title,
            channel_id=video.channel_id,
            channel_name=video.channel_title,
            view_count=video.view_count,
            like_count=video.like_count,
            comment_count=video.comment_count,
            published_at=video.published_at,
            thumbnail_url=video.thumbnail_url,
            growth_rate=growth_rate,
            trend_score=round(trend_score, 2),
            keywords=keywords
        )
    
    # ==================== 키워드 트렌드 감지 ====================
    
    def detect_trending_keywords(
        self,
        seed_keywords: Optional[List[str]] = None,
        region_code: str = 'KR',
        limit: int = 20
    ) -> List[TrendKeyword]:
        """
        트렌드 키워드 감지
        
        Args:
            seed_keywords: 시드 키워드 리스트 (없으면 트렌드 영상에서 추출)
            region_code: 지역 코드
            limit: 최대 결과 수
            
        Returns:
            TrendKeyword 리스트 (점수순 정렬)
        """
        keywords_data: Dict[str, Dict[str, Any]] = {}
        
        # 시드 키워드가 없으면 트렌드 영상에서 추출
        if not seed_keywords:
            trend_videos = self.detect_trending_videos(region_code=region_code, limit=50)
            seed_keywords = self._extract_keywords_from_videos(trend_videos)
        
        # 각 키워드에 대해 검색량 및 관련 데이터 수집
        for keyword in seed_keywords[:limit * 2]:  # 더 많이 검색 후 필터링
            search_results = self.youtube.search_videos(
                query=keyword,
                max_results=20,
                order='date',
                published_after=datetime.now() - timedelta(hours=self.lookback_hours),
                region_code=region_code
            )
            
            if len(search_results) >= 5:  # 최소 5개 이상 결과가 있어야 트렌드로 인정
                related_keywords = self._extract_related_keywords(search_results)
                
                keywords_data[keyword] = {
                    'search_volume': len(search_results),
                    'video_ids': [r.video_id for r in search_results],
                    'related_keywords': related_keywords
                }
        
        # 트렌드 키워드 생성
        trend_keywords = []
        for keyword, data in keywords_data.items():
            # 신뢰도 계산 (검색량 기반)
            confidence = min(1.0, data['search_volume'] / 20)
            
            # 성장률 추정 (관련 영상 수 기반)
            growth_rate = (data['search_volume'] / self.lookback_hours) * 100
            
            trend_keyword = TrendKeyword(
                keyword=keyword,
                search_volume=data['search_volume'],
                growth_rate=round(growth_rate, 2),
                confidence_score=round(confidence, 2),
                related_keywords=data['related_keywords'][:5],
                video_ids=data['video_ids']
            )
            
            trend_keywords.append(trend_keyword)
            self._keyword_cache[keyword] = trend_keyword
        
        # 신뢰도순 정렬
        trend_keywords.sort(key=lambda k: k.confidence_score, reverse=True)
        
        logger.info(f"트렌드 키워드 {len(trend_keywords)}건 감지 완료")
        return trend_keywords[:limit]
    
    def _extract_keywords_from_videos(self, videos: List[TrendVideo]) -> List[str]:
        """영상 목록에서 키워드 추출"""
        all_keywords: List[str] = []
        for video in videos:
            all_keywords.extend(video.keywords)
        
        # 빈도순 정렬
        keyword_counts = Counter(all_keywords)
        return [k for k, _ in keyword_counts.most_common(50)]
    
    def _extract_keywords(self, text: str) -> List[str]:
        """텍스트에서 키워드 추출"""
        # 특수문자 제거 및 토큰화
        text = re.sub(r'[^\w\s가-힣]', ' ', text)
        tokens = text.split()
        
        # 불용어 필터링
        stopwords = {'의', '를', '을', '이', '가', '에', '는', '은', '로', '으로', 
                     'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or'}
        
        keywords = [
            token for token in tokens 
            if len(token) >= 2 and token.lower() not in stopwords
        ]
        
        return keywords[:10]  # 상위 10개
    
    def _extract_related_keywords(self, search_results: List[SearchResult]) -> List[str]:
        """검색 결과에서 관련 키워드 추출"""
        all_keywords: List[str] = []
        
        for result in search_results:
            keywords = self._extract_keywords(result.title)
            all_keywords.extend(keywords)
        
        # 빈도순 정렬
        keyword_counts = Counter(all_keywords)
        return [k for k, _ in keyword_counts.most_common(10)]
    
    # ==================== 특정 키워드 분석 ====================
    
    def analyze_keyword(
        self,
        keyword: str,
        region_code: str = 'KR',
        depth: int = 3
    ) -> Dict[str, Any]:
        """
        특정 키워드 심층 분석
        
        Args:
            keyword: 분석할 키워드
            region_code: 지역 코드
            depth: 분석 깊이 (1-10)
            
        Returns:
            분석 결과 딕셔너리
        """
        analysis = {
            'keyword': keyword,
            'analyzed_at': datetime.now().isoformat(),
            'region': region_code,
            'search_results': [],
            'top_videos': [],
            'channels': [],
            'sentiment': None,
            'growth_prediction': None
        }
        
        # 1. 최신 영상 검색
        recent_results = self.youtube.search_videos(
            query=keyword,
            max_results=min(50, depth * 10),
            order='date',
            published_after=datetime.now() - timedelta(hours=self.lookback_hours),
            region_code=region_code
        )
        
        analysis['recent_video_count'] = len(recent_results)
        
        # 2. 인기 영상 검색
        popular_results = self.youtube.search_videos(
            query=keyword,
            max_results=min(50, depth * 10),
            order='viewCount',
            region_code=region_code
        )
        
        if popular_results:
            video_ids = [r.video_id for r in popular_results]
            video_stats = self.youtube.get_video_stats(video_ids)
            
            # 상위 영상 정보 저장
            for video in video_stats[:10]:
                analysis['top_videos'].append({
                    'video_id': video.video_id,
                    'title': video.title,
                    'view_count': video.view_count,
                    'like_count': video.like_count,
                    'channel': video.channel_title
                })
            
            # 채널 정보 수집
            channel_ids = list(set(v.channel_id for v in video_stats))[:10]
            channels = self.youtube.get_channel_stats(channel_ids)
            
            for channel in channels:
                analysis['channels'].append({
                    'channel_id': channel.channel_id,
                    'title': channel.title,
                    'subscriber_count': channel.subscriber_count,
                    'video_count': channel.video_count
                })
        
        # 3. 성장률 예측 (간단한 휴리스틱)
        if len(recent_results) >= 10:
            analysis['growth_prediction'] = 'HIGH'
        elif len(recent_results) >= 5:
            analysis['growth_prediction'] = 'MEDIUM'
        else:
            analysis['growth_prediction'] = 'LOW'
        
        logger.info(f"키워드 '{keyword}' 분석 완료")
        return analysis
    
    # ==================== 캐시 관리 ====================
    
    def get_cached_keywords(self) -> List[TrendKeyword]:
        """캐시된 트렌드 키워드 반환"""
        return list(self._keyword_cache.values())
    
    def get_cached_videos(self) -> List[TrendVideo]:
        """캐시된 트렌드 영상 반환"""
        return list(self._video_cache.values())
    
    def clear_cache(self):
        """캐시 초기화"""
        self._keyword_cache.clear()
        self._video_cache.clear()
        logger.info("트렌드 캐시 초기화 완료")
