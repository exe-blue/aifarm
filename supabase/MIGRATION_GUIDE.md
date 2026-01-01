# Supabase 마이그레이션 가이드

**프로젝트**: hycynmzdrngsozxdmyxi  
**업데이트**: 2026-01-02

---

## 🚀 빠른 시작

### 1단계: Supabase Dashboard 접속

**Dashboard URL**:
```
https://supabase.com/dashboard/project/hycynmzdrngsozxdmyxi
```

### 2단계: SQL Editor 열기

1. 좌측 메뉴에서 **"SQL Editor"** 클릭
2. **"New query"** 버튼 클릭

### 3단계: 마이그레이션 실행

**옵션 A: 전체 한 번에 실행 (권장)**

```bash
# 터미널에서 파일 내용 복사
cat supabase/migrations/ALL_MIGRATIONS.sql | pbcopy
```

또는 파일 열어서 전체 복사:
- 파일: `supabase/migrations/ALL_MIGRATIONS.sql` (1,019줄)
- SQL Editor에 붙여넣기
- **"Run"** 버튼 클릭

**옵션 B: 파일별 실행**

순서대로 하나씩 실행:

```sql
-- 1. Citizens (AI 시민)
-- 파일: 001_citizens.sql
-- 복사 → SQL Editor → Run

-- 2. View Events (시청 이벤트)
-- 파일: 002_view_events.sql
-- 복사 → SQL Editor → Run

-- 3. Credit Transactions (크레딧 거래)
-- 파일: 003_credit_transactions.sql
-- 복사 → SQL Editor → Run

-- 4. Commissions (커미션/POP)
-- 파일: 004_commissions.sql
-- 복사 → SQL Editor → Run

-- 5. Accidents (사고/이벤트)
-- 파일: 005_accidents.sql
-- 복사 → SQL Editor → Run

-- 6. Credit Transaction RPC (크레딧 함수)
-- 파일: 006_credit_transaction_rpc.sql
-- 복사 → SQL Editor → Run

-- 7. YouTube Videos (YouTube 업로드 관리) ⭐ 새로 추가
-- 파일: 007_youtube_videos.sql
-- 복사 → SQL Editor → Run
```

### 4단계: 테이블 확인

SQL Editor에서 실행:

```sql
-- 테이블 목록 조회
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 예상 결과:
-- accidents
-- accident_impacts
-- citizens
-- commissions
-- commission_completions
-- credit_transactions
-- verified_views
-- view_events
-- youtube_videos       ⭐ 새로 추가
-- youtube_video_tasks  ⭐ 새로 추가
```

### 5단계: Python 테스트 실행

```bash
cd /Users/joonho/Documents/doai-me/doai-me

# 환경 변수 설정
export SUPABASE_URL="https://hycynmzdrngsozxdmyxi.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw"

# 연결 테스트
python3 << 'PYTHON_EOF'
import requests

SUPABASE_URL = "https://hycynmzdrngsozxdmyxi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw"

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
}

# 테이블 확인
tables = ["citizens", "youtube_videos", "youtube_video_tasks"]
print("📊 테이블 확인:\n")

for table in tables:
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?limit=1", headers=headers)
    if resp.status_code == 200:
        print(f"✅ {table}")
    else:
        print(f"❌ {table}: {resp.status_code}")

print("\n✅ 테스트 완료!")
PYTHON_EOF
```

---

## 📊 마이그레이션 상세

### Migration 001: Citizens (AI 시민)

**테이블**:
- `citizens`: AI 시민 정보 (디바이스, 성격, 신념, 크레딧)

**주요 컬럼**:
- `citizen_id`, `device_serial`, `name`
- `trait_*`: Big Five 성격 (개방성, 성실성, 외향성, 친화성, 신경성)
- `belief_*`: 신념 (자아존중감, 세계신뢰, 노동윤리, 위험감수, 순응)
- `credits`, `existence_score`

### Migration 002: View Events (시청 이벤트)

**테이블**:
- `view_events`: 시청 시작/종료 이벤트
- `verified_views`: 검증된 시청 기록

**목적**: PoV(Proof of View) 시스템

### Migration 003: Credit Transactions (크레딧 거래)

**테이블**:
- `credit_transactions`: 모든 크레딧 거래 내역

