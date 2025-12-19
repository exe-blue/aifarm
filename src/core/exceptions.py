"""AIFarm 커스텀 예외 클래스"""


class AIFarmException(Exception):
    """AIFarm 기본 예외"""
    pass


class DeviceConnectionError(AIFarmException):
    """디바이스 연결 실패"""
    pass


class DeviceNotFoundError(AIFarmException):
    """디바이스를 찾을 수 없음"""
    pass


class TaskExecutionError(AIFarmException):
    """태스크 실행 실패"""
    pass


class TaskNotFoundError(AIFarmException):
    """태스크를 찾을 수 없음"""
    pass


class ConfigurationError(AIFarmException):
    """설정 오류"""
    pass


class DataLoadError(AIFarmException):
    """데이터 로드 실패"""
    pass


class AuthenticationError(AIFarmException):
    """인증 실패"""
    pass

