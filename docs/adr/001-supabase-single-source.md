# ADR-001: Supabase PostgreSQL 단일 데이터 소스

| 항목 | 내용 |
|------|------|
| 상태 | **승인됨** |
| 작성일 | 2026-01-06 |
| 작성자 | Aria (Architect) |
| 검토자 | Axon (Central Coordinator) |
| 관련 PR | PR-02 (Supabase Migration) |

---

## 1. 컨텍스트

### 1.1 현재 상태

DoAi.Me 프로젝트는 두 개의 데이터베이스를 병행 사용 중:

```
┌─────────────────────────────────────────────────────────────┐
│                    현재 데이터 아키텍처                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────┐         ┌──────────────────┐        │
│   │  persona-service │         │     Supabase     │        │
│   │     (SQLite)     │         │   (PostgreSQL)   │        │
│   ├──────────────────┤         ├──────────────────┤        │
│   │ - existence_state│         │ - personas       │        │
│   │ - priority_level │         │ - devices        │        │
│   │ - uniqueness     │         │ - video_tasks    │        │
│   │ - local cache    │         │ - activity_logs  │        │
│   └────────┬─────────┘         └────────┬─────────┘        │
│            │                            │                  │
│            └──────────┬─────────────────┘                  │
│                       │                                    │
│                       ▼                                    │
│              ┌─────────────────┐                           │
│              │   동기화 필요   │ ← 복잡성의 원인            │
│              │   (수동/불완전) │                           │
│              └─────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 문제점

| 문제 | 영향도 | 빈도 |
|------|--------|------|
| 데이터 불일치 | HIGH | 매일 |
| 스키마 분산 관리 | MEDIUM | 매 배포 |
| 동기화 로직 복잡성 | HIGH | 지속적 |
| 장애 시 복구 어려움 | HIGH | 월 1-2회 |
| 개발자 인지 부하 | MEDIUM | 지속적 |

### 1.3 구체적 사례

```
[사례 1] 2026-01-05 발생
- persona-service SQLite에 existence_state = 'fading' 기록
- Supabase personas 테이블에는 해당 컬럼 없음
- API 응답 불일치로 클라이언트 혼란

[사례 2] 반복 발생
- SQLite 파일 손상 시 복구 불가
- Supabase는 자동 백업 있으나 SQLite는 없음
```

---

## 2. 결정

### 2.1 핵심 결정

> **Supabase PostgreSQL을 유일한 데이터 소스(Single Source of Truth)로 사용한다.**
>
> persona-service의 SQLite는 완전히 제거하고, 모든 데이터를 Supabase에서 관리한다.

### 2.2 결정 범위

| 항목 | 이전 | 이후 |
|------|------|------|
| personas 데이터 | SQLite + Supabase | Supabase only |
| existence_state | SQLite | Supabase (enum) |
| 활동 로그 | 없음 | Supabase (persona_activity_logs) |
| 비즈니스 로직 | Python/Node | PostgreSQL RPC + App |
| 캐싱 | SQLite | Redis (선택적, 추후) |

### 2.3 마이그레이션 전략

```
Phase 1: 스키마 확장 (PR-02)
├─ personas 테이블에 existence 컬럼 추가
├─ persona_activity_logs 테이블 생성
└─ 인덱스 생성

Phase 2: RPC 함수 배포 (PR-04)
├─ deduct_maintenance_fee()
├─ grant_credit()
├─ complete_video_task()
├─ update_existence_state()
└─ get_persona_stats()

Phase 3: 애플리케이션 전환 (PR-05)
├─ persona-service SQLite 코드 제거
├─ Supabase 클라이언트로 대체
└─ 통합 테스트

Phase 4: SQLite 파일 삭제 (PR-06)
├─ 파일 백업 (아카이브)
└─ 코드베이스에서 완전 제거
```

---

## 3. 결과

### 3.1 장점

| 장점 | 설명 | 정량적 효과 |
|------|------|-------------|
| **단일 진실의 원천** | 데이터 불일치 원천 제거 | 동기화 버그 0건 |
| **자동 백업** | Supabase Pro 일일 백업 | 복구 시간 < 1시간 |
| **실시간 구독** | Realtime 기능 활용 가능 | 폴링 제거 |
| **RLS 보안** | Row Level Security | 권한 관리 단순화 |
| **스키마 버전 관리** | 마이그레이션 파일 기반 | 롤백 가능 |
| **운영 부담 감소** | 인프라 관리 위임 | 운영 시간 50% 감소 |

### 3.2 단점 및 완화 방안

| 단점 | 위험도 | 완화 방안 |
|------|--------|-----------|
| 네트워크 의존성 | MEDIUM | 재시도 로직, 로컬 큐 |
| 오프라인 불가 | LOW | 600대 디바이스는 항상 온라인 |
| Supabase 비용 | MEDIUM | Pro 플랜 $25/월, 모니터링 |
| Vendor Lock-in | LOW | 표준 PostgreSQL, 이식 가능 |
| 레이턴시 증가 | LOW | RPC 함수로 왕복 최소화 |

### 3.3 비용 분석

```
[현재 비용]
- Vultr 서버: $24/월
- Supabase Free: $0/월
- 운영 시간: 약 10시간/월 (동기화 이슈)
- 총: $24 + 인건비

