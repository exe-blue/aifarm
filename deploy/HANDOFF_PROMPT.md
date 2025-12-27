# AIFarm 600대 관리 시스템 - 핸드오프 프롬프트

> **⚠️ Configuration Note**: This document uses placeholders (e.g., `${SERVER_IP}`, `${REPO_ROOT}`) for environment-specific values.
> Actual values should be stored in `deploy/deploy.env` or your team's secret manager. Never hardcode sensitive values in documentation.

## 프로젝트 개요
- **프로젝트명**: AIFarm 600대 폰보드 관리 시스템
- **목표**: 600대의 안드로이드 디바이스를 원격으로 관리하고 YouTube 자동화 작업 수행
- **서버**: Vultr VPS (`${SERVER_IP}` - see `deploy/deploy.env` or team secret manager)
- **아키텍처**: 중앙 서버(Vultr) ↔ 현장 네트워크(6개 AP, 각 100대)

---

## 완료된 작업 (개발)

### 1. Vultr 서버 초기 설정 ✅
- **서버 정보**:
  - IP: See team secret manager or deploy.env (do not hardcode in docs)
  - OS: Ubuntu (latest LTS)
  - 사용자: `deploy` (dedicated non-root user recommended)
  - 인증: SSH key authentication (see team secret manager for credentials)
  - **Note**: Avoid using root for deployments. Create a dedicated deploy user with sudo access.
- **설치 완료 항목**:
  - Python 3.11 + venv
  - Git, curl, wget, htop, tmux, nginx
  - UFW 방화벽 (포트 22, 8080, 5555 오픈)
  - systemd 서비스 등록 및 자동 시작 설정

### 2. AIFarm 프로젝트 배포 ✅
- **설치 경로**: `/opt/aifarm`
- **프로젝트 구조**:
  ```
  /opt/aifarm/
  ├── venv/                    # Python 가상환경
  ├── run_intranet.py          # 메인 실행 파일
  ├── requirements.txt         # Python 의존성
  ├── .env                     # 환경변수 설정
  ├── src/
  │   ├── web/                 # FastAPI 웹 서버
  │   ├── controller/          # 디바이스 제어
  │   ├── agent/               # 활동 관리 및 스케줄링
  │   └── automation/          # YouTube 자동화
  └── ...
  ```

- **환경변수 설정** (`.env`):
  ```
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_KEY=your-anon-key-here
  HOST=0.0.0.0
  PORT=8080
  MAX_WORKERS=100
  MAX_DEVICES=600
  ADB_PORT=5555
  ```

### 3. 시스템 서비스 등록 ✅
- **서비스명**: `aifarm.service`
- **상태**: Active (running)
- **자동 시작**: 활성화됨
- **실행 명령**: `/opt/aifarm/venv/bin/python run_intranet.py`

### 4. 웹 서버 구동 확인 ✅
- **접속 URL** (replace `${SERVER_IP}` with actual value from `deploy/deploy.env`):
  - 메인: http://${SERVER_IP}:8080/
  - 대시보드: http://${SERVER_IP}:8080/dashboard
  - API 문서: http://${SERVER_IP}:8080/api/docs
- **상태**: 정상 동작 확인 완료

### 5. 배포 스크립트 작성 ✅
- **파일**: [deploy/vultr_setup.sh](deploy/vultr_setup.sh)
- **기능**: 서버 초기화부터 서비스 등록까지 자동화
- **주요 단계**:
  1. 시스템 업데이트
  2. 필수 패키지 설치
  3. 프로젝트 클론 (GitHub)
  4. Python 가상환경 및 의존성 설치
  5. 방화벽 설정
  6. systemd 서비스 등록

---

## 다음 단계 (기획/개발)

### Phase 1: 현장 네트워크 인프라 구성 (기획 → 개발)

#### 1.1 네트워크 설계 검토 (조사 및 분석)
**담당**: 조사 및 분석 에이전트

**작업 내용**:
- 현장 네트워크 토폴로지 최종 확인
- 관리형 스위치 모델 및 설정 방법 조사
- TP-Link EAP-673 AP 사양 및 최적 설정 검증
- VLAN 설정 베스트 프랙티스 조사
- 600대 디바이스를 위한 IP 주소 체계 검토

**산출물**:
- 네트워크 다이어그램
- 스위치/AP 설정 가이드 (상세)
- IP 할당 테이블 (VLAN별)

#### 1.2 네트워크 장비 설정 (개발)
**담당**: 개발 에이전트

