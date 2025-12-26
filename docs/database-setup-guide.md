# 데이터베이스 구축 가이드

## 📋 개요

YouTube 자동화 시스템의 PostgreSQL 데이터베이스 구축 및 설정 가이드입니다.

---

## 🐘 1. PostgreSQL 설치

### Option A: Docker 사용 (권장)

```bash
# 프로젝트 루트에서 실행
cd D:\exe.blue\ai-fram

# Docker Compose로 PostgreSQL + Redis 실행
docker-compose up -d postgres redis

# 상태 확인
docker-compose ps
```

### Option B: 로컬 설치 (Windows)

1. [PostgreSQL 공식 사이트](https://www.postgresql.org/download/windows/)에서 다운로드
2. 설치 시 비밀번호 설정 기억
3. pgAdmin 4 함께 설치 권장

```powershell
# 환경변수 설정 확인
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"

# PostgreSQL 버전 확인
psql --version
```

---

## 🗄️ 2. 데이터베이스 생성

### 데이터베이스 및 사용자 생성

```sql
-- PostgreSQL에 접속 (postgres 사용자로)
psql -U postgres

-- 데이터베이스 생성
CREATE DATABASE youtube_automation;

-- 전용 사용자 생성 (선택사항)
CREATE USER ytauto WITH PASSWORD 'your_secure_password_here';

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE youtube_automation TO ytauto;

-- 접속 종료
\q
```

---

## 📝 3. 스키마 초기화

### init.sql 실행

```bash
# Windows PowerShell
psql -U postgres -d youtube_automation -f "D:\exe.blue\ai-fram\shared\database\init.sql"

# 또는 전용 사용자로
psql -U ytauto -d youtube_automation -f "D:\exe.blue\ai-fram\shared\database\init.sql"
```

### 초기화 확인

```sql
-- 데이터베이스 접속
psql -U postgres -d youtube_automation

-- 테이블 목록 확인
\dt

-- 예상 결과:
--              List of relations
--  Schema |     Name      | Type  |  Owner
-- --------+---------------+-------+----------
--  public | devices       | table | postgres
--  public | pattern_logs  | table | postgres
--  public | results       | table | postgres
--  public | tasks         | table | postgres
--  public | videos        | table | postgres

-- 인덱스 확인
\di

-- 뷰 확인
\dv

-- 예상 결과:
--              List of relations
--  Schema |     Name     | Type |  Owner
-- --------+--------------+------+----------
--  public | daily_stats  | view | postgres
--  public | video_stats  | view | postgres
```

---

## 🔧 4. 환경 변수 설정

### .env 파일 생성

```bash
# 프로젝트 루트에 .env 파일 생성
cd D:\exe.blue\ai-fram
copy .env.example .env
```

### .env 내용

```env
# ===========================================
# 데이터베이스 설정
# ===========================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_automation
DB_USER=postgres
DB_PASSWORD=your_secure_password_here

# 연결 URL (SQLAlchemy 형식)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/youtube_automation

# ===========================================
# Redis 설정
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Redis URL
REDIS_URL=redis://localhost:6379/0

# ===========================================
# API 설정
# ===========================================
# 쉼표로 구분된 API 키 목록
API_KEYS=dev-key-123,admin-key-456

# JWT 시크릿 (선택사항)
JWT_SECRET=your_jwt_secret_key_here

# ===========================================
# 서비스 URL (Docker 내부/외부)
# ===========================================
# 로컬 개발용
API_GATEWAY_URL=http://localhost:8000
VIDEO_SERVICE_URL=http://localhost:8001
DEVICE_SERVICE_URL=http://localhost:8002
TASK_SERVICE_URL=http://localhost:8003
PATTERN_SERVICE_URL=http://localhost:8004
RESULT_SERVICE_URL=http://localhost:8005

# Docker 내부용 (docker-compose에서 사용)
# VIDEO_SERVICE_URL=http://video-service:8001
# DEVICE_SERVICE_URL=http://device-service:8002
# ...

# ===========================================
# 프론트엔드 설정
# ===========================================
VITE_API_URL=http://localhost:8000/api

# ===========================================
# 기타 설정
# ===========================================
# 로그 레벨: DEBUG, INFO, WARNING, ERROR
LOG_LEVEL=INFO

# 환경: development, production
ENVIRONMENT=development

# 시간대
TZ=Asia/Seoul
```

---

## 🧪 5. 테스트 데이터 삽입

### 테스트 데이터 SQL

```sql
-- youtube_automation 데이터베이스에 접속
psql -U postgres -d youtube_automation

-- =============================================
-- 테스트 영상 데이터
-- =============================================
INSERT INTO videos (url, title, keyword, duration, priority, status) VALUES
('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Never Gonna Give You Up', '음악', 213, 5, 'pending'),
('https://www.youtube.com/watch?v=9bZkp7q19f0', 'Gangnam Style', 'K-POP', 253, 8, 'pending'),
('https://www.youtube.com/watch?v=kJQP7kiw5Fk', 'Despacito', '음악', 282, 7, 'processing'),
('https://www.youtube.com/watch?v=JGwWNGJdvx8', 'Shape of You', '팝송', 263, 6, 'completed'),
('https://www.youtube.com/watch?v=RgKAFK5djSk', 'See You Again', '영화OST', 237, 4, 'completed');

-- 영상 완료 카운트 업데이트
UPDATE videos SET completed_count = 150 WHERE title = 'Shape of You';
UPDATE videos SET completed_count = 89 WHERE title = 'See You Again';

-- =============================================
-- 테스트 기기 데이터
-- =============================================
INSERT INTO devices (serial_number, pc_id, model, status, battery_level, battery_temp, cpu_usage, memory_usage, total_tasks, success_tasks, error_tasks) VALUES
('RF8M33XYZAB', 'PC-001', 'Samsung Galaxy S21', 'idle', 85, 32.5, 15.2, 45.0, 1250, 1180, 70),
('9A231FFAZ00123', 'PC-001', 'Google Pixel 6', 'busy', 72, 38.2, 65.8, 72.3, 980, 920, 60),
('LGE-LM-G900N', 'PC-001', 'LG Velvet', 'idle', 91, 29.0, 8.5, 38.0, 750, 720, 30),
('XIAOMI12PRO001', 'PC-002', 'Xiaomi 12 Pro', 'offline', 45, 25.0, 0.0, 0.0, 500, 480, 20),
('OP9PRO-ABC123', 'PC-002', 'OnePlus 9 Pro', 'busy', 68, 41.5, 78.2, 80.1, 890, 845, 45),
('SAMSUNG-A52-001', 'PC-002', 'Samsung Galaxy A52', 'error', 15, 55.2, 95.0, 92.0, 320, 280, 40),
('PIXEL5A-XYZ789', 'PC-003', 'Google Pixel 5a', 'idle', 95, 28.0, 5.0, 25.0, 600, 590, 10),
('NOTE20-ULTRA-01', 'PC-003', 'Samsung Galaxy Note 20 Ultra', 'overheat', 55, 62.0, 85.0, 88.0, 1100, 1020, 80);

-- 하트비트 업데이트
UPDATE devices SET last_heartbeat = CURRENT_TIMESTAMP WHERE status != 'offline';

-- =============================================
-- 테스트 작업 데이터
-- =============================================
-- video_id와 device_id를 가져와서 작업 생성
DO $$
DECLARE
    v_id UUID;
    d_id UUID;
BEGIN
    -- 첫 번째 영상 + 첫 번째 기기로 작업 생성
    SELECT id INTO v_id FROM videos WHERE title = 'Never Gonna Give You Up';
    SELECT id INTO d_id FROM devices WHERE model = 'Samsung Galaxy S21';
    
    INSERT INTO tasks (video_id, device_id, status, priority) VALUES
    (v_id, d_id, 'completed', 5),
    (v_id, NULL, 'queued', 5);
    
    -- 두 번째 영상 + 두 번째 기기
    SELECT id INTO v_id FROM videos WHERE title = 'Gangnam Style';
    SELECT id INTO d_id FROM devices WHERE model = 'Google Pixel 6';
    
    INSERT INTO tasks (video_id, device_id, status, priority, started_at) VALUES
    (v_id, d_id, 'running', 8, CURRENT_TIMESTAMP);
    
    -- 더 많은 대기 작업
    SELECT id INTO v_id FROM videos WHERE title = 'Despacito';
    INSERT INTO tasks (video_id, status, priority) VALUES
    (v_id, 'queued', 7),
    (v_id, 'queued', 7),
    (v_id, 'queued', 7);
    
END $$;

-- =============================================
-- 테스트 결과 데이터
-- =============================================
DO $$
DECLARE
    t_id UUID;
    d_id UUID;
    v_id UUID;
BEGIN
    -- 완료된 작업의 결과 생성
    SELECT t.id, t.device_id, t.video_id INTO t_id, d_id, v_id 
    FROM tasks t WHERE t.status = 'completed' LIMIT 1;
    
    IF t_id IS NOT NULL THEN
        INSERT INTO results (task_id, device_id, video_id, watch_time, total_duration, liked, commented, comment_text, search_type, search_rank)
        VALUES 
        (t_id, d_id, v_id, 180, 213, true, false, NULL, 1, 3),
        (t_id, d_id, v_id, 150, 213, true, true, '좋은 영상이네요!', 2, 1),
        (t_id, d_id, v_id, 90, 213, false, false, NULL, 1, 5);
    END IF;
END $$;

-- =============================================
-- 데이터 확인
-- =============================================
SELECT 'videos' as table_name, COUNT(*) as count FROM videos
UNION ALL
SELECT 'devices', COUNT(*) FROM devices
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'results', COUNT(*) FROM results;

-- 일별 통계 뷰 확인
SELECT * FROM daily_stats;

-- 영상별 통계 뷰 확인
SELECT * FROM video_stats;
```

### 테스트 데이터 실행

```bash
# 파일로 저장 후 실행
psql -U postgres -d youtube_automation -f test_data.sql

# 또는 직접 복사하여 psql에서 실행
```

---

## 🔍 6. 데이터베이스 연결 테스트

### Python 연결 테스트

```python
# test_db_connection.py
import asyncio
import asyncpg

async def test_connection():
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='your_password',
        database='youtube_automation'
    )
    
    # 버전 확인
    version = await conn.fetchval('SELECT version()')
    print(f"PostgreSQL 버전: {version}")
    
    # 테이블 카운트
    tables = await conn.fetch("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    print(f"테이블 수: {len(tables)}")
    
    for table in tables:
        count = await conn.fetchval(f"SELECT COUNT(*) FROM {table['table_name']}")
        print(f"  - {table['table_name']}: {count}개")
    
    await conn.close()
    print("✅ 데이터베이스 연결 성공!")

asyncio.run(test_connection())
```

### 실행

```bash
cd D:\exe.blue\ai-fram
pip install asyncpg
python test_db_connection.py
```

---

## 📊 7. 유용한 쿼리

### 시스템 현황 조회

```sql
-- 전체 현황 요약
SELECT 
    (SELECT COUNT(*) FROM videos) as total_videos,
    (SELECT COUNT(*) FROM videos WHERE status = 'pending') as pending_videos,
    (SELECT COUNT(*) FROM devices) as total_devices,
    (SELECT COUNT(*) FROM devices WHERE status = 'idle') as idle_devices,
    (SELECT COUNT(*) FROM tasks WHERE status = 'queued') as queued_tasks,
    (SELECT COUNT(*) FROM results) as total_results;

-- 기기별 성공률
SELECT 
    d.model,
    d.serial_number,
    d.total_tasks,
    d.success_tasks,
    ROUND((d.success_tasks::numeric / NULLIF(d.total_tasks, 0)) * 100, 2) as success_rate
FROM devices d
ORDER BY success_rate DESC;

-- 최근 7일 일별 통계
SELECT * FROM daily_stats 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- 영상별 인터랙션 통계
SELECT 
    v.title,
    COUNT(r.id) as view_count,
    SUM(CASE WHEN r.liked THEN 1 ELSE 0 END) as likes,
    SUM(CASE WHEN r.commented THEN 1 ELSE 0 END) as comments,
    ROUND(AVG(r.watch_percent), 2) as avg_watch_percent
FROM videos v
LEFT JOIN results r ON v.id = r.video_id
GROUP BY v.id, v.title
ORDER BY view_count DESC;
```

### 성능 모니터링

```sql
-- 느린 쿼리 확인 (pg_stat_statements 확장 필요)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 테이블 크기 확인
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- 인덱스 사용률
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 🔄 8. 백업 및 복원

### 백업

```bash
# 전체 백업
pg_dump -U postgres -d youtube_automation -F c -f backup_$(date +%Y%m%d).dump

# 스키마만 백업
pg_dump -U postgres -d youtube_automation --schema-only -f schema_backup.sql

# 데이터만 백업
pg_dump -U postgres -d youtube_automation --data-only -f data_backup.sql
```

### 복원

```bash
# 전체 복원
pg_restore -U postgres -d youtube_automation -c backup_20241226.dump

# SQL 파일 복원
psql -U postgres -d youtube_automation -f schema_backup.sql
```

---

## ⚠️ 트러블슈팅

### 자주 발생하는 문제

#### 1. 연결 거부
```
psql: error: connection refused
```
**해결**: PostgreSQL 서비스 실행 확인
```powershell
# Windows
Get-Service -Name postgresql*
Start-Service -Name postgresql-x64-15
```

#### 2. 인증 실패
```
psql: error: FATAL: password authentication failed
```
**해결**: `pg_hba.conf` 파일에서 인증 방식 확인

#### 3. 데이터베이스 없음
```
psql: error: FATAL: database "youtube_automation" does not exist
```
**해결**: 데이터베이스 생성 필요
```sql
CREATE DATABASE youtube_automation;
```

#### 4. UUID 확장 오류
```
ERROR: function uuid_generate_v4() does not exist
```
**해결**: 확장 설치
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## ✅ 체크리스트

- [ ] PostgreSQL 15+ 설치 완료
- [ ] youtube_automation 데이터베이스 생성
- [ ] uuid-ossp 확장 활성화
- [ ] init.sql 실행 완료
- [ ] 5개 테이블 생성 확인 (videos, devices, tasks, results, pattern_logs)
- [ ] 인덱스 생성 확인 (9개)
- [ ] 트리거 작동 확인 (updated_at 자동 갱신)
- [ ] 뷰 생성 확인 (daily_stats, video_stats)
- [ ] .env 파일 설정 완료
- [ ] Python 연결 테스트 성공
- [ ] 테스트 데이터 삽입 (선택사항)
- [ ] Redis 연결 테스트 (선택사항)

---

## 📚 참고 자료

- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [asyncpg 문서](https://magicstack.github.io/asyncpg/)
- [SQLAlchemy 2.0 문서](https://docs.sqlalchemy.org/)

