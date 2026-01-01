#!/usr/bin/env python3
"""
YouTube Google Sheets ↔ Supabase 양방향 동기화

Google Sheets 구조:
  A(no), B(date), C(time), D(keyword), E(subject), F(url),
  G(viewd), H(notworked), I(like), J(comments)

역할:
1. Google Sheets → Supabase: 입력된 영상을 youtube_videos에 저장
2. Supabase → Google Sheets: 백엔드 집계 (viewd, like 등)를 Sheets에 반영

환경변수:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  GOOGLE_SERVICE_ACCOUNT_FILE
  GOOGLE_SPREADSHEET_ID (선택, 또는 --spreadsheet-id 인자로 제공)

사용 예:
  export SUPABASE_URL="https://xxx.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="your_key"
  export GOOGLE_SERVICE_ACCOUNT_FILE="/path/to/service-account.json"
  export GOOGLE_SPREADSHEET_ID="1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk"
  
  python scripts/local/local-sync_youtube_gsheet-cli.py --mode both
"""

import os
import sys
import argparse
from typing import Dict, Any, List, Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build

# 공유 라이브러리
from scripts.shared.shared_supabase_lib import (
    supabase_get,
    supabase_post,
    SupabaseError,
    test_connection as test_supabase_connection
)

# Google Sheets 설정
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# 컬럼 정의 (Google Sheets와 동일)
SHEET_COLUMNS = {
    "no": 0,           # A
    "date": 1,         # B
    "time": 2,         # C
    "keyword": 3,      # D
    "subject": 4,      # E
    "url": 5,          # F
    "viewd": 6,        # G (백엔드)
    "notworked": 7,    # H (백엔드)
    "like": 8,         # I (백엔드)
    "comments": 9,     # J (백엔드)
}

# ========== Google Sheets 헬퍼 ==========

def get_sheets_service():
    """Google Sheets API 서비스 생성"""
    cred_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
    if not cred_file:
        raise RuntimeError(
            "환경변수 GOOGLE_SERVICE_ACCOUNT_FILE 를 설정하세요.\n"
            "예: export GOOGLE_SERVICE_ACCOUNT_FILE='/path/to/service-account.json'"
        )
    
    if not os.path.exists(cred_file):
        raise RuntimeError(f"서비스 계정 파일을 찾을 수 없습니다: {cred_file}")
    
    credentials = service_account.Credentials.from_service_account_file(
        cred_file, scopes=SCOPES
    )
    return build("sheets", "v4", credentials=credentials)


def read_sheet_videos(spreadsheet_id: str, sheet_name: str = "Sheet1") -> List[Dict[str, Any]]:
    """
    Google Sheets에서 영상 목록 읽기
    
    Returns:
        [{"row_number": 2, "no": 1, "date": "2026.01.01", ...}]
    """
    service = get_sheets_service()
    range_name = f"{sheet_name}!A2:J"  # 헤더 제외, 2행부터
    
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=range_name
    ).execute()
    
    values = result.get("values", [])
    rows = []
    
    for idx, row in enumerate(values, start=2):
        # 빈 행 스킵
        if not row or len(row) == 0:
            continue
        
        # no 컬럼이 비어있으면 스킵 (아직 작성 중)
        if len(row) <= SHEET_COLUMNS["no"] or not str(row[SHEET_COLUMNS["no"]]).strip():
            continue
        
        row_dict = {"row_number": idx}
        
        # 각 컬럼 파싱
        row_dict["no"] = int(row[SHEET_COLUMNS["no"]]) if len(row) > SHEET_COLUMNS["no"] else None
        row_dict["date"] = row[SHEET_COLUMNS["date"]] if len(row) > SHEET_COLUMNS["date"] else ""
        row_dict["time"] = row[SHEET_COLUMNS["time"]] if len(row) > SHEET_COLUMNS["time"] else ""
        row_dict["keyword"] = row[SHEET_COLUMNS["keyword"]] if len(row) > SHEET_COLUMNS["keyword"] else ""
        row_dict["subject"] = row[SHEET_COLUMNS["subject"]] if len(row) > SHEET_COLUMNS["subject"] else ""
        row_dict["url"] = row[SHEET_COLUMNS["url"]] if len(row) > SHEET_COLUMNS["url"] else ""
        
        rows.append(row_dict)
    
    return rows


def write_sheet_stats(
    spreadsheet_id: str,
    row_number: int,
    viewd: int,
    notworked: int,
    like_count: int,
    comment_count: int,
    sheet_name: str = "Sheet1"
) -> None:
    """
    Google Sheets G~J 컬럼에 집계 데이터 쓰기
    """
    service = get_sheets_service()
    range_name = f"{sheet_name}!G{row_number}:J{row_number}"
    
    body = {
        "values": [[viewd, notworked, like_count, comment_count]]
    }
    
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range_name,
        valueInputOption="USER_ENTERED",
        body=body
    ).execute()


# ========== Supabase 동기화 ==========

