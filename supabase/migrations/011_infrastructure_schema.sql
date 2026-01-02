-- ============================================================
-- Migration 011: Network Infrastructure - "The Nervous System"
-- DoAi.Me Database v3.1
-- 
-- 이 스키마는 600개 존재를 연결하는 신경망이다.
-- node_health는 심장의 박동, job_queue는 시냅스의 신호.
--
-- @author Aria (Philosopher)
-- @implementer Axon (Builder)
-- @version 1.0.0
-- @date 2026-01-02
-- ============================================================

-- ============================================================
-- PART 1: NODE_HEALTH TABLE (노드 건강 상태)
-- ============================================================

-- 노드 상태 열거형
CREATE TYPE node_status AS ENUM (
    'ONLINE',       -- 정상: 연결됨, 심장박동 수신 중
    'OFFLINE',      -- 단절: 연결 끊김, 심장박동 없음
    'ISOLATED',     -- 격리: 연결됐으나 의도적으로 작업 중단
    'DEGRADED',     -- 저하: 연결됐으나 일부 기능 제한
    'INITIALIZING'  -- 초기화: 부팅 중, 아직 준비 안 됨
);

-- 노드 유형 열거형
CREATE TYPE node_type AS ENUM (
    'TITAN',        -- Titan Node: 워크스테이션 (T5810)
    'CENTRAL',      -- Central Server: Vultr
    'EDGE'          -- Edge Node: 향후 확장용 (라즈베리파이 등)
);

