/**
 * YouTube Videos API
 * 
 * AutoX.js용 영상 목록 API
 * - 오늘의 영상 조회
 * - 영상 상태 업데이트
 * - Youtube Farm 세션 보고
 * 
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/youtube/videos/today
 * 오늘 날짜의 영상 목록 조회
 * 
 * Query Parameters:
 * - date: YYYY-MM-DD (optional, 기본값: 오늘)
 * 
 * Response:
 * {
 *   success: true,
 *   date: "2026-01-02",
 *   videos: [
 *     {
 *       video_id: "uuid",
 *       no: 1,
 *       time: 15,
 *       keyword: "비트코인",
 *       subject: "...",
 *       url: "https://..."
 *     }
 *   ]
 * }
 */
router.get('/videos/today', async (req, res) => {
    const { logger, supabase } = req.context;
    const { date } = req.query;
    
    try {
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        logger.info('[YouTube Videos API] 오늘의 영상 조회', { date: targetDate });
        
        // Supabase에서 조회
        const { data, error } = await supabase
            .from('youtube_videos')
            .select('video_id, no, date, time, keyword, subject, url, status')
            .eq('date', targetDate)
            .eq('status', 'assigned')  // 할당된 영상만
            .order('time', { ascending: true })
            .order('no', { ascending: true });
        
        if (error) {
            logger.error('[YouTube Videos API] 조회 실패', { error: error.message });
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
        
        res.json({
            success: true,
            date: targetDate,
            count: data?.length || 0,
            videos: data || []
        });
        
    } catch (e) {
        logger.error('[YouTube Videos API] 예외', { error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

/**
 * POST /api/youtube/farm/report
 * Youtube Farm 세션 보고
 * 
 * Body:
 * {
 *   device_id: "PHONE_001",
 *   keyword: "일상 브이로그",
 *   videos_watched: 5,
 *   total_watch_time: 400,
 *   likes_given: 2,
 *   comments_written: 1,
 *   subscriptions: 1
 * }
 */
router.post('/farm/report', async (req, res) => {
    const { logger, supabase } = req.context;
    const sessionData = req.body;
    
    try {
        logger.info('[YouTube Farm API] 세션 보고', {
            device: sessionData.device_id,
            keyword: sessionData.keyword,
            videos: sessionData.videos_watched
        });
        
        // TODO: youtube_farm_sessions 테이블에 저장
        // 현재는 로그만 기록
        
        res.json({
            success: true,
            message: 'Session reported successfully'
        });
        
    } catch (e) {
        logger.error('[YouTube Farm API] 보고 실패', { error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

/**
 * GET /api/youtube/stats/:deviceId
 * 디바이스별 통계 조회
 */
router.get('/stats/:deviceId', async (req, res) => {
    const { logger, supabase } = req.context;
    const { deviceId } = req.params;
    
    try {
        // youtube_video_tasks에서 디바이스 통계 조회
        const { data, error } = await supabase
            .from('youtube_video_tasks')
            .select('*')
            .eq('device_serial', deviceId);
        
        if (error) throw error;
        
        const stats = {
            total_tasks: data.length,
            completed: data.filter(t => t.status === 'completed').length,
            pending: data.filter(t => t.status === 'pending').length,
            failed: data.filter(t => t.status === 'failed').length,
            total_likes: data.filter(t => t.liked).length,
            total_comments: data.filter(t => t.commented).length,
            total_subscriptions: data.filter(t => t.subscribed).length
        };
        
        res.json({
            success: true,
            device_id: deviceId,
            stats
        });
        
    } catch (e) {
        logger.error('[YouTube Stats API] 조회 실패', { error: e.message });
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

module.exports = router;
