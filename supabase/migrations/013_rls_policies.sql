-- ============================================================
-- DoAi.Me: Row Level Security Policies
-- Migration 013: RLS 정책 설정
--
-- 주의: service_role 키 사용 시 RLS 우회됨
-- anon/authenticated 키 사용 시 RLS 적용
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- RLS 활성화
-- ═══════════════════════════════════════════════════════════

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_video_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_activity_logs ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- personas: 페르소나 테이블
-- - 읽기: 전체 허용 (대시보드 조회)
-- - 쓰기: service_role만 (heartbeat, RPC)
-- ═══════════════════════════════════════════════════════════

CREATE POLICY "personas_read_all" ON personas
    FOR SELECT USING (true);

CREATE POLICY "personas_insert_service" ON personas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "personas_update_service" ON personas
    FOR UPDATE USING (true);

-- ═══════════════════════════════════════════════════════════
-- youtube_video_tasks: 영상 시청 태스크
-- - 읽기: 전체 허용 (스케줄러 조회)
-- - 쓰기: 전체 허용 (태스크 생성/업데이트)
-- ═══════════════════════════════════════════════════════════

CREATE POLICY "tasks_read_all" ON youtube_video_tasks
    FOR SELECT USING (true);

CREATE POLICY "tasks_insert_all" ON youtube_video_tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "tasks_update_all" ON youtube_video_tasks
    FOR UPDATE USING (true);

-- ═══════════════════════════════════════════════════════════
-- watch_targets: 영상 수집 대상
-- - 전체 허용 (관리자 CRUD)
-- ═══════════════════════════════════════════════════════════

CREATE POLICY "watch_targets_all" ON watch_targets
    FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════
-- persona_activity_logs: 활동 로그
-- - 읽기: 전체 허용 (대시보드 조회)
-- - 쓰기: RPC만 (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════

CREATE POLICY "logs_read_all" ON persona_activity_logs
    FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════
-- node_health: 노드 상태 (이미 존재할 수 있음)
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
    -- RLS 활성화 시도
    EXECUTE 'ALTER TABLE node_health ENABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'node_health 테이블이 없습니다. 스킵.';
END $$;

-- 정책 생성 (테이블 존재 시에만)
DO $$
BEGIN
    EXECUTE 'CREATE POLICY "node_health_all" ON node_health FOR ALL USING (true)';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'node_health_all 정책이 이미 존재합니다.';
    WHEN undefined_table THEN
        NULL;
END $$;

-- ═══════════════════════════════════════════════════════════
-- job_queue: 작업 큐 (이미 존재할 수 있음)
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
    EXECUTE 'ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'job_queue 테이블이 없습니다. 스킵.';
END $$;

DO $$
BEGIN
    EXECUTE 'CREATE POLICY "job_queue_all" ON job_queue FOR ALL USING (true)';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'job_queue_all 정책이 이미 존재합니다.';
    WHEN undefined_table THEN
        NULL;
END $$;

-- ============================================================
-- 완료 메시지
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS Policies 설정 완료';
    RAISE NOTICE '   - personas: read(all), write(service)';
    RAISE NOTICE '   - youtube_video_tasks: read/write(all)';
    RAISE NOTICE '   - watch_targets: all(all)';
    RAISE NOTICE '   - persona_activity_logs: read(all)';
    RAISE NOTICE '   - node_health: all(all)';
    RAISE NOTICE '   - job_queue: all(all)';
END $$;
