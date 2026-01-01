#!/usr/bin/env python3
"""
Google Sheets helper library for DOAI scripts.

- Service account 기반으로 Google Sheets API v4를 사용한다.
- Videos 시트를 읽고/쓰기 위한 최소 헬퍼만 제공한다.

환경변수:
  GOOGLE_SERVICE_ACCOUNT_FILE: 서비스 계정 JSON 파일 경로

의존성:
  google-api-python-client
  google-auth

설치 예시:
  pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
"""

import os
import sys
from typing import Dict, List, Any

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.exceptions import GoogleAuthError


SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Videos 시트 컬럼 정의 (A~J)
VIDEO_COLUMNS = [
    "sheet_video_key",  # A
    "url",              # B
    "target_device_count",  # C
    "active",           # D (TRUE/FALSE)
    "supabase_video_id",    # E
    "status",           # F
    "assigned_count",   # G
    "completed_count",  # H
    "completion_rate",  # I
    "note",             # J
]


# ========== 에러 핸들링 ==========

class GoogleSheetsError(Exception):
    """Google Sheets 관련 에러 기본 클래스"""
    pass


class GoogleSheetsAuthError(GoogleSheetsError):
    """Google Sheets 인증 에러"""
    pass


class GoogleSheetsPermissionError(GoogleSheetsError):
    """Google Sheets 권한 에러"""
    pass


class GoogleSheetsNotFoundError(GoogleSheetsError):
    """Google Sheets 리소스를 찾을 수 없음"""
    pass


class GoogleSheetsAPIError(GoogleSheetsError):
    """Google Sheets API 에러"""
    pass


def _get_sheets_service():
    """
    Google Sheets API 서비스 객체 생성
    
    Returns:
        Google Sheets API 서비스
    
    Raises:
        GoogleSheetsAuthError: 인증 실패
    """
    cred_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
    if not cred_file:
        raise GoogleSheetsAuthError(
            "환경변수 GOOGLE_SERVICE_ACCOUNT_FILE 를 설정하세요.\n"
            "예시:\n"
            "  export GOOGLE_SERVICE_ACCOUNT_FILE='/path/to/service-account.json'\n"
            "\n"
            "서비스 계정 생성 방법:\n"
            "  1. Google Cloud Console → IAM & Admin → Service Accounts\n"
            "  2. Create Service Account\n"
            "  3. Keys → Add Key → Create new key (JSON)"
        )
    
    if not os.path.exists(cred_file):
        raise GoogleSheetsAuthError(
            f"서비스 계정 파일을 찾을 수 없습니다:\n"
            f"경로: {cred_file}\n"
            "해결방법:\n"
            "  1. 파일 경로가 올바른지 확인\n"
            "  2. 파일이 존재하는지 확인\n"
            "  3. 파일 읽기 권한이 있는지 확인"
        )
    
    try:
        credentials = service_account.Credentials.from_service_account_file(
            cred_file, scopes=SCOPES
        )
        service = build("sheets", "v4", credentials=credentials)
        return service
    
    except GoogleAuthError as e:
        raise GoogleSheetsAuthError(
            f"Google 인증 실패:\n"
            f"원인: {str(e)}\n"
            "해결방법:\n"
            "  1. 서비스 계정 JSON 파일이 유효한지 확인\n"
            "  2. 파일 형식이 올바른지 확인\n"
            "  3. 서비스 계정이 활성화되어 있는지 확인"
        ) from e
    
    except Exception as e:
        raise GoogleSheetsError(
            f"Google Sheets 서비스 초기화 실패:\n"
            f"{type(e).__name__}: {str(e)}"
        ) from e


