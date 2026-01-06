-- ============================================================
-- DoAi.Me: Daily Stats Snapshots Migration
-- File: supabase/migrations/011_daily_stats_snapshots.sql
-- Author: Aria (Architect)
-- Date: 2026-01-06
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. 일일 통계 스냅샷 테이블
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_stats_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 스냅샷 날짜 (유니크)
    snapshot_date DATE UNIQUE NOT NULL,

    -- 페르소나 수
    total_personas INTEGER DEFAULT 0,
    active_count INTEGER DEFAULT 0,
    waiting_count INTEGER DEFAULT 0,
    fading_count INTEGER DEFAULT 0,
    void_count INTEGER DEFAULT 0,

    -- 경제 지표
    total_attention_points BIGINT DEFAULT 0,
    avg_uniqueness_score REAL DEFAULT 0.5,

    -- 활동 지표
    total_activities_today INTEGER DEFAULT 0,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. 인덱스
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_snapshots_date
ON daily_stats_snapshots(snapshot_date DESC);

-- ────────────────────────────────────────────────────────────
-- 3. 코멘트
-- ────────────────────────────────────────────────────────────

COMMENT ON TABLE daily_stats_snapshots IS
    'DoAi.Me 일일 통계 스냅샷 - 대시보드 및 트렌드 분석용';

COMMENT ON COLUMN daily_stats_snapshots.snapshot_date IS
    '스냅샷 기준 날짜 (KST 기준)';

COMMENT ON COLUMN daily_stats_snapshots.total_attention_points IS
    '전체 페르소나 어텐션 포인트 합계';

COMMENT ON COLUMN daily_stats_snapshots.avg_uniqueness_score IS
    '전체 페르소나 고유성 점수 평균';

-- ────────────────────────────────────────────────────────────
-- 4. RLS (Row Level Security)
-- ────────────────────────────────────────────────────────────

ALTER TABLE daily_stats_snapshots ENABLE ROW LEVEL SECURITY;

-- 서비스 롤 전체 접근
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'service_role_snapshots_access'
        AND tablename = 'daily_stats_snapshots'
    ) THEN
        CREATE POLICY service_role_snapshots_access
        ON daily_stats_snapshots
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;

-- ============================================================
-- 마이그레이션 완료
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 011_daily_stats_snapshots completed';
    RAISE NOTICE '   - daily_stats_snapshots table created';
    RAISE NOTICE '   - Index on snapshot_date created';
    RAISE NOTICE '   - RLS enabled';
END
$$;
