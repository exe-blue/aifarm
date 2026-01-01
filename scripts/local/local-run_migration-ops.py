#!/usr/bin/env python3
"""
Supabase 마이그레이션 실행 스크립트

역할:
- supabase/migrations/ 폴더의 SQL 파일을 Supabase에 실행
- REST API를 통해 SQL 실행 (psql 불필요)

환경변수:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

사용 예:
  python scripts/local/local-run_migration-ops.py --file 007_youtube_videos.sql
  python scripts/local/local-run_migration-ops.py --all
"""

import os
import sys
import argparse
from pathlib import Path
import requests

SUPABASE_URL = "https://hycynmzdrngsozxdmyxi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw"

def execute_sql(sql: str) -> dict:
    """
    Supabase에서 SQL 실행 (PostgREST를 통해)
    
    주의: 복잡한 SQL은 Dashboard SQL Editor 사용 권장
    """
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {"query": sql}
    
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    return {
        "status_code": resp.status_code,
        "response": resp.text
    }


def main():
    parser = argparse.ArgumentParser(description="Supabase 마이그레이션 실행")
    parser.add_argument("--file", help="실행할 SQL 파일명 (예: 007_youtube_videos.sql)")
    parser.add_argument("--all", action="store_true", help="모든 마이그레이션 실행")
    
    args = parser.parse_args()
    
    print("╔════════════════════════════════════════════════╗")
    print("║  Supabase 마이그레이션 실행                    ║")
    print("╚════════════════════════════════════════════════╝")
    print(f"\n📍 URL: {SUPABASE_URL}\n")
    
    migrations_dir = Path("supabase/migrations")
    
    if not migrations_dir.exists():
        print(f"❌ 마이그레이션 폴더를 찾을 수 없습니다: {migrations_dir}")
        sys.exit(1)
    
    # 실행할 파일 목록
    files_to_run = []
    
    if args.all:
        files_to_run = sorted(migrations_dir.glob("*.sql"))
    elif args.file:
        file_path = migrations_dir / args.file
        if file_path.exists():
            files_to_run = [file_path]
        else:
            print(f"❌ 파일을 찾을 수 없습니다: {file_path}")
            sys.exit(1)
    else:
        print("❌ --file 또는 --all 옵션을 지정하세요")
        sys.exit(1)
    
    print(f"📁 실행할 파일: {len(files_to_run)}개\n")
    
    print("=" * 60)
    print("⚠️  주의사항")
    print("=" * 60)
    print("Supabase REST API로 복잡한 SQL을 실행하는 것은 제한이 있습니다.")
    print("권장 방법:")
    print("  1. Supabase Dashboard → SQL Editor")
    print("  2. 마이그레이션 파일 내용을 복사하여 실행")
    print("  3. 또는 psql 직접 연결")
    print()
    print(f"Supabase Dashboard: https://supabase.com/dashboard/project/hycynmzdrngsozxdmyxi")
    print("=" * 60)
    print()
    
    for sql_file in files_to_run:
        print(f"📄 {sql_file.name}")
        print(f"   경로: {sql_file}")
        print(f"   크기: {sql_file.stat().st_size} bytes")
        print()
    
    print("\n💡 다음 단계:")
    print("1. Supabase Dashboard 접속")
    print("   → https://supabase.com/dashboard/project/hycynmzdrngsozxdmyxi")
    print()
    print("2. SQL Editor 열기")
    print()
    print("3. 마이그레이션 파일 실행 (순서대로)")
    for sql_file in files_to_run:
        print(f"   → {sql_file.name}")
    print()
    print("4. 테스트 스크립트 재실행")
    print("   → python scripts/local/local-run_migration-ops.py --test")

if __name__ == "__main__":
    main()