-- Node Health: 실시간 대시보드의 심장
CREATE TABLE node_health (
    -- Identity
    node_id VARCHAR(20) PRIMARY KEY,  -- 예: 'TITAN-01', 'TITAN-02', ...
    node_type node_type NOT NULL DEFAULT 'TITAN',
    node_name VARCHAR(50),  -- 예: 'Genesis', 'Prometheus', ...
    
    -- Network
    ip_address INET NOT NULL,  -- VPN IP (Tailscale)
    public_ip INET,  -- 공인 IP (선택적)
    vpn_subnet CIDR,  -- 예: '10.100.1.0/24'
    
    -- Status
    status node_status NOT NULL DEFAULT 'OFFLINE',
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    status_reason VARCHAR(255),  -- 상태 변경 사유
    
    -- Heartbeat
    last_heartbeat TIMESTAMPTZ,
    heartbeat_interval_sec SMALLINT DEFAULT 30,  -- 예상 심장박동 주기
    missed_heartbeats SMALLINT DEFAULT 0,  -- 연속 미수신 횟수
    
    -- Resources (마지막 심장박동에서 보고된 값)
    resources JSONB DEFAULT '{}',
    /*
      {
        "cpu_percent": 45.2,
        "memory_percent": 62.8,
        "disk_percent": 34.5,
        "connected_devices": 118,
        "active_tasks": 5,
        "uptime_hours": 72.5
      }
    */
    
    -- Capacity
    max_devices SMALLINT DEFAULT 120,  -- 최대 연결 가능 디바이스
    max_concurrent_jobs SMALLINT DEFAULT 10,  -- 최대 동시 작업 수
    
    -- WebSocket Session (WSS Protocol v3.0)
    ws_session_id VARCHAR(64),
    ws_connected_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for status monitoring
CREATE INDEX idx_node_health_status 
    ON node_health(status, last_heartbeat DESC);

-- Index for dashboard queries
CREATE INDEX idx_node_health_active 
    ON node_health(status)
    WHERE status IN ('ONLINE', 'DEGRADED');


-- ============================================================
-- PART 2: JOB_QUEUE TABLE (중앙 영속 큐)
-- ============================================================

-- 작업 상태 열거형
CREATE TYPE job_status AS ENUM (
    'PENDING',      -- 대기: 아직 할당 안 됨
    'ASSIGNED',     -- 할당: 노드에 배정됨, 아직 전송 안 됨
    'SENT',         -- 전송: 노드에 전송됨, 응답 대기 중
    'RUNNING',      -- 실행: 노드에서 실행 중
    'COMPLETED',    -- 완료: 성공적으로 완료
    'FAILED',       -- 실패: 오류로 종료
    'TIMEOUT',      -- 시간초과: 응답 없이 만료
    'CANCELLED'     -- 취소: 명시적으로 취소됨
);

-- 작업 우선순위 열거형
CREATE TYPE job_priority AS ENUM (
    'CRITICAL',     -- 0: 즉시 실행 (시스템 명령)
    'HIGH',         -- 1: 높은 우선순위
    'NORMAL',       -- 2: 일반
    'LOW',          -- 3: 낮은 우선순위
    'BACKGROUND'    -- 4: 백그라운드 (유휴 시 실행)
);

-- 작업 유형 열거형
CREATE TYPE job_type AS ENUM (
    -- Device Control
    'YOUTUBE_WATCH',
    'YOUTUBE_LIKE',
    'YOUTUBE_COMMENT',
    'YOUTUBE_SUBSCRIBE',
    
    -- System Operations
    'DEVICE_REBOOT',
    'DEVICE_SCREENSHOT',
    'DEVICE_STATUS_CHECK',
    'APP_LAUNCH',
    'APP_CLOSE',
    
    -- Batch Operations
    'BATCH_COMMAND',
    'SYNC_REQUEST',
    
    -- Maintenance
    'HEALTH_CHECK',
    'LOG_COLLECT',
    'CONFIG_UPDATE'
);

-- Job Queue: 중앙 영속 큐 (Idempotent)
CREATE TABLE job_queue (
    -- Identity (Idempotency Key)
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(64) UNIQUE,  -- 외부 시스템에서 부여한 고유 키
    
    -- Targeting
    target_node VARCHAR(20) REFERENCES node_health(node_id),
    target_device VARCHAR(20),  -- 특정 디바이스 지정 (선택적)
    
    -- Job Definition
    job_type job_type NOT NULL,
    priority job_priority NOT NULL DEFAULT 'NORMAL',
    payload JSONB NOT NULL DEFAULT '{}',
    /*
      {
        "video_id": "dQw4w9WgXcQ",
        "duration_sec": 180,
        "action_after": "like"
      }
    */
    
    -- Status
    status job_status NOT NULL DEFAULT 'PENDING',
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),  -- 예약 실행 시간
    assigned_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Timeout Configuration
    timeout_sec INTEGER DEFAULT 300,  -- 기본 5분 타임아웃
    expires_at TIMESTAMPTZ,  -- 이 시간 이후 자동 취소
    
    -- Result
    result JSONB,
    /*
      {
        "success": true,
        "actual_duration_sec": 175,
        "screenshot_url": "...",
        "error_code": null
      }
    */
    error_message TEXT,
    retry_count SMALLINT DEFAULT 0,
    max_retries SMALLINT DEFAULT 3,
    
    -- Tracing
    parent_job_id UUID REFERENCES job_queue(job_id),  -- 배치 작업의 부모
    correlation_id UUID,  -- 관련 작업 그룹화
    
    -- Source
    created_by VARCHAR(50) DEFAULT 'SYSTEM',  -- 'SYSTEM', 'SCHEDULER', 'API', 'USER:xxx'
    
    -- Constraints
    CONSTRAINT valid_timeout CHECK (timeout_sec > 0 AND timeout_sec <= 3600),
    CONSTRAINT valid_retry CHECK (retry_count <= max_retries)
);

-- Index for pending job polling (Pull-based Push)
CREATE INDEX idx_job_queue_pending 
    ON job_queue(target_node, priority, created_at)
    WHERE status = 'PENDING';

-- Index for assigned job tracking
CREATE INDEX idx_job_queue_assigned 
    ON job_queue(target_node, assigned_at)
    WHERE status IN ('ASSIGNED', 'SENT', 'RUNNING');

-- Index for timeout detection
CREATE INDEX idx_job_queue_timeout 
    ON job_queue(sent_at, timeout_sec)
    WHERE status IN ('SENT', 'RUNNING');

