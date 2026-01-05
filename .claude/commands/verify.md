# /verify - 현재 작업 검증

작업 완료 후 이 커맨드를 실행하여 모든 검증을 수행합니다.

## 검증 단계

### 1. 서비스 헬스 체크
```bash
# Persona Service
curl -sf http://localhost:8006/health || echo "❌ Persona Service 다운"

# API Gateway (있을 경우)
curl -sf http://localhost:8000/health || echo "⚠️ API Gateway 미실행"
```

### 2. 린트 검사 (Python)
```bash
cd $REPO_ROOT
ruff check services/ --fix
```

### 3. 린트 검사 (JavaScript/TypeScript)
```bash
cd $REPO_ROOT/dashboard
npm run lint
```

### 4. 타입 검사
```bash
# Python
pyright services/

# TypeScript
cd $REPO_ROOT/dashboard
npx tsc --noEmit
```

### 5. 테스트 실행
```bash
# 백엔드 테스트
cd $REPO_ROOT
pytest tests/ -v --tb=short

# 프론트엔드 테스트
cd $REPO_ROOT/dashboard
npm test
```

### 6. API 스모크 테스트
```bash
# 페르소나 목록 조회
curl -s http://localhost:8006/api/personas | head -c 500

# 통계 조회
curl -s http://localhost:8006/api/stats/existence | head -c 500
```

## 성공 기준
- [ ] 모든 헬스 체크 200 OK
- [ ] 린트 오류 0개
- [ ] 타입 오류 0개 (경고는 허용)
- [ ] 테스트 통과율 100%
- [ ] API 응답 정상

## 실패 시 조치
1. 오류 메시지 확인
2. 해당 파일 수정
3. 다시 /verify 실행
4. 성공 후 DOAI.md에 교훈 기록 (새로운 실수인 경우)
