/**
 * YouTube Farm Module
 * 검색어 기반 YouTube 시청 및 활동
 * 
 * Laixi "Youtube Farm" 기능 재현:
 * - 검색어로 비디오 검색
 * - 랜덤 비디오 선택 및 시청
 * - 검토 확률 (좋아요)
 * - 유사 확률 (구독 등)
 * - 댓글 작성
 * - 키워드 재생 시간
 * 
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

class YouTubeFarm {
    constructor(config, logger, humanPattern, youtubeAutomation) {
        this.config = config.youtube_farm || {
            min_play_time: 50,
            max_play_time: 80,
            like_probability: 0.1,    // 검토 확률 10%
            subscribe_probability: 0.1,  // 유사 확률 10%
            comment_enabled: true,
            video_interval_min: 5,
            video_interval_max: 10
        };
        this.logger = logger;
        this.human = humanPattern;
        this.youtube = youtubeAutomation;
        
        // 검색 키워드 풀 (다양성을 위해)
        this.keywordPool = [
            '일상 브이로그',
            '요리 레시피',
            '여행 영상',
            '게임 플레이',
            '음악 추천',
            '운동 루틴',
            '영화 리뷰',
            'ASMR',
            '반려동물',
            '뷰티 팁'
        ];
    }

    /**
     * Youtube Farm 세션 실행
     * 
     * @param {Object} options
     * @param {String} options.keyword - 검색 키워드 (선택, 없으면 랜덤)
     * @param {Number} options.duration - 활동 시간 (초, 선택)
     * @returns {Object} 세션 결과
     */
    runSession(options = {}) {
        const keyword = options.keyword || this._getRandomKeyword();
        const sessionDuration = options.duration || this._randomDuration();
        
        this.logger.info('🌾 Youtube Farm 세션 시작', {
            keyword,
            duration: `${sessionDuration}초`
        });
        
        const result = {
            keyword,
            videos_watched: 0,
            total_watch_time: 0,
            likes_given: 0,
            comments_written: 0,
            subscriptions: 0,
            started_at: new Date().toISOString()
        };
        
        const startTime = Date.now();
        const endTime = startTime + (sessionDuration * 1000);
        
        // YouTube 앱 실행
        if (!this.youtube.launchYouTube()) {
            this.logger.error('❌ YouTube 앱 실행 실패');
            return result;
        }
        
        // 세션 루프 (지정된 시간 동안)
        while (Date.now() < endTime) {
            try {
                // 1. 키워드 검색
                if (!this.youtube.searchByKeyword(keyword)) {
                    this.logger.warn('⚠️  검색 실패, 재시도');
                    sleep(3000);
                    continue;
                }
                
                // 2. 랜덤 비디오 선택 (1~5위 중)
                const rank = Math.floor(Math.random() * 5) + 1;
                if (!this.youtube.selectVideoByRank(rank)) {
                    this.logger.warn('⚠️  비디오 선택 실패');
                    sleep(3000);
                    continue;
                }
                
                // 3. 비디오 시청
                const watchTime = this._randomWatchTime();
                this.logger.info('👀 비디오 시청 시작', {
                    watchTime: `${watchTime}초`,
                    rank
                });
                
                sleep(watchTime * 1000);
                result.videos_watched++;
                result.total_watch_time += watchTime;
                
                // 4. 검토 (좋아요)
                if (Math.random() < this.config.like_probability) {
                    if (this.youtube.clickLike && this.youtube.clickLike()) {
                        result.likes_given++;
                        this.logger.info('👍 좋아요 클릭');
                    }
                }
                
                // 5. 댓글 (옵션)
                if (this.config.comment_enabled && Math.random() < 0.05) {
                    if (this.youtube.writeComment && this.youtube.writeComment()) {
                        result.comments_written++;
                        this.logger.info('💬 댓글 작성');
                    }
                }
                
                // 6. 유사 (구독)
                if (Math.random() < this.config.subscribe_probability) {
                    if (this.youtube.clickSubscribe && this.youtube.clickSubscribe()) {
                        result.subscriptions++;
                        this.logger.info('🔔 구독');
                    }
                }
                
                // 7. 다음 비디오까지 간격
                const interval = random(
                    this.config.video_interval_min,
                    this.config.video_interval_max
                );
                this.logger.info('⏰ 다음 비디오까지 대기', {
                    interval: `${interval}초`
                });
                sleep(interval * 1000);
                
                // 홈으로 돌아가기
                this.youtube.goHome();
                
            } catch (e) {
                this.logger.error('❌ Youtube Farm 세션 에러', {
                    error: e.message
                });
                sleep(5000);
            }
        }
        
        result.ended_at = new Date().toISOString();
        result.actual_duration = Math.floor((Date.now() - startTime) / 1000);
        
        this.logger.info('✅ Youtube Farm 세션 완료', {
            videos: result.videos_watched,
            watchTime: `${result.total_watch_time}초`,
            likes: result.likes_given,
            comments: result.comments_written,
            subscriptions: result.subscriptions
        });
        
        return result;
    }

    /**
     * 랜덤 키워드 선택
     */
    _getRandomKeyword() {
        return this.keywordPool[Math.floor(Math.random() * this.keywordPool.length)];
    }

    /**
     * 랜덤 시청 시간 (설정 범위 내)
     */
    _randomWatchTime() {
        return random(
            this.config.min_play_time,
            this.config.max_play_time
        );
    }

    /**
     * 랜덤 세션 시간 (30~60분)
     */
    _randomDuration() {
        return random(1800, 3600);  // 30분 ~ 60분 (초)
    }
}

module.exports = YouTubeFarm;
