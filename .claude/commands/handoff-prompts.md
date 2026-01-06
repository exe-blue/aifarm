# DoAi.Me 병렬 개발 핸드오프 프롬프트

> 생성일: 2026-01-06
> 목적: 여러 AI 에이전트가 충돌 없이 병렬 작업 가능하도록 구성

---

## 병렬 실행 가이드

### 동시 실행 가능 그룹

```text
┌─────────────────────────────────────────────────────────────┐
│                    WAVE 1 (동시 시작 가능)                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   PR-01      │  │   PR-03      │  │              │       │
│  │  Foundation  │  │  Core Auto   │  │              │       │
│  │  (Agent A)   │  │  (Agent B)   │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    WAVE 2 (WAVE 1 완료 후)                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   PR-02      │  │   PR-07      │  │   PR-08      │       │
│  │  Data Layer  │  │  OpenAI Int  │  │  Explorer    │       │
│  │  (Agent C)   │  │  (Agent D)   │  │  (Agent E)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    WAVE 3 (WAVE 2 완료 후)                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   PR-04      │  │   PR-06      │                         │
│  │  Gateway API │  │  Persona Sys │                         │
│  │  (Agent F)   │  │  (Agent G)   │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    WAVE 4 (WAVE 3 완료 후)                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   PR-05      │  │   PR-09      │                         │
│  │  API Client  │  │ Command Fetch│                         │
│  │  (Agent H)   │  │  (Agent I)   │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    WAVE 5 (최종 통합)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │                    PR-10                          │       │
│  │                 Orchestration                     │       │
│  │                  (단일 Agent)                     │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## WAVE 1: 동시 시작 가능

### 🅰️ PR-01: Foundation Layer (Agent A)

```markdown
# PR-01 핸드오프: Foundation Layer

## 담당 범위
- `autox-scripts/modules/logger.js`
- `autox-scripts/modules/api.js` (기본 설정만, 함수 추가는 PR-05)
- `autox-scripts/persona-automation/modules/validation.js`

## 수정 금지 파일 (다른 에이전트 담당)
- `autox-scripts/modules/youtube.js` → PR-03
- `gateway/**` → PR-04
- `services/**` → PR-02

## 작업 상세

### 1. logger.js 수정
파일: `/autox-scripts/modules/logger.js`

수정 사항:
- `device.serial` undefined 처리 추가
- 기본 deviceId 폴백 값 설정

```javascript
// 수정 전
this.deviceId = config.device.id;

// 수정 후
this.deviceId = config?.device?.id || device?.serial || 'unknown-device';
```

### 2. api.js 기본 설정 수정

파일: `/autox-scripts/modules/api.js`

수정 사항:

- timeout 기본값 설정
- config 널 체크 추가

```javascript
// 수정 전 (line 10)
this.timeout = config.settings.timeout;

// 수정 후
this.timeout = config?.settings?.timeout || 30000;



⚠️ 중요: api.js에 새 함수 추가는 PR-05에서 수행. 여기서는 기존 코드 안정화만.

### 3. validation.js 완성

파일: `/autox-scripts/persona-automation/modules/validation.js`

추가할 검증 규칙:

- variables.behavior 필수 필드 체크
- probability 값 범위 검증 (0.0 ~ 1.0)

- timing 값 양수 검증

## 완료 기준

- [ ] logger.js에서 config undefined 시 크래시 없음
- [ ] api.js에서 timeout 기본값 동작

- [ ] validation.js에서 잘못된 설정값 감지 및 수정


## 브랜치

`feature/pr-01-foundation`

## 커밋 메시지 형식
```
feat(foundation): [작업내용]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

### 🅱️ PR-03: Core Automation (Agent B)

