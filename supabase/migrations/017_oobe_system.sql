-- ============================================================
-- Migration 017: OOBE (Out of Box Experience) System
-- DoAi.Me Database v3.3
--
-- PC 노드 및 디바이스 자동 등록 시스템
-- - system_config 테이블: 전역 설정
-- - node_health OOBE 확장 필드
-- - devices 테이블 확장 필드
--
-- @author DoAi.Me Team
-- @version 1.0.0
-- @date 2026-01-06
-- ============================================================

-- ============================================================
-- PART 1: SYSTEM_CONFIG TABLE (전역 설정)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(50) DEFAULT 'SYSTEM'
);

-- 기본 설정 삽입
INSERT INTO system_config (key, value, description) VALUES
    ('max_devices', '{"value": 1000, "min": 1, "max": 10000}', '최대 디바이스 수'),
    ('target_devices', '{"value": 300, "phase": "Phase 1"}', '현재 목표 디바이스 수'),
    ('heartbeat_interval_sec', '{"value": 30}', '심장박동 주기 (초)'),
    ('offline_threshold_min', '{"value": 5}', '오프라인 판정 임계값 (분)'),
    ('auto_task_assignment', '{"enabled": true}', '자동 태스크 할당 활성화'),
    ('min_watch_duration_sec', '{"value": 30, "max": 300}', '최소 시청 시간'),
    ('node_max_devices', '{"value": 20}', '노드당 최대 디바이스 수')
ON CONFLICT (key) DO NOTHING;

-- 설정 변경 트리거
CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_config_timestamp ON system_config;
CREATE TRIGGER trigger_system_config_timestamp
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_system_config_timestamp();


-- ============================================================
-- PART 2: NODE_HEALTH TABLE EXTENSION (OOBE 필드)
-- ============================================================

-- OOBE 관련 필드 추가
DO $$
BEGIN
    -- oobe_completed: OOBE 완료 여부
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'node_health' AND column_name = 'oobe_completed') THEN
        ALTER TABLE node_health ADD COLUMN oobe_completed BOOLEAN DEFAULT FALSE;
    END IF;

    -- oobe_completed_at: OOBE 완료 시각
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'node_health' AND column_name = 'oobe_completed_at') THEN
        ALTER TABLE node_health ADD COLUMN oobe_completed_at TIMESTAMPTZ;
    END IF;

    -- hardware_info: 하드웨어 정보 (CPU, RAM, USB 등)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'node_health' AND column_name = 'hardware_info') THEN
        ALTER TABLE node_health ADD COLUMN hardware_info JSONB DEFAULT '{}';
    END IF;

    -- os_info: OS 정보
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'node_health' AND column_name = 'os_info') THEN
        ALTER TABLE node_health ADD COLUMN os_info JSONB DEFAULT '{}';
    END IF;

    -- connected_devices: 연결된 디바이스 수
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'node_health' AND column_name = 'connected_devices') THEN
        ALTER TABLE node_health ADD COLUMN connected_devices INTEGER DEFAULT 0;
    END IF;
END $$;


-- ============================================================
-- PART 3: DEVICES TABLE EXTENSION (OOBE 필드)
-- ============================================================

DO $$
BEGIN
    -- registered_by: 등록 출처 (OOBE:NODE_01, MANUAL, API)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'registered_by') THEN
        ALTER TABLE devices ADD COLUMN registered_by VARCHAR(50) DEFAULT 'MANUAL';
    END IF;

    -- first_heartbeat_at: 첫 Heartbeat 시각
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'first_heartbeat_at') THEN
        ALTER TABLE devices ADD COLUMN first_heartbeat_at TIMESTAMPTZ;
    END IF;

    -- device_name: 사용자 지정 이름
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'device_name') THEN
        ALTER TABLE devices ADD COLUMN device_name VARCHAR(100);
    END IF;

    -- screen_resolution: 화면 해상도
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'screen_resolution') THEN
        ALTER TABLE devices ADD COLUMN screen_resolution VARCHAR(20);
    END IF;

    -- is_battery_removed: 배터리 제거 보드 여부
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'is_battery_removed') THEN
        ALTER TABLE devices ADD COLUMN is_battery_removed BOOLEAN DEFAULT FALSE;
    END IF;

    -- ip_address: IP 주소
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'ip_address') THEN
        ALTER TABLE devices ADD COLUMN ip_address INET;
    END IF;

    -- mac_address: MAC 주소
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'devices' AND column_name = 'mac_address') THEN
        ALTER TABLE devices ADD COLUMN mac_address VARCHAR(17);
    END IF;
END $$;


-- ============================================================
-- PART 4: RPC FUNCTIONS
-- ============================================================

