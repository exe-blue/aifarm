# AIFarm - WiFi 연결 폰보드 자동화 시스템

WiFi로 연결된 폰보드(최대 600대)를 ADB 명령과 API를 통해 자동화하는 시스템입니다.

## 📁 프로젝트 구조

```
aifarm/
├── src/                    # 소스 코드
│   ├── controller/         # 디바이스 제어 모듈
│   │   ├── device_manager.py    # uiautomator2 기반 디바이스 관리
│   │   └── adb_controller.py    # ADB 명령 실행
│   ├── automation/         # 자동화 에이전트
│   │   ├── base_agent.py        # 기본 에이전트 클래스
│   │   └── youtube_agent.py     # YouTube 자동화 에이전트
│   ├── api/                # API 서버
│   │   └── server.py            # FastAPI 서버
│   └── utils/              # 유틸리티
│       └── ip_generator.py      # IP 주소 생성
├── scripts/                # 실행 스크립트
│   ├── connect_all.sh      # Linux/Mac ADB 연결 스크립트
│   ├── connect_all.bat     # Windows ADB 연결 스크립트
│   └── execute_all.sh      # 전체 디바이스 명령 실행
├── config/                 # 설정 파일
│   └── config.yaml         # 시스템 설정
├── tests/                  # 테스트 코드
├── main.py                 # 메인 실행 파일
├── requirements.txt        # Python 패키지 의존성
└── README.md              # 프로젝트 문서
```

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# Python 가상환경 생성 (권장)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt

# uiautomator2 초기화 (선택사항)
python -m uiautomator2 init
```

### 2. 설정 파일 수정

`config/config.yaml` 파일을 열어 네트워크 설정을 수정하세요:

```yaml
network:
  base_ips:
    - subnet: "10.0.10"
      range: [1, 254]
    - subnet: "10.0.11"
      range: [1, 254]
    - subnet: "10.0.12"
      range: [1, 93]
  port: 5555
```

### 3. 디바이스 연결

#### 방법 1: 스크립트 사용 (권장)

```bash
# Linux/Mac
chmod +x scripts/connect_all.sh
./scripts/connect_all.sh

# Windows
scripts\connect_all.bat
```

#### 방법 2: Python 코드 사용

```bash
# 연결만 하기
python main.py --mode connect

# 테스트 모드 (단일 디바이스)
python main.py --mode test
```

#### 방법 3: API 사용

```bash
# API 서버 시작
python -m src.api.server

# 다른 터미널에서 연결 요청
curl -X POST http://localhost:8000/devices/connect \
  -H "Content-Type: application/json" \
  -d '{"max_workers": 50}'
```

## 📖 사용 방법

### Python 코드로 사용

#### 기본 사용 예시

```python
from src.controller.device_manager import DeviceManager
from src.automation.youtube_agent import YouTubeAgent

# 디바이스 관리자 생성
manager = DeviceManager()

# 전체 디바이스 연결
manager.connect_all(max_workers=50)

# YouTube 자동화 실행
def youtube_action(device):
    agent = YouTubeAgent(device)
    agent.run_automation_task(
        keyword="AI 뉴스",
        watch_time_range=(30, 120),
        like_probability=0.5,
        comment_probability=0.2
    )

# 전체 디바이스에 실행
manager.execute_on_all(youtube_action, max_workers=50)
```

#### YouTube 자동화 실행

```bash
python main.py --mode youtube --keyword "AI 뉴스" --max-workers 50
```

### API 서버 사용

#### 서버 시작

```bash
python -m src.api.server
# 또는
uvicorn src.api.server:app --host 0.0.0.0 --port 8000
```

#### API 엔드포인트

- `GET /` - API 정보
- `GET /health` - 헬스 체크
- `POST /devices/connect` - 디바이스 연결
- `GET /devices` - 연결된 디바이스 목록
- `POST /devices/disconnect` - 디바이스 연결 해제
- `POST /adb/connect` - ADB 연결
- `POST /adb/execute` - ADB 명령 실행
- `POST /youtube/task` - YouTube 자동화 태스크 실행
- `GET /youtube/keywords` - YouTube 키워드 목록

#### API 사용 예시

```bash
# 디바이스 연결
curl -X POST http://localhost:8000/devices/connect \
  -H "Content-Type: application/json" \
  -d '{"max_workers": 50}'

