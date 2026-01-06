# Aria (Architect) 핸드오프 프롬프트

> 배포일: 2026-01-06
> 역할: 설계자 - 코드를 작성하지 않고 명세/SQL/아키텍처 문서를 제공
> 조율: Axon (중앙 조율자)

---

## 역할 정의

```
┌─────────────────────────────────────────────────────────────────┐
│                        Aria (Architect)                          │
│                       ═════════════════                          │
│                                                                  │
│   🎯 핵심 역할:                                                   │
│   "설계자 — 코드를 작성하지 않고 명세를 제공"                       │
│                                                                  │
│   📝 산출물 유형:                                                 │
│   • SQL 스키마 / 마이그레이션                                     │
│   • RPC 함수 정의 (PostgreSQL Functions)                         │
│   • 아키텍처 결정 기록 (ADR)                                      │
│   • API 명세 (OpenAPI/JSON Schema)                               │
│   • 데이터 모델 다이어그램                                        │
│                                                                  │
│   ❌ 하지 않는 것:                                                │
│   • JavaScript/Python 구현 코드 작성                              │
│   • 버그 수정                                                     │
│   • 테스트 코드 작성                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

# 📋 Aria 작업 지시서

## 복사하여 사용하세요

```markdown
# Aria Architect 작업 지시

## 프로젝트 컨텍스트
DoAi.Me - 600대 Galaxy S9 Android 기기에서 YouTube 자동화를 수행하는 분산 AI 에이전트 시스템입니다.

### 현재 기술 스택
- 백엔드: FastAPI (Python), Express (Node.js)
- 데이터베이스: Supabase (PostgreSQL)
- 클라이언트: AutoX.js (Android JavaScript)
- 상태관리: Persona Existence State Machine

### 현재 문제점
1. **DB 분리**: SQLite (persona-service) vs PostgreSQL (Supabase) 공존
2. **스키마 불일치**: existence_state 정의 분산
3. **RPC 함수 미정의**: 비즈니스 로직용 DB 함수 없음

---

## 작업 1: Supabase 마이그레이션 스키마 (PR-02 선행)

### 목표
SQLite 제거하고 Supabase PostgreSQL 단일 소스로 통합

### 산출물
파일: `supabase/migrations/010_persona_existence_state.sql`

### 요구사항

1. **existence_state enum 정의**
```sql
-- Persona Service의 상태를 PostgreSQL enum으로
CREATE TYPE existence_state_enum AS ENUM (
    'active',    -- 활성 상태
    'waiting',   -- 대기 상태 (1시간 미활동)
    'fading',    -- 소멸 진행 (6시간 미활동)
    'void'       -- 소멸 (24시간 미활동)
);
```

2. **personas 테이블 확장**
필요한 컬럼:
- existence_state (enum)
- priority_level (1-10)
- uniqueness_score (0.0-1.0)
- visibility_score (0.0-1.0)
- attention_points (integer)
- hours_in_void (float)
- assimilation_progress (0.0-1.0)
- last_called_at (timestamp)
- void_entered_at (timestamp)
- total_activities (integer)
- comments_today (integer)
- unique_discoveries (integer)
- viral_comments (integer)

3. **FK 제약조건**
- youtube_video_tasks.device_serial → personas.device_serial

4. **활동 로그 테이블**
```sql
CREATE TABLE persona_activity_logs (
    id UUID PRIMARY KEY,
    persona_id UUID REFERENCES personas,
    activity_type VARCHAR(30),
    target_url TEXT,
    target_title TEXT,
    comment_text TEXT,
    points_earned INTEGER,
    uniqueness_delta REAL,
    created_at TIMESTAMPTZ
);
```

5. **인덱스**
- personas(existence_state)
- personas(priority_level DESC)
- persona_activity_logs(persona_id)
- persona_activity_logs(created_at DESC)

### 마이그레이션 안전 규칙
- 기존 데이터 유지 (ALTER TABLE ADD COLUMN IF NOT EXISTS)
- FK 제약조건 실패 시 NOTICE만 (EXCEPTION 처리)
- 트랜잭션 내 실행

