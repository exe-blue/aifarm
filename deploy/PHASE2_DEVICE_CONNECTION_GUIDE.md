# Phase 2: 디바이스 연결 가이드

**생성일**: 2025-12-28
**목적**: 현장 설치 완료 후 600대 디바이스를 Vultr 서버에 연결

---

## 📋 사전 준비사항

### ✅ 확인 필요

1. **Tailscale 연결 상태**
   ```bash
   ssh root@158.247.210.152
   tailscale status
   ```
   - aifram 서버가 온라인인지 확인
   - 서브넷 라우트 승인 완료 확인

2. **현장 네트워크 설정**
   - [ ] 관리형 스위치 VLAN 10-60 설정 완료
   - [ ] AP 6대 설정 완료 (SSID, IP 범위)
   - [ ] 폰보드 600대 WiFi 연결 완료
   - [ ] 각 디바이스 ADB over WiFi 활성화 (포트 5555)

3. **서버 상태 확인**
   ```bash
   systemctl status aifarm
   curl http://localhost:8080/api/health
   ```

---

## 🔍 Step 1: 단일 디바이스 테스트

현장 네트워크의 첫 번째 디바이스로 연결을 테스트합니다.

### 1.1 Ping 테스트

```bash
ssh root@158.247.210.152

# VLAN 10의 첫 번째 디바이스
ping 10.0.10.1

# 성공하면 다른 VLAN도 테스트
ping 10.0.20.1
ping 10.0.30.1
```

**예상 결과**:
```
64 bytes from 10.0.10.1: icmp_seq=1 ttl=64 time=2.5 ms
```

**실패 시**:
- Tailscale 서브넷 라우트 승인 확인
- 현장 라우터에서 Tailscale 클라이언트 실행 확인
- 디바이스가 WiFi에 연결되어 있는지 확인

### 1.2 ADB 연결 테스트

```bash
cd /opt/aifarm
source venv/bin/activate

# 단일 디바이스 테스트
python scripts/test_adb_connection.py --ip 10.0.10.1
```

**예상 출력**:
```
============================================================
디바이스 연결 테스트: 10.0.10.1:5555
============================================================
1. ADB 연결 시도...
✅ 연결 성공

2. 디바이스 정보 확인...
  - 모델: SM-A135F
  - 제조사: samsung
  - Android 버전: 13
  - 화면 해상도: (1080, 2400)

3. 기본 명령 테스트...
  - 화면 켜기...
  - 홈 버튼...
✅ 기본 명령 성공

4. 연결 해제...
✅ 테스트 완료
============================================================
```

**실패 시**:
- 디바이스에서 `adb tcpip 5555` 실행 확인
- 방화벽에서 포트 5555 허용 확인
- IP 주소가 올바른지 확인

### 1.3 소규모 그룹 테스트

```bash
# VLAN 10의 처음 10대 테스트
python scripts/test_adb_connection.py --range 10.0.10.1 --count 10
```

**예상 결과**:
```
============================================================
테스트 결과 요약
============================================================
성공: 8/10대

실패한 IP:
  - 10.0.10.3
  - 10.0.10.7
============================================================
```

---

## 🌐 Step 2: 전체 네트워크 스캔 및 연결

모든 디바이스를 자동으로 발견하고 연결합니다.

### 2.1 디바이스 자동 발견

```bash
cd /opt/aifarm
source venv/bin/activate

# 네트워크 스캔 + ADB 연결 + Supabase 등록
python scripts/device_discovery.py
```

**실행 과정**:
```
============================================================
AIFarm 디바이스 자동 발견 시작
============================================================
네트워크 스캔 시작... (총 600개 IP)
✅ 발견: 10.0.10.1
✅ 발견: 10.0.10.2
...
총 580대 디바이스 발견

ADB 연결 시작... (580대)
✅ 연결 성공: 10.0.10.1
✅ 연결 성공: 10.0.10.2
❌ 연결 실패: 10.0.10.15
...
연결 완료: 550/580대 성공

Supabase 등록 시작... (550대)
✅ 등록: Device #1 (10.0.10.1)
✅ 등록: Device #2 (10.0.10.2)
...
============================================================
발견 완료: 550/600대
============================================================
```

**소요 시간**: 약 10-15분

**실패 디바이스 처리**:
- 실패 IP 목록을 확인
- 현장에서 해당 디바이스의 WiFi 및 ADB 설정 재확인
- 재시도:
  ```bash
  python scripts/test_adb_connection.py --ip 10.0.10.15
  ```

### 2.2 Supabase에서 확인

Supabase 대시보드 또는 API로 등록된 디바이스 확인:

```bash
curl -X GET "https://ygnmkrsmwvqkzrzazfbw.supabase.co/rest/v1/devices?select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

또는 웹 대시보드:
```
http://158.247.210.152:8080/devices
```

---

## ❤️ Step 3: 하트비트 모니터링 시작

디바이스 상태를 지속적으로 모니터링합니다.

### 3.1 하트비트 모니터 실행

```bash
cd /opt/aifarm
source venv/bin/activate

# 백그라운드 실행
nohup python scripts/heartbeat_monitor.py > logs/heartbeat.log 2>&1 &

