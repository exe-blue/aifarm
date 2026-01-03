/**
 * Command Fetcher
 * Supabase에서 지시 영상 가져오기
 * 
 * 기능:
 * - youtube_videos 테이블 조회
 * - 공개 시간(time) 체크
 * - 미실행 영상 반환
 * 
 * @author Axon (Builder)
 */

class CommandFetcher {
    constructor(config, logger, api) {
        this.config = config;
        this.logger = logger;
        this.api = api;
        
        this.lastCheckTime = Date.now();
        this.executedVideoIds = new Set();  // 실행한 영상 ID
    }

    /**
     * 대기 중인 지시 영상 가져오기
     * 
     * 로직:
     * 1. 현재 시간 체크
     * 2. youtube_videos에서 조회
     *    - WHERE date = today
     *    - WHERE time <= current_hour
     *    - WHERE status = 'assigned'
     * 3. 미실행 영상 반환
     */
    async fetchPendingCommands() {
        try {
            const now = new Date();
            const currentHour = now.getHours();
            const today = now.toISOString().split('T')[0];  // YYYY-MM-DD
            
            this.logger.info('📋 지시 영상 조회', {
                date: today,
                hour: currentHour
            });
            
            // API 호출 (Supabase)
            const videos = await this.api.getTodayVideos({
                date: today,
                maxHour: currentHour,
                status: 'assigned'
            });
            
            if (!videos || videos.length === 0) {
                this.logger.debug('📭 대기 중인 지시 없음');
                return [];
            }
            
            // 미실행 영상 필터링
            const pendingVideos = videos.filter(video => 
                !this.executedVideoIds.has(video.video_id)
            );
            
            this.logger.info('✅ 지시 영상 발견', {
                total: videos.length,
                pending: pendingVideos.length
            });
            
            return pendingVideos;
            
        } catch (e) {
            this.logger.error('❌ 지시 조회 실패', { error: e.message });
            return [];
        }
    }

    /**
     * 지시 실행 완료 표시
     */
    markExecuted(videoId) {
        this.executedVideoIds.add(videoId);
        this.logger.debug('✓ 영상 실행 완료 마킹', { videoId });
    }

    /**
     * 실행 기록 초기화 (자정)
     */
    resetDailyExecutions() {
        this.executedVideoIds.clear();
        this.logger.info('🔄 일일 실행 기록 초기화');
    }

    /**
     * 주기적 체크 (60초마다)
     */
    startPeriodicCheck(callback) {
        this.logger.info('⏰ 주기적 체크 시작 (60초 간격)');
        
        const interval = setInterval(async () => {
            const commands = await this.fetchPendingCommands();
            
            if (commands.length > 0) {
                callback(commands);
            }
        }, 60000);  // 60초
        
        // 자정 체크 (일일 초기화)
        const midnightCheck = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                this.resetDailyExecutions();
            }
        }, 60000);
        
        return () => {
            clearInterval(interval);
            clearInterval(midnightCheck);
        };
    }
}

module.exports = CommandFetcher;