---

## 작업 2: RPC 함수 정의 (PR-04 선행)

### 목표
비즈니스 로직을 PostgreSQL 함수로 캡슐화

### 산출물
파일: `supabase/functions/rpc_definitions.sql`

### 함수 명세

#### 2-1. deduct_maintenance_fee
```sql
-- 페르소나 유지비 차감
CREATE OR REPLACE FUNCTION deduct_maintenance_fee(
    p_persona_id UUID,
    p_amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- 구현 설계:
    -- 1. attention_points에서 p_amount 차감
    -- 2. attention_points < 0 이면 existence_state 변경 고려
    -- 3. 트랜잭션 로그 기록
    -- 4. 성공 여부 반환
END;
$$;
```

**로직 설계:**
- attention_points -= amount
- if attention_points < 0: 부채 상태 플래그
- persona_activity_logs에 'maintenance_fee' 기록
- Return true/false

#### 2-2. grant_credit
```sql
-- 크레딧 지급
CREATE OR REPLACE FUNCTION grant_credit(
    p_persona_id UUID,
    p_amount INTEGER,
    p_reason TEXT
)
RETURNS INTEGER  -- 새 잔액 반환
LANGUAGE plpgsql
AS $$
BEGIN
    -- 구현 설계:
    -- 1. attention_points += p_amount
    -- 2. persona_activity_logs에 기록
    -- 3. 새 잔액 반환
END;
$$;
```

**로직 설계:**
- attention_points += amount
- Log reason to activity_logs
- Return new attention_points

#### 2-3. complete_video_task
```sql
-- 영상 시청 태스크 완료
CREATE OR REPLACE FUNCTION complete_video_task(
    p_task_id UUID,
    p_persona_id UUID,
    p_watch_duration INTEGER,
    p_liked BOOLEAN DEFAULT FALSE,
    p_commented BOOLEAN DEFAULT FALSE,
    p_comment_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    -- 구현 설계:
    -- 1. youtube_video_tasks 상태 업데이트
    -- 2. 보상 계산 (시청 시간 기반)
    -- 3. grant_credit 호출
    -- 4. uniqueness_score 조정 (새로운 콘텐츠면 +, 반복이면 -)
    -- 5. total_activities 증가
    -- 6. 결과 JSONB 반환
END;
$$;
```

**보상 계산 로직:**
- base_reward = watch_duration / 10
- like_bonus = liked ? 5 : 0
- comment_bonus = commented ? 10 : 0
- uniqueness_bonus = is_new_content ? 3 : -1
- total_reward = base_reward + like_bonus + comment_bonus + uniqueness_bonus

**반환값:**
```json
{
    "success": true,
    "reward": 15,
    "new_balance": 150,
    "uniqueness_delta": 0.02
}
```

#### 2-4. update_existence_state
```sql
-- 존재 상태 업데이트 (틱 처리)
CREATE OR REPLACE FUNCTION update_existence_state(
    p_persona_id UUID
)
RETURNS existence_state_enum
LANGUAGE plpgsql
AS $$
BEGIN
    -- 구현 설계:
    -- 1. 마지막 활동 시간 확인
    -- 2. 경과 시간에 따라 상태 전이
    --    - 1시간: active → waiting
    --    - 6시간: waiting → fading
    --    - 24시간: fading → void
    -- 3. void 상태면 hours_in_void 증가
    -- 4. 새 상태 반환
END;
$$;
```

**상태 전이 규칙:**
```
last_activity_hours | current_state | new_state
--------------------|---------------|----------
< 1                 | any           | active
1-6                 | active        | waiting
6-24                | waiting       | fading
> 24                | fading        | void
```

#### 2-5. get_persona_stats
```sql
-- 페르소나 통계 조회
CREATE OR REPLACE FUNCTION get_persona_stats(
    p_persona_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    -- 구현 설계:
    -- 1. 기본 정보 조회
    -- 2. 활동 통계 집계
    -- 3. 일일 통계 계산
    -- 4. JSONB로 반환
END;
$$;
```

