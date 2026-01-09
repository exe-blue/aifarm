/**
 * Simple YouTube Automation
 * 단일 파일 - 제목 검색 후 30-70% 시청
 * 
 * @author Axon (Builder)
 * @version 1.0.0
 */

'nodejs';

// ==================== 영상 정보 (10개) ====================

const videos = [
    {
        title: "비트코인 급등 소식",
        keyword: "비트코인",
        url: "https://youtube.com/watch?v=example1"
    },
    {
        title: "이더리움 분석",
        keyword: "이더리움",
        url: "https://youtube.com/watch?v=example2"
    },
    {
        title: "리플 전망",
        keyword: "리플",
        url: "https://youtube.com/watch?v=example3"
    },
    {
        title: "일상 브이로그",
        keyword: "일상",
        url: "https://youtube.com/watch?v=example4"
    },
    {
        title: "요리 레시피",
        keyword: "요리",
        url: "https://youtube.com/watch?v=example5"
    },
    {
        title: "여행 영상",
        keyword: "여행",
        url: "https://youtube.com/watch?v=example6"
    },
    {
        title: "게임 플레이",
        keyword: "게임",
        url: "https://youtube.com/watch?v=example7"
    },
    {
        title: "음악 추천",
        keyword: "음악",
        url: "https://youtube.com/watch?v=example8"
    },
    {
        title: "운동 루틴",
        keyword: "운동",
        url: "https://youtube.com/watch?v=example9"
    },
    {
        title: "영화 리뷰",
        keyword: "영화",
        url: "https://youtube.com/watch?v=example10"
    }
];

// ==================== 로거 ====================
const Logger = require('./modules/logger.js');
const logger = Logger.createBootLogger({ deviceId: (device && device.serial) ? device.serial : 'SIMPLE', level: 'info' });

// ==================== YouTube 자동화 함수 ====================

/**
 * YouTube 앱 실행
 */
function launchYouTube() {
    logger.info('📱 YouTube 앱 실행...');
    
    try {
        app.launch('com.google.android.youtube');
        sleep(3000);
        
        if (currentPackage() === 'com.google.android.youtube') {
            logger.info('✅ YouTube 앱 실행 성공');
            return true;
        }
        
        logger.error('❌ YouTube 앱 실행 실패');
        return false;
    } catch (e) {
        logger.error('❌ YouTube 앱 실행 예외', { error: e.message });
        return false;
    }
}

/**
 * 제목으로 검색
 */
function searchByTitle(title) {
    logger.info('🔍 제목 검색', { title });
    
    try {
        // 검색 버튼 클릭
        const searchButton = id("search").findOne(5000);
        if (!searchButton) {
            logger.error('❌ 검색 버튼 없음');
            return false;
        }
        
        searchButton.click();
        sleep(1000);
        
        // 검색창에 제목 입력
        const searchBox = className("android.widget.EditText").findOne(3000);
        if (!searchBox) {
            logger.error('❌ 검색창 없음');
            return false;
        }
        
        searchBox.setText(title);
        sleep(1000);
        
        // 검색 실행 (엔터)
        KeyCode("KEYCODE_ENTER");
        sleep(3000);
        
        logger.info('✅ 검색 완료');
        return true;
        
    } catch (e) {
        logger.error('❌ 검색 실패', { error: e.message });
        return false;
    }
}

/**
 * 첫 번째 영상 선택
 */
function selectFirstVideo() {
    logger.info('🎯 첫 번째 영상 선택');
    
    try {
        // 검색 결과 첫 번째 썸네일 클릭
        const thumbnail = id("thumbnail").findOne(5000);
        if (!thumbnail) {
            logger.error('❌ 썸네일 없음');
            return false;
        }
        
        thumbnail.click();
        sleep(3000);
        
        logger.info('✅ 영상 선택 완료');
        return true;
        
    } catch (e) {
        logger.error('❌ 영상 선택 실패', { error: e.message });
        return false;
    }
}

/**
 * 영상 시청 (30-70%)
 */
