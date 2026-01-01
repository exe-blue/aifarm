#!/usr/bin/env python3
"""
Supabase REST API helper library for DOAI scripts.

- Service Role Key 기반으로 Supabase REST API v1을 사용
- GET/POST/PATCH/DELETE 메서드 제공
- 연결 실패, 타임아웃, 권한 문제 등 에러 핸들링 포함

환경변수:
  SUPABASE_URL: Supabase 프로젝트 URL (예: https://xxx.supabase.co)
  SUPABASE_SERVICE_ROLE_KEY: Service Role Key (관리자 권한)

의존성:
  requests

사용 예시:
  from scripts.shared.shared_supabase_lib import supabase_get, supabase_post
  
  # 조회
  videos = supabase_get("videos", {"status": "eq.pending"})
  
  # 생성
  new_videos = supabase_post("videos", [{"url": "...", "status": "pending"}])
"""

import os
import sys
from typing import Dict, List, Any, Optional

import requests
from requests.exceptions import (
    ConnectionError,
    Timeout,
    HTTPError,
    RequestException
)


# ========== 설정 ==========

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.\n"
        "예시:\n"
        "  export SUPABASE_URL='https://xxx.supabase.co'\n"
        "  export SUPABASE_SERVICE_ROLE_KEY='your_service_role_key'"
    )

REST_URL = f"{SUPABASE_URL}/rest/v1"

# 타임아웃 설정 (초)
DEFAULT_TIMEOUT = 30


# ========== 에러 핸들링 ==========

class SupabaseError(Exception):
    """Supabase 관련 에러 기본 클래스"""
    pass


class SupabaseConnectionError(SupabaseError):
    """Supabase 연결 실패"""
    pass


class SupabaseTimeoutError(SupabaseError):
    """Supabase 요청 타임아웃"""
    pass


class SupabaseAuthError(SupabaseError):
    """Supabase 인증/권한 에러"""
    pass


class SupabaseAPIError(SupabaseError):
    """Supabase API 에러 (4xx, 5xx)"""
    pass


def _handle_request_error(e: Exception, operation: str) -> None:
    """
    requests 예외를 Supabase 커스텀 예외로 변환
    
    Args:
        e: requests 예외
        operation: 작업 설명 (로깅용)
    """
    if isinstance(e, ConnectionError):
        raise SupabaseConnectionError(
            f"Supabase 연결 실패 ({operation}):\n"
            f"URL: {SUPABASE_URL}\n"
            f"원인: {str(e)}\n"
            "해결방법:\n"
            "  1. 네트워크 연결 확인\n"
            "  2. SUPABASE_URL이 올바른지 확인\n"
            "  3. 방화벽/프록시 설정 확인"
        ) from e
    
    elif isinstance(e, Timeout):
        raise SupabaseTimeoutError(
            f"Supabase 요청 타임아웃 ({operation}):\n"
            f"제한시간: {DEFAULT_TIMEOUT}초\n"
            "해결방법:\n"
            "  1. 네트워크 상태 확인\n"
            "  2. 쿼리 최적화 (select, limit 사용)\n"
            "  3. Supabase 서비스 상태 확인"
        ) from e
    
    elif isinstance(e, HTTPError):
        status_code = e.response.status_code if e.response else 0
        
        if status_code == 401:
            raise SupabaseAuthError(
                f"Supabase 인증 실패 ({operation}):\n"
                "원인: API Key가 유효하지 않거나 만료됨\n"
                "해결방법:\n"
                "  1. SUPABASE_SERVICE_ROLE_KEY 확인\n"
                "  2. Supabase Dashboard에서 Service Role Key 재발급"
            ) from e
        
        elif status_code == 403:
            raise SupabaseAuthError(
                f"Supabase 권한 부족 ({operation}):\n"
                "원인: 해당 작업에 대한 권한이 없음\n"
                "해결방법:\n"
                "  1. RLS(Row Level Security) 정책 확인\n"
                "  2. Service Role Key 사용 여부 확인\n"
                "  3. 테이블/함수 권한 확인"
            ) from e
        
        elif 400 <= status_code < 500:
            error_detail = ""
            try:
                error_detail = e.response.json()
            except:
                error_detail = e.response.text
            
            raise SupabaseAPIError(
                f"Supabase API 클라이언트 에러 ({operation}):\n"
                f"상태코드: {status_code}\n"
                f"상세: {error_detail}\n"
                "해결방법:\n"
                "  1. 요청 파라미터 확인\n"
                "  2. 테이블/컬럼명 확인\n"
                "  3. 데이터 형식 확인"
            ) from e
        
        else:
            raise SupabaseAPIError(
                f"Supabase 서버 에러 ({operation}):\n"
                f"상태코드: {status_code}\n"
                "해결방법:\n"
                "  1. 잠시 후 재시도\n"
                "  2. Supabase 서비스 상태 확인\n"
                "  3. 지속되면 Supabase 지원팀 문의"
            ) from e
    
    else:
        raise SupabaseError(
            f"Supabase 요청 중 예상치 못한 에러 ({operation}):\n"
            f"{type(e).__name__}: {str(e)}"
        ) from e


# ========== API 메서드 ==========

