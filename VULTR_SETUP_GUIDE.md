# Vultr 서버 설정 단계별 가이드

**서버 정보**:
- IP: `158.247.210.152`
- 사용자: `root`
- 비밀번호: `<VULTR_ROOT_PASSWORD>` (⚠️ 문서/깃에 절대 기록 금지)
- 호스트명: `doai-orchestrator-1`
- 저장소: `github.com/exe-blue/doai-me`

---

## 📋 전체 단계 (6단계)

```
✅ 1단계: SSH 접속 (완료)
✅ 2단계: Git 클론 (완료)
⏳ 3단계: 초기 설정 실행
⏳ 4단계: Supabase 마이그레이션
⏳ 5단계: Orchestrator 시작
⏳ 6단계: 테스트
```

---

## 3단계: 초기 설정 실행 ⭐ 현재 단계

### SSH에서 실행

```bash
# 현재 위치 확인
pwd
# → /opt/doai-me 인지 확인

# 설정 스크립트 실행
cd /opt/doai-me
bash scripts/setup-vultr-server.sh
```

**예상 시간**: 10분

**예상 출력**:
```
╔════════════════════════════════════════════════════════╗
║  DoAi.Me Vultr 서버 초기 설정                         ║
║  IP: 158.247.210.152                                  ║
║  Hostname: doai-orchestrator-1                        ║
╚════════════════════════════════════════════════════════╝

📦 시스템 업데이트...
📦 필수 패키지 설치...
🐳 Docker 설정...
🏷️  호스트명 설정...
📁 디렉토리 구조 생성...
📥 Git 저장소 클론...
  → 이미 클론됨, 업데이트...
🧠 Orchestrator 설정...
🔒 SSL 인증서 발급...
⚙️  systemd 서비스 등록...
🔥 방화벽 설정...
🔗 Tailscale 설치...
🐳 Docker Compose 서비스 시작...

╔════════════════════════════════════════════════════════╗
║  ✅ Vultr 서버 초기 설정 완료!                        ║
╚════════════════════════════════════════════════════════╝
```

**에러 발생 시**:
```bash
# 에러 확인
cat /opt/doai/logs/setup.log

# 수동으로 단계별 실행 (아래 "수동 설정" 참고)
```

---

## 4단계: Supabase 마이그레이션

### 웹 브라우저에서 실행

**1. Dashboard 접속**:
```
https://supabase.com/dashboard/project/hycynmzdrngsozxdmyxi
```

**2. SQL Editor 열기**:
- 좌측 메뉴 → **SQL Editor**
- **New query** 클릭

**3. 마이그레이션 실행**:
- 로컬에서 파일 열기: `supabase/migrations/ALL_MIGRATIONS.sql`
- 전체 복사 (⌘+A, ⌘+C) - 3,430줄
- SQL Editor에 붙여넣기 (⌘+V)
- **Run** 클릭
- ✅ Success 확인 (약 30초 소요)

**4. Extensions 활성화**:
```
Database → Extensions

검색 및 활성화:
- "vector" (pgvector)
- "pg_cron" (Cron Jobs)
```

**예상 시간**: 5분

---

## 5단계: Orchestrator 시작

### SSH에서 실행

```bash
# Orchestrator 서비스 시작
systemctl start doai-orchestrator

# 상태 확인
systemctl status doai-orchestrator

# 로그 확인 (실시간)
tail -f /opt/doai/logs/orchestrator.log
```

**예상 로그**:
```
[INFO] ╔════════════════════════════════════════════════════════╗
[INFO] ║  Vultr Orchestrator (The Brain)                      ║
[INFO] ║  P0: Reverse WSS Mesh + Emergency Recovery            ║
[INFO] ╚════════════════════════════════════════════════════════╝
[INFO] 🔍 정책 엔진 시작 (감시 루프)
[INFO] 🤖 자동 복구 엔진 시작 (30초 간격)
```

**에러 발생 시**:
```bash
# 에러 로그 확인
tail -100 /opt/doai/logs/orchestrator-error.log

# 수동 실행 (디버깅)
cd /opt/doai-me/orchestrator
source venv/bin/activate
python app.py
```

**예상 시간**: 2분

---

## 6단계: API 테스트

### 로컬 터미널에서 실행

