/**
 * Supabase Client
 *
 * DoAi.Me 태스크 관리 및 디바이스 상태 보고
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_KEY = config.SUPABASE_KEY;

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[Supabase] SUPABASE_URL 또는 SUPABASE_KEY가 설정되지 않았습니다.');
    console.warn('[Supabase] Supabase 기능이 비활성화됩니다.');
} else {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('[Supabase] 클라이언트 초기화 완료');
    } catch (err) {
        console.error('[Supabase] 클라이언트 초기화 실패:', err.message);
    }
}

/**
 * Supabase 연결 확인
 */
function isConnected() {
    return supabase !== null;
}

/**
 * 디바이스 하트비트 보고
 *
 * @param {string} nodeId - 노드 ID (미니PC 식별자)
 * @param {string} serial - 디바이스 시리얼
 * @param {Object} status - { battery, status }
 */
async function deviceHeartbeat(nodeId, serial, status = {}) {
    if (!supabase) {
        return null;
    }

    try {
        const { data, error } = await supabase.rpc('device_heartbeat', {
            p_node_id: nodeId,
            p_device_serial: serial,
            p_status: status.status || 'online',
            p_battery: status.battery || 100
        });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error(`[Supabase] deviceHeartbeat 실패 (${serial}):`, err.message);
        return null;
    }
}

/**
 * 배치로 디바이스 하트비트 보고
 *
 * @param {string} nodeId - 노드 ID
 * @param {Array} devices - [{ serial, battery, status }]
 */
async function batchHeartbeat(nodeId, devices) {
    if (!supabase) {
        return false;
    }

    try {
        // 배치 upsert
        const records = devices.map(d => ({
            node_id: nodeId,
            serial: d.serial,
            status: d.status || 'online',
            battery: d.battery || 100,
            last_seen: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('devices')
            .upsert(records, { onConflict: 'serial' });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('[Supabase] batchHeartbeat 실패:', err.message);
        return false;
    }
}

/**
 * 대기 중인 태스크 조회 (배치)
 *
 * @param {number} limit - 최대 조회 수
 * @returns {Promise<Array>}
 */
async function getPendingTasks(limit = 20) {
    if (!supabase) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('youtube_video_tasks')
            .select('*')
            .eq('status', 'pending')
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[Supabase] getPendingTasks 실패:', err.message);
        return [];
    }
}

/**
 * 특정 디바이스의 다음 태스크 조회
 *
 * @param {string} serial - 디바이스 시리얼
 */
async function getNextTaskForDevice(serial) {
    if (!supabase) {
        return null;
    }

    try {
        const { data, error } = await supabase.rpc('get_next_task_for_device', {
            p_device_serial: serial
        });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error(`[Supabase] getNextTaskForDevice(${serial}) 실패:`, err.message);
        return null;
    }
}

/**
 * 태스크 상태 업데이트 (배치)
 *
 * @param {Array} taskIds - 태스크 ID 배열
 * @param {string} status - 'running' | 'completed' | 'failed'
 */
async function updateTaskStatus(taskIds, status, extra = {}) {
    if (!supabase) {
        return false;
    }

    try {
        const updateData = {
            status: status,
            ...extra
        };

        if (status === 'running') {
            updateData.started_at = new Date().toISOString();
        } else if (status === 'completed' || status === 'failed') {
            updateData.completed_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('youtube_video_tasks')
            .update(updateData)
            .in('id', taskIds);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('[Supabase] updateTaskStatus 실패:', err.message);
        return false;
    }
}

/**
 * 태스크 완료 처리 (RPC)
 *
 * @param {string} taskId - 태스크 ID
 * @param {Object} result - { success, watchDuration, liked, commented, error }
 */
async function completeTask(taskId, result) {
    if (!supabase) {
        return false;
    }

    try {
        if (result.success) {
            const { error } = await supabase.rpc('complete_video_task', {
                p_task_id: taskId,
                p_persona_id: result.personaId,
                p_watch_duration: result.watchDuration || 0,
                p_liked: result.liked || false,
                p_commented: result.commented || false
            });

            if (error) throw error;
        } else {
            // 실패 처리
            const { error } = await supabase
                .from('youtube_video_tasks')
                .update({
                    status: 'failed',
                    error_message: result.error,
                    completed_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;
        }

        return true;
    } catch (err) {
        console.error(`[Supabase] completeTask(${taskId}) 실패:`, err.message);
        return false;
    }
}

/**
 * 유휴 디바이스 목록 조회
 * (현재 태스크를 실행하지 않는 디바이스)
 *
 * @param {string} nodeId - 노드 ID
 */
async function getIdleDevices(nodeId) {
    if (!supabase) {
        return [];
    }

    try {
        const { data, error } = await supabase.rpc('get_idle_devices', {
            p_node_id: nodeId
        });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[Supabase] getIdleDevices 실패:', err.message);
        return [];
    }
}

/**
 * 태스크-디바이스 할당 기록
 *
 * @param {string} taskId - 태스크 ID
 * @param {string} serial - 디바이스 시리얼
 */
async function assignTaskToDevice(taskId, serial) {
    if (!supabase) {
        return false;
    }

    try {
        const { error } = await supabase
            .from('youtube_video_tasks')
            .update({
                device_serial: serial,
                status: 'assigned',
                assigned_at: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error(`[Supabase] assignTaskToDevice 실패:`, err.message);
        return false;
    }
}

module.exports = {
    supabase, // 직접 접근용
    isConnected,
    deviceHeartbeat,
    batchHeartbeat,
    getPendingTasks,
    getNextTaskForDevice,
    updateTaskStatus,
    completeTask,
    getIdleDevices,
    assignTaskToDevice
};
