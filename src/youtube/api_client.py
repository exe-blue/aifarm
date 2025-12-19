"""YouTube Data API v3 클라이언트

YouTube Data API v3를 래핑하여 트렌드 분석에 필요한 기능을 제공합니다.
- 검색, 영상 정보, 채널 정보, 댓글 수집
- 쿼터 관리 통합
- 캐싱 지원
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from functools import lru_cache
import hashlib
import json

from .quota_manager import QuotaManager

logger = logging.getLogger(__name__)


@dataclass
class VideoInfo:
    """영상 정보"""
    video_id: str
    title: str
    description: str
    channel_id: str
    channel_title: str
    published_at: datetime
    view_count: int
    like_count: int
    comment_count: int
    duration: str
    thumbnail_url: str
    tags: List[str]
    category_id: str


@dataclass
class ChannelInfo:
    """채널 정보"""
    channel_id: str
    title: str
    description: str
    subscriber_count: int
    video_count: int
    view_count: int
    published_at: datetime
    thumbnail_url: str
    country: Optional[str]


@dataclass
class CommentInfo:
    """댓글 정보"""
    comment_id: str
    video_id: str
    text: str
    author_name: str
    author_channel_id: str
    like_count: int
    published_at: datetime
    is_reply: bool


@dataclass
class SearchResult:
    """검색 결과"""
    video_id: str
    title: str
    channel_id: str
    channel_title: str
    published_at: datetime
    thumbnail_url: str
    description: str


class YouTubeAPIClient:
    """
    YouTube Data API v3 클라이언트
    
    트렌드 스나이퍼 시스템을 위한 YouTube API 래퍼입니다.
    쿼터 관리, 캐싱, 에러 처리를 통합 제공합니다.
    """
    
    def __init__(self, api_key: str, quota_manager: Optional[QuotaManager] = None):
        """
        Args:
            api_key: YouTube Data API v3 API 키
            quota_manager: 쿼터 관리자 (미제공 시 자동 생성)
        """
        self.api_key = api_key
        self.quota_manager = quota_manager or QuotaManager()
        self._youtube = None
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = 300  # 5분 캐시
        self._initialize_client()
    
    def _initialize_client(self):
        """YouTube API 클라이언트 초기화"""
        try:
            from googleapiclient.discovery import build
            from googleapiclient.errors import HttpError
            
            self._youtube = build('youtube', 'v3', developerKey=self.api_key)
            self._http_error = HttpError
            logger.info("YouTube API 클라이언트 초기화 완료")
            
        except ImportError:
            logger.error("google-api-python-client 미설치. pip install google-api-python-client 실행 필요")
            raise
    
    def _get_cache_key(self, method: str, params: Dict) -> str:
        """캐시 키 생성"""
        param_str = json.dumps(params, sort_keys=True)
        return hashlib.md5(f"{method}:{param_str}".encode()).hexdigest()
    
    def _get_cached(self, cache_key: str) -> Optional[Any]:
        """캐시된 데이터 조회"""
        if cache_key in self._cache:
            data, timestamp = self._cache[cache_key]
            if datetime.now() - timestamp < timedelta(seconds=self._cache_ttl):
                logger.debug(f"캐시 히트: {cache_key}")
                return data
            else:
                del self._cache[cache_key]
        return None
    
    def _set_cache(self, cache_key: str, data: Any):
        """데이터 캐싱"""
        self._cache[cache_key] = (data, datetime.now())
    
    def _ensure_quota(self, method: str, count: int = 1) -> bool:
        """쿼터 확인 및 소비"""
        if not self.quota_manager.can_afford(method, count):
            logger.warning(f"쿼터 부족으로 {method} 호출 불가")
            return False
        return self.quota_manager.consume(method, count)
    
    # ==================== 검색 API ====================
    
    def search_videos(
        self,
        query: str,
        max_results: int = 50,
        order: str = 'relevance',
        published_after: Optional[datetime] = None,
        region_code: str = 'KR',
        video_category_id: Optional[str] = None,
        use_cache: bool = True
    ) -> List[SearchResult]:
        """
        YouTube 영상 검색
        
        Args:
            query: 검색 키워드
            max_results: 최대 결과 수 (최대 50)
            order: 정렬 방식 (relevance, date, viewCount, rating)
            published_after: 이 시간 이후 게시된 영상만
            region_code: 지역 코드 (KR, US, JP 등)
            video_category_id: 카테고리 ID (옵션)
            use_cache: 캐시 사용 여부
            
        Returns:
            SearchResult 리스트
        """
        # 캐시 키 생성을 위한 파라미터 (모든 호출 시그니처 포함)
        # published_after는 datetime이므로 ISO 형식 문자열로 정규화
        params = {
            'query': query,
            'max_results': max_results,
            'order': order,
            'region_code': region_code,
            'published_after': published_after.isoformat() if published_after else None,
            'video_category_id': video_category_id
        }
        
        # 캐시 확인
        cache_key = self._get_cache_key('search.list', params)
        if use_cache:
            cached = self._get_cached(cache_key)
            if cached:
                return cached
        
        # 쿼터 확인
        if not self._ensure_quota('search.list'):
            return []
        
        try:
            request = self._youtube.search().list(
                part='snippet',
                q=query,
                type='video',
                maxResults=min(max_results, 50),
                order=order,
                regionCode=region_code,
                publishedAfter=published_after.isoformat() + 'Z' if published_after else None,
                videoCategoryId=video_category_id
            )
            response = request.execute()
            
            results = []
            for item in response.get('items', []):
                snippet = item['snippet']
                results.append(SearchResult(
                    video_id=item['id']['videoId'],
                    title=snippet['title'],
                    channel_id=snippet['channelId'],
                    channel_title=snippet['channelTitle'],
                    published_at=datetime.fromisoformat(snippet['publishedAt'].replace('Z', '+00:00')),
                    thumbnail_url=snippet['thumbnails'].get('high', {}).get('url', ''),
                    description=snippet['description']
                ))
            
            # 캐싱
            if use_cache:
                self._set_cache(cache_key, results)
            
            logger.info(f"검색 완료: '{query}' - {len(results)}건")
            return results
            
        except self._http_error as e:
            logger.error(f"YouTube API 검색 에러: {e}")
            return []
    
    # ==================== 영상 정보 API ====================
    
    def get_video_stats(self, video_ids: List[str], use_cache: bool = True) -> List[VideoInfo]:
        """
        영상 상세 정보 조회 (배치)
        
        Args:
            video_ids: 영상 ID 리스트 (최대 50개)
            use_cache: 캐시 사용 여부
            
        Returns:
            VideoInfo 리스트
        """
        if not video_ids:
            return []
        
        # 50개씩 배치 처리
        all_results = []
        for i in range(0, len(video_ids), 50):
            batch_ids = video_ids[i:i + 50]
            batch_results = self._get_video_stats_batch(batch_ids, use_cache)
            all_results.extend(batch_results)
        
        return all_results
    
    def _get_video_stats_batch(self, video_ids: List[str], use_cache: bool) -> List[VideoInfo]:
        """영상 정보 배치 조회 (내부)"""
        params = {'video_ids': sorted(video_ids)}
        cache_key = self._get_cache_key('videos.list', params)
        
        if use_cache:
            cached = self._get_cached(cache_key)
            if cached:
                return cached
        
        if not self._ensure_quota('videos.list'):
            return []
        
        try:
            request = self._youtube.videos().list(
                part='snippet,statistics,contentDetails',
                id=','.join(video_ids)
            )
            response = request.execute()
            
            results = []
            for item in response.get('items', []):
                snippet = item['snippet']
                stats = item.get('statistics', {})
                content = item.get('contentDetails', {})
                
                results.append(VideoInfo(
                    video_id=item['id'],
                    title=snippet['title'],
                    description=snippet['description'],
                    channel_id=snippet['channelId'],
                    channel_title=snippet['channelTitle'],
                    published_at=datetime.fromisoformat(snippet['publishedAt'].replace('Z', '+00:00')),
                    view_count=int(stats.get('viewCount', 0)),
                    like_count=int(stats.get('likeCount', 0)),
                    comment_count=int(stats.get('commentCount', 0)),
                    duration=content.get('duration', 'PT0S'),
                    thumbnail_url=snippet['thumbnails'].get('high', {}).get('url', ''),
                    tags=snippet.get('tags', []),
                    category_id=snippet.get('categoryId', '')
                ))
            
            if use_cache:
                self._set_cache(cache_key, results)
            
            logger.info(f"영상 정보 조회 완료: {len(results)}건")
            return results
            
        except self._http_error as e:
            logger.error(f"YouTube API 영상 조회 에러: {e}")
            return []
    
    # ==================== 채널 정보 API ====================
    
    def get_channel_stats(self, channel_ids: List[str], use_cache: bool = True) -> List[ChannelInfo]:
        """
        채널 상세 정보 조회 (배치)
        
        Args:
            channel_ids: 채널 ID 리스트 (최대 50개)
            use_cache: 캐시 사용 여부
            
        Returns:
            ChannelInfo 리스트
        """
        if not channel_ids:
            return []
        
        # 50개씩 배치 처리
        all_results = []
        for i in range(0, len(channel_ids), 50):
            batch_ids = channel_ids[i:i + 50]
            batch_results = self._get_channel_stats_batch(batch_ids, use_cache)
            all_results.extend(batch_results)
        
        return all_results
    
    def _get_channel_stats_batch(self, channel_ids: List[str], use_cache: bool) -> List[ChannelInfo]:
        """채널 정보 배치 조회 (내부)"""
        params = {'channel_ids': sorted(channel_ids)}
        cache_key = self._get_cache_key('channels.list', params)
        
        if use_cache:
            cached = self._get_cached(cache_key)
            if cached:
                return cached
        
        if not self._ensure_quota('channels.list'):
            return []
        
        try:
            request = self._youtube.channels().list(
                part='snippet,statistics',
                id=','.join(channel_ids)
            )
            response = request.execute()
            
            results = []
            for item in response.get('items', []):
                snippet = item['snippet']
                stats = item.get('statistics', {})
                
                results.append(ChannelInfo(
                    channel_id=item['id'],
                    title=snippet['title'],
                    description=snippet['description'],
                    subscriber_count=int(stats.get('subscriberCount', 0)),
                    video_count=int(stats.get('videoCount', 0)),
                    view_count=int(stats.get('viewCount', 0)),
                    published_at=datetime.fromisoformat(snippet['publishedAt'].replace('Z', '+00:00')),
                    thumbnail_url=snippet['thumbnails'].get('high', {}).get('url', ''),
                    country=snippet.get('country')
                ))
            
            if use_cache:
                self._set_cache(cache_key, results)
            
            logger.info(f"채널 정보 조회 완료: {len(results)}건")
            return results
            
        except self._http_error as e:
            logger.error(f"YouTube API 채널 조회 에러: {e}")
            return []
    
    # ==================== 댓글 API ====================
    
    def get_comments(
        self,
        video_id: str,
        max_results: int = 100,
        order: str = 'relevance',
        use_cache: bool = True
    ) -> List[CommentInfo]:
        """
        영상 댓글 조회
        
        Args:
            video_id: 영상 ID
            max_results: 최대 댓글 수 (최대 100)
            order: 정렬 방식 (relevance, time)
            use_cache: 캐시 사용 여부
            
        Returns:
            CommentInfo 리스트
        """
        params = {'video_id': video_id, 'max_results': max_results, 'order': order}
        cache_key = self._get_cache_key('commentThreads.list', params)
        
        if use_cache:
            cached = self._get_cached(cache_key)
            if cached:
                return cached
        
        if not self._ensure_quota('commentThreads.list'):
            return []
        
        try:
            request = self._youtube.commentThreads().list(
                part='snippet',
                videoId=video_id,
                maxResults=min(max_results, 100),
                order=order
            )
            response = request.execute()
            
            results = []
            for item in response.get('items', []):
                comment = item['snippet']['topLevelComment']['snippet']
                results.append(CommentInfo(
                    comment_id=item['id'],
                    video_id=video_id,
                    text=comment['textDisplay'],
                    author_name=comment['authorDisplayName'],
                    author_channel_id=comment.get('authorChannelId', {}).get('value', ''),
                    like_count=int(comment.get('likeCount', 0)),
                    published_at=datetime.fromisoformat(comment['publishedAt'].replace('Z', '+00:00')),
                    is_reply=False
                ))
            
            if use_cache:
                self._set_cache(cache_key, results)
            
            logger.info(f"댓글 조회 완료: {video_id} - {len(results)}건")
            return results
            
        except self._http_error as e:
            # 댓글 비활성화된 영상 처리
            if 'commentsDisabled' in str(e):
                logger.info(f"댓글 비활성화된 영상: {video_id}")
                return []
            logger.error(f"YouTube API 댓글 조회 에러: {e}")
            return []
    
    # ==================== 트렌드 API ====================
    
    def get_trending_videos(
        self,
        region_code: str = 'KR',
        category_id: Optional[str] = None,
        max_results: int = 50,
        use_cache: bool = True
    ) -> List[VideoInfo]:
        """
        인기 급상승 영상 조회
        
        Args:
            region_code: 지역 코드
            category_id: 카테고리 ID (옵션)
            max_results: 최대 결과 수
            use_cache: 캐시 사용 여부
            
        Returns:
            VideoInfo 리스트
        """
        params = {'region_code': region_code, 'category_id': category_id, 'max_results': max_results}
        cache_key = self._get_cache_key('videos.list.trending', params)
        
        if use_cache:
            cached = self._get_cached(cache_key)
            if cached:
                return cached
        
        if not self._ensure_quota('videos.list'):
            return []
        
        try:
            request_params = {
                'part': 'snippet,statistics,contentDetails',
                'chart': 'mostPopular',
                'regionCode': region_code,
                'maxResults': min(max_results, 50)
            }
            if category_id:
                request_params['videoCategoryId'] = category_id
            
            request = self._youtube.videos().list(**request_params)
            response = request.execute()
            
            results = []
            for item in response.get('items', []):
                snippet = item['snippet']
                stats = item.get('statistics', {})
                content = item.get('contentDetails', {})
                
                results.append(VideoInfo(
                    video_id=item['id'],
                    title=snippet['title'],
                    description=snippet['description'],
                    channel_id=snippet['channelId'],
                    channel_title=snippet['channelTitle'],
                    published_at=datetime.fromisoformat(snippet['publishedAt'].replace('Z', '+00:00')),
                    view_count=int(stats.get('viewCount', 0)),
                    like_count=int(stats.get('likeCount', 0)),
                    comment_count=int(stats.get('commentCount', 0)),
                    duration=content.get('duration', 'PT0S'),
                    thumbnail_url=snippet['thumbnails'].get('high', {}).get('url', ''),
                    tags=snippet.get('tags', []),
                    category_id=snippet.get('categoryId', '')
                ))
            
            if use_cache:
                self._set_cache(cache_key, results)
            
            logger.info(f"트렌드 영상 조회 완료: {region_code} - {len(results)}건")
            return results
            
        except self._http_error as e:
            logger.error(f"YouTube API 트렌드 조회 에러: {e}")
            return []
    
    # ==================== 유틸리티 ====================
    
    def get_quota_status(self) -> Dict[str, Any]:
        """쿼터 상태 조회"""
        return self.quota_manager.get_usage_summary()
    
    def clear_cache(self):
        """캐시 초기화"""
        self._cache.clear()
        logger.info("캐시 초기화 완료")
    
    def set_cache_ttl(self, ttl_seconds: int):
        """캐시 TTL 설정"""
        self._cache_ttl = ttl_seconds
        logger.info(f"캐시 TTL 설정: {ttl_seconds}초")
