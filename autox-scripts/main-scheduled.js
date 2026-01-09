/**
 * DoAi.Me AutoX.js Main Script (Scheduled Version)
 *
 * Physical Link Layer + 예약 작업 시스템
 * 
 * 기능:
 * 1. 예약 작업 (시간 범위, 간격, 횟수 설정)
 * 2. 영상 순환 재생 (끝나면 처음부터)
 * 3. Youtube Farm 통합 (검색어 기반 시청)
 * 4. Sleep 패턴 (활동 시간 비례 휴식)
 * 5. Gateway Receiver (ADB Broadcast 수신)
 *
 * 워크플로우:
 * 1. 오늘의 영상 목록 로드
 * 2. 예약된 시간에 영상 시청 (순환)
 * 3. Youtube Farm 세션 실행 (활동 다양화)
 * 4. Sleep 패턴으로 휴식 (자연스러운 패턴)
 * 5. 반복
 *
 * @author Axon (Tech Lead)
 * @version 3.0.0 (Scheduled Tasks)
 */

// ==================== 모듈 임포트 ====================
const Logger = require('./modules/logger.js');
const API = require('./modules/api.js');
const HumanPattern = require('./modules/human.js');
const YouTubeAutomation = require('./modules/youtube.js');
const Receiver = require('./modules/receiver.js');
const Scheduler = require('./modules/scheduler.js');
const VideoQueue = require('./modules/video-queue.js');
const YouTubeFarm = require('./modules/youtube-farm.js');
const SleepPattern = require('./modules/sleep-pattern.js');

// ==================== 설정 로드 ====================
const ENV = 'dev'; // 'dev' 또는 'prod'
let config;

try {
    config = JSON.parse(files.read(`./config/${ENV}.json`));
} catch (e) {
    console.error('설정 파일 로드 실패:', e.message);
    config = {
        device: { id: device.serial || 'unknown' },
        server: { host: '127.0.0.1', port: 3100, protocol: 'http' },
        settings: { polling_interval: 30000, log_level: 'info' },
        youtube: { min_watch_time: 30, max_watch_time: 180 },
        youtube_farm: { min_play_time: 50, max_play_time: 80 },
        sleep_pattern: { ratio: 0.5, min_sleep_minutes: 3, max_sleep_minutes: 30 },
        schedule: {
            enabled: true,
            startHour: 9,
            startMinute: 0,
            endHour: 23,
            endMinute: 59,
            intervalMinutes: 10,  // 10분 간격
            maxCount: 0,          // 무제한
            youtube_farm_probability: 0.3  // 30% 확률로 Youtube Farm 실행
        }
    };
}

// ==================== 모듈 초기화 ====================
const logger = new Logger(config);
const api = new API(config, logger);
const human = new HumanPattern(config, logger);
const youtube = new YouTubeAutomation(config, logger, human);
const receiver = new Receiver(config, logger, youtube);
const scheduler = new Scheduler(config, logger);
const videoQueue = new VideoQueue(config, logger, api);
const youtubeFarm = new YouTubeFarm(config, logger, human, youtube);
const sleepPattern = new SleepPattern(config, logger);

// ==================== 전역 변수 ====================
let isRunning = true;
let isPaused = false;
let lastDateCheck = null;

// ==================== Receiver 콜백 등록 ====================

receiver.onCommand((type, payload) => {
    logger.info('📨 [CALLBACK] 명령 수신', { type, payload });

    switch (type) {
        case 'POP':
            isPaused = true;
            logger.info('[POP] 예약 작업 일시 정지');
            setTimeout(() => { 
                isPaused = false;
                logger.info('[POP] 예약 작업 재개');
            }, 300000);
            break;

        case 'ACCIDENT':
            isPaused = true;
            logger.warn('[ACCIDENT] 예약 작업 일시 정지 (긴급)');
            setTimeout(() => { 
                isPaused = false;
                logger.info('[ACCIDENT] 예약 작업 재개');
            }, 120000);
            break;

        case 'STOP':
            logger.warn('[STOP] 예약 작업 중지');
            scheduler.stop();
            isRunning = false;
            break;
    }
});