```markdown
# PR-03 핸드오프: Core Automation

## 담당 범위
- `autox-scripts/modules/youtube.js`
- `autox-scripts/modules/human.js` (필요시)

## 수정 금지 파일 (다른 에이전트 담당)
- `autox-scripts/modules/api.js` → PR-01, PR-05
- `autox-scripts/modules/logger.js` → PR-01
- `autox-scripts/persona-automation/**` → PR-06, PR-07, PR-08

## 작업 상세

### 1. youtube.js - clickLike() 파라미터 지원
현재 상태: 내부 확률로만 동작
목표: 외부에서 forceLike 파라미터 전달 가능

```javascript
// 수정 전
clickLike() {
    if (Math.random() < this.config.like_probability) {
        // 좋아요 클릭
    }
}

// 수정 후
clickLike(forceLike = null) {
    const shouldLike = forceLike !== null
        ? forceLike
        : Math.random() < (this.config?.like_probability || 0.5);

    if (shouldLike) {
        // 좋아요 버튼 찾기 및 클릭
        const likeBtn = desc("좋아요").findOne(3000) ||
                       desc("like").findOne(3000) ||
                       id("like_button").findOne(3000);

        if (likeBtn) {
            const bounds = likeBtn.bounds();
            this.human.naturalClick(bounds.centerX(), bounds.centerY());
            sleep(1000);
            return true;
        }
    }
    return false;
}
```

### 2. youtube.js - writeComment() 파라미터 지원
현재 상태: 내부 템플릿에서 랜덤 선택
목표: 외부에서 commentText 전달 가능

```javascript
// 수정 전
writeComment() {
    const comments = ["좋은 영상이네요!", "잘 봤습니다"];
    const text = comments[Math.floor(Math.random() * comments.length)];
    // 댓글 작성
}

// 수정 후
writeComment(commentText = null) {
    const text = commentText || this.getRandomComment();

    if (!text) return false;

    // 댓글 영역으로 스크롤
    this.human.naturalScrollDown(this.config.SCREEN_WIDTH, this.config.SCREEN_HEIGHT);
    sleep(1500);

    const commentBox = text("공개 댓글 추가...").findOne(3000) ||
                      text("Add a public comment...").findOne(3000);

    if (commentBox) {
        const bounds = commentBox.bounds();
        this.human.naturalClick(bounds.centerX(), bounds.centerY());
        sleep(1000);

        const input = className("android.widget.EditText").findOne(3000);
        if (input) {
            this.human.naturalTyping(input, text);
            sleep(500);

            const postBtn = desc("댓글").findOne(2000) || id("send_button").findOne(2000);
            if (postBtn) {
                const btnBounds = postBtn.bounds();
                this.human.naturalClick(btnBounds.centerX(), btnBounds.centerY());
                sleep(2000);
                return true;
            }
        }
    }
    return false;
}

getRandomComment() {
    const templates = this.config?.comment_templates || [
        "좋은 영상이네요!",
        "정말 유익합니다",
        "잘 봤습니다 👍"
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}
```

### 3. youtube.js - extractVideoInfo() 신규 추가
목표: 현재 재생 중인 영상 정보 추출

```javascript
extractVideoInfo() {
    try {
        const titleElement = id("title").findOne(3000) ||
                            className("android.widget.TextView")
                                .textMatches(/^(?!.*채널).*$/)
                                .findOne(3000);

        const channelElement = id("channel_name").findOne(2000) ||
                              id("owner_text").findOne(2000);

        return {
            title: titleElement?.text() || null,
            channel: channelElement?.text() || null,
            timestamp: new Date().toISOString()
        };
    } catch (e) {
        this.logger.error('영상 정보 추출 실패', { error: e.message });
        return { title: null, channel: null, timestamp: new Date().toISOString() };
    }
}
```

## 완료 기준
- [ ] `clickLike(true)` 호출 시 강제 좋아요
- [ ] `clickLike(false)` 호출 시 좋아요 스킵
- [ ] `clickLike()` 호출 시 기존 확률 동작
- [ ] `writeComment("테스트 댓글")` 호출 시 해당 텍스트 작성
- [ ] `extractVideoInfo()` 호출 시 영상 제목/채널 반환

## 브랜치
`feature/pr-03-core-automation`

## 커밋 메시지 형식
```
feat(youtube): clickLike/writeComment 파라미터 지원 추가

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

## WAVE 2: WAVE 1 완료 후 시작

### 🅲 PR-02: Data Layer (Agent C)

```markdown
# PR-02 핸드오프: Data Layer - Supabase 단일화

## 담당 범위
- `supabase/migrations/**`
- `services/persona-service/main.py`
- `services/persona-service/db.py` (신규)
- `services/persona-service/existence_machine.py`
- `services/persona-service/attention_economy.py`

## 수정 금지 파일 (다른 에이전트 담당)
- `gateway/**` → PR-04
- `autox-scripts/**` → PR-01, PR-03, PR-05 등
- `backend/api/**` → 별도 작업

## 선행 조건
- PR-01 완료 (Foundation Layer)

## 작업 상세

### 1. 신규 마이그레이션 파일 생성
파일: `/supabase/migrations/010_persona_existence_state.sql`

```sql
-- 010_persona_existence_state.sql
-- Persona Service의 existence_state를 Supabase personas 테이블에 통합

-- 1. existence_state enum 타입 생성 (기존 persona_state와 별도)
DO $$ BEGIN
    CREATE TYPE existence_state_enum AS ENUM (
        'active',
        'waiting',
        'fading',
        'void'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. personas 테이블에 existence 관련 컬럼 추가
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS existence_state existence_state_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 5 CHECK (priority_level BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS uniqueness_score REAL DEFAULT 0.5 CHECK (uniqueness_score BETWEEN 0 AND 1),
ADD COLUMN IF NOT EXISTS visibility_score REAL DEFAULT 0.5 CHECK (visibility_score BETWEEN 0 AND 1),
ADD COLUMN IF NOT EXISTS attention_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_in_void REAL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS assimilation_progress REAL DEFAULT 0.0 CHECK (assimilation_progress BETWEEN 0 AND 1),
ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS void_entered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_activities INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_discoveries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS viral_comments INTEGER DEFAULT 0;

-- 3. youtube_video_tasks에 FK 제약조건 추가
-- 주의: 기존 데이터 정합성 확인 필요
DO $$ BEGIN
    ALTER TABLE youtube_video_tasks
    ADD CONSTRAINT fk_youtube_video_tasks_device
    FOREIGN KEY (device_serial)
    REFERENCES personas(device_serial)
    ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'FK 제약조건 추가 실패: 정합성 없는 device_serial 존재';
END $$;

-- 4. 활동 로그 테이블 생성
CREATE TABLE IF NOT EXISTS persona_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL REFERENCES personas(persona_id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL,
    target_url TEXT,
    target_title TEXT,
    comment_text TEXT,
    points_earned INTEGER DEFAULT 0,
    uniqueness_delta REAL DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_personas_existence_state ON personas(existence_state);
CREATE INDEX IF NOT EXISTS idx_personas_priority ON personas(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_persona ON persona_activity_logs(persona_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON persona_activity_logs(created_at DESC);
```

### 2. Supabase 연결 모듈 생성
파일: `/services/persona-service/db.py` (신규)

```python
"""
Supabase Database Connection
SQLite 대체 - PostgreSQL 단일 소스
"""
import os
from typing import Optional
from supabase import create_client, Client
from loguru import logger

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """Supabase 클라이언트 싱글톤"""
    global _supabase_client

    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")  # service_role key 사용

        if not url or not key:
            raise ValueError("SUPABASE_URL과 SUPABASE_SERVICE_KEY 환경변수 필요")

        _supabase_client = create_client(url, key)
        logger.info("Supabase 클라이언트 초기화 완료")

    return _supabase_client

def reset_client():
    """테스트용 클라이언트 리셋"""
    global _supabase_client
    _supabase_client = None
```

### 3. main.py SQLite → Supabase 전환
파일: `/services/persona-service/main.py`

주요 변경:
1. `import sqlite3` 제거
2. `from db import get_supabase_client` 추가
3. 모든 SQL 쿼리를 Supabase Python SDK 호출로 변경

예시 변환:
```python
# 수정 전 (SQLite)
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

# 수정 후 (Supabase)
from db import get_supabase_client

def get_db():
    return get_supabase_client()
```

```python
# 수정 전 (SQLite)
cursor = conn.execute("SELECT * FROM personas WHERE id = ?", (persona_id,))
row = cursor.fetchone()

# 수정 후 (Supabase)
result = get_db().table('personas').select('*').eq('persona_id', persona_id).execute()
row = result.data[0] if result.data else None
```

### 4. existence_machine.py 수정
- DB 의존성 제거 (순수 로직만 유지)
- 이미 상태 없음 (확인 필요)

### 5. attention_economy.py 수정
- DB 의존성 제거 (순수 로직만 유지)
- 이미 상태 없음 (확인 필요)

## 완료 기준
- [ ] 마이그레이션 스크립트 실행 성공
- [ ] `services/persona-service/` 에서 SQLite import 제거
- [ ] 모든 CRUD가 Supabase로 동작
- [ ] 기존 테스트 통과 (있다면)

## 브랜치
`feature/pr-02-supabase-unification`

## 환경변수 필요
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 커밋 메시지 형식
```
feat(db): SQLite → Supabase 단일화

- personas 테이블에 existence_state 컬럼 추가
- youtube_video_tasks FK 제약조건 추가
- persona-service Supabase 클라이언트 전환

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

### 🅳 PR-07: Interaction + OpenAI (Agent D)

```markdown
# PR-07 핸드오프: Interaction Engine + OpenAI

## 담당 범위
- `autox-scripts/persona-automation/modules/interaction.js`
- `autox-scripts/persona-automation/modules/openai-helper.js`

## 수정 금지 파일 (다른 에이전트 담당)
- `autox-scripts/modules/youtube.js` → PR-03 (먼저 완료되어야 함)
- `autox-scripts/modules/api.js` → PR-05
- `autox-scripts/persona-automation/modules/persona-manager.js` → PR-06

## 선행 조건
- PR-03 완료 (youtube.js의 clickLike/writeComment 파라미터 지원)

## 작업 상세

### 1. interaction.js 수정
파일: `/autox-scripts/persona-automation/modules/interaction.js`

```javascript
/**
 * Interaction Engine
 * 확률 기반 인터랙션 (좋아요, 댓글)
 * OpenAI 연동으로 페르소나 기반 댓글 생성
 */

