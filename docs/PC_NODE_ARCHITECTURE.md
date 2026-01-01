# PC 노드 아키텍처 (5대 PC 구조)

**업데이트**: 2026-01-02  
**작성자**: Axon (Tech Lead)

---

## 🏗️ 시스템 구조

### 전체 아키텍처

```
┌──────────────────────────────────────────────────────────────────┐
│                     Gateway (Port 3100)                          │
│                   중앙 관제 서버 (1대)                            │
└────────┬────────────┬────────────┬────────────┬────────────┬─────┘
         │            │            │            │            │
    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
    │ PC_01   │  │ PC_02   │  │ PC_03   │  │ PC_04   │  │ PC_05   │
    │ (120대) │  │ (120대) │  │ (120대) │  │ (120대) │  │ (120대) │
    └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
    
    총 디바이스: 120 × 5 = 600대
```

### 디바이스 명명 규칙

```
{PC_ID}_{SLOT_NUMBER}

예시:
- PC_01_001, PC_01_002, ..., PC_01_120  (PC 1번)
- PC_02_001, PC_02_002, ..., PC_02_120  (PC 2번)
- PC_03_001, PC_03_002, ..., PC_03_120  (PC 3번)
- PC_04_001, PC_04_002, ..., PC_04_120  (PC 4번)
- PC_05_001, PC_05_002, ..., PC_05_120  (PC 5번)
```

---

## 📊 배치 전략

### 기존 방식 (Deprecated)

```
60대씩 10개 배치
batch_no: 0, 1, 2, ..., 9
```

### 새로운 방식 (PC 노드 기반)

```
PC 노드별 120대씩 할당
pc_id: PC_01, PC_02, ..., PC_05
pc_device_index: 0~119 (각 PC 내에서의 인덱스)
```

**장점**:
- ✅ PC 노드 단위로 명령 전송 가능
- ✅ PC별 진행 상황 모니터링
- ✅ PC 노드 장애 시 격리 가능
- ✅ 동적 스케일링 (PC 추가/제거)

---

## 🎯 동적 배치 알고리즘

### 함수: `assign_video_to_devices()`

```sql
-- 자동 할당 (600대)
SELECT assign_video_to_devices(
  video_id := 'uuid-here',
  p_device_serials := NULL,    -- NULL이면 자동 조회
  p_target_count := 600
);

-- 결과:
{
  "total_assigned": 600,
  "pc_distribution": {
    "PC_01": 120,
    "PC_02": 120,
    "PC_03": 120,
    "PC_04": 120,
    "PC_05": 120
  }
}
```

### 알고리즘

```python
1. citizens 테이블에서 활성 디바이스 조회 (최대 target_count)
2. 각 디바이스의 device_serial에서 PC ID 추출
   - 형식: PC_01_001 → PC_01
   - 없으면 자동 할당: (index / 120) + 1 → PC_01, PC_02, ...
3. PC별로 디바이스 카운트 추적
   - pc_device_index: 0, 1, 2, ..., 119 (PC 내 인덱스)
4. youtube_video_tasks에 저장
   - pc_id, pc_device_index 포함
5. PC 노드별 통계 반환
```

---

## 📊 데이터베이스 스키마

### youtube_video_tasks 테이블

```sql
CREATE TABLE youtube_video_tasks (
  task_id UUID PRIMARY KEY,
  video_id UUID REFERENCES youtube_videos,
  device_serial VARCHAR(64),
  citizen_id UUID REFERENCES citizens,
  
  -- PC 노드 정보 ⭐ 신규
  pc_id VARCHAR(16),              -- PC_01 ~ PC_05
  pc_device_index INTEGER,        -- 0 ~ 119 (PC 내 인덱스)
  
  -- 상태 및 결과
  status VARCHAR(16),
  watch_duration_seconds INTEGER,
  liked BOOLEAN,
  commented BOOLEAN,
  ...
);

-- 인덱스
CREATE INDEX idx_youtube_tasks_pc ON youtube_video_tasks(pc_id);
```

