# 검증 스크립트 (Verify)

Boris Cherny 방식: **"검증 피드백 루프가 품질을 2~3배 향상시킨다"**

이 폴더에는 DoAi.Me 프로젝트의 검증 스크립트들이 포함되어 있습니다.

## 사용법

### 전체 검증 실행
```bash
./verify/run_all.sh
```

### 개별 검증 실행
```bash
# Persona Service 검증
python verify/check_persona_service.py

# AutoX.js 시뮬레이터
cd autox-scripts && node tests/simulator.js
```

## 검증 항목

| 스크립트 | 검증 내용 |
|----------|----------|
| `run_all.sh` | 통합 검증 (파일, 서비스, 린트, 테스트) |
| `check_persona_service.py` | 페르소나 서비스 API 검증 |

## 성공 기준

### 필수 (MUST PASS)
- [ ] DOAI.md 파일 존재
- [ ] 서비스 헬스 체크 응답

### 권장 (SHOULD PASS)
- [ ] 린트 오류 없음
- [ ] 테스트 통과
- [ ] 커밋되지 않은 변경 없음

## 검증 실패 시

1. 오류 메시지 확인
2. 해당 파일 수정
3. 다시 검증 실행
4. 새로운 교훈은 `DOAI.md`에 기록

## 새 검증 스크립트 추가

1. 이 폴더에 스크립트 작성
2. `run_all.sh`에 호출 추가
3. README.md에 설명 추가

```bash
# 예시: 새 검증 스크립트
python verify/check_new_feature.py
```
