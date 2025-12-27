# 발견물 분류 체계 (Discovery Taxonomy)

**생성일**: 2025-12-28
**용도**: 수집된 콘텐츠 데이터 분류 및 점수 산정

---

## 개요

AIFarm 시스템에서 발견하는 모든 콘텐츠는 6가지 타입으로 분류되며, 각 타입별로 고유한 점수 산정 공식을 사용합니다.

---

## 6가지 발견물 타입

### 1. viral_short

**정의**: YouTube Shorts에서 발견한 바이럴 콘텐츠

**주요 특징**:
- 짧은 영상 (< 60초)
- 높은 조회수 대비 업로드 시간
- 강한 참여율 (좋아요/댓글)

**점수 기준**:
```python
score = (
    view_velocity * 0.35 +        # 조회 속도
    engagement_rate * 0.30 +       # 참여율
    remix_potential * 0.20 +       # 리믹스 가능성
    recency * 0.15                 # 최신성
)

# 세부 계산
view_velocity = min(10, (view_count / hours_since_upload) / 10000)
engagement_rate = min(10, ((likes + comments) / views) * 200)
recency = max(0, 10 - days_since_upload)
```

**저장 기준**: score >= 7.0

**데이터 스키마**:
```json
{
  "discovery_type": "viral_short",
  "video_id": "string",
  "video_url": "string",
  "video_title": "string",
  "channel_name": "string",
  "channel_id": "string",
  "view_count": 1500000,
  "like_count": 85000,
  "comment_count": 1200,
  "upload_time_relative": "2일 전",
  "duration_seconds": 28,
  "score": 8.7,
  "tags": ["댄스", "동물", "챌린지"],
  "audio_track": "Original Sound - ...",
  "detected_trend": "동물_댄스_챌린지",
  "remix_potential": "high",
  "discovered_at": "ISO-8601",
  "device_id": "IP address"
}
```

---

### 2. trending_video

**정의**: 일반 영상 중 급상승 중인 콘텐츠 (트렌딩 탭 진입)

**주요 특징**:
- 트렌딩 TOP 50 내 위치
- 높은 시간당 조회수 증가율
- 특정 카테고리 내 인기

**점수 기준**:
```python
score = (
    ranking_score * 0.40 +         # 트렌딩 순위
    growth_rate * 0.35 +           # 시간당 성장률
    channel_authority * 0.15 +     # 채널 신뢰도
    category_score * 0.10          # 카테고리 경쟁도
)

# 세부 계산
ranking_score = (51 - trending_rank) / 5
growth_rate = min(10, hourly_growth_rate / 100000)
channel_authority = min(10, log10(subscribers))
category_score = inverse_saturation(category)  # 덜 포화된 카테고리 높은 점수
```

**저장 기준**: score >= 7.5 OR trending_rank <= 10

**데이터 스키마**:
```json
{
  "discovery_type": "trending_video",
  "video_id": "string",
  "video_url": "string",
  "video_title": "string",
  "channel_name": "string",
  "channel_id": "string",
  "channel_subscribers": 850000,
  "view_count": 2500000,
  "like_count": 120000,
  "comment_count": 8500,
  "upload_time": "ISO-8601",
  "trending_rank": 7,
  "trending_category": "게임",
  "hourly_growth_rate": 125000,
  "score": 8.9,
  "trend_type": "game_update",
  "related_keywords": ["신작게임", "팁"],
  "estimated_peak_time": "ISO-8601",
  "discovered_at": "ISO-8601",
  "device_id": "IP address"
}
```

---

### 3. rising_channel

**정의**: 빠르게 성장 중인 채널

**주요 특징**:
- 높은 구독자 증가율
- 영상당 평균 조회수 우수
- 정기적 업로드

**점수 기준**:
```python
score = (
    subscriber_growth * 0.40 +     # 구독자 증가율
    avg_views_quality * 0.25 +     # 영상당 평균 조회수
    upload_frequency * 0.20 +      # 업로드 빈도
    engagement_rate * 0.15         # 평균 참여율
)

# 세부 계산
subscriber_growth = min(10, (monthly_growth / subscribers) * 100)
avg_views_quality = min(10, avg_views_per_video / 100000)
upload_frequency = min(10, videos_per_month)
engagement_rate = min(10, avg_engagement_rate * 100)
```

**저장 기준**: score >= 6.5 AND subscribers < 500k

