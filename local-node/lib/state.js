/**
 * 공유 상태 관리 (싱글톤)
 *
 * 루프 방지를 위한 락킹 및 상태 추적
 */

const os = require('os');

// 공유 상태 객체
const state = {
    nodeId: process.env.NODE_ID || os.hostname(),

    // 디바이스 상태: serial -> { status, lastSeen, battery }
    devices: new Map(),

    // 실행 중 태스크: serial -> { taskId, startTime }
    running: new Map(),

    // 대기 큐: [{ serial, task }]
    pending: [],

    // 락: serial -> timestamp (중복 실행 방지)
    locks: new Map(),

    // 배치 실행 상태
    batchRunning: false,
    lastBatchTime: 0
};

/**
 * 락 획득 (기본 5분 타임아웃)
 *
 * @param {string} serial - 디바이스 시리얼
 * @param {number} timeoutMs - 타임아웃 (기본 5분)
 * @returns {boolean} - 락 획득 성공 여부
 */
function acquireLock(serial, timeoutMs = 300000) {
    const now = Date.now();
    const existing = state.locks.get(serial);

    // 기존 락이 있고 타임아웃 전이면 실패
    if (existing && now - existing < timeoutMs) {
        return false;
    }

    state.locks.set(serial, now);
    return true;
}

/**
 * 락 해제
 * @param {string} serial - 디바이스 시리얼
 */
function releaseLock(serial) {
    state.locks.delete(serial);
}

/**
 * 디바이스가 현재 실행 중인지 확인
 * @param {string} serial - 디바이스 시리얼
 */
function isRunning(serial) {
    return state.running.has(serial);
}

/**
 * 태스크 실행 시작 기록
 *
 * @param {string} serial - 디바이스 시리얼
 * @param {string} taskId - 태스크 ID
 */
function startTask(serial, taskId) {
    state.running.set(serial, {
        taskId: taskId,
        startTime: Date.now()
    });
}

/**
 * 태스크 완료 기록
 * @param {string} serial - 디바이스 시리얼
 */
function endTask(serial) {
    state.running.delete(serial);
    releaseLock(serial);
}

/**
 * taskId로 serial 찾기
 * @param {string} taskId - 태스크 ID
 * @returns {string|null} - 디바이스 시리얼
 */
function findSerialByTaskId(taskId) {
    for (const [serial, info] of state.running.entries()) {
        if (info.taskId === taskId) {
            return serial;
        }
    }
    return null;
}

/**
 * 실행 중인 태스크 목록
 * @returns {Array} - [{ serial, taskId, startTime, duration }]
 */
function getRunningTasks() {
    const now = Date.now();
    const tasks = [];

    for (const [serial, info] of state.running.entries()) {
        tasks.push({
            serial,
            taskId: info.taskId,
            startTime: info.startTime,
            duration: now - info.startTime
        });
    }

    return tasks;
}

/**
 * 타임아웃된 태스크 정리
 *
 * @param {number} timeoutMs - 타임아웃 기준 (기본 5분)
 * @returns {Array} - 정리된 태스크 목록
 */
function cleanupTimedOut(timeoutMs = 300000) {
    const now = Date.now();
    const cleaned = [];

    for (const [serial, info] of state.running.entries()) {
        if (now - info.startTime > timeoutMs) {
            cleaned.push({ serial, taskId: info.taskId });
            state.running.delete(serial);
            state.locks.delete(serial);
        }
    }

    if (cleaned.length > 0) {
        console.log(`[State] ${cleaned.length}개 타임아웃 태스크 정리됨`);
    }

    return cleaned;
}

/**
 * 디바이스 상태 업데이트
 *
 * @param {string} serial - 디바이스 시리얼
 * @param {Object} status - { battery, status }
 */
function updateDevice(serial, status) {
    state.devices.set(serial, {
        ...status,
        lastSeen: Date.now()
    });
}

/**
 * 전체 상태 스냅샷 (디버깅/모니터링용)
 */
function getSnapshot() {
    return {
        nodeId: state.nodeId,
        deviceCount: state.devices.size,
        runningCount: state.running.size,
        pendingCount: state.pending.length,
        lockCount: state.locks.size,
        batchRunning: state.batchRunning,
        running: getRunningTasks()
    };
}

/**
 * 상태 리셋 (테스트용)
 */
function reset() {
    state.devices.clear();
    state.running.clear();
    state.pending = [];
    state.locks.clear();
    state.batchRunning = false;
}

module.exports = {
    state,
    acquireLock,
    releaseLock,
    isRunning,
    startTask,
    endTask,
    findSerialByTaskId,
    getRunningTasks,
    cleanupTimedOut,
    updateDevice,
    getSnapshot,
    reset
};
