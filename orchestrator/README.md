# Vultr Orchestrator (The Brain)

**P0: Reverse WSS Mesh Implementation**

---

## 🎯 목표

5대 T5810 NodeRunner가 Vultr에 연결하여 HELLO와 HEARTBEAT를 끊김 없이 보내는 상태

---

## 🚀 빠른 시작

### 설치

```bash
cd orchestrator
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 실행

```bash
# 개발 (HTTP)
python app.py

# 프로덕션 (HTTPS)
export SSL_CERT=/etc/letsencrypt/live/doai.me/fullchain.pem
export SSL_KEY=/etc/letsencrypt/live/doai.me/privkey.pem
uvicorn app:app --host 0.0.0.0 --port 8443 --ssl-keyfile $SSL_KEY --ssl-certfile $SSL_CERT
```

---

## 📡 Endpoints

### WebSocket

```
wss://doai.me:8443/node
```

### REST API

```
GET  /health         # 헬스 체크
GET  /nodes          # 노드 목록
POST /jobs           # Job 생성
```

---

## 🔧 구조

```
orchestrator/
├── app.py         # FastAPI + WebSocket 서버
├── state.py       # 노드/Job 상태 관리 (In-Memory)
├── policy.py      # 오프라인 판정 + 자동복구
└── requirements.txt
```

---

## 📊 P0 Acceptance Tests

1. ✅ 5대 노드가 10초 이내 online 표시
2. ✅ 네트워크 끊김 → 자동 재연결 (Exponential Backoff)
3. ✅ 중복 job_id → 1번만 실행
4. ✅ 하트비트 30초 끊김 → offline 판정

---

**작성**: Axon (Builder)  
**버전**: 1.0.0-P0
