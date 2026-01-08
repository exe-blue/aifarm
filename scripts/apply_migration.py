"""
DB Migration Script

YouTube Automation System Migration (002_youtube_automation.sql)

Usage:
    python scripts/apply_migration.py
"""

import os
import sys
import io
from pathlib import Path

# UTF-8 출력 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 프로젝트 루트를 PYTHONPATH에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

# .env 로드
load_dotenv(project_root / ".env")

from supabase import create_client

def get_supabase_client():
    """Supabase 클라이언트 생성"""
    url = os.getenv("SUPABASE_URL")
    # Service Role Key 우선, 없으면 일반 Key
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY required")
    
    return create_client(url, key)

def apply_migration():
    """마이그레이션 적용"""
    print("=" * 60)
    print("[Migration] YouTube Automation DB Migration")
    print("=" * 60)
    
    # SQL 파일 읽기
    migration_file = project_root / "shared" / "database" / "migrations" / "002_youtube_automation.sql"
    
    if not migration_file.exists():
        print(f"[ERROR] Migration file not found: {migration_file}")
        return False
    
    print(f"[INFO] Migration file: {migration_file}")
    
    sql_content = migration_file.read_text(encoding="utf-8")
    
    # SQL을 개별 문장으로 분리
    statements = []
    current_statement = []
    in_function = False
    
    for line in sql_content.split('\n'):
        stripped = line.strip()
        
        # 주석이나 빈 줄 스킵
        if stripped.startswith('--') or not stripped:
            continue
        
        # 함수 정의 시작/끝 감지
        if 'CREATE OR REPLACE FUNCTION' in line.upper() or 'CREATE FUNCTION' in line.upper():
            in_function = True
        
        current_statement.append(line)
        
        # 함수 끝 ($$로 끝나는 라인)
        if in_function and stripped.endswith('$$;'):
            statements.append('\n'.join(current_statement))
            current_statement = []
            in_function = False
        # LANGUAGE로 끝나는 함수
        elif in_function and 'LANGUAGE' in stripped.upper() and stripped.endswith(';'):
            statements.append('\n'.join(current_statement))
            current_statement = []
            in_function = False
        # 일반 문장 끝
        elif not in_function and stripped.endswith(';'):
            statements.append('\n'.join(current_statement))
            current_statement = []
    
    # 남은 문장 처리
    if current_statement:
        statements.append('\n'.join(current_statement))
    
    print(f"[INFO] Found {len(statements)} SQL statements")
    print()
    
    # Supabase 클라이언트
    try:
        client = get_supabase_client()
        print("[OK] Supabase connected")
    except Exception as e:
        print(f"[ERROR] Supabase connection failed: {e}")
        return False
    
    # 주요 테이블 생성 확인 (기본 테스트)
    tables_to_check = ['video_queue', 'comment_pool', 'execution_logs', 'ai_search_logs', 'error_codes']
    
    print()
    print("[CHECK] Table status:")
    
    tables_exist = 0
    tables_missing = 0
    
    for table in tables_to_check:
        try:
            result = client.table(table).select("*", count="exact").limit(1).execute()
            count = result.count if result.count is not None else 0
            print(f"  [OK] {table}: {count} records")
            tables_exist += 1
        except Exception as e:
            error_str = str(e)
            if "does not exist" in error_str or "42P01" in error_str:
                print(f"  [MISSING] {table}: Table does not exist")
                tables_missing += 1
            else:
                print(f"  [ERROR] {table}: {e}")
    
    print()
    print("=" * 60)
    
    if tables_missing > 0:
        print(f"[INFO] {tables_missing} tables need to be created.")
        print("[INFO] Run the migration SQL in Supabase Dashboard:")
        print(f"   1. Go to Supabase Dashboard")
        print(f"   2. Select SQL Editor")
        print(f"   3. Copy and run: {migration_file.name}")
    else:
        print(f"[OK] All {tables_exist} tables exist!")
    
    print("=" * 60)
    
    return tables_missing == 0

if __name__ == "__main__":
    try:
        success = apply_migration()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
