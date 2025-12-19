# AIFarm 아키텍처 설계

## 개요

AIFarm은 600대의 스마트폰을 제어하여 YouTube 자동화를 수행하는 시스템입니다.
시스템은 **DO (요청 지시)**와 **BE (에이전트 활동)** 두 가지 주요 작업 유형을 관리합니다.

## 용어 정의

| 용어 | 설명 |
|------|------|
| **DO** | Do Order - 사용자가 요청하는 작업 지시 (예: 특정 영상 시청) |
| **BE** | Background Execution - 에이전트의 자율적 상시 활동 (예: 리믹스, 트렌드 스카우트) |

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Vercel)                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Next.js Dashboard (aifarm-dashboard)                         │  │
│  │  ├── DO 요청 지시 입력 폼                                      │  │
│  │  ├── BE 활동 현황 표시                                         │  │
│  │  ├── 통합 내역 조회                                            │  │
│  │  └── 회원 권한 관리 (추후)                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              │ API / Realtime                         │
└──────────────────────────────┼────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│                         Supabase                                       │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │  Database                                                      │    │
│  │  ├── do_requests: DO 요청 테이블                               │    │
│  │  ├── be_activities: BE 활동 로그 테이블                        │    │
│  │  ├── unified_logs: 통합 내역 테이블                            │    │
│  │  ├── devices: 디바이스 상태 테이블                             │    │
│  │  └── users: 회원 테이블 (권한 포함)                            │    │
│  └───────────────────────────────────────────────────────────────┘    │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │  Realtime                                                      │    │
│  │  ├── 상태 변경 실시간 구독                                     │    │
│  │  └── 새 로그 알림                                              │    │
│  └───────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
                               │
                               │ Polling / Webhook
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│                    Backend Server (로컬/VPS)                           │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │  FastAPI Backend (aifarm/src/api)                              │    │
│  │  ├── DO Request Handler: 요청 수신 및 큐잉                     │    │
│  │  ├── BE Activity Manager: 상시 활동 스케줄링                   │    │
│  │  ├── Device Scheduler: 600대 디바이스 할당                     │    │
│  │  └── Heartbeat Manager: 디바이스 상태 모니터링                 │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ ADB over TCP (WiFi)                      │
│                              │ Port: 5555                               │
│  ┌───────────────────────────▼───────────────────────────────────┐    │
│  │  600 Devices (10.0.10.x ~ 10.0.12.x)                          │    │
│  │  ├── SM-G965U1 (Android 10)                                   │    │
│  │  ├── ...                                                       │    │
│  │  └── 600대 동시 제어                                           │    │
│  └───────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
```

## Vercel 배포 시 문제점 및 해결 방안

### 문제점

| 문제 | 원인 | 영향 |
|------|------|------|
| **실시간 처리 불가** | Serverless Cold Start (500ms~2s) | 즉시 실행 요청 지연 |
| **장시간 작업 불가** | 실행 시간 제한 (10초/60초) | 영상 시청 등 긴 작업 처리 불가 |
| **상태 관리 불가** | Stateless 특성 | 에이전트 상태 추적 불가 |
| **WebSocket 미지원** | Vercel Functions 제한 | 실시간 업데이트 불가 |
| **디바이스 접근 불가** | 네트워크 분리 | ADB over TCP 연결 불가 |

### 해결 방안

```
┌─────────────────────────────────────────────────────────────────┐
│  Vercel (Frontend Only)                                          │
│  ├── Dashboard UI 렌더링                                         │
│  ├── DO 요청 폼 → Supabase 직접 저장                             │
│  └── 상태 조회 → Supabase Realtime 구독                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Supabase Realtime
                               │ (실시간 데이터 동기화)
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  Backend Server (로컬)                                           │
│  ├── Supabase 폴링 (새 DO 요청 감지)                             │
│  ├── 디바이스 제어 실행                                          │
│  └── 결과 → Supabase 업데이트                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 권장 배포 구성

| 컴포넌트 | 배포 위치 | 역할 |
|----------|-----------|------|
| **Next.js Dashboard** | Vercel | UI, 폼, 조회 |
| **FastAPI Backend** | 로컬 서버 | 디바이스 제어, 스케줄링 |
| **Database** | Supabase | 데이터 저장, 실시간 동기화 |
| **File Storage** | Supabase Storage | 스크린샷, 로그 파일 |

## 데이터 흐름

### DO (요청 지시) 흐름

```
1. 사용자 → Dashboard에서 DO 요청 생성
2. Dashboard → Supabase do_requests 테이블에 저장 (status: 'pending')
3. Backend (폴링) → 새 요청 감지
4. Backend → 디바이스 스케줄러에 작업 할당
5. Backend → 디바이스 제어 실행
6. Backend → Supabase 상태 업데이트 (status: 'in_progress' → 'completed')
7. Dashboard (Realtime) → 실시간 상태 표시
```