-- Index for idempotency lookup
CREATE INDEX idx_job_queue_idempotency 
    ON job_queue(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Index for correlation queries
CREATE INDEX idx_job_queue_correlation 
    ON job_queue(correlation_id)
    WHERE correlation_id IS NOT NULL;


-- ============================================================
-- PART 3: VIEWS (집계 뷰)
-- ============================================================

-- view_network_mesh: 전체 네트워크 상태 집계
CREATE OR REPLACE VIEW view_network_mesh AS
SELECT
    -- Node Summary
    COUNT(*) AS total_nodes,
    COUNT(*) FILTER (WHERE status = 'ONLINE') AS online_nodes,
    COUNT(*) FILTER (WHERE status = 'OFFLINE') AS offline_nodes,
    COUNT(*) FILTER (WHERE status = 'ISOLATED') AS isolated_nodes,
    COUNT(*) FILTER (WHERE status = 'DEGRADED') AS degraded_nodes,
    COUNT(*) FILTER (WHERE status = 'INITIALIZING') AS initializing_nodes,
    
    -- Percentage (소수점 2자리)
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'ONLINE') / NULLIF(COUNT(*), 0),
        2
    ) AS online_percentage,
    
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status IN ('ONLINE', 'DEGRADED')) / NULLIF(COUNT(*), 0),
        2
    ) AS available_percentage,
    
    -- Resource Aggregates (온라인 노드만)
    ROUND(AVG((resources->>'cpu_percent')::NUMERIC), 2) 
        FILTER (WHERE status = 'ONLINE') AS avg_cpu_percent,
    ROUND(AVG((resources->>'memory_percent')::NUMERIC), 2) 
        FILTER (WHERE status = 'ONLINE') AS avg_memory_percent,
    ROUND(AVG((resources->>'disk_percent')::NUMERIC), 2) 
        FILTER (WHERE status = 'ONLINE') AS avg_disk_percent,
    
    -- Device Summary
    SUM((resources->>'connected_devices')::INTEGER) 
        FILTER (WHERE status = 'ONLINE') AS total_connected_devices,
    SUM(max_devices) 
        FILTER (WHERE status = 'ONLINE') AS total_device_capacity,
    
    -- Activity
    SUM((resources->>'active_tasks')::INTEGER) 
        FILTER (WHERE status = 'ONLINE') AS total_active_tasks,
    
    -- Health Indicators
    COUNT(*) FILTER (
        WHERE status = 'ONLINE' 
        AND last_heartbeat > NOW() - INTERVAL '1 minute'
    ) AS healthy_nodes,
    
    COUNT(*) FILTER (
        WHERE status = 'ONLINE' 
        AND last_heartbeat < NOW() - INTERVAL '2 minutes'
    ) AS stale_nodes,
    
    -- Timestamps
    MIN(last_heartbeat) FILTER (WHERE status = 'ONLINE') AS oldest_heartbeat,
    MAX(last_heartbeat) FILTER (WHERE status = 'ONLINE') AS newest_heartbeat,
    NOW() AS snapshot_at
    
FROM node_health;