def sync_sheet_to_supabase(spreadsheet_id: str, sheet_name: str = "Sheet1") -> int:
    """
    Google Sheets → Supabase 동기화 (입력 부분)
    
    Returns:
        동기화된 영상 수
    """
    print("\n=== Google Sheets → Supabase 동기화 ===")
    
    # Sheets 읽기
    print(f"📄 Google Sheets 읽기 중... (ID: {spreadsheet_id})")
    sheet_rows = read_sheet_videos(spreadsheet_id, sheet_name)
    print(f"✅ {len(sheet_rows)}개 행 읽기 완료")
    
    if not sheet_rows:
        print("⚠️  동기화할 데이터가 없습니다")
        return 0
    
    synced_count = 0
    
    for row in sheet_rows:
        # 필수 필드 검증
        if not row.get("subject") or not row.get("url"):
            print(f"⏭️  행 {row['row_number']}: 제목 또는 URL 없음, 스킵")
            continue
        
        try:
            # date 파싱 (2026.01.01 → 2026-01-01)
            date_str = str(row.get("date", "")).strip()
            if date_str:
                date_str = date_str.replace(".", "-")
            
            # time 파싱
            time_str = str(row.get("time", "")).strip()
            time_val = int(time_str) if time_str.isdigit() else None
            
            # Supabase RPC 호출
            result = supabase_get(
                "rpc/sync_youtube_video_from_sheet",
                {
                    "p_no": row["no"],
                    "p_date": date_str or None,
                    "p_time": time_val,
                    "p_keyword": row.get("keyword", ""),
                    "p_subject": row["subject"],
                    "p_url": row["url"],
                    "p_sheet_row_number": row["row_number"],
                }
            )
            
            synced_count += 1
            print(f"✅ 행 {row['row_number']}: No.{row['no']} - {row['subject'][:50]}")
        
        except SupabaseError as e:
            print(f"❌ 행 {row['row_number']}: Supabase 에러 - {e}")
        except Exception as e:
            print(f"❌ 행 {row['row_number']}: {type(e).__name__} - {e}")
    
    print(f"\n📊 동기화 완료: {synced_count}/{len(sheet_rows)}개")
    return synced_count


def sync_supabase_to_sheet(spreadsheet_id: str, sheet_name: str = "Sheet1") -> int:
    """
    Supabase → Google Sheets 동기화 (집계 부분)
    
    Returns:
        업데이트된 행 수
    """
    print("\n=== Supabase → Google Sheets 동기화 ===")
    
    # Supabase에서 집계 데이터 조회
    print("📊 Supabase 집계 데이터 조회 중...")
    videos = supabase_get(
        "youtube_video_stats",
        {"select": "no,viewd,notworked,like_count,comment_count,sheet_row_number"}
    )
    print(f"✅ {len(videos)}개 영상 조회 완료")
    
    if not videos:
        print("⚠️  업데이트할 데이터가 없습니다")
        return 0
    
    updated_count = 0
    
    for video in videos:
        # sheet_row_number가 없으면 스킵
        if not video.get("sheet_row_number"):
            continue
        
        try:
            write_sheet_stats(
                spreadsheet_id=spreadsheet_id,
                row_number=video["sheet_row_number"],
                viewd=video.get("viewd", 0),
                notworked=video.get("notworked", 600),
                like_count=video.get("like_count", 0),
                comment_count=video.get("comment_count", 0),
                sheet_name=sheet_name
            )
            
            updated_count += 1
            print(f"✅ 행 {video['sheet_row_number']}: No.{video['no']} - 시청 {video['viewd']}, 좋아요 {video['like_count']}")
        
        except Exception as e:
            print(f"❌ 행 {video['sheet_row_number']}: {type(e).__name__} - {e}")
    
    print(f"\n📊 업데이트 완료: {updated_count}/{len(videos)}개")
    return updated_count


# ========== 메인 ==========

def main() -> None:
    parser = argparse.ArgumentParser(description="YouTube Google Sheets ↔ Supabase 동기화")
    parser.add_argument(
        "--spreadsheet-id",
        default=os.getenv("GOOGLE_SPREADSHEET_ID"),
        help="Google Sheets 스프레드시트 ID"
    )
    parser.add_argument(
        "--sheet-name",
        default="Sheet1",
        help="시트 이름 (기본: Sheet1)"
    )
    parser.add_argument(
        "--mode",
        choices=["to-supabase", "to-sheet", "both"],
        default="both",
        help="동기화 방향 (기본: both)"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="연결 테스트만 실행"
    )
    
    args = parser.parse_args()
    
    if not args.spreadsheet_id:
        print("❌ 스프레드시트 ID를 지정하세요:")
        print("  1. --spreadsheet-id 인자 사용")
        print("  2. GOOGLE_SPREADSHEET_ID 환경변수 설정")
        sys.exit(1)
    
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  YouTube Google Sheets ↔ Supabase 동기화 도구           ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"\n📋 스프레드시트 ID: {args.spreadsheet_id}")
    print(f"📄 시트 이름: {args.sheet_name}")
    print(f"🔄 동기화 모드: {args.mode}")
    
    # 연결 테스트
    if args.test:
        print("\n=== 연결 테스트 ===")
        
        print("\n1️⃣  Supabase 연결...")
        supabase_ok = test_supabase_connection()
        
        print("\n2️⃣  Google Sheets 연결...")
        try:
            service = get_sheets_service()
            result = service.spreadsheets().get(
                spreadsheetId=args.spreadsheet_id
            ).execute()
            print(f"✅ Google Sheets 연결 성공: {result.get('properties', {}).get('title')}")
            gsheet_ok = True
        except Exception as e:
            print(f"❌ Google Sheets 연결 실패: {e}")
            gsheet_ok = False
        
        if supabase_ok and gsheet_ok:
            print("\n✅ 모든 연결 테스트 통과!")
            sys.exit(0)
        else:
            print("\n❌ 연결 테스트 실패")
            sys.exit(1)
    
    # 동기화 실행
    try:
        if args.mode in ["to-supabase", "both"]:
            sync_sheet_to_supabase(args.spreadsheet_id, args.sheet_name)
        
        if args.mode in ["to-sheet", "both"]:
            sync_supabase_to_sheet(args.spreadsheet_id, args.sheet_name)
        
        print("\n✅ 동기화 완료!")
    
    except Exception as e:
        print(f"\n❌ 동기화 실패: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
