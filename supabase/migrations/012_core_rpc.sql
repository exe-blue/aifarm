-- ============================================================
-- DoAi.Me: Core RPC Functions (Task 2)
-- File: supabase/migrations/012_core_rpc.sql
-- Description: 디바이스(페르소나)와 상호작용하기 위한 핵심 함수들
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. 사전 요구사항: youtube_video_tasks 테이블
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS youtube_video_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_serial TEXT, -- 할당된 디바이스 (NULL이면 미할당)
    video_url TEXT NOT NULL,
    video_title TEXT,
    channel_name TEXT,
    
    -- 상태: pending, running, completed, failed
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    
    -- 작업 지시 사항
    target_duration INTEGER DEFAULT 60,
    should_like BOOLEAN DEFAULT false,
    should_comment BOOLEAN DEFAULT false,
    comment_text TEXT,
    
    -- 작업 결과
    watch_duration INTEGER,
    is_liked BOOLEAN,
    is_commented BOOLEAN,
    error_message TEXT,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 디바이스별 대기 작업 조회용
CREATE INDEX IF NOT EXISTS idx_video_tasks_fetch 
ON youtube_video_tasks(device_serial, status, priority DESC);


-- ────────────────────────────────────────────────────────────
-- 1. log_activity (활동 로그 기록)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_activity(
    p_persona_id UUID,
    p_activity_type TEXT,
    p_target_url TEXT DEFAULT NULL,
    p_target_title TEXT DEFAULT NULL,
    p_comment_text TEXT DEFAULT NULL,
    p_points INTEGER DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- 로그 삽입
    INSERT INTO persona_activity_logs (
        persona_id, activity_type, target_url, target_title, 
        comment_text, points_earned, metadata
    )
    VALUES (
        p_persona_id, p_activity_type, p_target_url, p_target_title,
        p_comment_text, p_points, p_metadata
    )
    RETURNING id INTO v_log_id;

    -- 페르소나 통계 및 포인트 업데이트
    UPDATE personas
    SET 
        total_activities = COALESCE(total_activities, 0) + 1,
        attention_points = COALESCE(attention_points, 0) + p_points,
        comments_today = CASE WHEN p_activity_type = 'comment' THEN COALESCE(comments_today, 0) + 1 ELSE comments_today END,
        last_called_at = NOW()
    WHERE id = p_persona_id;

    RETURN v_log_id;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 2. device_heartbeat (디바이스 생존 신고)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION device_heartbeat(
    p_device_serial TEXT,
    p_node_id TEXT,
    p_battery INTEGER DEFAULT NULL,
    p_status TEXT DEFAULT 'online'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona_id UUID;
BEGIN
    -- 페르소나 조회
    SELECT id INTO v_persona_id FROM personas WHERE device_serial = p_device_serial;

    IF v_persona_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'device_not_found');
    END IF;

    -- 상태 업데이트 (Active로 전환)
    UPDATE personas
    SET 
        last_called_at = NOW(),
        existence_state = 'active',
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb), 
            '{device_status}', 
            jsonb_build_object('node_id', p_node_id, 'battery', p_battery, 'status', p_status, 'last_seen', NOW())
        )
    WHERE id = v_persona_id;

    RETURN jsonb_build_object('success', true, 'persona_id', v_persona_id);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 3. get_next_task_for_device (작업 할당)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_next_task_for_device(
    p_device_serial TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task RECORD;
BEGIN
    -- 할당된 Pending 작업 조회 (SKIP LOCKED로 동시성 제어)
    SELECT * INTO v_task
    FROM youtube_video_tasks
    WHERE device_serial = p_device_serial
      AND status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_task IS NULL THEN
        RETURN NULL;
    END IF;

    -- 상태를 running으로 변경
    UPDATE youtube_video_tasks
    SET status = 'running', started_at = NOW(), updated_at = NOW()
    WHERE id = v_task.id;

    RETURN jsonb_build_object(
        'id', v_task.id,
        'video_url', v_task.video_url,
        'video_title', v_task.video_title,
        'target_duration', v_task.target_duration,
        'should_like', v_task.should_like,
        'should_comment', v_task.should_comment,
        'comment_text', v_task.comment_text
    );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. complete_video_task (작업 완료)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_video_task(
    p_task_id UUID,
    p_watch_duration INTEGER,
    p_liked BOOLEAN,
    p_commented BOOLEAN,
    p_comment_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task RECORD;
    v_persona_id UUID;
    v_points INTEGER := 10; -- 기본 보상
BEGIN
    SELECT * INTO v_task FROM youtube_video_tasks WHERE id = p_task_id;
    
    IF v_task IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'task_not_found');
    END IF;

    -- 페르소나 ID 조회
    SELECT id INTO v_persona_id FROM personas WHERE device_serial = v_task.device_serial;

    -- 보상 계산
    IF p_liked THEN v_points := v_points + 5; END IF;
    IF p_commented THEN v_points := v_points + 15; END IF;

    -- 태스크 업데이트
    UPDATE youtube_video_tasks
    SET 
        status = 'completed',
        completed_at = NOW(),
        watch_duration = p_watch_duration,
        is_liked = p_liked,
        is_commented = p_commented,
        updated_at = NOW()
    WHERE id = p_task_id;

    -- 활동 로그 기록
    PERFORM log_activity(
        v_persona_id,
        'video_watch',
        v_task.video_url,
        v_task.video_title,
        p_comment_text,
        v_points,
        jsonb_build_object('task_id', p_task_id, 'duration', p_watch_duration)
    );

    RETURN jsonb_build_object('success', true, 'points_earned', v_points);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. update_persona_state (상태 변경)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_persona_state(
    p_persona_id UUID,
    p_state existence_state_enum
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE personas
    SET 
        existence_state = p_state,
        void_entered_at = CASE WHEN p_state = 'void' THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_persona_id;
    
    RETURN FOUND;
END;
$$;