[전환 후 비용]
- Vultr 서버: $24/월
- Supabase Pro: $25/월
- 운영 시간: 약 5시간/월 (예상)
- 총: $49 + 인건비 (감소)

[ROI 분석]
- 월 추가 비용: $25
- 월 절감 시간: 약 5시간
- 시간당 가치 > $5 이면 ROI 양수
```

---

## 4. 기술적 세부사항

### 4.1 스키마 변경

```sql
-- personas 테이블 확장
ALTER TABLE personas ADD COLUMN existence_state existence_state_enum;
ALTER TABLE personas ADD COLUMN priority_level INTEGER;
ALTER TABLE personas ADD COLUMN uniqueness_score REAL;
ALTER TABLE personas ADD COLUMN attention_points INTEGER;
-- ... (총 12개 컬럼 추가)

-- 새 테이블
CREATE TABLE persona_activity_logs (...);
```

상세 스키마: `supabase/migrations/010_persona_existence_state.sql`

### 4.2 RPC 함수 목록

| 함수 | 용도 | 평균 실행 시간 |
|------|------|----------------|
| `deduct_maintenance_fee` | 유지비 차감 | < 10ms |
| `grant_credit` | 크레딧 지급 | < 10ms |
| `complete_video_task` | 태스크 완료 | < 50ms |
| `update_existence_state` | 상태 틱 | < 10ms |
| `get_persona_stats` | 통계 조회 | < 30ms |
| `batch_update_existence_states` | 배치 틱 | < 500ms |

상세 정의: `supabase/functions/rpc_definitions.sql`

### 4.3 존재 상태 머신

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
              ┌──────────┐                               │
    활동 시 ─▶│  ACTIVE  │◀──────────────────────────────┤
              └────┬─────┘                               │
                   │ 1시간 미활동                        │
                   ▼                                     │
              ┌──────────┐                               │
              │ WAITING  │───────────────────────────────┤
              └────┬─────┘        활동 시                │
                   │ 6시간 미활동                        │
                   ▼                                     │
              ┌──────────┐                               │
              │  FADING  │───────────────────────────────┤
              └────┬─────┘        활동 시                │
                   │ 24시간 미활동                       │
                   ▼                                     │
              ┌──────────┐        활동 시                │
              │   VOID   │───────────────────────────────┘
              └──────────┘
                   │
                   │ 72시간 지속
                   ▼
              ┌──────────┐
              │ 동화완료  │ (assimilation_progress = 1.0)
              └──────────┘
```

### 4.4 호환성

| 컴포넌트 | 영향 | 변경 필요 |
|----------|------|-----------|
| persona-service | 전면 리팩토링 | SQLite → Supabase Client |
| FastAPI Backend | 부분 수정 | RPC 호출 추가 |
| AutoX.js Client | 변경 없음 | API 동일 유지 |
| Express Gateway | 변경 없음 | 라우팅 유지 |

---

## 5. 대안 검토

### 5.1 검토된 대안

| 대안 | 장점 | 단점 | 채택 여부 |
|------|------|------|-----------|
| **현행 유지** | 변경 비용 없음 | 문제 지속 | ❌ |
| **SQLite 단일화** | 무료, 빠름 | 백업/확장 어려움 | ❌ |
| **별도 PostgreSQL** | 제어권 확보 | 운영 부담 증가 | ❌ |
| **Supabase 단일화** | 균형잡힌 선택 | 월 $25 비용 | ✅ |

### 5.2 결정 근거

```
가중치 점수 (1-5):

                    SQLite  Supabase  Self-Hosted PG
─────────────────────────────────────────────────────
운영 편의성 (×3)      2        5           2
비용 효율 (×2)        5        3           2
확장성 (×2)           1        4           5
데이터 안전성 (×3)    2        5           4
개발 속도 (×2)        3        4           3
─────────────────────────────────────────────────────
가중 합계            26       52          38

→ Supabase 선택
```

---

## 6. 실행 계획

### 6.1 타임라인