**데이터 스키마**:
```json
{
  "discovery_type": "rising_channel",
  "channel_id": "string",
  "channel_url": "string",
  "channel_name": "string",
  "current_subscribers": 125000,
  "monthly_growth": 15000,
  "growth_rate_percent": 12.0,
  "total_videos": 84,
  "avg_views_per_video": 45000,
  "upload_frequency_days": 3,
  "category": "교육",
  "top_videos": [
    {"title": "...", "views": 500000},
    {"title": "...", "views": 350000}
  ],
  "score": 7.8,
  "potential": "high",
  "discovered_at": "ISO-8601",
  "device_id": "IP address"
}
```

---

### 4. challenge_content

**정의**: 새로운 챌린지/밈

**주요 특징**:
- 다수의 모방 영상 존재
- 특정 음원/해시태그 공통 사용
- 다양한 크리에이터 참여

**점수 기준**:
```python
score = (
    participation_count * 0.30 +   # 참여 영상 수
    growth_velocity * 0.30 +       # 확산 속도
    ease_of_participation * 0.25 + # 참여 용이성
    originality * 0.15             # 독창성
)

# 세부 계산
participation_count = min(10, participation_videos / 50)
growth_velocity = min(10, daily_new_videos / 10)
ease_of_participation = evaluate_ease()  # 1-10 주관적 평가
originality = evaluate_originality()     # 1-10 주관적 평가
```

**저장 기준**: score >= 7.0 AND participation >= 50

**데이터 스키마**:
```json
{
  "discovery_type": "challenge_content",
  "challenge_name": "10초 댄스 챌린지",
  "hashtags": ["#10초댄스챌린지", "#댄스"],
  "origin_video_id": "string",
  "origin_video_url": "string",
  "origin_channel": "string",
  "audio_track": "Original Sound - ...",
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
  "discovered_at": "ISO-8601",
  "device_id": "IP address"
}
```

---

### 5. high_engagement

**정의**: 참여율 높은 콘텐츠

**주요 특징**:
- 조회수 대비 높은 좋아요/댓글 비율
- 활발한 커뮤니티 반응
- 공유 가능성 높음

**점수 기준**:
```python
score = (
    like_ratio * 0.35 +            # 좋아요 비율
    comment_ratio * 0.30 +         # 댓글 비율
    estimated_shares * 0.20 +      # 추정 공유 수
    watch_retention * 0.15         # 시청 지속률
)

# 세부 계산
like_ratio = min(10, (likes / views) * 1000)
comment_ratio = min(10, (comments / views) * 5000)
estimated_shares = min(10, (likes * 0.1 / views) * 1000)
watch_retention = estimated_retention * 10  # 0-1 범위 → 0-10
```

**저장 기준**: score >= 8.0

**데이터 스키마**:
```json
{
  "discovery_type": "high_engagement",
  "video_id": "string",
  "video_url": "string",
  "video_title": "string",
  "channel_name": "string",
  "view_count": 500000,
  "like_count": 45000,
  "comment_count": 3200,
  "like_ratio": 9.0,
  "comment_ratio": 6.4,
  "estimated_shares": 4500,
  "duration_seconds": 480,
  "estimated_retention": 0.85,
  "score": 8.7,
  "category": "교육",
  "engagement_type": "community_discussion",
  "discovered_at": "ISO-8601",
  "device_id": "IP address"
}
```

---

### 6. thumbnail_winner

**정의**: 클릭률 높은 썸네일

**주요 특징**:
- 추정 CTR이 평균 이상
- 명확한 디자인 패턴
- 색상 대비/텍스트 가독성 우수

**점수 기준**:
```python
score = (
    relative_ctr * 0.40 +          # 상대 CTR
    visual_clarity * 0.25 +        # 시각적 명확성
    color_contrast * 0.20 +        # 색상 대비
    text_readability * 0.15        # 텍스트 가독성
)

# 세부 계산
relative_ctr = (estimated_ctr / average_ctr_at_rank) * 5
visual_clarity = analyze_clarity()        # 1-10 이미지 분석
color_contrast = analyze_contrast()       # 1-10 이미지 분석
text_readability = analyze_text()         # 1-10 OCR + 분석
```

**저장 기준**: score >= 7.5

**데이터 스키마**:
```json
{
  "discovery_type": "thumbnail_winner",
  "video_id": "string",
  "video_url": "string",
  "video_title": "1분만에 배우는 엑셀 꿀팁",
  "thumbnail_url": "string",
  "channel_name": "string",
  "search_keyword": "엑셀 강의",
  "search_rank": 3,
  "view_count": 1800000,
  "days_since_upload": 45,
  "estimated_ctr": 2.3,
  "thumbnail_analysis": {
    "dominant_colors": ["#FF0000", "#FFFF00", "#000000"],
    "text_overlay": "1분 완성",
    "text_ratio": 0.25,
    "has_face": true,
    "face_expression": "surprised",
    "has_arrows": true,
    "has_circles": false,
    "visual_elements": ["얼굴", "화살표", "텍스트 박스"]
  },
  "score": 8.7,
  "category": "교육",
  "pattern_tags": ["숫자강조", "얼굴표정", "대비색상"],
  "discovered_at": "ISO-8601",
  "device_id": "IP address"
}
```