def supabase_get(
    table: str,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = DEFAULT_TIMEOUT
) -> List[Dict[str, Any]]:
    """
    Supabase 테이블에서 데이터 조회 (GET)
    
    Args:
        table: 테이블명
        params: 쿼리 파라미터 (예: {"status": "eq.pending", "select": "*"})
        timeout: 타임아웃 (초)
    
    Returns:
        조회된 행들의 리스트
    
    Raises:
        SupabaseConnectionError: 연결 실패
        SupabaseTimeoutError: 타임아웃
        SupabaseAuthError: 인증/권한 에러
        SupabaseAPIError: API 에러
    
    사용 예시:
        videos = supabase_get("videos", {"status": "eq.pending", "limit": "10"})
    """
    url = f"{REST_URL}/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    
    try:
        resp = requests.get(
            url,
            headers=headers,
            params=params or {},
            timeout=timeout
        )
        resp.raise_for_status()
        return resp.json()
    
    except RequestException as e:
        _handle_request_error(e, f"GET {table}")


def supabase_post(
    table: str,
    rows: List[Dict[str, Any]],
    prefer: str = "return=representation",
    timeout: int = DEFAULT_TIMEOUT
) -> List[Dict[str, Any]]:
    """
    Supabase 테이블에 데이터 생성 (POST)
    
    Args:
        table: 테이블명
        rows: 생성할 행들의 리스트
        prefer: 응답 형식 ("return=representation" 또는 "return=minimal")
        timeout: 타임아웃 (초)
    
    Returns:
        생성된 행들의 리스트 (prefer="return=representation"일 때)
        빈 리스트 (prefer="return=minimal"일 때)
    
    Raises:
        SupabaseConnectionError: 연결 실패
        SupabaseTimeoutError: 타임아웃
        SupabaseAuthError: 인증/권한 에러
        SupabaseAPIError: API 에러
    
    사용 예시:
        new_videos = supabase_post("videos", [{"url": "...", "status": "pending"}])
    """
    url = f"{REST_URL}/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }
    
    try:
        resp = requests.post(
            url,
            headers=headers,
            json=rows,
            timeout=timeout
        )
        resp.raise_for_status()
        
        if prefer == "return=minimal":
            return []
        return resp.json()
    
    except RequestException as e:
        _handle_request_error(e, f"POST {table}")


def supabase_patch(
    table: str,
    filters: Dict[str, str],
    data: Dict[str, Any],
    prefer: str = "return=representation",
    timeout: int = DEFAULT_TIMEOUT
) -> List[Dict[str, Any]]:
    """
    Supabase 테이블의 데이터 업데이트 (PATCH)
    
    Args:
        table: 테이블명
        filters: 필터 조건 (예: {"id": "eq.uuid-value"})
        data: 업데이트할 데이터
        prefer: 응답 형식
        timeout: 타임아웃 (초)
    
    Returns:
        업데이트된 행들의 리스트
    
    Raises:
        SupabaseConnectionError: 연결 실패
        SupabaseTimeoutError: 타임아웃
        SupabaseAuthError: 인증/권한 에러
        SupabaseAPIError: API 에러
    
    사용 예시:
        updated = supabase_patch(
            "videos",
            {"id": "eq.uuid-value"},
            {"status": "completed"}
        )
    """
    url = f"{REST_URL}/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }
    
    try:
        resp = requests.patch(
            url,
            headers=headers,
            params=filters,
            json=data,
            timeout=timeout
        )
        resp.raise_for_status()
        
        if prefer == "return=minimal":
            return []
        return resp.json()
    
    except RequestException as e:
        _handle_request_error(e, f"PATCH {table}")


def supabase_delete(
    table: str,
    filters: Dict[str, str],
    timeout: int = DEFAULT_TIMEOUT
) -> None:
    """
    Supabase 테이블에서 데이터 삭제 (DELETE)
    
    Args:
        table: 테이블명
        filters: 필터 조건 (예: {"id": "eq.uuid-value"})
        timeout: 타임아웃 (초)
    
    Raises:
        SupabaseConnectionError: 연결 실패
        SupabaseTimeoutError: 타임아웃
        SupabaseAuthError: 인증/권한 에러
        SupabaseAPIError: API 에러
    
    사용 예시:
        supabase_delete("video_assignments", {"status": "eq.cancelled"})
    """
    url = f"{REST_URL}/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    
    try:
        resp = requests.delete(
            url,
            headers=headers,
            params=filters,
            timeout=timeout
        )
        resp.raise_for_status()
    
    except RequestException as e:
        _handle_request_error(e, f"DELETE {table}")


# ========== 헬퍼 함수 ==========

def test_connection() -> bool:
    """
    Supabase 연결 테스트
    
    Returns:
        연결 성공 여부
    """
    try:
        # 간단한 쿼리로 연결 테스트
        supabase_get("videos", {"limit": "1"})
        print("✅ Supabase 연결 성공")
        return True
    
    except SupabaseError as e:
        print(f"❌ Supabase 연결 실패:\n{e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    # 연결 테스트 실행
    print("Supabase 연결 테스트 중...")
    print(f"URL: {SUPABASE_URL}")
    test_connection()