class InteractionEngine {
    constructor(config, logger, youtube, openaiHelper) {
        this.config = config;
        this.logger = logger;
        this.youtube = youtube;
        this.openai = openaiHelper;

        this.lastLiked = false;
        this.lastCommented = false;
        this.lastCommentText = null;
    }

    /**
     * 확률 기반 인터랙션 수행
     */
    async performInteraction({ videoInfo, persona, likeProbability, commentProbability }) {
        this.logger.info('🎭 인터랙션 시작', {
            video: videoInfo?.title?.substring(0, 30),
            likeProbability,
            commentProbability
        });

        // 초기화
        this.lastLiked = false;
        this.lastCommented = false;
        this.lastCommentText = null;

        // 1. 좋아요 (확률 기반)
        const shouldLike = Math.random() < likeProbability;
        if (shouldLike) {
            // PR-03에서 수정된 clickLike(forceLike) 사용
            const likeResult = this.youtube.clickLike(true);
            this.lastLiked = likeResult;

            if (likeResult) {
                this.logger.info('👍 좋아요 성공');
            }
        }

        // 2. 댓글 (확률 기반 + OpenAI)
        const shouldComment = Math.random() < commentProbability;
        if (shouldComment && videoInfo) {
            try {
                // OpenAI로 페르소나 기반 댓글 생성
                const commentText = await this.openai.generateComment(videoInfo, persona);

                if (commentText) {
                    // PR-03에서 수정된 writeComment(text) 사용
                    const commentResult = this.youtube.writeComment(commentText);

                    if (commentResult) {
                        this.lastCommented = true;
                        this.lastCommentText = commentText;
                        this.logger.info('💬 댓글 작성 성공', {
                            text: commentText.substring(0, 50) + '...'
                        });
                    }
                }
            } catch (e) {
                this.logger.error('댓글 생성/작성 실패', { error: e.message });
            }
        }

        this.logger.info('✅ 인터랙션 완료', {
            liked: this.lastLiked,
            commented: this.lastCommented
        });

        return {
            liked: this.lastLiked,
            commented: this.lastCommented,
            commentText: this.lastCommentText
        };
    }
}

module.exports = InteractionEngine;
```

### 2. openai-helper.js 완성
파일: `/autox-scripts/persona-automation/modules/openai-helper.js`

```javascript
/**
 * OpenAI Helper
 * 페르소나 기반 자연스러운 댓글 생성
 *
 * @author Axon (Builder)
 */