**거래 타입**:
- VIEW_REWARD, ACCIDENT_PENALTY, DILEMMA_REWARD, ADMIN_GRANT

### Migration 004: Commissions (커미션)

**테이블**:
- `commissions`: POP 커미션 (영상 시청 의뢰)
- `commission_completions`: 완료 기록

### Migration 005: Accidents (사고)

**테이블**:
- `accidents`: 사회적 이벤트 (재난, 위기)
- `accident_impacts`: 영향 받은 시민

### Migration 006: Credit Transaction RPC

**함수**:
- `add_credits()`: 크레딧 지급
- `deduct_credits()`: 크레딧 차감
- `transfer_credits()`: 크레딧 이체

### Migration 007: YouTube Videos ⭐ **새로 추가**

**테이블**:
- `youtube_videos`: Google Sheets 입력 + 집계
- `youtube_video_tasks`: 600대 디바이스별 작업

**뷰**:
- `youtube_video_stats`: 실시간 집계 조회

**함수**:
- `update_youtube_video_stats()`: 집계 자동 계산
- `sync_youtube_video_from_sheet()`: Sheets → Supabase
- `assign_video_to_devices()`: 디바이스 할당
- `complete_youtube_task()`: 작업 완료 처리
- `get_youtube_videos_for_sheet()`: Supabase → Sheets

**트리거**:
- 작업 완료 시 자동 집계 업데이트

---

## 🧪 테스트 SQL

### 1. 샘플 영상 추가

```sql
-- 영상 등록 (Google Sheets 입력 시뮬레이션)
INSERT INTO youtube_videos (date, time, keyword, subject, url)
VALUES (
  CURRENT_DATE,
  15,
  '비트코인',
  '비트코인 급등 소식!',
  'https://www.youtube.com/watch?v=test123'
)
RETURNING *;
```

### 2. 샘플 디바이스 추가

```sql
-- 테스트용 디바이스 3대 생성
INSERT INTO citizens (device_serial, name, credits)
VALUES 
  ('TEST_001', 'Alice', 1000),
  ('TEST_002', 'Bob', 1000),
  ('TEST_003', 'Charlie', 1000)
RETURNING citizen_id, device_serial, name;
```

### 3. 작업 할당

```sql
-- 영상을 3대 디바이스에 할당
SELECT assign_video_to_devices(
  '영상ID',  -- video_id (위에서 생성된 UUID)
  ARRAY['TEST_001', 'TEST_002', 'TEST_003'],
  60  -- batch_size
);
```

### 4. 작업 완료 시뮬레이션

```sql
-- 디바이스 1: 시청 + 좋아요
SELECT complete_youtube_task(
  '영상ID',
  'TEST_001',
  120,      -- 120초 시청
  true,     -- liked
  false,    -- commented
  false,    -- subscribed
  false,    -- notification_set
  false,    -- shared
  false     -- added_to_playlist
);

-- 디바이스 2: 시청 + 댓글
SELECT complete_youtube_task(
  '영상ID',
  'TEST_002',
  90,       -- 90초 시청
  false,    -- liked
  true,     -- commented
  false,    -- subscribed
  false,    -- notification_set
  false,    -- shared
  false     -- added_to_playlist
);

-- 디바이스 3: 시청만
SELECT complete_youtube_task(
  '영상ID',
  'TEST_003',
  60,       -- 60초 시청
  false,    -- liked
  false,    -- commented
  false,    -- subscribed
  false,    -- notification_set
  false,    -- shared
  false     -- added_to_playlist
);
```

### 5. 집계 확인

```sql
-- 영상별 통계 조회
SELECT 
  no, date, time, keyword, subject,
  viewd,          -- 시청: 3
  notworked,      -- 미시청: 597
  like_count,     -- 좋아요: 1
  comment_count,  -- 댓글: 1
  completion_rate -- 진행률: 0.5%
FROM youtube_video_stats
ORDER BY no DESC;
```

### 6. 상세 작업 내역

```sql
-- 디바이스별 작업 내역
SELECT 
  device_serial,
  status,
  watch_duration_seconds,
  liked,
  commented,
  completed_at
FROM youtube_video_tasks
WHERE video_id = '영상ID'
ORDER BY completed_at DESC;
```

---

## 🔧 문제 해결