// ==================== 메인 작업 함수 ====================

/**
 * 메인 작업 실행 (예약 작업 콜백)
 */
function executeMainTask() {
    if (isPaused) {
        logger.info('⏸️  작업 일시 정지 중 (POP/ACCIDENT 처리 중)');
        return;
    }
    
    // 날짜 변경 체크 (자정 넘어가면 영상 목록 리셋)
    const currentDate = new Date().toDateString();
    if (lastDateCheck !== currentDate) {
        logger.info('📅 날짜 변경 감지, 영상 큐 초기화', {
            oldDate: lastDateCheck,
            newDate: currentDate
        });
        videoQueue.reset();
        sleepPattern.reset();
        lastDateCheck = currentDate;
    }
    
    // Youtube Farm 확률 체크 (30%)
    const useYoutubeFarm = Math.random() < (config.schedule?.youtube_farm_probability || 0.3);
    
    if (useYoutubeFarm) {
        // ==================== Youtube Farm 세션 ====================
        logger.info('🌾 Youtube Farm 세션 선택');
        
        const farmStartTime = Date.now();
        const farmResult = youtubeFarm.runSession({
            duration: random(600, 1800)  // 10~30분
        });
        const farmDuration = Math.floor((Date.now() - farmStartTime) / 1000);
        
        // 활동 시간 기록
        sleepPattern.recordActivity(farmDuration);
        
        // 결과 보고
        api.reportFarmSession(config.device.id, farmResult);
        
        // 휴식 (활동 시간에 비례)
        sleepPattern.executeSleep(farmDuration);
        
    } else {
        // ==================== 오늘의 영상 시청 ====================
        logger.info('📺 오늘의 영상 시청 선택');
        
        // 다음 영상 가져오기 (순환)
        const video = videoQueue.getNextVideo();
        
        if (!video) {
            logger.warn('⚠️  시청할 영상이 없습니다. Youtube Farm으로 전환');
            
            // 영상 없으면 Youtube Farm 실행
            const farmDuration = Math.floor((Date.now() - Date.now()) / 1000);
            const farmResult = youtubeFarm.runSession({ duration: 600 });
            sleepPattern.recordActivity(600);
            sleepPattern.executeSleep(600);
            return;
        }
        
        // 영상 시청 작업 수행
        const taskStartTime = Date.now();
        const taskResult = performVideoTask(video);
        const taskDuration = Math.floor((Date.now() - taskStartTime) / 1000);
        
        // 완료 처리
        if (taskResult.success) {
            videoQueue.markCompleted(video, taskResult);
        }
        
        // 활동 시간 기록
        sleepPattern.recordActivity(taskDuration);
        
        // 휴식 (활동 시간에 비례)
        sleepPattern.executeSleep(taskDuration);
    }
    
    // 통계 로그
    const queueStats = videoQueue.getStats();
    const sleepStats = sleepPattern.getStats();
    
    logger.info('📊 세션 통계', {
        queue: queueStats,
        sleep: sleepStats
    });
}

/**
 * 영상 시청 작업 수행
 */
