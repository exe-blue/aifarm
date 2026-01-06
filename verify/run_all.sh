#!/bin/bash
# DoAi.Me 통합 검증 스크립트
# Boris Cherny 방식: "검증 피드백 루프가 품질을 2~3배 향상시킨다"

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 루트
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         DoAi.Me 통합 검증 스크립트                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# 결과 출력 함수
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL_COUNT++))
}

warn() {
    echo -e "${YELLOW}⚠️ WARN${NC}: $1"
    ((WARN_COUNT++))
}

skip() {
    echo -e "${BLUE}⏭️ SKIP${NC}: $1"
}

# ===== 1. 필수 파일 존재 확인 =====
echo ""
echo -e "${BLUE}[1/6] 필수 파일 확인${NC}"
echo "─────────────────────────────────────────"

if [ -f "DOAI.md" ]; then
    pass "DOAI.md 존재"
else
    fail "DOAI.md 없음 - AI 가이드 문서 필요"
fi

if [ -d ".claude/commands" ]; then
    pass ".claude/commands/ 폴더 존재"
else
    warn ".claude/commands/ 폴더 없음"
fi

if [ -f "services/persona-service/main.py" ]; then
    pass "Persona Service 메인 파일 존재"
else
    fail "services/persona-service/main.py 없음"
fi

# ===== 2. 서비스 헬스 체크 =====
echo ""
echo -e "${BLUE}[2/6] 서비스 헬스 체크${NC}"
echo "─────────────────────────────────────────"

# Persona Service (8006)
if curl -sf http://localhost:8006/health > /dev/null 2>&1; then
    pass "Persona Service (8006) 정상"
else
    warn "Persona Service (8006) 미실행 - 실행 필요: cd services/persona-service && python main.py"
fi

# API Gateway (8000)
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    pass "API Gateway (8000) 정상"
else
    skip "API Gateway (8000) 미실행"
fi

# Dashboard (3000)
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    pass "Dashboard (3000) 정상"
else
    skip "Dashboard (3000) 미실행"
fi

# ===== 3. Python 린트 검사 =====
echo ""
echo -e "${BLUE}[3/6] Python 린트 검사 (ruff)${NC}"
echo "─────────────────────────────────────────"

if command -v ruff &> /dev/null; then
    if ruff check services/ --quiet 2>/dev/null; then
        pass "Python 린트 통과"
    else
        warn "Python 린트 경고/오류 있음 - ruff check services/ 실행 권장"
    fi
else
    skip "ruff 미설치 - pip install ruff"
fi

# ===== 4. TypeScript/JavaScript 검사 =====
echo ""
echo -e "${BLUE}[4/6] TypeScript/JavaScript 검사${NC}"
echo "─────────────────────────────────────────"

if [ -d "dashboard" ] && [ -f "dashboard/package.json" ]; then
    cd dashboard
    if [ -f "node_modules/.bin/eslint" ]; then
        if npm run lint --silent 2>/dev/null; then
            pass "Dashboard ESLint 통과"
        else
            warn "Dashboard ESLint 경고/오류 있음"
        fi
    else
        skip "Dashboard node_modules 미설치 - npm install 필요"
    fi
    cd "$REPO_ROOT"
else
    skip "Dashboard 폴더 없음"
fi

# ===== 5. 테스트 실행 =====
echo ""
echo -e "${BLUE}[5/6] 테스트 실행${NC}"
echo "─────────────────────────────────────────"

# Python 테스트
if [ -d "tests" ]; then
    if command -v pytest &> /dev/null; then
        if pytest tests/ -q --tb=no 2>/dev/null; then
            pass "Python 테스트 통과"
        else
            warn "Python 테스트 실패 - pytest tests/ -v 로 상세 확인"
        fi
    else
        skip "pytest 미설치"
    fi
else
    skip "tests/ 폴더 없음"
fi

# AutoX.js 시뮬레이터 (실행하지 않고 파일 존재 확인만)
if [ -f "autox-scripts/tests/simulator.js" ]; then
    pass "AutoX.js 시뮬레이터 스크립트 존재"
else
    warn "autox-scripts/tests/simulator.js 없음"
fi

# ===== 6. Git 상태 확인 =====
echo ""
echo -e "${BLUE}[6/6] Git 상태 확인${NC}"
echo "─────────────────────────────────────────"

UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -eq 0 ]; then
    pass "모든 변경 사항 커밋됨"
else
    warn "$UNCOMMITTED 개의 커밋되지 않은 변경 있음"
fi

# ===== 결과 요약 =====
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      검증 결과 요약                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}통과${NC}: $PASS_COUNT"
echo -e "  ${RED}실패${NC}: $FAIL_COUNT"
echo -e "  ${YELLOW}경고${NC}: $WARN_COUNT"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ 검증 실패 - 위 오류를 수정하세요${NC}"
    exit 1
elif [ "$WARN_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️ 검증 통과 (경고 있음) - 경고 사항 확인 권장${NC}"
    exit 0
else
    echo -e "${GREEN}✅ 모든 검증 통과!${NC}"
    exit 0
fi
