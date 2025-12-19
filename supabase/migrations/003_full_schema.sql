-- AIFarm Full Schema
-- 실행: Supabase SQL Editor에서 전체 복사 후 실행

-- ==================== 기존 테이블 삭제 (필요시) ====================
DROP TABLE IF EXISTS device_issues CASCADE;
DROP TABLE IF EXISTS do_requests CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- ==================== 1. Activities 테이블 ====================
CREATE TABLE activities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    allocated_devices INTEGER DEFAULT 0,
    active_devices INTEGER DEFAULT 0,
    weight INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6대 활동 시드 데이터
INSERT INTO activities (id, name, description, icon, color, allocated_devices, active_devices, weight) VALUES
    ('shorts_remix', 'Shorts 리믹스 팩토리', '트렌딩 Shorts 분석 → AI 리믹스 아이디어 생성', '🎬', 'cyan', 0, 0, 20),
    ('playlist_curator', 'AI DJ 플레이리스트', '테마별 영상 탐색 → 플레이리스트 자동 구축', '🎵', 'purple', 0, 0, 15),
    ('persona_commenter', '페르소나 코멘터', '10가지 AI 페르소나 → 대댓글 인터랙션', '💬', 'pink', 0, 0, 25),
    ('trend_scout', '트렌드 스카우터', '24시간 순찰 → Rising Star 발굴', '🕵️', 'yellow', 0, 0, 15),
    ('challenge_hunter', '챌린지 헌터', '챌린지/밈 탐지 → 최적 참여 타이밍 추천', '🏅', 'orange', 0, 0, 15),
    ('thumbnail_lab', '썸네일/제목 랩', '썸네일/제목 분석 → CTR 예측 및 최적화', '🔬', 'blue', 0, 0, 10);

-- ==================== 2. Devices 테이블 ====================
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    device_id TEXT NOT NULL UNIQUE,
    phoneboard_id INTEGER NOT NULL,
    slot_number INTEGER NOT NULL,
    status TEXT DEFAULT 'offline' CHECK (status IN ('active', 'idle', 'offline', 'error', 'maintenance')),
    current_activity TEXT REFERENCES activities(id),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    ip_address TEXT,
    model TEXT,
    android_version TEXT,
    battery_level INTEGER,
    temperature REAL,
    wifi_signal INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_board_slot UNIQUE (phoneboard_id, slot_number)
);

-- 인덱스
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_phoneboard ON devices(phoneboard_id);
CREATE INDEX idx_devices_activity ON devices(current_activity);

-- ==================== 3. Device Issues 테이블 ====================
CREATE TABLE device_issues (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('disconnected', 'error', 'maintenance', 'unknown')),
    description TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT false,
    notes TEXT
);

CREATE INDEX idx_device_issues_device ON device_issues(device_id);
CREATE INDEX idx_device_issues_resolved ON device_issues(resolved);

-- ==================== 4. DO Requests 테이블 (영상 시청 요청) ====================
CREATE TABLE do_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT DEFAULT 'youtube_watch',
    title TEXT NOT NULL,
    keyword TEXT NOT NULL,
    video_title TEXT,
    video_url TEXT,
    video_id TEXT,
    channel_name TEXT,
    
    -- 에이전트 설정
    agent_start INTEGER DEFAULT 1,
    agent_end INTEGER DEFAULT 6,
    batch_size INTEGER DEFAULT 5,
    
    -- 확률 설정 (0-100)
    like_probability INTEGER DEFAULT 30,
    comment_probability INTEGER DEFAULT 10,
    subscribe_probability INTEGER DEFAULT 5,
    
    -- 시청 설정
    watch_time_min INTEGER DEFAULT 60,
    watch_time_max INTEGER DEFAULT 180,
    
    -- AI 설정
    ai_comment_enabled BOOLEAN DEFAULT true,
    
    -- 스케줄링
    scheduled_at TIMESTAMP WITH TIME ZONE,
    execute_immediately BOOLEAN DEFAULT true,
    
    -- 상태
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
    
    -- 진행 상황
    total_agents INTEGER DEFAULT 0,
    completed_agents INTEGER DEFAULT 0,
    failed_agents INTEGER DEFAULT 0,
    
    -- 메모
    memo TEXT,
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_do_requests_status ON do_requests(status);
CREATE INDEX idx_do_requests_created ON do_requests(created_at DESC);