class OpenAIHelper {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.apiKey = config?.openai?.apiKey || '';
        this.model = config?.openai?.model || 'gpt-4o-mini';
        this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * 페르소나 기반 댓글 생성
     */
    async generateComment(videoInfo, persona) {
        if (!this.apiKey) {
            this.logger.warn('⚠️ OpenAI API 키 없음, 템플릿 댓글 사용');
            return this.getFallbackComment();
        }

        if (!videoInfo?.title) {
            this.logger.warn('⚠️ 영상 정보 없음');
            return null;
        }

        try {
            const prompt = this.buildPrompt(videoInfo, persona);

            this.logger.debug('🤖 OpenAI 요청', {
                model: this.model,
                videoTitle: videoInfo.title.substring(0, 30)
            });

            const response = http.postJson(this.baseUrl, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt(persona)
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 100,
                temperature: 0.8
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            if (response.statusCode === 200) {
                const data = response.body.json();
                const comment = data.choices?.[0]?.message?.content?.trim();

                if (comment) {
                    // 댓글 정제 (이모지 과다, 길이 제한 등)
                    return this.sanitizeComment(comment);
                }
            } else {
                this.logger.error('OpenAI API 에러', {
                    status: response.statusCode,
                    body: response.body.string()
                });
            }

            return this.getFallbackComment();

        } catch (e) {
            this.logger.error('OpenAI 호출 실패', { error: e.message });
            return this.getFallbackComment();
        }
    }

    /**
     * 시스템 프롬프트 생성
     */
    getSystemPrompt(persona) {
        const traits = persona?.traits || {};
        const name = persona?.name || '익명';

        return `당신은 "${name}"이라는 YouTube 시청자입니다.

성격 특성:
- 호기심: ${traits.curiosity || 50}/100
- 열정: ${traits.enthusiasm || 50}/100
- 회의적: ${traits.skepticism || 50}/100
- 공감력: ${traits.empathy || 50}/100
- 유머: ${traits.humor || 50}/100
- 전문성: ${traits.expertise || 50}/100

규칙:
1. 한국어로 자연스럽게 댓글을 작성하세요
2. 20-80자 사이로 작성하세요
3. 이모지는 최대 1개만 사용하세요
4. 광고성 문구 금지
5. 성격에 맞게 반응하세요 (호기심 높으면 질문, 유머 높으면 재치있게)`;
    }

    /**
     * 사용자 프롬프트 생성
     */
    buildPrompt(videoInfo, persona) {
        const title = videoInfo.title || '제목 없음';
        const channel = videoInfo.channel || '알 수 없음';

        return `영상 제목: "${title}"
채널: ${channel}

이 영상에 대한 자연스러운 댓글을 한 줄로 작성해주세요.`;
    }

    /**
     * 댓글 정제
     */
    sanitizeComment(comment) {
        // 따옴표 제거
        let cleaned = comment.replace(/^["']|["']$/g, '');

        // 이모지 개수 제한 (최대 1개)
        const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
        const emojis = cleaned.match(emojiRegex) || [];
        if (emojis.length > 1) {
            // 첫 번째 이모지만 유지
            let emojiCount = 0;
            cleaned = cleaned.replace(emojiRegex, (match) => {
                emojiCount++;
                return emojiCount === 1 ? match : '';
            });
        }

        // 길이 제한 (100자)
        if (cleaned.length > 100) {
            cleaned = cleaned.substring(0, 97) + '...';
        }

        return cleaned.trim();
    }

    /**
     * 폴백 댓글 (API 실패시)
     */
    getFallbackComment() {
        const templates = [
            '좋은 영상이네요!',
            '유익한 내용 감사합니다',
            '잘 봤습니다 👍',
            '정말 도움이 됐어요',
            '좋은 정보 감사해요'
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }
}

module.exports = OpenAIHelper;
```

## 완료 기준
- [ ] OpenAI API 키 있을 때: 페르소나 기반 댓글 생성
- [ ] OpenAI API 키 없을 때: 폴백 템플릿 댓글
- [ ] 댓글 길이 100자 이내
- [ ] 이모지 1개 이하
- [ ] 에러 시 graceful degradation

## 환경변수 필요
```javascript
// config/variables.json
{
    "openai": {
        "apiKey": "sk-...",
        "model": "gpt-4o-mini"
    }
}
```

## 브랜치
`feature/pr-07-openai-interaction`

## 커밋 메시지 형식
```
feat(openai): 페르소나 기반 댓글 생성 구현

- OpenAI GPT-4o-mini 연동
- 성격 특성 기반 프롬프트
- 폴백 메커니즘

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

### 🅴 PR-08: Content Explorer (Agent E)

```markdown
# PR-08 핸드오프: Content Explorer

## 담당 범위
- `autox-scripts/persona-automation/modules/content-explorer.js`

## 수정 금지 파일 (다른 에이전트 담당)
- `autox-scripts/modules/youtube.js` → PR-03
- `autox-scripts/persona-automation/modules/interaction.js` → PR-07
- `autox-scripts/persona-automation/modules/persona-manager.js` → PR-06

## 선행 조건
- PR-03 완료 (youtube.js searchByKeyword 등)

## 작업 상세

### 1. content-explorer.js 안정화
파일: `/autox-scripts/persona-automation/modules/content-explorer.js`

```javascript
/**
 * Content Explorer
 * 페르소나 기반 자율 탐색
 *
 * @author Axon (Builder)
 */

class ContentExplorer {
    constructor(config, logger, youtube) {
        this.config = config;
        this.logger = logger;
        this.youtube = youtube;

        // 기본 키워드 풀 (config 없을 때 폴백)
        this.defaultKeywords = [
            '일상 브이로그',
            '먹방',
            '게임 플레이',
            '음악 추천',
            '영화 리뷰'
        ];
    }

    /**
     * 페르소나 기반 키워드 선택
     */
    selectKeyword(persona) {
        try {
            // 1. 페르소나 선호 카테고리에서 선택
            const preferredCategories = persona?.path_summary?.preferred_categories || [];

            if (preferredCategories.length > 0 && Math.random() < 0.7) {
                // 70% 확률로 선호 카테고리에서 선택
                const keyword = preferredCategories[
                    Math.floor(Math.random() * preferredCategories.length)
                ];
                this.logger.info('📌 선호 카테고리 키워드 선택', { keyword });
                return keyword;
            }

            // 2. 설정 파일의 키워드 풀에서 선택
            const keywordPool = this.getKeywordPool();

            if (keywordPool.length > 0) {
                const keyword = keywordPool[
                    Math.floor(Math.random() * keywordPool.length)
                ];
                this.logger.info('🎲 랜덤 키워드 선택', { keyword });
                return keyword;
            }

            // 3. 폴백
            const fallback = this.defaultKeywords[
                Math.floor(Math.random() * this.defaultKeywords.length)
            ];
            this.logger.warn('⚠️ 폴백 키워드 사용', { keyword: fallback });
            return fallback;

        } catch (e) {
            this.logger.error('키워드 선택 실패', { error: e.message });
            return this.defaultKeywords[0];
        }
    }

    /**
     * 설정에서 키워드 풀 가져오기
     */
    getKeywordPool() {
        try {
            // config에서 먼저 시도
            if (this.config?.exploration?.keywordPool) {
                return this.config.exploration.keywordPool;
            }

            // variables.json에서 시도
            const variablesPath = './config/variables.json';
            if (files.exists(variablesPath)) {
                const variables = JSON.parse(files.read(variablesPath));
                if (variables?.exploration?.keywordPool) {
                    return variables.exploration.keywordPool;
                }
            }

            return [];
        } catch (e) {
            this.logger.warn('키워드 풀 로드 실패', { error: e.message });
            return [];
        }
    }

    /**
     * 자율 탐색 실행
     */
    async explore(persona) {
        this.logger.info('🌐 자율 탐색 시작');

        try {
            // 1. 키워드 선택
            const keyword = this.selectKeyword(persona);

            // 2. YouTube 검색
            if (!this.youtube.launchYouTube()) {
                throw new Error('YouTube 앱 실행 실패');
            }

            if (!this.youtube.searchByKeyword(keyword)) {
                throw new Error('검색 실패');
            }

            sleep(2000);

            // 3. 랜덤 순위 비디오 선택 (1-5위)
            const rank = Math.floor(Math.random() * 5) + 1;

            if (!this.youtube.selectVideoByRank(rank)) {
                throw new Error('비디오 선택 실패');
            }

            sleep(2000);

            // 4. 영상 정보 추출
            const videoInfo = this.youtube.extractVideoInfo?.() || { title: keyword };

            this.logger.info('✅ 탐색 완료', {
                keyword,
                rank,
                video: videoInfo.title?.substring(0, 30)
            });

            return {
                success: true,
                keyword,
                rank,
                videoInfo
            };

        } catch (e) {
            this.logger.error('❌ 자율 탐색 실패', { error: e.message });
            return {
                success: false,
                error: e.message
            };
        }
    }
}

module.exports = ContentExplorer;
```

## 완료 기준
- [ ] config undefined 시 크래시 없음
- [ ] variables.json 없을 때 폴백 동작
- [ ] 페르소나 선호 카테고리 우선 선택
- [ ] 탐색 실패 시 에러 핸들링

## 브랜치
`feature/pr-08-content-explorer`

## 커밋 메시지 형식
```
feat(explorer): 자율 탐색 안정화

- config 널 체크 추가
- 폴백 키워드 풀 구현
- 에러 핸들링 강화

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

## WAVE 3: WAVE 2 완료 후 시작

### 🅵 PR-04: Gateway API (Agent F)

```markdown
# PR-04 핸드오프: Gateway API

## 담당 범위
- `gateway/src/api/routes/citizens.js` (수정)
- `gateway/src/api/routes/personas.js` (신규)
- `gateway/src/api/routes/traces.js` (신규)
- `gateway/src/api/routes/youtube-videos.js` (수정)

## 수정 금지 파일 (다른 에이전트 담당)
- `gateway/src/services/**` → 기존 유지
- `autox-scripts/**` → PR-05
- `services/persona-service/**` → PR-02

## 선행 조건
- PR-02 완료 (Supabase 스키마 마이그레이션)

## 작업 상세

### 1. personas.js 라우터 생성
파일: `/gateway/src/api/routes/personas.js` (신규)

```javascript
/**
 * Persona API Routes
 * 페르소나 CRUD 및 상태 관리
 */
const express = require('express');
const router = express.Router();
const { getSupabase } = require('../../services/supabase');

// GET /api/personas/:deviceSerial - 디바이스로 페르소나 조회
router.get('/:deviceSerial', async (req, res) => {
    try {
        const { deviceSerial } = req.params;

        const { data, error } = await getSupabase()
            .from('personas')
            .select('*')
            .eq('device_serial', deviceSerial)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: '페르소나를 찾을 수 없습니다'
            });
        }

        res.json({
            success: true,
            persona: data
        });

    } catch (e) {
        console.error('페르소나 조회 실패:', e);
        res.status(500).json({
            success: false,
            message: e.message
        });
    }
});

// POST /api/personas - 새 페르소나 생성
router.post('/', async (req, res) => {
    try {
        const {
            device_serial,
            given_name,
            persona_state = 'NASCENT',
            uncertainty_config,
            path_summary,
            birth_context
        } = req.body;

        if (!device_serial) {
            return res.status(400).json({
                success: false,
                message: 'device_serial 필수'
            });
        }

        // 중복 체크
        const { data: existing } = await getSupabase()
            .from('personas')
            .select('persona_id')
            .eq('device_serial', device_serial)
            .single();

        if (existing) {
            return res.status(409).json({
                success: false,
                message: '이미 페르소나가 존재합니다',
                persona: existing
            });
        }

        // 생성
        const { data, error } = await getSupabase()
            .from('personas')
            .insert({
                device_serial,
                given_name: given_name || `Persona-${device_serial.slice(-4)}`,
                persona_state,
                uncertainty_config: uncertainty_config || {},
                path_summary: path_summary || {},
                birth_context: birth_context || {},
                existence_state: 'active',
                priority_level: 5,
                uniqueness_score: 0.5,
                visibility_score: 0.5
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            persona: data
        });

    } catch (e) {
        console.error('페르소나 생성 실패:', e);
        res.status(500).json({
            success: false,
            message: e.message
        });
    }
});

// PATCH /api/personas/:personaId/path - 경로 업데이트
router.patch('/:personaId/path', async (req, res) => {
    try {
        const { personaId } = req.params;
        const { action, keyword, videoInfo, timestamp } = req.body;

        // 현재 path_summary 조회
        const { data: current, error: fetchError } = await getSupabase()
            .from('personas')
            .select('path_summary')
            .eq('persona_id', personaId)
            .single();

        if (fetchError) throw fetchError;

        // path_summary 업데이트
        const pathSummary = current?.path_summary || {};
        pathSummary.total_actions = (pathSummary.total_actions || 0) + 1;

        // 선호 카테고리 업데이트
        if (keyword) {
            const preferred = pathSummary.preferred_categories || [];
            if (!preferred.includes(keyword)) {
                preferred.push(keyword);
                if (preferred.length > 10) preferred.shift();
            }
            pathSummary.preferred_categories = preferred;
        }

        const { data, error } = await getSupabase()
            .from('personas')
            .update({
                path_summary: pathSummary,
                updated_at: new Date().toISOString()
            })
            .eq('persona_id', personaId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            persona: data
        });

    } catch (e) {
        console.error('경로 업데이트 실패:', e);
        res.status(500).json({
            success: false,
            message: e.message
        });
    }
});

