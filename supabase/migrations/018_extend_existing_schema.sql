-- ============================================================
-- Migration 018: Extend Existing Schema for Local Node
-- DoAi.Me Database
--
-- 기존 테이블(devices, personas, jobs, videos)을 유지하고
-- 필요한 컬럼과 새 테이블만 추가
--
-- @date 2026-01-06
-- ============================================================

-- ============================================================
-- PART 1: DEVICES 테이블 확장
-- ============================================================

-- 기존 devices 테이블에 node 관련 컬럼 추가
DO $$
BEGIN
    -- node_id: 연결된 노드
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'devices' AND column_name = 'node_id') THEN
        ALTER TABLE devices ADD COLUMN node_id VARCHAR(50);
    END IF;

    -- model: 디바이스 모델명
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'devices' AND column_name = 'model') THEN
        ALTER TABLE devices ADD COLUMN model VARCHAR(100);
    END IF;

    -- battery: 배터리 레벨
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'devices' AND column_name = 'battery') THEN
        ALTER TABLE devices ADD COLUMN battery SMALLINT DEFAULT 100;
    END IF;

    -- first_seen: 최초 연결 시각
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'devices' AND column_name = 'first_seen') THEN
        ALTER TABLE devices ADD COLUMN first_seen TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Index for node queries
CREATE INDEX IF NOT EXISTS idx_devices_node_id ON devices(node_id);


-- ============================================================
-- PART 2: PERSONAS 테이블 확장
-- ============================================================

DO $$
BEGIN
    -- device_serial: 연결된 디바이스
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'device_serial') THEN
        ALTER TABLE personas ADD COLUMN device_serial VARCHAR(50);
    END IF;

    -- given_name: 한국식 이름
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'given_name') THEN
        ALTER TABLE personas ADD COLUMN given_name VARCHAR(100);
    END IF;

    -- persona_state: NASCENT, ACTIVE, FADING, VOID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'persona_state') THEN
        ALTER TABLE personas ADD COLUMN persona_state VARCHAR(20) DEFAULT 'NASCENT';
    END IF;

    -- state_changed_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'state_changed_at') THEN
        ALTER TABLE personas ADD COLUMN state_changed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- born_at: 탄생 시각
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'born_at') THEN
        ALTER TABLE personas ADD COLUMN born_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Big Five personality traits
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'trait_openness') THEN
        ALTER TABLE personas ADD COLUMN trait_openness DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'trait_conscientiousness') THEN
        ALTER TABLE personas ADD COLUMN trait_conscientiousness DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'trait_extraversion') THEN
        ALTER TABLE personas ADD COLUMN trait_extraversion DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'trait_agreeableness') THEN
        ALTER TABLE personas ADD COLUMN trait_agreeableness DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personas' AND column_name = 'trait_neuroticism') THEN
        ALTER TABLE personas ADD COLUMN trait_neuroticism DECIMAL(3,2) DEFAULT 0.5;
    END IF;
END $$;

-- Index for device lookup
CREATE INDEX IF NOT EXISTS idx_personas_device_serial ON personas(device_serial);
CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_device_serial_unique ON personas(device_serial) 
    WHERE device_serial IS NOT NULL;


-- ============================================================
-- PART 3: TRACES 테이블 (랜덤 시청 결과)
-- ============================================================

CREATE TABLE IF NOT EXISTS traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_serial VARCHAR(50),
    traced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action_type VARCHAR(50),  -- RANDOM_WATCH, TASK_WATCH, etc.
    action_params JSONB DEFAULT '{}',
    outcome_success BOOLEAN,
    outcome_summary JSONB DEFAULT '{}',
    path_contribution_weight DECIMAL(5,4) DEFAULT 0.01,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traces_device ON traces(device_serial);
CREATE INDEX IF NOT EXISTS idx_traces_type ON traces(action_type, traced_at DESC);


-- ============================================================
-- PART 4: RECOMMENDED_VIDEOS 테이블 (랜덤 시청용)
-- ============================================================

CREATE TABLE IF NOT EXISTS recommended_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id VARCHAR(20) NOT NULL,
    title TEXT,
    channel_name VARCHAR(100),
    category VARCHAR(50),
    duration_seconds INTEGER,
    active BOOLEAN DEFAULT true,
    times_watched INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_watched_at TIMESTAMPTZ,
    CONSTRAINT unique_video_id UNIQUE (video_id)
);

