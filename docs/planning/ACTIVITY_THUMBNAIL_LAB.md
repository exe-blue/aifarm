# 썸네일 랩 활동

**생성일**: 2025-12-28
**카테고리**: 데이터 수집

---

## 목적

- 고CTR(클릭률) 썸네일 패턴 분석
- 카테고리별 효과적인 썸네일 요소 식별
- A/B 테스트 가능한 썸네일 라이브러리 구축

### 기대 효과
- 일일 100-200건의 고CTR 썸네일 수집
- 20개 이상의 서로 다른 패턴 식별
- 카테고리별 썸네일 전략 수립

---

## 대상 디바이스

- **할당 대수**: 20대 (전체의 3%)
- **우선순위**: 낮음 (데이터 수집 중심)
- **활동 시간**: 전 시간대 균등 분산

---

## 실행 플로우

### 1. 검색 결과 페이지 진입
- 인기 키워드 검색

### 2. 썸네일 스크린샷 수집
- 상위 20개 영상 썸네일
- OCR로 텍스트 추출 (제목 오버레이)
- 이미지 분석 (색상, 얼굴 유무, 화살표/원 등)

### 3. 메트릭 수집
- 조회수
- 업로드 날짜
- 검색 순위

### 4. CTR 추정
- relative_ctr = view_count / (average_views_at_rank * days_since_upload)

### 5. 썸네일 패턴 분석
- 텍스트 비율 (썸네일 면적 대비)
- 색상 팔레트 (RGB 주요 색상)
- 얼굴 존재 여부 (표정)
- 화살표/원/강조 요소

### 6. 고CTR 썸네일 저장
- 조건 충족 시

### 7. 다음 키워드
- 다른 카테고리 키워드로 이동

---

## 판단 기준

### 썸네일 효과 점수
```python
thumbnail_score = (
    relative_ctr * 0.40 +             # 상대 CTR
    visual_clarity * 0.20 +           # 시각적 명확성
    text_readability * 0.15 +         # 텍스트 가독성
    color_contrast * 0.15 +           # 색상 대비
    emotional_appeal * 0.10           # 감정적 호소력
)
저장 기준: thumbnail_score > 7.5
```

### 선택 조건
- 검색 순위 TOP 20 내
- 추정 CTR > 평균 1.5배
- 명확한 디자인 패턴 (분석 가능)

### 스킵 조건
- 저품질 이미지 (해상도 < 720p)
- 과도한 클릭베이트 (신뢰도 하락)
- 텍스트 없는 단순 이미지 (분석 불가)

---

## 수집 데이터

### JSON 스키마
```json
{
  "discovery_type": "thumbnail_winner",
  "video_id": "jkl012mno",
  "video_url": "https://youtube.com/watch?v=jkl012mno",
  "video_title": "1분만에 배우는 엑셀 꿀팁",
  "thumbnail_url": "https://i.ytimg.com/vi/jkl012mno/maxresdefault.jpg",
  "channel_name": "오피스마스터",
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
  "discovered_at": "2025-12-28T14:00:00Z",
  "device_id": "10.0.50.8"
}
```

---

## 성공 지표

| 지표 | 목표 |
|------|-----|
| 일일 수집 | 100-200건 |
| 패턴 다양성 | 최소 20개 이상 |
| 고CTR 비율 | > 30% (추정 CTR > 평균) |
| 카테고리 커버리지 | 10개 이상 |

---

## 썸네일 패턴 라이브러리

### 1. 숫자 강조형
- **특징**: 큰 숫자, 대비 색상
- **예시**: "3가지 방법", "10분 완성"
- **효과**: 구체성, 즉시성
- **적합 카테고리**: 교육, How-to

### 2. 얼굴 표정형
- **특징**: 과장된 표정 (놀람, 웃음)
- **예시**: 😮😱😂
- **효과**: 감정 전달, 친근감
- **적합 카테고리**: 엔터테인먼트, 리액션

### 3. 전후 비교형
- **특징**: Before/After 분할
- **예시**: "→" 화살표로 변화 강조
- **효과**: 변화/성과 시각화
- **적합 카테고리**: 다이어트, 메이크업, DIY

### 4. 텍스트 중심형
- **특징**: 최소 이미지, 큰 텍스트
- **예시**: "충격", "절대 하지 마세요"
- **효과**: 직접적 메시지
- **적합 카테고리**: 뉴스, 논쟁

### 5. 미스터리형
- **특징**: 일부만 공개, 물음표
- **예시**: "이것만 알면?", "숨겨진 ○○"
- **효과**: 호기심 유발
- **적합 카테고리**: 리뷰, 비밀 팁

### 6. 대비 색상형
- **특징**: 빨강/노랑/검정 대비
- **예시**: 빨강 배경 + 노랑 텍스트
- **효과**: 시선 집중
- **적합 카테고리**: 긴급성, 경고