-- 시스템 설정 가져오기
CREATE OR REPLACE FUNCTION get_system_config()
RETURNS TABLE (
    key VARCHAR(50),
    value JSONB,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT sc.key, sc.value, sc.description
    FROM system_config sc
    ORDER BY sc.key;
END;
$$ LANGUAGE plpgsql;

-- 시스템 설정 업데이트
CREATE OR REPLACE FUNCTION set_system_config(
    p_key VARCHAR(50),
    p_value JSONB,
    p_updated_by VARCHAR(50) DEFAULT 'API'
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE system_config
    SET value = p_value, updated_by = p_updated_by
    WHERE key = p_key;

    IF NOT FOUND THEN
        INSERT INTO system_config (key, value, updated_by)
        VALUES (p_key, p_value, p_updated_by);
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 노드 OOBE 등록
CREATE OR REPLACE FUNCTION register_node_oobe(
    p_node_id VARCHAR(50),
    p_node_name VARCHAR(100),
    p_node_type VARCHAR(20) DEFAULT 'MINI_PC',
    p_ip_address INET DEFAULT NULL,
    p_hardware_info JSONB DEFAULT '{}'::JSONB,
    p_os_info JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    INSERT INTO node_health (
        node_id,
        node_name,
        node_type,
        ip_address,
        status,
        oobe_completed,
        oobe_completed_at,
        hardware_info,
        os_info,
        last_heartbeat,
        created_at
    ) VALUES (
        p_node_id,
        p_node_name,
        p_node_type::node_type,
        p_ip_address,
        'INITIALIZING'::node_status,
        TRUE,
        NOW(),
        p_hardware_info,
        p_os_info,
        NOW(),
        NOW()
    )
    ON CONFLICT (node_id) DO UPDATE SET
        node_name = EXCLUDED.node_name,
        ip_address = EXCLUDED.ip_address,
        oobe_completed = TRUE,
        oobe_completed_at = NOW(),
        hardware_info = EXCLUDED.hardware_info,
        os_info = EXCLUDED.os_info,
        last_heartbeat = NOW();

    RETURN QUERY SELECT TRUE, 'Node registered successfully';
END;
$$ LANGUAGE plpgsql;

-- 디바이스 OOBE 등록
CREATE OR REPLACE FUNCTION register_device_oobe(
    p_serial VARCHAR(50),
    p_node_id VARCHAR(50),
    p_model VARCHAR(100) DEFAULT NULL,
    p_android_version VARCHAR(20) DEFAULT NULL,
    p_registered_by VARCHAR(50) DEFAULT 'OOBE'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    is_new BOOLEAN
) AS $$
DECLARE
    v_is_new BOOLEAN;
BEGIN
    -- 기존 디바이스 확인
    SELECT NOT EXISTS (SELECT 1 FROM devices WHERE serial = p_serial) INTO v_is_new;

    INSERT INTO devices (
        serial,
        node_id,
        model,
        android_version,
        status,
        registered_by,
        first_seen,
        last_seen
    ) VALUES (
        p_serial,
        p_node_id,
        p_model,
        p_android_version,
        'online',
        p_registered_by,
        NOW(),
        NOW()
    )
    ON CONFLICT (serial) DO UPDATE SET
        node_id = EXCLUDED.node_id,
        model = COALESCE(EXCLUDED.model, devices.model),
        android_version = COALESCE(EXCLUDED.android_version, devices.android_version),
        status = 'online',
        last_seen = NOW();

    IF v_is_new THEN
        RETURN QUERY SELECT TRUE, 'Device registered successfully', TRUE;
    ELSE
        RETURN QUERY SELECT TRUE, 'Device updated successfully', FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PART 5: VIEWS
-- ============================================================

-- 노드 현황 뷰 (OOBE 포함)
CREATE OR REPLACE VIEW view_node_oobe_status AS
SELECT
    nh.node_id,
    nh.node_name,
    nh.node_type,
    nh.ip_address,
    nh.status,
    nh.oobe_completed,
    nh.oobe_completed_at,
    nh.hardware_info,
    nh.connected_devices,
    nh.last_heartbeat,
    EXTRACT(EPOCH FROM (NOW() - nh.last_heartbeat)) AS seconds_since_heartbeat,
    (
        SELECT COUNT(*)
        FROM devices d
        WHERE d.node_id = nh.node_id
    ) AS total_devices,
    (
        SELECT COUNT(*)
        FROM devices d
        WHERE d.node_id = nh.node_id
        AND d.status = 'online'
    ) AS online_devices
FROM node_health nh
ORDER BY nh.node_id;

-- 디바이스 등록 현황 뷰
CREATE OR REPLACE VIEW view_device_registration AS
SELECT
    d.serial,
    d.device_name,
    d.model,
    d.android_version,
    d.node_id,
    d.status,
    d.registered_by,
    d.first_seen,
    d.last_seen,
    d.first_heartbeat_at,
    EXTRACT(EPOCH FROM (NOW() - d.last_seen)) AS seconds_since_seen,
    p.persona_id,
    p.given_name AS persona_name,
    p.persona_state
FROM devices d
LEFT JOIN personas p ON p.device_serial = d.serial
ORDER BY d.first_seen DESC;


-- ============================================================
-- PART 6: RLS POLICIES
-- ============================================================

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY "Service role has full access on system_config" ON system_config
    FOR ALL USING (auth.role() = 'service_role');

-- Anon role: read only
CREATE POLICY "Anon can read system_config" ON system_config
    FOR SELECT USING (true);


-- ============================================================
-- PART 7: COMMENTS
-- ============================================================

COMMENT ON TABLE system_config IS '전역 시스템 설정. 동적 설정값 저장.';
COMMENT ON COLUMN node_health.oobe_completed IS 'OOBE(Out of Box Experience) 완료 여부';
COMMENT ON COLUMN node_health.hardware_info IS 'CPU, RAM, USB 등 하드웨어 정보 (JSONB)';
COMMENT ON COLUMN devices.registered_by IS '등록 출처 (OOBE:NODE_01, MANUAL, API)';

COMMENT ON VIEW view_node_oobe_status IS '노드 OOBE 현황 대시보드 뷰';
COMMENT ON VIEW view_device_registration IS '디바이스 등록 현황 뷰';


-- ============================================================
-- END OF MIGRATION 017
-- ============================================================