### youtube_pc_node_stats 뷰 ⭐ 신규

```sql
-- PC 노드별 통계 조회
SELECT * FROM youtube_pc_node_stats 
WHERE video_id = 'uuid-here';

-- 결과:
video_id | pc_id | total_devices | completed | pending | likes | comments
---------|-------|---------------|-----------|---------|-------|----------
uuid     | PC_01 | 120          | 100       | 20      | 25    | 10
uuid     | PC_02 | 120          | 115       | 5       | 30    | 12
uuid     | PC_03 | 120          | 95        | 25      | 20    | 8
uuid     | PC_04 | 120          | 110       | 10      | 28    | 11
uuid     | PC_05 | 120          | 105       | 15      | 26    | 9
```

---

## 🚀 사용 방법

### 1. 디바이스 등록 (PC별)

```bash
# PC_01에서 실행
export BOARD_NUMBER="1"
export PC_ID="PC_01"
python scripts/local/local-register_devices-cli.py

# PC_02에서 실행
export BOARD_NUMBER="2"
export PC_ID="PC_02"
python scripts/local/local-register_devices-cli.py

# ... PC_05까지 반복
```

**결과**: citizens 테이블에 600개 행 생성
- PC_01_001 ~ PC_01_120
- PC_02_001 ~ PC_02_120
- ...
- PC_05_001 ~ PC_05_120

### 2. 영상 할당 (자동 분배)

```bash
# Gateway PC에서 실행
python scripts/local/local-orchestrate_video_assignments-cli.py \
  --video-id <UUID> \
  --target-count 600
```

**내부 동작**:
```
1. citizens 테이블에서 600대 디바이스 조회
2. device_serial에서 PC ID 추출 (PC_01 ~ PC_05)
3. PC별로 자동 분배:
   - PC_01: 120대 (pc_device_index: 0~119)
   - PC_02: 120대 (pc_device_index: 0~119)
   - ...
   - PC_05: 120대 (pc_device_index: 0~119)
4. youtube_video_tasks에 600개 행 생성
```

### 3. PC 노드별 명령 전송

```bash
# 특정 PC에만 전송 (Gateway API)
curl -X POST http://localhost:3100/api/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "target": "PC_01",
    "type": "POP",
    "payload": {
      "video_id": "uuid-here"
    }
  }'

# 모든 PC에 전송
curl -X POST http://localhost:3100/api/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "target": "*",
    "type": "POP",
    "payload": {
      "video_id": "uuid-here"
    }
  }'
```

### 4. PC 노드별 진행 상황 모니터링

```sql
-- PC 노드별 통계 조회
SELECT * FROM youtube_pc_node_stats 
WHERE video_id = 'uuid-here'
ORDER BY pc_id;

-- 결과:
PC_01: 100/120 완료 (83%)
PC_02: 115/120 완료 (96%)
PC_03: 95/120 완료 (79%)
PC_04: 110/120 완료 (92%)
PC_05: 105/120 완료 (88%)
```

---

## 🔄 동적 스케일링

### PC 노드 추가 (600대 → 720대)

```bash
# PC_06 추가
export BOARD_NUMBER="6"
export PC_ID="PC_06"
python scripts/local/local-register_devices-cli.py

# 할당 시 자동 인식
python scripts/local/local-orchestrate_video_assignments-cli.py \
  --target-count 720  # 120 × 6 = 720
```

**알고리즘**:
```python
pc_id = f"PC_{(device_index // 120) + 1:02d}"
pc_device_index = device_index % 120
```

### PC 노드 제거

```sql
-- 특정 PC의 디바이스 비활성화
UPDATE citizens 
SET last_seen_at = NULL  -- 또는 is_active = false
WHERE device_serial LIKE 'PC_03_%';

-- 할당 시 자동으로 제외됨
```

---

## 📈 통계 및 모니터링

### Dashboard 추가 기능 (권장)

**PC 노드별 진행률 표시**:

```tsx
// PC 노드 카드
{['PC_01', 'PC_02', 'PC_03', 'PC_04', 'PC_05'].map(pcId => (
  <Card key={pcId}>
    <CardHeader>
      <CardTitle>{pcId}</CardTitle>
    </CardHeader>
    <CardContent>
      <div>완료: {stats[pcId]?.completed}/120</div>
      <Progress value={(stats[pcId]?.completed / 120) * 100} />
    </CardContent>
  </Card>
))}
```

### SQL 쿼리

```sql
-- PC 노드별 전체 통계
SELECT 
  pc_id,
  COUNT(DISTINCT video_id) as total_videos,
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN liked = true THEN 1 END) as total_likes,
  COUNT(CASE WHEN commented = true THEN 1 END) as total_comments,
  ROUND(AVG(watch_duration_seconds), 2) as avg_watch_duration
FROM youtube_video_tasks
WHERE pc_id IS NOT NULL
GROUP BY pc_id
ORDER BY pc_id;

-- 영상별 PC 노드 분포
SELECT * FROM youtube_video_stats
ORDER BY no DESC;

-- pc_distribution 컬럼 예시:
{
  "PC_01": 120,
  "PC_02": 120,
  "PC_03": 120,
  "PC_04": 120,
  "PC_05": 120
}
```

---

## 🔧 설정

### 각 PC 노드의 환경 변수

```bash
# PC_01 (.bashrc 또는 .zshrc)
export PC_ID="PC_01"
export BOARD_NUMBER="1"
export GATEWAY_URL="http://gateway-pc:3100"

# PC_02
export PC_ID="PC_02"
export BOARD_NUMBER="2"
export GATEWAY_URL="http://gateway-pc:3100"

# ... PC_05까지
```

### Gateway 설정

```bash
# gateway/.env
PC_NODE_COUNT=5
PC_IDS=PC_01,PC_02,PC_03,PC_04,PC_05
DEVICES_PER_PC=120
TOTAL_DEVICES=600
```

---

## 🎯 배치 시나리오

### 시나리오 A: 전체 600대 할당

```bash
# 자동으로 5대 PC에 균등 분배
python scripts/local/local-orchestrate_video_assignments-cli.py \
  --video-id <UUID> \
  --target-count 600

# 결과:
PC_01: 120대 할당
PC_02: 120대 할당
PC_03: 120대 할당
PC_04: 120대 할당
PC_05: 120대 할당
```

### 시나리오 B: 특정 PC만 할당 (300대)

```bash
# PC_01, PC_02만 사용 (240대)
python scripts/local/local-orchestrate_video_assignments-cli.py \
  --video-id <UUID> \
  --target-count 240

# 결과:
PC_01: 120대 할당
PC_02: 120대 할당
```

### 시나리오 C: PC별 순차 실행

```sql
-- PC_01만 먼저 실행
SELECT * FROM youtube_video_tasks
WHERE video_id = 'uuid-here'
  AND pc_id = 'PC_01'
  AND status = 'pending';

-- Gateway가 PC_01에만 명령 전송
POST /api/dispatch { "target": "PC_01", ... }

-- PC_01 완료 후 PC_02 실행
POST /api/dispatch { "target": "PC_02", ... }
```

---

## 🚨 장애 대응

### PC 노드 장애 시나리오

**문제**: PC_03이 오프라인

**해결**:
```sql
-- PC_03 작업을 다른 PC로 재할당
UPDATE youtube_video_tasks
SET 
  status = 'cancelled',
  error_message = 'PC_03 offline'
WHERE video_id = 'uuid-here'
  AND pc_id = 'PC_03'
  AND status = 'pending';

-- 재할당 (PC_03 제외)
-- Python 스크립트가 자동으로 활성 디바이스만 조회
```

**모니터링**:
```sql
-- PC별 상태 확인
SELECT 
  pc_id,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM youtube_video_tasks
WHERE video_id = 'uuid-here'
GROUP BY pc_id
ORDER BY pc_id;
```

---

## 🔍 디바이스 명명 규칙

### 형식