def load_videos_sheet(spreadsheet_id: str, sheet_name: str = "Videos") -> List[Dict[str, Any]]:
    """
    Videos 시트의 모든 row 를 읽어서 dict 리스트로 반환.

    각 row dict 구조:
      {
        "row_number": 2,  # 시트 상 row 번호 (1-based)
        "sheet_video_key": "v001",
        "url": "https://...",
        ...
      }
    
    Args:
        spreadsheet_id: Google Sheets 스프레드시트 ID
        sheet_name: 시트 이름 (기본값: "Videos")
    
    Returns:
        시트의 각 행을 나타내는 dict 리스트
    
    Raises:
        GoogleSheetsAuthError: 인증 실패
        GoogleSheetsPermissionError: 권한 부족
        GoogleSheetsNotFoundError: 스프레드시트/시트를 찾을 수 없음
        GoogleSheetsAPIError: API 에러
    """
    try:
        service = _get_sheets_service()
        range_name = f"{sheet_name}!A2:J"  # 헤더는 1행, 데이터는 2행부터

        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=spreadsheet_id, range=range_name)
            .execute()
        )
        values = result.get("values", [])

        rows: List[Dict[str, Any]] = []
        for idx, row in enumerate(values, start=2):  # row 2부터 시작
            row_dict: Dict[str, Any] = {"row_number": idx}
            for col_idx, col_name in enumerate(VIDEO_COLUMNS):
                row_dict[col_name] = row[col_idx] if col_idx < len(row) else ""
            rows.append(row_dict)

        return rows
    
    except GoogleSheetsError:
        # 이미 처리된 에러는 그대로 전파
        raise
    
    except HttpError as e:
        if e.resp.status == 403:
            raise GoogleSheetsPermissionError(
                f"Google Sheets 접근 권한이 없습니다:\n"
                f"스프레드시트 ID: {spreadsheet_id}\n"
                "해결방법:\n"
                "  1. 스프레드시트를 서비스 계정 이메일과 공유\n"
                "  2. '편집자' 또는 '뷰어' 권한 부여\n"
                "  3. 서비스 계정 이메일 확인:\n"
                "     - service-account.json 파일의 'client_email' 필드"
            ) from e
        
        elif e.resp.status == 404:
            raise GoogleSheetsNotFoundError(
                f"스프레드시트 또는 시트를 찾을 수 없습니다:\n"
                f"스프레드시트 ID: {spreadsheet_id}\n"
                f"시트 이름: {sheet_name}\n"
                "해결방법:\n"
                "  1. 스프레드시트 ID가 올바른지 확인\n"
                "  2. 시트 이름이 정확한지 확인 (대소문자 구분)\n"
                "  3. 스프레드시트가 삭제되지 않았는지 확인"
            ) from e
        
        elif e.resp.status == 429:
            raise GoogleSheetsAPIError(
                "Google Sheets API 할당량을 초과했습니다.\n"
                "해결방법:\n"
                "  1. 잠시 후 재시도\n"
                "  2. 요청 빈도 줄이기\n"
                "  3. API 할당량 확인: Google Cloud Console → APIs & Services → Quotas"
            ) from e
        
        else:
            raise GoogleSheetsAPIError(
                f"Google Sheets API 에러 (읽기):\n"
                f"상태코드: {e.resp.status}\n"
                f"상세: {str(e)}"
            ) from e
    
    except Exception as e:
        raise GoogleSheetsError(
            f"Google Sheets 읽기 중 예상치 못한 에러:\n"
            f"{type(e).__name__}: {str(e)}"
        ) from e


