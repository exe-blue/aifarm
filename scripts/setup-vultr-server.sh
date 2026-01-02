#!/bin/bash
# =============================================================================
# Vultr 서버 초기 설정 스크립트
# DoAi.Me Orchestrator 배포
#
# 서버 정보:
#   IP: 158.247.210.152
#   User: root
#   Hostname: vultr-brain
#
# 실행:
#   bash scripts/setup-vultr-server.sh
#
# @author Axon (Builder)
# @date 2026-01-02
# =============================================================================

set -e  # 에러 시 중단

echo "╔════════════════════════════════════════════════════════╗"
echo "║  DoAi.Me Vultr 서버 초기 설정                         ║"
echo "║  IP: 158.247.210.152                                  ║"
echo "║  Hostname: doai-orchestrator-1                        ║"
echo "╚════════════════════════════════════════════════════════╝"

# =============================================================================
# 1. 시스템 업데이트
# =============================================================================

echo ""
echo "📦 시스템 업데이트..."
apt-get update -qq
apt-get upgrade -y -qq

# =============================================================================
# 2. 필수 패키지 설치
# =============================================================================

echo "📦 필수 패키지 설치..."
apt-get install -y -qq \
    git \
    curl \
    wget \
    vim \
    python3 \
    python3-pip \
    python3-venv \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx \
    htop \
    net-tools \
    ufw

# =============================================================================
# 3. Docker 설정
# =============================================================================

echo "🐳 Docker 설정..."
systemctl enable docker
systemctl start docker

# Docker 그룹에 사용자 추가 (있다면)
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
fi

# =============================================================================
# 4. 호스트명 설정
# =============================================================================

echo "🏷️  호스트명 설정..."
hostnamectl set-hostname doai-orchestrator-1

# /etc/hosts 업데이트
if ! grep -q "doai-orchestrator-1" /etc/hosts; then
    echo "127.0.0.1 doai-orchestrator-1" >> /etc/hosts
fi

# =============================================================================
# 5. 디렉토리 구조 생성
# =============================================================================

echo "📁 디렉토리 구조 생성..."
mkdir -p /opt/doai
mkdir -p /opt/doai/logs
mkdir -p /opt/doai/data

# =============================================================================
# 6. Git 저장소 클론
# =============================================================================

echo "📥 Git 저장소 클론..."
if [ ! -d "/opt/doai-me/.git" ]; then
    cd /opt
    git clone https://github.com/exe-blue/doai-me.git doai-me
else
    echo "  → 이미 클론됨, 업데이트..."
    cd /opt/doai-me
    git fetch origin main
    git reset --hard origin/main
fi

# =============================================================================
# 7. Orchestrator 설정
# =============================================================================

echo "🧠 Orchestrator 설정..."
cd /opt/doai-me/orchestrator

# 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install -q --upgrade pip
pip install -q -r requirements.txt

# 환경 변수 파일 생성
cat > .env << 'EOF'
NODE_ENV=production
SUPABASE_URL=https://hycynmzdrngsozxdmyxi.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw
EOF

# =============================================================================
# 8. Let's Encrypt SSL 인증서
# =============================================================================

echo "🔒 SSL 인증서 발급..."
# 도메인이 이미 설정되어 있다고 가정
certbot certonly --standalone -d doai.me --non-interactive --agree-tos --email admin@doai.me || {
    echo "⚠️  SSL 인증서 발급 실패 (수동 설정 필요)"
}

# =============================================================================
# 9. systemd 서비스 등록
# =============================================================================

echo "⚙️  systemd 서비스 등록..."
cat > /etc/systemd/system/doai-orchestrator.service << 'EOF'
[Unit]
Description=DoAi.Me Orchestrator (The Brain)
Documentation=https://github.com/exe-blue/doai-me
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/aifarm/orchestrator

# 환경 변수
EnvironmentFile=/opt/doai-me/orchestrator/.env

# 실행
ExecStart=/opt/doai-me/orchestrator/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8443 --ssl-keyfile /etc/letsencrypt/live/doai.me/privkey.pem --ssl-certfile /etc/letsencrypt/live/doai.me/fullchain.pem

# 재시작 정책
Restart=always
RestartSec=10s

# 로그
StandardOutput=append:/opt/doai/logs/orchestrator.log
StandardError=append:/opt/doai/logs/orchestrator-error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable doai-orchestrator

# =============================================================================
# 10. 방화벽 설정
# =============================================================================

echo "🔥 방화벽 설정..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw allow 8443/tcp   # WSS
ufw reload

# =============================================================================
# 11. Tailscale 설치 (선택)
# =============================================================================

echo "🔗 Tailscale 설치..."
curl -fsSL https://tailscale.com/install.sh | sh || {
    echo "⚠️  Tailscale 설치 실패 (수동 설정 필요)"
}

# =============================================================================
# 12. Docker Compose 서비스 (기존 서비스)
# =============================================================================

echo "🐳 Docker Compose 서비스 시작..."
cd /opt/doai-me/Server_Vultr

# .env 파일 생성 (있다면)
if [ -f "env.example" ]; then
    cp env.example .env
fi

# Docker Compose 실행
docker-compose pull
docker-compose up -d

# =============================================================================
# 완료
# =============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ Vultr 서버 초기 설정 완료!                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "다음 단계:"
echo "  1. Tailscale 인증:"
echo "     tailscale up --advertise-tags=tag:vultr"
echo ""
echo "  2. Orchestrator 시작:"
echo "     systemctl start doai-orchestrator"
echo "     systemctl status doai-orchestrator"
echo ""
echo "  3. 로그 확인:"
echo "     tail -f /opt/doai/logs/orchestrator.log"
echo ""
echo "  4. API 테스트:"
echo "     curl https://doai.me:8443/health"
echo ""
echo "  5. Supabase 마이그레이션:"
echo "     https://supabase.com/dashboard/project/hycynmzdrngsozxdmyxi"
echo "     → SQL Editor → ALL_MIGRATIONS.sql 실행"
echo ""
