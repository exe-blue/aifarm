/**
 * Laixi API Client
 *
 * Laixi 그룹 기능을 활용한 배치 실행 지원
 * - deviceIds: "all" | "serial1,serial2" | "groupName"
 * - 모든 호출에 타임아웃 적용
 */

const axios = require('axios');

const BASE_URL = process.env.LAIXI_URL || 'http://127.0.0.1:9317';
const DEFAULT_TIMEOUT = 10000; // 10초

// Axios 인스턴스
const client = axios.create({
    baseURL: BASE_URL,
    timeout: DEFAULT_TIMEOUT,
    headers: { 'Content-Type': 'application/json' }
});

/**
 * 연결된 디바이스 목록 조회
 * @param {Object} opts - { timeout, online }
 * @returns {Promise<Array>} - [{ serial, name, battery, ... }]
 */
async function getDevices(opts = {}) {
    try {
        const query = opts.online ? '?q=online' : '';
        const { data } = await client.get(`/api/devices${query}`, {
            timeout: opts.timeout || DEFAULT_TIMEOUT
        });
        return data.data || [];
    } catch (err) {
        console.error('[Laixi] getDevices 실패:', err.message);
        return [];
    }
}

/**
 * 그룹 목록 조회
 * @returns {Promise<Array>} - [{ id, name, deviceCount }]
 */
async function getGroups() {
    try {
        // Laixi 그룹 조회 API (문서 기반 추정)
        const { data } = await client.get('/api/groups');
        return data.groups || data.data || [];
    } catch (err) {
        console.error('[Laixi] getGroups 실패:', err.message);
        return [];
    }
}

/**
 * AutoX.js 스크립트 실행 (배치 지원)
 *
 * @param {string} deviceIds - "all" | "serial1,serial2" | 그룹명
 * @param {string} filePath - 스크립트 파일 경로 (PC 로컬)
 * @param {Object} opts - { timeout }
 * @returns {Promise<boolean>}
 */
async function executeScript(deviceIds, filePath, opts = {}) {
    try {
        const payload = {
            action: 'ExecuteAutoJs',
            comm: {
                deviceIds: deviceIds,
                filePath: filePath
            }
        };

        const { data } = await client.post('/api/command', payload, {
            timeout: opts.timeout || 30000 // 스크립트 실행은 30초
        });

        console.log(`[Laixi] ExecuteAutoJs 전송: ${deviceIds}`);
        return data.success !== false;
    } catch (err) {
        console.error('[Laixi] executeScript 실패:', err.message);
        return false;
    }
}

/**
 * AutoX.js 스크립트 중지
 *
 * @param {string} deviceIds - "all" | "serial1,serial2"
 * @param {string} filePath - 스크립트 파일 경로
 * @returns {Promise<boolean>}
 */
async function stopScript(deviceIds, filePath) {
    try {
        const payload = {
            action: 'StopAutoJs',
            comm: {
                deviceIds: deviceIds,
                filePath: filePath
            }
        };

        const { data } = await client.post('/api/command', payload, {
            timeout: 5000
        });

        return data.success !== false;
    } catch (err) {
        console.error('[Laixi] stopScript 실패:', err.message);
        return false;
    }
}

/**
 * ADB 명령 실행 (배치 지원)
 *
 * @param {string} deviceIds - "all" | "serial1,serial2"
 * @param {string} command - ADB 명령어
 * @returns {Promise<Object>}
 */
async function executeAdb(deviceIds, command, opts = {}) {
    try {
        const payload = {
            action: 'adb',
            comm: {
                deviceIds: deviceIds,
                command: command
            }
        };

        const { data } = await client.post('/api/command', payload, {
            timeout: opts.timeout || DEFAULT_TIMEOUT
        });

        return data;
    } catch (err) {
        console.error('[Laixi] executeAdb 실패:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 특정 디바이스에 스크립트 실행 (개별 API)
 * 기존 heartbeat.js 호환용
 *
 * @param {string} serial - 디바이스 시리얼
 * @param {string} script - 스크립트 내용 (문자열)
 * @param {Object} opts - { name, timeout }
 */
async function runScriptOnDevice(serial, script, opts = {}) {
    try {
        const { data } = await client.post(
            `/api/devices/${serial}/script/run`,
            {
                script: script,
                name: opts.name || 'task.js',
                options: { keepAlive: false }
            },
            { timeout: opts.timeout || 30000 }
        );

        return data.success !== false;
    } catch (err) {
        console.error(`[Laixi] runScriptOnDevice(${serial}) 실패:`, err.message);
        return false;
    }
}

/**
 * 스크립트 실행 상태 확인
 * @param {string} serial - 디바이스 시리얼
 */
async function getScriptStatus(serial, opts = {}) {
    try {
        const { data } = await client.get(
            `/api/devices/${serial}/script/status`,
            { timeout: opts.timeout || DEFAULT_TIMEOUT }
        );
        return { running: data.running === true, ...data };
    } catch (err) {
        return { running: false, error: err.message };
    }
}

/**
 * 앱 실행
 * @param {string} serial - 디바이스 시리얼
 * @param {string} packageName - 앱 패키지명 (예: com.google.android.youtube)
 * @returns {Promise<boolean>}
 */
async function startApp(serial, packageName) {
    try {
        const { data } = await client.post(
            `/api/devices/${serial}/app/start`,
            { package: packageName },
            { timeout: 5000 }
        );
        return data.success !== false;
    } catch (err) {
        if (err.code === 'ECONNABORTED') {
            throw new Error('Laixi timeout');
        }
        throw new Error(err.response?.data?.message || err.message);
    }
}

/**
 * 헬스체크 (Laixi 연결 확인)
 */
async function healthCheck() {
    try {
        const devices = await getDevices({ timeout: 3000 });
        return { ok: true, deviceCount: devices.length };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

module.exports = {
    getDevices,
    getGroups,
    executeScript,
    stopScript,
    executeAdb,
    runScriptOnDevice,
    getScriptStatus,
    startApp,
    healthCheck,
    // 설정
    BASE_URL,
    DEFAULT_TIMEOUT
};
