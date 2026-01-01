# YouTube 업로드 관리 시스템 사용 가이드

**업데이트**: 2026-01-02  
**작성자**: Axon (Tech Lead)  
**Google Sheets**: [YouTube_Upload_Database](https://docs.google.com/spreadsheets/d/1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk)

---

## 📊 시스템 개요

600대 안드로이드 디바이스로 YouTube 영상을 시청하고, 결과를 집계하는 시스템입니다.

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Google Sheets   │       │    Supabase      │       │  600대 디바이스  │
│  (입력 UI)       │◄─────►│   (데이터베이스)  │◄─────►│  (AutoX.js)      │
└──────────────────┘       └──────────────────┘       └──────────────────┘
  입력: A~F 컬럼              중앙 데이터 저장           실행: 시청/좋아요/댓글
  집계: G~J 컬럼(자동)        자동 집계                 결과 보고
```

---

## 📋 Google Sheets 컬럼 구조

### 입력 컬럼 (A~F) - 사용자가 직접 입력

| 컬럼 | 이름 | 설명 | 예시 | 필수 |
|------|------|------|------|------|
| **A** | no | 순번 (자동 생성) | 1, 2, 3... | ✅ |
| **B** | date | 날짜 (기본값: 오늘) | 2026.01.01 | ✅ |
| **C** | time | 시간 (24시간, 숫자만) | 16 (오후 4시) | ✅ |
| **D** | keyword | 메인 키워드 | 레이븐코인 | ❌ |
| **E** | subject | 동영상 제목 | [🔥레이븐코인...] | ✅ |
| **F** | url | YouTube 링크 | https://youtube.com/... | ✅ |

### 집계 컬럼 (G~J) - 백엔드 자동 계산

| 컬럼 | 이름 | 설명 | 계산 방법 |
|------|------|------|----------|
| **G** | viewd | 시청 횟수 | 완료된 디바이스 수 |
| **H** | notworked | 안 본 횟수 | 600 - viewd |
| **I** | like | 좋아요 수 | 좋아요 클릭한 디바이스 수 |
| **J** | comments | 댓글 수 | 댓글 작성한 디바이스 수 |

---

## 🚀 사용 방법

### 방법 1: Google Sheets에서 직접 입력 (권장)

**1단계: Google Sheets 열기**

https://docs.google.com/spreadsheets/d/1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk

**2단계: 새 행 추가**

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| (자동) | 2026.01.02 | 15 | 비트코인 | 비트코인 급등! | https://youtube.com/... |

**3단계: 동기화 실행**

```bash
# 터미널에서 실행
python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-supabase
```

**4단계: 디바이스 할당**

```bash
# 영상 ID 확인 후 할당
python scripts/local/local-orchestrate_video_assignments-cli.py
```

**5단계: 집계 동기화**

```bash
# 주기적으로 실행 (cron 또는 수동)
python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-sheet
```

---

### 방법 2: 프론트엔드 Dashboard 사용

**1단계: Dashboard 접속**

```
http://localhost:3000/dashboard/youtube-upload
```

**2단계: 폼 작성**

- **날짜**: 기본값 오늘 (변경 가능)
- **시간**: 0~23 (24시간 형식)
- **키워드**: 메인 키워드 (선택)
- **제목**: 동영상 제목 (필수)
- **URL**: YouTube 링크 (필수)

**3단계: "영상 등록" 버튼 클릭**

→ Supabase에 자동 저장  
→ No 자동 생성  
→ 목록에 즉시 표시

**4단계: "할당" 버튼 클릭**

→ 600대 디바이스에 자동 배포

**5단계: 실시간 집계 확인**

→ 시청, 좋아요, 댓글 수가 자동으로 업데이트됨

---

## 🔄 동기화 프로세스

### 전체 플로우

```
1. [입력]
   사용자가 Google Sheets 또는 Dashboard에 영상 정보 입력
   ↓
2. [저장]
   Supabase youtube_videos 테이블에 저장
   (no, date, time, keyword, subject, url)
   ↓
3. [할당]
   600대 디바이스에 작업 할당
   → youtube_video_tasks 테이블 생성 (600개 행)
   → batch_no로 60대씩 10개 배치 (0~9)
   ↓
4. [실행]
   각 디바이스가 AutoX.js로 YouTube 시청
   → Gateway가 ADB Broadcast로 명령 전송
   → Receiver가 수신 → YouTube 모듈 실행
   ↓
5. [완료 보고]
   디바이스가 결과를 Gateway로 전송
   → youtube_video_tasks 업데이트
   → 트리거가 자동으로 집계 업데이트
   ↓
6. [집계]
   youtube_videos 테이블의 viewd, like_count 자동 계산
   ↓
7. [동기화]
   Supabase → Google Sheets (G~J 컬럼 업데이트)
```

---

## 🗄️ 데이터베이스 스키마

### 테이블 1: `youtube_videos`

**목적**: Google Sheets 입력 부분 저장 + 집계 결과

| 컬럼 | 타입 | 설명 |
|------|------|------|
| video_id | UUID | 기본키 |
| no | INTEGER | 순번 (자동 증가) |
| date | DATE | 날짜 |
| time | INTEGER | 시간 (0~23) |
| keyword | VARCHAR | 키워드 |
| subject | VARCHAR | 제목 |
| url | TEXT | YouTube URL |
| youtube_video_id | VARCHAR(11) | YouTube ID (자동 추출) |
| **viewd** | INTEGER | **시청 횟수 (자동 집계)** |
| **notworked** | INTEGER | **안 본 횟수 (자동 집계)** |
| **like_count** | INTEGER | **좋아요 수 (자동 집계)** |
| **comment_count** | INTEGER | **댓글 수 (자동 집계)** |
| status | VARCHAR | pending/assigned/completed |
| target_device_count | INTEGER | 목표 디바이스 수 (기본 600) |

### 테이블 2: `youtube_video_tasks`

**목적**: 600대 디바이스별 작업 할당 및 결과 저장

| 컬럼 | 타입 | 설명 |
|------|------|------|
| task_id | UUID | 기본키 |
| video_id | UUID | 영상 FK |
| device_serial | VARCHAR | ADB 시리얼 번호 |
| batch_no | INTEGER | 배치 번호 (0~9) |
| status | VARCHAR | pending/watching/completed/failed |
| watch_duration_seconds | INTEGER | 실제 시청 시간 |
| **liked** | BOOLEAN | **좋아요 클릭 여부** |
| **commented** | BOOLEAN | **댓글 작성 여부** |
| subscribed | BOOLEAN | 구독 여부 |
| notification_set | BOOLEAN | 알림 설정 여부 |
| shared | BOOLEAN | 공유 여부 |
| added_to_playlist | BOOLEAN | 재생목록 추가 여부 |

### 뷰: `youtube_video_stats`

**목적**: 실시간 집계 조회

```sql
SELECT * FROM youtube_video_stats;
```

결과:
- no, date, time, keyword, subject, url
- viewd, notworked, like_count, comment_count
- completion_rate (진행률 %)
- pending_count, watching_count, failed_count

---

## 🔧 설정

### 1. 환경 변수 설정

```bash
# Supabase
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Google Sheets
export GOOGLE_SERVICE_ACCOUNT_FILE="/path/to/service-account.json"
export GOOGLE_SPREADSHEET_ID="1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk"
```

### 2. Supabase 마이그레이션 실행

```bash
# Supabase CLI 설치
npm install -g supabase

# 마이그레이션 실행
cd supabase
supabase db push

# 또는 SQL 파일 직접 실행
psql -h db.xxx.supabase.co -U postgres -d postgres -f migrations/007_youtube_videos.sql
```

### 3. Google Sheets API 설정

**서비스 계정 생성**:
1. Google Cloud Console → IAM & Admin → Service Accounts
2. Create Service Account
3. Keys → Add Key → Create new key (JSON)
4. JSON 파일 다운로드

**스프레드시트 공유**:
1. Google Sheets 열기
2. 우측 상단 "공유" 클릭
3. 서비스 계정 이메일 입력 (JSON 파일의 `client_email`)
4. "편집자" 권한 부여

---

## 📱 사용 시나리오

### 시나리오 A: 빠른 등록 (Dashboard)

```
1. Dashboard 접속
   → http://localhost:3000/dashboard/youtube-upload

2. 폼 작성
   - 날짜: 2026.01.02 (오늘)
   - 시간: 15 (오후 3시)
   - 키워드: 비트코인
   - 제목: 비트코인 급등 소식!
   - URL: https://youtube.com/watch?v=xxx

3. "영상 등록" 클릭
   → Supabase에 저장
   → No 자동 생성 (예: No.2)

4. "할당" 버튼 클릭
   → 600대 디바이스에 배포
   → 상태: pending → assigned

5. 실시간 모니터링
   → 시청: 0 → 50 → 150 → 500
   → 진행률: 0% → 83.3%
   → 좋아요: 125 (25%)
   → 댓글: 50 (10%)
```

### 시나리오 B: 일괄 등록 (Google Sheets)

```
1. Google Sheets 열기
   → 여러 영상을 한 번에 입력

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| 1 | 2026.01.02 | 15 | 비트코인 | 비트코인 급등 | https://... |
| 2 | 2026.01.02 | 16 | 이더리움 | 이더리움 분석 | https://... |
| 3 | 2026.01.02 | 17 | 리플 | 리플 전망 | https://... |

2. 동기화 실행
   bash
   python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-supabase
   

3. 디바이스 할당 (영상별)
   bash
   # 모든 pending 영상에 할당
   python scripts/local/local-orchestrate_video_assignments-cli.py
   

4. 집계 동기화 (자동 또는 수동)
   bash
   python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-sheet
   

5. Google Sheets에서 결과 확인
   → G~J 컬럼에 집계 데이터 자동 업데이트
```

---

## 🎯 각 역할별 사용법

### 👤 일반 사용자 (콘텐츠 관리자)

**사용 도구**: Google Sheets 또는 Dashboard

```bash
# 1. Dashboard 접속
http://localhost:3000/dashboard/youtube-upload

# 2. 영상 등록
- 폼 작성 후 "영상 등록" 클릭

# 3. 결과 확인
- 표에서 실시간 집계 확인
- 시청, 좋아요, 댓글 수 모니터링
```

### 🔧 시스템 관리자

**사용 도구**: Python 스크립트

```bash
# 연결 테스트
python scripts/local/local-sync_youtube_gsheet-cli.py \
  --spreadsheet-id 1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk \
  --test

# Google Sheets → Supabase (영상 등록)
python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-supabase

# Supabase → Google Sheets (집계 업데이트)
python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-sheet

# 양방향 동기화
python scripts/local/local-sync_youtube_gsheet-cli.py --mode both

# 600대 디바이스에 할당
python scripts/local/local-orchestrate_video_assignments-cli.py
```

### 🤖 자동화 (Cron)

```bash
# crontab -e

# 매 5분마다 Google Sheets → Supabase 동기화
*/5 * * * * cd /path/to/doai-me && python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-supabase

# 매 10분마다 Supabase → Google Sheets 동기화
*/10 * * * * cd /path/to/doai-me && python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-sheet
```

---

## 📊 데이터 흐름

### 1. 영상 등록

```
Google Sheets (또는 Dashboard)
   ↓
youtube_videos 테이블에 INSERT
   - no: 자동 증가 (1, 2, 3...)
   - date, time, keyword, subject, url: 입력값
   - status: 'pending'
   - viewd, notworked, like_count, comment_count: 0
```

### 2. 디바이스 할당

```
youtube_videos (status = pending)
   ↓
assign_video_to_devices() 함수 호출
   ↓
youtube_video_tasks 테이블에 600개 행 생성
   - video_id: 영상 FK
   - device_serial: 디바이스 시리얼
   - batch_no: 0~9 (60대씩)
   - status: 'pending'
   ↓
youtube_videos.status = 'assigned'
```

### 3. 디바이스 실행

```
Gateway
   ↓ POST /api/dispatch
ADB Broadcast (com.doai.me.COMMAND)
   ↓
AutoX.js Receiver
   ↓
YouTube Module
   - 영상 시청 (30~180초)
   - 좋아요 (30% 확률)
   - 댓글 (10% 확률)
   - 구독 (5% 확률)
   ↓
결과 보고 (Gateway API)
   ↓
youtube_video_tasks 업데이트
   - status: 'completed'
   - watch_duration_seconds: 120
   - liked: true
   - commented: false
```

### 4. 집계 업데이트

```
youtube_video_tasks 업데이트 시
   ↓
트리거 자동 실행 (trigger_youtube_tasks_stats)
   ↓
update_youtube_video_stats() 함수
   ↓
youtube_videos 집계 컬럼 업데이트
   - viewd = COUNT(WHERE status = 'completed')
   - notworked = 600 - viewd
   - like_count = COUNT(WHERE liked = true)
   - comment_count = COUNT(WHERE commented = true)
```

### 5. Google Sheets 동기화

```
youtube_videos (집계 완료)
   ↓
local-sync_youtube_gsheet-cli.py (--mode to-sheet)
   ↓
Google Sheets G~J 컬럼 업데이트
   - G: viewd
   - H: notworked
   - I: like_count
   - J: comment_count
```

---

## 🔍 집계 로직 상세

### viewd (시청 횟수)

```sql
SELECT COUNT(*) 
FROM youtube_video_tasks
WHERE video_id = '...'
  AND status = 'completed';
```

### notworked (안 본 횟수)

```sql
SELECT 600 - COUNT(*) 
FROM youtube_video_tasks
WHERE video_id = '...'
  AND status = 'completed';
```

### like_count (좋아요 수)

```sql
SELECT COUNT(*) 
FROM youtube_video_tasks
WHERE video_id = '...'
  AND status = 'completed'
  AND liked = true;
```

### comment_count (댓글 수)

```sql
SELECT COUNT(*) 
FROM youtube_video_tasks
WHERE video_id = '...'
  AND status = 'completed'
  AND commented = true;
```

### 자동 업데이트

모든 집계는 **트리거로 자동 실행**됩니다:

```sql
-- 작업 완료 시
UPDATE youtube_video_tasks SET status = 'completed' ...
  ↓ 트리거 실행
  ↓ update_youtube_video_stats() 함수 호출
  ↓ youtube_videos 집계 컬럼 자동 업데이트
```

---

## 🧪 테스트

### 1. 연결 테스트

```bash
python scripts/local/local-sync_youtube_gsheet-cli.py --test
```

**예상 출력**:
```
1️⃣  Supabase 연결...
✅ Supabase 연결 성공

2️⃣  Google Sheets 연결...
✅ Google Sheets 연결 성공: YouTube_Upload_Database

✅ 모든 연결 테스트 통과!
```

### 2. 수동 동기화 테스트

```bash
# Google Sheets → Supabase
python scripts/local/local-sync_youtube_gsheet-cli.py \
  --spreadsheet-id 1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk \
  --sheet-name Sheet1 \
  --mode to-supabase
```

**예상 출력**:
```
=== Google Sheets → Supabase 동기화 ===
📄 Google Sheets 읽기 중...
✅ 3개 행 읽기 완료
✅ 행 2: No.1 - [🔥레이븐코인 실시간 호재 발표🔥]...
✅ 행 3: No.2 - 비트코인 급등 소식!
✅ 행 4: No.3 - 이더리움 분석

📊 동기화 완료: 3/3개
```

### 3. 집계 확인

```sql
-- Supabase SQL Editor에서 실행
SELECT * FROM youtube_video_stats ORDER BY no DESC;
```

---

## 🐛 문제 해결

### 문제 1: "환경변수 SUPABASE_URL 설정하세요"

**해결**:
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### 문제 2: "Google Sheets 접근 권한이 없습니다"

**해결**:
1. 서비스 계정 이메일 확인: `service-account.json` 파일의 `client_email`
2. Google Sheets → 공유 → 서비스 계정 이메일 추가
3. "편집자" 권한 부여

### 문제 3: "스프레드시트를 찾을 수 없습니다"

**해결**:
1. 스프레드시트 ID 확인 (URL에서 복사)
2. 시트 이름 확인 (대소문자 정확히)

### 문제 4: 집계가 업데이트되지 않음

**원인**: 트리거가 실행되지 않음

**해결**:
```sql
-- 수동으로 집계 업데이트
SELECT update_youtube_video_stats('video_id_here');

-- 또는 모든 영상 업데이트
DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN SELECT video_id FROM youtube_videos LOOP
    PERFORM update_youtube_video_stats(v.video_id);
  END LOOP;
END $$;
```

---

## 📈 통계 및 모니터링

### Dashboard에서 확인

```
http://localhost:3000/dashboard/youtube-upload
```

- 실시간 집계 (시청, 좋아요, 댓글)
- 진행률 (%)
- 배치별 상태 (pending/watching/completed)

### SQL 쿼리

```sql
-- 전체 통계
SELECT 
  COUNT(*) as total_videos,
  SUM(viewd) as total_views,
  SUM(like_count) as total_likes,
  SUM(comment_count) as total_comments,
  ROUND(AVG(completion_rate), 2) as avg_completion_rate
FROM youtube_videos;

-- 영상별 상세
SELECT * FROM youtube_video_stats ORDER BY no DESC;

-- 디바이스별 작업 현황
SELECT 
  device_serial,
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN liked = true THEN 1 END) as likes_given,
  COUNT(CASE WHEN commented = true THEN 1 END) as comments_written
