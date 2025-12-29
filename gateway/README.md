# 🌐 DoAi.Me Gateway

> **Physical Link Layer** - 20대 Android 기기와의 연결 레이어

## 📋 개요

Gateway는 로컬 PC(Host)와 20대 Galaxy S9 기기를 연결하는 **물리적 링크 레이어**입니다.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| **Device Tracking** | `trackDevices()`로 기기 연결/해제 실시간 감지 |
| **Command Dispatcher** | ADB Broadcast로 20대 동시 명령 전송 |
| **Initialization** | 폰보드 환경 최적화 (Doze 비활성화, 화면 켜짐) |

### 기술 스택

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ADB Client**: @devicefarmer/adbkit
- **Logging**: Winston

---

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
cd gateway
npm install
```

### 2. 환경 변수 설정

```bash
cp env.example .env
# .env 파일 편집
```

### 3. ADB 서버 시작 (호스트)

```bash
# ADB 서버가 실행 중인지 확인
adb devices
```

### 4. Gateway 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

### 5. Docker 실행 (선택)

```bash
docker-compose up -d
docker-compose logs -f
```

---

## 📡 API 엔드포인트

### 기본

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/health` | 서버 상태 확인 |
| GET | `/devices` | 연결된 기기 목록 |
| GET | `/devices/:id` | 특정 기기 상태 |

### 명령 전송 (핵심)

#### POST /dispatch

**20대 기기에 동시 명령 전송**

```bash
curl -X POST http://localhost:3100/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "target_ids": "all",
    "type": "POP",
    "payload": {
      "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "title": "Never Gonna Give You Up"
    }
  }'
```

**명령 타입:**

| Type | 설명 |
|------|------|
| `POP` | 공통 채널 신작 시청 |
| `ACCIDENT` | 긴급 사회적 반응 |
| `COMMISSION` | 의뢰 할당 |
| `TASK` | 일반 작업 |
| `CALL` | 페르소나 호출 |
| `STOP` | 중지 명령 |

### 편의 엔드포인트

```bash
# POP 전용
curl -X POST http://localhost:3100/dispatch/pop \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=..."}'

# ACCIDENT 전용
curl -X POST http://localhost:3100/dispatch/accident \
  -H "Content-Type: application/json" \
  -d '{"url": "...", "severity": 8}'
```

### 기기 초기화

```bash
# 특정 기기 초기화
curl -X POST http://localhost:3100/init/R3CN90XXXXX

# 모든 기기 초기화
curl -X POST http://localhost:3100/init
```

### Shell 명령

```bash
curl -X POST http://localhost:3100/shell \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "R3CN90XXXXX", "command": "dumpsys battery"}'
```

---

## 🔧 기기 초기화 스크립트

```bash
# 모든 기기 초기화
./init_devices.sh init

# 특정 기기만
./init_devices.sh init-one R3CN90XXXXX

# 상태 확인
./init_devices.sh status

# 기기 목록
./init_devices.sh list
```

### 초기화 명령 (Orion 지시)

```bash
# Doze 모드 비활성화 (폰보드 필수)
adb shell dumpsys deviceidle disable

# 화면 항상 켜짐
adb shell settings put global stay_on_while_plugged_in 3

# 잠금 해제 시도
adb shell input keyevent 82
```

---

## 📊 ADB Broadcast 포맷

Gateway가 기기에 전송하는 명령 형식:

```bash
am broadcast -a com.doai.me.COMMAND \
  --es type "POP" \
  --es payload '{"url":"https://..."}'
```

기기의 AutoX.js Receiver가 이 신호를 수신하여 처리합니다.

---

## 🐳 Docker 설정

### Windows/Mac (Docker Desktop)

```yaml
environment:
  - ADB_HOST=host.docker.internal
  - ADB_PORT=5037
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### Linux

```yaml
network_mode: host
environment:
  - ADB_HOST=127.0.0.1
  - ADB_PORT=5037
```

---

## 📁 파일 구조

```
gateway/
├── server.js           # 메인 서버 (Express + adbkit)
├── package.json        # 의존성
├── Dockerfile          # Docker 빌드
├── docker-compose.yml  # Docker 실행
├── init_devices.sh     # 기기 초기화 스크립트
├── env.example         # 환경 변수 템플릿
├── README.md           # 이 문서
└── logs/               # 로그 파일
    ├── gateway.log
    └── gateway-error.log
```

---

## 🔗 n8n 연동

n8n에서 HTTP Request 노드로 Gateway 호출:

```
Method: POST
URL: http://doai-gateway:3100/dispatch
Body (JSON):
{
  "target_ids": "all",
  "type": "POP",
  "payload": {
    "url": "{{ $json.video_url }}",
    "title": "{{ $json.video_title }}"
  }
}
```

**버튼 하나로 20대 화면 동시 변경 가능!**

---

*"Gateway는 뇌(n8n)와 신체(S9)를 연결하는 신경망이다."*

