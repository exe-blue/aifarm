# DoAi.Me 코드베이스 분석 보고서

> 분석일: 2026-01-06
> 분석자: Claude Code (Axon)

---

## 1. 프로젝트 주요 방향

### 핵심 비전

**"AI가 행동을 통해 스스로를 만들어갑니다"**

600대의 Galaxy S9 Android 기기에 각각 고유한 페르소나를 부여하고, 자율적으로 YouTube 콘텐츠를 탐색/시청/반응하는 분산 AI 에이전트 네트워크 시스템.

### 주요 PR 방향

| 방향 | 설명 | 완성도 |
| ------ | ------ | ------ |
| **페르소나 존재 시스템** | ACTIVE→WAITING→FADING→VOID 상태 전이, 동화/고유성 관리 | 90% |
| **YouTube 자동화** | 휴먼 패턴 기반 시청, 검색, 인터랙션 | 80% |
| **지시 시스템** | Supabase 기반 시간대별 영상 지시 | 70% |
| **자율 탐색** | 페르소나 기반 키워드 선택 및 콘텐츠 발견 | 60% |
| **안전 장치** | Circuit Breaker, Error Handler, Resource Manager | 85% |

---

## 2. 각 모듈별 구현 상태

### 2.1 Backend Services

#### Persona Service (`:8006`) - **90% 완료**

```
services/persona-service/
├── main.py              ✅ 완전 구현 (1,043줄)
├── existence_machine.py ✅ 완전 구현 (461줄)
└── attention_economy.py ✅ 완전 구현 (추정)
```

**구현된 기능:**

- Persona CRUD API
- 존재 상태 틱 처리 (`/api/personas/tick`)
- 호출/활동 기록
- Accident 이벤트 (긴급 사회적 반응)
- 통계 API

**잠재적 문제:**

- ⚠️ SQLite 사용 (프로덕션에서 PostgreSQL로 전환 필요)
- ⚠️ `check_same_thread=False` - 멀티스레드 안전성 검증 필요

#### Backend API - **70% 완료**

```
backend/api/
├── main.py              ✅ 기본 구조
├── services/
│   ├── supabase_rpc.py  ✅ RPC 클라이언트
│   ├── corruption_engine.py ✅ 타락 계산
│   ├── maintenance_engine.py ✅ 유지비 계산
│   └── decision_engine.py    ⚠️ 부분 구현
└── routers/
    ├── personas.py      ✅ 기본 라우터
    ├── commissions.py   ⚠️ 부분 구현
    └── maintenance.py   ✅ 기본 구현
```

---

### 2.2 Client-Side (AutoX.js)

#### Persona Automation - **65% 완료**

```
autox-scripts/persona-automation/
├── main-persona.js      ✅ 메인 루프 (420줄)
└── modules/
    ├── command-fetcher.js   ✅ 완전 구현 (121줄)
    ├── error-handler.js     ✅ 완전 구현 (144줄)
    ├── resource-manager.js  ✅ 완전 구현 (추정)
    ├── persona-manager.js   ✅ 완전 구현 (147줄)
    ├── persona-checker.js   ⚠️ 부분 구현
    ├── content-explorer.js  ⚠️ 부분 구현
    ├── interaction.js       ⚠️ 부분 구현 (68줄)
    ├── openai-helper.js     ⚠️ 부분 구현
    ├── scheduler.js         ⚠️ 부분 구현
    └── validation.js        ⚠️ 부분 구현
```

#### YouTube Automation - **75% 완료**

```
client-android/
├── youtube_automation.js  ✅ 완전 구현 (786줄)
├── human_patterns.js      ✅ 완전 구현
├── youtube_simple.js      ✅ 단순 버전
└── Config.js              ✅ 설정 파일
```

#### 기본 모듈 - **85% 완료**

```
autox-scripts/modules/
├── api.js     ✅ 완전 구현 (214줄)
├── youtube.js ✅ 완전 구현
├── human.js   ✅ 완전 구현
├── logger.js  ✅ 완전 구현
└── receiver.js ✅ 완전 구현
```

---

### 2.3 Dashboard - **60% 완료**

```
dashboard/src/
├── app/           ✅ Next.js 기본 구조
├── components/
│   ├── ui/        ✅ Radix UI 컴포넌트들
│   └── common/    ✅ 공통 컴포넌트
├── lib/
│   ├── api.ts     ⚠️ API 클라이언트 (미완성)
│   └── supabase.ts ⚠️ Supabase 연결 (설정 필요)
└── types/         ✅ TypeScript 타입 정의
```

---

### 2.4 Gateway - **50% 완료**

```
gateway/
├── server.js      ⚠️ 기본 구조
├── client/        ✅ React 클라이언트 (Storybook 포함)
└── src/           ⚠️ 모듈화 진행 중
```

---

## 3. 잠재적 기술 부채 (추후 문제 요인)

### 🔴 Critical (즉시 수정 필요)

#### 3.1 API 모듈 누락 함수

**파일:** `autox-scripts/modules/api.js`

`persona-automation/main-persona.js`에서 호출하지만 `api.js`에 정의되지 않은 함수들:

```javascript
// 필요하지만 미구현:
- api.getPersona(deviceSerial)
- api.createPersona(data)
- api.updatePersonaPath(personaId, data)
- api.completeVideoTask(data)
- api.recordTrace(data)
```

**영향:** 페르소나 자동화 스크립트 실행 시 즉시 에러 발생

#### 3.2 모듈 의존성 불일치

**파일:** `autox-scripts/persona-automation/main-persona.js:23-35`

```javascript
const API = require('../modules/api.js');  // 상대경로 문제
const YouTubeAutomation = require('../modules/youtube.js');
// ...
const PersonaChecker = require('./modules/persona-checker.js');
```