```
{PC_ID}_{SLOT_NUMBER}

PC_ID:
- PC_01 ~ PC_05 (2자리 숫자, 01부터 시작)
- 확장 가능: PC_06, PC_07, ...

SLOT_NUMBER:
- 001 ~ 120 (3자리 숫자, 001부터 시작)
- 각 PC당 최대 120대
```

### 예시

```
PC_01_001  → PC 1번, 슬롯 1
PC_01_120  → PC 1번, 슬롯 120
PC_02_001  → PC 2번, 슬롯 1
PC_05_120  → PC 5번, 슬롯 120
```

### 파싱 로직

```python
# Python
device_serial = "PC_03_045"
pc_id = device_serial.split('_')[0] + '_' + device_serial.split('_')[1]  # PC_03
slot_number = int(device_serial.split('_')[2])  # 45

# SQL
pc_id := substring(device_serial from '^(PC_\d+)_');
slot_number := substring(device_serial from '_(\d+)$')::INTEGER;

# 또는 정규식
pc_id := (regexp_match(device_serial, '^(PC_\d+)'))[1];
```

---

## 🎮 Gateway 명령 전송

### PC 노드별 명령

```javascript
// Gateway API
POST /api/dispatch
{
  "target": "PC_03",        // 특정 PC 노드
  "type": "POP",
  "payload": {
    "video_id": "uuid-here",
    "youtube_url": "https://..."
  }
}

// 내부 동작:
1. youtube_video_tasks에서 PC_03 디바이스 조회
2. PC_03의 ADB 서버로 브로드캐스트
3. 120대 디바이스가 동시에 수신
```

### 순차 실행 (PC 노드별)

```python
# Python 스크립트 예시
pc_nodes = ['PC_01', 'PC_02', 'PC_03', 'PC_04', 'PC_05']

for pc_id in pc_nodes:
    print(f"📡 {pc_id} 작업 시작...")
    
    # Gateway API 호출
    response = requests.post(
        f"{gateway_url}/api/dispatch",
        json={
            "target": pc_id,
            "type": "POP",
            "payload": {"video_id": video_id}
        }
    )
    
    # 완료 대기 (옵션)
    wait_for_completion(video_id, pc_id)
    
    print(f"✅ {pc_id} 완료")
```

---

## 📋 citizens 테이블 구조 (참고)

```sql
CREATE TABLE citizens (
  citizen_id UUID PRIMARY KEY,
  device_serial VARCHAR(64) UNIQUE,  -- PC_01_001 형식
  name VARCHAR(20),
  
  -- 메타데이터
  device_model VARCHAR(32),
  connection_type VARCHAR(8),  -- USB, WIFI, LAN
  
  -- 상태
  last_seen_at TIMESTAMPTZ,
  last_task_id INTEGER,
  
  ...
);

-- 인덱스
CREATE INDEX idx_citizens_serial ON citizens(device_serial);
```

**디바이스 조회 쿼리**:

```sql
-- PC_01의 모든 디바이스
SELECT * FROM citizens 
WHERE device_serial LIKE 'PC_01_%'
ORDER BY device_serial;

-- 활성 디바이스 (최근 24시간 내 활동)
SELECT * FROM citizens
WHERE last_seen_at > NOW() - INTERVAL '24 hours'
ORDER BY device_serial;

-- PC별 디바이스 수
SELECT 
  substring(device_serial from '^(PC_\d+)') as pc_id,
  COUNT(*) as device_count
FROM citizens
GROUP BY substring(device_serial from '^(PC_\d+)')
ORDER BY 1;
```

---

## 🎯 확장성

### 수평 확장 (PC 노드 추가)

```bash
# PC_06 추가
export PC_ID="PC_06"
export BOARD_NUMBER="6"
python scripts/local/local-register_devices-cli.py

# 총 디바이스: 720대 (120 × 6)
```

**자동 인식**:
- `assign_video_to_devices()` 함수가 자동으로 PC_06 인식
- target_count를 720으로 설정하면 PC_06도 포함

### 수직 확장 (PC당 디바이스 수 증가)

