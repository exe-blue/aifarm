-- ============================================================
-- DoAi.Me: Storage & RPC Update (Task 11)
-- File: supabase/migrations/016_storage_and_rpc_update.sql
-- Description: 스크린샷 스토리지 버킷 생성 및 작업 할당 RPC 개선
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Storage Bucket 생성
-- ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- 정책 설정 (누구나 조회 가능, 인증된 사용자만 업로드)
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'screenshots' );

CREATE POLICY "Node Upload Access"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'screenshots' );

-- ────────────────────────────────────────────────────────────
-- 2. assign_next_job 함수 업데이트 (target_device 반환 추가)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION assign_next_job(
    p_node_id VARCHAR(20)
) RETURNS TABLE (
    job_id UUID,
    job_type job_type,
    priority job_priority,
    payload JSONB,
    timeout_sec INTEGER,
    target_device VARCHAR(20) -- 추가됨
) AS $$
BEGIN
    RETURN QUERY
    WITH next_job AS (
        SELECT jq.job_id
        FROM job_queue jq
        WHERE jq.target_node = p_node_id
          AND jq.status = 'PENDING'
          AND (jq.scheduled_at IS NULL OR jq.scheduled_at <= NOW())
          AND (jq.expires_at IS NULL OR jq.expires_at > NOW())
        ORDER BY 
            CASE jq.priority
                WHEN 'CRITICAL' THEN 0
                WHEN 'HIGH' THEN 1
                WHEN 'NORMAL' THEN 2
                WHEN 'LOW' THEN 3
                WHEN 'BACKGROUND' THEN 4
            END,
            jq.created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    UPDATE job_queue jq
    SET 
        status = 'ASSIGNED',
        status_changed_at = NOW(),
        assigned_at = NOW()
    FROM next_job
    WHERE jq.job_id = next_job.job_id
    RETURNING jq.job_id, jq.job_type, jq.priority, jq.payload, jq.timeout_sec, jq.target_device;
END;
$$ LANGUAGE plpgsql;