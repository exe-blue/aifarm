# NodeRunner (T5810 Gateway - The Muscle)

**P0: Reverse WSS Client Implementation**

---

## 🎯 목표

Vultr Orchestrator에 연결하여 명령을 수신하고 실행하는 Dumb Node

---

## 🚀 빠른 시작

### 설치

```bash
cd noderunner
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 실행

```bash
# 환경 변수 설정
export NODE_ID="node-001"
export WSS_SERVER_URL="wss://doai.me:8443/node"
export HEARTBEAT_INTERVAL="10"

# 실행
python main.py
```

### Windows 서비스화

```bash
# NSSM 사용 (권장)
nssm install DoAiNodeRunner "C:\Python\python.exe" "C:\noderunner\main.py"
nssm set DoAiNodeRunner AppDirectory "C:\noderunner"
nssm set DoAiNodeRunner AppEnvironmentExtra NODE_ID=node-001
nssm start DoAiNodeRunner
```

---

## 🔧 구조

```
noderunner/
├── main.py        # WSS 클라이언트 + 메시지 루프
├── executor.py    # Job 실행 (Laixi/ADB 호출)
├── recovery.py    # 복구 관리
└── requirements.txt
```

---

## 📨 메시지 프로토콜

### 송신

1. **HELLO** (최초 1회)
2. **HEARTBEAT** (10초마다)
3. **JOB_ACK** (Job 수신 즉시)
4. **JOB_RESULT** (Job 완료 시)

### 수신

1. **HELLO_ACK** (인증 확인)
2. **JOB_ASSIGN** (작업 할당)

---

## 🔄 재연결 로직

```
Exponential Backoff:
1초 → 2초 → 4초 → 8초 → 16초 → 32초 (최대 30초)

최대 10회 시도 후 종료
```

---

**작성**: Axon (Builder)  
**버전**: 1.0.0-P0
