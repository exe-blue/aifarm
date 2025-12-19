"""Built-in task modules"""

# 내장 태스크 자동 로드
from src.modules.tasks.youtube_task import YouTubeWatchTask
from src.modules.tasks.app_task import AppStartTask, AppStopTask
from src.modules.tasks.screen_task import ScreenOnTask, ScreenshotTask

__all__ = [
    'YouTubeWatchTask',
    'AppStartTask',
    'AppStopTask',
    'ScreenOnTask',
    'ScreenshotTask'
]

