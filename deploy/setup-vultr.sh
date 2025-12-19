#!/bin/bash
# ================================================
# AIFarm Vultr 서버 자동 설정 스크립트
# 사용법: SSH 접속 후 이 스크립트 실행
# ================================================

set -e  # 오류 발생 시 중단

echo "================================================"
echo "  AIFarm Backend Server Setup"
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 진행 상황 출력 함수
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 1. 시스템 업데이트
echo ""
echo "1. 시스템 업데이트 중..."
apt update && apt upgrade -y
print_status "시스템 업데이트 완료"

# 2. 필수 패키지 설치
echo ""
echo "2. 필수 패키지 설치 중..."
apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git curl htop
print_status "필수 패키지 설치 완료"

# 3. Node.js 및 PM2 설치
echo ""
echo "3. Node.js 및 PM2 설치 중..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
print_status "Node.js 및 PM2 설치 완료"

# 4. 프로젝트 디렉토리 설정
echo ""
echo "4. 프로젝트 디렉토리 설정 중..."
mkdir -p /opt/aifarm
mkdir -p /var/log/aifarm
print_status "프로젝트 디렉토리 생성 완료"

# 5. Python 가상환경 생성
echo ""
echo "5. Python 가상환경 설정 중..."
cd /opt/aifarm
python3 -m venv venv
source venv/bin/activate
print_status "Python 가상환경 생성 완료"

# 6. Python 패키지 설치
echo ""
echo "6. Python 패키지 설치 중..."
pip install --upgrade pip
pip install fastapi uvicorn supabase python-dotenv pydantic httpx aiohttp websockets
print_status "Python 패키지 설치 완료"

# 7. 방화벽 설정
echo ""
echo "7. 방화벽 설정 중..."
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 8000
ufw --force enable
print_status "방화벽 설정 완료"

# 8. PM2 자동 시작 설정
echo ""
echo "8. PM2 자동 시작 설정 중..."
pm2 startup systemd -u root --hp /root
print_status "PM2 자동 시작 설정 완료"

echo ""
echo "================================================"
echo -e "${GREEN}  기본 설정이 완료되었습니다!${NC}"
echo "================================================"
echo ""
echo "다음 단계:"
echo "  1. /opt/aifarm/.env 파일 생성 (env.example.txt 참고)"
echo "  2. /opt/aifarm/main.py 파일 배포"
echo "  3. /etc/nginx/sites-available/aifarm 설정"
echo "  4. pm2 start ecosystem.config.js 실행"
echo ""