FROM youtube_video_tasks
GROUP BY device_serial
ORDER BY completed DESC;
```

---

## 🎓 FAQ

### Q1: no 컬럼은 어떻게 자동 생성되나요?

**A**: PostgreSQL 시퀀스를 사용합니다.

```sql
-- 시퀀스 확인
SELECT currval('youtube_videos_no_seq');

-- 다음 번호
SELECT nextval('youtube_videos_no_seq');
```

### Q2: 600대가 아닌 다른 수로 할당할 수 있나요?

**A**: 예, `target_device_count`를 변경하면 됩니다.

```python
# Dashboard에서는 기본 600
# Python 스크립트에서는
python scripts/local/local-orchestrate_video_assignments-cli.py \
  --target-count 300
```

### Q3: 집계는 언제 업데이트되나요?

**A**: 실시간 자동 업데이트됩니다.

- youtube_video_tasks 업데이트 시
- 트리거가 자동으로 집계 함수 실행
- youtube_videos 테이블 즉시 업데이트

### Q4: Google Sheets는 언제 업데이트되나요?

**A**: 수동 또는 Cron으로 실행해야 합니다.

```bash
# 수동
python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-sheet

# Cron (10분마다)
*/10 * * * * cd /path && python scripts/local/local-sync_youtube_gsheet-cli.py --mode to-sheet
```

---

## 📚 참고 문서

- 데이터베이스 스키마: `supabase/migrations/007_youtube_videos.sql`
- 프론트엔드 페이지: `dashboard/src/app/dashboard/youtube-upload/page.tsx`
- 동기화 스크립트: `scripts/local/local-sync_youtube_gsheet-cli.py`
- AutoX.js 실행: `autox-scripts/main.js`
- Google Sheets: https://docs.google.com/spreadsheets/d/1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk

---

**작성**: Axon (Tech Lead)  
**버전**: 1.0.0  
**라이선스**: MIT
