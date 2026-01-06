-- ============================================================
-- DoAi.Me: Complete Schema Consolidation
-- Migration 014: 누락 테이블/컬럼 보완 및 대시보드 연동 준비
--
-- 이 마이그레이션은 기존 스키마의 빈틈을 채우고
-- 대시보드 실데이터 연동을 위한 최종 정리를 수행합니다.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. personas 테이블 보완
-- 기존: 008, 010에서 생성/확장
-- 추가: 대시보드 연동 필수 컬럼
-- ════════════════════════════════════════════════════════════

-- id 컬럼이 없으면 추가 (personas.id 참조용)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'personas' AND column_name = 'id'
    ) THEN
        -- persona_id를 id로 사용하거나 id 추가
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'personas' AND column_name = 'persona_id'
        ) THEN
            ALTER TABLE personas RENAME COLUMN persona_id TO id;
        ELSE
            ALTER TABLE personas ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
        END IF;
    END IF;
END $$;

-- 대시보드 표시용 컬럼 추가
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS google_account_id UUID,
ADD COLUMN IF NOT EXISTS phone_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS android_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_personas_is_online ON personas(is_online);
CREATE INDEX IF NOT EXISTS idx_personas_last_seen ON personas(last_seen_at DESC);

-- ════════════════════════════════════════════════════════════
-- 2. youtube_video_tasks 대시보드용 확장
-- 기존: 007에서 생성 (video_id 참조 방식)
-- 추가: 독립 태스크 지원 (video_url 직접 저장)
-- ════════════════════════════════════════════════════════════

-- 직접 태스크 생성 지원 컬럼 추가
ALTER TABLE youtube_video_tasks
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_title TEXT,
ADD COLUMN IF NOT EXISTS channel_name TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS target_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS should_like BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS should_comment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS comment_template TEXT,
ADD COLUMN IF NOT EXISTS node_id TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID;

-- 기존 컬럼 정리 (persona_id 참조 추가)
DO $$
BEGIN
    -- persona_id 컬럼이 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'youtube_video_tasks' AND column_name = 'persona_id'
    ) THEN
        ALTER TABLE youtube_video_tasks ADD COLUMN persona_id UUID;
    END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_tasks_persona ON youtube_video_tasks(persona_id);
