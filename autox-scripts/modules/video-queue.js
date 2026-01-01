/**
 * Video Queue Module
 * 영상 큐 관리 (순환 재생)
 * 
 * 기능:
 * - 오늘의 영상 목록 가져오기
 * - 순환 재생 (끝나면 처음부터)
 * - 완료 상태 추적
 * 
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

class VideoQueue {
    constructor(config, logger, api) {
        this.config = config;
        this.logger = logger;
        this.api = api;
        
        this.todayVideos = [];  // 오늘의 영상 목록
        this.currentIndex = 0;   // 현재 인덱스
        this.completedCount = 0; // 완료 횟수
        this.cycleCount = 0;     // 순환 횟수
    }

    /**
     * 오늘의 영상 목록 로드
     */
    loadTodayVideos() {
        this.logger.info('📋 오늘의 영상 목록 로드 중...');
        
        try {
            // API에서 오늘 날짜의 영상 가져오기
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            // Supabase에서 조회
            const videos = this.api.getTodayVideos(dateStr);
            
            if (videos && videos.length > 0) {
                this.todayVideos = videos;
                this.currentIndex = 0;
                this.logger.info('✅ 영상 목록 로드 완료', {
                    count: videos.length,
                    date: dateStr
                });
                return true;
            } else {
                this.logger.warn('⚠️  오늘 등록된 영상이 없습니다', {
                    date: dateStr
                });
                return false;
            }
        } catch (e) {
            this.logger.error('❌ 영상 목록 로드 실패', {
                error: e.message
            });
            return false;
        }
    }

    /**
     * 다음 영상 가져오기 (순환)
     */
    getNextVideo() {
        // 영상 목록이 비어있으면 재로드
        if (this.todayVideos.length === 0) {
            if (!this.loadTodayVideos()) {
                return null;
            }
        }
        
        // 현재 영상 가져오기
        const video = this.todayVideos[this.currentIndex];
        
        this.logger.info('▶️  다음 영상', {
            index: this.currentIndex + 1,
            total: this.todayVideos.length,
            cycle: this.cycleCount + 1,
            subject: video.subject
        });
        
        // 인덱스 증가 (순환)
        this.currentIndex++;
        if (this.currentIndex >= this.todayVideos.length) {
            this.currentIndex = 0;
            this.cycleCount++;
            this.logger.info('🔄 영상 목록 순환', {
                cycle: this.cycleCount,
                message: '처음부터 다시 시작'
            });
        }
        
        return video;
    }

    /**
     * 영상 완료 처리
     */
    markCompleted(video, result) {
        this.completedCount++;
        this.logger.info('✅ 영상 시청 완료', {
            no: video.no,
            subject: video.subject,
            totalCompleted: this.completedCount
        });
    }

    /**
     * 통계 조회
     */
    getStats() {
        return {
            totalVideos: this.todayVideos.length,
            currentIndex: this.currentIndex,
            completedCount: this.completedCount,
            cycleCount: this.cycleCount
        };
    }

    /**
     * 초기화 (날짜 변경 시)
     */
    reset() {
        this.logger.info('🔄 영상 큐 초기화');
        this.todayVideos = [];
        this.currentIndex = 0;
        this.completedCount = 0;
        this.cycleCount = 0;
    }
}

module.exports = VideoQueue;
