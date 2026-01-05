# /commit-pr - 커밋 및 PR 생성

작업 완료 및 검증 통과 후 이 커맨드로 커밋하고 PR을 생성합니다.

## 사전 조건
- [ ] /verify 통과
- [ ] DOAI.md 업데이트 완료 (새로운 교훈 있을 경우)

## 실행 단계

### 1. 변경 사항 확인
```bash
git status
git diff --stat
```

### 2. 스테이징
```bash
# 변경된 파일 스테이징
git add -A

# 변경 내용 최종 확인
git diff --cached --stat
```

### 3. 커밋
```bash
# 커밋 메시지 형식:
# <type>(<scope>): <description>
#
# type: feat, fix, docs, style, refactor, test, chore
# scope: persona, dashboard, autox, gateway, docs 등
#
# 예시:
# feat(persona): add existence state machine
# fix(autox): resolve video search timeout
# docs: update DOAI.md with new learnings

git commit -m "<type>(<scope>): <description>"
```

### 4. 푸시
```bash
git push origin $(git branch --show-current)
```

### 5. PR 생성 (선택)
```bash
# GitHub CLI 사용
gh pr create --title "<PR 제목>" --body "<PR 설명>"

# 또는 GitHub 웹에서 직접 생성
```

## 커밋 메시지 컨벤션

| Type | 설명 |
|------|------|
| feat | 새로운 기능 추가 |
| fix | 버그 수정 |
| docs | 문서 변경 |
| style | 코드 포맷팅 (기능 변경 없음) |
| refactor | 리팩토링 |
| test | 테스트 추가/수정 |
| chore | 빌드, 설정 등 기타 |

## 예시
```bash
git commit -m "feat(persona): implement VOID state rescue mechanism"
git commit -m "fix(autox): handle network timeout in video search"
git commit -m "docs: add error handling lessons to DOAI.md"
```