### 7. 화살표/원 강조형
- **특징**: 핵심 요소에 화살표/원 표시
- **예시**: ➡️⭕
- **효과**: 주목 유도
- **적합 카테고리**: 분석, 설명

### 8. 깔끔한 미니멀형
- **특징**: 심플, 여백, 고급스러움
- **예시**: 단색 배경 + 1개 오브젝트
- **효과**: 전문성, 신뢰
- **적합 카테고리**: 비즈니스, 테크

---

## 색상 팔레트 분석

### 고CTR 색상 조합 (카테고리별)

**교육/How-to**:
- 빨강(#FF0000) + 흰색(#FFFFFF)
- 노랑(#FFFF00) + 검정(#000000)
- 파랑(#0000FF) + 흰색(#FFFFFF)

**엔터테인먼트**:
- 분홍(#FF00FF) + 보라(#800080)
- 오렌지(#FFA500) + 노랑(#FFFF00)
- 무지개 그라데이션

**게임**:
- 네온 그린(#00FF00) + 검정(#000000)
- 사이버 블루(#00FFFF) + 보라(#800080)
- 빨강(#FF0000) + 검정(#000000)

**뉴스/시사**:
- 빨강(#FF0000) + 검정(#000000)
- 파랑(#0000FF) + 흰색(#FFFFFF)
- 회색 톤

---

## 구현 참고사항

### 인기 검색 키워드 목록
```javascript
const SEARCH_KEYWORDS = {
  education: ["엑셀 강의", "영어 회화", "파이썬 기초", "포토샵 튜토리얼"],
  entertainment: ["웃긴 영상", "반려동물", "브이로그", "리액션"],
  howto: ["요리 레시피", "DIY", "운동", "메이크업"],
  gaming: ["게임 공략", "플레이 영상", "게임 리뷰", "신작 게임"],
  tech: ["스마트폰 리뷰", "노트북 추천", "가전 제품", "IT 뉴스"],
  business: ["재테크", "주식", "부동산", "창업"],
  health: ["다이어트", "운동 루틴", "건강 정보", "요가"],
  travel: ["여행 브이로그", "여행 팁", "해외여행", "국내여행"]
};
```

### AutoX.js 스크립트 구조
```javascript
// scripts/activity_thumbnail_lab.js
function thumbnailLabActivity(deviceId) {
  for (let [category, keywords] of Object.entries(SEARCH_KEYWORDS)) {
    for (let keyword of keywords) {
      // 1. 키워드 검색
      searchYouTube(keyword);

      // 2. 상위 20개 영상 순회
      for (let i = 0; i < 20; i++) {
        let videoData = extractVideoData(i);

        // 3. 썸네일 URL 추출
        let thumbnailUrl = videoData.thumbnailUrl;

        // 4. 이미지 분석 (서버 전송 후 처리)
        let analysis = analyzeThumbnail(thumbnailUrl);

        // 5. CTR 추정
        let estimatedCTR = calculateCTR(videoData, i);

        // 6. 점수 계산
        let score = calculateThumbnailScore(analysis, estimatedCTR);

        if (score > 7.5) {
          saveToDiscoveries({
            ...videoData,
            analysis,
            estimatedCTR,
            score,
            category
          });
        }
      }

      // 7. 다음 키워드
      sleep(random(10, 30) * 1000);
    }
  }
}

function analyzeThumbnail(url) {
  // 서버 측 이미지 분석 API 호출
  // OpenCV 또는 Vision API 사용
  return {
    dominantColors: extractColors(url),
    textOverlay: extractText(url),  // OCR
    hasFace: detectFace(url),
    visualElements: detectElements(url)  // 화살표, 원 등
  };
}
```

### 이미지 분석 라이브러리 (서버 측)
```python
# backend/image_analysis.py
import cv2
import numpy as np
from PIL import Image
import pytesseract

def analyze_thumbnail(image_url):
    # 1. 이미지 다운로드
    img = download_image(image_url)

    # 2. 주요 색상 추출
    dominant_colors = extract_dominant_colors(img, k=3)

    # 3. OCR (텍스트 추출)
    text_overlay = pytesseract.image_to_string(img, lang='kor+eng')

    # 4. 얼굴 탐지
    face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(img)
    has_face = len(faces) > 0

    # 5. 화살표/원 탐지 (Hough 변환)
    has_arrows = detect_arrows(img)
    has_circles = detect_circles(img)

    return {
        "dominant_colors": dominant_colors,
        "text_overlay": text_overlay.strip(),
        "text_ratio": calculate_text_ratio(img),
        "has_face": has_face,
        "has_arrows": has_arrows,
        "has_circles": has_circles
    }
```