---

## 통합 점수 산정 공식

### Python 구현
```python
import math
from datetime import datetime

def calculate_discovery_score(discovery_type: str, metrics: dict) -> float:
    """발견물 점수 계산"""

    if discovery_type == "viral_short":
        hours = max(1, metrics['hours_since_upload'])
        view_velocity = min(10, (metrics['view_count'] / hours) / 10000)

        engagement_rate = min(10, (
            (metrics['likes'] + metrics['comments']) /
            max(1, metrics['views'])
        ) * 200)

        recency = max(0, 10 - metrics['days_since_upload'])
        remix = metrics.get('remix_potential_score', 5)

        score = (
            view_velocity * 0.35 +
            engagement_rate * 0.30 +
            remix * 0.20 +
            recency * 0.15
        )

    elif discovery_type == "trending_video":
        rank_score = (51 - metrics['rank']) / 5
        growth_score = min(10, metrics['hourly_growth'] / 100000)

        subs = max(1, metrics['subscribers'])
        authority = min(10, math.log10(subs))

        category_score = metrics.get('category_score', 5)

        score = (
            rank_score * 0.40 +
            growth_score * 0.35 +
            authority * 0.15 +
            category_score * 0.10
        )

    elif discovery_type == "rising_channel":
        growth_rate = min(10, (
            metrics['monthly_growth'] /
            max(1, metrics['subscribers'])
        ) * 100)

        avg_quality = min(10, metrics['avg_views_per_video'] / 100000)
        upload_freq = min(10, metrics['videos_per_month'])
        engagement = min(10, metrics['avg_engagement_rate'] * 100)

        score = (
            growth_rate * 0.40 +
            avg_quality * 0.25 +
            upload_freq * 0.20 +
            engagement * 0.15
        )

    elif discovery_type == "challenge_content":
        participation = min(10, metrics['participation_count'] / 50)
        velocity = min(10, metrics['daily_growth_rate'] / 10)
        ease = metrics.get('ease_score', 5)
        originality = metrics.get('originality_score', 5)

        score = (
            participation * 0.30 +
            velocity * 0.30 +
            ease * 0.25 +
            originality * 0.15
        )

    elif discovery_type == "high_engagement":
        like_ratio = min(10, (metrics['likes'] / max(1, metrics['views'])) * 1000)
        comment_ratio = min(10, (metrics['comments'] / max(1, metrics['views'])) * 5000)
        shares = min(10, (metrics['likes'] * 0.1 / max(1, metrics['views'])) * 1000)
        retention = metrics.get('retention', 0.5) * 10

        score = (
            like_ratio * 0.35 +
            comment_ratio * 0.30 +
            shares * 0.20 +
            retention * 0.15
        )

    elif discovery_type == "thumbnail_winner":
        avg_ctr = metrics.get('average_ctr_at_rank', 1.0)
        relative_ctr = (metrics['estimated_ctr'] / avg_ctr) * 5

        clarity = metrics.get('visual_clarity', 5)
        contrast = metrics.get('color_contrast', 5)
        readability = metrics.get('text_readability', 5)

        score = (
            relative_ctr * 0.40 +
            clarity * 0.25 +
            contrast * 0.20 +
            readability * 0.15
        )

    else:
        raise ValueError(f"Unknown discovery type: {discovery_type}")

    return round(score, 2)
```

---

## 품질 관리

### 저장 기준 요약
| 타입 | 최소 점수 | 추가 조건 |
|------|---------|---------|
| viral_short | 7.0 | view_count > 100k |
| trending_video | 7.5 | rank <= 50 (또는 rank <= 10이면 무조건) |
| rising_channel | 6.5 | subscribers < 500k |
| challenge_content | 7.0 | participation >= 50 |
| high_engagement | 8.0 | - |
| thumbnail_winner | 7.5 | search_rank <= 20 |

### 중복 제거
- 동일한 video_id는 24시간 내 1회만 저장
- 동일한 challenge_name은 7일 내 1회만 저장
- 동일한 channel_id (rising_channel)는 30일 내 1회만 저장

### 검증 프로세스
1. 점수 계산 후 저장 기준 확인
2. 중복 체크 (Supabase 쿼리)
3. 필수 필드 존재 여부 확인
4. 저장 성공 시 로그 기록
