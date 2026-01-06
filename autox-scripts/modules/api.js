/**
 * API Module
 * Backend API 통신 관리
 */

class API {
    constructor(config, logger) {
        // config undefined 방어 처리
        this.baseUrl = `${config?.server?.protocol || 'http'}://${config?.server?.host || 'localhost'}:${config?.server?.port || 3000}`;
        this.deviceId = config?.device?.id || device?.serial || 'unknown-device';
        this.timeout = config?.settings?.timeout || 30000;
        this.logger = logger;
    }

    /**
     * 다음 작업 요청
     * GET /api/tasks/next?device_id=xxx
     */
    getNextTask() {
        try {
            this.logger.info('작업 요청 중...');

            const url = `${this.baseUrl}/api/tasks/next?device_id=${this.deviceId}`;
            const response = http.get(url, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.statusCode === 200) {
                const data = response.body.json();

                if (data.success && data.task) {
                    this.logger.info('작업 수신 성공', {
                        task_id: data.task.task_id,
                        title: data.task.title
                    });
                    return data.task;
                } else {
                    this.logger.debug('대기 중인 작업 없음');
                    return null;
                }
            } else {
                this.logger.error('작업 요청 실패', {
                    status: response.statusCode,
                    body: response.body.string()
                });
                return null;
            }
        } catch (e) {
            this.logger.error('API 호출 예외', {
                error: e.message,
                stack: e.stack
            });
            return null;
        }
    }

    /**
     * 작업 완료 보고
     * POST /api/tasks/{task_id}/complete
     */
    completeTask(taskId, result) {
        try {
            this.logger.info('작업 완료 보고 중...', { task_id: taskId });

            const url = `${this.baseUrl}/api/tasks/${taskId}/complete`;
            const payload = {
                device_id: this.deviceId,
                success: result.success,
                watch_duration: result.watch_duration || 0,
                search_type: result.search_type || null,
                search_rank: result.search_rank || null,
                liked: result.liked || false,
                commented: result.commented || false,
                subscribed: result.subscribed || false,
                notification_set: result.notification_set || false,
                shared: result.shared || false,
                added_to_playlist: result.added_to_playlist || false,
                error_message: result.error_message || null
            };

            const response = http.postJson(url, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.statusCode === 200) {
                this.logger.info('완료 보고 성공', { task_id: taskId });
                return true;
            } else {
                this.logger.error('완료 보고 실패', {
                    task_id: taskId,
                    status: response.statusCode,
                    body: response.body.string()
                });
                return false;
            }
        } catch (e) {
            this.logger.error('완료 보고 예외', {
                task_id: taskId,
                error: e.message
            });
            return false;
        }
    }

    /**
     * 헬스 체크
     * GET /health
     */
    healthCheck() {
        try {
            const url = `${this.baseUrl}/health`;
            const response = http.get(url, { timeout: 5000 });

            if (response.statusCode === 200) {
                this.logger.info('서버 연결 정상');
                return true;
            } else {
                this.logger.warn('서버 응답 이상', { status: response.statusCode });
                return false;
            }
        } catch (e) {
            this.logger.error('서버 연결 실패', { error: e.message });
            return false;
        }
    }

    /**
     * 오늘의 영상 목록 가져오기
     * GET /api/youtube/videos/today?date=YYYY-MM-DD
     */
    getTodayVideos(dateStr) {
        try {
            this.logger.info('오늘의 영상 조회 중...', { date: dateStr });

            const url = `${this.baseUrl}/api/youtube/videos/today?date=${dateStr}`;
            const response = http.get(url, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.statusCode === 200) {
                const data = response.body.json();
                
                if (data.success && data.videos) {
                    this.logger.info('영상 목록 조회 성공', {
                        count: data.videos.length
                    });
                    return data.videos;
                } else {
                    this.logger.warn('오늘 등록된 영상 없음');
                    return [];
                }
            } else {
                this.logger.error('영상 조회 실패', {
                    status: response.statusCode
                });
                return [];
            }
        } catch (e) {
            this.logger.error('영상 조회 예외', {
                error: e.message
            });
            return [];
        }
    }

    /**
     * 작업 결과 보고 (Youtube Farm 결과)
     * POST /api/youtube/farm/report
     */
    reportFarmSession(deviceId, sessionResult) {
        try {
            this.logger.info('Youtube Farm 세션 보고 중...');

            const url = `${this.baseUrl}/api/youtube/farm/report`;
            const payload = {
                device_id: deviceId,
                ...sessionResult
            };

            const response = http.post(url, JSON.stringify(payload), {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.statusCode === 200) {
                this.logger.info('세션 보고 성공');
                return true;
            } else {
                this.logger.error('세션 보고 실패', {
                    status: response.statusCode
                });
                return false;
            }
        } catch (e) {
            this.logger.error('세션 보고 예외', {
                error: e.message
            });
            return false;
        }
    }
}

module.exports = API;