**작업 내용**:
```
관리형 스위치 설정:
- VLAN 10-60 생성 (각 AP별)
- 트랑크 포트 설정 (AP 연결용)
- 업링크 포트 설정

AP 설정 (6대):
┌────┬─────────────┬──────┬──────┬─────────────────┐
│ AP │ SSID        │ VLAN │ 채널 │ IP 범위         │
├────┼─────────────┼──────┼──────┼─────────────────┤
│ 1  │ AIFARM-AP1  │ 10   │ 36   │ 10.0.10.1-100   │
│ 2  │ AIFARM-AP2  │ 20   │ 52   │ 10.0.20.1-100   │
│ 3  │ AIFARM-AP3  │ 30   │ 100  │ 10.0.30.1-100   │
│ 4  │ AIFARM-AP4  │ 40   │ 116  │ 10.0.40.1-100   │
│ 5  │ AIFARM-AP5  │ 50   │ 132  │ 10.0.50.1-100   │
│ 6  │ AIFARM-AP6  │ 60   │ 149  │ 10.0.60.1-100   │
└────┴─────────────┴──────┴──────┴─────────────────┘

DHCP 서버 설정:
- 각 VLAN별 DHCP 범위 설정
- DNS 서버: 8.8.8.8, 8.8.4.4
- 게이트웨이 설정
```

**확인 사항**:
- [ ] 각 AP의 WiFi 신호 강도 측정
- [ ] VLAN 간 통신 차단 확인
- [ ] DHCP 정상 동작 확인

---

### Phase 2: 서버 ↔ 현장 네트워크 연결 (개발)

#### 2.1 VPN 솔루션 선택 및 구현 (기획 → 개발)
**담당**: 기획 → 개발 에이전트

**Option A: Tailscale (권장)**
```bash
# Vultr 서버
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --advertise-routes=10.0.0.0/8 --accept-routes

# 현장 라우터/PC
tailscale up --accept-routes
```

**Option B: WireGuard**
- 보안성 높음
- 설정 복잡도 중간

**Option C: 포트포워딩 (비권장)**
- 보안 위험 있음
- 간단하지만 프로덕션 부적합

**선택 기준**:
- 관리 편의성
- 보안성
- 비용
- 확장성

#### 2.2 연결 테스트 (개발)
```bash
# Vultr 서버에서 현장 디바이스 Ping 테스트
ping 10.0.10.1
ping 10.0.20.1
...

# ADB 연결 테스트
adb connect 10.0.10.1:5555
```

---

### Phase 3: 폰보드 600대 설정 (개발)

#### 3.1 폰보드 초기 설정 자동화 스크립트 (개발)
**담당**: 개발 에이전트

**작업 내용**:
- WiFi 자동 연결 스크립트
- ADB over WiFi 활성화 스크립트
- 디바이스 등록 자동화

**예상 스크립트**:
```python
# aifarm/scripts/device_bulk_setup.py
# 100대씩 배치로 처리
# - WiFi 연결 확인
# - ADB 5555 포트 활성화
# - Supabase에 디바이스 정보 등록
```

#### 3.2 대량 연결 테스트 (개발)
```python
# 단계적 테스트
1. 10대 연결 테스트
2. 50대 연결 테스트
3. 100대 연결 테스트
4. 600대 전체 연결 테스트

# 성능 모니터링
- CPU/메모리 사용량
- 네트워크 대역폭
- 응답 시간
```

---

### Phase 4: Supabase 데이터베이스 설정 (개발)

#### 4.1 Supabase 프로젝트 생성 (기획 → 개발)
**담당**: 기획 → 개발 에이전트

**작업 내용**:
1. Supabase 프로젝트 생성
2. 데이터베이스 스키마 설계 및 구현
3. API 키 발급
4. `.env` 파일 업데이트

**필요 테이블**:
```sql
-- devices: 디바이스 정보
-- tasks: 작업 정보
-- results: 작업 결과
-- schedules: 스케줄 정보
-- logs: 로그 데이터
```

#### 4.2 환경변수 업데이트 (개발)
```bash
# 서버에서 실행 (using SSH key with deploy user)
# Replace ${SERVER_IP} with actual value from deploy/deploy.env
ssh -i ~/.ssh/id_ed25519_aifarm deploy@${SERVER_IP}

# Edit environment file (requires sudo for /opt directory)
sudo nano /opt/aifarm/.env

# SUPABASE_URL과 SUPABASE_KEY 업데이트
sudo systemctl restart aifarm
```

---

### Phase 5: 활동 스케줄링 및 모니터링 (개발)

#### 5.1 스케줄러 설정 (개발)
**담당**: 개발 에이전트

**작업 내용**:
```python
# 600대를 시간대별로 분산
# - 각 디바이스의 활동 패턴 다양화
# - 휴식 시간 랜덤화
# - YouTube 시청 패턴 자연스럽게 설정
```

