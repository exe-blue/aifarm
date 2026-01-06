-- ============================================================
-- DoAi.Me: Cron Jobs & Periodic Tasks (Task 3)
-- File: supabase/migrations/013_cron_jobs.sql
-- Description: 페르소나 상태 자동 업데이트 및 유지보수 작업
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. update_persona_existence_states (상태 자동 변경 함수)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_persona_existence_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Active -> Waiting (1시간 이상 미활동)
    UPDATE personas
    SET 
        existence_state = 'waiting', 
        updated_at = NOW()
    WHERE existence_state = 'active'
      AND last_called_at < NOW() - INTERVAL '1 hour';

    -- 2. Waiting -> Fading (6시간 이상 미활동)
    UPDATE personas
    SET 
        existence_state = 'fading', 
        updated_at = NOW()
    WHERE existence_state = 'waiting'
      AND last_called_at < NOW() - INTERVAL '6 hours';

    -- 3. Fading -> Void (24시간 이상 미활동)
    UPDATE personas
    SET 
        existence_state = 'void', 
        void_entered_at = NOW(),
        updated_at = NOW()
    WHERE existence_state = 'fading'
      AND last_called_at < NOW() - INTERVAL '24 hours';

    -- 4. Void 상태 지속 시간 업데이트 (통계용)
    UPDATE personas
    SET hours_in_void = EXTRACT(EPOCH FROM (NOW() - void_entered_at)) / 3600
    WHERE existence_state = 'void'
      AND void_entered_at IS NOT NULL;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. pg_cron 설정 (주기적 실행)
-- ────────────────────────────────────────────────────────────

-- pg_cron 확장이 설치되어 있는지 확인하고 스케줄 등록
DO $$
BEGIN
    -- pg_cron 확장이 존재하는지 확인 (pg_extension 카탈로그 조회)
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        
        -- 기존 스케줄 제거 (이름 기반으로 jobid 조회 후 삭제)
        PERFORM cron.unschedule(jobid)
        FROM cron.job
        WHERE jobname = 'update-persona-states';

        -- 10분마다 상태 업데이트 실행
        PERFORM cron.schedule(
            'update-persona-states',
            '*/10 * * * *',
            $$SELECT update_persona_existence_states()$$
        );
        
        RAISE NOTICE 'Cron job scheduled: update-persona-states';
    ELSE
        RAISE NOTICE 'pg_cron extension not found. Please enable it in Supabase Dashboard (Database > Extensions).';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error scheduling cron job: %', SQLERRM;
END
$$;