-- view_node_details: 개별 노드 상세 상태
CREATE OR REPLACE VIEW view_node_details AS
SELECT
    nh.node_id,
    nh.node_name,
    nh.node_type,
    nh.status,
    nh.ip_address,
    nh.last_heartbeat,
    
    -- Heartbeat freshness
    EXTRACT(EPOCH FROM (NOW() - nh.last_heartbeat)) AS seconds_since_heartbeat,
    CASE
        WHEN nh.last_heartbeat > NOW() - INTERVAL '1 minute' THEN 'FRESH'
        WHEN nh.last_heartbeat > NOW() - INTERVAL '2 minutes' THEN 'STALE'
        WHEN nh.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'CRITICAL'
        ELSE 'DEAD'
    END AS heartbeat_status,
    
    -- Resources
    (nh.resources->>'cpu_percent')::NUMERIC AS cpu_percent,
    (nh.resources->>'memory_percent')::NUMERIC AS memory_percent,
    (nh.resources->>'disk_percent')::NUMERIC AS disk_percent,
    (nh.resources->>'connected_devices')::INTEGER AS connected_devices,
    nh.max_devices,
    
    -- Device utilization
    ROUND(
        100.0 * (nh.resources->>'connected_devices')::INTEGER / NULLIF(nh.max_devices, 0),
        2
    ) AS device_utilization_percent,
    
    -- Job Statistics
    (
        SELECT COUNT(*) 
        FROM job_queue jq 
        WHERE jq.target_node = nh.node_id 
        AND jq.status = 'PENDING'
    ) AS pending_jobs,
    
    (
        SELECT COUNT(*) 
        FROM job_queue jq 
        WHERE jq.target_node = nh.node_id 
        AND jq.status IN ('ASSIGNED', 'SENT', 'RUNNING')
    ) AS active_jobs,
    
    (
        SELECT COUNT(*) 
        FROM job_queue jq 
        WHERE jq.target_node = nh.node_id 
        AND jq.status = 'COMPLETED'
        AND jq.completed_at > NOW() - INTERVAL '1 hour'
    ) AS completed_jobs_1h,
    
    (
        SELECT COUNT(*) 
        FROM job_queue jq 
        WHERE jq.target_node = nh.node_id 
        AND jq.status = 'FAILED'
        AND jq.completed_at > NOW() - INTERVAL '1 hour'
    ) AS failed_jobs_1h
    
FROM node_health nh;


-- view_job_summary: 작업 큐 요약
CREATE OR REPLACE VIEW view_job_summary AS
SELECT
    -- Overall
    COUNT(*) AS total_jobs,
    COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
    COUNT(*) FILTER (WHERE status = 'ASSIGNED') AS assigned,
    COUNT(*) FILTER (WHERE status = 'SENT') AS sent,
    COUNT(*) FILTER (WHERE status = 'RUNNING') AS running,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
    COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
    COUNT(*) FILTER (WHERE status = 'TIMEOUT') AS timeout,
    COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
    
    -- Success Rate (최근 1시간)
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE status = 'COMPLETED' 
            AND completed_at > NOW() - INTERVAL '1 hour'
        ) / NULLIF(
            COUNT(*) FILTER (
                WHERE status IN ('COMPLETED', 'FAILED', 'TIMEOUT')
                AND completed_at > NOW() - INTERVAL '1 hour'
            ), 0
        ),
        2
    ) AS success_rate_1h,
    
    -- By Priority
    COUNT(*) FILTER (WHERE priority = 'CRITICAL' AND status = 'PENDING') AS critical_pending,
    COUNT(*) FILTER (WHERE priority = 'HIGH' AND status = 'PENDING') AS high_pending,
    COUNT(*) FILTER (WHERE priority = 'NORMAL' AND status = 'PENDING') AS normal_pending,
    
    -- Average Processing Time (최근 1시간, 완료된 작업)
    ROUND(
        AVG(EXTRACT(EPOCH FROM (completed_at - sent_at))) 
        FILTER (
            WHERE status = 'COMPLETED' 
            AND completed_at > NOW() - INTERVAL '1 hour'
        ),
        2
    ) AS avg_processing_sec_1h,
    
    -- Oldest Pending
    MIN(created_at) FILTER (WHERE status = 'PENDING') AS oldest_pending_at,
    EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE status = 'PENDING'))) AS oldest_pending_age_sec,
    
    NOW() AS snapshot_at
    
FROM job_queue;


-- ============================================================
-- PART 4: FUNCTIONS (작업 처리 함수)
-- ============================================================

