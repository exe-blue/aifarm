"""트렌드 스나이퍼 시스템

트렌드 감지, 분석, 디바이스 태스크 분배를 통합 관리하는 메인 시스템입니다.

사용 예시:
    ```python
    from src.trend.sniper import TrendSniper
    
    # 시스템 초기화
    sniper = TrendSniper(
        youtube_api_key='YOUR_API_KEY',
        supabase_url='YOUR_SUPABASE_URL',
        supabase_key='YOUR_SUPABASE_KEY'
    )
    
    # 트렌드 감지 시작
    await sniper.detect_trends()
    
    # 특정 키워드 분석
    await sniper.analyze_keyword('BTS', depth=5)
    
    # 실시간 모니터링 시작
    await sniper.start_monitoring(interval_minutes=5)
    ```
"""

import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional

from src.youtube.api_client import YouTubeAPIClient
from src.youtube.quota_manager import QuotaManager
from src.trend.detector import TrendDetector, TrendKeyword, TrendVideo
from src.trend.analyzer import TrendAnalyzer, TrendInsight
from src.dispatcher.trend_dispatcher import TrendDispatcher, TaskType, TaskAssignment
from src.aggregator.trend_aggregator import TrendAggregator
from src.data.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class TrendSniper:
    """
    트렌드 스나이퍼 시스템
    
    600대 디바이스 팜을 활용한 YouTube 트렌드 분석 플랫폼입니다.
    """
    
    def __init__(
        self,
        youtube_api_key: str,
        supabase_url: str,
        supabase_key: str,
        device_subnet: str = '10.0.10',
        total_devices: int = 600
    ):
        """
        Args:
            youtube_api_key: YouTube Data API v3 키
            supabase_url: Supabase 프로젝트 URL
            supabase_key: Supabase API 키
            device_subnet: 디바이스 서브넷
            total_devices: 총 디바이스 수
        """
        # 쿼터 관리자
        self.quota_manager = QuotaManager()
        
        # YouTube API 클라이언트
        self.youtube = YouTubeAPIClient(
            api_key=youtube_api_key,
            quota_manager=self.quota_manager
        )
        
        # Supabase 클라이언트
        self.supabase = SupabaseClient(url=supabase_url, key=supabase_key)
        
        # 트렌드 감지기
        self.detector = TrendDetector(youtube_client=self.youtube)
        
        # 트렌드 분석기
        self.analyzer = TrendAnalyzer()
        
        # 디스패처
        self.dispatcher = TrendDispatcher(
            device_subnet=device_subnet,
            total_devices=total_devices
        )
        
        # 어그리게이터
        self.aggregator = TrendAggregator(supabase_client=self.supabase)
        
        # 내부 상태
        self._is_monitoring = False
        self._last_detection: Optional[datetime] = None
        self._cached_trends: Dict[str, Any] = {}
        
        logger.info("트렌드 스나이퍼 시스템 초기화 완료")
    
    # ==================== 트렌드 감지 ====================
    
    async def detect_trends(
        self,
        region_code: str = 'KR',
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        트렌드 감지 실행
        
        Args:
            region_code: 지역 코드
            limit: 최대 결과 수
            
        Returns:
            감지 결과 딕셔너리
        """
        logger.info(f"트렌드 감지 시작: {region_code}")
        
        # 트렌드 영상 감지
        videos = self.detector.detect_trending_videos(
            region_code=region_code,
            limit=limit
        )
        
        # 트렌드 키워드 감지
        keywords = self.detector.detect_trending_keywords(
            region_code=region_code,
            limit=20
        )
        
        # 인사이트 생성
        insights = self.analyzer.generate_insights(keywords, videos)
        
        # 스냅샷 저장
        snapshot_id = await self.aggregator.create_snapshot(
            keywords=keywords,
            videos=videos,
            region_code=region_code
        )
        
        # 급상승 키워드 알림
        rising_keywords = [k for k in keywords if k.confidence_score >= 0.8]
        for keyword in rising_keywords[:3]:
            await self.aggregator.create_alert(
                alert_type='rising_keyword',
                title=f"급상승 키워드: {keyword.keyword}",
                message=f"신뢰도 {keyword.confidence_score:.0%}, 성장률 {keyword.growth_rate:.1f}%",
                severity='warning',
                data={'keyword': keyword.keyword, 'confidence': keyword.confidence_score}
            )
        
        self._last_detection = datetime.now()
        self._cached_trends = {
            'videos': videos,
            'keywords': keywords,
            'insights': insights,
            'snapshot_id': snapshot_id,
            'detected_at': self._last_detection.isoformat()
        }
        
        logger.info(f"트렌드 감지 완료: 영상 {len(videos)}건, 키워드 {len(keywords)}건")
        return self._cached_trends
    
    # ==================== 키워드 분석 ====================
    
    async def analyze_keyword(
        self,
        keyword: str,
        depth: int = 5,
        dispatch_tasks: bool = True
    ) -> Dict[str, Any]:
        """
        특정 키워드 심층 분석
        
        Args:
            keyword: 분석할 키워드
            depth: 분석 깊이 (1-10)
            dispatch_tasks: 디바이스 태스크 분배 여부
            
        Returns:
            분석 결과 딕셔너리
        """
        logger.info(f"키워드 분석 시작: '{keyword}' (깊이: {depth})")
        
        # API 기반 분석
        api_analysis = self.detector.analyze_keyword(keyword, depth=depth)
        
        # 디바이스 태스크 분배
        assignments = {}
        if dispatch_tasks:
            assignments = self.dispatcher.assign_full_trend_analysis(
                keyword=keyword,
                depth=depth
            )
        
        result = {
            'keyword': keyword,
            'api_analysis': api_analysis,
            'task_assignments': {
                task_type.value: len(tasks) 
                for task_type, tasks in assignments.items()
            },
            'analyzed_at': datetime.now().isoformat()
        }
        
        logger.info(f"키워드 '{keyword}' 분석 완료")
        return result
    
    # ==================== 영상 분석 ====================
    
    async def analyze_video(
        self,
        video_id: str,
        collect_comments: bool = True
    ) -> Dict[str, Any]:
        """
        특정 영상 분석
        
        Args:
            video_id: 영상 ID
            collect_comments: 댓글 수집 여부
            
        Returns:
            분석 결과 딕셔너리
        """
        logger.info(f"영상 분석 시작: {video_id}")
        
        # 영상 정보 조회
        video_stats = self.youtube.get_video_stats([video_id])
        
        if not video_stats:
            return {'error': '영상을 찾을 수 없습니다', 'video_id': video_id}
        
        video = video_stats[0]
        
        result = {
            'video_id': video_id,
            'title': video.title,
            'channel': video.channel_title,
            'stats': {
                'view_count': video.view_count,
                'like_count': video.like_count,
                'comment_count': video.comment_count
            },
            'analyzed_at': datetime.now().isoformat()
        }
        
        # 댓글 수집 및 감성 분석
        if collect_comments:
            comments = self.youtube.get_comments(video_id, max_results=100)
            comment_texts = [c.text for c in comments]
            
            result['sentiment'] = self.analyzer.analyze_comments_sentiment(comment_texts)
            result['comment_sample'] = comment_texts[:10]
        
        # 디바이스 태스크 분배
        assignments = self.dispatcher.assign_video_analysis(
            video_id=video_id,
            video_title=video.title
        )
        
        result['task_assignments'] = len(assignments)
        
        logger.info(f"영상 '{video_id}' 분석 완료")
        return result
    
    # ==================== 실시간 모니터링 ====================
    
    async def start_monitoring(
        self,
        interval_minutes: int = 5,
        region_code: str = 'KR'
    ):
        """
        실시간 트렌드 모니터링 시작
        
        Args:
            interval_minutes: 감지 주기 (분)
            region_code: 지역 코드
        """
        self._is_monitoring = True
        logger.info(f"실시간 모니터링 시작: {interval_minutes}분 간격")
        
        while self._is_monitoring:
            try:
                await self.detect_trends(region_code=region_code)
                await asyncio.sleep(interval_minutes * 60)
            except Exception as e:
                logger.error(f"모니터링 에러: {e}")
                await asyncio.sleep(60)  # 에러 시 1분 대기
    
    def stop_monitoring(self):
        """실시간 모니터링 중지"""
        self._is_monitoring = False
        logger.info("실시간 모니터링 중지")
    
    # ==================== 보고서 생성 ====================
    
    def generate_report(self) -> Dict[str, Any]:
        """
        현재 트렌드 보고서 생성
        
        Returns:
            보고서 딕셔너리
        """
        if not self._cached_trends:
            return {'error': '트렌드 데이터가 없습니다. detect_trends()를 먼저 실행하세요.'}
        
        return self.analyzer.generate_report(
            keywords=self._cached_trends.get('keywords', []),
            videos=self._cached_trends.get('videos', [])
        )
    
    # ==================== 상태 조회 ====================
    
    def get_status(self) -> Dict[str, Any]:
        """시스템 상태 조회"""
        return {
            'is_monitoring': self._is_monitoring,
            'last_detection': self._last_detection.isoformat() if self._last_detection else None,
            'quota_status': self.quota_manager.get_usage_summary(),
            'dispatcher_stats': self.dispatcher.get_stats(),
            'cached_trends': {
                'video_count': len(self._cached_trends.get('videos', [])),
                'keyword_count': len(self._cached_trends.get('keywords', []))
            }
        }
    
    def get_quota_status(self) -> Dict[str, Any]:
        """쿼터 상태 조회"""
        return self.quota_manager.get_usage_summary()


# ==================== 팩토리 함수 ====================

def create_trend_sniper_from_env() -> TrendSniper:
    """
    환경 변수에서 설정을 로드하여 TrendSniper 생성
    
    필요한 환경 변수:
    - YOUTUBE_API_KEY
    - SUPABASE_URL
    - SUPABASE_KEY
    - DEVICE_NETWORK_SUBNET (선택, 기본값: '10.0.10')
    - TOTAL_DEVICES (선택, 기본값: 600)
    """
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    return TrendSniper(
        youtube_api_key=os.getenv('YOUTUBE_API_KEY', ''),
        supabase_url=os.getenv('SUPABASE_URL', ''),
        supabase_key=os.getenv('SUPABASE_KEY', ''),
        device_subnet=os.getenv('DEVICE_NETWORK_SUBNET', '10.0.10'),
        total_devices=int(os.getenv('TOTAL_DEVICES', '600'))
    )
