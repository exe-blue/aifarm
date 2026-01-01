# YouTube 업로드 시스템 빠른 시작 가이드

**프로젝트**: DoAi.Me YouTube Upload Management  
**Supabase**: hycynmzdrngsozxdmyxi  
**Google Sheets**: [YouTube_Upload_Database](https://docs.google.com/spreadsheets/d/1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk)

---

## ⚡ 5분 빠른 시작

### 1️⃣ Supabase 마이그레이션 (1회만)

**Dashboard 접속**:
```
https://supabase.com/dashboard/project/hycynmzdrngsozxdmyxi
```

**SQL Editor에서 실행**:
1. 좌측 메뉴 → **SQL Editor**
2. **New query** 클릭
3. 다음 파일 내용 복사:
   ```
   supabase/migrations/ALL_MIGRATIONS.sql
   ```
4. SQL Editor에 붙여넣기
5. **Run** 클릭
6. ✅ Success 확인

---

### 2️⃣ 테스트 실행

```bash
cd /Users/joonho/Documents/doai-me/doai-me

# Python 테스트
python3 scripts/local/local-test_youtube_system-cli.py
```

**예상 결과**:
```
✅ 모든 테스트 통과!

시스템 상태:
  ✅ Supabase 연결
  ✅ 테이블 생성
  ✅ 영상 등록
  ✅ 디바이스 작업 할당
  ✅ 작업 완료 처리
  ✅ 자동 집계 (viewd, like_count, comment_count)
```

---

### 3️⃣ Dashboard 실행

```bash
cd dashboard

# 환경 변수 설정
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://hycynmzdrngsozxdmyxi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMDAwOTUsImV4cCI6MjA4Mjc3NjA5NX0.U9MCWf04dNuZ33RkUNqZ82a87S8rLE8EL1qeG9znv6w
EOF

# Dashboard 시작
npm install  # 처음 한 번만
npm run dev
```

**접속**:
```
http://localhost:3000/dashboard/youtube-upload
```

---

### 4️⃣ 첫 번째 영상 등록

**방법 A: Dashboard** (권장)

1. `http://localhost:3000/dashboard/youtube-upload` 접속
2. 폼 작성:
   - 날짜: 2026.01.02 (오늘)
   - 시간: 15 (오후 3시)
   - 키워드: 비트코인
   - 제목: 비트코인 급등 소식!
   - URL: https://www.youtube.com/watch?v=xxx
3. **"영상 등록"** 클릭
4. ✅ No 자동 생성 (예: No.1)

**방법 B: Google Sheets**

1. [Google Sheets 열기](https://docs.google.com/spreadsheets/d/1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk)
2. 2번 행에 입력:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| 1 | 2026.01.02 | 15 | 비트코인 | 비트코인 급등 소식! | https://youtube.com/... |

3. 동기화 실행:
```bash
python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-supabase
```

---

### 5️⃣ 600대 디바이스 할당

**Dashboard에서**:
- 영상 목록에서 **"할당"** 버튼 클릭

**또는 Python 스크립트**:
```bash
# 모든 pending 영상에 할당
python scripts/local/local-orchestrate_video_assignments-cli.py

# 특정 영상에 할당
python scripts/local/local-orchestrate_video_assignments-cli.py \
  --video-id <UUID>
```

---

## 📊 시스템 구조

```
┌─────────────────────────────────────────────────────────┐
│                    입력 레이어                           │
├─────────────────────────────────────────────────────────┤
│  Google Sheets          │  Dashboard (Next.js)         │
│  (일괄 입력)            │  (빠른 단일 입력)             │
└──────────┬──────────────┴────────────┬─────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase (데이터베이스)                 │
├─────────────────────────────────────────────────────────┤
│  youtube_videos          │  집계 자동 계산              │
│  (입력 + 집계)           │  (트리거 기반)              │
│                          │                             │
│  youtube_video_tasks     │  600대 디바이스별 작업      │
│  (작업 할당 + 결과)      │  (liked, commented 등)      │
└──────────┬──────────────┴────────────┬─────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                  실행 레이어                             │
├─────────────────────────────────────────────────────────┤
│  Gateway (Port 3100)     │  600대 안드로이드           │
│  - ADB Broadcast         │  - AutoX.js                 │
│  - 명령 전송             │  - YouTube 시청             │
│  - 결과 수신             │  - 좋아요/댓글              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 연동 정보

### Supabase

```bash
# URL
https://hycynmzdrngsozxdmyxi.supabase.co

# Service Role Key (백엔드/스크립트용)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw

# Anon Key (프론트엔드용)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMDAwOTUsImV4cCI6MjA4Mjc3NjA5NX0.U9MCWf04dNuZ33RkUNqZ82a87S8rLE8EL1qeG9znv6w
```

### Google Sheets

```bash
# Spreadsheet ID
1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk

# URL
https://docs.google.com/spreadsheets/d/1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk
```

---

## 🏗️ 시스템 구조

```
Gateway (Port 3100)
    ↓
5대 PC 노드
├── PC_01 (120대 안드로이드)
├── PC_02 (120대 안드로이드)
├── PC_03 (120대 안드로이드)
├── PC_04 (120대 안드로이드)
└── PC_05 (120대 안드로이드)

총 디바이스: 120 × 5 = 600대
```

**특징**:
- ✅ PC 노드별 동적 배치
- ✅ 유동적 스케일링 (PC 추가/제거)
- ✅ PC별 진행 상황 모니터링
- ✅ 장애 격리 (PC 단위)

## 📂 주요 파일

### 데이터베이스

```
supabase/migrations/
├── ALL_MIGRATIONS.sql           ⭐ 전체 마이그레이션 (1,131줄)
├── 001_citizens.sql              (AI 시민)
├── 002_view_events.sql           (시청 이벤트)
├── 003_credit_transactions.sql   (크레딧 거래)
├── 004_commissions.sql           (커미션)
├── 005_accidents.sql             (사고)
├── 006_credit_transaction_rpc.sql (크레딧 함수)
└── 007_youtube_videos.sql        ⭐ (YouTube 업로드 관리)
```

### 프론트엔드

```
dashboard/src/app/dashboard/
└── youtube-upload/
    └── page.tsx                  ⭐ YouTube 입력 폼
```

### 스크립트

```
scripts/local/
├── local-sync_youtube_gsheet-cli.py       ⭐ Google Sheets 동기화
├── local-test_youtube_system-cli.py       ⭐ 통합 테스트
├── local-orchestrate_video_assignments-cli.py  (디바이스 할당)
└── local-register_devices-cli.py          (디바이스 등록)
```

### 문서

```
docs/
└── YOUTUBE_UPLOAD_GUIDE.md       ⭐ 상세 사용 가이드 (930줄)

supabase/
└── MIGRATION_GUIDE.md            ⭐ 마이그레이션 가이드

autox-scripts/
└── MIGRATION_STATUS.md           ⭐ AutoX.js 동작 상태
```

---

## 🎯 체크리스트

### 초기 설정

- [ ] **1. Supabase 마이그레이션 실행**
  - Dashboard → SQL Editor
  - ALL_MIGRATIONS.sql 실행
  - 10개 테이블 생성 확인

- [ ] **2. 환경 변수 설정**
  ```bash
  export SUPABASE_URL="https://hycynmzdrngsozxdmyxi.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="..."
  ```

- [ ] **3. Dashboard .env.local 생성**
  ```bash
  cd dashboard
  # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 설정
  ```

- [ ] **4. Python 테스트 실행**
  ```bash
  python3 scripts/local/local-test_youtube_system-cli.py
  ```

### 첫 번째 영상 등록

- [ ] **5. Dashboard 실행**
  ```bash
  cd dashboard && npm run dev
  ```

- [ ] **6. 영상 등록**
  - http://localhost:3000/dashboard/youtube-upload
  - 폼 작성 후 "영상 등록"

- [ ] **7. 디바이스 할당**
  - "할당" 버튼 클릭
  - 또는: `python scripts/local/local-orchestrate_video_assignments-cli.py`

### Google Sheets 동기화 (선택)

- [ ] **8. Google Service Account 설정**
  - Google Cloud Console에서 서비스 계정 생성
  - JSON 키 다운로드
  - Sheets에 서비스 계정 공유 (편집자 권한)

- [ ] **9. 동기화 테스트**
  ```bash
  export GOOGLE_SERVICE_ACCOUNT_FILE="/path/to/service-account.json"
  python scripts/local/local-sync_youtube_gsheet-cli.py --test
  ```

- [ ] **10. 양방향 동기화**
  ```bash
  python scripts/local/local-sync_youtube_gsheet-cli.py --mode both
  ```

---

## 🚀 실행 명령어 모음

```bash
# 환경 변수 설정
export SUPABASE_URL="https://hycynmzdrngsozxdmyxi.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw"

# 테스트
python3 scripts/local/local-test_youtube_system-cli.py

# Dashboard 실행
cd dashboard && npm run dev

# Gateway 실행
cd gateway && npm run dev:all

# Google Sheets 동기화
python scripts/local/local-sync_youtube_gsheet-cli.py --mode both
```

---

## 📞 지원

문제가 발생하면 다음 문서를 참고하세요:

1. **YouTube 업로드 가이드**: `docs/YOUTUBE_UPLOAD_GUIDE.md`
2. **마이그레이션 가이드**: `supabase/MIGRATION_GUIDE.md`
3. **AutoX.js 상태**: `autox-scripts/MIGRATION_STATUS.md`
4. **Scripts 가이드**: `scripts/README.md`

---

**작성**: Axon (Tech Lead)  
**업데이트**: 2026-01-02  
**버전**: 1.0.0
