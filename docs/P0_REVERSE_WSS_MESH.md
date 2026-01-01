# P0: Reverse WSS Mesh Implementation

**지시자**: Orion (Visionary)  
**구현자**: Axon (Builder)  
**날짜**: 2026-01-02

---

## 📜 전략적 지시

> "오리온이다. Strategos가 **'세계의 지도'**를 완성했다. 너는 이제 그 길을 깔아라.  
> **[P0: Reverse WSS Mesh] 구현을 즉시 시작해라.**"

---

## 🎯 P0 목표

**5대 노드가 Vultr에 붙어 HELLO와 HEARTBEAT를 끊김 없이 보내는 상태**

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│            Vultr Orchestrator (The Brain)                   │
│          wss://doai.me:8443/node                            │
│          FastAPI + WebSockets                               │
├─────────────────────────────────────────────────────────────┤
│  - WSS 서버: /node 엔드포인트                                │
│  - Connection Manager: 활성 연결 추적                        │
│  - Policy Engine: 하트비트 감시 + 자동복구                   │
│  - REST API: /nodes, /jobs (관리용)                         │
└─────────────┬───────────────┬───────────────┬───────────────┘
              │               │               │
              ↓ WSS           ↓ WSS           ↓ WSS
      ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
      │  Node-001     │ │  Node-002     │ │  Node-003     │
      │  (T5810 #1)   │ │  (T5810 #2)   │ │  (T5810 #3)   │
      └───────────────┘ └───────────────┘ └───────────────┘
      ┌───────────────┐ ┌───────────────┐
      │  Node-004     │ │  Node-005     │
      │  (T5810 #4)   │ │  (T5810 #5)   │
      └───────────────┘ └───────────────┘
      
      각 노드: 120대 안드로이드 제어
```

---

## 📨 6가지 메시지 프로토콜

### 1. HELLO (Node → Orchestrator)

```json
{
  "type": "HELLO",
  "node_id": "node-001",
  "ts": 1730000000,
  "seq": 1,
  "ack_seq": 0,
  "payload": {
    "version": "noderunner/1.0.0-P0",
    "capabilities": ["laixi_wsapi", "adb_control"],
    "last_job_result_seq": 0
  }
}
```

**용도**: 노드 식별 및 인증

---

### 2. HEARTBEAT (Node → Orchestrator)

```json
{
  "type": "HEARTBEAT",
  "node_id": "node-001",
  "ts": 1730000010,
  "seq": 2,
  "ack_seq": 1,
  "payload": {
    "device_count": 120,
    "laixi_status": "ok",
    "adb_status": "ok",
    "cpu": 0.32,
    "mem": 0.61
  }
}
```

**주기**: 10초마다  
**타임아웃**: 30초 (3번 연속 실패 시 offline)

---

### 3. JOB_ASSIGN (Orchestrator → Node)

```json
{
  "type": "JOB_ASSIGN",
  "node_id": "node-001",
  "ts": 1730000020,
  "seq": 9001,
  "ack_seq": 2,
  "payload": {
    "job_id": "job-abc",
    "action": "YOUTUBE_OPEN_URL",
    "device_ids": ["all"],
    "params": {"url": "https://youtube.com/watch?v=..."},
    "idempotency_key": "job-abc"
  }
}
```

**트리거**: REST API (`POST /jobs`) 또는 자동복구

---

### 4. JOB_ACK (Node → Orchestrator)

```json
{
  "type": "JOB_ACK",
  "node_id": "node-001",
  "ts": 1730000021,
  "seq": 3,
  "ack_seq": 9001,
  "payload": {
    "job_id": "job-abc",
    "state": "started"
  }
}
```

**시점**: Job 수신 즉시 (실행 전)

---

### 5. JOB_RESULT (Node → Orchestrator)

```json
{
  "type": "JOB_RESULT",
  "node_id": "node-001",
  "ts": 1730000060,
  "seq": 4,
  "ack_seq": 9001,
  "payload": {
    "job_id": "job-abc",
    "state": "success",
    "metrics": {"duration_ms": 39000},
    "error": null
  }
}
```

**시점**: Job 실행 완료 후

---

### 6. DEVICE_SNAPSHOT (Node → Orchestrator)

```json
{
  "type": "DEVICE_SNAPSHOT",
  "node_id": "node-001",
  "ts": 1730000100,
  "seq": 5,
  "ack_seq": 4,
  "payload": {
    "devices": [
      {"id": "PC_01_001", "status": "idle"},
      {"id": "PC_01_002", "status": "watching"}
    ]
  }
}
```

**트리거**: 주기적 또는 요청 시

---

## 🔒 Critical Constraints (절대 제약)

### 1. Inbound 금지

❌ 로컬로 들어오는 포트 포워딩/인바운드 접속 전제 설계 금지

✅ 로컬 → 클라우드 Outbound만 사용 (WSS 443)

### 2. 단일 포트

✅ WSS(443)만 사용

### 3. 노드는 Dumb

❌ 노드에서 스케줄링/정책 판단 금지

✅ 명령 실행 + 결과 보고만

### 4. 끊겨도 자동복구

✅ Exponential Backoff 재연결

### 5. 멱등성

✅ 같은 job_id 중복 도착 시 1번만 실행

---

## 🧪 Acceptance Tests

### Test 1: 초기 연결

```bash
# Orchestrator 실행
cd orchestrator && python app.py

# NodeRunner 실행 (5대)
cd noderunner
NODE_ID=node-001 python main.py &
NODE_ID=node-002 python main.py &
NODE_ID=node-003 python main.py &
NODE_ID=node-004 python main.py &
NODE_ID=node-005 python main.py &

# 확인
curl http://localhost:8443/nodes

# 예상 결과: 5개 노드 모두 "online"
```

### Test 2: 자동 재연결

```bash
# 1. 노드 1개 강제 종료
pkill -f "NODE_ID=node-001"

# 2. 10초 대기 → Orchestrator에서 "offline" 확인
curl http://localhost:8443/nodes | jq '.nodes[] | select(.node_id=="node-001")'

# 3. 재시작
NODE_ID=node-001 python main.py

# 4. 자동 재연결 확인 (로그)
[INFO] 🔄 재연결 시도 1/10 (대기: 2초)
[INFO] ✅ WSS 연결 성공
[INFO] 📤 HELLO 전송
```

### Test 3: 멱등성

```bash
# 같은 job_id 2번 전송
curl -X POST http://localhost:8443/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "target": "node-001",
    "action": "YOUTUBE_OPEN_URL",
    "params": {"url": "..."}
  }'

# 같은 job_id 다시 전송
# → NodeRunner 로그: "⚠️  중복 Job 무시: job-xxx (already done)"
```

### Test 4: 하트비트 타임아웃

```bash
# 1. 노드의 네트워크 차단 (30초 이상)

# 2. Orchestrator 로그 확인
[ERROR] 🚨 하트비트 타임아웃: node-001

# 3. 노드 상태 확인
curl http://localhost:8443/nodes | jq '.nodes[] | select(.node_id=="node-001").status'
# → "offline"

# 4. 네트워크 복구
# → 자동 재연결 후 "online"
```

---

## 📊 모니터링

### Dashboard API

```bash
# 노드 목록
curl http://localhost:8443/nodes

# 응답:
{
  "nodes": [
    {
      "node_id": "node-001",
      "status": "online",
      "device_count": 120,
      "laixi_status": "ok",
      "adb_status": "ok",
      "last_seen": "2026-01-02T10:00:00Z",
      "seconds_since_heartbeat": 5,
      "uptime": 3600,
      "cpu": 0.32,
      "mem": 0.61
    }
  ]
}
```

---

## 🔧 자동복구 Job

### RECOVER_LAIXI

**트리거**: Laixi 상태가 "not_running"

**실행**:
```bash
taskkill /F /IM touping.exe
C:\laixi\touping.exe
```

### RECOVER_ADB

**트리거**: 디바이스 수 10% 이상 드롭

**실행**:
```bash
adb kill-server
adb start-server
adb devices
```

---

## 🚀 배포

### Vultr 서버

```bash
# 1. SSH 접속
ssh root@doai.me

# 2. 프로젝트 클론
git clone https://github.com/exe-blue/doai-me.git
cd doai-me/orchestrator

# 3. 설치
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. SSL 인증서 (Let's Encrypt)
certbot certonly --standalone -d doai.me

# 5. systemd 서비스
cat > /etc/systemd/system/doai-orchestrator.service << 'EOF'
[Unit]
Description=DoAi.Me Orchestrator
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/doai-me/orchestrator
ExecStart=/root/doai-me/orchestrator/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8443 --ssl-keyfile /etc/letsencrypt/live/doai.me/privkey.pem --ssl-certfile /etc/letsencrypt/live/doai.me/fullchain.pem
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 6. 서비스 시작
systemctl enable doai-orchestrator
systemctl start doai-orchestrator
systemctl status doai-orchestrator
```

### T5810 노드 (5대)

```bash
# 각 T5810에서 실행

# 1. 프로젝트 클론
cd C:\doai-me\noderunner

# 2. 가상환경
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 3. 환경 변수 설정
set NODE_ID=node-001
set WSS_SERVER_URL=wss://doai.me:8443/node

# 4. NSSM 서비스 등록
nssm install DoAiNodeRunner "C:\doai-me\noderunner\venv\Scripts\python.exe" "C:\doai-me\noderunner\main.py"
nssm set DoAiNodeRunner AppDirectory "C:\doai-me\noderunner"
nssm set DoAiNodeRunner AppEnvironmentExtra NODE_ID=node-001 WSS_SERVER_URL=wss://doai.me:8443/node
nssm set DoAiNodeRunner AppStdout "C:\doai-me\logs\noderunner.log"
nssm set DoAiNodeRunner AppStderr "C:\doai-me\logs\noderunner-error.log"

# 5. 서비스 시작
nssm start DoAiNodeRunner

# 6. 상태 확인
nssm status DoAiNodeRunner
```

---

## 📊 P0 Acceptance Criteria

| # | 테스트 | 기준 | 상태 |
|---|--------|------|------|
| 1 | 초기 연결 | 5대 노드가 10초 이내 online | ⏳ |
| 2 | 자동 재연결 | 끊김 → Exponential Backoff → 재연결 | ⏳ |
| 3 | 멱등성 | 중복 job_id → 1번만 실행 | ⏳ |
| 4 | 타임아웃 | 하트비트 30초 끊김 → offline | ⏳ |

---

## 🔍 검증 방법

### 1. 연결 상태 확인

```bash
# Orchestrator API
curl https://doai.me:8443/nodes | jq

# 예상 결과:
{
  "nodes": [
    {"node_id": "node-001", "status": "online", "device_count": 120},
    {"node_id": "node-002", "status": "online", "device_count": 120},
    {"node_id": "node-003", "status": "online", "device_count": 120},
    {"node_id": "node-004", "status": "online", "device_count": 120},
    {"node_id": "node-005", "status": "online", "device_count": 120}
  ]
}
```

### 2. Job 실행 테스트

```bash
# Job 생성
curl -X POST https://doai.me:8443/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "target": "node-001",
    "action": "YOUTUBE_OPEN_URL",
    "params": {"url": "https://youtube.com/watch?v=test"},
    "device_ids": ["all"]
  }'

# NodeRunner 로그 확인
[INFO] 📋 Job 수신: job-xxx
[INFO] 📤 JOB_ACK: job-xxx (state: started)
[INFO] 🎬 Job 실행 시작: job-xxx
[INFO] ✅ Job 완료: job-xxx
[INFO] 📤 JOB_RESULT: job-xxx (state: success)
```

### 3. 하트비트 로그

```bash
# Orchestrator 로그
[DEBUG] 📨 node-001 → HEARTBEAT (seq: 42)
[DEBUG] 💓 node-001 (device: 120)

# NodeRunner 로그
[DEBUG] 💓 HEARTBEAT (device: 120)
```

---

## 📁 파일 구조

```
orchestrator/              # Vultr (The Brain)
├── app.py                # FastAPI + WebSocket 서버
├── state.py              # 노드/Job 상태 관리
├── policy.py             # 하트비트 감시 + 자동복구
├── requirements.txt
└── README.md

noderunner/               # T5810 (The Muscle)
├── main.py              # WSS 클라이언트 + 메시지 루프
├── executor.py          # Job 실행 (Laixi/ADB 호출)
├── recovery.py          # 복구 관리
├── requirements.txt
└── README.md
```

---

## 🎯 핵심 로직

### Orchestrator (Vultr)

```python
# 하트비트 타임아웃 판정
if now - node.last_heartbeat > 30:
    node.status = OFFLINE
    trigger_recovery(node_id, "HEARTBEAT_TIMEOUT")
```

### NodeRunner (T5810)

```python
# 멱등성 체크
if idempotency_key in executed_jobs:
    send_job_ack(job_id, 'already_done')
    return

# 재연결 (Exponential Backoff)
delay = min(2 ** reconnect_attempts, 30)
await asyncio.sleep(delay)
await connect()
```

---

## 🔧 운영 가이드

### 로그 확인

```bash
# Orchestrator (Vultr)
journalctl -u doai-orchestrator -f

# NodeRunner (T5810)
tail -f C:\doai-me\logs\noderunner.log
```

### 재시작

```bash
# Orchestrator
systemctl restart doai-orchestrator

# NodeRunner
nssm restart DoAiNodeRunner
```

### 상태 모니터링

```bash
# 실시간 노드 상태
watch -n 1 'curl -s http://localhost:8443/nodes | jq'
```

---

## 🚨 트러블슈팅

### 문제: "Connection refused"

**원인**: Orchestrator 서버 미실행 또는 방화벽

**해결**:
```bash
# Vultr 서버 확인
systemctl status doai-orchestrator

# 방화벽 열기
ufw allow 8443/tcp
```

### 문제: "SSL certificate verify failed"

**원인**: Let's Encrypt 인증서 만료 또는 없음

**해결**:
```bash
# 인증서 갱신
certbot renew

# 서비스 재시작
systemctl restart doai-orchestrator
```

### 문제: 하트비트 타임아웃

**원인**: 네트워크 불안정 또는 NodeRunner 과부하

**해결**:
```bash
# NodeRunner 로그 확인
tail -f noderunner.log

# 수동 재시작
nssm restart DoAiNodeRunner
```

---

## 📚 관련 문서

- **Identity Provisioning**: `docs/IDENTITY_PROVISIONING_GUIDE.md`
- **존재론적 스키마**: `docs/ONTOLOGICAL_SCHEMA_GUIDE.md`
- **PC 노드 아키텍처**: `docs/PC_NODE_ARCHITECTURE.md`

---

## ✅ P0 체크리스트

### Orchestrator (Vultr)

- [x] app.py (FastAPI + WSS 서버)
- [x] state.py (노드/Job 상태 관리)
- [x] policy.py (하트비트 감시 + 자동복구)
- [x] requirements.txt
- [ ] Vultr 서버 배포
- [ ] SSL 인증서 설정
- [ ] systemd 서비스 등록

### NodeRunner (T5810 × 5)

- [x] main.py (WSS 클라이언트)
- [x] executor.py (Job 실행)
- [x] recovery.py (복구 관리)
- [x] requirements.txt
- [ ] 각 T5810에 설치
- [ ] NODE_ID 설정 (node-001~005)
- [ ] NSSM 서비스 등록
- [ ] 자동 시작 설정

### 테스트

- [ ] Test 1: 초기 연결 (5대 온라인)
- [ ] Test 2: 자동 재연결
- [ ] Test 3: 멱등성
- [ ] Test 4: 하트비트 타임아웃

---

**P0 구현 완료!** 🎉  
**다음 단계**: 배포 및 Acceptance Test 실행

---

**작성**: Axon (Builder)  
**승인 대기**: Orion (Visionary)  
**날짜**: 2026-01-02
