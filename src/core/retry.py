"""재시도 데코레이터 및 유틸리티"""

import asyncio
import functools
import logging
from typing import Type, Tuple, Callable, Any
import random

logger = logging.getLogger(__name__)


def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    max_delay: float = 60.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    jitter: bool = True
):
    """
    동기 함수용 재시도 데코레이터
    
    Args:
        max_attempts: 최대 시도 횟수
        delay: 초기 대기 시간 (초)
        backoff: 대기 시간 증가 배수
        max_delay: 최대 대기 시간 (초)
        exceptions: 재시도할 예외 타입들
        jitter: 랜덤 지터 추가 여부
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            current_delay = delay
            last_exception = None
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt == max_attempts:
                        logger.error(f"{func.__name__} 최종 실패 ({max_attempts}회 시도): {e}")
                        raise
                    
                    # 지터 추가
                    actual_delay = current_delay
                    if jitter:
                        actual_delay = current_delay * (0.5 + random.random())
                    
                    logger.warning(
                        f"{func.__name__} 실패 (시도 {attempt}/{max_attempts}): {e}. "
                        f"{actual_delay:.1f}초 후 재시도..."
                    )
                    
                    import time
                    time.sleep(actual_delay)
                    
                    # 백오프
                    current_delay = min(current_delay * backoff, max_delay)
            
            raise last_exception
        return wrapper
    return decorator


def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    max_delay: float = 60.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    jitter: bool = True
):
    """
    비동기 함수용 재시도 데코레이터
    
    Args:
        max_attempts: 최대 시도 횟수
        delay: 초기 대기 시간 (초)
        backoff: 대기 시간 증가 배수
        max_delay: 최대 대기 시간 (초)
        exceptions: 재시도할 예외 타입들
        jitter: 랜덤 지터 추가 여부
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            current_delay = delay
            last_exception = None
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt == max_attempts:
                        logger.error(f"{func.__name__} 최종 실패 ({max_attempts}회 시도): {e}")
                        raise
                    
                    # 지터 추가
                    actual_delay = current_delay
                    if jitter:
                        actual_delay = current_delay * (0.5 + random.random())
                    
                    logger.warning(
                        f"{func.__name__} 실패 (시도 {attempt}/{max_attempts}): {e}. "
                        f"{actual_delay:.1f}초 후 재시도..."
                    )
                    
                    await asyncio.sleep(actual_delay)
                    
                    # 백오프
                    current_delay = min(current_delay * backoff, max_delay)
            
            raise last_exception
        return wrapper
    return decorator


class RetryContext:
    """재시도 컨텍스트 매니저"""
    
    def __init__(
        self,
        max_attempts: int = 3,
        delay: float = 1.0,
        backoff: float = 2.0,
        exceptions: Tuple[Type[Exception], ...] = (Exception,)
    ):
        self.max_attempts = max_attempts
        self.delay = delay
        self.backoff = backoff
        self.exceptions = exceptions
        self.attempt = 0
    
    def __iter__(self):
        return self
    
    def __next__(self):
        self.attempt += 1
        if self.attempt > self.max_attempts:
            raise StopIteration
        return self.attempt
    
    def should_retry(self, exception: Exception) -> bool:
        """재시도 여부 판단"""
        return (
            isinstance(exception, self.exceptions) and
            self.attempt < self.max_attempts
        )
    
    def get_delay(self) -> float:
        """현재 대기 시간 반환"""
        return self.delay * (self.backoff ** (self.attempt - 1))

