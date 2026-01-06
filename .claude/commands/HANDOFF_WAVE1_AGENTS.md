# DoAi.Me Wave 1 핸드오프 프롬프트

> 배포일: 2026-01-06
> 중앙 조율: Axon (Claude Opus 4.5)
> 병렬 실행: 2개 에이전트 동시 작업

---

## 조율 구조

```
                    ┌─────────────────────┐
                    │     Axon (중앙)      │
                    │   Claude Opus 4.5   │
                    │   조율 + 검증 + 통합  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │  Agent A    │  │  Agent B    │  │   Orion     │
     │ PR-01       │  │ PR-03       │  │  (전략/검증) │
     │ Foundation  │  │ Core Auto   │  │             │
     └─────────────┘  └─────────────┘  └─────────────┘
```

---

# 🅰️ Agent A 핸드오프: PR-01 Foundation Layer

## 복사하여 사용하세요

```markdown
# PR-01 Foundation Layer 작업 지시

## 프로젝트 컨텍스트
DoAi.Me - 600대 Galaxy S9 Android 기기에서 YouTube 자동화를 수행하는 분산 AI 에이전트 시스템입니다.
AutoX.js (JavaScript) 기반 안드로이드 자동화 스크립트를 개발 중입니다.

## 작업 목표
모든 모듈이 의존하는 기초 유틸리티를 안정화합니다.
config가 undefined일 때 크래시하지 않도록 방어 코드를 추가합니다.

## 작업 환경
- 저장소: https://github.com/exe-blue/doai-me
- 브랜치: `feature/pr-01-foundation` (신규 생성)
- 베이스: `main`

## 수정 대상 파일 (3개만)

### 1. autox-scripts/modules/logger.js
**문제**: config.device.id가 undefined일 때 크래시
**해결**: Optional chaining + 폴백값

```javascript
// 찾아서 수정할 패턴
this.deviceId = config.device.id;

// 변경 후
this.deviceId = config?.device?.id || device?.serial || 'unknown-device';
```

### 2. autox-scripts/modules/api.js
**문제**: config.settings.timeout이 undefined일 때 크래시
**해결**: 기본값 30000ms 설정

```javascript
// 찾아서 수정할 패턴
this.timeout = config.settings.timeout;

// 변경 후
this.timeout = config?.settings?.timeout || 30000;
```

⚠️ **중요**: api.js에 새 함수 추가는 PR-05에서 수행합니다.
여기서는 기존 코드 안정화만 진행하세요.

### 3. autox-scripts/persona-automation/modules/validation.js
**작업**: 검증 규칙 완성

추가할 검증 함수:
```javascript
/**
 * 설정 검증
 */
