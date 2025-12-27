# Shorts 리믹스 활동

**생성일**: 2025-12-28
**카테고리**: 콘텐츠 발굴

---

## 목적

- 바이럴 가능성이 높은 Shorts 콘텐츠 발굴
- 리믹스/재창작 가능한 트렌드 파악
- 짧은 영상 포맷의 인게이지먼트 패턴 분석

### 기대 효과
- 일일 100-200건의 바이럴 Shorts 데이터 수집
- 트렌드 예측 및 리믹스 콘텐츠 아이디어 확보
- YouTube Shorts 알고리즘 패턴 학습

---

## 대상 디바이스

- **할당 대수**: 150대 (전체의 25%)
- **우선순위**: 높음
- **활동 시간**: 24시간 (특히 저녁 18:00-24:00 집중)

---

## 실행 플로우

### 1. YouTube Shorts 탭 진입
- 앱 실행 후 하단 Shorts 아이콘 클릭

### 2. 무작위 스크롤
- 3-10회 상향 스와이프
- 다양한 콘텐츠 노출 확보

### 3. 영상 시청
- 전체 시청 또는 2-3회 반복 (바이럴 확인용)

### 4. 메트릭 수집
- 조회수 (텍스트 파싱)
- 좋아요 수 (아이콘 옆 숫자)
- 댓글 수
- 업로드 시간 (상대 시간: "1시간 전", "3일 전" 등)

### 5. 판단 기준 적용
- 조회수 > 100,000?
- 좋아요율 > 5%?
- 댓글 활성도 > 500건?
- 업로드 후 경과 시간 < 7일?

### 6. 조건 충족 시
- `discoveries` 테이블에 저장

### 7. 다음 영상
- 상향 스와이프 반복

---

## 판단 기준

### 바이럴 속도 계산
```python
viral_score = (view_count / hours_since_upload) * engagement_rate
engagement_rate = (like_count + comment_count) / view_count
저장 기준: viral_score > 1000 AND view_count > 100k
```

### 스킵 조건
- 조회수 < 50,000
- 업로드 후 30일 이상 경과
- 광고성 콘텐츠 (특정 키워드: "협찬", "AD", "광고")
- 성인/민감 콘텐츠 (연령 제한 표시)

---

## 수집 데이터

### JSON 스키마
```json
{
  "discovery_type": "viral_short",
  "video_id": "abc123xyz",
  "video_url": "https://youtube.com/shorts/abc123xyz",
  "video_title": "강아지 댄스 챌린지",
  "channel_name": "펫튜버TV",
  "channel_id": "UCxxxxx",
  "view_count": 1500000,
  "like_count": 85000,
  "comment_count": 1200,
  "share_count": null,
  "upload_time_relative": "2일 전",
  "duration_seconds": 28,
  "score": 8.7,
  "tags": ["댄스", "동물", "챌린지", "밈"],
  "audio_track": "Original Sound - 펫튜버TV",
  "detected_trend": "동물_댄스_챌린지",
  "remix_potential": "high",
  "discovered_at": "2025-12-28T10:30:45Z",
  "device_id": "10.0.10.1"
}
```

---

## 성공 지표

| 지표 | 목표 |
|------|-----|
| 일일 발견 | 100-200건 |
| 품질 점수 평균 | 7.0 이상 (10점 만점) |
| False Positive 비율 | < 15% (수동 검증 시) |
| 중복 발견 비율 | < 10% |

---

## 구현 참고사항

### AutoX.js 스크립트 구조
```javascript
// scripts/activity_shorts_remix.js
function shortsRemixActivity(deviceId) {
  // 1. Shorts 탭 진입
  clickShortTab();

  // 2. 무작위 스크롤 및 메트릭 수집
  for (let i = 0; i < 20; i++) {
    let metrics = extractShortsMetrics();

    // 3. 바이럴 판단
    if (isViral(metrics)) {
      saveToDiscoveries(metrics);
    }

    // 4. 다음 영상
    swipeUp();
    sleep(random(3000, 8000));
  }
}
```

### 주요 UI 요소
- Shorts 탭: `id("shorts_tab")`
- 조회수: `id("view_count_text")`
- 좋아요: `id("like_button").sibling("text")`
- 댓글 수: `id("comments_entry_point_teaser")`
