"""YouTube API 쿼터 관리자

YouTube Data API v3 일일 쿼터(10,000 units)를 효율적으로 관리합니다.
- 쿼터 사용량 추적
- 비용 예측
- 자동 쓰로틀링
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# API 메서드별 쿼터 비용 (units)
API_QUOTA_COSTS: Dict[str, int] = {
    # Search 관련 (가장 비싼 API)
    'search.list': 100,
    
    # Videos 관련
    'videos.list': 1,
    'videos.insert': 1600,
    'videos.update': 50,
    'videos.delete': 50,
    'videos.rate': 50,
    
    # Channels 관련
    'channels.list': 1,
    'channels.update': 50,
    
    # Comments 관련
    'commentThreads.list': 1,
    'commentThreads.insert': 50,
    'comments.list': 1,
    'comments.insert': 50,
    
    # Playlists 관련
    'playlists.list': 1,
    'playlistItems.list': 1,
    
    # Subscriptions 관련
    'subscriptions.list': 1,
    
    # Captions 관련
    'captions.list': 50,
}

# 일일 기본 쿼터
DAILY_QUOTA_LIMIT = 10000


@dataclass
class QuotaUsage:
    """쿼터 사용 기록"""
    method: str
    cost: int
    timestamp: datetime = field(default_factory=datetime.now)
    params: Dict = field(default_factory=dict)


class QuotaManager:
    """
    YouTube API 쿼터 관리자
    
    일일 쿼터 사용량을 추적하고, 쿼터 초과를 방지합니다.
    """
    
    def __init__(self, daily_limit: int = DAILY_QUOTA_LIMIT):
        """
        Args:
            daily_limit: 일일 쿼터 한도 (기본 10,000)
        """
        self.daily_limit = daily_limit
        self._usage_history: list[QuotaUsage] = []
        self._daily_used: int = 0
        self._reset_date: datetime = self._get_next_reset_time()
    
    def _get_next_reset_time(self) -> datetime:
        """다음 쿼터 리셋 시간 계산 (PST 자정 = KST 17:00)"""
        now = datetime.now()
        # YouTube API 쿼터는 Pacific Time 자정에 리셋
        # PST = UTC-8, KST = UTC+9, 차이 = 17시간
        reset_hour = 17  # KST 기준 리셋 시간
        
        if now.hour >= reset_hour:
            # 오늘 리셋 시간이 지났으면 내일 리셋
            next_reset = now.replace(hour=reset_hour, minute=0, second=0, microsecond=0) + timedelta(days=1)
        else:
            # 오늘 리셋 시간 전이면 오늘 리셋
            next_reset = now.replace(hour=reset_hour, minute=0, second=0, microsecond=0)
        
        return next_reset
    
    def _check_and_reset(self):
        """쿼터 리셋 시간 확인 및 리셋"""
        now = datetime.now()
        if now >= self._reset_date:
            logger.info(f"쿼터 리셋: {self._daily_used} units 사용 후 리셋")
            self._daily_used = 0
            self._usage_history.clear()
            self._reset_date = self._get_next_reset_time()
    
    def get_cost(self, method: str) -> int:
        """
        API 메서드의 쿼터 비용 조회
        
        Args:
            method: API 메서드명 (예: 'search.list')
            
        Returns:
            쿼터 비용 (units)
        """
        return API_QUOTA_COSTS.get(method, 1)
    
    def can_afford(self, method: str, count: int = 1) -> bool:
        """
        API 호출이 가능한지 확인
        
        Args:
            method: API 메서드명
            count: 호출 횟수
            
        Returns:
            호출 가능 여부
        """
        self._check_and_reset()
        cost = self.get_cost(method) * count
        return (self._daily_used + cost) <= self.daily_limit
    
    def consume(self, method: str, count: int = 1, params: Dict = None) -> bool:
        """
        쿼터 소비 기록
        
        Args:
            method: API 메서드명
            count: 호출 횟수
            params: API 호출 파라미터 (로깅용)
            
        Returns:
            소비 성공 여부
        """
        self._check_and_reset()
        cost = self.get_cost(method) * count
        
        if (self._daily_used + cost) > self.daily_limit:
            logger.warning(f"쿼터 초과 방지: {method} ({cost} units) - 남은 쿼터: {self.remaining}")
            return False
        
        self._daily_used += cost
        self._usage_history.append(QuotaUsage(
            method=method,
            cost=cost,
            params=params or {}
        ))
        
        logger.debug(f"쿼터 소비: {method} ({cost} units) - 사용량: {self._daily_used}/{self.daily_limit}")
        return True
    
    @property
    def used(self) -> int:
        """현재 사용된 쿼터"""
        self._check_and_reset()
        return self._daily_used
    
    @property
    def remaining(self) -> int:
        """남은 쿼터"""
        self._check_and_reset()
        return self.daily_limit - self._daily_used
    
    @property
    def usage_percent(self) -> float:
        """쿼터 사용률 (%)"""
        return (self.used / self.daily_limit) * 100
    
    def get_reset_time(self) -> datetime:
        """다음 리셋 시간"""
        return self._reset_date
    
    def get_time_until_reset(self) -> timedelta:
        """리셋까지 남은 시간"""
        return self._reset_date - datetime.now()
    
    def get_usage_summary(self) -> Dict:
        """사용량 요약"""
        self._check_and_reset()
        
        # 메서드별 사용량 집계
        method_usage: Dict[str, int] = {}
        for usage in self._usage_history:
            method_usage[usage.method] = method_usage.get(usage.method, 0) + usage.cost
        
        return {
            'daily_limit': self.daily_limit,
            'used': self.used,
            'remaining': self.remaining,
            'usage_percent': round(self.usage_percent, 2),
            'reset_time': self._reset_date.isoformat(),
            'time_until_reset': str(self.get_time_until_reset()),
            'method_breakdown': method_usage,
            'call_count': len(self._usage_history)
        }
    
    def estimate_calls(self, method: str) -> int:
        """
        남은 쿼터로 가능한 호출 횟수 예측
        
        Args:
            method: API 메서드명
            
        Returns:
            가능한 호출 횟수
        """
        cost = self.get_cost(method)
        return self.remaining // cost
    
    def warn_if_low(self, threshold: float = 0.2) -> Optional[str]:
        """
        쿼터가 부족할 때 경고
        
        Args:
            threshold: 경고 임계값 (0.2 = 20% 미만일 때 경고)
            
        Returns:
            경고 메시지 또는 None
        """
        remaining_ratio = self.remaining / self.daily_limit
        
        if remaining_ratio < threshold:
            message = f"⚠️ 쿼터 부족 경고: {self.remaining} units 남음 ({round(remaining_ratio * 100, 1)}%)"
            logger.warning(message)
            return message
        
        return None