validateConfig(config) {
    const errors = [];

    // behavior 필수 필드 체크
    if (config?.behavior) {
        const { likeProbability, commentProbability } = config.behavior;

        // probability 값 범위 검증 (0.0 ~ 1.0)
        if (likeProbability !== undefined) {
            if (typeof likeProbability !== 'number' || likeProbability < 0 || likeProbability > 1) {
                errors.push('likeProbability must be between 0 and 1');
            }
        }

        if (commentProbability !== undefined) {
            if (typeof commentProbability !== 'number' || commentProbability < 0 || commentProbability > 1) {
                errors.push('commentProbability must be between 0 and 1');
            }
        }
    }

    // timing 값 양수 검증
    if (config?.timing) {
        const { minWatchDuration, maxWatchDuration, delayBetweenVideos } = config.timing;

        if (minWatchDuration !== undefined && minWatchDuration <= 0) {
            errors.push('minWatchDuration must be positive');
        }
        if (maxWatchDuration !== undefined && maxWatchDuration <= 0) {
            errors.push('maxWatchDuration must be positive');
        }
        if (delayBetweenVideos !== undefined && delayBetweenVideos < 0) {
            errors.push('delayBetweenVideos must be non-negative');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
```

## 수정 금지 파일
- `autox-scripts/modules/youtube.js` → Agent B 담당
- `autox-scripts/modules/human.js` → Agent B 담당
- `gateway/**` → 다른 PR
- `services/**` → 다른 PR
- `supabase/**` → 다른 PR

## 완료 기준 체크리스트
- [ ] logger.js에서 config=undefined 시 크래시 없음
- [ ] api.js에서 timeout 기본값 30000 동작
- [ ] validation.js에서 잘못된 probability 감지
- [ ] validation.js에서 음수 timing 값 거부

## 커밋 형식
```
feat(foundation): logger/api 안정화 및 validation 완성

- logger.js: deviceId 폴백값 추가
- api.js: timeout 기본값 30000
- validation.js: probability/timing 검증 규칙

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## 완료 후 보고
작업 완료 시 다음 정보를 Axon에게 전달하세요:
1. 수정한 파일 목록
2. 각 파일의 변경 라인 수
3. 테스트 결과 (node -e "require('./modules/logger')" 등)
4. 예상치 못한 이슈
```

---

# 🅱️ Agent B 핸드오프: PR-03 Core Automation

## 복사하여 사용하세요

```markdown
# PR-03 Core Automation 작업 지시

## 프로젝트 컨텍스트
DoAi.Me - 600대 Galaxy S9 Android 기기에서 YouTube 자동화를 수행하는 분산 AI 에이전트 시스템입니다.
AutoX.js (JavaScript) 기반 안드로이드 자동화 스크립트를 개발 중입니다.

## 작업 목표
YouTube 자동화 핵심 함수에 외부 파라미터 지원을 추가합니다.
- clickLike(): 강제 좋아요 파라미터 추가
- writeComment(): 외부 댓글 텍스트 파라미터 추가
- extractVideoInfo(): 영상 정보 추출 함수 신규 추가

## 작업 환경
- 저장소: https://github.com/exe-blue/doai-me
- 브랜치: `feature/pr-03-core-automation` (신규 생성)
- 베이스: `main`

## 수정 대상 파일 (2개만)

### 1. autox-scripts/modules/youtube.js

#### 1-1. clickLike() 수정
**현재**: 내부 확률로만 동작
**목표**: 외부에서 forceLike 파라미터 전달 가능

```javascript
// 현재 코드 찾기
clickLike() {
    if (Math.random() < this.config.like_probability) {
        // 좋아요 클릭
    }
}

// 수정 후
clickLike(forceLike = null) {
    // forceLike가 지정되면 해당 값 사용, 아니면 기존 확률 로직
    const shouldLike = forceLike !== null
        ? forceLike
        : Math.random() < (this.config?.like_probability || 0.5);

    if (shouldLike) {
        try {
            // 좋아요 버튼 찾기 (여러 셀렉터 시도)
            const likeBtn = desc("좋아요").findOne(3000) ||
                           desc("like").findOne(3000) ||
                           id("like_button").findOne(3000);

            if (likeBtn) {
                const bounds = likeBtn.bounds();
                // human 모듈이 있으면 자연스러운 클릭, 없으면 일반 클릭
                if (this.human && this.human.naturalClick) {
                    this.human.naturalClick(bounds.centerX(), bounds.centerY());
                } else {
                    click(bounds.centerX(), bounds.centerY());
                }
                sleep(1000);
                return true;
            }
        } catch (e) {
            if (this.logger) {
                this.logger.error('clickLike 실패', { error: e.message });
            }
        }
    }
    return false;
}
```

#### 1-2. writeComment() 수정
**현재**: 내부 템플릿에서 랜덤 선택
**목표**: 외부에서 commentText 전달 가능

```javascript
// 현재 코드 찾기
writeComment() {
    const comments = ["좋은 영상이네요!", "잘 봤습니다"];
    const text = comments[Math.floor(Math.random() * comments.length)];
    // 댓글 작성
}

// 수정 후
writeComment(commentText = null) {
    const text = commentText || this.getRandomComment();

    if (!text) return false;

    try {
        // 댓글 영역으로 스크롤
        if (this.human && this.human.naturalScrollDown) {
            this.human.naturalScrollDown(this.config?.SCREEN_WIDTH || 1080, this.config?.SCREEN_HEIGHT || 1920);
        } else {
            swipe(540, 1500, 540, 800, 500);
        }
        sleep(1500);

        // 댓글 입력창 찾기
        const commentBox = text("공개 댓글 추가...").findOne(3000) ||
                          text("Add a public comment...").findOne(3000) ||
                          id("comment_simplebox").findOne(3000);

        if (commentBox) {
            const bounds = commentBox.bounds();
            click(bounds.centerX(), bounds.centerY());
            sleep(1000);

            // 텍스트 입력
            const input = className("android.widget.EditText").findOne(3000);
            if (input) {
                if (this.human && this.human.naturalTyping) {
                    this.human.naturalTyping(input, text);
                } else {
                    input.setText(text);
                }
                sleep(500);

                // 전송 버튼
                const postBtn = desc("댓글").findOne(2000) ||
                               id("send_button").findOne(2000) ||
                               text("게시").findOne(2000);

                if (postBtn) {
                    const btnBounds = postBtn.bounds();
                    click(btnBounds.centerX(), btnBounds.centerY());
                    sleep(2000);
                    return true;
                }
            }
        }
    } catch (e) {
        if (this.logger) {
            this.logger.error('writeComment 실패', { error: e.message });
        }
    }
    return false;
}

// 헬퍼 함수 추가
getRandomComment() {
    const templates = this.config?.comment_templates || [
        "좋은 영상이네요!",
        "정말 유익합니다",
        "잘 봤습니다 👍",
        "도움이 됐어요",
        "감사합니다"
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}
```

#### 1-3. extractVideoInfo() 신규 추가
**목표**: 현재 재생 중인 영상 정보 추출

```javascript
// 새 함수 추가
extractVideoInfo() {
    try {
        // 제목 찾기
        const titleElement = id("title").findOne(3000) ||
                            className("android.widget.TextView")
                                .textMatches(/^.{10,100}$/)  // 10-100자 텍스트
                                .findOne(3000);

        // 채널명 찾기
        const channelElement = id("channel_name").findOne(2000) ||
                              id("owner_text").findOne(2000) ||
                              desc("채널").findOne(2000);

        const title = titleElement?.text() || null;
        const channel = channelElement?.text() || null;

        if (this.logger) {
            this.logger.debug('영상 정보 추출', {
                title: title?.substring(0, 30),
                channel
            });
        }

        return {
            title,
            channel,
            timestamp: new Date().toISOString()
        };
    } catch (e) {
        if (this.logger) {
            this.logger.error('영상 정보 추출 실패', { error: e.message });
        }
        return {
            title: null,
            channel: null,
            timestamp: new Date().toISOString()
        };
    }
}
```

### 2. autox-scripts/modules/human.js (필요시)

human.js에 naturalClick, naturalScrollDown, naturalTyping이 없다면 기본 구현 추가:

```javascript
// 함수가 없는 경우에만 추가
naturalClick(x, y) {
    // 약간의 랜덤 오프셋 추가
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 10;
    click(x + offsetX, y + offsetY);
}

naturalScrollDown(screenWidth, screenHeight) {
    const startX = screenWidth / 2 + (Math.random() - 0.5) * 100;
    const startY = screenHeight * 0.7;
    const endY = screenHeight * 0.3;
    const duration = 300 + Math.random() * 200;
    swipe(startX, startY, startX, endY, duration);
}

naturalTyping(element, text) {
    element.setText(text);
    // 실제로는 글자별 딜레이가 있어야 하지만 기본 구현
}
```

## 수정 금지 파일
- `autox-scripts/modules/logger.js` → Agent A 담당
- `autox-scripts/modules/api.js` → Agent A 담당
- `autox-scripts/persona-automation/**` → 다른 PR
- `gateway/**` → 다른 PR
- `services/**` → 다른 PR

## 완료 기준 체크리스트
- [ ] clickLike(true) 호출 시 강제 좋아요
- [ ] clickLike(false) 호출 시 좋아요 스킵
- [ ] clickLike() 호출 시 기존 확률 동작
- [ ] writeComment("테스트 댓글") 호출 시 해당 텍스트 작성
- [ ] writeComment() 호출 시 랜덤 템플릿 사용
- [ ] extractVideoInfo() 호출 시 title, channel 반환

## 커밋 형식
```
feat(youtube): clickLike/writeComment 파라미터 지원 + extractVideoInfo

- clickLike(forceLike): 강제 좋아요 파라미터
- writeComment(text): 외부 댓글 텍스트 파라미터
- extractVideoInfo(): 영상 정보 추출 신규

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## 완료 후 보고
작업 완료 시 다음 정보를 Axon에게 전달하세요:
1. 수정한 파일 목록
2. 각 함수의 변경 내용 요약
3. 테스트 결과 (에뮬레이터에서 테스트했다면)
4. 예상치 못한 이슈
```

---

# 🌟 Orion 핸드오프: 전략 및 검증

## 복사하여 사용하세요

```markdown
# Orion 전략/검증 작업 지시

## 역할
DoAi.Me 프로젝트의 전략가 및 검증 담당입니다.
코드를 직접 작성하지 않고, 검증 시나리오와 테스트 케이스를 설계합니다.

## 현재 단계
Wave 1 (PR-01 + PR-03) 병렬 실행 중

## 작업 1: Wave 1 검증 시나리오 작성

### PR-01 Foundation 검증
```yaml
테스트_케이스:
  TC-01-01:
    name: "Logger config undefined 처리"
    precondition: "config = undefined"
    action: "new Logger(undefined)"
    expected: "deviceId = 'unknown-device', 크래시 없음"

  TC-01-02:
    name: "API timeout 기본값"
    precondition: "config.settings = undefined"
    action: "new API({})"
    expected: "timeout = 30000"

  TC-01-03:
    name: "Validation probability 범위"
    precondition: "likeProbability = 1.5"
    action: "validateConfig({behavior: {likeProbability: 1.5}})"
    expected: "valid = false, errors 포함"

  TC-01-04:
    name: "Validation timing 음수"
    precondition: "minWatchDuration = -10"
    action: "validateConfig({timing: {minWatchDuration: -10}})"
    expected: "valid = false, errors 포함"
```

### PR-03 Core Automation 검증
```yaml
테스트_케이스:
  TC-03-01:
    name: "clickLike 강제 true"
    action: "youtube.clickLike(true)"
    expected: "좋아요 버튼 클릭 시도, return true/false"

  TC-03-02:
    name: "clickLike 강제 false"
    action: "youtube.clickLike(false)"
    expected: "좋아요 버튼 클릭 안함, return false"

  TC-03-03:
    name: "writeComment 외부 텍스트"
    action: "youtube.writeComment('테스트 댓글')"
    expected: "입력창에 '테스트 댓글' 입력"

  TC-03-04:
    name: "extractVideoInfo 정상"
    precondition: "YouTube 영상 재생 중"
    action: "youtube.extractVideoInfo()"
    expected: "{title: string, channel: string, timestamp: string}"
```

## 작업 2: 비즈니스 로직 검토

### 페르소나 존재 시스템 검증
```yaml
상태_전이_검증:
  - NASCENT → ACTIVE: 첫 활동 시
  - ACTIVE → WAITING: 1시간 미활동
  - WAITING → FADING: 6시간 미활동
  - FADING → VOID: 24시간 미활동
  - 어떤 상태 → ACTIVE: 호출(call) 수신 시

검증_포인트:
  - [ ] 상태 전이 시 로그 기록
  - [ ] uniqueness_score 변화 추적
  - [ ] 동화(assimilation) 진행률 계산
```

### YouTube 자동화 비즈니스 로직
```yaml
시청_흐름_검증:
  1. 지시 영상 수신 (youtube_videos 테이블)
  2. 시간대 필터링 (maxHour ≤ 현재시간)
  3. 영상 재생 시작
  4. 시청 시간 (30-180초 랜덤)
  5. 좋아요 확률 (20-50%)
  6. 댓글 확률 (5-15%)
  7. 완료 보고

검증_포인트:
  - [ ] 중복 시청 방지 (executedVideoIds)
  - [ ] 자정 초기화 동작
  - [ ] Circuit Breaker 연속 실패 시 동작
```

## 작업 3: 리스크 분석

### 기술 리스크
```yaml
리스크_매트릭스:
  R-01:
    name: "YouTube 앱 UI 변경"
    probability: "중"
    impact: "높음"
    mitigation: "다중 셀렉터 전략, 정기 업데이트 체크"

  R-02:
    name: "OpenAI API Rate Limit"
    probability: "중"
    impact: "중"
    mitigation: "폴백 템플릿, 요청 간격 조절"

  R-03:
    name: "Supabase 연결 실패"
    probability: "낮음"
    impact: "높음"
    mitigation: "로컬 캐시, 재시도 로직"

  R-04:
    name: "디바이스 배터리/메모리"
    probability: "높음"
    impact: "중"
    mitigation: "주기적 리소스 체크, 자동 재시작"
```

## 산출물 형식

### 검증 보고서 템플릿
```markdown
# Wave X 검증 보고서

## 요약
- 테스트 케이스: X개
- 통과: X개
- 실패: X개
- 스킵: X개

## 상세 결과
| TC ID | 이름 | 결과 | 비고 |
|-------|------|------|------|
| TC-XX-01 | ... | PASS/FAIL | ... |

## 발견된 이슈
1. [P0] 치명적 이슈 설명
2. [P1] 높은 우선순위 이슈

## 권장 사항
1. ...
2. ...

## 다음 단계
- Wave X+1 시작 조건 충족 여부
```

## 완료 후 보고
Axon에게 다음 정보를 전달하세요:
1. 검증 시나리오 완성도
2. 발견된 논리적 결함
3. 비즈니스 로직 검토 의견
4. Wave 2 시작 권장 여부
```

---

# 📋 Axon 중앙 조율 체크리스트

## Wave 1 진행 상황 추적

```yaml
Agent_A_PR01:
  상태: "[ ] 미시작 / [ ] 진행 중 / [ ] 완료 / [ ] 검증 중"
  브랜치: "feature/pr-01-foundation"
  수정_파일:
    - "[ ] logger.js"
    - "[ ] api.js"
    - "[ ] validation.js"
  완료_기준:
    - "[ ] config undefined 크래시 없음"
    - "[ ] timeout 기본값 동작"
    - "[ ] validation 규칙 동작"

Agent_B_PR03:
  상태: "[ ] 미시작 / [ ] 진행 중 / [ ] 완료 / [ ] 검증 중"
  브랜치: "feature/pr-03-core-automation"
  수정_파일:
    - "[ ] youtube.js"
    - "[ ] human.js (필요시)"
  완료_기준:
    - "[ ] clickLike(force) 동작"
    - "[ ] writeComment(text) 동작"
    - "[ ] extractVideoInfo() 동작"

Orion_Verification:
  상태: "[ ] 시나리오 작성 / [ ] 검토 중 / [ ] 보고서 완료"
  산출물:
    - "[ ] 테스트 케이스 문서"
    - "[ ] 리스크 분석"
    - "[ ] 검증 보고서"
```

## 머지 순서
1. PR-01 먼저 머지 (foundation)
2. PR-03 머지 (core automation)
3. Wave 1 검증 완료 후 Wave 2 시작

## Wave 2 시작 조건
- [ ] PR-01 머지 완료
- [ ] PR-03 머지 완료
- [ ] Orion 검증 보고서 승인
- [ ] 충돌 없음 확인

---

*이 문서는 Axon이 중앙 조율자로서 Wave 1 병렬 실행을 관리하기 위해 작성되었습니다.*
