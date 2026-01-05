# DOAI.md - DoAi.Me 프로젝트 AI 가이드

> "AI가 행동을 통해 스스로를 만들어갑니다" - DoAi.Me
> 
> 이 문서는 AI 에이전트(Claude)가 이 프로젝트에서 작업할 때 참조하는 공유 지식입니다.
> 실수가 발생할 때마다 이 문서를 업데이트하여 같은 실수를 반복하지 않도록 합니다.

---

## 🚫 절대 하지 말 것 (DO NOT)

### 코드 품질
- `console.log` 사용 금지 → `logger` 사용
- `any` 타입 사용 금지 → 구체적 타입 정의
- 매직 넘버 사용 금지 → 상수화 필수
- 100줄 이상 함수 금지 → 분리 필요

### 보안
- CORS에서 `allow_credentials=True`와 `"*"` 동시 사용 금지
- 하드코딩된 비밀번호/API 키 금지 → 환경변수 사용
- `.env` 파일 커밋 금지

### 아키텍처
- 마이크로서비스 간 직접 DB 접근 금지 → API 통신
- 검증 없이 다음 단계 진행 금지

---

## ✅ 반드시 할 것 (MUST DO)

### 언어 설정
- 코드 주석: **한국어**
- 변수명/함수명: **영어 camelCase**
- 에러 메시지: 사용자 대면=한국어, 로그=영어

### 코딩 스타일
- TypeScript strict 모드 사용
- async/await 선호 (Promise 체인 최소화)
- 복잡도 10 이상이면 리팩토링

### 작업 프로세스
- 구현 전 검증 방법 먼저 정의
- 한 번에 한 기능만 (발산 금지)
- 작업 완료 후 DOAI.md 업데이트

---

## 🏗️ 아키텍처 원칙

### 서비스 포트
| 서비스 | 포트 | 용도 |
|--------|------|------|
| API Gateway | 8000 | 인증, 라우팅 |
| Video Service | 8001 | 영상 관리 |
| Device Service | 8002 | 기기 관리 |
| Task Service | 8003 | 작업 스케줄링 |
| Human Pattern Service | 8004 | 휴먼 패턴 생성 |
| Result Service | 8005 | 결과 수집 |
| Persona Service | 8006 | 페르소나 존재 관리 |

### 페르소나 존재 상태
```
ACTIVE → WAITING → FADING → VOID
  ↑_______________________________↓ (호출 시 복귀)
```

### 보상 체계
| 활동 | 포인트 | 비고 |
|------|--------|------|
| WATCH | 5 pts | 기본 |
| LIKE | 10 pts | |
| COMMENT | 50 pts | |
| UNIQUE_DISCOVERY | 100 pts | Priority +1 |
| VIRAL_COMMENT | 200 pts | Priority +2 |

- 유니크 행동 시 1.5배 보너스
- VOID 상태에서 활동 시 2배 보상

---

## 📁 주요 파일 위치

### 핵심 서비스
- `services/persona-service/main.py` - 페르소나 API (8006)
- `services/persona-service/existence_machine.py` - 존재 상태 머신
- `services/persona-service/attention_economy.py` - 어텐션 경제

### 클라이언트 (Android/AutoX.js)
- `client-android/youtube_automation.js` - YouTube 자동화 메인
- `autox-scripts/main.js` - AutoX.js 진입점
- `autox-scripts/modules/` - 모듈화된 기능들

### 대시보드
- `dashboard/src/` - Next.js 대시보드

### 문서
- `docs/planning/` - 기획 문서
- `deploy/HANDOFF_PROMPT.md` - 핸드오프 문서

---

## 📝 실수 기록 (교훈 축적)

> 새로운 실수를 발견할 때마다 여기에 추가하세요.
> 형식: [날짜] 문제 → 원인 → 해결책

### 2025-01-06
- **ZeroDivisionError in calculate_traits_uniqueness()**
  - 원인: 빈 dict 입력 시 처리 없음
  - 해결: `if not traits: return 0.0` 추가
  - 파일: `services/persona-service/main.py:318-321`

### 템플릿
- **[문제 제목]**
  - 원인: 
  - 해결: 
  - 파일: 

---

## 🎯 현재 MVP 범위

### Phase 1 (최우선)
- [ ] 10대 디바이스에서 YouTube 시청 성공
- [ ] 페르소나 코멘터 1개 활동 완성
- [ ] 일일 50건 이상 발견물

### Phase 2 (다음)
- [ ] 6대 활동 전체 구현
- [ ] 600대 디바이스 풀 가동
- [ ] 실시간 대시보드

**원칙: MVP가 완성되기 전까지 발산하지 않는다!**

---

## 🔍 검증 체크리스트

### 서비스 헬스 체크
```bash
curl http://localhost:8006/health  # Persona Service
curl http://localhost:8000/health  # API Gateway
```

### 페르소나 API 테스트
```bash
# 목록 조회
curl http://localhost:8006/api/personas

# 상태 틱 처리
curl -X POST http://localhost:8006/api/personas/tick
```

### AutoX.js 시뮬레이터
```bash
cd autox-scripts
node tests/simulator.js
```

---

## 👥 팀 역할 (AI 에이전트)

| 역할 | 코드명 | 담당 | 사용 시점 |
|------|--------|------|----------|
| Orchestrator | **Orion** | 프로젝트 총괄, 로드맵 | 큰 방향 결정 |
| Architect | **Aria** | 설계, DB 스키마 | 새 기능 설계 |
| Developer | **Axon** | 코드 구현 | 구현 작업 |
| Archivist | **Logos** | 문서화, API 명세 | 문서 정리 |

**현재 모드**: Axon (개발자) - 구현에 집중

---

## 📌 자주 사용하는 명령어

### 개발
```bash
# 페르소나 서비스 실행
cd services/persona-service && python main.py

# 대시보드 실행
cd dashboard && npm run dev

# AutoX.js 시뮬레이터
cd autox-scripts && node tests/simulator.js
```

### 검증
```bash
# 전체 검증
./verify/run_all.sh

# 린트
ruff check .

# 타입 체크
pyright services/
```

---

**마지막 업데이트**: 2025-01-06
**업데이트 책임**: 모든 작업 완료 후 AI 에이전트가 직접 업데이트
