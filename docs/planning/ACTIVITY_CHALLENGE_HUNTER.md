# 챌린지 헌터 활동

**생성일**: 2025-12-28
**카테고리**: 트렌드 분석

---

## 목적

- 새로운 챌린지/밈 조기 발견
- 확산 가능성 높은 포맷 분석
- 참여 난이도 및 리믹스 용이성 평가

### 기대 효과
- 일일 10-20건의 신규 챌린지 발견
- 챌린지 시작 후 평균 3일 이내 포착
- 확산 예측 정확도 50% 이상

---

## 대상 디바이스

- **할당 대수**: 50대 (전체의 8%)
- **우선순위**: 중간
- **활동 시간**: 저녁-야간 (18:00-02:00, 챌린지 활성 시간대)

---

## 실행 플로우

### 1. 해시태그 검색
- "#챌린지"
- "#challenge"
- "#댄스"
- 최근 1주일 내 급증 해시태그

### 2. Shorts 우선 탐색
- 챌린지는 주로 Shorts 형태

### 3. 패턴 분석
- 동일한 음원 사용 영상 개수 카운트
- 유사한 동작/구도 탐지 (텍스트 패턴 매칭)

### 4. 확산도 평가
- 모방 영상 수 (검색 결과 개수)
- 참여 채널 다양성 (구독자 범위)
- 해시태그 조회수 합계

### 5. 참여 난이도 평가
- 간단한 동작: high_participation
- 복잡한 동작/편집: medium_participation

### 6. 조건 충족 시 저장

### 7. 연관 챌린지 탐색
- 추천 영상 따라가기

---

## 판단 기준

### 챌린지 점수 계산

All component scores are normalized to a **0–10 scale** before applying weights.