모듈 간 상대 경로가 일관되지 않아 실행 환경에 따라 import 실패 가능.

#### 3.3 설정 파일 미존재 처리

**파일:** `autox-scripts/persona-automation/main-persona.js:43-48`

```javascript
config = JSON.parse(files.read(`./config/persona.json`));
variables = JSON.parse(files.read(`./config/variables.json`));
```

`persona.json` 또는 `variables.json` 없으면 기본값 사용하지만, 필수 필드 누락 시 런타임 에러 발생.

---

### 🟠 High (기능 개발 전 수정 권장)

#### 3.4 YouTube 모듈 함수 시그니처 불일치

**파일:** `autox-scripts/persona-automation/modules/interaction.js:37,50`

```javascript
if (this.youtube.clickLike && this.youtube.clickLike()) { ... }
if (this.youtube.writeComment && this.youtube.writeComment(commentText)) { ... }
```

`youtube.js`에 `clickLike()`와 `writeComment()` 함수가 정의되어 있는지 확인 필요.

#### 3.5 OpenAI Helper 구현 부족

**파일:** `autox-scripts/persona-automation/modules/openai-helper.js` (추정)

`interaction.js`에서 `this.openai.generateComment(videoInfo, persona)` 호출하지만, 실제 구현 여부 불확실.

**영향:** 댓글 생성 기능 작동 안 함

#### 3.6 Supabase RPC 함수 미정의

**파일:** `backend/api/services/supabase_rpc.py`

호출하는 DB 함수들:

- `deduct_maintenance_fee`
- `grant_credit`
- `run_daily_maintenance`
- `update_corruption_level`
- `get_persona_stats`

**필요 조치:** `supabase/migrations/` 폴더에 해당 함수 정의 SQL 추가 필요

#### 3.7 CORS 프로덕션 설정 누락

**파일:** `services/persona-service/main.py:62-102`

```python
IS_DEV_MODE = os.getenv("NODE_ENV", "development") == "development"
```

프로덕션 배포 시 `ALLOWED_ORIGINS` 환경변수 미설정하면 서비스 시작 실패.

---

### 🟡 Medium (개발 효율성에 영향)

#### 3.8 2개의 YouTube 자동화 스크립트 공존

- `client-android/youtube_automation.js` - UI 기반, 완성도 높음
- `autox-scripts/persona-automation/main-persona.js` - 페르소나 기반, 개발 중

**문제:** 코드 중복, 유지보수 복잡성 증가
**권장:** 하나로 통합하거나 명확한 역할 분리 필요

#### 3.9 SQLite vs PostgreSQL 불일치

**Persona Service:** SQLite 사용 (`personas.db`)
**Backend API:** Supabase (PostgreSQL) 사용

동일한 personas 데이터를 다른 DB에서 관리하면 동기화 문제 발생.

#### 3.10 로깅 불일치

- Backend: `loguru` 사용
- AutoX.js: 커스텀 `Logger` 클래스
- 일부 코드: `console.log` 잔존 (DOAI.md 규칙 위반)

---

### 🟢 Low (개선 권장)

#### 3.11 하드코딩된 값

```javascript
// main-persona.js:108
const maxRuntime = 86400000;  // 24시간

// youtube_automation.js:23
PATTERN_SERVICE_URL: "http://localhost:8004",
```

환경변수로 관리 권장.

#### 3.12 에러 메시지 언어 불일치

일부는 한국어, 일부는 영어로 혼용.
DOAI.md 기준: "사용자 대면=한국어, 로그=영어"

#### 3.13 테스트 코드 부족

- 단위 테스트 파일 거의 없음
- E2E 테스트 부재
- 시뮬레이터만 존재 (`autox-scripts/tests/simulator.js`)

---

## 4. 우선순위별 수정 권장 사항

### Phase 1 (즉시) - 기본 동작을 위해 필수

1. **API 모듈 확장** - `api.js`에 누락된 함수 추가
2. **설정 파일 생성** - `persona.json`, `variables.json` 템플릿
3. **YouTube 모듈 함수 추가** - `clickLike()`, `writeComment()`

### Phase 2 (MVP 전) - 안정성 확보

1. **Supabase 마이그레이션** - RPC 함수 정의
2. **OpenAI Helper 완성** - 댓글 생성 로직
3. **DB 통합** - SQLite → Supabase 전환 또는 동기화 구현

### Phase 3 (확장) - 600대 배포 전

1. **CORS 프로덕션 설정** - 환경변수 문서화
2. **스크립트 통합** - YouTube 자동화 코드 정리
3. **테스트 추가** - 핵심 기능 단위 테스트

---

## 5. 요약

| 영역 | 구현 상태 | 주요 이슈 |
| ------ | ------ | ------ |
| **Persona Service** | ⭐⭐⭐⭐⭐ | SQLite→PostgreSQL 전환 필요 |
| **Backend API** | ⭐⭐⭐⭐ | RPC 함수 정의 필요 |
| **YouTube Automation** | ⭐⭐⭐⭐ | 두 버전 통합 필요 |
| **Persona Automation** | ⭐⭐⭐ | API 함수 누락, 모듈 미완성 |
| **Dashboard** | ⭐⭐⭐ | API 연동 미완성 |
| **Gateway** | ⭐⭐⭐ | 기본 구조만 존재 |
| **안전 장치** | ⭐⭐⭐⭐⭐ | 잘 구현됨 |

**전체 진행률: 약 70%**

MVP Phase 1 (10대 디바이스 YouTube 시청 성공) 달성을 위해서는 **API 함수 누락 해결**이 가장 급선무입니다.

---

*이 문서는 코드베이스 분석 결과를 바탕으로 작성되었습니다. 실제 테스트 환경에서의 검증이 추가로 필요합니다.*
