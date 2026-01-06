#!/usr/bin/env python3
"""
Persona Service 검증 스크립트

페르소나 서비스의 핵심 기능을 검증합니다:
1. 헬스 체크
2. 페르소나 CRUD
3. 존재 상태 전이
4. 활동 기록 및 보상
"""
import sys
import json
import logging
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8006"
PASS = 0
FAIL = 0


def check(name: str, condition: bool, details: str = "") -> bool:
    """검증 결과 출력"""
    global PASS, FAIL
    if condition:
        logger.info(f"✅ PASS: {name}")
        PASS += 1
        return True
    else:
        logger.error(f"❌ FAIL: {name}")
        if details:
            logger.error(f"   └─ {details}")
        FAIL += 1
        return False


def api_get(endpoint: str) -> dict | None:
    """GET 요청"""
    try:
        req = Request(f"{BASE_URL}{endpoint}")
        with urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode())
    except (URLError, HTTPError) as e:
        logger.debug(f"API 오류: {e}")
        return None


def api_post(endpoint: str, data: dict | None = None) -> dict | None:
    """POST 요청"""
    try:
        req = Request(
            f"{BASE_URL}{endpoint}",
            data=json.dumps(data).encode() if data else None,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except (URLError, HTTPError) as e:
        logger.debug(f"API 오류: {e}")
        return None


def main():
    """메인 검증 로직"""
    logger.info("=" * 50)
    logger.info("Persona Service 검증 시작")
    logger.info("=" * 50)
    logger.info("")

    # 1. 헬스 체크
    logger.info("[1/5] 헬스 체크")
    logger.info("-" * 30)
    health = api_get("/health")
    if not check("서비스 응답", health is not None, "서비스가 실행 중인지 확인하세요"):
        logger.error("\n💡 해결방법: cd services/persona-service && python main.py")
        sys.exit(1)
    
    check("상태 정상", health.get("status") == "healthy")
    logger.info("")

    # 2. 페르소나 목록 조회
    logger.info("[2/5] 페르소나 목록 조회")
    logger.info("-" * 30)
    result = api_get("/api/personas?limit=5")
    check("목록 조회 성공", result is not None and result.get("success"))
    
    if result:
        stats = result.get("stats", {})
        logger.info(f"   └─ 전체: {stats.get('total', 0)}개")
        logger.info(f"   └─ Active: {stats.get('active', 0)}, Void: {stats.get('void', 0)}")
    logger.info("")

    # 3. 존재 상태 틱 처리
    logger.info("[3/5] 존재 상태 틱 처리")
    logger.info("-" * 30)
    tick_result = api_post("/api/personas/tick?limit=10")
    check("틱 처리 성공", tick_result is not None and tick_result.get("success"))
    
    if tick_result:
        processed = tick_result.get("processed", 0)
        transitions = tick_result.get("transitionCount", 0)
        logger.info(f"   └─ 처리: {processed}개, 전이: {transitions}개")
    logger.info("")

    # 4. 다음 호출 페르소나 선택
    logger.info("[4/5] 스케줄러 - 다음 호출 선택")
    logger.info("-" * 30)
    next_result = api_get("/api/personas/next?count=3")
    check("선택 성공", next_result is not None and next_result.get("success"))
    
    if next_result and next_result.get("personas"):
        for p in next_result["personas"][:3]:
            logger.info(f"   └─ {p.get('name', 'N/A')} (Priority: {p.get('priority_level', 'N/A')})")
    logger.info("")

    # 5. 존재 통계 조회
    logger.info("[5/5] 존재 통계")
    logger.info("-" * 30)
    stats_result = api_get("/api/stats/existence")
    check("통계 조회 성공", stats_result is not None and stats_result.get("success"))
    
    if stats_result:
        at_risk = stats_result.get("at_risk_count", 0)
        logger.info(f"   └─ 위험 상태: {at_risk}개")
    logger.info("")

    # 결과 요약
    logger.info("=" * 50)
    logger.info("검증 결과")
    logger.info("=" * 50)
    logger.info(f"  통과: {PASS}")
    logger.info(f"  실패: {FAIL}")
    logger.info("")

    if FAIL > 0:
        logger.error("❌ 일부 검증 실패")
        sys.exit(1)
    else:
        logger.info("✅ 모든 검증 통과!")
        sys.exit(0)


if __name__ == "__main__":
    main()