```python
# ============================================================
# NORMALIZATION FORMULAS (each component → 0-10 scale)
# ============================================================

# 1. participation_count_normalized (0-10)
#    Raw count of videos participating in the challenge
#    Target range: 0-1000+ videos
#    Formula: Capped linear scaling
def normalize_participation(raw_count: int) -> float:
    """Normalize participation count to 0-10 scale."""
    MAX_EXPECTED = 1000  # 1000+ videos = max score
    return min(raw_count / MAX_EXPECTED * 10.0, 10.0)
    # Examples: 50 videos → 0.5, 500 videos → 5.0, 1000+ videos → 10.0

# 2. growth_velocity_normalized (0-10)
#    Daily growth rate as percentage, averaged over observation window
#    Calculation: Average daily percent change in participation over 7 days
#    Formula: (today_count - yesterday_count) / yesterday_count * 100, averaged
def normalize_growth_velocity(daily_growth_rates: list[float]) -> float:
    """
    Normalize growth velocity to 0-10 scale.
    daily_growth_rates: list of daily percent changes (e.g., [15.0, 20.0, 10.0, ...])
    Window: 7 days (or available data if less)
    """
    if not daily_growth_rates:
        return 0.0
    avg_daily_growth = sum(daily_growth_rates[-7:]) / len(daily_growth_rates[-7:])
    MAX_DAILY_GROWTH = 50.0  # 50%+ daily growth = max score
    return min(avg_daily_growth / MAX_DAILY_GROWTH * 10.0, 10.0)
    # Examples: 5% avg → 1.0, 25% avg → 5.0, 50%+ avg → 10.0

# 3. creator_diversity_normalized (0-10)
#    Measures diversity of participating creators across subscriber ranges
#    Buckets: micro (<10k), small (10k-100k), medium (100k-500k), 
#             large (500k-1M), mega (>1M)
#    Scoring: Based on entropy or bucket coverage
def normalize_creator_diversity(subscriber_ranges: dict) -> float:
    """
    Normalize creator diversity to 0-10 scale.
    subscriber_ranges: {'micro': count, 'small': count, 'medium': count, 
                        'large': count, 'mega': count}
    """
    # Method 1: Simple coverage (2 points per bucket with participants)
    buckets_with_participants = sum(1 for count in subscriber_ranges.values() if count > 0)
    coverage_score = buckets_with_participants * 2.0  # 5 buckets * 2 = 10 max
    
    # Method 2 (alternative): Entropy-based
    # Higher entropy = more even distribution = higher score
    # total = sum(subscriber_ranges.values())
    # if total == 0: return 0.0
    # entropy = -sum((c/total) * log2(c/total) for c in subscriber_ranges.values() if c > 0)
    # max_entropy = log2(5)  # 5 buckets
    # return (entropy / max_entropy) * 10.0
    
    return min(coverage_score, 10.0)
    # Examples: 1 bucket → 2.0, 3 buckets → 6.0, 5 buckets → 10.0

# 4. ease_of_participation_normalized (0-10)
#    Qualitative score assigned by heuristic rules or manual annotation
#    Scoring method: Rule-based heuristic (can be ML-enhanced later)
def normalize_ease_of_participation(challenge_metadata: dict) -> float:
    """
    Score ease of participation based on challenge characteristics.
    Returns 0-10 score (higher = easier to participate).
    
    Heuristic scoring:
    - No props required: +3
    - Indoor possible: +2
    - Duration < 30 seconds: +2
    - No editing required: +2
    - Simple movements: +1
    """
    score = 0.0
    if not challenge_metadata.get('props_required', True):
        score += 3.0
    if challenge_metadata.get('location_indoor_possible', False):
        score += 2.0
    if challenge_metadata.get('duration_seconds', 60) < 30:
        score += 2.0
    if not challenge_metadata.get('editing_required', True):
        score += 2.0
    if challenge_metadata.get('difficulty', 'medium') == 'easy':
        score += 1.0
    return min(score, 10.0)
    # Examples: finger dance → 10.0, full dance → 5.0, complex choreography → 3.0

# 5. originality_normalized (0-10)
#    Qualitative score for uniqueness/novelty
#    Scoring method: Heuristic based on similarity to existing trends
def normalize_originality(challenge_data: dict) -> float:
    """
    Score originality based on novelty indicators.
    Returns 0-10 score (higher = more original).
    
    Heuristic factors:
    - New audio track (not previously viral): +4
    - New movement/format pattern: +3
    - First seen in last 3 days: +2
    - Cross-platform origin (TikTok → YouTube): +1
    """
    score = 0.0
    if challenge_data.get('is_new_audio', False):
        score += 4.0
    if challenge_data.get('is_new_format', False):
        score += 3.0
    days_since_start = challenge_data.get('days_since_start', 30)
    if days_since_start <= 3:
        score += 2.0
    if challenge_data.get('cross_platform_origin', False):
        score += 1.0
    return min(score, 10.0)
    # Examples: brand new trend → 9.0, derivative → 4.0, copycat → 2.0

# ============================================================
# FINAL SCORE CALCULATION
# ============================================================

def calculate_challenge_score(
    participation_count: int,
    daily_growth_rates: list[float],
    subscriber_ranges: dict,
    challenge_metadata: dict,
    challenge_data: dict
) -> float:
    """
    Calculate final challenge score (0-10 scale).
    
    Weights:
    - participation_count: 30% (0.30)
    - growth_velocity: 25% (0.25)
    - creator_diversity: 20% (0.20)
    - ease_of_participation: 15% (0.15)
    - originality: 10% (0.10)
    """
    p = normalize_participation(participation_count)
    g = normalize_growth_velocity(daily_growth_rates)
    d = normalize_creator_diversity(subscriber_ranges)
    e = normalize_ease_of_participation(challenge_metadata)
    o = normalize_originality(challenge_data)
    
    challenge_score = (
        p * 0.30 +  # participation_count normalized (0-10)
        g * 0.25 +  # growth_velocity normalized (0-10)
        d * 0.20 +  # creator_diversity normalized (0-10)
        e * 0.15 +  # ease_of_participation (0-10)
        o * 0.10    # originality (0-10)
    )
    
    return round(challenge_score, 2)

# ============================================================
# THRESHOLD CRITERIA
# ============================================================
# Save challenge if:
#   1. challenge_score > 7.0 (normalized scale)
#   AND
#   2. participation_count > 50 (raw threshold for minimum viability)
#
# The participation_count > 50 raw threshold ensures we don't save
# challenges that score high on other factors but lack actual traction.
# ============================================================
```

**Score Interpretation:**
| Score Range | Interpretation |
|-------------|----------------|
| 9.0 - 10.0 | Exceptional viral potential, immediate action |
| 7.0 - 8.9 | High potential, recommended for tracking |
| 5.0 - 6.9 | Moderate potential, continue monitoring |
| 3.0 - 4.9 | Low potential, niche audience |
| 0.0 - 2.9 | Minimal potential, skip |

### 선택 조건
- 최근 7일 내 시작된 챌린지
- 모방 영상 50개 이상
- 다양한 구독자 범위 참여 (마이크로 → 메가)

### 스킵 조건
- 1개월 이상 지속된 구 챌린지
- 특정 커뮤니티 한정 (확산 불가)
- 위험/부적절한 행위

---

## 수집 데이터