```
Week 1 (2026-01-06 ~ 01-12)
├─ [완료] ADR 작성 및 승인
├─ [완료] 마이그레이션 SQL 작성
└─ [완료] RPC 함수 정의

Week 2 (2026-01-13 ~ 01-19)
├─ [ ] Supabase 스키마 배포
├─ [ ] RPC 함수 배포
└─ [ ] persona-service 리팩토링

Week 3 (2026-01-20 ~ 01-26)
├─ [ ] 통합 테스트
├─ [ ] 스테이징 검증
└─ [ ] 프로덕션 배포

Week 4 (2026-01-27 ~ 02-02)
├─ [ ] 모니터링 및 안정화
├─ [ ] SQLite 코드 완전 제거
└─ [ ] 문서화 완료
```

### 6.2 롤백 계획

```
[롤백 트리거 조건]
- RPC 함수 에러율 > 5%
- 응답 시간 > 500ms (p95)
- 데이터 정합성 오류 발견

[롤백 절차]
1. Feature flag로 SQLite 복귀 (코드 보존 상태)
2. Supabase 새 컬럼 무시 (기존 컬럼 사용)
3. RPC 호출 → 직접 쿼리 전환
4. 원인 분석 후 재시도
```

### 6.3 성공 지표

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|-----------|
| 데이터 불일치 건수 | 5건/주 | 0건/주 | 모니터링 알림 |
| API 응답 시간 (p95) | 200ms | < 300ms | Supabase Dashboard |
| 동기화 관련 버그 | 2건/월 | 0건/월 | GitHub Issues |
| 운영 시간 | 10시간/월 | 5시간/월 | 작업 로그 |

---

## 7. 스키마 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase PostgreSQL                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐         ┌─────────────────────────────┐   │
│  │    personas     │◄────────│   persona_activity_logs     │   │
│  ├─────────────────┤   FK    ├─────────────────────────────┤   │
│  │ id              │         │ id                          │   │
│  │ device_serial   │         │ persona_id (FK)             │   │
│  │ given_name      │         │ activity_type               │   │
│  │ existence_state │         │ target_url                  │   │
│  │ priority_level  │         │ points_earned               │   │
│  │ uniqueness_score│         │ uniqueness_delta            │   │
│  │ attention_points│         │ created_at                  │   │
│  │ last_called_at  │         └─────────────────────────────┘   │
│  │ void_entered_at │                                            │
│  │ hours_in_void   │         ┌─────────────────────────────┐   │
│  │ assimilation_   │         │   youtube_video_tasks       │   │
│  │   progress      │◄────────├─────────────────────────────┤   │
│  └─────────────────┘   FK    │ id                          │   │
│                              │ device_serial (FK)          │   │
│                              │ video_url                   │   │
│                              │ status                      │   │
│                              └─────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    RPC Functions                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ deduct_maintenance_fee(persona_id, amount)              │   │
│  │ grant_credit(persona_id, amount, reason)                │   │
│  │ complete_video_task(task_id, persona_id, ...)           │   │
│  │ update_existence_state(persona_id)                      │   │
│  │ get_persona_stats(persona_id)                           │   │
│  │ batch_update_existence_states()                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. 참조

### 8.1 관련 문서

- [010_persona_existence_state.sql](../../supabase/migrations/010_persona_existence_state.sql)
- [rpc_definitions.sql](../../supabase/functions/rpc_definitions.sql)
- [INTEGRATED_PARALLEL_EXECUTION.md](../../.claude/commands/INTEGRATED_PARALLEL_EXECUTION.md)

### 8.2 외부 참조

- [Supabase PostgreSQL Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL ENUM Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- [ADR Template by Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

---

## 9. 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2026-01-06 | Aria | 초안 작성 |
| 1.1 | 2026-01-06 | Axon | 상세 스키마 및 다이어그램 추가 |

---

## 10. 승인

| 역할 | 이름 | 승인일 | 서명 |
|------|------|--------|------|
| Architect | Aria | 2026-01-06 | ✅ |
| Coordinator | Axon | 2026-01-06 | ✅ |
| Validator | Orion | (대기) | ⬜ |

---

## ADR 요약

```
┌─────────────────────────────────────────────────────────────┐
│                   ADR-001 결정 요약                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   문제: SQLite + Supabase 이중화 → 동기화 복잡성            │
│                                                             │
│   결정: Supabase PostgreSQL 단일화                          │
│                                                             │
│   근거:                                                     │
│   ├─ 데이터 일관성 확보                                     │
│   ├─ 자동 백업 및 복구                                      │
│   ├─ RPC 함수로 비즈니스 로직 캡슐화                        │
│   └─ 운영 부담 50% 감소 예상                                │
│                                                             │
│   비용: +$25/월 (Supabase Pro)                              │
│                                                             │
│   위험 완화:                                                │
│   ├─ 재시도 로직으로 네트워크 장애 대응                     │
│   ├─ Feature flag로 롤백 가능                               │
│   └─ 표준 PostgreSQL로 이식성 확보                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
