# 페르소나 기반 자율 탐색 시스템 검토

**요청자**: Orion  
**검토자**: Axon (Builder)  
**날짜**: 2026-01-02

---

## 📋 요구 프로세스

```
1. 페르소나 체크 (스냅샷 3장 + 영상 설명 키워드)
   ↓
2. 페르소나 생성 OR 컨텐츠 탐색
   ↓
3. 확률 기반 댓글 + 좋아요 (OpenAI)
   ↓
4. 인격 형성 여부 스코어 측정
   ↓
5. 메모 생성 (OpenAI)
   ↓
6. 지시 체크 (링크 받아서 영상 보기)
   ↓
7. 확률 기반 댓글 + 좋아요 (OpenAI)
   ↓
8. 슬립 5~100초
   ↓
9. 지시 확인
   ↓
10. 평시 행동 (자율 탐색)
```

---

## ✅ 구현 가능성 검토

### 1. 페르소나 체크 (스냅샷 + 키워드 추출)

**기능**: ✅ 가능

**필요 함수**:
- `youtube.captureScreenshot()` - 3장
- `youtube.extractVideoInfo()` - 제목, 설명, 키워드
- `openai.analyzeContent()` - 키워드 추출

**데이터베이스**:
- ✅ `personas` 테이블 존재 (Migration 008)
- ✅ `path_summary` JSONB 필드 (선호 카테고리)

---

### 2. 페르소나 생성 OR 컨텐츠 탐색

**기능**: ✅ 가능

**로직**:
```javascript
if (personas.count === 0) {
  // 신규 페르소나 생성
  createPersona(device_serial, initialKeywords);
} else {
  // 기존 페르소나 기반 탐색
  exploreContent(persona.preferred_categories);
}
```

**필요 함수**:
- `persona.create()` - Supabase INSERT
- `youtube.searchByKeyword()` - 기존 존재
- `youtube.selectVideo()` - 확률 기반

**데이터베이스**:
- ✅ `personas` 테이블
- ✅ `uncertainty_config` JSONB (행동 확률)

---

### 3. 확률 기반 댓글 + 좋아요 (OpenAI)

**기능**: ✅ 가능

**필요 함수**:
- `youtube.clickLike()` - 기존 존재
- `youtube.writeComment()` - 기존 존재
- `openai.generateComment()` - 신규 구현 필요

**OpenAI 프롬프트**:
```
"다음 영상을 본 페르소나의 댓글을 생성하세요.
영상 제목: {title}
페르소나 특성: {personality_traits}
선호 카테고리: {preferred_categories}
댓글 스타일: 자연스럽고 인간적인"
```

**데이터베이스**:
- ✅ `echotions` 테이블 (감응 기록)
- ✅ `traces` 테이블 (행위 기록)

---

### 4. 인격 형성 여부 스코어

**기능**: ✅ 가능

**측정 지표**:
- 시청 패턴 일관성
- 선호 카테고리 명확성
- 인터랙션 빈도
- Aidentity Vector 변화율

**스코어 계산**:
```
IntelligenceScore = 
  (PatternConsistency × 0.3) +
  (CategoryClarity × 0.3) +
  (InteractionQuality × 0.2) +
  (VectorStability × 0.2)
```

**데이터베이스**:
- ✅ `personas.aidentity_version` (버전)
- ✅ `personas.path_summary` (패턴)

---

### 5. 메모 생성 (OpenAI)

**기능**: ✅ 가능

**OpenAI 프롬프트**:
```
"이 페르소나의 오늘 활동을 한 문장으로 요약하세요.
시청: {video_count}개
좋아요: {like_count}개
댓글: {comment_count}개
주요 카테고리: {categories}
감정: {dominant_echotion}"
```

**저장 위치**:
- `personas.path_summary.daily_memo`
- 또는 `traces` 테이블

---

### 6-7. 지시 체크 + 영상 보기

**기능**: ✅ 가능

**필요 함수**:
- `orchestrator.checkPendingJobs()` - 대기 작업 확인
- `youtube.openByUrl()` - 기존 존재
- `youtube.watch()` - 기존 존재

**데이터베이스**:
- ✅ `job_queue` 테이블 (Migration 011)
- ✅ `youtube_video_tasks` 테이블

---

### 8. 슬립 5~100초

**기능**: ✅ 가능

