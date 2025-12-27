# 트렌드 스카우트 활동

**생성일**: 2025-12-28
**카테고리**: 트렌드 분석

---

## 목적

- 급상승 트렌드 조기 포착
- 알고리즘 변화 및 추천 패턴 분석
- 카테고리별 트렌드 흐름 추적

### 기대 효과
- 일일 80-150건의 트렌딩 영상 데이터 수집
- 트렌드 예측 정확도 60% 이상
- 평균 2시간 이내 조기 포착

---

## 대상 디바이스

- **할당 대수**: 100대 (전체의 17%)
- **우선순위**: 높음
- **활동 시간**: 전 시간대 (특히 09:00-12:00, 18:00-21:00)

---

## 실행 플로우

### 1. 트렌딩 탭 진입
- YouTube 하단 "탐색" → "급상승" 클릭

### 2. 카테고리별 순회
- 전체
- 음악
- 게임
- 영화
- 뉴스

### 3. TOP 50 영상 스캔
- 제목, 채널명
- 조회수, 업로드 시간
- 순위 (1-50위)

### 4. 성장률 계산
- 5분 후 재방문하여 조회수 변화 측정
- hourly_growth_rate = (new_views - old_views) / 5 * 12

### 5. 트렌드 분류
- 뉴스 이슈 (속보성)
- 밈/챌린지 (확산성)
- 음원 차트 (음악)
- 게임 신작/업데이트

### 6. 급상승 영상 저장
- 조건 충족 시

### 7. 다음 카테고리
- 15-30분 후 반복

---

## 판단 기준

### 트렌드 점수 계산
```python
trend_score = (
    ranking_position * -0.2 +      # 순위 (높을수록 좋음, 역수)
    hourly_growth_rate * 0.35 +    # 시간당 성장률
    social_buzz * 0.25 +            # 소셜 미디어 언급도 (추정)
    channel_authority * 0.10 +      # 채널 신뢰도
    recency * 0.10                  # 최신성
)
저장 기준: trend_score > 7.5 OR ranking < 10
```

### 선택 조건
- 트렌딩 TOP 50 내 진입
- 시간당 성장률 > 10,000 views/hour
- 업로드 후 24시간 이내

### 스킵 조건
- 공식 채널 뉴스 (이미 알려진 정보)
- 음악 MV (별도 추적)
- 광고성 콘텐츠

---

## 수집 데이터

### JSON 스키마
```json
{
  "discovery_type": "trending_video",
  "video_id": "def456uvw",
  "video_url": "https://youtube.com/watch?v=def456uvw",
  "video_title": "신상 게임 숨겨진 꿀팁 모음",
  "channel_name": "게임마스터",
  "channel_id": "UCzzzzz",
  "channel_subscribers": 850000,
  "view_count": 2500000,
  "like_count": 120000,
  "comment_count": 8500,
  "upload_time": "2025-12-27T18:30:00Z",
  "trending_rank": 7,
  "trending_category": "게임",
  "hourly_growth_rate": 125000,
  "score": 8.9,
  "trend_type": "game_update",
  "related_keywords": ["신작게임", "팁", "공략"],
  "estimated_peak_time": "2025-12-28T21:00:00Z",
  "discovered_at": "2025-12-28T12:00:00Z",
  "device_id": "10.0.30.12"
}
```

---

## 성공 지표

| 지표 | 목표 |
|------|-----|
| 일일 발견 | 80-150건 |
| 트렌드 예측 정확도 | > 60% (24시간 후 여전히 트렌딩) |
| 조기 포착률 | 평균 2시간 이내 |
| 카테고리 커버리지 | 모든 주요 카테고리 일일 1회 이상 |

---

## 트렌드 타입 분류

### 1. 뉴스 이슈
- 속보성 콘텐츠
- 짧은 생명주기 (1-3일)
- 높은 초기 성장률

### 2. 밈/챌린지
- 확산성 콘텐츠
- 중간 생명주기 (1-2주)
- 참여형 콘텐츠

### 3. 음원 차트
- 음악 콘텐츠
- 긴 생명주기 (1개월+)
- 반복 청취

### 4. 게임 업데이트
- 게임 콘텐츠
- 중간 생명주기 (1-3주)
- 팬층 기반 확산

### 5. 이슈/논쟁
- 논쟁적 콘텐츠
- 중간 생명주기 (3-7일)
- 높은 댓글 참여

---

## 구현 참고사항

### AutoX.js 스크립트 구조
```javascript
// scripts/activity_trend_scout.js
function trendScoutActivity(deviceId) {
  let categories = ["전체", "음악", "게임", "영화", "뉴스"];

  for (let category of categories) {
    // 1. 트렌딩 탭 진입
    navigateToTrending(category);

    // 2. TOP 50 스캔
    let videos = extractTop50();

    // 3. 첫 스캔 (조회수 기록)
    let firstScan = videos.map(v => ({
      id: v.id,
      views: v.viewCount,
      timestamp: Date.now()
    }));

    // 4. 5분 대기
    sleep(5 * 60 * 1000);

    // 5. 두 번째 스캔 (성장률 계산)
    let secondScan = extractTop50();
    secondScan.forEach((v, i) => {
      let growth = calculateGrowthRate(firstScan[i], v);
      if (isTrending(v, growth)) {
        saveToDiscoveries(v, growth);
      }
    });

    // 6. 다음 카테고리
    sleep(random(15, 30) * 60 * 1000);
  }
}
```