CREATE INDEX IF NOT EXISTS idx_recommended_videos_active ON recommended_videos(active, category);

-- 샘플 데이터 삽입
INSERT INTO recommended_videos (video_id, title, channel_name, category, duration_seconds)
VALUES
    ('dQw4w9WgXcQ', 'Never Gonna Give You Up', 'Rick Astley', 'music', 212),
    ('9bZkp7q19f0', 'PSY - GANGNAM STYLE', 'officialpsy', 'music', 252),
    ('JGwWNGJdvx8', 'Ed Sheeran - Shape of You', 'Ed Sheeran', 'music', 263),
    ('kJQP7kiw5Fk', 'Luis Fonsi - Despacito', 'Luis Fonsi', 'music', 282),
    ('RgKAFK5djSk', 'Wiz Khalifa - See You Again', 'Wiz Khalifa', 'music', 237),
    ('fJ9rUzIMcZQ', 'Queen – Bohemian Rhapsody', 'Queen Official', 'music', 355),
    ('hT_nvWreIhg', 'OneRepublic - Counting Stars', 'OneRepublic', 'music', 257),
    ('lp-EO5I60KA', 'Ed Sheeran - Thinking Out Loud', 'Ed Sheeran', 'music', 281),
    ('OPf0YbXqDm0', 'Mark Ronson - Uptown Funk ft. Bruno Mars', 'Mark Ronson', 'music', 270),
    ('YQHsXMglC9A', 'Adele - Hello', 'Adele', 'music', 367)
ON CONFLICT (video_id) DO NOTHING;


-- ============================================================
-- PART 5: PERSONA_ACTIVITY_LOGS 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS persona_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID,  -- personas.id 참조
    activity_type VARCHAR(50) NOT NULL,  -- youtube_watch, youtube_like, etc.
    target_url TEXT,
    target_title TEXT,
    points_earned INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persona_activity_persona ON persona_activity_logs(persona_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_persona_activity_type ON persona_activity_logs(activity_type, created_at DESC);


-- ============================================================
-- PART 6: SYSTEM_CONFIG 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 설정 삽입
INSERT INTO system_config (key, value, description) VALUES
    ('max_devices', '{"value": 600, "min": 1, "max": 10000}', '최대 디바이스 수'),
    ('target_devices', '{"value": 300, "phase": "Phase 1"}', '목표 디바이스 수'),
    ('heartbeat_interval_sec', '{"value": 30}', '심장박동 주기'),
    ('offline_threshold_min', '{"value": 5}', '오프라인 판정 임계값')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- PART 7: RLS 정책
-- ============================================================

-- traces
ALTER TABLE traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for traces" ON traces FOR ALL USING (true);

-- recommended_videos
ALTER TABLE recommended_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for recommended_videos" ON recommended_videos FOR ALL USING (true);

-- persona_activity_logs
ALTER TABLE persona_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for persona_activity_logs" ON persona_activity_logs FOR ALL USING (true);

-- system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for system_config" ON system_config FOR ALL USING (true);


-- ============================================================
-- PART 8: VIEWS
-- ============================================================

-- 디바이스 현황 뷰
CREATE OR REPLACE VIEW view_device_status AS
SELECT
    d.id,
    d.serial_number,
    d.serial,
    d.node_id,
    d.model,
    d.status,
    d.battery,
    d.last_seen,
    EXTRACT(EPOCH FROM (NOW() - d.last_seen)) AS seconds_since_seen,
    p.id AS persona_id,
    p.name AS persona_name,
    p.given_name,
    p.persona_state
FROM devices d
LEFT JOIN personas p ON p.device_serial = COALESCE(d.serial, d.serial_number);


-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE traces IS '랜덤 시청 결과 및 활동 추적';
COMMENT ON TABLE recommended_videos IS '랜덤 시청용 추천 영상 풀';
COMMENT ON TABLE persona_activity_logs IS '페르소나별 활동 로그';
COMMENT ON TABLE system_config IS '시스템 전역 설정';


-- ============================================================
-- END OF MIGRATION 018
-- ============================================================
