/**
 * Sleep Pattern Module
 * 일상 패턴 시뮬레이션 (활동/휴식 비율)
 * 
 * 목적:
 * - 사람처럼 자연스러운 활동 패턴
 * - 활동 시간에 비례한 휴식
 * - 과도한 활동 방지
 * 
 * 패턴:
 * - 활동 10분 → 휴식 5분
 * - 활동 30분 → 휴식 15분
 * - 활동 60분 → 휴식 30분
 * 
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

class SleepPattern {
    constructor(config, logger) {
        this.config = config.sleep_pattern || {
            ratio: 0.5,              // 활동:휴식 = 1:0.5 (활동 10분 = 휴식 5분)
            min_sleep_minutes: 3,    // 최소 휴식 시간 (분)
            max_sleep_minutes: 30,   // 최대 휴식 시간 (분)
            random_variance: 0.2     // 랜덤 변동 ±20%
        };
        this.logger = logger;
        
        this.totalActivityTime = 0;  // 총 활동 시간 (초)
        this.totalSleepTime = 0;     // 총 휴식 시간 (초)
        this.lastSleepTime = Date.now();
    }

    /**
     * 활동 시간 기록
     * 
     * @param {Number} activitySeconds - 활동 시간 (초)
     */
    recordActivity(activitySeconds) {
        this.totalActivityTime += activitySeconds;
        this.logger.debug('📊 활동 시간 기록', {
            activity: `${activitySeconds}초`,
            total: `${Math.floor(this.totalActivityTime / 60)}분`
        });
    }

    /**
     * 필요한 휴식 시간 계산
     * 
     * @param {Number} activitySeconds - 활동한 시간 (초)
     * @returns {Number} 휴식 시간 (초)
     */
    calculateSleepTime(activitySeconds) {
        // 기본 계산: 활동 시간 × 비율
        let sleepSeconds = Math.floor(activitySeconds * this.config.ratio);
        
        // 랜덤 변동 (±20%)
        const variance = sleepSeconds * this.config.random_variance;
        sleepSeconds += random(-variance, variance);
        
        // 최소/최대 제한
        const minSeconds = this.config.min_sleep_minutes * 60;
        const maxSeconds = this.config.max_sleep_minutes * 60;
        sleepSeconds = Math.max(minSeconds, Math.min(maxSeconds, sleepSeconds));
        
        return Math.floor(sleepSeconds);
    }

    /**
     * 휴식 실행 (Sleep)
     * 
     * @param {Number} activitySeconds - 활동한 시간 (초)
     */
    executeSleep(activitySeconds) {
        const sleepSeconds = this.calculateSleepTime(activitySeconds);
        const sleepMinutes = Math.floor(sleepSeconds / 60);
        const sleepSecondsRemainder = sleepSeconds % 60;
        
        this.logger.info('😴 휴식 시작', {
            activity: `${Math.floor(activitySeconds / 60)}분 ${activitySeconds % 60}초`,
            sleep: `${sleepMinutes}분 ${sleepSecondsRemainder}초`,
            ratio: `1:${this.config.ratio}`
        });
        
        // 휴식 중 상태 표시 (백그라운드)
        const sleepIntervals = Math.floor(sleepSeconds / 60);  // 1분마다 로그
        for (let i = 0; i < sleepIntervals; i++) {
            sleep(60000);
            this.logger.debug('😴 휴식 중...', {
                elapsed: `${i + 1}분`,
                remaining: `${sleepIntervals - i - 1}분`
            });
        }
        
        // 남은 초 처리
        const remainingMs = (sleepSeconds % 60) * 1000;
        if (remainingMs > 0) {
            sleep(remainingMs);
        }
        
        this.totalSleepTime += sleepSeconds;
        this.lastSleepTime = Date.now();
        
        this.logger.info('✅ 휴식 완료', {
            slept: `${sleepMinutes}분 ${sleepSecondsRemainder}초`,
            totalSleep: `${Math.floor(this.totalSleepTime / 60)}분`
        });
    }

    /**
     * 통계 조회
     */
    getStats() {
        return {
            totalActivityMinutes: Math.floor(this.totalActivityTime / 60),
            totalSleepMinutes: Math.floor(this.totalSleepTime / 60),
            ratio: (this.totalSleepTime / this.totalActivityTime).toFixed(2),
            lastSleepTime: new Date(this.lastSleepTime).toLocaleTimeString()
        };
    }

    /**
     * 일일 초기화
     */
    reset() {
        this.logger.info('🔄 Sleep 패턴 초기화');
        this.totalActivityTime = 0;
        this.totalSleepTime = 0;
        this.lastSleepTime = Date.now();
    }
}

module.exports = SleepPattern;
