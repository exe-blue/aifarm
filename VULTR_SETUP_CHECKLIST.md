# Vultr 서버 초기화 후 설정 체크리스트

**서버 정보**:
- IP: `158.247.210.152`
- 사용자: `root`
- 비밀번호: `<VULTR_ROOT_PASSWORD>` (⚠️ 문서/깃에 절대 기록 금지)
- 호스트명: `vultr-brain`

---

## ✅ 당신이 해야 할 작업

### 1️⃣ GitHub Secrets 설정

**GitHub 저장소 접속**:
```
https://github.com/exe-blue/doai-me/settings/secrets/actions
```

**설정할 Secrets** (2개만):

| Name | Value |
|------|-------|
| VULTR_SSH_KEY | (아래 private key 전체) |
| SUPABASE_SERVICE_KEY | `<YOUR_SUPABASE_SERVICE_ROLE_KEY>` (⚠️ service_role은 전체 권한, 절대 공개/커밋 금지) |

**VULTR_SSH_KEY 생성 방법**:

로컬에서 실행:
```bash
# SSH key pair 생성
ssh-keygen -t ed25519 -C "github-actions@doai.me" -f ~/.ssh/vultr_deploy -N ""

# Public key를 Vultr 서버에 추가 (비밀번호 입력)
ssh-copy-id -i ~/.ssh/vultr_deploy.pub root@158.247.210.152
# 비밀번호: <VULTR_ROOT_PASSWORD>

# Private key 복사 (GitHub Secrets에 등록)
cat ~/.ssh/vultr_deploy
# → 전체 내용 복사 (-----BEGIN ... END----- 포함)
```

---

### 2️⃣ Vultr 서버 초기 설정

**SSH 접속**:
```bash
ssh root@158.247.210.152
# 비밀번호: <VULTR_ROOT_PASSWORD>
```

**설정 스크립트 다운로드 및 실행**:
```bash
# Git 설치 (없다면)
apt-get update && apt-get install -y git curl

# 저장소 클론
cd /opt
git clone https://github.com/exe-blue/doai-me.git aifarm

# 초기 설정 스크립트 실행
cd aifarm
bash scripts/setup-vultr-server.sh
```

**예상 소요 시간**: 약 10분

---

### 3️⃣ Tailscale 설정 (OOB용)

**Vultr 서버에서**:
```bash
# Tailscale 인증
tailscale up --advertise-tags=tag:vultr --hostname=vultr-brain

# 브라우저에서 인증 링크 클릭
# → Tailscale Admin Console에서 승인

# IP 확인
tailscale ip -4
# → 100.x.x.x 형태의 IP 확인
```

---

### 4️⃣ Supabase 마이그레이션

**Supabase Dashboard 접속**:
```
https://supabase.com/dashboard/project/hycynmzdrngsozxdmyxi
```

**SQL Editor에서 실행**:
1. 좌측 메뉴 → **SQL Editor**
2. **New query** 클릭
3. 파일 열기: `supabase/migrations/ALL_MIGRATIONS.sql`
4. 전체 복사 (3,430줄)
5. SQL Editor에 붙여넣기
6. **Run** 클릭
7. ✅ Success 확인

**추가 Extension 활성화**:
```
Database → Extensions
→ "vector" 검색 및 활성화 (pgvector)
→ "pg_cron" 검색 및 활성화
```

---

### 5️⃣ Orchestrator 서비스 시작

**Vultr 서버에서**:
```bash
# 서비스 시작
systemctl start doai-orchestrator

# 상태 확인
systemctl status doai-orchestrator

# 로그 확인
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

---

### 6️⃣ API 테스트

```bash
# Health Check
curl https://doai.me:8443/health

# 또는 IP로
curl https://158.247.210.152:8443/health

# 예상 응답:
{
  "status": "ok",
  "service": "orchestrator",
  "version": "1.0.0-P0",
  "uptime": 123.45
}
```

---

## 🔧 자동 실행 명령어 (복사용)

```bash
# SSH 접속 (비밀번호는 여기 적지 말 것)
ssh root@158.247.210.152

# 한 번에 실행
apt-get update && \
apt-get install -y git && \
cd /opt && \
git clone https://github.com/exe-blue/doai-me.git aifarm && \
cd aifarm && \
bash scripts/setup-vultr-server.sh
```

---

## ⚠️ 주의사항

### 1. SSL 인증서

**도메인 DNS 설정 필요**:
```
A 레코드:
도메인: doai.me
값: 158.247.210.152
TTL: 300
```

**인증서가 없으면**:
- Orchestrator는 개발 모드로 실행 (HTTP, 포트 8080)
- 또는 자체 서명 인증서 사용

### 2. Tailscale

**ACL 설정** (Tailscale Admin Console):
```json
{
  "tagOwners": {
    "tag:vultr": ["autogroup:admin"],
    "tag:titan": ["autogroup:admin"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:vultr"],
      "dst": ["tag:titan:22"]
    },
    {
      "action": "accept",
      "src": ["tag:titan"],
      "dst": ["tag:vultr:8443"]
    }
  ]
}
```

### 3. Docker Compose 서비스

**Server_Vultr/.env 설정**:
```bash
cd /opt/aifarm/Server_Vultr
cp env.example .env
vi .env  # 환경 변수 설정
```

---

## 📋 체크리스트

### GitHub (로컬에서)

- [ ] GitHub Secrets 설정
  - [ ] VULTR_SSH_KEY (새로 생성한 private key)
  - [ ] SUPABASE_SERVICE_KEY (이미 있음)
- [ ] GitHub Actions 재실행

### Vultr 서버 (SSH 접속)

- [ ] SSH 접속 확인 (비밀번호)
- [ ] setup-vultr-server.sh 실행
- [ ] Tailscale 인증
- [ ] Orchestrator 서비스 시작
- [ ] API 테스트 (curl)

### Supabase (웹 브라우저)

- [ ] Dashboard 접속
- [ ] SQL Editor에서 마이그레이션 실행
- [ ] Extensions 활성화 (vector, pg_cron)
- [ ] 테이블 확인 (11개)

### 도메인 (DNS 설정)

- [ ] A 레코드: doai.me → 158.247.210.152
- [ ] SSL 인증서 발급 확인

---

## 🚀 빠른 시작 (요약)

```bash
# 1. GitHub Secrets 설정 (웹)
# → VULTR_SSH_KEY, SUPABASE_SERVICE_KEY

# 2. SSH 접속 (터미널)
ssh root@158.247.210.152

# 3. 초기 설정 실행 (Vultr 서버)
apt-get update && apt-get install -y git && \
cd /opt && git clone https://github.com/exe-blue/doai-me.git aifarm && \
cd aifarm && bash scripts/setup-vultr-server.sh

# 4. Tailscale 인증 (Vultr 서버)
tailscale up --advertise-tags=tag:vultr --hostname=vultr-brain

# 5. Supabase 마이그레이션 (웹 브라우저)
# → SQL Editor → ALL_MIGRATIONS.sql 실행

# 6. Orchestrator 시작 (Vultr 서버)
systemctl start doai-orchestrator
systemctl status doai-orchestrator

# 7. 테스트 (로컬)
curl https://doai.me:8443/health
```

---

**예상 소요 시간**: 약 30분

**도움이 필요하면 말씀해주세요!** 🚀