### BE (에이전트 활동) 흐름

```
1. Backend → 스케줄러가 디바이스에 활동 할당
2. Backend → 확률적으로 6대 활동 중 선택
3. Backend → 디바이스 제어 실행
4. Backend → Supabase be_activities 테이블에 로그 저장
5. Dashboard (Realtime) → 실시간 활동 현황 표시
```

## 데이터베이스 스키마

### do_requests

```sql
CREATE TABLE do_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- YouTube 관련
  keyword VARCHAR(200) NOT NULL,
  video_title VARCHAR(500),
  video_url VARCHAR(500),
  video_id VARCHAR(50),
  channel_name VARCHAR(200),
  
  -- 에이전트 설정
  agent_start INT NOT NULL,
  agent_end INT NOT NULL,
  batch_size INT DEFAULT 5,
  
  -- 확률 설정
  like_probability INT DEFAULT 30,
  comment_probability INT DEFAULT 10,
  subscribe_probability INT DEFAULT 5,
  
  -- 시청 설정
  watch_time_min INT DEFAULT 60,
  watch_time_max INT DEFAULT 180,
  watch_percent_min INT DEFAULT 40,
  watch_percent_max INT DEFAULT 90,
  
  -- AI 설정
  ai_comment_enabled BOOLEAN DEFAULT true,
  ai_comment_style VARCHAR(100),
  
  -- 스케줄링
  scheduled_at TIMESTAMPTZ,
  execute_immediately BOOLEAN DEFAULT true,
  
  -- 상태
  status VARCHAR(20) DEFAULT 'pending',
  priority INT DEFAULT 2,
  
  -- 진행 상황
  total_agents INT,
  completed_agents INT DEFAULT 0,
  failed_agents INT DEFAULT 0,
  
  -- 메타데이터
  memo TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### be_activities

```sql
CREATE TABLE be_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id INT NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  
  -- DO 요청 연결
  do_request_id UUID REFERENCES do_requests(id),
  
  -- 활동 상세
  description TEXT NOT NULL,
  result VARCHAR(20) NOT NULL,
  
  -- 발견 데이터
  discovered_data JSONB,
  
  -- 성과 지표
  metrics JSONB,
  
  -- 시간
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  
  -- 오류
  error_message TEXT,
  error_code VARCHAR(50)
);
```

### unified_logs

```sql
CREATE TABLE unified_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(10) NOT NULL, -- 'DO' or 'BE'
  source_id UUID NOT NULL,
  
  device_id INT,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  
  -- 인덱스용
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unified_logs_timestamp ON unified_logs(timestamp DESC);
CREATE INDEX idx_unified_logs_source ON unified_logs(source);
```

## 회원 권한 시스템 (추후 구현)

| 역할 | DO 요청 | BE 활동 | 내역 조회 | 설정 |
|------|---------|---------|----------|------|
| **Admin** | ✅ 전체 | ✅ 전체 | ✅ 전체 | ✅ |
| **Manager** | ✅ 전체 | ✅ 조회 | ✅ 전체 | ❌ |
| **Operator** | ✅ 제한 | ✅ 조회 | ✅ 본인 | ❌ |
| **Viewer** | ❌ | ✅ 조회 | ✅ 제한 | ❌ |

## 실행 환경

### 필수 요구사항

- **Backend Server**
  - Python 3.10+
  - ADB 접근 가능 (같은 네트워크)
  - 24시간 가동

- **Devices**
  - WiFi 연결 (ADB over TCP)
  - Android 10+
  - YouTube 앱 설치

### 환경 변수

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxxx
SUPABASE_SERVICE_KEY=eyJxxxx

# OpenAI (AI 댓글 생성)
OPENAI_API_KEY=sk-xxxx

# Backend
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# ADB
ADB_PATH=C:\Program Files (x86)\xinhui\tools\adb.exe
```

## 시작 방법

### 1. Frontend (Vercel)

```bash
cd aifarm-dashboard
npm install
npm run dev

# 또는 Vercel 배포
vercel deploy
```

### 2. Backend (로컬)

```bash
cd aifarm
pip install -r requirements.txt

# API 서버 시작
python -m uvicorn src.api.server:app --host 0.0.0.0 --port 8000

# Heartbeat 모니터링 시작
python -c "from src.controller.heartbeat import start_monitoring; start_monitoring()"
```

## 향후 계획

1. **Supabase 완전 통합**: 실시간 데이터 동기화
2. **회원 권한 시스템**: Row Level Security 적용
3. **알림 시스템**: Push 알림, Email 알림
4. **분석 대시보드**: 성과 분석, 트렌드 분석
5. **자동 스케일링**: 디바이스 풀 동적 관리