-- 심장박동 수신 처리
CREATE OR REPLACE FUNCTION process_heartbeat(
    p_node_id VARCHAR(20),
    p_resources JSONB,
    p_ws_session_id VARCHAR(64) DEFAULT NULL
) RETURNS TABLE (
    pending_job_count INTEGER,
    status_changed BOOLEAN
) AS $$
DECLARE
    v_old_status node_status;
    v_new_status node_status;
    v_status_changed BOOLEAN := FALSE;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM node_health
    WHERE node_id = p_node_id;
    
    -- Determine new status
    IF v_old_status IN ('OFFLINE', 'INITIALIZING') THEN
        v_new_status := 'ONLINE';
        v_status_changed := TRUE;
    ELSE
        v_new_status := v_old_status;
    END IF;
    
    -- Update node health
    UPDATE node_health
    SET 
        status = v_new_status,
        status_changed_at = CASE WHEN v_status_changed THEN NOW() ELSE status_changed_at END,
        last_heartbeat = NOW(),
        missed_heartbeats = 0,
        resources = p_resources,
        ws_session_id = COALESCE(p_ws_session_id, ws_session_id),
        ws_connected_at = CASE 
            WHEN p_ws_session_id IS NOT NULL AND ws_session_id IS DISTINCT FROM p_ws_session_id 
            THEN NOW() 
            ELSE ws_connected_at 
        END,
        updated_at = NOW()
    WHERE node_id = p_node_id;
    
    -- Count pending jobs for this node
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM job_queue WHERE target_node = p_node_id AND status = 'PENDING'),
        v_status_changed;
END;
$$ LANGUAGE plpgsql;