```python
# 각 PC당 150대로 증가
DEVICES_PER_PC = 150
TOTAL_DEVICES = 150 × 5 = 750

# 스키마 제약 조건 수정 필요:
ALTER TABLE youtube_video_tasks
DROP CONSTRAINT valid_pc_device_index;

ADD CONSTRAINT valid_pc_device_index 
CHECK (pc_device_index IS NULL OR (pc_device_index >= 0 AND pc_device_index < 150));
```

---

## 📊 대시보드 UI 제안

### PC 노드 카드 뷰

```
┌──────────────┬──────────────┬──────────────┐
│    PC_01     │    PC_02     │    PC_03     │
│   ████░░ 80% │   ████░░ 85% │   ███░░░ 70% │
│  완료: 96/120│  완료: 102/120│  완료: 84/120│
│  좋아요: 24  │  좋아요: 26  │  좋아요: 20  │
│  댓글: 10    │  댓글: 11    │  댓글: 8     │
└──────────────┴──────────────┴──────────────┘
┌──────────────┬──────────────┐
│    PC_04     │    PC_05     │
│   ████░░ 88% │   ████░░ 82% │
│  완료: 106/120│  완료: 98/120│
│  좋아요: 27  │  좋아요: 23  │
│  댓글: 12    │  댓글: 9     │
└──────────────┴──────────────┘

총 진행률: 486/600 (81%)
```

---

## 🎓 FAQ

### Q: PC 노드 ID는 어떻게 결정되나요?

**A**: device_serial에서 자동 추출됩니다.

```sql
-- device_serial 형식: PC_01_001
pc_id := substring(device_serial from '^(PC_\d+)_');
-- 결과: PC_01

-- device_serial이 다른 형식이면 자동 할당
pc_id := 'PC_' || LPAD((device_index / 120 + 1)::TEXT, 2, '0');
-- 0~119 → PC_01
-- 120~239 → PC_02
-- ...
```

### Q: PC당 120대가 아니라 다른 수로 변경할 수 있나요?

**A**: 가능합니다. 알고리즘을 수정하면 됩니다.

```sql
-- 예: PC당 100대로 변경
-- assign_video_to_devices 함수에서
v_pc_id := 'PC_' || LPAD((v_assigned_count / 100 + 1)::TEXT, 2, '0');
```

### Q: PC 노드를 동적으로 추가/제거할 수 있나요?

**A**: 예, 자동으로 인식됩니다.

- **추가**: 새 PC에서 `local-register_devices-cli.py` 실행
- **제거**: citizens 테이블에서 해당 PC 디바이스 비활성화
- **할당**: `assign_video_to_devices()` 함수가 활성 디바이스만 조회

---

## 🚀 마이그레이션 영향

### 기존 시스템과의 차이

| 항목 | 기존 (Deprecated) | 신규 (PC 노드) |
|------|-------------------|----------------|
| 배치 단위 | 60대씩 10개 배치 | PC 노드별 (최대 120대) |
| batch_no | 0~9 (INTEGER) | pc_id (VARCHAR) |
| 할당 방식 | 고정 배치 | 동적 PC 분배 |
| 확장성 | 제한적 | 유연함 (PC 추가 가능) |
| 장애 대응 | 배치 단위 | PC 노드 단위 |
| 모니터링 | 배치별 | PC별 + 전체 |

### 마이그레이션 체크리스트

- [x] `youtube_video_tasks` 테이블에 `pc_id`, `pc_device_index` 추가
- [x] `batch_no` 제약 조건 제거
- [x] `assign_video_to_devices()` 함수 수정 (PC 노드 동적 할당)
- [x] `youtube_pc_node_stats` 뷰 추가
- [x] `youtube_video_stats` 뷰에 `pc_distribution` 추가
- [ ] Gateway 명령 전송 로직 업데이트 (PC 노드별)
- [ ] Dashboard UI 업데이트 (PC 노드 카드 추가)
- [ ] 문서 업데이트 (5대 PC 구조 반영)

---

**작성**: Axon (Tech Lead)  
**버전**: 2.0.0 (PC 노드 구조)  
**업데이트**: 2026-01-02
