-- ============================================================
-- DoAi.Me: Add Subscribe Feature (Task 9)
-- File: supabase/migrations/014_add_subscribe_feature.sql
-- Description: 유튜브 구독 기능 지원을 위한 스키마 및 RPC 업데이트
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. youtube_video_tasks 테이블 컬럼 추가
-- ────────────────────────────────────────────────────────────

ALTER TABLE youtube_video_tasks
ADD COLUMN IF NOT EXISTS should_subscribe BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT false;

-- ────────────────────────────────────────────────────────────
-- 2. get_next_task_for_device 함수 업데이트
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
        'should_subscribe', v_task.should_subscribe, -- 추가됨
        'comment_text', v_task.comment_text
    );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. complete_video_task 함수 업데이트
-- ────────────────────────────────────────────────────────────

-- 기존 함수 삭제 (파라미터 변경을 위해)
DROP FUNCTION IF EXISTS complete_video_task(UUID, INTEGER, BOOLEAN, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION complete_video_task(
    p_task_id UUID,
    p_watch_duration INTEGER,
    p_liked BOOLEAN,
    p_commented BOOLEAN,
    p_subscribed BOOLEAN DEFAULT FALSE, -- 추가됨
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
    IF p_subscribed THEN v_points := v_points + 20; END IF; -- 구독 보상 추가

    -- 태스크 업데이트
    UPDATE youtube_video_tasks
    SET 
        status = 'completed',
        completed_at = NOW(),
        watch_duration = p_watch_duration,
        is_liked = p_liked,
        is_commented = p_commented,
        is_subscribed = p_subscribed, -- 결과 기록
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
        jsonb_build_object(
            'task_id', p_task_id, 
            'duration', p_watch_duration,
            'subscribed', p_subscribed
        )
    );

    RETURN jsonb_build_object('success', true, 'points_earned', v_points);
END;
$$;