#### 5.2 대시보드 개선 (개발)
- 실시간 디바이스 상태 모니터링
- 작업 진행률 시각화
- 에러 로그 수집 및 알림

---

## 기술 스택 정리

### 서버 (Vultr)
- OS: Ubuntu
- Python: 3.11
- Web Framework: FastAPI + Uvicorn
- Database Client: Supabase Python SDK
- Process Manager: systemd

### 현장 네트워크
- 관리형 스위치: (모델 TBD)
- WiFi AP: TP-Link EAP-673 × 6대
- VLAN: 10-60 (6개)
- IP Range: 10.0.10-60.0/24

### 디바이스 제어
- ADB (Android Debug Bridge)
- ADB over WiFi (포트 5555)
- HID Input Control

### 데이터베이스
- Supabase (PostgreSQL)

---

## 주요 참고 문서

> **Note**: All paths below are relative to the repository root (`${REPO_ROOT}`).

1. [deploy/vultr_setup.sh](deploy/vultr_setup.sh) - 서버 설정 스크립트
2. [.env.example](.env.example) - 환경변수 템플릿
3. [aifarm/run_intranet.py](aifarm/run_intranet.py) - 메인 실행 파일
4. [docs/ARCHITECTURE_SIMPLE.md](docs/ARCHITECTURE_SIMPLE.md) - 아키텍처 문서

---

## 즉시 실행 가능한 명령어

### 서버 접속

**⚠️ Security Best Practice: Use SSH key authentication instead of passwords.**

```bash
# Recommended: SSH key-based authentication
ssh -i ~/.ssh/id_ed25519_aifarm deploy@YOUR_SERVER_IP

# If password is required, see team secret manager for credentials
# Do NOT store passwords in documentation or version control
```

**Setting up SSH key authentication:**
```bash
# Generate key (local machine)
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_aifarm

# Copy to server (one-time setup)
ssh-copy-id -i ~/.ssh/id_ed25519_aifarm.pub deploy@YOUR_SERVER_IP
```

### 서비스 관리
```bash
systemctl status aifarm    # 상태 확인
systemctl restart aifarm   # 재시작
systemctl stop aifarm      # 중지
systemctl start aifarm     # 시작
```

### 로그 확인
```bash
# 시스템 로그 확인 (journalctl 미설치 시)
cat /var/log/syslog | grep aifarm

# 또는 직접 실행하여 로그 확인
cd /opt/aifarm
source venv/bin/activate
python run_intranet.py
```

### 환경변수 수정
```bash
nano /opt/aifarm/.env
systemctl restart aifarm
```

---

## 문제 해결 가이드

### 서비스가 시작되지 않을 때
```bash
# 1. 포트 충돌 확인
lsof -i :8080

# 2. Python 프로세스 확인
ps aux | grep python

# 3. 수동 실행하여 에러 확인
cd /opt/aifarm
source venv/bin/activate
python run_intranet.py
```

### 포트가 이미 사용 중일 때
```bash
# 서비스 재시작
systemctl restart aifarm
```

### 의존성 설치 문제
```bash
cd /opt/aifarm
source venv/bin/activate
pip install -r requirements.txt
```

---

## 다음 에이전트 할당 제안

### 1. 조사 및 분석 에이전트
- **작업**: 네트워크 장비 사양 조사 및 설정 가이드 작성
- **우선순위**: 높음
- **예상 소요 시간**: 2-3시간

### 2. 기획 에이전트
- **작업**: VPN 솔루션 비교 및 선택, Supabase 스키마 설계
- **우선순위**: 높음
- **예상 소요 시간**: 3-4시간

### 3. 개발 에이전트
- **작업**: 네트워크 설정, 폰보드 자동화 스크립트 개발
- **우선순위**: 중간 (네트워크 설계 완료 후)
- **예상 소요 시간**: 5-7시간

---

## 현재 블로커

1. ❗ **Supabase 미설정**: SUPABASE_URL 및 SUPABASE_KEY가 placeholder 상태
2. ❗ **현장 네트워크 미구성**: 물리적 장비 설치 필요
3. ❗ **폰보드 미연결**: 600대 디바이스의 WiFi 및 ADB 설정 필요

---

## 최종 목표 확인

✅ 완료: Vultr 서버 설정 및 웹 서버 구동
🔄 진행 중: 문서화 및 핸드오프
⏳ 대기: 현장 네트워크 구성
⏳ 대기: 디바이스 연결 및 테스트
⏳ 대기: 600대 전체 운영 시작

---

**생성일**: 2025-12-28
**작성자**: Claude (개발 에이전트)
**다음 담당**: 조사 및 분석 / 기획 에이전트