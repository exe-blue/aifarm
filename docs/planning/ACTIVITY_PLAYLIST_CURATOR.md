# 플레이리스트 큐레이터 활동

**생성일**: 2025-12-28
**카테고리**: 콘텐츠 발굴

---

## 목적

- 고품질 플레이리스트 및 큐레이션 채널 발굴
- 특정 니치 시장의 콘텐츠 흐름 파악
- 시리즈물/연속 콘텐츠 트렌드 분석

### 기대 효과
- 일일 30-50건의 큐레이션 플레이리스트 발견
- 니치 시장 콘텐츠 전략 인사이트
- 시리즈 콘텐츠 제작 아이디어 확보

---

## 대상 디바이스

- **할당 대수**: 80대 (전체의 13%)
- **우선순위**: 중간
- **활동 시간**: 주중 09:00-18:00 (업무 시간대)

---

## 실행 플로우

### 1. 카테고리별 탐색
- 홈 피드에서 다양한 카테고리 영상 클릭

### 2. "다음 재생" 패턴 수집
- 영상 시청 중 자동 재생 대기열 확인

### 3. 플레이리스트 접근
- 채널 방문 → "재생목록" 탭 클릭

### 4. 메트릭 수집
- 플레이리스트 제목
- 영상 개수
- 총 조회수 (계산 필요 시)
- 최신 업데이트 날짜

### 5. 큐레이션 품질 판단
- 일관된 주제성 (제목 키워드 분석)
- 정기적 업데이트 (최신 영상 < 7일)
- 구독자 대비 재생 비율

### 6. 고품질 플레이리스트 저장

### 7. 다음 탐색
- 연관 채널 또는 다른 카테고리로 이동

---

## 판단 기준

### 큐레이션 품질 점수
```python
quality_score = (
    theme_consistency * 0.35 +    # 주제 일관성
    update_frequency * 0.25 +      # 업데이트 빈도
    avg_video_quality * 0.20 +     # 평균 영상 품질
    engagement_rate * 0.20         # 참여율
)
저장 기준: quality_score > 7.0
```

### 선택 조건
- 플레이리스트 영상 개수: 5-50개 (너무 적거나 많지 않음)
- 채널 구독자: 10k-500k (중소형 채널, 니치 시장)
- 업데이트 주기: 최소 주 1회

### 스킵 조건
- 음악 자동 생성 플레이리스트 (음원 나열)
- 업데이트 중단 (최신 영상 > 30일)
- 저품질 썸네일/제목 (스팸성)

---

## 수집 데이터

### JSON 스키마
```json
{
  "discovery_type": "curated_playlist",
  "playlist_id": "PLxxxxxxxxxxxx",
  "playlist_url": "https://youtube.com/playlist?list=PLxxxx",
  "playlist_title": "직장인을 위한 5분 명상 시리즈",
  "channel_name": "마음챙김TV",
  "channel_id": "UCyyyyy",
  "channel_subscribers": 125000,
  "video_count": 24,
  "total_views_estimated": 480000,
  "last_updated": "1일 전",
  "avg_video_duration": 312,
  "category": "교육",
  "theme_tags": ["명상", "직장인", "웰빙", "자기계발"],
  "score": 8.2,
  "consistency_score": 9.1,
  "update_frequency_days": 3,
  "discovered_at": "2025-12-28T11:15:30Z",
  "device_id": "10.0.20.5"
}
```

---

## 성공 지표

| 지표 | 목표 |
|------|-----|
| 일일 발견 | 30-50건 |
| 품질 점수 평균 | 7.5 이상 |
| 니치 카테고리 다양성 | 최소 10개 이상 |

---

## 구현 참고사항

### 주요 카테고리 목록
- 교육 (자기계발, 언어, 기술)
- 건강/웰빙 (요가, 명상, 운동)
- 취미 (DIY, 공예, 악기)
- 비즈니스 (창업, 마케팅, 재테크)
- 요리 (레시피, 베이킹, 세계 음식)
- 여행 (여행지, 문화, 팁)
- 게임 (공략, 리뷰, 플레이)
- 테크 (리뷰, 튜토리얼, 뉴스)

### AutoX.js 스크립트 구조
```javascript
// scripts/activity_playlist_curator.js
function playlistCuratorActivity(deviceId) {
  let categories = ["교육", "건강", "취미", "비즈니스"];

  for (let category of categories) {
    // 1. 카테고리 검색
    searchCategory(category);

    // 2. 상위 채널 방문
    for (let i = 0; i < 5; i++) {
      visitChannelPlaylists();

      // 3. 플레이리스트 분석
      let playlists = extractPlaylists();
      playlists.forEach(pl => {
        if (isHighQuality(pl)) {
          saveToDiscoveries(pl);
        }
      });
    }
  }
}
```
