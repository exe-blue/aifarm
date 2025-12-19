"""
AIFarm YouTube 자동화 오케스트레이터
디바이스들의 YouTube 시청 행동을 조율하고 검증합니다.
"""

import subprocess
import time
import random
import os
import json
import logging
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
from dataclasses import dataclass, asdict

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ADB 경로 설정
ADB_PATH = r"C:\Program Files (x86)\xinhui\tools\adb.exe"

# 검증 로그 경로
VERIFICATION_LOG_PATH = Path(__file__).parent.parent.parent / "verification" / "log"

# WiFi 연결 디바이스 목록
WIFI_DEVICES = [
    "192.168.200.104:5555",
    "192.168.200.132:5555",
    "192.168.200.157:5555",
    "192.168.200.172:5555",
    "192.168.200.193:5555",
    "192.168.200.197:5555",
]

# 검색 키워드 풀
SEARCH_KEYWORDS = [
    "BTS", "BLACKPINK", "IVE", "NewJeans", "aespa", "TWICE",
    "Stray Kids", "NCT", "LE SSERAFIM", "ITZY", "Red Velvet", "EXO",
    "뉴스", "먹방", "게임", "브이로그", "음악", "영화 리뷰",
]


@dataclass
class VerificationResult:
    """검증 결과 데이터 클래스"""
    device_id: str
    keyword: str
    timestamp: str
    screenshot_path: str
    steps_completed: dict
    success: bool
    error_message: Optional[str] = None