```bash
# Health Check (IP)
curl https://158.247.210.152:8443/health

# 또는 도메인 (DNS 설정 후)
curl https://doai.me:8443/health

# 예상 응답:
{
  "status": "ok",
  "service": "orchestrator",
  "version": "1.0.0-P0",
  "uptime": 12.34
}
```

**노드 목록 확인**:
```bash
curl https://158.247.210.152:8443/nodes

# 예상 응답:
{
  "nodes": []  # 아직 NodeRunner 연결 안됨
}
```

**예상 시간**: 1분

---

## 🔧 수동 설정 (3단계에서 에러 시)

### 3-1. 시스템 업데이트

```bash
apt-get update
apt-get upgrade -y
```

### 3-2. 패키지 설치

```bash
apt-get install -y \
    git curl wget vim \
    python3 python3-pip python3-venv \
    docker.io docker-compose \
    nginx certbot python3-certbot-nginx
```

### 3-3. 호스트명 설정

```bash
hostnamectl set-hostname doai-orchestrator-1
echo "127.0.0.1 doai-orchestrator-1" >> /etc/hosts
```

### 3-4. Git 저장소 업데이트

```bash
cd /opt/doai-me
git fetch origin main
git reset --hard origin/main
```

### 3-5. Orchestrator 설치

```bash
cd /opt/doai-me/orchestrator

# 가상환경
python3 -m venv venv
source venv/bin/activate

# 의존성
pip install -r requirements.txt

# 환경 변수
cat > .env << 'EOF'
NODE_ENV=production
SUPABASE_URL=https://hycynmzdrngsozxdmyxi.supabase.co
SUPABASE_SERVICE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
EOF
```

### 3-6. SSL 인증서 (선택)

```bash
# DNS가 설정되어 있어야 함
certbot certonly --standalone -d doai.me --non-interactive --agree-tos --email admin@doai.me

# 또는 자체 서명 인증서 (테스트용)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/doai-selfsigned.key \
  -out /etc/ssl/certs/doai-selfsigned.crt \
  -subj "/CN=doai.me"
```

### 3-7. systemd 서비스

```bash
cat > /etc/systemd/system/doai-orchestrator.service << 'EOF'
[Unit]
Description=DoAi.Me Orchestrator
After=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/doai-me/orchestrator
EnvironmentFile=/opt/doai-me/orchestrator/.env
ExecStart=/opt/doai-me/orchestrator/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8443 --ssl-keyfile /etc/letsencrypt/live/doai.me/privkey.pem --ssl-certfile /etc/letsencrypt/live/doai.me/fullchain.pem
Restart=always
RestartSec=10s
StandardOutput=append:/opt/doai/logs/orchestrator.log
StandardError=append:/opt/doai/logs/orchestrator-error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable doai-orchestrator
```

### 3-8. 방화벽

```bash
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8443/tcp
ufw reload
```

---

## 🚀 빠른 재시작 (이미 설정된 경우)

```bash
# SSH 접속
ssh root@158.247.210.152

# 코드 업데이트
cd /opt/doai-me
git pull origin main

# Orchestrator 재시작
systemctl restart doai-orchestrator
systemctl status doai-orchestrator

# 로그 확인
tail -f /opt/doai/logs/orchestrator.log
```

---

## 💡 현재 상황에 맞는 명령어

### 당신의 현재 상태

```
✅ 1단계: SSH 접속 완료
✅ 2단계: /opt/doai-me로 Git 클론 완료
⏳ 3단계: 설정 스크립트 실행 필요
```

### 지금 실행할 명령어

**SSH에 접속한 상태에서**:

```bash
# 위치 확인
cd /opt/doai-me

# 최신 코드 가져오기
git pull origin main

# 설정 스크립트 실행
bash scripts/setup-vultr-server.sh
```

**에러가 나면**:

```bash
# 로그 확인
ls -la /opt/doai/logs/

# 수동으로 단계별 실행 (위 "수동 설정" 섹션 참고)
```

---

## 📞 문제 해결

### 문제: "permission denied"

```bash
# 실행 권한 추가
chmod +x scripts/setup-vultr-server.sh
bash scripts/setup-vultr-server.sh
```

### 문제: "command not found"

```bash
# Git 설치
apt-get update
apt-get install -y git

# 다시 시도
```

### 문제: SSL 인증서 실패

```bash
# 일단 HTTP로 실행 (테스트용)
cd /opt/doai-me/orchestrator
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8080
```

---

**다음 단계**: 위의 3단계 명령어를 SSH에서 실행하세요! 🚀