module.exports = router;
```

### 2. traces.js 라우터 생성
파일: `/gateway/src/api/routes/traces.js` (신규)

```javascript
/**
 * Trace API Routes
 * 활동 기록 (Append-only)
 */
const express = require('express');
const router = express.Router();
const { getSupabase } = require('../../services/supabase');

// POST /api/traces - 새 트레이스 기록
router.post('/', async (req, res) => {
    try {
        const {
            device_serial,
            action_type,
            action_params,
            outcome_success,
            outcome_summary
        } = req.body;

        if (!device_serial || !action_type) {
            return res.status(400).json({
                success: false,
                message: 'device_serial, action_type 필수'
            });
        }

        const { data, error } = await getSupabase()
            .from('traces')
            .insert({
                device_serial,
                action_type,
                action_params: action_params || {},
                outcome_success: outcome_success ?? true,
                outcome_summary: outcome_summary || {},
                traced_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            trace: data
        });

    } catch (e) {
        console.error('트레이스 기록 실패:', e);
        res.status(500).json({
            success: false,
            message: e.message
        });
    }
});

module.exports = router;
```

### 3. youtube-videos.js 수정
파일: `/gateway/src/api/routes/youtube-videos.js`

쿼리 파라미터 추가:
```javascript
// 기존
router.get('/today', async (req, res) => {
    const { date } = req.query;
    // ...
});

// 수정 후
router.get('/today', async (req, res) => {
    const { date, maxHour, status } = req.query;

    let query = getSupabase()
        .from('youtube_videos')
        .select('*');

    if (date) {
        query = query.eq('date', date);
    }

    if (maxHour !== undefined) {
        query = query.lte('time', parseInt(maxHour));
    }

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    // ...
});