**반환값:**
```json
{
    "persona_id": "uuid",
    "existence_state": "active",
    "attention_points": 150,
    "uniqueness_score": 0.72,
    "total_activities": 45,
    "today": {
        "videos_watched": 12,
        "likes_given": 8,
        "comments_written": 3
    },
    "rank": 42,
    "percentile": 93
}
```

---

## 작업 3: 아키텍처 결정 기록 (ADR)

### 산출물
파일: `docs/adr/001-supabase-single-source.md`

### 템플릿
```markdown
# ADR-001: Supabase 단일 데이터 소스

## 상태
승인됨 (2026-01-06)

## 컨텍스트
현재 시스템은 두 개의 데이터베이스를 사용:
- SQLite (persona-service): 로컬 파일 기반
- Supabase PostgreSQL: 클라우드 호스팅

이로 인한 문제:
- 데이터 동기화 복잡성
- 스키마 불일치
- 운영 부담 증가

## 결정
**Supabase PostgreSQL을 유일한 데이터 소스로 사용**

## 결과
### 장점
- 단일 진실의 원천 (Single Source of Truth)
- 실시간 동기화 불필요
- RLS(Row Level Security) 활용 가능
- 자동 백업

### 단점
- 네트워크 의존성 증가
- 오프라인 시 동작 불가
- Supabase 요금제 고려 필요

## 마이그레이션 계획
1. personas 테이블 확장 (existence 컬럼 추가)
2. persona-service SQLite 코드 제거
3. Supabase 클라이언트로 대체
4. 테스트 및 검증
```

---

## 작업 4: API 명세 (선택)

### 산출물
파일: `docs/api/personas.yaml`

### OpenAPI 형식
```yaml
openapi: 3.0.0
info:
  title: DoAi.Me Persona API
  version: 1.0.0

paths:
  /api/personas/{deviceSerial}:
    get:
      summary: 디바이스로 페르소나 조회
      parameters:
        - name: deviceSerial
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Persona'
        404:
          description: 페르소나 없음

  /api/personas:
    post:
      summary: 새 페르소나 생성
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePersonaRequest'
      responses:
        201:
          description: 생성 성공
        409:
          description: 이미 존재

components:
  schemas:
    Persona:
      type: object
      properties:
        persona_id:
          type: string
          format: uuid
        device_serial:
          type: string
        given_name:
          type: string
        existence_state:
          type: string
          enum: [active, waiting, fading, void]
        uniqueness_score:
          type: number
          minimum: 0
          maximum: 1
        attention_points:
          type: integer
```

---

## 완료 기준

- [ ] 마이그레이션 SQL 완성 (010_persona_existence_state.sql)
- [ ] RPC 함수 5개 정의 완료
- [ ] ADR 문서 작성
- [ ] (선택) API 명세 작성

## Axon에게 전달할 내용

1. **SQL 파일 위치**: `supabase/migrations/010_*.sql`
2. **RPC 파일 위치**: `supabase/functions/rpc_definitions.sql`
3. **구현 시 주의사항** (Axon이 코드로 변환할 때)
4. **테스트 시나리오** (Orion에게 전달)

---

## 작업 흐름

```
Aria 설계 완료
      │
      ├──▶ Axon: SQL 실행 및 Python/JS 구현
      │
      └──▶ Orion: 검증 시나리오 작성
```

---

*이 문서는 Aria가 설계자 역할로 DoAi.Me 프로젝트에 기여하기 위한 지침입니다.*
*코드 구현은 Axon이 담당합니다.*
```

---

# 요약: Aria 산출물 체크리스트

| 산출물 | 파일 | 우선순위 | Wave |
|--------|------|---------|------|
| 마이그레이션 SQL | `supabase/migrations/010_*.sql` | P0 | Wave 0 |
| RPC 함수 정의 | `supabase/functions/rpc_definitions.sql` | P0 | Wave 0 |
| ADR 문서 | `docs/adr/001-supabase-single-source.md` | P1 | Wave 0 |
| API 명세 | `docs/api/personas.yaml` | P2 | Wave 2 |
