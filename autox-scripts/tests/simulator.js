/**
 * AutoX.js Simulator
 * 로컬 PC에서 AutoX.js 스크립트 로직 테스트
 *
 * 실제 폰 없이 API 호출 및 플로우 검증
 */

const http = require('http');
const https = require('https');
const Logger = require('../modules/logger.js');

const logger = Logger.createBootLogger({ deviceId: 'SIMULATOR_001', level: 'debug' });

// ==================== 설정 ====================
const CONFIG = {
  server: {
    host: 'localhost',
    port: 8000,
    protocol: 'http'
  },
  device: {
    id: 'SIMULATOR_001',
    model: 'Simulator',
    pc_id: 'LOCAL'
  }
};

const BASE_URL = `${CONFIG.server.protocol}://${CONFIG.server.host}:${CONFIG.server.port}`;

// ==================== HTTP 클라이언트 ====================
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const client = CONFIG.server.protocol === 'https' ? https : http;

    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = client.request(url, options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            data: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// ==================== API 함수 ====================

async function healthCheck() {
  logger.info('헬스 체크 중...');
  try {
    const res = await makeRequest('GET', '/health');
    if (res.statusCode === 200) {
      logger.info('서버 연결 정상', { data: res.data });
      return true;
    } else {
      logger.warn('서버 응답 이상', { statusCode: res.statusCode });
      return false;
    }
  } catch (e) {
    logger.error('서버 연결 실패', { error: e.message });
    return false;
  }
}

async function getNextTask() {
  logger.info('작업 요청 중...');
  try {
    const res = await makeRequest('GET', `/api/tasks/next?device_id=${CONFIG.device.id}`);

    if (res.statusCode === 200 && res.data.success && res.data.task) {
      logger.info('작업 수신', {
        task_id: res.data.task.task_id,
        title: res.data.task.title,
        keyword: res.data.task.keyword
      });
      return res.data.task;
    } else {
      logger.info('대기 중인 작업 없음');
      return null;
    }
  } catch (e) {
    logger.error('작업 요청 실패', { error: e.message });
    return null;
  }
}

async function completeTask(taskId, result) {
  logger.info('작업 완료 보고 중...', { task_id: taskId });
  try {
    const res = await makeRequest('POST', `/api/tasks/${taskId}/complete`, {
      device_id: CONFIG.device.id,
      success: result.success,
      watch_duration: result.watch_duration,
      search_type: result.search_type,
      search_rank: result.search_rank,
      liked: result.liked,
      commented: result.commented,
      subscribed: result.subscribed,
      notification_set: result.notification_set,
      shared: result.shared,
      added_to_playlist: result.added_to_playlist,
      error_message: result.error_message
    });

    if (res.statusCode === 200 && res.data.success) {
      logger.info('완료 보고 성공');
      return true;
    } else {
      logger.error('완료 보고 실패', { response: res });
      return false;
    }
  } catch (e) {
    logger.error('완료 보고 예외', { error: e.message });
    return false;
  }
}

async function getTaskStatus() {
  logger.info('작업 현황 조회 중...');
  try {
    const res = await makeRequest('GET', '/api/tasks/status');

    if (res.statusCode === 200 && res.data.success) {
      logger.info('작업 현황', { summary: res.data.summary });
      return res.data.summary;
    } else {
      logger.error('현황 조회 실패', { response: res });
      return null;
    }
  } catch (e) {
    logger.error('현황 조회 예외', { error: e.message });
    return null;
  }
}

// ==================== 시뮬레이션 함수 ====================

function simulateYouTubeWatch(task) {
  logger.info('==================================================');
  logger.info('YouTube 시청 시뮬레이션', {
    id: task.task_id,
    title: task.title,
    keyword: task.keyword,
    url: task.youtube_url
  });

  const result = {
    success: true,
    watch_duration: Math.floor(Math.random() * 120) + 30, // 30-150초
    search_type: task.youtube_url ? 0 : 1,
    search_rank: task.keyword ? 1 : null,
    liked: Math.random() < 0.3,
    commented: Math.random() < 0.1,
    subscribed: Math.random() < 0.05,
    notification_set: false,
    shared: Math.random() < 0.05,
    added_to_playlist: Math.random() < 0.1,
    error_message: null
  };

  logger.debug('YouTube 앱 실행');
  logger.debug('영상 검색/열기');
  logger.info('시청 중...', { seconds: result.watch_duration });

  if (result.liked) {
    logger.debug('좋아요 클릭');
  }

  if (result.commented) {
    logger.debug('댓글 작성');
  }

  if (result.subscribed) {
    logger.debug('구독 클릭');
    // 구독했을 경우 알림 설정도 시뮬레이션
    if (Math.random() < 0.7) {
      result.notification_set = true;
      logger.debug('알림 설정 (전체)');
    }
  }

  if (result.shared) {
    logger.debug('공유 메뉴 열기');
  }

  if (result.added_to_playlist) {
    logger.debug('재생목록 추가 (나중에 볼 동영상)');
  }

  logger.debug('YouTube 앱 종료');
  logger.info('시청 완료', { result });
  logger.info('==================================================');

  return result;
}

// ==================== 메인 루프 ====================

async function mainLoop() {
  logger.info('AIFARM AutoX.js Simulator 시작');

  // 1. 서버 연결 확인
  if (!await healthCheck()) {
    logger.error('서버 연결 실패. Backend 서버를 먼저 실행하세요.');
    logger.info('실행 방법', { steps: ['cd backend', 'python main.py'] });
    process.exit(1);
  }

  logger.info('서버 연결 성공');

  // 2. 초기 현황 확인
  await getTaskStatus();

  logger.info('시뮬레이션 시작 (Ctrl+C로 종료)');

  let iteration = 0;

  while (true) {
    iteration++;
    logger.info('Iteration', { iteration });

    try {
      // 3. 작업 요청
      const task = await getNextTask();

      if (task) {
        // 4. 작업 수행 (시뮬레이션)
        const result = simulateYouTubeWatch(task);

        // 5. 결과 보고
        await completeTask(task.task_id, result);

        // 6. 현황 확인
        await getTaskStatus();
      } else {
        logger.info('대기 중... (작업이 없습니다)');
        logger.info('힌트', {
          command:
            "curl -X POST http://localhost:8000/api/tasks -H \"Content-Type: application/json\" -d '{\"keyword\":\"여행 브이로그\",\"title\":\"테스트 영상\",\"priority\":5}'"
        });
      }

      // 7. 대기 (3초)
      logger.debug('3초 대기...');
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (e) {
      logger.error('메인 루프 예외', { error: e.message });
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// ==================== 종료 핸들러 ====================
process.on('SIGINT', () => {
  logger.warn('시뮬레이터 종료');
  process.exit(0);
});

// ==================== 실행 ====================
mainLoop().catch((err) => {
  logger.error('Fatal error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
