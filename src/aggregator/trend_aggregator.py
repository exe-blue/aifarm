"""트렌드 데이터 어그리게이터

디바이스에서 수집된 트렌드 분석 데이터를 통합하고 저장합니다.
- 데이터 병합 및 중복 제거
- Supabase 저장
- 실시간 스냅샷 생성
"""

import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json

from src.data.supabase_client import SupabaseClient
from src.trend.detector import TrendKeyword, TrendVideo
from src.trend.analyzer import TrendAnalyzer

logger = logging.getLogger(__name__)


@dataclass
class AggregationResult:
    """어그리게이션 결과"""
    keyword: str
    total_devices: int
    successful_devices: int
    failed_devices: int
    data_points: int
    aggregated_at: datetime


class TrendAggregator:
    """
    트렌드 데이터 어그리게이터
    
    디바이스에서 수집된 데이터를 통합하고 Supabase에 저장합니다.
    """
    
    def __init__(self, supabase_client: SupabaseClient):
        """
        Args:
            supabase_client: Supabase 클라이언트
        """
        self.supabase = supabase_client
        self.analyzer = TrendAnalyzer()
        self._pending_data: Dict[str, List[Dict[str, Any]]] = {}
    
    # ==================== 데이터 수집 ====================
    
    def collect_device_result(
        self,
        keyword: str,
        device_ip: str,
        task_type: str,
        result: Dict[str, Any],
        success: bool = True,
        error: Optional[str] = None
    ):
        """
        디바이스 결과 수집
        
        Args:
            keyword: 관련 키워드
            device_ip: 디바이스 IP
            task_type: 태스크 타입
            result: 수집 결과
            success: 성공 여부
            error: 에러 메시지
        """
        if keyword not in self._pending_data:
            self._pending_data[keyword] = []
        
        self._pending_data[keyword].append({
            'device_ip': device_ip,
            'task_type': task_type,
            'result': result,
            'success': success,
            'error': error,
            'collected_at': datetime.now().isoformat()
        })
        
        logger.debug(f"디바이스 결과 수집: {device_ip} - {task_type}")
    
    # ==================== 데이터 어그리게이션 ====================
    
    async def aggregate_keyword_data(self, keyword: str) -> AggregationResult:
        """
        키워드별 데이터 어그리게이션
        
        Args:
            keyword: 키워드
            
        Returns:
            AggregationResult
        """
        if keyword not in self._pending_data:
            return AggregationResult(
                keyword=keyword,
                total_devices=0,
                successful_devices=0,
                failed_devices=0,
                data_points=0,
                aggregated_at=datetime.now()
            )
        
        data_list = self._pending_data[keyword]
        
        # 통계 계산
        total = len(data_list)
        successful = sum(1 for d in data_list if d['success'])
        failed = total - successful
        
        # 태스크 타입별 데이터 병합
        merged_data = self._merge_by_task_type(data_list)
        
        # Supabase 저장
        try:
            await self._save_aggregated_data(keyword, merged_data)
            # 저장 성공 시에만 대기 데이터 삭제
            del self._pending_data[keyword]
        except Exception as e:
            logger.error(f"키워드 '{keyword}' 저장 실패: {e}")
            raise        
        result = AggregationResult(
            keyword=keyword,
            total_devices=total,
            successful_devices=successful,
            failed_devices=failed,
            data_points=sum(len(v) for v in merged_data.values()),
            aggregated_at=datetime.now()
        )
        
        logger.info(f"키워드 '{keyword}' 어그리게이션 완료: {result.successful_devices}/{result.total_devices} 성공")
        return result
    
    def _merge_by_task_type(self, data_list: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """태스크 타입별 데이터 병합"""
        merged: Dict[str, List[Dict[str, Any]]] = {}
        
        for data in data_list:
            if not data['success']:
                continue
            
            task_type = data['task_type']
            if task_type not in merged:
                merged[task_type] = []
            
            merged[task_type].append(data['result'])
        
        return merged
    
    async def _save_aggregated_data(self, keyword: str, merged_data: Dict[str, List[Dict[str, Any]]]):
        """어그리게이션 데이터 저장"""
        self.supabase._ensure_client()
        
        # 키워드 저장/업데이트
        keyword_record = {
            'keyword': keyword,
            'search_volume': len(merged_data.get('search_analysis', [])),
            'detected_at': datetime.now().isoformat()
        }
        
        response = self.supabase.client.table('trend_keywords').upsert(
            keyword_record,
            on_conflict='keyword'
        ).execute()
        
        keyword_id = response.data[0]['id'] if response.data else None
        
        # 디바이스 수집 결과 저장
        for task_type, results in merged_data.items():
            for result in results:
                collection_record = {
                    'keyword_id': keyword_id,
                    'task_type': task_type,
                    'task_status': 'completed',
                    'result': result,
                    'collected_at': datetime.now().isoformat()
                }
                
                self.supabase.client.table('device_collection_results').insert(
                    collection_record
                ).execute()
    
    # ==================== 검색 결과 어그리게이션 ====================
    
    def aggregate_search_results(
        self, 
        results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        검색 결과 어그리게이션
        
        Args:
            results: 검색 결과 리스트
            
        Returns:
            통합된 검색 분석 결과
        """
        # 중복 제거 (제목 기준)
        unique_videos: Dict[str, Dict[str, Any]] = {}
        
        for result in results:
            for video in result.get('results', []):
                title = video.get('title', '')
                if title and title not in unique_videos:
                    unique_videos[title] = video
        
        # 순위 집계
        position_counts: Dict[int, int] = {}
        for result in results:
            for video in result.get('results', []):
                pos = video.get('position', 0)
                position_counts[pos] = position_counts.get(pos, 0) + 1
        
        # 광고 위치 집계
        all_ad_positions: List[int] = []
        for result in results:
            all_ad_positions.extend(result.get('ad_positions', []))
        
        return {
            'unique_videos': list(unique_videos.values()),
            'total_videos': len(unique_videos),
            'position_distribution': position_counts,
            'ad_position_frequency': {
                pos: all_ad_positions.count(pos) 
                for pos in set(all_ad_positions)
            }
        }
    
    # ==================== 댓글 어그리게이션 ====================
    
    def aggregate_comments(
        self, 
        results: List[Dict[str, Any]],
        include_sentiment: bool = True
    ) -> Dict[str, Any]:
        """
        댓글 어그리게이션
        
        Args:
            results: 댓글 수집 결과 리스트
            include_sentiment: 감성 분석 포함 여부
            
        Returns:
            통합된 댓글 분석 결과
        """
        # 중복 제거
        unique_comments: Dict[str, Dict[str, Any]] = {}
        
        for result in results:
            for comment in result.get('comments', []):
                text = comment.get('text', '')
                if text and text not in unique_comments:
                    unique_comments[text] = comment
        
        all_comments = list(unique_comments.values())
        
        aggregated = {
            'unique_comments': all_comments,
            'total_count': len(all_comments),
            'sources': len(results)
        }
        
        # 감성 분석
        if include_sentiment and all_comments:
            comment_texts = [c['text'] for c in all_comments]
            aggregated['sentiment'] = self.analyzer.analyze_comments_sentiment(comment_texts)
        
        return aggregated
    
    # ==================== 추천 경로 어그리게이션 ====================
    
    def aggregate_recommendations(
        self, 
        results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        추천 경로 어그리게이션
        
        Args:
            results: 추천 경로 추적 결과 리스트
            
        Returns:
            통합된 추천 분석 결과
        """
        home_recs: Dict[str, int] = {}  # 제목: 빈도
        watch_recs: Dict[str, int] = {}
        
        for result in results:
            # 홈피드 추천
            for rec in result.get('home_recommendations', []):
                title = rec.get('title', '')
                if title:
                    home_recs[title] = home_recs.get(title, 0) + 1
            
            # 시청 후 추천
            for rec in result.get('watch_recommendations', []):
                title = rec.get('title', '')
                if title:
                    watch_recs[title] = watch_recs.get(title, 0) + 1
        
        # 빈도순 정렬
        sorted_home = sorted(home_recs.items(), key=lambda x: x[1], reverse=True)
        sorted_watch = sorted(watch_recs.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'home_feed_top_10': [
                {'title': title, 'frequency': freq} 
                for title, freq in sorted_home[:10]
            ],
            'watch_next_top_10': [
                {'title': title, 'frequency': freq} 
                for title, freq in sorted_watch[:10]
            ],
            'total_home_unique': len(home_recs),
            'total_watch_unique': len(watch_recs)
        }
    
    # ==================== 스냅샷 생성 ====================
    
    async def create_snapshot(
        self,
        keywords: List[TrendKeyword],
        videos: List[TrendVideo],
        region_code: str = 'KR'
    ) -> str:
        """
        트렌드 스냅샷 생성 및 저장
        
        Args:
            keywords: 트렌드 키워드 리스트
            videos: 트렌드 영상 리스트
            region_code: 지역 코드
            
        Returns:
            스냅샷 ID
        """
        self.supabase._ensure_client()
        
        snapshot = {
            'snapshot_at': datetime.now().isoformat(),
            'region_code': region_code,
            'top_keywords': [
                {
                    'keyword': k.keyword,
                    'confidence': k.confidence_score,
                    'growth_rate': k.growth_rate
                }
                for k in keywords[:20]
            ],
            'top_videos': [
                {
                    'video_id': v.video_id,
                    'title': v.title,
                    'trend_score': v.trend_score,
                    'view_count': v.view_count
                }
                for v in videos[:20]
            ],
            'analysis_summary': {
                'total_keywords': len(keywords),
                'total_videos': len(videos),
                'avg_confidence': sum(k.confidence_score for k in keywords) / len(keywords) if keywords else 0,
                'avg_trend_score': sum(v.trend_score for v in videos) / len(videos) if videos else 0
            }
        }
        
        response = self.supabase.client.table('trend_snapshots').insert(snapshot).execute()
        
        snapshot_id = response.data[0]['id'] if response.data else ''
        logger.info(f"트렌드 스냅샷 생성: {snapshot_id}")
        
        return snapshot_id
    
    # ==================== 알림 생성 ====================
    
    async def create_alert(
        self,
        alert_type: str,
        title: str,
        message: str,
        severity: str = 'info',
        data: Optional[Dict[str, Any]] = None
    ):
        """
        트렌드 알림 생성
        
        Args:
            alert_type: 알림 타입
            title: 알림 제목
            message: 알림 메시지
            severity: 심각도 (info, warning, critical)
            data: 추가 데이터
        """
        self.supabase._ensure_client()
        
        alert = {
            'alert_type': alert_type,
            'severity': severity,
            'title': title,
            'message': message,
            'data': data or {}
        }
        
        self.supabase.client.table('trend_alerts').insert(alert).execute()
        logger.info(f"트렌드 알림 생성: [{severity}] {title}")
    
    # ==================== 유틸리티 ====================
    
    def get_pending_keywords(self) -> List[str]:
        """대기 중인 키워드 목록"""
        return list(self._pending_data.keys())
    
    def get_pending_count(self, keyword: str) -> int:
        """키워드별 대기 데이터 수"""
        return len(self._pending_data.get(keyword, []))
    
    def clear_pending(self, keyword: Optional[str] = None):
        """대기 데이터 삭제"""
        if keyword:
            if keyword in self._pending_data:
                del self._pending_data[keyword]
        else:
            self._pending_data.clear()
        
        logger.info(f"대기 데이터 삭제: {keyword or '전체'}")