class YouTubeOrchestrator:
    """YouTube 자동화 오케스트레이터"""
    
    def __init__(self):
        self.is_running = False
        self.active_devices = 0
        self.total_actions = 0
        self.started_at: Optional[datetime] = None
        self._ensure_log_directory()
    
    def _ensure_log_directory(self):
        """검증 로그 디렉토리 생성"""
        VERIFICATION_LOG_PATH.mkdir(parents=True, exist_ok=True)
        logger.info(f"검증 로그 경로: {VERIFICATION_LOG_PATH}")
    
    def _run_adb(self, device_id: str, command: list) -> tuple[bool, str]:
        """ADB 명령 실행"""
        full_command = [ADB_PATH, "-s", device_id] + command
        try:
            result = subprocess.run(full_command, capture_output=True, text=True, timeout=15)
            return result.returncode == 0, result.stdout.strip()
        except Exception as e:
            return False, str(e)
    
    def _take_screenshot(self, device_id: str, keyword: str) -> str:
        """스크린샷 촬영 및 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_device = device_id.replace(":", "_").replace(".", "_")
        safe_keyword = keyword.replace(" ", "_")
        
        filename = f"{timestamp}_{safe_device}_{safe_keyword}.png"
        local_path = VERIFICATION_LOG_PATH / filename
        
        # 스크린샷 촬영
        self._run_adb(device_id, ["shell", "screencap", "-p", "/sdcard/verification.png"])
        success, _ = self._run_adb(device_id, ["pull", "/sdcard/verification.png", str(local_path)])
        
        if success:
            logger.info(f"스크린샷 저장: {local_path}")
            return str(local_path)
        else:
            logger.warning(f"스크린샷 저장 실패: {device_id}")
            return ""
    
    def _youtube_watch_flow(self, device_id: str, keyword: str) -> VerificationResult:
        """YouTube 시청 플로우 실행"""
        timestamp = datetime.now().isoformat()
        steps = {}
        
        try:
            # 1. 화면 켜기
            success, _ = self._run_adb(device_id, ["shell", "input", "keyevent", "KEYCODE_WAKEUP"])
            steps["wake_screen"] = success
            time.sleep(0.3)
            
            # 2. 홈으로 이동
            success, _ = self._run_adb(device_id, ["shell", "input", "keyevent", "KEYCODE_HOME"])
            steps["go_home"] = success
            time.sleep(0.5)
            
            # 3. YouTube 앱 실행
            success, _ = self._run_adb(device_id, [
                "shell", "am", "start", "-n",
                "com.google.android.youtube/com.google.android.youtube.HomeActivity"
            ])
            steps["launch_youtube"] = success
            time.sleep(2 + random.uniform(0, 1))
            
            # 4. 검색 버튼 탭 (우상단)
            success, _ = self._run_adb(device_id, ["shell", "input", "tap", "950", "100"])
            steps["tap_search"] = success
            time.sleep(1.5 + random.uniform(0, 0.5))
            
            # 5. 검색어 입력
            success, _ = self._run_adb(device_id, ["shell", "input", "text", keyword.replace(" ", "%s")])
            steps["input_keyword"] = success
            time.sleep(0.3)
            
            # 6. 엔터 키 (검색 실행)
            success, _ = self._run_adb(device_id, ["shell", "input", "keyevent", "KEYCODE_ENTER"])
            steps["execute_search"] = success
            time.sleep(2 + random.uniform(0, 1))
            
            # 7. 첫 번째 영상 선택
            success, _ = self._run_adb(device_id, ["shell", "input", "tap", "540", "400"])
            steps["select_video"] = success
            time.sleep(2 + random.uniform(0, 0.5))
            
            # 8. 시청 (랜덤 시간 스크롤/터치 시뮬레이션)
            watch_duration = random.randint(15, 45)
            for i in range(watch_duration // 10):
                # 랜덤 스크롤
                if random.random() > 0.7:
                    self._run_adb(device_id, ["shell", "input", "swipe", "540", "1000", "540", "600", "300"])
                time.sleep(10)
            steps["watch_video"] = True
            
            # 9. 검증 스크린샷
            screenshot_path = self._take_screenshot(device_id, keyword)
            steps["take_screenshot"] = bool(screenshot_path)
            
            # 10. 홈으로 돌아가기
            success, _ = self._run_adb(device_id, ["shell", "input", "keyevent", "KEYCODE_HOME"])
            steps["return_home"] = success
            
            overall_success = all(steps.values())
            
            return VerificationResult(
                device_id=device_id,
                keyword=keyword,
                timestamp=timestamp,
                screenshot_path=screenshot_path,
                steps_completed=steps,
                success=overall_success
            )
            
        except Exception as e:
            logger.error(f"디바이스 {device_id} 실행 오류: {e}")
            return VerificationResult(
                device_id=device_id,
                keyword=keyword,
                timestamp=timestamp,
                screenshot_path="",
                steps_completed=steps,
                success=False,
                error_message=str(e)
            )
    
    def _save_verification_log(self, results: list[VerificationResult]):
        """검증 결과를 JSON 로그로 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = VERIFICATION_LOG_PATH / f"session_{timestamp}.json"
        
        log_data = {
            "session_id": timestamp,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "total_devices": len(results),
            "successful_devices": sum(1 for r in results if r.success),
            "results": [asdict(r) for r in results]
        }
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(log_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"검증 로그 저장: {log_file}")
    
    def start(self) -> dict:
        """자동화 시스템 시작"""
        if self.is_running:
            return {"success": False, "message": "이미 실행 중입니다"}
        
        self.is_running = True
        self.started_at = datetime.now()
        self.active_devices = len(WIFI_DEVICES)
        
        logger.info("=" * 70)
        logger.info("AIFarm YouTube 자동화 시스템 시작")
        logger.info(f"활성 디바이스: {self.active_devices}대")
        logger.info("=" * 70)
        
        return {
            "success": True,
            "message": "자동화 시스템이 시작되었습니다",
            "active_devices": self.active_devices,
            "started_at": self.started_at.isoformat()
        }
    
    def stop(self) -> dict:
        """자동화 시스템 중지"""
        if not self.is_running:
            return {"success": False, "message": "실행 중이 아닙니다"}
        
        self.is_running = False
        
        logger.info("=" * 70)
        logger.info("AIFarm YouTube 자동화 시스템 중지")
        logger.info(f"총 수행 작업: {self.total_actions}건")
        logger.info("=" * 70)
        
        result = {
            "success": True,
            "message": "자동화 시스템이 중지되었습니다",
            "total_actions": self.total_actions,
            "stopped_at": datetime.now().isoformat()
        }
        
        self.active_devices = 0
        self.total_actions = 0
        self.started_at = None
        
        return result
    
    def run_cycle(self) -> list[VerificationResult]:
        """한 사이클의 YouTube 시청 수행"""
        if not self.is_running:
            logger.warning("시스템이 실행 중이 아닙니다")
            return []
        
        # 각 디바이스에 랜덤 키워드 할당
        device_tasks = [
            (device, random.choice(SEARCH_KEYWORDS))
            for device in WIFI_DEVICES
        ]
        
        logger.info(f"\n[사이클 시작] {len(device_tasks)}대 디바이스")
        for device, keyword in device_tasks:
            logger.info(f"  {device} -> {keyword}")
        
        results = []
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {
                executor.submit(self._youtube_watch_flow, device, keyword): (device, keyword)
                for device, keyword in device_tasks
            }
            
            for future in as_completed(futures):
                device, keyword = futures[future]
                result = future.result()
                results.append(result)
                
                status = "✓ 성공" if result.success else "✗ 실패"
                logger.info(f"  [{status}] {device} - {keyword}")
        
        self.total_actions += len(results)
        
        # 검증 로그 저장
        self._save_verification_log(results)
        
        success_count = sum(1 for r in results if r.success)
        logger.info(f"\n[사이클 완료] 성공: {success_count}/{len(results)}")
        
        return results
    
    def get_status(self) -> dict:
        """현재 상태 조회"""
        return {
            "is_running": self.is_running,
            "active_devices": self.active_devices,
            "total_actions": self.total_actions,
            "started_at": self.started_at.isoformat() if self.started_at else None
        }


# 싱글톤 인스턴스
_orchestrator: Optional[YouTubeOrchestrator] = None


def get_orchestrator() -> YouTubeOrchestrator:
    """오케스트레이터 싱글톤 인스턴스 반환"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = YouTubeOrchestrator()
    return _orchestrator


if __name__ == "__main__":
    # 테스트 실행
    orchestrator = get_orchestrator()
    
    # 시스템 시작
    print(orchestrator.start())
    
    # 한 사이클 실행
    results = orchestrator.run_cycle()
    
    # 결과 출력
    print("\n" + "=" * 70)
    print("실행 결과:")
    for r in results:
        print(f"  {r.device_id}: {'성공' if r.success else '실패'}")
        if r.screenshot_path:
            print(f"    스크린샷: {r.screenshot_path}")
    
    # 시스템 중지
    print(orchestrator.stop())
