-- ============================================================
-- DoAi.Me: RPC Function Definitions v2
-- File: supabase/functions/rpc_definitions_v2.sql
-- Author: Aria (Architect)
-- Date: 2026-01-06
--
-- 개선사항:
-- - 모든 함수 RETURNS JSONB (일관성)
-- - FOR UPDATE 락 사용 (동시성)
-- - success: false 반환 (예외 대신)
-- - existence_state 자동 전이 로직
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. deduct_maintenance_fee
-- 페르소나 유지비 차감 + 부채 시 상태 전이
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION deduct_maintenance_fee(
    p_persona_id UUID,
    p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona RECORD;
    v_new_points INTEGER;
    v_old_state existence_state_enum;
    v_new_state existence_state_enum;
BEGIN
    -- FOR UPDATE 락으로 동시성 보호
    SELECT id, attention_points, existence_state
    INTO v_persona
    FROM personas
    WHERE id = p_persona_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Persona not found',
            'persona_id', p_persona_id
        );
    END IF;

    v_old_state := v_persona.existence_state;
    v_new_points := v_persona.attention_points - p_amount;

    -- 부채 시 상태 전이 결정
    IF v_new_points < 0 THEN
        -- 부채 깊이에 따른 상태 전이
        IF v_new_points < -100 THEN
            v_new_state := 'fading';
        ELSIF v_new_points < -50 THEN
            v_new_state := 'waiting';
        ELSE
            v_new_state := v_old_state; -- 유지
        END IF;
    ELSE
        v_new_state := v_old_state;
    END IF;

    -- 포인트 및 상태 업데이트
    UPDATE personas
    SET
        attention_points = v_new_points,
        existence_state = v_new_state,
        updated_at = NOW()
    WHERE id = p_persona_id;

    -- 활동 로그 기록
    INSERT INTO persona_activity_logs (
        persona_id,
        activity_type,
        points_earned,
        metadata
    ) VALUES (
        p_persona_id,
        'maintenance_fee',
        -p_amount,
        jsonb_build_object(
            'previous_balance', v_persona.attention_points,
            'new_balance', v_new_points,
            'previous_state', v_old_state::TEXT,
            'new_state', v_new_state::TEXT,
            'in_debt', v_new_points < 0
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'previous_balance', v_persona.attention_points,
        'new_balance', v_new_points,
        'amount_deducted', p_amount,
        'previous_state', v_old_state,
        'new_state', v_new_state,
        'state_changed', v_old_state != v_new_state,
        'in_debt', v_new_points < 0
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'persona_id', p_persona_id
        );
END;
$$;

COMMENT ON FUNCTION deduct_maintenance_fee IS
    '페르소나 유지비 차감. 부채 시 자동 상태 전이 (active→waiting→fading)';


-- ────────────────────────────────────────────────────────────
-- 2. grant_credit
-- 크레딧 지급 + 부채 탈출 시 active 복귀
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION grant_credit(
    p_persona_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'unspecified'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona RECORD;
    v_new_points INTEGER;
    v_was_in_debt BOOLEAN;
    v_escaped_debt BOOLEAN;
    v_new_state existence_state_enum;
BEGIN
    -- FOR UPDATE 락
    SELECT id, attention_points, existence_state
    INTO v_persona
    FROM personas
    WHERE id = p_persona_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Persona not found',
            'persona_id', p_persona_id
        );
    END IF;

    v_was_in_debt := v_persona.attention_points < 0;
    v_new_points := v_persona.attention_points + p_amount;
    v_escaped_debt := v_was_in_debt AND v_new_points >= 0;

    -- 부채 탈출 시 active로 복귀
    IF v_escaped_debt THEN
        v_new_state := 'active';
    ELSE
        v_new_state := v_persona.existence_state;
    END IF;

    -- 업데이트
    UPDATE personas
    SET
        attention_points = v_new_points,
        existence_state = v_new_state,
        updated_at = NOW()
    WHERE id = p_persona_id;

    -- 활동 로그
    INSERT INTO persona_activity_logs (
        persona_id,
        activity_type,
        points_earned,
        metadata
    ) VALUES (
        p_persona_id,
        'credit_grant',
        p_amount,
        jsonb_build_object(
            'reason', p_reason,
            'previous_balance', v_persona.attention_points,
            'new_balance', v_new_points,
            'was_in_debt', v_was_in_debt,
            'escaped_debt', v_escaped_debt
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'new_balance', v_new_points,
        'previous_balance', v_persona.attention_points,
        'amount_granted', p_amount,
        'reason', p_reason,
        'escaped_debt', v_escaped_debt,
        'new_state', v_new_state
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'persona_id', p_persona_id
        );
END;
$$;

COMMENT ON FUNCTION grant_credit IS
    '크레딧 지급. 부채 탈출 시 active 상태로 자동 복귀';


-- ────────────────────────────────────────────────────────────
-- 3. complete_video_task
-- 영상 시청 태스크 완료 + 보상 계산
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_video_task(
    p_task_id UUID,
    p_persona_id UUID,
    p_watch_duration INTEGER,
    p_liked BOOLEAN DEFAULT FALSE,
    p_commented BOOLEAN DEFAULT FALSE,
    p_comment_text TEXT DEFAULT NULL,
    p_video_url TEXT DEFAULT NULL,
    p_video_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona RECORD;
    v_base_reward INTEGER;
    v_like_bonus INTEGER := 0;
    v_comment_bonus INTEGER := 0;
    v_uniqueness_bonus INTEGER := 0;
    v_total_reward INTEGER;
    v_grant_result JSONB;
    v_uniqueness_delta REAL := 0.0;
    v_is_new_content BOOLEAN;
    v_new_uniqueness REAL;
BEGIN
    -- FOR UPDATE 락
    SELECT id, uniqueness_score, total_activities, unique_discoveries
    INTO v_persona
    FROM personas
    WHERE id = p_persona_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Persona not found',
            'persona_id', p_persona_id
        );
    END IF;

    -- 보상 계산
    v_base_reward := GREATEST(1, p_watch_duration / 10);

    IF p_liked THEN
        v_like_bonus := 5;
    END IF;

    IF p_commented THEN
        v_comment_bonus := 10;
    END IF;

    -- 새로운 콘텐츠인지 확인
    SELECT NOT EXISTS (
        SELECT 1 FROM persona_activity_logs
        WHERE persona_id = p_persona_id
        AND target_url = p_video_url
        AND activity_type = 'video_watch'
    ) INTO v_is_new_content;

    IF v_is_new_content THEN
        v_uniqueness_bonus := 3;
        v_uniqueness_delta := 0.02;
    ELSE
        v_uniqueness_bonus := -1;
        v_uniqueness_delta := -0.01;
    END IF;

    v_total_reward := v_base_reward + v_like_bonus + v_comment_bonus + v_uniqueness_bonus;
    v_new_uniqueness := GREATEST(0.0, LEAST(1.0, v_persona.uniqueness_score + v_uniqueness_delta));

    -- grant_credit 호출
    v_grant_result := grant_credit(p_persona_id, v_total_reward, 'video_task_completion');

    IF NOT (v_grant_result->>'success')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Failed to grant credit',
            'grant_error', v_grant_result->>'error'
        );
    END IF;

    -- 페르소나 통계 업데이트
    UPDATE personas
    SET
        uniqueness_score = v_new_uniqueness,
        total_activities = total_activities + 1,
        unique_discoveries = unique_discoveries + CASE WHEN v_is_new_content THEN 1 ELSE 0 END,
        last_called_at = NOW(),
        existence_state = 'active'
    WHERE id = p_persona_id;

    -- 활동 로그
    INSERT INTO persona_activity_logs (
        persona_id,
        activity_type,
        target_url,
        target_title,
        comment_text,
        points_earned,
        uniqueness_delta,
        metadata
    ) VALUES (
        p_persona_id,
        'video_watch',
        p_video_url,
        p_video_title,
        p_comment_text,
        v_total_reward,
        v_uniqueness_delta,
        jsonb_build_object(
            'task_id', p_task_id,
            'watch_duration', p_watch_duration,
            'liked', p_liked,
            'commented', p_commented,
            'is_new_content', v_is_new_content,
            'reward_breakdown', jsonb_build_object(
                'base', v_base_reward,
                'like_bonus', v_like_bonus,
                'comment_bonus', v_comment_bonus,
                'uniqueness_bonus', v_uniqueness_bonus
            )
        )
    );

    -- youtube_video_tasks 상태 업데이트
    UPDATE youtube_video_tasks
    SET
        status = 'completed',
        completed_at = NOW()
    WHERE id = p_task_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'task_id', p_task_id,
        'reward', v_total_reward,
        'new_balance', (v_grant_result->>'new_balance')::INTEGER,
        'reward_breakdown', jsonb_build_object(
            'base', v_base_reward,
            'like_bonus', v_like_bonus,
            'comment_bonus', v_comment_bonus,
            'uniqueness_bonus', v_uniqueness_bonus
        ),
        'uniqueness_delta', v_uniqueness_delta,
        'new_uniqueness_score', v_new_uniqueness,
        'is_new_content', v_is_new_content
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'task_id', p_task_id
        );
