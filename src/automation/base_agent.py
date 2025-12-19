"""기본 자동화 에이전트"""

import uiautomator2 as u2
import time
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BaseAgent:
    """기본 자동화 에이전트 클래스"""
    
    def __init__(self, device: u2.Device, package_name: str):
        """
        Args:
            device: uiautomator2 Device 객체
            package_name: 앱 패키지 이름
        """
        self.device = device
        self.package_name = package_name
    
    def screen_on(self):
        """화면 켜기"""
        self.device.screen_on()
        time.sleep(0.5)
    
    def screen_off(self):
        """화면 끄기"""
        self.device.screen_off()
    
    def unlock(self):
        """화면 잠금 해제"""
        self.device.unlock()
        time.sleep(1)
    
    def start_app(self):
        """앱 시작"""
        self.device.app_start(self.package_name)
        time.sleep(2)
    
    def stop_app(self):
        """앱 종료"""
        self.device.app_stop(self.package_name)
    
    def restart_app(self):
        """앱 재시작"""
        self.stop_app()
        time.sleep(1)
        self.start_app()
    
    def click(self, x: int, y: int):
        """좌표 클릭"""
        self.device.click(x, y)
        time.sleep(0.5)
    
    def swipe(self, sx: int, sy: int, ex: int, ey: int, duration: float = 0.5):
        """스와이프"""
        self.device.swipe(sx, sy, ex, ey, duration)
        time.sleep(0.5)
    
    def input_text(self, text: str):
        """텍스트 입력"""
        self.device.send_keys(text)
        time.sleep(0.5)
    
    def press_back(self):
        """뒤로가기"""
        self.device.press("back")
        time.sleep(0.5)
    
    def press_home(self):
        """홈 버튼"""
        self.device.press("home")
        time.sleep(0.5)
    
    def screenshot(self, filename: Optional[str] = None) -> Optional[str]:
        """
        스크린샷 저장
        
        Args:
            filename: 저장할 파일명 (None이면 타임스탬프 사용)
            
        Returns:
            저장된 파일 경로 또는 None
        """
        try:
            if filename is None:
                import datetime
                filename = f"screenshot_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            
            self.device.screenshot(filename)
            logger.info(f"스크린샷 저장: {filename}")
            return filename
        except Exception as e:
            logger.error(f"스크린샷 실패: {e}")
            return None
    
    def wait_for_element(self, **kwargs) -> bool:
        """
        요소가 나타날 때까지 대기
        
        Args:
            **kwargs: uiautomator2 선택자 (text, resourceId 등)
            
        Returns:
            요소 발견 여부
        """
        try:
            self.device(**kwargs).wait(timeout=5)
            return True
        except:
            return False
    
    def click_element(self, **kwargs) -> bool:
        """
        요소 클릭
        
        Args:
            **kwargs: uiautomator2 선택자
            
        Returns:
            클릭 성공 여부
        """
        try:
            self.device(**kwargs).click()
            time.sleep(0.5)
            return True
        except Exception as e:
            logger.warning(f"요소 클릭 실패: {e}")
            return False
    
    def set_text(self, text: str, **kwargs) -> bool:
        """
        요소에 텍스트 입력
        
        Args:
            text: 입력할 텍스트
            **kwargs: uiautomator2 선택자
            
        Returns:
            입력 성공 여부
        """
        try:
            self.device(**kwargs).set_text(text)
            time.sleep(0.5)
            return True
        except Exception as e:
            logger.warning(f"텍스트 입력 실패: {e}")
            return False