### JSON 스키마
```json
{
  "discovery_type": "challenge_content",
  "challenge_name": "10초 댄스 챌린지",
  "hashtags": ["#10초댄스챌린지", "#댄스", "#숏챌린지"],
  "origin_video_id": "ghi789rst",
  "origin_video_url": "https://youtube.com/shorts/ghi789rst",
  "origin_channel": "댄스크루K",
  "audio_track": "Original Sound - 댄스크루K",
  "participation_count": 450,
  "total_views_estimated": 8500000,
  "avg_participant_views": 18888,
  "top_participant_channels": [
    {"name": "인플루언서A", "subscribers": 1200000},
    {"name": "일반유저B", "subscribers": 5000}
  ],
  "start_date_estimated": "2025-12-20",
  "growth_rate_daily": 80,
  "difficulty": "easy",
  "props_required": "없음",
  "location_requirement": "실내",
  "score": 8.5,
  "virality_potential": "high",
  "discovered_at": "2025-12-28T20:30:00Z",
  "device_id": "10.0.40.20"
}
```

---

## 성공 지표

| 지표 | 목표 |
|------|-----|
| 일일 발견 | 10-20건 |
| 조기 발견률 | 평균 3일 이내 |
| 확산 예측 정확도 | > 50% (7일 내 2배 성장) |
| 독창성 점수 | 평균 7.0 이상 |

---

## 챌린지 타입 분류

### 1. 댄스 챌린지
- 특징: 음원 기반, 반복 동작
- 참여 난이도: 중간
- 확산 속도: 빠름

### 2. 립싱크 챌린지
- 특징: 대사/가사 따라하기
- 참여 난이도: 쉬움
- 확산 속도: 매우 빠름

### 3. 연기 챌린지
- 특징: 짧은 연기/반응
- 참여 난이도: 쉬움-중간
- 확산 속도: 빠름

### 4. 기술 챌린지
- 특징: 스킬 시연
- 참여 난이도: 높음
- 확산 속도: 느림 (니치)

### 5. 밈 챌린지
- 특징: 유머/패러디
- 참여 난이도: 쉬움
- 확산 속도: 매우 빠름

---

## 참여 난이도 평가 기준

### Easy (참여 용이)
- 특별한 도구 불필요
- 실내 가능
- 5분 이내 촬영
- 편집 불필요
- 예시: 손가락 댄스, 립싱크

### Medium (중간 난이도)
- 간단한 도구 필요
- 특정 장소 필요 (실외/특수 공간)
- 10-30분 촬영
- 간단한 편집 필요
- 예시: 전신 댄스, 연기 챌린지

### Hard (참여 어려움)
- 전문 장비 필요
- 특수 장소/시간 필요
- 1시간 이상 촬영
- 고급 편집 필요
- 예시: 기술 시연, 복잡한 안무

---

## 구현 참고사항

### 해시태그 모니터링 목록
```javascript
const CHALLENGE_HASHTAGS = [
  "#챌린지",
  "#challenge",
  "#댄스챌린지",
  "#dancechallenge",
  "#숏챌린지",
  "#shortschallenge",
  "#밈",
  "#meme",
  "#립싱크",
  "#lipsync"
];
```

### AutoX.js 스크립트 구조
```javascript
// scripts/activity_challenge_hunter.js
function challengeHunterActivity(deviceId) {
  for (let hashtag of CHALLENGE_HASHTAGS) {
    // 1. 해시태그 검색
    searchHashtag(hashtag);

    // 2. 최근 1주일 필터
    filterByRecent(7);

    // 3. Shorts 우선 정렬
    sortByShorts();

    // 4. 패턴 분석 (동일 음원)
    let audioTracks = {};
    for (let i = 0; i < 50; i++) {
      let video = extractVideoData();
      let audioTrack = video.audioTrack;

      if (!audioTracks[audioTrack]) {
        audioTracks[audioTrack] = [];
      }
      audioTracks[audioTrack].push(video);
    }

    // 5. 챌린지 판단 (50개 이상 동일 음원)
    for (let [track, videos] of Object.entries(audioTracks)) {
      if (videos.length >= 50) {
        let challengeData = analyzeChallenge(videos);
        if (challengeData.score > 7.0) {
          saveToDiscoveries(challengeData);
        }
      }
    }
  }
}
```

### 확산도 측정 방법
```javascript
function calculateViralityPotential(videos) {
  // 1. 참여자 다양성 (구독자 범위)
  let subscriberRanges = {
    micro: 0,    // < 10k
    small: 0,    // 10k-100k
    medium: 0,   // 100k-500k
    large: 0,    // 500k-1M
    mega: 0      // > 1M
  };

  videos.forEach(v => {
    let subs = v.channelSubscribers;
    if (subs < 10000) subscriberRanges.micro++;
    else if (subs < 100000) subscriberRanges.small++;
    else if (subs < 500000) subscriberRanges.medium++;
    else if (subs < 1000000) subscriberRanges.large++;
    else subscriberRanges.mega++;
  });

  // 2. 다양성 점수 (모든 범위에 참여자 있으면 10점)
  let diversityScore = Object.values(subscriberRanges)
    .filter(count => count > 0)
    .length * 2;

  return diversityScore;
}
```