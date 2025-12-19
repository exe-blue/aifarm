"""트렌드 분석기

수집된 트렌드 데이터를 분석하고 인사이트를 도출합니다.
- 감성 분석
- 키워드 클러스터링
- 예측 모델
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from collections import Counter
import re

from .detector import TrendKeyword, TrendVideo

logger = logging.getLogger(__name__)


@dataclass
class SentimentResult:
    """감성 분석 결과"""
    text: str
    polarity: float  # -1 (부정) ~ 1 (긍정)
    subjectivity: float  # 0 (객관) ~ 1 (주관)
    label: str  # 'positive', 'negative', 'neutral'


@dataclass
class TrendInsight:
    """트렌드 인사이트"""
    keyword: str
    insight_type: str  # 'rising', 'peak', 'declining', 'emerging'
    confidence: float
    recommendation: str
    detected_at: datetime


class TrendAnalyzer:
    """
    트렌드 분석기
    
    수집된 데이터를 분석하여 인사이트를 도출합니다.
    """
    
    def __init__(self):
        """분석기 초기화"""
        self._sentiment_analyzer = None
        self._initialize_sentiment()
    
    def _initialize_sentiment(self):
        """감성 분석기 초기화"""
        try:
            from textblob import TextBlob
            self._textblob = TextBlob
            logger.info("TextBlob 감성 분석기 초기화 완료")
        except ImportError:
            logger.warning("textblob 미설치. 감성 분석 기능 제한됨")
            self._textblob = None
    
    # ==================== 감성 분석 ====================
    
    def analyze_sentiment(self, text: str) -> SentimentResult:
        """
        텍스트 감성 분석
        
        Args:
            text: 분석할 텍스트
            
        Returns:
            SentimentResult
        """
        if not self._textblob:
            return SentimentResult(
                text=text,
                polarity=0.0,
                subjectivity=0.5,
                label='neutral'
            )
        
        try:
            blob = self._textblob(text)
            polarity = blob.sentiment.polarity
            subjectivity = blob.sentiment.subjectivity
            
            # 레이블 결정
            if polarity > 0.1:
                label = 'positive'
            elif polarity < -0.1:
                label = 'negative'
            else:
                label = 'neutral'
            
            return SentimentResult(
                text=text,
                polarity=round(polarity, 3),
                subjectivity=round(subjectivity, 3),
                label=label
            )
        except Exception as e:
            logger.error(f"감성 분석 오류: {e}")
            return SentimentResult(text=text, polarity=0.0, subjectivity=0.5, label='neutral')
    
    def analyze_comments_sentiment(self, comments: List[str]) -> Dict[str, Any]:
        """
        댓글 목록 감성 분석
        
        Args:
            comments: 댓글 텍스트 리스트
            
        Returns:
            분석 결과 딕셔너리
        """
        if not comments:
            return {
                'total_count': 0,
                'positive_ratio': 0,
                'negative_ratio': 0,
                'neutral_ratio': 0,
                'average_polarity': 0,
                'average_subjectivity': 0
            }
        
        results = [self.analyze_sentiment(comment) for comment in comments]
        
        positive_count = sum(1 for r in results if r.label == 'positive')
        negative_count = sum(1 for r in results if r.label == 'negative')
        neutral_count = sum(1 for r in results if r.label == 'neutral')
        total = len(results)
        
        avg_polarity = sum(r.polarity for r in results) / total
        avg_subjectivity = sum(r.subjectivity for r in results) / total
        
        return {
            'total_count': total,
            'positive_count': positive_count,
            'negative_count': negative_count,
            'neutral_count': neutral_count,
            'positive_ratio': round(positive_count / total * 100, 2),
            'negative_ratio': round(negative_count / total * 100, 2),
            'neutral_ratio': round(neutral_count / total * 100, 2),
            'average_polarity': round(avg_polarity, 3),
            'average_subjectivity': round(avg_subjectivity, 3),
            'overall_sentiment': 'positive' if avg_polarity > 0.1 else ('negative' if avg_polarity < -0.1 else 'neutral')
        }
    
    # ==================== 키워드 분석 ====================
    
    def cluster_keywords(
        self, 
        keywords: List[TrendKeyword], 
        min_cluster_size: int = 3
    ) -> Dict[str, List[TrendKeyword]]:
        """
        키워드 클러스터링
        
        Args:
            keywords: 트렌드 키워드 리스트
            min_cluster_size: 최소 클러스터 크기
            
        Returns:
            {클러스터명: [키워드 리스트]}
        """
        clusters: Dict[str, List[TrendKeyword]] = {}
        
        # 간단한 규칙 기반 클러스터링
        for keyword in keywords:
            assigned = False
            
            # 기존 클러스터에 할당 시도
            for cluster_name, cluster_keywords in clusters.items():
                # 관련 키워드와 겹치는지 확인
                cluster_related = set()
                for ck in cluster_keywords:
                    cluster_related.update(ck.related_keywords)
                
                if keyword.keyword in cluster_related or any(
                    rk in cluster_related for rk in keyword.related_keywords
                ):
                    clusters[cluster_name].append(keyword)
                    assigned = True
                    break
            
            # 새 클러스터 생성
            if not assigned:
                clusters[keyword.keyword] = [keyword]
        
        # 최소 크기 미만 클러스터 제거
        clusters = {
            k: v for k, v in clusters.items() 
            if len(v) >= min_cluster_size
        }
        
        logger.info(f"키워드 클러스터 {len(clusters)}개 생성")
        return clusters
    
    def extract_hot_keywords(
        self, 
        videos: List[TrendVideo], 
        top_n: int = 20
    ) -> List[Tuple[str, int]]:
        """
        영상에서 핫 키워드 추출
        
        Args:
            videos: 트렌드 영상 리스트
            top_n: 상위 N개 반환
            
        Returns:
            [(키워드, 빈도)] 리스트
        """
        all_keywords: List[str] = []
        
        for video in videos:
            all_keywords.extend(video.keywords)
        
        keyword_counts = Counter(all_keywords)
        return keyword_counts.most_common(top_n)
    
    # ==================== 트렌드 인사이트 ====================
    
    def generate_insights(
        self, 
        keywords: List[TrendKeyword],
        videos: List[TrendVideo]
    ) -> List[TrendInsight]:
        """
        트렌드 인사이트 생성
        
        Args:
            keywords: 트렌드 키워드 리스트
            videos: 트렌드 영상 리스트
            
        Returns:
            TrendInsight 리스트
        """
        insights: List[TrendInsight] = []
        
        for keyword in keywords:
            # 인사이트 타입 결정
            if keyword.confidence_score >= 0.8 and keyword.growth_rate >= 50:
                insight_type = 'rising'
                recommendation = f"'{keyword.keyword}' 키워드가 급상승 중입니다. 관련 콘텐츠 제작을 권장합니다."
            elif keyword.confidence_score >= 0.9:
                insight_type = 'peak'
                recommendation = f"'{keyword.keyword}' 키워드가 피크에 도달했습니다. 빠른 대응이 필요합니다."
            elif keyword.confidence_score >= 0.5:
                insight_type = 'emerging'
                recommendation = f"'{keyword.keyword}' 키워드가 부상 중입니다. 모니터링을 권장합니다."
            else:
                insight_type = 'declining'
                recommendation = f"'{keyword.keyword}' 키워드의 관심도가 하락 중입니다."
            
            insights.append(TrendInsight(
                keyword=keyword.keyword,
                insight_type=insight_type,
                confidence=keyword.confidence_score,
                recommendation=recommendation,
                detected_at=datetime.now()
            ))
        
        # 급상승 우선 정렬
        priority_order = {'rising': 0, 'peak': 1, 'emerging': 2, 'declining': 3}
        insights.sort(key=lambda i: (priority_order.get(i.insight_type, 4), -i.confidence))
        
        logger.info(f"트렌드 인사이트 {len(insights)}건 생성")
        return insights
    
    # ==================== 보고서 생성 ====================
    
    def generate_report(
        self,
        keywords: List[TrendKeyword],
        videos: List[TrendVideo],
        include_sentiment: bool = False,
        comments: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        트렌드 분석 보고서 생성
        
        Args:
            keywords: 트렌드 키워드 리스트
            videos: 트렌드 영상 리스트
            include_sentiment: 감성 분석 포함 여부
            comments: 댓글 리스트 (감성 분석용)
            
        Returns:
            보고서 딕셔너리
        """
        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_keywords': len(keywords),
                'total_videos': len(videos),
                'top_keyword': keywords[0].keyword if keywords else None,
                'top_video': videos[0].title if videos else None
            },
            'keywords': {
                'rising': [k for k in keywords if k.confidence_score >= 0.8],
                'emerging': [k for k in keywords if 0.5 <= k.confidence_score < 0.8],
                'all': keywords
            },
            'videos': {
                'top_10': videos[:10],
                'by_growth_rate': sorted(videos, key=lambda v: v.growth_rate, reverse=True)[:10],
                'by_trend_score': sorted(videos, key=lambda v: v.trend_score, reverse=True)[:10]
            },
            'hot_keywords': self.extract_hot_keywords(videos),
            'insights': [
                {
                    'keyword': i.keyword,
                    'type': i.insight_type,
                    'confidence': i.confidence,
                    'recommendation': i.recommendation
                }
                for i in self.generate_insights(keywords, videos)
            ]
        }
        
        # 감성 분석 추가
        if include_sentiment and comments:
            report['sentiment_analysis'] = self.analyze_comments_sentiment(comments)
        
        logger.info("트렌드 보고서 생성 완료")
        return report