// 작업 완료 엔드포인트 추가
router.post('/tasks/complete', async (req, res) => {
    const {
        video_id,
        device_serial,
        watch_duration,
        liked,
        commented,
        comment_text,
        error_message
    } = req.body;

    const status = error_message ? 'failed' : 'completed';

    const { data, error } = await getSupabase()
        .from('youtube_video_tasks')
        .update({
            status,
            watch_duration_seconds: watch_duration,
            liked: liked || false,
            commented: commented || false,
            comment_text,
            error_message,
            completed_at: new Date().toISOString()
        })
        .eq('video_id', video_id)
        .eq('device_serial', device_serial)
        .select()
        .single();

    if (error) throw error;

    res.json({ success: true, task: data });
});
```

### 4. 라우터 등록
파일: `/gateway/src/api/index.js` 또는 `/gateway/server.js`

```javascript
const personasRouter = require('./api/routes/personas');
const tracesRouter = require('./api/routes/traces');

app.use('/api/personas', personasRouter);
app.use('/api/traces', tracesRouter);
```

## 완료 기준
- [ ] GET /api/personas/:deviceSerial 동작
- [ ] POST /api/personas 생성 성공
- [ ] PATCH /api/personas/:id/path 업데이트 성공
- [ ] POST /api/traces 기록 성공
- [ ] POST /api/youtube/tasks/complete 동작

## 브랜치
`feature/pr-04-gateway-api`

## 커밋 메시지 형식
```
feat(gateway): 페르소나/트레이스 API 추가

- GET/POST /api/personas
- PATCH /api/personas/:id/path
- POST /api/traces
- POST /api/youtube/tasks/complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

### 🅶 PR-06: Persona System (Agent G)

```markdown
# PR-06 핸드오프: Persona System

## 담당 범위
- `autox-scripts/persona-automation/modules/persona-manager.js`
- `autox-scripts/persona-automation/modules/persona-checker.js`

## 수정 금지 파일 (다른 에이전트 담당)
- `autox-scripts/modules/api.js` → PR-05
- `autox-scripts/modules/youtube.js` → PR-03
- `autox-scripts/persona-automation/modules/interaction.js` → PR-07

## 선행 조건
- PR-04 완료 (Gateway API 엔드포인트)
- PR-05 완료 (api.js 함수 추가)

## 작업 상세

### 1. persona-manager.js 수정
파일: `/autox-scripts/persona-automation/modules/persona-manager.js`

API 응답 형식 매핑 추가:

```javascript
/**
 * Persona Manager
 * 페르소나 생성/조회/업데이트
 */

class PersonaManager {
    constructor(config, logger, api) {
        this.config = config;
        this.logger = logger;
        this.api = api;
    }

    /**
     * 페르소나 조회
     */
    async getPersona(deviceSerial) {
        try {
            this.logger.info('🔍 페르소나 조회', { deviceSerial });

            // PR-05에서 추가된 api.getPersona() 사용
            const response = await this.api.getPersona(deviceSerial);

            if (response && response.success && response.persona) {
                const persona = this.mapPersonaResponse(response.persona);

                this.logger.info('✅ 기존 페르소나 발견', {
                    id: persona.id,
                    name: persona.name,
                    aidentity: persona.aidentity_version
                });

                return persona;
            }

            this.logger.info('📭 페르소나 없음 (신규 생성 필요)');
            return null;

        } catch (e) {
            this.logger.error('❌ 페르소나 조회 실패', { error: e.message });
            return null;
        }
    }

    /**
     * API 응답을 내부 형식으로 매핑
     */
    mapPersonaResponse(apiPersona) {
        return {
            id: apiPersona.persona_id,
            persona_id: apiPersona.persona_id,
            name: apiPersona.given_name,
            device_serial: apiPersona.device_serial,
            persona_state: apiPersona.persona_state,
            existence_state: apiPersona.existence_state || 'active',
            aidentity_version: apiPersona.aidentity_version || 1,
            traits: this.extractTraits(apiPersona),
            path_summary: apiPersona.path_summary || {},
            uncertainty_config: apiPersona.uncertainty_config || {}
        };
    }

    /**
     * Supabase 형식에서 traits 추출
     */
    extractTraits(apiPersona) {
        // Supabase personas 테이블의 Big Five 또는 uncertainty_config에서 추출
        const config = apiPersona.uncertainty_config || {};
        const weights = config.personality_weights || {};

        return {
            curiosity: (weights.curious || 0.5) * 100,
            enthusiasm: (weights.persistent || 0.5) * 100,
            skepticism: 50,
            empathy: (weights.social || 0.5) * 100,
            humor: 50,
            expertise: 50,
            formality: 50,
            verbosity: 50
        };
    }

    /**
     * 페르소나 생성
     */
    async createPersona(data) {
        try {
            this.logger.info('👶 페르소나 생성', {
                deviceSerial: data.device_serial,
                keywords: data.initial_keywords
            });

            // PR-05에서 추가된 api.createPersona() 사용
            const response = await this.api.createPersona({
                device_serial: data.device_serial,
                given_name: this.generateName(data.device_serial),
                persona_state: 'NASCENT',
                uncertainty_config: this.generateUncertaintyConfig(),
                path_summary: {
                    total_actions: 0,
                    action_distribution: {},
                    preferred_categories: data.initial_keywords || [],
                    avoided_categories: [],
                    interaction_patterns: {},
                    temporal_preferences: {}
                },
                birth_context: {
                    first_screenshots: data.screenshots || [],
                    first_keywords: data.initial_keywords || [],
                    birth_timestamp: Date.now()
                }
            });

            if (response && response.success && response.persona) {
                const persona = this.mapPersonaResponse(response.persona);

                this.logger.info('✅ 페르소나 생성 완료', {
                    id: persona.id,
                    name: persona.name
                });

                return persona;
            }

            throw new Error('페르소나 생성 응답 오류');

        } catch (e) {
            this.logger.error('❌ 페르소나 생성 실패', { error: e.message });
            return null;
        }
    }

    /**
     * 선호도 업데이트
     */
    async updatePreferences(personaId, keyword, videoInfo) {
        try {
            // PR-05에서 추가된 api.updatePersonaPath() 사용
            await this.api.updatePersonaPath(personaId, {
                action: 'watched',
                keyword,
                videoInfo,
                timestamp: Date.now()
            });

            this.logger.debug('✓ 선호도 업데이트', { personaId, keyword });

        } catch (e) {
            this.logger.error('선호도 업데이트 실패', { error: e.message });
        }
    }

