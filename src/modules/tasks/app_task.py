"""앱 관련 태스크"""

import asyncio
from src.modules.task_registry import TaskRegistry, BaseTask


@TaskRegistry.register(
    "app_start",
    description="앱 시작",
    version="1.0.0"
)
class AppStartTask(BaseTask):
    """앱 시작 태스크"""
    
    async def execute(self, device) -> dict:
        """앱 시작"""
        package_name = self.config.parameters.get("package_name")
        if not package_name:
            raise ValueError("package_name is required")
        
        device.app_start(package_name)
        await asyncio.sleep(2)
        
        return {
            "package_name": package_name,
            "started": True
        }
    
    def execute_sync(self, device) -> dict:
        """동기 실행"""
        import time
        
        package_name = self.config.parameters.get("package_name")
        if not package_name:
            raise ValueError("package_name is required")
        
        device.app_start(package_name)
        time.sleep(2)
        
        return {
            "package_name": package_name,
            "started": True
        }


@TaskRegistry.register(
    "app_stop",
    description="앱 종료",
    version="1.0.0"
)
class AppStopTask(BaseTask):
    """앱 종료 태스크"""
    
    async def execute(self, device) -> dict:
        """앱 종료"""
        package_name = self.config.parameters.get("package_name")
        if not package_name:
            raise ValueError("package_name is required")
        
        device.app_stop(package_name)
        
        return {
            "package_name": package_name,
            "stopped": True
        }


@TaskRegistry.register(
    "app_clear",
    description="앱 데이터 초기화",
    version="1.0.0"
)
class AppClearTask(BaseTask):
    """앱 데이터 초기화 태스크"""
    
    async def execute(self, device) -> dict:
        """앱 데이터 초기화"""
        package_name = self.config.parameters.get("package_name")
        if not package_name:
            raise ValueError("package_name is required")
        
        device.app_clear(package_name)
        
        return {
            "package_name": package_name,
            "cleared": True
        }


@TaskRegistry.register(
    "app_install",
    description="앱 설치 (APK)",
    version="1.0.0"
)
class AppInstallTask(BaseTask):
    """앱 설치 태스크"""
    
    async def execute(self, device) -> dict:
        """APK 설치"""
        apk_path = self.config.parameters.get("apk_path")
        if not apk_path:
            raise ValueError("apk_path is required")
        
        device.app_install(apk_path)
        
        return {
            "apk_path": apk_path,
            "installed": True
        }