def update_videos_row(
    spreadsheet_id: str,
    row_number: int,
    updates: Dict[str, Any],
    sheet_name: str = "Videos",
) -> None:
    """
    단일 row의 일부 컬럼을 업데이트한다.

    Args:
        spreadsheet_id: Google Sheets 스프레드시트 ID
        row_number: 업데이트할 행 번호 (1-based)
        updates: 업데이트할 컬럼과 값 (예: {"status": "completed"})
        sheet_name: 시트 이름 (기본값: "Videos")
    
    Raises:
        GoogleSheetsAuthError: 인증 실패
        GoogleSheetsPermissionError: 권한 부족
        GoogleSheetsNotFoundError: 스프레드시트/시트를 찾을 수 없음
        GoogleSheetsAPIError: API 에러
    """
    try:
        service = _get_sheets_service()

        # 먼저 기존 row 전체를 읽어와서 필요한 컬럼만 교체한다.
        range_name = f"{sheet_name}!A{row_number}:J{row_number}"
        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=spreadsheet_id, range=range_name)
            .execute()
        )
        values = result.get("values", [[]])
        row = values[0] if values else []

        # 길이를 10컬럼(A~J)까지 맞춘다.
        if len(row) < len(VIDEO_COLUMNS):
            row = row + [""] * (len(VIDEO_COLUMNS) - len(row))

        # 업데이트 적용
        for col_name, new_value in updates.items():
            if col_name not in VIDEO_COLUMNS:
                continue
            idx = VIDEO_COLUMNS.index(col_name)
            row[idx] = str(new_value) if new_value is not None else ""

        body = {"values": [row]}
        (
            service.spreadsheets()
            .values()
            .update(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption="USER_ENTERED",
                body=body,
            )
            .execute()
        )
    
    except GoogleSheetsError:
        # 이미 처리된 에러는 그대로 전파
        raise
    
    except HttpError as e:
        if e.resp.status == 403:
            raise GoogleSheetsPermissionError(
                f"Google Sheets 쓰기 권한이 없습니다:\n"
                f"스프레드시트 ID: {spreadsheet_id}\n"
                "해결방법:\n"
                "  1. 스프레드시트를 서비스 계정 이메일과 공유\n"
                "  2. '편집자' 권한 부여 (뷰어 권한으로는 쓰기 불가)\n"
                "  3. 서비스 계정 이메일 확인:\n"
                "     - service-account.json 파일의 'client_email' 필드"
            ) from e
        
        elif e.resp.status == 404:
            raise GoogleSheetsNotFoundError(
                f"스프레드시트 또는 시트를 찾을 수 없습니다:\n"
                f"스프레드시트 ID: {spreadsheet_id}\n"
                f"시트 이름: {sheet_name}\n"
                "해결방법:\n"
                "  1. 스프레드시트 ID가 올바른지 확인\n"
                "  2. 시트 이름이 정확한지 확인 (대소문자 구분)\n"
                "  3. 스프레드시트가 삭제되지 않았는지 확인"
            ) from e
        
        elif e.resp.status == 429:
            raise GoogleSheetsAPIError(
                "Google Sheets API 할당량을 초과했습니다.\n"
                "해결방법:\n"
                "  1. 잠시 후 재시도\n"
                "  2. 요청 빈도 줄이기\n"
                "  3. API 할당량 확인: Google Cloud Console → APIs & Services → Quotas"
            ) from e
        
        else:
            raise GoogleSheetsAPIError(
                f"Google Sheets API 에러 (쓰기):\n"
                f"상태코드: {e.resp.status}\n"
                f"상세: {str(e)}"
            ) from e
    
    except Exception as e:
        raise GoogleSheetsError(
            f"Google Sheets 쓰기 중 예상치 못한 에러:\n"
            f"{type(e).__name__}: {str(e)}"
        ) from e


# ========== 헬퍼 함수 ==========

def test_connection(spreadsheet_id: str, sheet_name: str = "Videos") -> bool:
    """
    Google Sheets 연결 테스트
    
    Args:
        spreadsheet_id: 테스트할 스프레드시트 ID
        sheet_name: 테스트할 시트 이름
    
    Returns:
        연결 성공 여부
    """
    try:
        # 간단한 읽기로 연결 테스트
        load_videos_sheet(spreadsheet_id, sheet_name)
        print("✅ Google Sheets 연결 성공")
        return True
    
    except GoogleSheetsError as e:
        print(f"❌ Google Sheets 연결 실패:\n{e}", file=sys.stderr)
        return False