function performVideoTask(video) {
    const result = {
        success: false,
        watch_duration: 0,
        liked: false,
        commented: false,
        subscribed: false,
        error_message: null
    };

    try {
        // 1. YouTube 앱 실행
        if (!youtube.launchYouTube()) {
            result.error_message = 'YouTube 앱 실행 실패';
            return result;
        }

        sleep(2000);

        // 2. 영상 열기
        if (video.url) {
            // URL 직접 열기
            if (!youtube.openByUrl(video.url)) {
                result.error_message = 'URL 열기 실패';
                return result;
            }
        } else if (video.keyword) {
            // 키워드 검색
            if (!youtube.searchByKeyword(video.keyword)) {
                result.error_message = '검색 실패';
                return result;
            }
            
            if (!youtube.selectVideoByRank(1)) {
                result.error_message = '영상 선택 실패';
                return result;
            }
        } else {
            result.error_message = 'URL 또는 keyword 없음';
            return result;
        }

        sleep(3000);

        // 3. 영상 시청
        const watchTime = youtube.watchVideo ? youtube.watchVideo(video) : 60;
        result.watch_duration = watchTime;

        // 4. 인터랙션 (확률적)
        if (youtube.clickLike && Math.random() < (config.youtube?.like_probability || 0.3)) {
            result.liked = youtube.clickLike();
        }

        if (youtube.writeComment && Math.random() < (config.youtube?.comment_probability || 0.1)) {
            result.commented = youtube.writeComment();
        }

        if (youtube.clickSubscribe && Math.random() < (config.youtube?.subscribe_probability || 0.05)) {
            result.subscribed = youtube.clickSubscribe();
        }

        result.success = true;
        logger.info('✅ 영상 시청 완료', {
            no: video.no,
            subject: video.subject,
            watchTime: result.watch_duration
        });

    } catch (e) {
        logger.error('❌ 영상 시청 실패', {
            error: e.message
        });
        result.error_message = e.message;
    } finally {
        // YouTube 앱 종료
        if (youtube.closeYouTube) {
            youtube.closeYouTube();
        }
    }

    return result;
}

// ==================== 메인 실행 ====================

function main() {
    logger.info('╔══════════════════════════════════════════════════════════╗');
    logger.info('║  DoAi.Me AutoX.js (Scheduled Version)                   ║');
    logger.info('║  Physical Link Layer + 예약 작업 시스템                  ║');
    logger.info('╚══════════════════════════════════════════════════════════╝');
    logger.info('📱 Device ID:', config.device.id);
    logger.info('🌐 Gateway:', `${config.server.protocol}://${config.server.host}:${config.server.port}`);
    
    // Receiver 시작
    receiver.startListening();
    
    // 오늘의 영상 목록 로드
    lastDateCheck = new Date().toDateString();
    videoQueue.loadTodayVideos();
    
    // 예약 작업 설정
    const scheduleConfig = config.schedule || {
        enabled: true,
        startHour: 9,
        startMinute: 0,
        endHour: 23,
        endMinute: 59,
        intervalMinutes: 10,
        maxCount: 0,
        youtube_farm_probability: 0.3
    };
    
    if (scheduleConfig.enabled) {
        logger.info('📅 예약 작업 모드', {
            time: `${scheduleConfig.startHour}:${String(scheduleConfig.startMinute).padStart(2, '0')} ~ ${scheduleConfig.endHour}:${String(scheduleConfig.endMinute).padStart(2, '0')}`,
            interval: `${scheduleConfig.intervalMinutes}분`,
            maxCount: scheduleConfig.maxCount || '무제한',
            youtubeFarm: `${(scheduleConfig.youtube_farm_probability * 100).toFixed(0)}% 확률`
        });
        
        // 예약 작업 실행
        scheduler.runSchedule({
            startHour: scheduleConfig.startHour,
            startMinute: scheduleConfig.startMinute,
            endHour: scheduleConfig.endHour,
            endMinute: scheduleConfig.endMinute,
            intervalMinutes: scheduleConfig.intervalMinutes,
            maxCount: scheduleConfig.maxCount,
            task: executeMainTask
        });
    } else {
        // 예약 작업 비활성화 시 기존 방식 (무한 루프)
        logger.info('♾️  무한 루프 모드 (예약 작업 비활성화)');
        
        while (isRunning) {
            if (!isPaused) {
                executeMainTask();
            }
            
            // 간격 대기
            sleep((config.settings?.polling_interval || 30000));
        }
    }
    
    logger.info('🏁 AutoX.js 종료');
}

// 실행
try {
    main();
} catch (e) {
    logger.error('❌ 치명적 에러', {
        error: e.message,
        stack: e.stack
    });
}
