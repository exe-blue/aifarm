# ============================================
# DoAi.Me Orchestrator (The Brain)
# ============================================
# 역할: 600대 노드 총괄 제어
# - WSS 서버: wss://doai.me:8443/node
# - Activity #4: Open Injection API
# - Activity #1: CCTV Grid API
# ============================================

FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 복사
COPY . .

# 환경 변수
ENV PORT=8443
ENV LOG_LEVEL=INFO

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE 8443

# 프로덕션에서는 SSL 인증서 마운트 필요
# -v /etc/letsencrypt:/etc/letsencrypt:ro
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8443"]
