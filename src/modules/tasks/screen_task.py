"""화면 관련 태스크"""

import asyncio
from datetime import datetime
from pathlib import Path
from src.modules.task_registry import TaskRegistry, BaseTask


@TaskRegistry.register(
    "screen_on",
    description="화면 켜기",
    version="1.0.0"
)
class ScreenOnTask(BaseTask):
    """화면 켜기 태스크"""
    
    async def execute(self, device) -> dict:
        """화면 켜기"""
        device.screen_on()
        await asyncio.sleep(0.5)
        
        return {"screen_on": True}


@TaskRegistry.register(
    "screen_off",
    description="화면 끄기",
    version="1.0.0"
)
class ScreenOffTask(BaseTask):
    """화면 끄기 태스크"""
    
    async def execute(self, device) -> dict:
        """화면 끄기"""
        device.screen_off()
        
        return {"screen_off": True}


@TaskRegistry.register(
    "screen_unlock",
    description="화면 잠금 해제",
    version="1.0.0"
)
class ScreenUnlockTask(BaseTask):
    """화면 잠금 해제 태스크"""
    
    async def execute(self, device) -> dict:
        """화면 잠금 해제"""
        device.unlock()
        await asyncio.sleep(1)
        
        return {"unlocked": True}


@TaskRegistry.register(
    "screenshot",
    description="스크린샷 저장",
    version="1.0.0"
)
class ScreenshotTask(BaseTask):
    """스크린샷 태스크"""
    
    async def execute(self, device) -> dict:
        """스크린샷 저장"""
        save_dir = self.config.parameters.get("save_dir", "screenshots")
        
        # 디렉토리 생성
        Path(save_dir).mkdir(parents=True, exist_ok=True)
        
        # 파일명 생성
        device_ip = getattr(device, '_serial', 'unknown').replace(':', '_')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{save_dir}/{device_ip}_{timestamp}.png"
        
        # 스크린샷 저장
        device.screenshot(filename)
        
        return {
            "filename": filename,
            "saved": True
        }


@TaskRegistry.register(
    "screen_tap",
    description="화면 탭",
    version="1.0.0"
)
class ScreenTapTask(BaseTask):
    """화면 탭 태스크"""
    
    async def execute(self, device) -> dict:
        """화면 탭"""
        x = self.config.parameters.get("x", 500)
        y = self.config.parameters.get("y", 500)
        
        device.click(x, y)
        await asyncio.sleep(0.5)
        
        return {
            "x": x,
            "y": y,
            "tapped": True
        }


@TaskRegistry.register(
    "screen_swipe",
    description="화면 스와이프",
    version="1.0.0"
)
class ScreenSwipeTask(BaseTask):
    """화면 스와이프 태스크"""
    
    async def execute(self, device) -> dict:
        """화면 스와이프"""
        sx = self.config.parameters.get("start_x", 500)
        sy = self.config.parameters.get("start_y", 1500)
        ex = self.config.parameters.get("end_x", 500)
        ey = self.config.parameters.get("end_y", 500)
        duration = self.config.parameters.get("duration", 0.5)
        
        device.swipe(sx, sy, ex, ey, duration)
        await asyncio.sleep(0.5)
        
        return {
            "start": [sx, sy],
            "end": [ex, ey],
            "swiped": True
        }

