/**
 * Scheduler Module
 * 예약 작업 스케줄러 (Laixi 예약 작업 재현)
 * 
 * 기능:
 * - 시간 기반 반복 실행 (시작시간 ~ 종료시간)
 * - 간격 설정 (분 단위)
 * - 횟수 제한
 * - 작업 큐 순환 (끝나면 처음부터)
 * 
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

class Scheduler {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.isRunning = false;
        this.currentSchedule = null;
    }

    /**
     * 예약 작업 실행
     * 
     * @param {Object} schedule - 스케줄 설정
     * @param {Number} schedule.startHour - 시작 시간 (0~23)
     * @param {Number} schedule.startMinute - 시작 분 (0~59)
     * @param {Number} schedule.endHour - 종료 시간 (0~23)
     * @param {Number} schedule.endMinute - 종료 분 (0~59)
     * @param {Number} schedule.intervalMinutes - 간격 (분)
     * @param {Number} schedule.maxCount - 최대 실행 횟수 (0 = 무제한)
     * @param {Function} schedule.task - 실행할 작업 함수
     */
    runSchedule(schedule) {
        this.currentSchedule = schedule;
        this.isRunning = true;
        
        const {
            startHour,
            startMinute,
            endHour,
            endMinute,
            intervalMinutes,
            maxCount,
            task
        } = schedule;
        
        this.logger.info('📅 예약 작업 시작', {
            start: `${startHour}:${startMinute}`,
            end: `${endHour}:${endMinute}`,
            interval: `${intervalMinutes}분`,
            maxCount: maxCount || '무제한'
        });
        
        let executionCount = 0;
        
        while (this.isRunning) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // 시간 범위 체크
            const isInTimeRange = this._isInTimeRange(
                currentHour, currentMinute,
                startHour, startMinute,
                endHour, endMinute
            );
            
            if (isInTimeRange) {
                // 작업 실행
                try {
                    this.logger.info('🎬 작업 실행 시작', {
                        execution: executionCount + 1,
                        time: `${currentHour}:${currentMinute}`
                    });
                    
                    task();
                    executionCount++;
                    
                    this.logger.info('✅ 작업 실행 완료', {
                        execution: executionCount
                    });
                    
                    // 최대 횟수 체크
                    if (maxCount > 0 && executionCount >= maxCount) {
                        this.logger.info('🏁 최대 실행 횟수 도달', {
                            count: executionCount
                        });
                        break;
                    }
                    
                    // 간격 대기
                    if (intervalMinutes > 0) {
                        const waitMs = intervalMinutes * 60 * 1000;
                        this.logger.info('⏰ 다음 실행 대기', {
                            intervalMinutes,
                            nextTime: new Date(Date.now() + waitMs).toLocaleTimeString()
                        });
                        sleep(waitMs);
                    }
                    
                } catch (e) {
                    this.logger.error('❌ 작업 실행 실패', {
                        error: e.message,
                        execution: executionCount
                    });
                    
                    // 에러 시 1분 대기 후 재시도
                    sleep(60000);
                }
            } else {
                // 시간 범위 밖이면 다음 시작 시간까지 대기
                const waitMinutes = this._calculateWaitTime(
                    currentHour, currentMinute,
                    startHour, startMinute
                );
                
                this.logger.info('⏸️  시간 범위 밖, 대기 중', {
                    currentTime: `${currentHour}:${currentMinute}`,
                    startTime: `${startHour}:${startMinute}`,
                    waitMinutes
                });
                
                // 최대 30분씩 체크 (종료 명령 대응)
                const checkInterval = Math.min(waitMinutes, 30);
                sleep(checkInterval * 60 * 1000);
            }
            
            // 종료 조건 체크
            if (!this.isRunning) {
                this.logger.info('🛑 예약 작업 중지됨');
                break;
            }
        }
        
        this.logger.info('🏁 예약 작업 종료', {
            totalExecutions: executionCount
        });
    }

    /**
     * 시간 범위 내에 있는지 체크
     */
    _isInTimeRange(currentH, currentM, startH, startM, endH, endM) {
        const current = currentH * 60 + currentM;
        const start = startH * 60 + startM;
        const end = endH * 60 + endM;
        
        // 자정을 넘어가는 경우 처리
        if (end < start) {
            // 예: 23:00 ~ 01:00
            return current >= start || current <= end;
        } else {
            // 일반적인 경우
            return current >= start && current <= end;
        }
    }

    /**
     * 다음 시작 시간까지 대기 시간 계산 (분 단위)
     */
    _calculateWaitTime(currentH, currentM, startH, startM) {
        const current = currentH * 60 + currentM;
        const start = startH * 60 + startM;
        
        if (current < start) {
            // 오늘 시작 시간까지
            return start - current;
        } else {
            // 내일 시작 시간까지
            return (24 * 60 - current) + start;
        }
    }

    /**
     * 예약 작업 중지
     */
    stop() {
        this.logger.info('🛑 예약 작업 중지 요청');
        this.isRunning = false;
    }

    /**
     * 현재 실행 중인지 여부
     */
    isActive() {
        return this.isRunning;
    }
}

module.exports = Scheduler;