# 또는 tmux 세션에서 실행
tmux new -s heartbeat
python scripts/heartbeat_monitor.py
# Ctrl+B, D로 detach
```

**모니터링 출력** (60초마다):
```
2025-12-28 10:00:00 - INFO - 하트비트 체크 시작...
2025-12-28 10:00:00 - INFO - 모니터링 대상: 550대
2025-12-28 10:00:15 - INFO - 상태 업데이트 완료 - 온라인: 545, 오프라인: 3, 에러: 2
```

### 3.2 systemd 서비스로 등록 (권장)

**Note**: The heartbeat service runs as the dedicated `aifarm` user for security.
Ensure the `aifarm` user exists and has necessary device access permissions.

```bash
# Create aifarm user if not exists (run once during setup)
# The user is typically created by aifarm_setup.sh
# If manual creation needed:
# sudo useradd --system --no-create-home --shell /usr/sbin/nologin aifarm
# sudo usermod -aG plugdev aifarm  # For device access if needed

cat > /etc/systemd/system/heartbeat.service << 'EOF'
[Unit]
Description=AIFarm Heartbeat Monitor
After=network.target aifarm.service

[Service]
Type=simple
User=aifarm
Group=aifarm
WorkingDirectory=/opt/aifarm
Environment=PATH=/opt/aifarm/venv/bin
ExecStart=/opt/aifarm/venv/bin/python scripts/heartbeat_monitor.py
Restart=always
RestartSec=10

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable heartbeat
systemctl start heartbeat
systemctl status heartbeat
```

---

## 📊 Step 4: 대시보드에서 확인

### 4.1 웹 대시보드 접속

```
http://158.247.210.152:8080/dashboard
```

**확인 사항**:
- [ ] 디바이스 그리드 (30×20) 표시
- [ ] 온라인/오프라인 상태 실시간 업데이트
- [ ] 총 디바이스 수 표시
- [ ] 폰보드별 그룹화

### 4.2 API로 상태 확인

```bash
# 전체 디바이스 수
curl http://158.247.210.152:8080/api/devices/stats

# 온라인 디바이스 목록
curl http://158.247.210.152:8080/api/devices?status=online

# 특정 디바이스 상태
curl http://158.247.210.152:8080/api/devices/10.0.10.1/status
```

---

## 🔧 문제 해결

### 문제 1: Tailscale 연결 안 됨

**증상**: `ping 10.0.10.1` 실패

**해결**:
```bash
# 서버에서
tailscale status
tailscale up --advertise-routes=10.0.0.0/8 --accept-routes

# Tailscale Admin Console에서
# - 서브넷 라우트 승인 확인
# - aifram 머신이 온라인인지 확인
```

### 문제 2: ADB 연결 실패

**증상**: "connection refused" 또는 "timeout"

**해결**:
1. 디바이스에서 ADB over WiFi 재활성화
   ```bash
   # 디바이스에 USB 연결 후
   adb tcpip 5555
   ```

2. 디바이스 재부팅 후 재시도

3. 방화벽 확인
   ```bash
   # 서버에서
   ufw status
   ufw allow 5555/tcp
   ```

### 문제 3: 일부 디바이스만 연결

**증상**: 600대 중 일부만 연결 성공

**해결**:
1. 실패한 IP 목록 확인
2. VLAN별로 패턴 파악
   - 특정 VLAN 전체 실패 → AP 설정 확인
   - 특정 슬롯만 실패 → 폰보드 하드웨어 확인
   - 랜덤 실패 → 개별 디바이스 설정 확인

3. 재시도 스크립트
   ```bash
   # 실패한 IP들을 파일로 저장
   echo "10.0.10.15" >> failed_ips.txt
   echo "10.0.20.3" >> failed_ips.txt

   # 재시도
   while read ip; do
     python scripts/test_adb_connection.py --ip $ip
   done < failed_ips.txt
   ```

### 문제 4: Supabase 등록 실패

**증상**: ADB 연결은 되지만 Supabase에 등록 안 됨

**해결**:
```bash
# 환경변수 확인
cat /opt/aifarm/.env | grep SUPABASE

# Supabase 연결 테스트
python -c "
from src.data.supabase_client import get_supabase_client
client = get_supabase_client()
print(client.table('devices').select('*').limit(1).execute())
"
```

---

## ✅ 성공 기준

### 최소 기준 (MVP)
- [ ] 10대 이상 디바이스 연결 성공
- [ ] `/devices` API 응답 정상
- [ ] 대시보드에서 디바이스 표시
- [ ] 하트비트 정상 동작

### 전체 기준
- [ ] 550대 이상 (90%) 연결 성공
- [ ] 하트비트 온라인율 95% 이상
- [ ] 대시보드 실시간 업데이트
- [ ] 24시간 안정 운영

---

## 📈 다음 단계

Phase 2 완료 후 → **Phase 3: 대시보드 연동**
- WebSocket 실시간 상태
- 디바이스 그리드 뷰
- 발견물 피드
- 활동별 통계

---

## 🆘 지원

문제 발생 시:
1. 로그 확인: `tail -f /opt/aifarm/logs/*.log`
2. 서비스 상태: `systemctl status aifarm heartbeat`
3. 에러 메시지 복사하여 개발 에이전트에게 전달

**완료 보고 형식**:
```
## Phase 2 완료 보고

- 발견된 디바이스: XXX/600대
- 연결 성공: XXX/600대
- Supabase 등록: XXX/600대
- 하트비트 온라인: XXX/600대
- 소요 시간: XX분

문제점:
- ...

다음 작업:
- ...
```