CREATE INDEX IF NOT EXISTS idx_tasks_node ON youtube_video_tasks(node_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_at ON youtube_video_tasks(assigned_at DESC);

-- ════════════════════════════════════════════════════════════
-- 3. watch_targets 테이블 보완
-- 기존: 011에서 간단 버전 생성
-- 추가: 대시보드 CRUD 지원
-- ════════════════════════════════════════════════════════════

ALTER TABLE watch_targets
ADD COLUMN IF NOT EXISTS target_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS target_url TEXT,
ADD COLUMN IF NOT EXISTS default_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS default_should_like BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS default_should_comment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS videos_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_video_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by UUID;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_watch_targets_last_checked ON watch_targets(last_checked DESC);

-- ════════════════════════════════════════════════════════════
-- 4. daily_stats_snapshots 테이블 (대시보드 통계용)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS daily_stats_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- 페르소나 통계
    total_personas INTEGER DEFAULT 0,
    active_count INTEGER DEFAULT 0,
    waiting_count INTEGER DEFAULT 0,
    fading_count INTEGER DEFAULT 0,
    void_count INTEGER DEFAULT 0,

    -- 활동 통계
    total_activities INTEGER DEFAULT 0,
    videos_watched INTEGER DEFAULT 0,
    likes_given INTEGER DEFAULT 0,
    comments_written INTEGER DEFAULT 0,

    -- 크레딧 통계
    total_points_earned INTEGER DEFAULT 0,
    total_points_spent INTEGER DEFAULT 0,

    -- 인프라 통계
    online_devices INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    failed_tasks INTEGER DEFAULT 0,

    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats_snapshots(snapshot_date DESC);

-- ════════════════════════════════════════════════════════════
-- 5. 스냅샷 생성 함수 (Cron용)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_daily_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_date DATE := CURRENT_DATE;
    v_total_personas INTEGER;
    v_active INTEGER;
    v_waiting INTEGER;
    v_fading INTEGER;
    v_void INTEGER;
    v_activities INTEGER;
    v_videos INTEGER;
    v_likes INTEGER;
    v_comments INTEGER;
    v_points_earned INTEGER;
    v_points_spent INTEGER;
    v_online INTEGER;
    v_completed INTEGER;
    v_failed INTEGER;
BEGIN
    -- 페르소나 통계
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE existence_state = 'active'),
        COUNT(*) FILTER (WHERE existence_state = 'waiting'),
        COUNT(*) FILTER (WHERE existence_state = 'fading'),
        COUNT(*) FILTER (WHERE existence_state = 'void')
    INTO v_total_personas, v_active, v_waiting, v_fading, v_void
    FROM personas;

    -- 오늘 활동 통계
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(COUNT(*) FILTER (WHERE activity_type = 'video_watch'), 0),
        COALESCE(COUNT(*) FILTER (WHERE activity_type = 'like' OR (metadata->>'liked')::boolean = true), 0),
        COALESCE(COUNT(*) FILTER (WHERE activity_type = 'comment' OR (metadata->>'commented')::boolean = true), 0),
        COALESCE(SUM(CASE WHEN points_earned > 0 THEN points_earned ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN points_earned < 0 THEN ABS(points_earned) ELSE 0 END), 0)
    INTO v_activities, v_videos, v_likes, v_comments, v_points_earned, v_points_spent
    FROM persona_activity_logs
    WHERE created_at >= v_date AND created_at < v_date + INTERVAL '1 day';

    -- 온라인 디바이스 (최근 5분 내 하트비트)
    SELECT COUNT(*)
    INTO v_online
    FROM personas
    WHERE last_called_at > NOW() - INTERVAL '5 minutes';

    -- 오늘 태스크 통계
    SELECT
        COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0),
        COALESCE(COUNT(*) FILTER (WHERE status = 'failed'), 0)
    INTO v_completed, v_failed
    FROM youtube_video_tasks
    WHERE created_at >= v_date AND created_at < v_date + INTERVAL '1 day';

    -- 스냅샷 저장 (upsert)
    INSERT INTO daily_stats_snapshots (
        snapshot_date,
        total_personas, active_count, waiting_count, fading_count, void_count,
        total_activities, videos_watched, likes_given, comments_written,
        total_points_earned, total_points_spent,
        online_devices, completed_tasks, failed_tasks
    ) VALUES (
        v_date,
        v_total_personas, v_active, v_waiting, v_fading, v_void,
        v_activities, v_videos, v_likes, v_comments,
        v_points_earned, v_points_spent,
        v_online, v_completed, v_failed
    )
    ON CONFLICT (snapshot_date) DO UPDATE SET
        total_personas = EXCLUDED.total_personas,
        active_count = EXCLUDED.active_count,
        waiting_count = EXCLUDED.waiting_count,
        fading_count = EXCLUDED.fading_count,
        void_count = EXCLUDED.void_count,
        total_activities = EXCLUDED.total_activities,
        videos_watched = EXCLUDED.videos_watched,
        likes_given = EXCLUDED.likes_given,
        comments_written = EXCLUDED.comments_written,
        total_points_earned = EXCLUDED.total_points_earned,
        total_points_spent = EXCLUDED.total_points_spent,
        online_devices = EXCLUDED.online_devices,
        completed_tasks = EXCLUDED.completed_tasks,
        failed_tasks = EXCLUDED.failed_tasks,
        created_at = NOW();
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 6. 대시보드용 집계 뷰
-- ════════════════════════════════════════════════════════════

-- 실시간 대시보드 통계 뷰
CREATE OR REPLACE VIEW dashboard_realtime_stats AS
SELECT
    -- 페르소나 통계
    COUNT(*) AS total_personas,
    COUNT(*) FILTER (WHERE existence_state = 'active') AS active_count,
    COUNT(*) FILTER (WHERE existence_state = 'waiting') AS waiting_count,
    COUNT(*) FILTER (WHERE existence_state = 'fading') AS fading_count,
    COUNT(*) FILTER (WHERE existence_state = 'void') AS void_count,

    -- 온라인 상태 (최근 5분)
    COUNT(*) FILTER (WHERE last_called_at > NOW() - INTERVAL '5 minutes') AS online_now,

    -- 포인트 통계
    COALESCE(SUM(attention_points), 0) AS total_points,
    COALESCE(AVG(attention_points), 0) AS avg_points,

    -- 활동 통계
    COALESCE(SUM(total_activities), 0) AS total_activities,
    COALESCE(AVG(uniqueness_score), 0.5) AS avg_uniqueness,

    NOW() AS snapshot_at
FROM personas;

-- 태스크 큐 상태 뷰
CREATE OR REPLACE VIEW dashboard_task_queue AS
SELECT
    status,
    COUNT(*) AS count,
    MIN(created_at) AS oldest,
    MAX(created_at) AS newest
FROM youtube_video_tasks
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- ════════════════════════════════════════════════════════════
-- 7. 대시보드용 RPC 함수
-- ════════════════════════════════════════════════════════════