    /**
     * 랜덤 이름 생성
     */
    generateName(deviceSerial) {
        const prefixes = ['Echo', 'Nova', 'Aria', 'Stella', 'Luna', 'Sol', 'Nyx', 'Iris'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = deviceSerial.substring(deviceSerial.length - 3);

        return `${prefix}-${suffix}`;
    }

    /**
     * 불확실성 프로필 생성
     */
    generateUncertaintyConfig() {
        return {
            base_deviation: Math.random() * 0.2 + 0.1,
            personality_weights: {
                curious: Math.random(),
                persistent: Math.random(),
                social: Math.random(),
                contemplative: Math.random()
            },
            action_probability_modifiers: {
                skip_video_early: Math.random() * 0.2,
                watch_beyond_duration: Math.random() * 0.3,
                leave_comment: Math.random() * 0.15,
                explore_related: Math.random() * 0.4
            },
            temporal_patterns: {
                peak_activity_hours: [
                    Math.floor(Math.random() * 6) + 8,
                    Math.floor(Math.random() * 6) + 14,
                    Math.floor(Math.random() * 4) + 20
                ],
                rest_probability: Math.random() * 0.2
            }
        };
    }
}

module.exports = PersonaManager;
```

### 2. persona-checker.js 완성
스크린샷 캡처 및 키워드 추출 로직 추가

## 완료 기준
- [ ] api.getPersona() 호출 및 응답 매핑
- [ ] api.createPersona() 호출 성공
- [ ] api.updatePersonaPath() 호출 성공
- [ ] Supabase 응답 형식 → 내부 형식 변환

## 브랜치
`feature/pr-06-persona-system`

## 커밋 메시지 형식
```
feat(persona): API 응답 매핑 및 생성 로직 완성

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

## WAVE 4: WAVE 3 완료 후 시작

### 🅷 PR-05: API Client (Agent H)

```markdown
# PR-05 핸드오프: API Client Layer

## 담당 범위
- `autox-scripts/modules/api.js` (함수 추가)

## 수정 금지 파일 (다른 에이전트 담당)
- 이 파일만 수정 가능
- 다른 모든 파일은 다른 에이전트 담당

## 선행 조건
- PR-01 완료 (api.js 기본 설정)
- PR-04 완료 (Gateway API 엔드포인트)

## 작업 상세

### api.js에 5개 함수 추가

파일: `/autox-scripts/modules/api.js`

기존 함수 뒤에 추가:

```javascript
    // ==================== 페르소나 API ====================

    /**
     * 디바이스로 페르소나 조회
     * GET /api/personas/:deviceSerial
     */
    getPersona(deviceSerial) {
        try {
            this.logger.info('페르소나 조회 중...', { deviceSerial });

            const url = `${this.baseUrl}/api/personas/${deviceSerial}`;
            const response = http.get(url, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.statusCode === 200) {
                const data = response.body.json();
                return data;
            } else if (response.statusCode === 404) {
                this.logger.debug('페르소나 없음');
                return { success: false, persona: null };
            } else {
                this.logger.error('페르소나 조회 실패', {
                    status: response.statusCode
                });
                return null;
            }
        } catch (e) {
            this.logger.error('페르소나 조회 예외', { error: e.message });
            return null;
        }
    }

    /**
     * 새 페르소나 생성
     * POST /api/personas
     */
    createPersona(data) {
        try {
            this.logger.info('페르소나 생성 중...', {
                deviceSerial: data.device_serial
            });

            const url = `${this.baseUrl}/api/personas`;
            const response = http.postJson(url, data, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.statusCode === 201) {
                const result = response.body.json();
                this.logger.info('페르소나 생성 성공', {
                    id: result.persona?.persona_id
                });
                return result;
            } else if (response.statusCode === 409) {
                this.logger.warn('페르소나 이미 존재');
                return response.body.json();
            } else {
                this.logger.error('페르소나 생성 실패', {
                    status: response.statusCode,
                    body: response.body.string()
                });
                return null;
            }
        } catch (e) {
            this.logger.error('페르소나 생성 예외', { error: e.message });
            return null;
        }
    }