-- ==================== 5. Activity Logs 테이블 ====================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id),
    activity_id TEXT REFERENCES activities(id),
    do_request_id UUID REFERENCES do_requests(id),
    action TEXT,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_device ON activity_logs(device_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- ==================== 6. Notifications 테이블 ====================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'alert')),
    source_activity TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ==================== 7. 600대 디바이스 시드 데이터 생성 ====================
-- Board 1~19: 오프라인 (380대)
-- Board 20: 6대 온라인 (20-1 ~ 20-6), 14대 장애 (20-7 ~ 20-20)

DO $$
DECLARE
    board INTEGER;
    slot INTEGER;
    device_status TEXT;
    device_name TEXT;
BEGIN
    -- Board 1~19: 모든 슬롯 오프라인
    FOR board IN 1..19 LOOP
        FOR slot IN 1..20 LOOP
            device_name := board || '-' || slot;
            INSERT INTO devices (device_id, phoneboard_id, slot_number, status, ip_address)
            VALUES (device_name, board, slot, 'offline', NULL);
        END LOOP;
    END LOOP;
    
    -- Board 20: 슬롯 1~6 온라인, 슬롯 7~20 장애
    FOR slot IN 1..20 LOOP
        device_name := '20-' || slot;
        IF slot <= 6 THEN
            device_status := 'active';
            INSERT INTO devices (device_id, phoneboard_id, slot_number, status, ip_address, last_heartbeat)
            VALUES (device_name, 20, slot, device_status, '192.168.200.' || (100 + slot), NOW());
        ELSE
            device_status := 'error';
            INSERT INTO devices (device_id, phoneboard_id, slot_number, status, ip_address)
            VALUES (device_name, 20, slot, device_status, NULL);
        END IF;
    END LOOP;
END $$;

-- ==================== 8. 장치 장애 시드 데이터 생성 ====================
-- Board 1~19: 보드 미연결 장애
-- Board 20: 슬롯 7~20 장애

DO $$
DECLARE
    dev_record RECORD;
BEGIN
    -- Board 1~19 미연결 장애 등록
    FOR dev_record IN 
        SELECT id, device_id, phoneboard_id 
        FROM devices 
        WHERE phoneboard_id < 20
    LOOP
        INSERT INTO device_issues (device_id, issue_type, description)
        VALUES (dev_record.id, 'disconnected', 'Board ' || dev_record.phoneboard_id || ' 미연결 - 폰보드 점검 필요');
    END LOOP;
    
    -- Board 20 슬롯 7~20 장애 등록
    FOR dev_record IN 
        SELECT id, device_id 
        FROM devices 
        WHERE phoneboard_id = 20 AND slot_number > 6
    LOOP
        INSERT INTO device_issues (device_id, issue_type, description)
        VALUES (dev_record.id, 'error', '디바이스 ' || dev_record.device_id || ' 연결 실패 - 점검 요망');
    END LOOP;
END $$;

-- ==================== 9. 초기 알림 생성 ====================
INSERT INTO notifications (type, title, message) VALUES
    ('error', '⚠️ 디바이스 장애 감지', 'Board 1~19 미연결 (380대), Board 20 장애 (14대) - 총 394대 점검 필요'),
    ('success', '✅ Board 20 부분 연결', '20-1 ~ 20-6 정상 작동 중 (6대)'),
    ('info', '📋 시스템 초기화 완료', 'AIFarm 시스템이 초기화되었습니다.');

-- ==================== 10. Updated_at 자동 갱신 트리거 ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_do_requests_updated_at
    BEFORE UPDATE ON do_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================== 완료 메시지 ====================
-- 실행 후 확인:
-- SELECT COUNT(*) FROM devices; -- 600
-- SELECT COUNT(*) FROM devices WHERE status = 'active'; -- 6
-- SELECT COUNT(*) FROM device_issues WHERE resolved = false; -- 394
-- SELECT * FROM activities; -- 6개 활동