# YouTube 자동화 실행
curl -X POST http://localhost:8000/youtube/task \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "AI 뉴스",
    "watch_time_range": [30, 120],
    "like_probability": 0.5,
    "comment_probability": 0.2,
    "max_workers": 50
  }'

# 연결된 디바이스 확인
curl http://localhost:8000/devices
```

### ADB 명령 직접 사용

#### 단일 디바이스

```bash
# 연결
adb connect 10.0.10.1:5555

# 명령 실행
adb -s 10.0.10.1:5555 shell input tap 500 500
adb -s 10.0.10.1:5555 shell am start -n com.google.android.youtube/.HomeActivity
```

#### 전체 디바이스

```bash
# 스크립트 사용
./scripts/execute_all.sh "input tap 500 500"

# Python 코드 사용
from src.controller.adb_controller import ADBController

controller = ADBController()
controller.execute_on_all("input tap 500 500", max_workers=50)
```

## 🔧 주요 기능

### 1. 디바이스 관리
- WiFi를 통한 ADB 연결
- 600대 동시 연결 지원
- 병렬 처리로 빠른 연결
- 연결 상태 모니터링

### 2. 자동화 에이전트
- 기본 에이전트: 화면 제어, 앱 실행 등
- YouTube 에이전트: 검색, 재생, 좋아요, 댓글 등

### 3. API 서버
- RESTful API 제공
- 비동기 처리 지원
- 배치 작업 관리

### 4. 설정 관리
- YAML 기반 설정 파일
- 네트워크 설정
- 자동화 파라미터 설정

## 📝 설정 파일 설명

`config/config.yaml` 주요 설정:

```yaml
network:
  base_ips:          # IP 범위 설정
  port: 5555         # ADB 포트
  max_workers: 50    # 최대 동시 작업 수

automation:
  default_wait_timeout: 5  # 기본 대기 시간

youtube:
  keywords:          # 검색 키워드 목록
  comments:          # 댓글 템플릿
  watch_time_range: [30, 120]  # 시청 시간 범위
  like_probability: 0.5        # 좋아요 확률
  comment_probability: 0.2     # 댓글 확률

api:
  host: "0.0.0.0"
  port: 8000
```

## 🛠️ 개발

### 프로젝트 구조 이해

- **controller/**: 디바이스 제어 로직
  - `DeviceManager`: uiautomator2 기반 디바이스 관리
  - `ADBController`: ADB 명령 실행

- **automation/**: 자동화 에이전트
  - `BaseAgent`: 기본 기능 제공
  - `YouTubeAgent`: YouTube 전용 기능

- **api/**: FastAPI 기반 REST API
  - 비동기 처리
  - 배치 작업 지원

- **utils/**: 유틸리티 함수
  - IP 주소 생성
  - 설정 파일 로드

### 새로운 에이전트 추가

```python
from src.automation.base_agent import BaseAgent

class MyAppAgent(BaseAgent):
    def __init__(self, device):
        super().__init__(device, "com.example.app")
    
    def my_automation(self):
        self.start_app()
        # 자동화 로직
        self.stop_app()
```

## ⚠️ 주의사항

1. **네트워크 설정**: 실제 네트워크 환경에 맞게 IP 범위를 수정하세요.
2. **동시 연결 수**: 너무 많은 동시 연결은 네트워크에 부하를 줄 수 있습니다. `max_workers`를 조절하세요.
3. **ADB 경로**: Windows에서 ADB가 PATH에 없으면 `config/config.yaml`에서 경로를 지정하세요.
4. **권한**: 일부 ADB 명령은 루트 권한이 필요할 수 있습니다.

## 📄 라이선스

이 프로젝트는 개인 사용 목적으로 제작되었습니다.

## 🤝 기여

이슈나 개선 사항이 있으면 알려주세요!