    /**
     * 페르소나 경로 업데이트
     * PATCH /api/personas/:personaId/path
     */
    updatePersonaPath(personaId, data) {
        try {
            this.logger.debug('경로 업데이트 중...', { personaId });

            const url = `${this.baseUrl}/api/personas/${personaId}/path`;
            const response = http.request(url, {
                method: 'PATCH',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.statusCode === 200) {
                return response.body.json();
            } else {
                this.logger.error('경로 업데이트 실패', {
                    status: response.statusCode
                });
                return null;
            }
        } catch (e) {
            this.logger.error('경로 업데이트 예외', { error: e.message });
            return null;
        }
    }

    // ==================== 트레이스 API ====================

    /**
     * 트레이스 기록
     * POST /api/traces
     */
    recordTrace(data) {
        try {
            this.logger.debug('트레이스 기록 중...');

            const url = `${this.baseUrl}/api/traces`;
            const payload = {
                device_serial: this.deviceId,
                ...data
            };

            const response = http.postJson(url, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.statusCode === 201) {
                return true;
            } else {
                this.logger.warn('트레이스 기록 실패', {
                    status: response.statusCode
                });
                return false;
            }
        } catch (e) {
            this.logger.error('트레이스 기록 예외', { error: e.message });
            return false;
        }
    }

    // ==================== YouTube 작업 API ====================

    /**
     * 영상 작업 완료 보고
     * POST /api/youtube/tasks/complete
     */
    completeVideoTask(data) {
        try {
            this.logger.info('작업 완료 보고 중...', {
                videoId: data.video_id
            });

            const url = `${this.baseUrl}/api/youtube/tasks/complete`;
            const payload = {
                device_serial: this.deviceId,
                ...data
            };

            const response = http.postJson(url, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.statusCode === 200) {
                this.logger.info('작업 완료 보고 성공');
                return true;
            } else {
                this.logger.error('작업 완료 보고 실패', {
                    status: response.statusCode,
                    body: response.body.string()
                });
                return false;
            }
        } catch (e) {
            this.logger.error('작업 완료 보고 예외', { error: e.message });
            return false;
        }
    }
```

## 완료 기준
- [ ] getPersona(deviceSerial) 동작
- [ ] createPersona(data) 동작
- [ ] updatePersonaPath(personaId, data) 동작
- [ ] recordTrace(data) 동작
- [ ] completeVideoTask(data) 동작

## 브랜치
`feature/pr-05-api-client`

## 커밋 메시지 형식
```
feat(api): 페르소나/트레이스 API 클라이언트 함수 추가

- getPersona, createPersona, updatePersonaPath
- recordTrace
- completeVideoTask

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

### 🅸 PR-09: Command Fetch (Agent I)

```markdown
# PR-09 핸드오프: Command Fetch Layer

## 담당 범위
- `autox-scripts/persona-automation/modules/command-fetcher.js`

## 수정 금지 파일 (다른 에이전트 담당)
- `gateway/src/api/routes/youtube-videos.js` → PR-04
- `autox-scripts/modules/api.js` → PR-05

## 선행 조건
- PR-04 완료 (youtube-videos API maxHour 파라미터)
- PR-05 완료 (api.js getTodayVideos 수정)

## 작업 상세

### command-fetcher.js 수정

파일: `/autox-scripts/persona-automation/modules/command-fetcher.js`

API 호출 파라미터 수정:

```javascript
/**
 * Command Fetcher
 * Supabase에서 지시 영상 가져오기
 */

class CommandFetcher {
    constructor(config, logger, api) {
        this.config = config;
        this.logger = logger;
        this.api = api;

        this.lastCheckTime = Date.now();
        this.executedVideoIds = new Set();
    }

    /**
     * 대기 중인 지시 영상 가져오기
     */
    async fetchPendingCommands() {
        try {
            const now = new Date();
            const currentHour = now.getHours();
            const today = now.toISOString().split('T')[0];

            this.logger.info('📋 지시 영상 조회', {
                date: today,
                hour: currentHour
            });

            // 수정된 API 호출 (PR-04에서 추가된 파라미터 사용)
            const videos = await this.api.getTodayVideos({
                date: today,
                maxHour: currentHour,
                status: 'assigned'
            });

            if (!videos || videos.length === 0) {
                this.logger.debug('📭 대기 중인 지시 없음');
                return [];
            }

            // 미실행 영상 필터링
            const pendingVideos = videos.filter(video =>
                !this.executedVideoIds.has(video.video_id)
            );

            this.logger.info('✅ 지시 영상 발견', {
                total: videos.length,
                pending: pendingVideos.length
            });

            return pendingVideos;

        } catch (e) {
            this.logger.error('❌ 지시 조회 실패', { error: e.message });
            return [];
        }
    }

    /**
     * 지시 실행 완료 표시
     */
    markExecuted(videoId) {
        this.executedVideoIds.add(videoId);
        this.logger.debug('✓ 영상 실행 완료 마킹', { videoId });
    }

    /**
     * 실행 기록 초기화 (자정)
     */
    resetDailyExecutions() {
        this.executedVideoIds.clear();
        this.logger.info('🔄 일일 실행 기록 초기화');
    }

    /**
     * 주기적 체크 (60초마다)
     */
    startPeriodicCheck(callback) {
        this.logger.info('⏰ 주기적 체크 시작 (60초 간격)');

        const interval = setInterval(async () => {
            const commands = await this.fetchPendingCommands();

            if (commands.length > 0) {
                callback(commands);
            }
        }, 60000);

        const midnightCheck = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                this.resetDailyExecutions();
            }
        }, 60000);

        return () => {
            clearInterval(interval);
            clearInterval(midnightCheck);
        };
    }
}

module.exports = CommandFetcher;
```

### api.js의 getTodayVideos도 수정 필요 (PR-05에 포함)

```javascript
// PR-05에서 수정
getTodayVideos(params) {
    const { date, maxHour, status } = params;

    let url = `${this.baseUrl}/api/youtube/videos/today?date=${date}`;

    if (maxHour !== undefined) {
        url += `&maxHour=${maxHour}`;
    }

    if (status) {
        url += `&status=${status}`;
    }

    // ... 기존 로직
}
```

## 완료 기준
- [ ] 현재 시간 기준으로 공개된 영상만 조회
- [ ] 'assigned' 상태 영상만 필터링
- [ ] 중복 실행 방지 (executedVideoIds)
- [ ] 자정 초기화 동작

## 브랜치
`feature/pr-09-command-fetch`

## 커밋 메시지 형식
```
feat(command): 시간대별 지시 영상 조회 수정

- maxHour, status 파라미터 추가
- 미실행 영상 필터링

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

## WAVE 5: 최종 통합 (단일 에이전트)

### 🅹 PR-10: Orchestration (단일 에이전트)

```markdown
# PR-10 핸드오프: Orchestration (최종 통합)

## 담당 범위
- `autox-scripts/persona-automation/main-persona.js`

## 선행 조건
- PR-01 ~ PR-09 모두 완료

## 작업 상세

### main-persona.js 수정

1. **line 393: videoInfo undefined 수정**
```javascript
// 수정 전
await personaManager.updatePreferences(currentPersona.id, keyword, videoInfo);

// 수정 후
const videoInfo = await youtube.extractVideoInfo();
await personaManager.updatePreferences(currentPersona.id, keyword, videoInfo);
```

2. **모듈 import 경로 확인**
모든 require 경로가 올바른지 확인

3. **에러 핸들러 참조 수정**
errorHandler 인스턴스 참조 확인

4. **리소스 정리 로직**
```javascript
// 종료 시 cleanup
process.on('SIGTERM', () => {
    isRunning = false;
    logger.info('🛑 SIGTERM 수신, 정리 중...');
});
```

## 통합 테스트 체크리스트
- [ ] 페르소나 초기화 성공
- [ ] 지시 영상 수신
- [ ] 영상 시청 완료
- [ ] 좋아요/댓글 동작
- [ ] 활동 로그 Supabase 기록
- [ ] 자율 탐색 동작
- [ ] 24시간 실행 안정성

## 브랜치
`feature/pr-10-orchestration`

## 커밋 메시지 형식
```
feat(main): 페르소나 자동화 최종 통합

- 모든 모듈 통합 테스트
- 에러 핸들링 강화
- 리소스 정리 로직

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

## 실행 요약

### 동시 실행 가능한 에이전트 그룹

| Wave | 에이전트 | PR | 시작 조건 |
|------|---------|-----|----------|
| **1** | A, B | PR-01, PR-03 | 즉시 시작 |
| **2** | C, D, E | PR-02, PR-07, PR-08 | Wave 1 완료 |
| **3** | F, G | PR-04, PR-06 | Wave 2 완료 |
| **4** | H, I | PR-05, PR-09 | Wave 3 완료 |
| **5** | J (단일) | PR-10 | Wave 4 완료 |

### 충돌 방지 규칙
1. 각 에이전트는 자신의 담당 파일만 수정
2. "수정 금지 파일" 목록 엄격 준수
3. 같은 파일 동시 수정 금지
4. 브랜치 명명 규칙 준수: `feature/pr-XX-name`
