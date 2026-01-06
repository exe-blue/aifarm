/**
 * System Configuration
 *
 * 환경 변수 기반 시스템 설정 + config.json 폴백
 * 600대 하드코딩 제거 → 가변 디바이스 수 지원
 */

const fs = require('fs');
const path = require('path');

// dotenv 로드 (있는 경우에만)
try {
    require('dotenv').config();
} catch (e) {
    // dotenv 없어도 동작
}

// config.json 폴백 로드
let jsonConfig = {};
const configPath = path.join(__dirname, '..', 'config.json');
if (fs.existsSync(configPath)) {
    try {
        jsonConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
        console.warn('[Config] config.json 파싱 실패:', e.message);
    }
}

// 환경변수 > config.json > 기본값 우선순위
const config = {
    // ==================== 노드 정보 ====================
    NODE_ID: process.env.NODE_ID || jsonConfig.node_id || `node-${Date.now()}`,
    NODE_NAME: process.env.NODE_NAME || jsonConfig.node_name || 'Local Node',

    // ==================== 디바이스 설정 ====================
    // 기본값 600, 환경에 따라 조정 가능
    MAX_DEVICES: parseInt(process.env.MAX_DEVICES || '600', 10),

    // 노드당 디바이스 수 (기본 120)
    DEVICES_PER_NODE: parseInt(process.env.DEVICES_PER_NODE || '120', 10),

    // ==================== Heartbeat 설정 ====================
    HEARTBEAT_INTERVAL: parseInt(
        process.env.HEARTBEAT_INTERVAL ||
        jsonConfig.heartbeat?.interval_ms ||
        '30000',
        10
    ),
    TASK_TIMEOUT: parseInt(process.env.TASK_TIMEOUT || '300000', 10), // 5분

    // ==================== 영상 시청 설정 ====================
    // 랜덤 시청 시간 범위 (초)
    MIN_WATCH_DURATION: parseInt(process.env.MIN_WATCH_DURATION || '30', 10),
    MAX_WATCH_DURATION: parseInt(process.env.MAX_WATCH_DURATION || '300', 10),

    // 좋아요/댓글 확률
    LIKE_PROBABILITY: parseFloat(process.env.LIKE_PROBABILITY || '0.3'),
    COMMENT_PROBABILITY: parseFloat(process.env.COMMENT_PROBABILITY || '0.1'),

    // ==================== Supabase 설정 ====================
    SUPABASE_URL: process.env.SUPABASE_URL || jsonConfig.supabase?.url || null,
    SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY || jsonConfig.supabase?.anon_key || null,

    // ==================== Laixi 설정 ====================
    LAIXI_HOST: process.env.LAIXI_HOST || 'localhost',
    LAIXI_PORT: parseInt(process.env.LAIXI_PORT || jsonConfig.laixi?.api_base?.split(':').pop() || '8080', 10),
    LAIXI_API_BASE: process.env.LAIXI_API_BASE || jsonConfig.laixi?.api_base || 'http://127.0.0.1:8080',

    // ==================== 콜백 서버 설정 ====================
    CALLBACK_PORT: parseInt(process.env.CALLBACK_PORT || '3000', 10),

    // ==================== OOBE 설정 ====================
    OOBE_ENABLED: process.env.OOBE_ENABLED !== 'false',
    AUTO_REGISTER_DEVICES: process.env.AUTO_REGISTER_DEVICES !== 'false',
};

/**
 * 설정 유효성 검사
 */
function validateConfig() {
    const errors = [];

    if (!config.SUPABASE_URL) {
        errors.push('SUPABASE_URL is required');
    }
    if (!config.SUPABASE_KEY) {
        errors.push('SUPABASE_SERVICE_KEY is required');
    }
    if (config.MAX_DEVICES < 1) {
        errors.push('MAX_DEVICES must be at least 1');
    }

    if (errors.length > 0) {
        console.error('[Config] 설정 오류:');
        errors.forEach(e => console.error(`  - ${e}`));
        return false;
    }

    return true;
}

/**
 * 설정 로그 출력
 */
function logConfig() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║           DoAi.Me Local Node Config            ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║ NODE_ID: ${config.NODE_ID.padEnd(36)} ║`);
    console.log(`║ MAX_DEVICES: ${String(config.MAX_DEVICES).padEnd(33)} ║`);
    console.log(`║ DEVICES_PER_NODE: ${String(config.DEVICES_PER_NODE).padEnd(28)} ║`);
    console.log(`║ HEARTBEAT_INTERVAL: ${String(config.HEARTBEAT_INTERVAL + 'ms').padEnd(26)} ║`);
    console.log(`║ OOBE_ENABLED: ${String(config.OOBE_ENABLED).padEnd(32)} ║`);
    console.log('╚════════════════════════════════════════════════╝');
}

module.exports = {
    ...config,
    validateConfig,
    logConfig
};