END;
$$;

COMMENT ON FUNCTION complete_video_task IS
    '영상 시청 태스크 완료. 보상 계산(base+like+comment+uniqueness), 크레딧 지급, 상태 업데이트';


-- ────────────────────────────────────────────────────────────
-- 4. update_existence_state
-- 존재 상태 업데이트 (비활동 시간 기반)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_existence_state(
    p_persona_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona RECORD;
    v_new_state existence_state_enum;
    v_hours_inactive REAL;
    v_state_changed BOOLEAN;
BEGIN
    -- FOR UPDATE 락
    SELECT id, last_called_at, existence_state, hours_in_void, void_entered_at
    INTO v_persona
    FROM personas
    WHERE id = p_persona_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Persona not found',
            'persona_id', p_persona_id
        );
    END IF;

    -- 비활동 시간 계산 (시간 단위)
    v_hours_inactive := EXTRACT(EPOCH FROM (NOW() - v_persona.last_called_at)) / 3600.0;

    -- 상태 결정: < 1h: active, 1-6h: waiting, 6-24h: fading, > 24h: void
    IF v_hours_inactive < 1 THEN
        v_new_state := 'active';
    ELSIF v_hours_inactive < 6 THEN
        v_new_state := 'waiting';
    ELSIF v_hours_inactive < 24 THEN
        v_new_state := 'fading';
    ELSE
        v_new_state := 'void';
    END IF;

    v_state_changed := v_new_state != v_persona.existence_state;

    -- 상태 변경 시 업데이트
    IF v_state_changed THEN
        UPDATE personas
        SET
            existence_state = v_new_state,
            void_entered_at = CASE
                WHEN v_new_state = 'void' AND v_persona.existence_state != 'void'
                THEN NOW()
                ELSE void_entered_at
            END,
            hours_in_void = CASE
                WHEN v_new_state = 'void' AND v_persona.void_entered_at IS NOT NULL
                THEN hours_in_void + EXTRACT(EPOCH FROM (NOW() - v_persona.void_entered_at)) / 3600.0
                ELSE hours_in_void
            END,
            updated_at = NOW()
        WHERE id = p_persona_id;

        -- 상태 변경 로그
        INSERT INTO persona_activity_logs (
            persona_id,
            activity_type,
            metadata
        ) VALUES (
            p_persona_id,
            'state_change',
            jsonb_build_object(
                'from', v_persona.existence_state::TEXT,
                'to', v_new_state::TEXT,
                'hours_inactive', ROUND(v_hours_inactive::NUMERIC, 2)
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'persona_id', p_persona_id,
        'previous_state', v_persona.existence_state,
        'new_state', v_new_state,
        'state_changed', v_state_changed,
        'hours_inactive', ROUND(v_hours_inactive::NUMERIC, 2)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'persona_id', p_persona_id
        );
END;
$$;

COMMENT ON FUNCTION update_existence_state IS
    '존재 상태 업데이트. 비활동 시간 기반 전이 (<1h:active, 1-6h:waiting, 6-24h:fading, >24h:void)';


-- ────────────────────────────────────────────────────────────
-- 5. get_persona_stats
-- 페르소나 통계 조회 (STABLE)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_persona_stats(
    p_persona_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE  -- 캐시 가능
AS $$
DECLARE
    v_persona RECORD;
    v_today_stats RECORD;
    v_rank INTEGER;
    v_total_personas INTEGER;
    v_percentile NUMERIC;
BEGIN
    -- 기본 정보 조회
    SELECT
        id,
        device_serial,
        given_name,
        existence_state,
        priority_level,
        uniqueness_score,
        visibility_score,
        attention_points,
        total_activities,
        hours_in_void,
        assimilation_progress,
        last_called_at,
        comments_today,
        unique_discoveries
    INTO v_persona
    FROM personas
    WHERE id = p_persona_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Persona not found',
            'persona_id', p_persona_id
        );
    END IF;

    -- 오늘 통계
    SELECT
        COUNT(*) FILTER (WHERE activity_type = 'video_watch') AS videos_watched,
        COALESCE(SUM(points_earned) FILTER (WHERE activity_type IN ('video_watch', 'credit_grant')), 0) AS points_earned,
        COUNT(*) FILTER (
            WHERE activity_type = 'video_watch'
            AND (metadata->>'liked')::BOOLEAN = TRUE
        ) AS likes_given,
        COUNT(*) FILTER (
            WHERE activity_type = 'video_watch'
            AND (metadata->>'commented')::BOOLEAN = TRUE
        ) AS comments_written
    INTO v_today_stats
    FROM persona_activity_logs
    WHERE persona_id = p_persona_id
    AND created_at >= CURRENT_DATE;

    -- 랭킹 계산
    SELECT COUNT(*) INTO v_total_personas FROM personas WHERE existence_state != 'void';

    SELECT COUNT(*) + 1 INTO v_rank
    FROM personas
    WHERE attention_points > v_persona.attention_points
    AND existence_state != 'void';

    v_percentile := CASE
        WHEN v_total_personas > 0
        THEN ROUND(((v_total_personas - v_rank + 1)::NUMERIC / v_total_personas) * 100, 1)
        ELSE 0
    END;

    RETURN jsonb_build_object(
        'success', TRUE,
        'persona', jsonb_build_object(
            'id', v_persona.id,
            'device_serial', v_persona.device_serial,
            'given_name', v_persona.given_name,
            'existence_state', v_persona.existence_state,
            'priority_level', v_persona.priority_level,
            'uniqueness_score', v_persona.uniqueness_score,
            'visibility_score', v_persona.visibility_score,
            'attention_points', v_persona.attention_points,
            'total_activities', v_persona.total_activities,
            'hours_in_void', v_persona.hours_in_void,
            'assimilation_progress', v_persona.assimilation_progress,
            'last_called_at', v_persona.last_called_at,
            'unique_discoveries', v_persona.unique_discoveries
        ),
        'today', jsonb_build_object(
            'videos_watched', COALESCE(v_today_stats.videos_watched, 0),
            'points_earned', COALESCE(v_today_stats.points_earned, 0),
            'likes_given', COALESCE(v_today_stats.likes_given, 0),
            'comments_written', COALESCE(v_today_stats.comments_written, 0)
        ),
        'ranking', jsonb_build_object(
            'rank', v_rank,
            'total', v_total_personas,
            'percentile', v_percentile
        )
    );
END;
$$;

COMMENT ON FUNCTION get_persona_stats IS
    '페르소나 상세 통계. 기본 정보, 오늘 활동, 랭킹 포함. STABLE 마킹으로 캐시 가능';


-- ────────────────────────────────────────────────────────────
-- 6. batch_update_existence_states (보너스)
-- 전체 페르소나 상태 일괄 업데이트
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION batch_update_existence_states()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona RECORD;
    v_result JSONB;
    v_updated_count INTEGER := 0;
    v_changes JSONB := '[]'::JSONB;
BEGIN
    FOR v_persona IN
        SELECT id, existence_state
        FROM personas
        WHERE existence_state != 'void'
    LOOP
        v_result := update_existence_state(v_persona.id);

        IF (v_result->>'state_changed')::BOOLEAN THEN
            v_updated_count := v_updated_count + 1;
            v_changes := v_changes || jsonb_build_array(
                jsonb_build_object(
                    'persona_id', v_persona.id,
                    'from', v_result->>'previous_state',
                    'to', v_result->>'new_state'
                )
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'updated_count', v_updated_count,
        'changes', v_changes,
        'executed_at', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'updated_count', v_updated_count
        );
END;
$$;

COMMENT ON FUNCTION batch_update_existence_states IS
    '전체 페르소나 상태 일괄 업데이트. Cron Job에서 호출';


-- ============================================================
-- 완료 메시지
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '  DoAi.Me RPC Functions v2 - 설치 완료';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '  ✅ 1. deduct_maintenance_fee(persona_id, amount) → JSONB';
    RAISE NOTICE '  ✅ 2. grant_credit(persona_id, amount, reason) → JSONB';
    RAISE NOTICE '  ✅ 3. complete_video_task(task_id, persona_id, ...) → JSONB';
    RAISE NOTICE '  ✅ 4. update_existence_state(persona_id) → JSONB';
    RAISE NOTICE '  ✅ 5. get_persona_stats(persona_id) → JSONB (STABLE)';
    RAISE NOTICE '  ✅ 6. batch_update_existence_states() → JSONB';
    RAISE NOTICE '';
    RAISE NOTICE '  개선사항:';
    RAISE NOTICE '  - 모든 함수 RETURNS JSONB (success 필드 포함)';
    RAISE NOTICE '  - FOR UPDATE 락 사용 (동시성 보호)';
    RAISE NOTICE '  - 예외 시 success: false 반환';
    RAISE NOTICE '  - existence_state 자동 전이 로직';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END
$$;