-- 태스크 직접 생성 (대시보드에서)
CREATE OR REPLACE FUNCTION create_video_task(
    p_video_url TEXT,
    p_video_title TEXT DEFAULT NULL,
    p_target_duration INTEGER DEFAULT 60,
    p_should_like BOOLEAN DEFAULT FALSE,
    p_should_comment BOOLEAN DEFAULT FALSE,
    p_comment_template TEXT DEFAULT NULL,
    p_priority INTEGER DEFAULT 5,
    p_target_personas UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task_id UUID;
    v_persona_id UUID;
BEGIN
    -- 특정 페르소나가 지정되지 않으면 랜덤 선택
    IF p_target_personas IS NULL THEN
        SELECT id INTO v_persona_id
        FROM personas
        WHERE existence_state = 'active'
        ORDER BY random()
        LIMIT 1;
    ELSE
        v_persona_id := p_target_personas[1];
    END IF;

    INSERT INTO youtube_video_tasks (
        video_url,
        video_title,
        target_duration,
        should_like,
        should_comment,
        comment_template,
        priority,
        persona_id,
        status,
        created_at
    ) VALUES (
        p_video_url,
        p_video_title,
        p_target_duration,
        p_should_like,
        p_should_comment,
        p_comment_template,
        p_priority,
        v_persona_id,
        'pending',
        NOW()
    )
    RETURNING task_id INTO v_task_id;

    RETURN v_task_id;
END;
$$;

-- Watch Target 등록 (대시보드에서)
CREATE OR REPLACE FUNCTION register_watch_target(
    p_target_type TEXT,
    p_target_id TEXT,
    p_target_name TEXT,
    p_target_url TEXT DEFAULT NULL,
    p_check_interval INTEGER DEFAULT 300,
    p_priority INTEGER DEFAULT 5,
    p_default_duration INTEGER DEFAULT 60
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_id UUID;
BEGIN
    INSERT INTO watch_targets (
        target_type,
        target_id,
        target_name,
        target_url,
        check_interval_seconds,
        priority_score,
        default_duration,
        is_active,
        created_at
    ) VALUES (
        p_target_type,
        p_target_id,
        p_target_name,
        p_target_url,
        p_check_interval,
        p_priority,
        p_default_duration,
        TRUE,
        NOW()
    )
    ON CONFLICT (target_type, target_id) DO UPDATE SET
        target_name = EXCLUDED.target_name,
        target_url = EXCLUDED.target_url,
        check_interval_seconds = EXCLUDED.check_interval_seconds,
        priority_score = EXCLUDED.priority_score,
        default_duration = EXCLUDED.default_duration,
        is_active = TRUE,
        updated_at = NOW()
    RETURNING id INTO v_target_id;

    RETURN v_target_id;
END;
$$;

-- 7일간 통계 조회
CREATE OR REPLACE FUNCTION get_weekly_stats()
RETURNS TABLE (
    snapshot_date DATE,
    total_activities INTEGER,
    videos_watched INTEGER,
    likes_given INTEGER,
    comments_written INTEGER,
    active_count INTEGER,
    void_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dss.snapshot_date,
        dss.total_activities,
        dss.videos_watched,
        dss.likes_given,
        dss.comments_written,
        dss.active_count,
        dss.void_count
    FROM daily_stats_snapshots dss
    WHERE dss.snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY dss.snapshot_date DESC;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 8. Cron Job 등록 (스냅샷 자동 생성)
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- 기존 스케줄 제거
        PERFORM cron.unschedule(jobid)
        FROM cron.job
        WHERE jobname = 'daily-stats-snapshot';

        -- 매일 자정에 스냅샷 생성
        PERFORM cron.schedule(
            'daily-stats-snapshot',
            '0 0 * * *',
            $$SELECT create_daily_snapshot()$$
        );

        RAISE NOTICE 'Cron job scheduled: daily-stats-snapshot';
    ELSE
        RAISE NOTICE 'pg_cron not available. Enable it in Supabase Dashboard.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error scheduling cron: %', SQLERRM;
END
$$;

-- ════════════════════════════════════════════════════════════
-- 9. RLS 정책 추가
-- ════════════════════════════════════════════════════════════

ALTER TABLE daily_stats_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_stats_read_all" ON daily_stats_snapshots
    FOR SELECT USING (true);

-- ════════════════════════════════════════════════════════════
-- 완료 메시지
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 014 완료';
    RAISE NOTICE '   - personas: 대시보드용 컬럼 추가';
    RAISE NOTICE '   - youtube_video_tasks: 직접 생성 지원';
    RAISE NOTICE '   - watch_targets: CRUD 지원';
    RAISE NOTICE '   - daily_stats_snapshots: 통계 테이블';
    RAISE NOTICE '   - dashboard_realtime_stats: 실시간 뷰';
    RAISE NOTICE '   - create_video_task(): 태스크 생성 RPC';
    RAISE NOTICE '   - register_watch_target(): 채널 등록 RPC';
    RAISE NOTICE '   - get_weekly_stats(): 주간 통계 RPC';
END $$;

-- ============================================================
-- END OF MIGRATION 014
-- ============================================================
