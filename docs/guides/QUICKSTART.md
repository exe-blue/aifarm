# 🚀 DoAi.Me Quick Start Guide

> 최초 사용자를 위한 기기 연결 및 워크로드 실행 가이드

---

## 📋 목차

1. [사전 요구사항](#1-사전-요구사항)
2. [환경 설정](#2-환경-설정)
3. [Laixi 설정](#3-laixi-설정)
4. [기기 연결](#4-기기-연결)
5. [기기 등록](#5-기기-등록)
6. [워크로드 실행](#6-워크로드-실행)
7. [모니터링](#7-모니터링)
8. [문제 해결](#8-문제-해결)

---

## 1. 사전 요구사항

### 하드웨어

| 항목 | 최소 사양 | 권장 사양 |
|------|----------|----------|
| PC (워크스테이션) | Windows 10, i5, 16GB RAM | Windows 11, i7, 32GB RAM |
| USB 허브 | USB 2.0 20포트 | USB 3.0 20포트 (전원 공급) |
| 폰보드 | 20슬롯 충전 보드 | 개별 전원 공급 보드 |
| Android 기기 | Galaxy S8 이상 | Galaxy S9 (권장) |

### 소프트웨어

```
✓ Python 3.11+
✓ Node.js 20+
✓ ADB (Android Debug Bridge)
✓ Laixi.exe (Windows 전용)
✓ Docker & Docker Compose (선택)
```

### 네트워크

- 안정적인 인터넷 연결
- Tailscale VPN 계정 (클라우드 연동 시)
- VLAN 구성 (대규모 배포 시 권장)

---

## 2. 환경 설정

### 2.1 저장소 클론

```bash
git clone https://github.com/exe-blue/doai-me.git
cd doai-me
```

### 2.2 Python 환경 설정

```bash
# 가상 환경 생성
python -m venv venv

# 활성화 (Windows)
venv\Scripts\activate

# 활성화 (Linux/Mac)
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### 2.3 환경 변수 설정

```bash
# .env 파일 생성
cp env.example .env
```

`.env` 파일 수정:

```env
# Supabase 설정 (필수)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Laixi 설정 (기본값 사용 가능)
LAIXI_WS_URL=ws://127.0.0.1:22221/
LAIXI_TIMEOUT=10

# 워크스테이션 ID (각 PC마다 다르게 설정)
WORKSTATION_ID=WS01
```

---

## 3. Laixi 설정

### 3.1 Laixi 설치

1. Laixi 설치 파일 실행
2. 기본 경로에 설치: `C:\Program Files\Laixi\`
3. 바탕화면 바로가기 생성

### 3.2 Laixi 실행

```
1. Laixi.exe 실행
2. 메인 화면에서 "시작" 버튼 클릭
3. WebSocket 서버 시작됨 (포트 22221)
```

### 3.3 연결 확인

```python
# Python으로 Laixi 연결 테스트
python -c "
import asyncio
from shared.laixi_client import LaixiClient

async def test():
    client = LaixiClient()
    if await client.connect():
        print('✓ Laixi 연결 성공!')
        devices = await client.list_devices()
        print(f'  연결된 기기: {len(devices)}대')
        await client.disconnect()
    else:
        print('✗ Laixi 연결 실패')

asyncio.run(test())
"
```

---

## 4. 기기 연결

### 4.1 ADB 설정

```bash
# ADB 설치 확인
adb version

# ADB 서버 시작
adb start-server

# 연결된 기기 확인
adb devices
```

### 4.2 Android 기기 준비

각 Galaxy S9에서:

```
1. 설정 → 휴대전화 정보 → 소프트웨어 정보
2. "빌드 번호" 7번 탭 → 개발자 모드 활성화
3. 설정 → 개발자 옵션
   ✓ USB 디버깅 활성화
   ✓ USB 디버깅 권한 부여 (팝업에서 "항상 허용")
```

### 4.3 USB 연결

```
1. USB 케이블로 PC에 연결
2. "USB 디버깅 허용?" 팝업에서 "확인"
3. "이 컴퓨터를 항상 허용" 체크
```

### 4.4 연결 확인

```bash
# 모든 기기 목록
adb devices -l

# 예상 출력:
# List of devices attached
# ABC123456789    device usb:1-1 product:dream2lte model:SM_G965N device:dream2lte
# DEF987654321    device usb:1-2 product:dream2lte model:SM_G965N device:dream2lte
```

---

## 5. 기기 등록

### 5.1 단일 기기 등록

```python
import asyncio
from shared.device_registry import get_device_registry

async def register_single():
    registry = get_device_registry()
    
    # 기기 등록 (WS01-PB01-S01)
    device = await registry.register_device(
        serial="ABC123456789",   # ADB 시리얼
        workstation="WS01",      # 워크스테이션 ID
        board=1,                 # 폰보드 번호 (1-3)
        slot=1,                  # 슬롯 번호 (1-20)
        model="Galaxy S9"        # 모델명 (선택)
    )
    
    print(f"등록 완료: {device.hierarchy_id}")
    # 출력: 등록 완료: WS01-PB01-S01

asyncio.run(register_single())
```

### 5.2 대량 기기 등록

```python
import asyncio
import subprocess
from shared.device_registry import get_device_registry

async def register_all_devices():
    """ADB로 연결된 모든 기기를 자동 등록"""
    registry = get_device_registry()
    
    # ADB 기기 목록 가져오기
    result = subprocess.run(['adb', 'devices'], capture_output=True, text=True)
    lines = result.stdout.strip().split('\n')[1:]
    
    devices = []
    slot = 1
    
    for line in lines:
        if '\tdevice' in line:
            serial = line.split('\t')[0]
            
            # 모델명 조회
            model_result = subprocess.run(
                ['adb', '-s', serial, 'shell', 'getprop', 'ro.product.model'],
                capture_output=True, text=True
            )
            model = model_result.stdout.strip() or "Unknown"
            
            devices.append({
                "serial": serial,
                "workstation": "WS01",  # 현재 워크스테이션
                "board": 1,             # 현재 폰보드
                "slot": slot,
                "model": model
            })
            slot += 1
    
    # 일괄 등록
    registered = await registry.bulk_register_devices(devices)
    print(f"{len(registered)}대 기기 등록 완료!")

asyncio.run(register_all_devices())
```

### 5.3 등록 확인

```python
import asyncio
from shared.device_registry import get_device_registry

async def check_devices():
    registry = get_device_registry()
    
    # 내 워크스테이션 기기 조회
    devices = await registry.get_devices(workstation_id="WS01")
    
    print(f"총 {len(devices)}대 등록됨:")
    for d in devices:
        print(f"  {d.hierarchy_id}: {d.model} ({d.status})")

asyncio.run(check_devices())
```

---

## 6. 워크로드 실행

### 6.1 워크로드 생성

```python
import asyncio
from shared.workload_engine import get_workload_engine
from shared.schemas.workload import WorkloadCreate, BatchConfig

async def create_workload():
    engine = get_workload_engine()
    
    # 워크로드 생성
    workload = await engine.create_workload(WorkloadCreate(
        name="테스트 워크로드",
        video_ids=[
            "uuid-of-video-1",  # videos 테이블의 ID
            "uuid-of-video-2",
        ],
        batch_config=BatchConfig(
            batch_size_percent=50,       # 50%씩 실행
            batch_interval_seconds=60,   # 배치 간 60초 대기
            cycle_interval_seconds=300   # 영상 간 5분 대기
        )
    ))
    
    print(f"워크로드 생성: {workload.id}")
    return workload.id

workload_id = asyncio.run(create_workload())
```

### 6.2 워크로드 실행

```python
import asyncio
from shared.workload_engine import get_workload_engine

async def start_workload(workload_id: str):
    engine = get_workload_engine()
    
    # 실행 시작
    success = await engine.start_workload(workload_id)
    
    if success:
        print("워크로드 실행 시작!")
    else:
        print("워크로드 실행 실패")

asyncio.run(start_workload(workload_id))
```

### 6.3 상태 확인

```python
import asyncio
from shared.workload_engine import get_workload_engine

async def check_status(workload_id: str):
    engine = get_workload_engine()
    
    status = await engine.get_workload_status(workload_id)
    
    if status:
        wl = status['workload']
        print(f"상태: {wl['status']}")
        print(f"진행: {wl['completed_tasks']}/{wl['total_tasks']}")
        print(f"현재 영상: {wl['current_video_index'] + 1}/{len(wl['video_ids'])}")

asyncio.run(check_status(workload_id))
```

---

## 7. 모니터링

### 7.1 Web Dashboard

```
http://localhost:3000/market    # Market 페이지 (워크로드 관리)
http://localhost:3000/admin     # Admin 대시보드
http://localhost:3000/admin/history  # 히스토리 조회
```

### 7.2 CLI 모니터링

```python
import asyncio
from shared.device_registry import get_device_registry

async def monitor_devices():
    registry = get_device_registry()
    
    while True:
        stats = await registry.get_device_stats()
        print(f"\r기기 상태: 총 {stats['total']} | "
              f"idle: {stats['idle']} | "
              f"busy: {stats['busy']} | "
              f"offline: {stats['offline']}", end="")
        await asyncio.sleep(5)

asyncio.run(monitor_devices())
```

### 7.3 로그 확인

```bash
# 워크로드 로그 조회 (API)
curl http://localhost:8001/api/workloads/{workload_id}/logs

# 명령 히스토리 조회
curl "http://localhost:3000/api/admin/history?type=commands&limit=10"
```

---

## 8. 문제 해결

### Laixi 연결 실패

```
오류: [WinError 10061] 대상 컴퓨터에서 연결을 거부
```

**해결:**
1. Laixi.exe가 실행 중인지 확인
2. 방화벽에서 22221 포트 허용
3. `netstat -ano | findstr 22221`로 포트 확인

### ADB 기기 인식 안됨

```bash
# ADB 서버 재시작
adb kill-server
adb start-server

# 드라이버 문제 시 (Windows)
# 장치 관리자에서 Samsung USB 드라이버 재설치
```

### 기기 상태가 offline으로 유지

```python
# 하트비트 수동 전송
from shared.device_registry import get_device_registry

async def fix_offline():
    registry = get_device_registry()
    await registry.set_device_status("WS01-PB01-S01", "idle")

asyncio.run(fix_offline())
```

### 워크로드가 시작되지 않음

```python
# 워크로드 상태 확인
from shared.workload_engine import get_workload_engine

async def debug_workload(workload_id):
    engine = get_workload_engine()
    
    # 상세 상태 조회
    status = await engine.get_workload_status(workload_id)
    print(status)
    
    # 로그 확인
    logs = await engine.get_workload_logs(workload_id)
    for log in logs[:5]:
        print(f"[{log['level']}] {log['message']}")

asyncio.run(debug_workload("your-workload-id"))
```

---

## 다음 단계

- [디바이스 계층 구조 상세](./DEVICE_HIERARCHY.md)
- [워크로드 시스템 상세](./WORKLOAD_SYSTEM.md)
- [Laixi 통합 가이드](../LAIXI_INTEGRATION.md)
- [Admin 대시보드 설정](./ADMIN_SETUP.md)

---

*문제가 지속되면 [Troubleshooting](../troubleshooting.md)을 참조하세요.*