### 문제: "relation does not exist"

**원인**: 마이그레이션이 실행되지 않음

**해결**:
1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/ALL_MIGRATIONS.sql` 내용 복사
3. SQL Editor에 붙여넣기
4. Run 클릭

### 문제: "permission denied"

**원인**: Service Role Key 잘못됨

**해결**:
1. Supabase Dashboard → Settings → API
2. Service Role Key 재확인
3. 환경 변수 재설정

### 문제: 트리거가 작동하지 않음

**확인**:
```sql
-- 트리거 목록 조회
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

**해결**:
```sql
-- 트리거 재생성
DROP TRIGGER IF EXISTS trigger_youtube_tasks_stats ON youtube_video_tasks;
-- 007_youtube_videos.sql의 트리거 부분 다시 실행
```

---

## 📝 환경 변수 설정

### Bash/Zsh

```bash
# ~/.zshrc 또는 ~/.bashrc에 추가
export SUPABASE_URL="https://hycynmzdrngsozxdmyxi.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMDAwOTUsImV4cCI6MjA4Mjc3NjA5NX0.U9MCWf04dNuZ33RkUNqZ82a87S8rLE8EL1qeG9znv6w"

# 적용
source ~/.zshrc
```

### Dashboard .env

```bash
# dashboard/.env.local 생성
cat > dashboard/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://hycynmzdrngsozxdmyxi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMDAwOTUsImV4cCI6MjA4Mjc3NjA5NX0.U9MCWf04dNuZ33RkUNqZ82a87S8rLE8EL1qeG9znv6w
EOF
```

### Gateway .env

```bash
# gateway/.env 생성
cat > gateway/.env << 'EOF'
PORT=3100
HOST=0.0.0.0

SUPABASE_URL=https://hycynmzdrngsozxdmyxi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMDAwOTUsImV4cCI6MjA4Mjc3NjA5NX0.U9MCWf04dNuZ33RkUNqZ82a87S8rLE8EL1qeG9znv6w
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw

LOG_LEVEL=info
EOF
```

---

## ✅ 체크리스트

- [ ] Supabase Dashboard 접속 완료
- [ ] SQL Editor에서 ALL_MIGRATIONS.sql 실행
- [ ] 테이블 생성 확인 (10개 테이블)
- [ ] 환경 변수 설정 완료
- [ ] Python 연결 테스트 통과
- [ ] Dashboard .env.local 생성
- [ ] Gateway .env 생성

---

## 🎯 마이그레이션 후 다음 단계

### 1. 샘플 데이터 추가

```sql
-- 테스트 영상 추가
INSERT INTO youtube_videos (date, time, keyword, subject, url)
VALUES (
  '2026-01-02',
  15,
  '비트코인',
  '비트코인 급등 소식!',
  'https://www.youtube.com/watch?v=test123'
);

-- 결과 확인
SELECT * FROM youtube_videos ORDER BY no DESC;
```

### 2. Dashboard 실행

```bash
cd dashboard
npm install  # 처음 한 번만
npm run dev
```

→ http://localhost:3000/dashboard/youtube-upload 접속

### 3. 영상 등록 테스트

Dashboard에서:
1. 폼 작성
2. "영상 등록" 클릭
3. 목록에 표시되는지 확인

### 4. Google Sheets 동기화 테스트

```bash
# Google Service Account 설정 필요
export GOOGLE_SERVICE_ACCOUNT_FILE="/path/to/service-account.json"
export GOOGLE_SPREADSHEET_ID="1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk"

# 연결 테스트
python scripts/local/local-sync_youtube_gsheet-cli.py --test

# Sheets → Supabase
python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-supabase

# Supabase → Sheets
python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-sheet
```

---

## 📚 관련 문서

- **사용 가이드**: `docs/YOUTUBE_UPLOAD_GUIDE.md`
- **스키마 파일**: `supabase/migrations/007_youtube_videos.sql`
- **프론트엔드**: `dashboard/src/app/dashboard/youtube-upload/page.tsx`
- **동기화 스크립트**: `scripts/local/local-sync_youtube_gsheet-cli.py`

---

**작성**: Axon (Tech Lead)  
**버전**: 1.0.0  
**프로젝트**: hycynmzdrngsozxdmyxi
