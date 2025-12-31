"""
🔧 DoAi.Me Backend Configuration
환경 변수 기반 설정 관리

왜 이 구조인가?
- pydantic-settings로 타입 안전한 환경 변수 로딩
- .env 파일과 환경 변수 모두 지원
- 기본값 제공으로 개발 환경 빠른 시작 가능
"""

import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # ===========================================
    # Supabase Configuration (필수)
    # ===========================================
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    
    # PostgreSQL 직접 연결 (선택)
    database_url: Optional[str] = None
    
    # ===========================================
    # Server Configuration
    # ===========================================
    port: int = 8080
    host: str = "0.0.0.0"
    env: str = "development"  # development, staging, production
    debug: bool = True
    
    # ===========================================
    # API Configuration
    # ===========================================
    api_prefix: str = "/api/v1"
    api_key: str = "dev-api-key-change-in-production"
    
    # ===========================================
    # Device Management
    # ===========================================
    # 기기 하트비트 타임아웃 (초) - 이 시간 동안 응답 없으면 offline
    device_heartbeat_timeout: int = 30
    # 최대 동시 작업 수
    max_concurrent_tasks: int = 100
    
    # ===========================================
    # Logging
    # ===========================================
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # 정의되지 않은 환경변수 무시


@lru_cache()
def get_settings() -> Settings:
    """
    설정 싱글톤 반환
    
    @lru_cache로 한 번만 로딩하여 성능 최적화
    """
    return Settings()


# 편의를 위한 글로벌 인스턴스
settings = get_settings()