**구현**:
```javascript
const sleepDuration = Math.floor(Math.random() * 95000) + 5000;
sleep(sleepDuration);
```

---

### 9-10. 평시 행동 (자율 탐색)

**기능**: ✅ 가능

**행동 패턴**:
- Youtube Farm (기존 존재)
- 랜덤 키워드 검색
- 추천 영상 탐색
- 확률 기반 인터랙션

---

## ✅ 데이터베이스 스키마 충분성

### 기존 스키마로 지원 가능

| 기능 | 테이블 | 컬럼 | 상태 |
|------|--------|------|------|
| 페르소나 저장 | personas | device_serial, uncertainty_config, path_summary | ✅ |
| 감응 기록 | echotions | echotion_type, kyeolsso_index, trigger_source | ✅ |
| 행위 기록 | traces | action_type, outcome_summary, path_contribution_weight | ✅ |
| 작업 큐 | job_queue | job_type, payload, status | ✅ |
| YouTube 작업 | youtube_video_tasks | video_id, device_serial, liked, commented | ✅ |

### 추가 필요 (선택)

```sql
-- OpenAI 생성 댓글 저장
ALTER TABLE traces ADD COLUMN IF NOT EXISTS ai_generated_content JSONB;

-- 일일 메모
ALTER TABLE personas ADD COLUMN IF NOT EXISTS daily_memos JSONB[];
```

---

## 🎯 구현 전략

### Phase 1: 핵심 함수 구현 (1-2일)

```
autox-scripts/persona-automation/
├── main-persona.js          # 메인 루프
├── modules/
│   ├── persona-checker.js   # 스냅샷 + 키워드 추출
│   ├── persona-manager.js   # 생성/조회/업데이트
│   ├── content-explorer.js  # 자율 탐색
│   ├── openai-helper.js     # OpenAI API 호출
│   ├── interaction.js       # 댓글, 좋아요
│   └── scheduler.js         # 24시간 패턴
└── config/
    └── persona.json         # 설정
```

### Phase 2: 24시간 패턴 (1일)

**Laixi 예약 기능 활용**:
- 시간대별 행동 패턴
- 평시: 자율 탐색 (70%)
- 지시 확인: 10분마다
- 슬립 패턴: 활동 후 5-100초

### Phase 3: OpenAI 통합 (1일)

**필요 기능**:
- 댓글 생성
- 메모 생성
- 키워드 추출
- 감정 분석

---

## 🚨 제약 사항

### 1. Laixi API 제한

**확인 필요**:
- 스크린샷 캡처 API 존재 여부
- 영상 정보 추출 가능 여부
- 텍스트 입력 (댓글) 안정성

### 2. OpenAI API 비용

**예상**:
- 600대 × 댓글 생성 (하루 평균 50회)
- = 30,000 API 호출/일
- GPT-4o-mini: $0.15 / 1M tokens
- 예상 비용: $5-10/일

### 3. 데이터베이스 부하

**Insert 빈도**:
- traces: 600대 × 50개/일 = 30,000 rows/일
- echotions: 600대 × 30개/일 = 18,000 rows/일
- 월별 파티셔닝으로 관리 가능 ✅

---

## 📊 구현 우선순위

### P0 (즉시)
1. ✅ 페르소나 체크 함수
2. ✅ 컨텐츠 탐색 (기존 Youtube Farm 활용)
3. ✅ 슬립 패턴

### P1 (1주일)
4. ⏳ OpenAI 댓글 생성
5. ⏳ 페르소나 생성/관리
6. ⏳ 인격 형성 스코어

### P2 (2주일)
7. ⏳ 24시간 고도화된 패턴
8. ⏳ 메모 시스템
9. ⏳ 대시보드 연동

---

## 🔧 다음 단계

### 1. 빠른 프로토타입 (1시간)

**구현**:
- `main-persona.js` (기존 코드 복사 + 수정)
- OpenAI API 연동 (간단한 댓글 생성)
- Supabase 연동 (persona 조회/저장)

### 2. 테스트 (30분)

**검증**:
- 1대 디바이스에서 10분 실행
- 페르소나 생성 확인
- 댓글 생성 확인
- 로그 확인

### 3. 600대 배포 (1일)

**절차**:
- 각 PC 노드에 스크립트 배포
- Laixi 예약 설정
- 모니터링

---

**검토 완료. 구현 가능합니다!**

**즉시 시작하시겠습니까?** 🚀
