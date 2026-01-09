/**
 * Logger Module
 * 로그 관리 및 출력
 */

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

function safeJsonStringify(value) {
    const seen = new WeakSet();
    try {
        return JSON.stringify(value, (_key, v) => {
            if (typeof v === 'object' && v !== null) {
                if (seen.has(v)) return '[Circular]';
                seen.add(v);
            }
            if (v instanceof Error) {
                return { name: v.name, message: v.message, stack: v.stack };
            }
            return v;
        });
    } catch (_e) {
        return '"[Unserializable]"';
    }
}

function writeLine(level, line) {
    // AutoX.js/Auto.js 환경: log()가 보통 존재
    if (typeof globalThis.log === 'function') {
        globalThis.log(line);
        return;
    }

    // Node.js 환경(console 금지): stdout/stderr로 직접 기록
    if (typeof process !== 'undefined' && process && process.stdout && typeof process.stdout.write === 'function') {
        const out = `${line}\n`;
        if (level === 'error') {
            process.stderr.write(out);
            return;
        }
        process.stdout.write(out);
    }
}

class Logger {
    constructor(config) {
        const configuredLevel = config?.settings?.log_level;
        this.level = LOG_LEVELS[configuredLevel] ?? LOG_LEVELS.info;
        this.deviceId = config?.device?.id || 'unknown';
    }

    _log(level, message, data) {
        if (LOG_LEVELS[level] >= this.level) {
            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${this.deviceId}] [${level.toUpperCase()}]`;

            const payload = data ? ` ${safeJsonStringify(data)}` : '';
            writeLine(level, `${prefix} ${message}${payload}`);
        }
    }

    debug(message, data) {
        this._log('debug', message, data);
    }

    info(message, data) {
        this._log('info', message, data);
    }

    warn(message, data) {
        this._log('warn', message, data);
    }

    error(message, data) {
        this._log('error', message, data);
    }
}

/**
 * 부트스트랩 로거
 * - config 로딩 전/실패 시에도 안전하게 로그를 남기기 위함
 */
Logger.createBootLogger = function createBootLogger(options = {}) {
    const bootConfig = {
        device: { id: options.deviceId || 'unknown' },
        settings: { log_level: options.level || 'info' }
    };
    return new Logger(bootConfig);
};

module.exports = Logger;