function watchVideo(title) {
    logger.info('👀 영상 시청 시작', { title });
    
    try {
        // 재생 확인 (player 존재)
        const player = id("player_view").findOne(3000);
        if (!player) {
            logger.warn('플레이어 없음, 그래도 시청 시도');
        }
        
        // 30-70% 랜덤 시청 (예: 100초 영상 → 30-70초)
        const watchPercentage = Math.random() * 0.4 + 0.3;  // 0.3 ~ 0.7
        const baseDuration = 60;  // 기본 60초 가정
        const watchDuration = Math.floor(baseDuration * watchPercentage);
        
        logger.info('⏱️ 시청', { percent: Math.round(watchPercentage * 100), seconds: watchDuration });
        sleep(watchDuration * 1000);
        
        logger.info('✅ 시청 완료');
        return true;
        
    } catch (e) {
        logger.error('❌ 시청 실패', { error: e.message });
        return false;
    }
}

/**
 * YouTube 앱 닫기
 */
function closeYouTube() {
    logger.info('🔚 YouTube 앱 닫기');
    
    try {
        // 뒤로가기 버튼 (홈으로)
        back();
        sleep(1000);
        back();
        sleep(1000);
        
        // 앱 종료
        home();
        sleep(500);
        
        logger.info('✅ 앱 닫기 완료');
        return true;
        
    } catch (e) {
        logger.error('❌ 앱 닫기 실패', { error: e.message });
        return false;
    }
}

// ==================== 메인 실행 ====================

function main() {
    logger.info('╔════════════════════════════════════════════════════════╗');
    logger.info('║  Simple YouTube Automation                           ║');
    logger.info('║  제목 검색 → 30-70% 시청                              ║');
    logger.info('╚════════════════════════════════════════════════════════╝');
    
    logger.info('📋 영상 처리 시작', { total: videos.length });
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info('📹 영상 처리', { index: i + 1, total: videos.length, title: video.title });
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
            // 1. YouTube 앱 실행
            if (!launchYouTube()) {
                logger.error('❌ 영상 처리 실패: YouTube 앱 실행 불가');
                failCount++;
                continue;
            }
            
            // 2. 제목으로 검색
            if (!searchByTitle(video.title)) {
                logger.error('❌ 영상 처리 실패: 검색 불가');
                failCount++;
                closeYouTube();
                continue;
            }
            
            // 3. 첫 번째 영상 선택
            if (!selectFirstVideo()) {
                logger.error('❌ 영상 처리 실패: 선택 불가');
                failCount++;
                closeYouTube();
                continue;
            }
            
            // 4. 30-70% 시청
            if (!watchVideo(video.title)) {
                logger.error('❌ 영상 처리 실패: 시청 불가');
                failCount++;
                closeYouTube();
                continue;
            }
            
            // 5. 앱 닫기
            closeYouTube();
            
            successCount++;
            logger.info('✅ 영상 처리 완료', { index: i + 1 });
            
            // 6. 영상 간 간격 (5-10초)
            const intervalSec = Math.floor(Math.random() * 5) + 5;
            logger.info('⏰ 대기', { seconds: intervalSec });
            sleep(intervalSec * 1000);
            
        } catch (e) {
            logger.error('❌ 예상치 못한 에러', { error: e.message });
            failCount++;
            
            // 앱 강제 종료
            try {
                home();
                sleep(1000);
            } catch (cleanupError) {
                // 무시
            }
        }
    }
    
    // 최종 결과
    logger.info('╔════════════════════════════════════════════════════════╗');
    logger.info('║  처리 완료                                            ║');
    logger.info('╚════════════════════════════════════════════════════════╝');
    logger.info('✅ 성공', { count: successCount });
    logger.info('❌ 실패', { count: failCount });
    logger.info('📊 성공률', { percent: Number(((successCount / videos.length) * 100).toFixed(1)) });
}

// 실행
try {
    main();
} catch (e) {
    logger.error('❌ 치명적 에러', { error: e.message });
}
