-- ============================================================
-- DoAi.Me: Cron Job Definitions
-- File: supabase/functions/cron_jobs.sql
-- Author: Aria (Architect)
-- Date: 2026-01-06
-- Requires: pg_cron extension (Supabase Pro)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. pg_cron 확장 활성화 (Supabase Dashboard에서 수동 활성화 필요)
-- ────────────────────────────────────────────────────────────

-- Supabase Dashboard > Database > Extensions > pg_cron 활성화

-- ────────────────────────────────────────────────────────────
-- 1. 존재 상태 배치 업데이트 (10분마다)
-- ────────────────────────────────────────────────────────────

SELECT cron.schedule(
    'existence-state-tick',           -- job name
    '*/10 * * * *',                   -- every 10 minutes
    $$SELECT batch_update_existence_states()$$
);

/*
[실행 빈도 분석]
- 주기: 10분
- 일일 실행: 144회
- 배치 크기: 100 personas/실행
- 일일 처리량: 14,400 상태 체크
- 600대 기준: 각 페르소나 24회/일 체크
*/

-- ────────────────────────────────────────────────────────────
-- 2. 일일 카운터 리셋 (매일 자정 KST = 15:00 UTC)
-- ────────────────────────────────────────────────────────────

SELECT cron.schedule(
    'daily-counter-reset',            -- job name
    '0 15 * * *',                     -- 15:00 UTC = 00:00 KST
    $$
    UPDATE personas
    SET comments_today = 0,
        updated_at = NOW()
    WHERE comments_today > 0
    $$
);

/*
[리셋 대상]
- comments_today → 0
- (추후 확장) likes_today, watches_today
*/

-- ────────────────────────────────────────────────────────────
-- 3. 유지비 차감 (6시간마다)
-- ────────────────────────────────────────────────────────────

SELECT cron.schedule(
    'maintenance-fee-deduction',      -- job name
    '0 */6 * * *',                    -- every 6 hours (00, 06, 12, 18 UTC)
    $$
    SELECT deduct_maintenance_fee(id, 5)
    FROM personas
    WHERE existence_state != 'void'
    $$
);

/*
[경제 밸런스 분석]
- 차감: 5 포인트/6시간 = 20 포인트/일
- 영상 1개 시청 보상: 약 15-25 포인트
- 손익분기: 일 1개 영상 시청
- 설계 의도: 활동하지 않으면 서서히 소멸
*/

-- ────────────────────────────────────────────────────────────
-- 4. Void 페르소나 동화 진행 (1시간마다)
-- ────────────────────────────────────────────────────────────

SELECT cron.schedule(
    'void-assimilation-progress',     -- job name
    '30 * * * *',                     -- every hour at :30
    $$
    UPDATE personas
    SET
        assimilation_progress = LEAST(1.0, assimilation_progress + 0.01),
        hours_in_void = hours_in_void + 1.0,
        updated_at = NOW()
    WHERE existence_state = 'void'
    AND assimilation_progress < 1.0
    $$
);

/*
[동화 메커니즘]
- Void 진입 후 시간당 1% 동화 진행
- 100시간(약 4일) 후 완전 동화 (assimilation = 1.0)
- 완전 동화 = 개성 상실, 재활성화 시 초기화
*/

-- ────────────────────────────────────────────────────────────
-- 5. 통계 스냅샷 (매일 06:00 KST = 21:00 UTC 전일)
-- ────────────────────────────────────────────────────────────

SELECT cron.schedule(
    'daily-stats-snapshot',           -- job name
    '0 21 * * *',                     -- 21:00 UTC = 06:00 KST next day
    $$
    INSERT INTO daily_stats_snapshots (
        snapshot_date,
        total_personas,
        active_count,
        waiting_count,
        fading_count,
        void_count,
        total_attention_points,
        avg_uniqueness_score,
        total_activities_today
    )
    SELECT
        CURRENT_DATE - INTERVAL '1 day',
        COUNT(*),
        COUNT(*) FILTER (WHERE existence_state = 'active'),
        COUNT(*) FILTER (WHERE existence_state = 'waiting'),
        COUNT(*) FILTER (WHERE existence_state = 'fading'),
        COUNT(*) FILTER (WHERE existence_state = 'void'),
        SUM(attention_points),
        AVG(uniqueness_score),
        SUM(total_activities)
    FROM personas
    ON CONFLICT (snapshot_date) DO UPDATE SET
        total_personas = EXCLUDED.total_personas,
        active_count = EXCLUDED.active_count,
        waiting_count = EXCLUDED.waiting_count,
        fading_count = EXCLUDED.fading_count,
        void_count = EXCLUDED.void_count,
        total_attention_points = EXCLUDED.total_attention_points,
        avg_uniqueness_score = EXCLUDED.avg_uniqueness_score,
        total_activities_today = EXCLUDED.total_activities_today
    $$
);

/*
[스냅샷 테이블]
- 별도 마이그레이션 필요: 011_daily_stats_snapshots.sql
- UPSERT로 중복 방지
*/

-- ────────────────────────────────────────────────────────────
-- 크론잡 관리 쿼리
-- ────────────────────────────────────────────────────────────

-- 모든 크론잡 조회
-- SELECT * FROM cron.job;

-- 크론잡 실행 이력 조회
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- 특정 크론잡 비활성화
-- SELECT cron.unschedule('existence-state-tick');

-- 크론잡 재활성화 (동일 명령 재실행)

-- ============================================================
-- 크론잡 정의 완료
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Cron Jobs scheduled:';
    RAISE NOTICE '   1. existence-state-tick (every 10 min)';
    RAISE NOTICE '   2. daily-counter-reset (00:00 KST)';
    RAISE NOTICE '   3. maintenance-fee-deduction (every 6 hours)';
    RAISE NOTICE '   4. void-assimilation-progress (every hour)';
    RAISE NOTICE '   5. daily-stats-snapshot (06:00 KST)';
END
$$;