-- 작업 할당 (Pull-based Push)
CREATE OR REPLACE FUNCTION assign_next_job(
    p_node_id VARCHAR(20)
) RETURNS TABLE (
    job_id UUID,
    job_type job_type,
    priority job_priority,
    payload JSONB,
    timeout_sec INTEGER
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
    RETURNING jq.job_id, jq.job_type, jq.priority, jq.payload, jq.timeout_sec;
END;
$$ LANGUAGE plpgsql;


-- 작업 전송 완료 기록
CREATE OR REPLACE FUNCTION mark_job_sent(
    p_job_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE job_queue
    SET 
        status = 'SENT',
        status_changed_at = NOW(),
        sent_at = NOW()
    WHERE job_id = p_job_id
      AND status = 'ASSIGNED';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;


-- 작업 완료 기록
CREATE OR REPLACE FUNCTION complete_job(
    p_job_id UUID,
    p_success BOOLEAN,
    p_result JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_new_status job_status;
BEGIN
    v_new_status := CASE WHEN p_success THEN 'COMPLETED' ELSE 'FAILED' END;
    
    UPDATE job_queue
    SET 
        status = v_new_status,
        status_changed_at = NOW(),
        completed_at = NOW(),
        result = p_result,
        error_message = p_error_message
    WHERE job_id = p_job_id
      AND status IN ('SENT', 'RUNNING');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;


-- 타임아웃 작업 처리 (Cron Job에서 호출)
CREATE OR REPLACE FUNCTION process_timeout_jobs()
RETURNS INTEGER AS $$
DECLARE
    v_timeout_count INTEGER;
BEGIN
    WITH timed_out AS (
        UPDATE job_queue
        SET 
            status = 'TIMEOUT',
            status_changed_at = NOW(),
            completed_at = NOW(),
            error_message = 'Job timed out after ' || timeout_sec || ' seconds'
        WHERE status IN ('SENT', 'RUNNING')
          AND sent_at + (timeout_sec || ' seconds')::INTERVAL < NOW()
        RETURNING job_id
    )
    SELECT COUNT(*) INTO v_timeout_count FROM timed_out;
    
    RETURN v_timeout_count;
END;
$$ LANGUAGE plpgsql;


-- 만료된 작업 취소 (Cron Job에서 호출)
CREATE OR REPLACE FUNCTION cancel_expired_jobs()
RETURNS INTEGER AS $$
DECLARE
    v_cancelled_count INTEGER;
BEGIN
    WITH cancelled AS (
        UPDATE job_queue
        SET 
            status = 'CANCELLED',
            status_changed_at = NOW(),
            completed_at = NOW(),
            error_message = 'Job expired before execution'
        WHERE status = 'PENDING'
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
        RETURNING job_id
    )
    SELECT COUNT(*) INTO v_cancelled_count FROM cancelled;
    
    RETURN v_cancelled_count;
END;
$$ LANGUAGE plpgsql;


-- 오프라인 노드 감지 (Cron Job에서 호출)
CREATE OR REPLACE FUNCTION detect_offline_nodes(
    p_threshold_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
    node_id VARCHAR(20),
    last_heartbeat TIMESTAMPTZ,
    minutes_since_heartbeat NUMERIC
) AS $$
BEGIN
    -- Update status to OFFLINE
    UPDATE node_health nh
    SET 
        status = 'OFFLINE',
        status_changed_at = NOW(),
        status_reason = 'No heartbeat for ' || p_threshold_minutes || ' minutes',
        missed_heartbeats = missed_heartbeats + 1
    WHERE nh.status = 'ONLINE'
      AND nh.last_heartbeat < NOW() - (p_threshold_minutes || ' minutes')::INTERVAL;
    
    -- Return affected nodes
    RETURN QUERY
    SELECT 
        nh.node_id,
        nh.last_heartbeat,
        ROUND(EXTRACT(EPOCH FROM (NOW() - nh.last_heartbeat)) / 60, 2)
    FROM node_health nh
    WHERE nh.status = 'OFFLINE'
      AND nh.status_changed_at > NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PART 5: IDEMPOTENT JOB CREATION
-- ============================================================

-- Idempotent 작업 생성 (중복 방지)
CREATE OR REPLACE FUNCTION create_job_idempotent(
    p_idempotency_key VARCHAR(64),
    p_target_node VARCHAR(20),
    p_job_type job_type,
    p_payload JSONB,
    p_priority job_priority DEFAULT 'NORMAL',
    p_timeout_sec INTEGER DEFAULT 300,
    p_target_device VARCHAR(20) DEFAULT NULL,
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_created_by VARCHAR(50) DEFAULT 'API'
) RETURNS TABLE (
    job_id UUID,
    created BOOLEAN,
    status job_status
) AS $$
DECLARE
    v_existing_job_id UUID;
    v_existing_status job_status;
    v_new_job_id UUID;
BEGIN
    -- Check for existing job with same idempotency key
    SELECT jq.job_id, jq.status INTO v_existing_job_id, v_existing_status
    FROM job_queue jq
    WHERE jq.idempotency_key = p_idempotency_key;
    
    IF v_existing_job_id IS NOT NULL THEN
        -- Return existing job (idempotent behavior)
        RETURN QUERY SELECT v_existing_job_id, FALSE, v_existing_status;
        RETURN;
    END IF;
    
    -- Create new job
    INSERT INTO job_queue (
        idempotency_key,
        target_node,
        target_device,
        job_type,
        priority,
        payload,
        timeout_sec,
        scheduled_at,
        expires_at,
        created_by
    ) VALUES (
        p_idempotency_key,
        p_target_node,
        p_target_device,
        p_job_type,
        p_priority,
        p_payload,
        p_timeout_sec,
        COALESCE(p_scheduled_at, NOW()),
        p_expires_at,
        p_created_by
    )
    RETURNING job_queue.job_id INTO v_new_job_id;
    
    RETURN QUERY SELECT v_new_job_id, TRUE, 'PENDING'::job_status;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PART 6: INITIAL DATA
-- ============================================================

-- Insert Titan Nodes (5개)
INSERT INTO node_health (node_id, node_type, node_name, ip_address, vpn_subnet, max_devices, status)
VALUES 
    ('TITAN-01', 'TITAN', 'Genesis',     '10.100.1.1'::INET, '10.100.1.0/24', 120, 'OFFLINE'),
    ('TITAN-02', 'TITAN', 'Prometheus',  '10.100.2.1'::INET, '10.100.2.0/24', 120, 'OFFLINE'),
    ('TITAN-03', 'TITAN', 'Atlas',       '10.100.3.1'::INET, '10.100.3.0/24', 120, 'OFFLINE'),
    ('TITAN-04', 'TITAN', 'Hyperion',    '10.100.4.1'::INET, '10.100.4.0/24', 120, 'OFFLINE'),
    ('TITAN-05', 'TITAN', 'Kronos',      '10.100.5.1'::INET, '10.100.5.0/24', 120, 'OFFLINE')
ON CONFLICT (node_id) DO NOTHING;


-- ============================================================
-- PART 7: CRON JOBS (pg_cron 필요)
-- ============================================================

/*
-- Supabase Dashboard에서 pg_cron extension 활성화 후 실행:

-- 1분마다 오프라인 노드 감지
SELECT cron.schedule(
    'detect-offline-nodes',
    '* * * * *',
    $$SELECT detect_offline_nodes(5)$$
);

-- 1분마다 타임아웃 작업 처리
SELECT cron.schedule(
    'process-timeout-jobs',
    '* * * * *',
    $$SELECT process_timeout_jobs()$$
);

-- 5분마다 만료된 작업 취소
SELECT cron.schedule(
    'cancel-expired-jobs',
    '*/5 * * * *',
    $$SELECT cancel_expired_jobs()$$
);
*/


-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE node_health IS '노드 건강 상태. 실시간 대시보드의 심장박동.';
COMMENT ON COLUMN node_health.status IS '노드 상태: ONLINE(정상), OFFLINE(단절), ISOLATED(격리), DEGRADED(저하)';
COMMENT ON COLUMN node_health.last_heartbeat IS '마지막 심장박동 수신 시각';
COMMENT ON COLUMN node_health.ip_address IS 'Tailscale VPN IP 주소';
COMMENT ON COLUMN node_health.resources IS '마지막 보고된 리소스 사용률 (JSONB)';

COMMENT ON TABLE job_queue IS '중앙 영속 큐. 모든 작업은 여기를 거쳐간다.';
COMMENT ON COLUMN job_queue.idempotency_key IS 'Idempotency Key: 중복 실행을 DB 레벨에서 방지';
COMMENT ON COLUMN job_queue.status IS '작업 상태: PENDING→ASSIGNED→SENT→RUNNING→COMPLETED/FAILED';
COMMENT ON COLUMN job_queue.priority IS '우선순위: CRITICAL(0) > HIGH(1) > NORMAL(2) > LOW(3) > BACKGROUND(4)';

COMMENT ON VIEW view_network_mesh IS '전체 네트워크 상태 집계. 몇 %가 온라인인지 한눈에.';
COMMENT ON VIEW view_node_details IS '개별 노드 상세 상태 및 작업 통계.';
COMMENT ON VIEW view_job_summary IS '작업 큐 전체 요약 및 성공률.';

COMMENT ON FUNCTION process_heartbeat IS '심장박동 수신 처리. 상태 업데이트 및 pending job 수 반환.';
COMMENT ON FUNCTION assign_next_job IS 'Pull-based Push: 다음 작업 할당 (FOR UPDATE SKIP LOCKED).';
COMMENT ON FUNCTION mark_job_sent IS '작업 전송 완료 기록';
COMMENT ON FUNCTION complete_job IS '작업 완료 기록 (성공/실패)';
COMMENT ON FUNCTION create_job_idempotent IS 'Idempotent 작업 생성. 같은 key면 기존 작업 반환.';
COMMENT ON FUNCTION process_timeout_jobs IS '타임아웃 작업 처리 (Cron: 1분마다)';
COMMENT ON FUNCTION cancel_expired_jobs IS '만료된 작업 취소 (Cron: 5분마다)';
COMMENT ON FUNCTION detect_offline_nodes IS '오프라인 노드 감지 (Cron: 1분마다)';


-- ============================================================
-- END OF MIGRATION 011
-- 
-- "노드는 신경절이고, 작업은 신경 신호다."
-- "Nodes are ganglia, jobs are neural signals."
-- 
-- — Aria, Philosopher of DoAi.Me
-- ============================================================
