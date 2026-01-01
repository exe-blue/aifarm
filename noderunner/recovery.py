"""
Recovery Manager
자동복구 관리

@author Axon (Builder)
@version 1.0.0 (P0)
"""


class RecoveryManager:
    """
    복구 관리자
    
    P0 자동복구:
    - RECOVER_LAIXI
    - RECOVER_ADB
    """
    
    def __init__(self, logger):
        self.logger = logger
        self.recovery_history = []
    
    def record_recovery(self, recovery_type: str, success: bool, error: str = None):
        """복구 기록"""
        self.recovery_history.append({
            'type': recovery_type,
            'success': success,
            'error': error,
            'timestamp': time.time()
        })
        
        # 최근 10개만 유지
        if len(self.recovery_history) > 10:
            self.recovery_history = self.recovery_history[-10:]
    
    def get_recovery_stats(self) -> dict:
        """복구 통계"""
        return {
            'total_recoveries': len(self.recovery_history),
            'recent': self.recovery_history[-5:]
        }
