# 🔄 DoAi.Me 워크로드 시스템

> 영상 리스팅 → 명령 → 결과 기록 → 대기 사이클 관리

---

## 📋 목차

1. [개요](#1-개요)
2. [워크로드 사이클](#2-워크로드-사이클)
3. [50% 배치 실행](#3-50-배치-실행)
4. [설정 옵션](#4-설정-옵션)
5. [상태 관리](#5-상태-관리)
6. [API 사용법](#6-api-사용법)
7. [히스토리 및 로그](#7-히스토리-및-로그)
8. [최적화 팁](#8-최적화-팁)

---

## 1. 개요

### 워크로드란?

**워크로드(Workload)** = 하나 이상의 YouTube 영상을 300대 디바이스에서 시청하는 **작업 배치**

```
워크로드 구성:
├── 영상 목록 (video_ids)
├── 배치 설정 (batch_config)
├── 시청 설정 (watch_config)
└── 대상 워크스테이션 (target_workstations)
```

### 핵심 구성 요소

| 컴포넌트 | 역할 | 파일 |
|----------|------|------|
| **WorkloadEngine** | 워크로드 생성/실행/관리 | `shared/workload_engine.py` |
| **BatchExecutor** | 50% 배치 실행 로직 | `shared/batch_executor.py` |
| **DeviceRegistry** | 디바이스 그룹 관리 | `shared/device_registry.py` |
| **LaixiClient** | 기기 제어 명령 | `shared/laixi_client.py` |

---

## 2. 워크로드 사이클

### 전체 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Workload Lifecycle                                │
│                                                                          │
│  ┌──────────┐                                                           │
│  │ PENDING  │  ← 워크로드 생성됨, 시작 대기                              │
│  └────┬─────┘                                                           │
│       │ start_workload()                                                 │
│       ▼                                                                  │
│  ┌──────────┐                                                           │
│  │ LISTING  │  ← 다음 영상 선택                                          │
│  └────┬─────┘                                                           │
│       │ 영상 정보 조회                                                   │
│       ▼                                                                  │
│  ┌──────────┐                                                           │
│  │EXECUTING │  ← 50% 배치 실행 (Group A → 대기 → Group B)               │
│  └────┬─────┘                                                           │
│       │ 모든 기기 명령 완료                                              │
│       ▼                                                                  │
│  ┌──────────┐                                                           │
│  │RECORDING │  ← 결과 DB 저장, 히스토리 기록                            │
│  └────┬─────┘                                                           │
│       │                                                                  │
│       ├─── 다음 영상 있음 ───▶ ┌──────────┐                             │
│       │                        │ WAITING  │ ← cycle_interval 대기       │
│       │                        └────┬─────┘                             │
│       │                             │                                    │
│       │                             └───────▶ LISTING으로 복귀           │
│       │                                                                  │
│       └─── 모든 영상 완료 ───▶ ┌───────────┐                            │
│                                │ COMPLETED │                             │
│                                └───────────┘                             │
│                                                                          │
│  [취소 시]                     ┌───────────┐                             │
│  cancel_workload() ──────────▶│ CANCELLED │                             │
│                                └───────────┘                             │
│                                                                          │
│  [오류 시]                     ┌───────────┐                             │
│  Exception ──────────────────▶│   ERROR   │                             │
│                                └───────────┘                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 단일 영상 처리 (Cycle)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Single Video Cycle                            │
│                                                                  │
│  1. LISTING                                                      │
│     └─▶ videos 테이블에서 video_id 조회                          │
│     └─▶ URL, 제목, 길이 정보 가져오기                            │
│                                                                  │
│  2. EXECUTING                                                    │
│     └─▶ Group A 디바이스 선택 (150대)                            │
│     └─▶ Laixi로 YouTube 열기 명령 전송                           │
│     └─▶ 시청 시간 대기 (30-120초)                                │
│     └─▶ 좋아요 클릭 (확률적)                                     │
│     └─▶ 홈으로 나가기                                            │
│         │                                                        │
│         ▼ batch_interval (60초) 대기                             │
│         │                                                        │
│     └─▶ Group B 디바이스 반복 (150대)                            │
│                                                                  │
│  3. RECORDING                                                    │
│     └─▶ results 테이블에 시청 결과 저장                          │
│     └─▶ command_history 테이블에 명령 기록                       │
│     └─▶ videos.completed_count 증가                              │
│                                                                  │
│  4. WAITING                                                      │
│     └─▶ cycle_interval (300초) 대기                              │
│     └─▶ 다음 영상으로 진행                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 50% 배치 실행

### 왜 50%씩 실행하는가?

| 문제 | 50% 분할 해결책 |
|------|-----------------|
| 네트워크 병목 | 동시 요청 300 → 150 감소 |
| Laixi 과부하 | WebSocket 연결 분산 |
| 전력 소모 | 피크 전력 감소 |
| 오류 격리 | 한 그룹 실패 시 다른 그룹 보존 |
| 트래픽 패턴 | 자연스러운 점진적 시청 |

### 실행 순서

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Batch Execution Flow                           │
│                                                                       │
│  Time 0:00                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Round 1: Group A (홀수 슬롯)                                     │ │
│  │                                                                  │ │
│  │  WS01: S01, S03, S05, S07, S09, S11, S13, S15, S17, S19 (10대)  │ │
│  │  WS02: S01, S03, S05, S07, S09, S11, S13, S15, S17, S19 (10대)  │ │
│  │  ...                                                            │ │
│  │  총 150대 동시 실행                                              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Time 0:00 ~ 2:00 (시청)                                             │
│                                                                       │
│  Time 2:00 ~ 3:00 (batch_interval: 60초 대기)                        │
│                                                                       │
│  Time 3:00                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Round 2: Group B (짝수 슬롯)                                     │ │
│  │                                                                  │ │
│  │  WS01: S02, S04, S06, S08, S10, S12, S14, S16, S18, S20 (10대)  │ │
│  │  WS02: S02, S04, S06, S08, S10, S12, S14, S16, S18, S20 (10대)  │ │
│  │  ...                                                            │ │
│  │  총 150대 동시 실행                                              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Time 3:00 ~ 5:00 (시청)                                             │
│                                                                       │
│  Time 5:00 (영상 완료)                                               │
└──────────────────────────────────────────────────────────────────────┘
```

### 코드 예시

```python
from shared.batch_executor import BatchExecutor, BatchExecutionContext, VideoTarget

executor = BatchExecutor()

# 영상 정보
video = VideoTarget(
    video_id="uuid-123",
    url="https://youtube.com/watch?v=xxx",
    title="테스트 영상"
)

# 실행 컨텍스트
context = BatchExecutionContext(
    workload_id="workload-001",
    video=video,
    batch_config=BatchConfig(
        batch_size_percent=50,
        batch_interval_seconds=60
    )
)

# 50% 배치 실행
results = await executor.execute_half_batches(context)

# 결과
for batch in results:
    print(f"Batch {batch.batch_number} ({batch.batch_group}):")
    print(f"  성공: {batch.success_count}/{batch.total_devices}")
    print(f"  실패: {batch.failed_count}")
```

---

## 4. 설정 옵션

### BatchConfig

```python
class BatchConfig(BaseModel):
    # 배치 크기 (50 = 전체의 50%씩 실행)
    batch_size_percent: int = 50  # 10-100
    
    # 배치 간 대기 시간 (Group A 완료 → Group B 시작)
    batch_interval_seconds: int = 60  # 10-600
    
    # 영상 간 대기 시간 (사이클 완료 → 다음 영상)
    cycle_interval_seconds: int = 300  # 60-3600
    
    # 재시도 설정
    max_retries: int = 3
    retry_delay_seconds: int = 30
    
    # 명령 타임아웃
    command_timeout_seconds: int = 120
```

### WatchConfig

```python
class WatchConfig(BaseModel):
    # 시청 시간 범위 (랜덤)
    watch_duration_min: int = 30   # 최소 30초
    watch_duration_max: int = 120  # 최대 2분
    
    # 인터랙션 확률
    like_probability: float = 0.05      # 5% 좋아요
    comment_probability: float = 0.02   # 2% 댓글
    subscribe_probability: float = 0.01 # 1% 구독
    
    # 휴먼 패턴
    enable_random_scroll: bool = True   # 랜덤 스크롤
    enable_random_pause: bool = True    # 구간 나누어 시청
```

### 설정 조합 예시

```python
# 빠른 실행 (테스트용)
fast_config = BatchConfig(
    batch_size_percent=100,        # 전체 한번에
    batch_interval_seconds=10,
    cycle_interval_seconds=60
)

# 안전한 실행 (프로덕션)
safe_config = BatchConfig(
    batch_size_percent=50,         # 50%씩
    batch_interval_seconds=60,     # 1분 대기
    cycle_interval_seconds=300     # 5분 대기
)

# 초안전 실행 (장기 작업)
ultra_safe_config = BatchConfig(
    batch_size_percent=25,         # 25%씩 (4회 실행)
    batch_interval_seconds=120,    # 2분 대기
    cycle_interval_seconds=600     # 10분 대기
)
```

---

## 5. 상태 관리

### 워크로드 상태

| 상태 | 설명 | 다음 상태 |
|------|------|----------|
| `pending` | 생성됨, 실행 대기 | listing, cancelled |
| `listing` | 다음 영상 선택 중 | executing, error |
| `executing` | 배치 실행 중 | recording, error |
| `recording` | 결과 저장 중 | waiting, completed |
| `waiting` | 다음 사이클 대기 | listing, cancelled |
| `paused` | 일시 정지 | listing, cancelled |
| `completed` | 모든 영상 완료 | (종료) |
| `cancelled` | 취소됨 | (종료) |
| `error` | 오류 발생 | (종료) |

### 상태 전이 규칙

```python
# 시작 가능 상태
startable_states = ['pending', 'paused']

# 취소 가능 상태
cancellable_states = ['pending', 'listing', 'executing', 'recording', 'waiting', 'paused']

# 종료 상태
terminal_states = ['completed', 'cancelled', 'error']
```

---

## 6. API 사용법

### 워크로드 생성

```python
from shared.workload_engine import get_workload_engine
from shared.schemas.workload import WorkloadCreate, BatchConfig, WatchConfig

engine = get_workload_engine()

# 워크로드 생성
workload = await engine.create_workload(WorkloadCreate(
    name="주간 시청 캠페인",
    video_ids=[
        "uuid-video-1",
        "uuid-video-2",
        "uuid-video-3"
    ],
    target_workstations=["WS01", "WS02"],  # 선택적
    batch_config=BatchConfig(
        batch_size_percent=50,
        batch_interval_seconds=60,
        cycle_interval_seconds=300
    ),
    watch_config=WatchConfig(
        watch_duration_min=30,
        watch_duration_max=120,
        like_probability=0.05
    )
))

print(f"워크로드 생성: {workload.id}")
```

### 워크로드 실행

```python
# 실행 시작
success = await engine.start_workload(workload.id)

if success:
    print("워크로드 실행 시작!")
else:
    print("실행 실패")
```

### 상태 모니터링

```python
# 상태 조회
status = await engine.get_workload_status(workload.id)

print(f"상태: {status['workload']['status']}")
print(f"진행: {status['workload']['completed_tasks']}/{status['workload']['total_tasks']}")

# 실시간 상태 (실행 중인 경우)
if status['is_running']:
    live = status['live_state']
    print(f"현재 영상: {live['current_video_index'] + 1}")
    print(f"현재 배치: {live['current_batch']}")
```

### 워크로드 취소

```python
# 취소
success = await engine.cancel_workload(workload.id)
```

### 워크로드 목록 조회

```python
# 활성 워크로드
active = await engine.get_workloads(status=WorkloadStatus.EXECUTING)

# 모든 워크로드
all_workloads = await engine.get_workloads(limit=50)
```

---

## 7. 히스토리 및 로그

### 워크로드 로그

```python
# 로그 조회
logs = await engine.get_workload_logs(
    workload.id,
    level=LogLevel.INFO,
    limit=100
)

for log in logs:
    print(f"[{log['level']}] {log['message']}")
```

### 명령 히스토리

```sql
-- 워크로드별 명령 내역
SELECT * FROM command_history
WHERE workload_id = 'your-workload-id'
ORDER BY created_at DESC;
```

### 결과 통계

```sql
-- 워크로드 결과 집계
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE error_message IS NULL) as success,
    COUNT(*) FILTER (WHERE error_message IS NOT NULL) as failed,
    SUM(watch_time) as total_watch_time,
    AVG(watch_percent) as avg_watch_percent
FROM results r
JOIN command_history ch ON r.id = ch.result_id
WHERE ch.workload_id = 'your-workload-id';
```

---

## 8. 최적화 팁

### 배치 크기 조정

```python
# 기기 수에 따른 권장 배치 크기
if total_devices <= 50:
    batch_size_percent = 100  # 한번에
elif total_devices <= 100:
    batch_size_percent = 50   # 2회
elif total_devices <= 200:
    batch_size_percent = 33   # 3회
else:
    batch_size_percent = 25   # 4회
```

### 네트워크 상태에 따른 조정

```python
# 불안정한 네트워크
unstable_config = BatchConfig(
    batch_size_percent=25,      # 더 작은 배치
    batch_interval_seconds=120, # 더 긴 대기
    max_retries=5,              # 더 많은 재시도
    retry_delay_seconds=60
)
```

### 시간대별 최적화

```python
from datetime import datetime

hour = datetime.now().hour

if 2 <= hour < 6:  # 새벽 (낮은 트래픽)
    config = BatchConfig(
        batch_size_percent=75,
        batch_interval_seconds=30
    )
elif 18 <= hour < 22:  # 피크 시간
    config = BatchConfig(
        batch_size_percent=33,
        batch_interval_seconds=90
    )
else:  # 일반 시간
    config = BatchConfig(
        batch_size_percent=50,
        batch_interval_seconds=60
    )
```

### 워크로드 체이닝

```python
# 순차적 워크로드 실행
workload_ids = ["wl-1", "wl-2", "wl-3"]

for wl_id in workload_ids:
    await engine.start_workload(wl_id)
    
    # 완료 대기
    while True:
        status = await engine.get_workload_status(wl_id)
        if status['workload']['status'] in ['completed', 'cancelled', 'error']:
            break
        await asyncio.sleep(30)
    
    print(f"{wl_id} 완료, 다음 워크로드 시작")
```

---

## 참고 자료

- [디바이스 계층 구조](./DEVICE_HIERARCHY.md)
- [WorkloadEngine 소스](../../shared/workload_engine.py)
- [BatchExecutor 소스](../../shared/batch_executor.py)
- [워크로드 스키마](../../shared/schemas/workload.py)

---

*"300대가 하나처럼 움직인다."*
