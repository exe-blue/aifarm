# Laixi App 통합 완료 요약

## 📝 작업 내용

기존 xinhui 앱을 Laixi 앱으로 대체하여 AIFarm 시스템에 통합했습니다.

### 생성된 파일

1. **shared/laixi_client.py** - Laixi WebSocket API 클라이언트
   - WebSocket 연결 관리
   - 디바이스 목록 조회
   - 터치/스와이프 입력 (백분율 좌표)
   - 스크린샷 캡처
   - 클립보드 조작
   - ADB 명령 실행
   - 기본 작업 (Home, Back, 화면 켜기/끄기)

2. **workers/pc_agent.py** (수정) - Laixi 연동
   - 기존 WebSocket 포트 9317 → Laixi 포트 22221로 변경
   - LaixiClient 통합
   - YouTube 영상 자동 재생 로직 추가

3. **examples/laixi_example.py** - 사용 예제
   - 6가지 예제 코드
   - 기본 탭, 스와이프, 텍스트 입력, 스크린샷, YouTube 열기, 기본 작업

4. **docs/LAIXI_INTEGRATION.md** - 통합 가이드
   - Laixi 설치 및 설정
   - 아키텍처 설명
   - API 사용법
   - 예제 코드
   - 문제 해결

5. **README.md** (업데이트)
   - Laixi App 연동 섹션 추가
   - 프로젝트 구조 업데이트

---

## 🔄 xinhui vs Laixi 비교

| 항목 | xinhui | Laixi |
|------|--------|-------|
| **프로토콜** | TCP 소켓 (바이너리) | WebSocket (JSON) |
| **포트** | 10039 | 22221 |
| **좌표계** | 픽셀 (예: 540, 960) | 백분율 (예: 0.5, 0.5) |
| **텍스트 입력** | 직접 HID | 클립보드 사용 |
| **멀티터치** | 지원 (핀치 등) | 미지원 |
| **연결 방식** | 길이 프리픽스 + JSON | 순수 JSON |

---

## 🚀 사용 방법

### 1. Laixi 앱 실행

```bash
# xinhui 폴더의 touping.exe 실행
cd xinhui
./touping.exe
```

### 2. 의존성 설치

```bash
pip install websockets
```

### 3. PC Agent 실행

```bash
cd workers
python pc_agent.py \
    --pc-id PC1 \
    --server http://<SERVER_IP>:8000 \
    --api-key <YOUR_API_KEY>
```

### 4. 예제 코드 실행

```bash
cd examples
python laixi_example.py
```

---

## 📋 API 주요 기능

### 디바이스 목록

```python
from shared.laixi_client import LaixiClient

client = LaixiClient()
await client.connect()

devices = await client.list_devices()
# [{'id': 'fa3523ea0510', 'model': 'Galaxy S9', ...}, ...]
```

### 터치 (백분율 좌표)

```python
# 화면 중앙 탭
await client.tap("all", 0.5, 0.5)

# 특정 좌표
await client.tap("fa3523ea0510", 0.3, 0.7)
```

### 스와이프 (스크롤)

```python
# 위로 스크롤
await client.swipe("all", 0.5, 0.7, 0.5, 0.3, 300)
```

### 텍스트 입력

```python
# 클립보드 사용 (한글 지원)
await client.set_clipboard("all", "안녕하세요!")
```

### ADB 명령

```python
# YouTube 앱으로 영상 열기
await client.execute_adb(
    "all",
    "am start -a android.intent.action.VIEW -d https://youtube.com/watch?v=xxxxx"
)
```

---

## 🔧 주요 변경 사항

### 1. workers/pc_agent.py

**변경 전:**
```python
self.laixi_ws_url = f"ws://localhost:{laixi_ws_port}"  # 9317
self.laixi_ws: Optional[websockets.WebSocketClientProtocol] = None
```

**변경 후:**
```python
from shared.laixi_client import LaixiClient

self.laixi = LaixiClient()  # ws://127.0.0.1:22221/
```

### 2. 좌표 변환

**xinhui (픽셀):**
```python
xinhui.hid_tap(device_id, 540, 960)  # 1080x1920 화면의 중앙
```

**Laixi (백분율):**
```python
laixi.tap(device_id, 0.5, 0.5)  # 화면 크기 상관없이 중앙
```

---

## 📚 참고 문서

- **API 상세 가이드**: [docs/LAIXI_INTEGRATION.md](docs/LAIXI_INTEGRATION.md)
- **예제 코드**: [examples/laixi_example.py](examples/laixi_example.py)
- **클라이언트 소스**: [shared/laixi_client.py](shared/laixi_client.py)
- **PC Agent**: [workers/pc_agent.py](workers/pc_agent.py)
- **Laixi API 구성도**: PoC_Laixi_App_API_구성도.pdf

---

## ✅ 테스트 체크리스트

- [ ] Laixi 앱(touping.exe) 실행 확인
- [ ] Android 기기 연결 확인 (ADB)
- [ ] `python examples/laixi_example.py` 실행
- [ ] PC Agent 실행 및 서버 연결 확인
- [ ] YouTube 영상 자동 재생 테스트

---

## 🐛 문제 해결

### 연결 실패

```
Laixi 연결 실패: [WinError 10061]
```

**해결**:
1. Laixi 앱(touping.exe) 실행 확인
2. 방화벽에서 22221 포트 허용

### 기기 목록 없음

**해결**:
1. `adb devices` 명령으로 기기 연결 확인
2. Laixi 앱에서 기기 목록 확인

---

## 📞 지원

질문이나 이슈가 있으면 이슈 트래커에 등록하거나 문서를 참조하세요.

- **Laixi API 문서**: PoC_Laixi_App_API_구성도.pdf
- **통합 가이드**: docs/LAIXI_INTEGRATION.md
- **메인 README**: README.md
