/**
 * PM2 Ecosystem Configuration
 * AIFarm Backend Server
 */

module.exports = {
  apps: [{
    name: 'aifarm-api',
    cwd: '/opt/aifarm',
    script: 'venv/bin/uvicorn',
    args: 'main:app --host 0.0.0.0 --port 8000',
    interpreter: 'none',
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/aifarm/error.log',
    out_file: '/var/log/aifarm/out.log',
    log_file: '/var/log/aifarm/combined.log',
    time: true,
    
    // 재시작 정책
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // 환경 변수 (실제 값은 .env 파일에서 로드)
    env_production: {
      NODE_ENV: 'production',
      DEBUG: 'false'
    },
    env_development: {
      NODE_ENV: 'development',
      DEBUG: 'true'
    }
  }]
};

