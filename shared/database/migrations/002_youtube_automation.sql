-- =====================================================
-- Migration 002: YouTube 자동화 시스템
-- 
-- 목적: YouTube 앱 자동화를 위한 대기열 및 실행 관리
-- 핵심 기능:
--   1. 영상 대기열 관리 (직접 등록, 채널 API, AI 생성)
--   2. 예약 실행 기능
--   3. 실행 결과 로깅 (성공/실패/오류)
--   4. 인터랙션 확률 관리 (좋아요 20%, 댓글 5%)
--   5. 로그인 상태 기반 인터랙션 제어
-- =====================================================

-- UUID 확장 (이미 존재하면 무시)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 공통 트리거 함수: updated_at 자동 갱신
-- 모든 테이블에서 UPDATE 시 updated_at을 현재 시간으로 설정
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. 영상 대기열 테이블
-- 등록 소스: channel_api, direct, ai_generated
-- =====================================================
CREATE TABLE IF NOT EXISTS video_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 영상 정보
    youtube_video_id VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    channel_id VARCHAR(50),
    channel_name VARCHAR(255),
    duration_seconds INTEGER CHECK (duration_seconds > 0),
    view_count INTEGER,                      -- 조회수 (인터랙션 확률 계산용)
    thumbnail_url VARCHAR(500),
    
    -- 등록 정보
    source VARCHAR(20) NOT NULL CHECK (source IN ('channel_api', 'direct', 'ai_generated')),
    search_keyword VARCHAR(255),             -- 검색에 사용할 키워드 (제목 또는 별도 지정)
    
    -- 예약 기능
    scheduled_at TIMESTAMP WITH TIME ZONE,   -- NULL이면 즉시 실행 가능
    is_ready BOOLEAN GENERATED ALWAYS AS (
        scheduled_at IS NULL OR scheduled_at <= CURRENT_TIMESTAMP
    ) STORED,
    
    -- 실행 설정
    target_device_percent FLOAT DEFAULT 0.5 CHECK (target_device_percent > 0 AND target_device_percent <= 1.0),
    target_executions INTEGER DEFAULT 1 CHECK (target_executions >= 1),
    completed_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    
    -- 인터랙션 설정 (조회수의 X% 확률)
    like_probability FLOAT DEFAULT 0.20 CHECK (like_probability >= 0 AND like_probability <= 1.0),
    comment_probability FLOAT DEFAULT 0.05 CHECK (comment_probability >= 0 AND comment_probability <= 1.0),
    
    -- 상태
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- 대기 중 (예약 시간 전)
        'ready',        -- 실행 가능
        'executing',    -- 실행 중
        'completed',    -- 완료 (target_executions 달성)
        'failed',       -- 실패 (재시도 한도 초과)
        'cancelled'     -- 취소
    )),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- 에러 정보
    last_error_code VARCHAR(50),
    last_error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    first_executed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- 유니크 제약 (같은 영상 중복 등록 방지)
    CONSTRAINT unique_queue_item UNIQUE (youtube_video_id, scheduled_at)
);

COMMENT ON TABLE video_queue IS '영상 대기열 - 시청 작업 관리';
COMMENT ON COLUMN video_queue.source IS 'channel_api=채널에서 가져옴, direct=직접등록, ai_generated=AI검색어';
COMMENT ON COLUMN video_queue.target_device_percent IS '사용할 디바이스 비율 (0.5 = 50%)';
COMMENT ON COLUMN video_queue.is_ready IS '실행 가능 여부 (예약 시간 체크)';

-- =====================================================
-- 2. 댓글 풀 테이블 (확장)
-- 랜덤 댓글 선택용, 가중치 기반
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_pool (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN (
        'general',      -- 일반
        'positive',     -- 긍정
        'question',     -- 질문
        'emoji',        -- 이모지 위주
        'short'         -- 짧은 댓글
    )),
    language VARCHAR(10) DEFAULT 'ko' CHECK (language IN ('ko', 'en', 'mixed')),
    
    -- 가중치 (사용될수록 감소 → 분산 효과)
    weight INTEGER DEFAULT 100 CHECK (weight >= 0),
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE comment_pool IS '댓글 풀 - 랜덤 선택용';
COMMENT ON COLUMN comment_pool.weight IS '선택 가중치 (높을수록 자주 선택)';

-- 기본 댓글 삽입 (한국어)
INSERT INTO comment_pool (content, category, language, weight) VALUES
    ('👍', 'emoji', 'mixed', 100),
    ('좋아요', 'positive', 'ko', 90),
    ('잘 봤습니다', 'positive', 'ko', 85),
    ('유익한 영상이네요', 'positive', 'ko', 80),
    ('감사합니다!', 'positive', 'ko', 90),
    ('구독 누르고 갑니다', 'positive', 'ko', 70),
    ('좋은 정보 감사합니다', 'positive', 'ko', 75),
    ('오 대박', 'positive', 'ko', 80),
    ('ㅋㅋㅋ', 'short', 'ko', 85),
    ('ㄹㅇ', 'short', 'ko', 70),
    ('인정', 'short', 'ko', 75),
    ('꿀팁이네요', 'positive', 'ko', 65),
    ('알고리즘 타고 왔어요', 'general', 'ko', 60),
    ('와 진짜요?', 'question', 'ko', 50),
    ('더 알려주세요!', 'question', 'ko', 55),
    ('🔥', 'emoji', 'mixed', 100),
    ('❤️', 'emoji', 'mixed', 95),
    ('😊', 'emoji', 'mixed', 90),
    ('👏', 'emoji', 'mixed', 85),
    ('Great!', 'positive', 'en', 50),
    ('Nice video', 'positive', 'en', 45),
    ('Thanks for sharing', 'positive', 'en', 40)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. 실행 로그 테이블
-- 개별 디바이스의 시청 결과 기록
-- =====================================================
CREATE TABLE IF NOT EXISTS execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 관계
    queue_item_id UUID NOT NULL REFERENCES video_queue(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    device_hierarchy_id VARCHAR(30),         -- 디바이스 삭제 후에도 기록 유지
    workstation_id VARCHAR(10),
    
    -- 실행 결과 상태
    status VARCHAR(20) NOT NULL CHECK (status IN (
        'success',      -- 성공: 영상 시청 완료
        'partial',      -- 부분 성공: 시청은 했으나 인터랙션 실패
        'failed',       -- 실패: 영상 찾기/재생 실패
        'error',        -- 오류: 시스템 오류 (앱 크래시, 네트워크 등)
        'skipped'       -- 스킵: 조건 미충족 (로그인 필요 등)
    )),
    
    -- 시청 데이터
    watch_duration_seconds INTEGER CHECK (watch_duration_seconds >= 0),
    target_duration_seconds INTEGER,
    watch_percent FLOAT GENERATED ALWAYS AS (
        CASE WHEN target_duration_seconds > 0 
             THEN ROUND((watch_duration_seconds::float / target_duration_seconds * 100)::numeric, 2)
             ELSE 0 
        END
    ) STORED,
    
    -- 인터랙션 결과
    did_like BOOLEAN DEFAULT FALSE,
    like_attempted BOOLEAN DEFAULT FALSE,
    did_comment BOOLEAN DEFAULT FALSE,
    comment_attempted BOOLEAN DEFAULT FALSE,
    comment_text TEXT,
    comment_id UUID REFERENCES comment_pool(id),
    
    -- 검색 정보
    search_keyword VARCHAR(255),
    search_method VARCHAR(20) CHECK (search_method IN ('title', 'keyword', 'url')),
    search_result_rank INTEGER,              -- 검색 결과에서 몇 번째였는지
    
    -- 디바이스 상태
    device_logged_in BOOLEAN,                -- 로그인 상태였는지
    
    -- 에러 정보
    error_code VARCHAR(50),
    error_message TEXT,
    screenshot_path VARCHAR(500),
    
    -- 타임스탬프
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE execution_logs IS '실행 로그 - 개별 시청 결과';
COMMENT ON COLUMN execution_logs.status IS 'success=완료, partial=일부성공, failed=실패, error=오류, skipped=스킵';

-- =====================================================
-- 4. AI 검색어 로그 테이블
-- "심심한데 뭐 검색할까?" 호출 기록
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_search_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 프롬프트 및 응답
    prompt_template VARCHAR(100),
    generated_keyword VARCHAR(255) NOT NULL,
    ai_model VARCHAR(50),                    -- gpt-4-turbo, claude-3, etc.
    
    -- 사용 여부
    was_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    result_video_count INTEGER,              -- 검색 결과 영상 수
    
    -- 메타
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ai_search_logs IS 'AI 검색어 생성 로그';

-- =====================================================
-- 5. devices 테이블 확장 (로그인 상태 추가)
-- =====================================================
ALTER TABLE devices ADD COLUMN IF NOT EXISTS youtube_logged_in BOOLEAN DEFAULT FALSE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS youtube_account_email VARCHAR(255);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS youtube_last_login_check TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN devices.youtube_logged_in IS 'YouTube 앱 로그인 상태';
COMMENT ON COLUMN devices.youtube_account_email IS '로그인된 계정 이메일';

-- =====================================================
-- 6. 에러 코드 참조 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS error_codes (
    code VARCHAR(50) PRIMARY KEY,
    category VARCHAR(30) NOT NULL CHECK (category IN ('search', 'playback', 'interaction', 'system', 'network')),
    description TEXT NOT NULL,
    should_retry BOOLEAN DEFAULT TRUE,
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

COMMENT ON TABLE error_codes IS '에러 코드 정의';

-- 기본 에러 코드 삽입
INSERT INTO error_codes (code, category, description, should_retry, severity) VALUES
    -- 검색 관련
    ('VIDEO_NOT_FOUND', 'search', '검색 결과에서 영상을 찾지 못함', TRUE, 'medium'),
    ('NO_SEARCH_RESULTS', 'search', '검색 결과가 없음', TRUE, 'low'),
    ('SEARCH_TIMEOUT', 'search', '검색 시간 초과', TRUE, 'medium'),
    
    -- 재생 관련
    ('PLAYBACK_ERROR', 'playback', '영상 재생 오류', TRUE, 'medium'),
    ('AD_STUCK', 'playback', '광고 스킵 불가 상태', TRUE, 'medium'),
    ('VIDEO_UNAVAILABLE', 'playback', '영상을 재생할 수 없음 (삭제/비공개)', FALSE, 'high'),
    ('AGE_RESTRICTED', 'playback', '연령 제한 영상', FALSE, 'medium'),
    
    -- 인터랙션 관련
    ('LOGIN_REQUIRED', 'interaction', '로그인 필요 액션 시도', FALSE, 'low'),
    ('LIKE_FAILED', 'interaction', '좋아요 실패', FALSE, 'low'),
    ('COMMENT_FAILED', 'interaction', '댓글 작성 실패', FALSE, 'low'),
    ('COMMENT_DISABLED', 'interaction', '댓글이 비활성화됨', FALSE, 'low'),
    
    -- 시스템 관련
    ('APP_CRASH', 'system', 'YouTube 앱 크래시', TRUE, 'high'),
    ('APP_NOT_RESPONDING', 'system', 'YouTube 앱 응답 없음', TRUE, 'high'),
    ('DEVICE_OFFLINE', 'system', '디바이스 오프라인', TRUE, 'critical'),
    ('OVERHEAT', 'system', '디바이스 과열', FALSE, 'critical'),
    ('LOW_BATTERY', 'system', '배터리 부족', FALSE, 'medium'),
    
    -- 네트워크 관련
    ('NETWORK_ERROR', 'network', '네트워크 연결 실패', TRUE, 'high'),
    ('TIMEOUT', 'network', '작업 시간 초과', TRUE, 'medium'),
    ('CONNECTION_LOST', 'network', '연결 끊김', TRUE, 'high')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- =====================================================
-- 인덱스
-- =====================================================

-- video_queue
CREATE INDEX IF NOT EXISTS idx_video_queue_status ON video_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_queue_priority ON video_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_video_queue_ready ON video_queue(is_ready, status) WHERE is_ready = TRUE;
CREATE INDEX IF NOT EXISTS idx_video_queue_scheduled ON video_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_video_queue_youtube_id ON video_queue(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_video_queue_source ON video_queue(source);

-- comment_pool
CREATE INDEX IF NOT EXISTS idx_comment_pool_active ON comment_pool(is_active, weight DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_comment_pool_category ON comment_pool(category, language);

-- execution_logs
CREATE INDEX IF NOT EXISTS idx_execution_logs_queue ON execution_logs(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_device ON execution_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_created ON execution_logs(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_date ON execution_logs(DATE(completed_at));

-- ai_search_logs
CREATE INDEX IF NOT EXISTS idx_ai_search_logs_created ON ai_search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_search_logs_used ON ai_search_logs(was_used);

-- =====================================================
-- 트리거
-- =====================================================

-- video_queue updated_at 자동 갱신
DROP TRIGGER IF EXISTS video_queue_updated_at ON video_queue;
CREATE TRIGGER video_queue_updated_at
    BEFORE UPDATE ON video_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- video_queue 상태 자동 변경 (실행 완료 시)
CREATE OR REPLACE FUNCTION update_queue_status_on_execution()
RETURNS TRIGGER AS $$
BEGIN
    -- 성공 시 completed_executions 증가
    IF NEW.status = 'success' OR NEW.status = 'partial' THEN
        UPDATE video_queue 
        SET 
            completed_executions = completed_executions + 1,
            first_executed_at = COALESCE(first_executed_at, CURRENT_TIMESTAMP)
        WHERE id = NEW.queue_item_id;
    -- 실패 시 failed_executions 증가
    ELSIF NEW.status = 'failed' OR NEW.status = 'error' THEN
        UPDATE video_queue 
        SET 
            failed_executions = failed_executions + 1,
            last_error_code = NEW.error_code,
            last_error_message = NEW.error_message
        WHERE id = NEW.queue_item_id;
    END IF;
    
    -- 목표 달성 시 completed로 변경
    UPDATE video_queue 
    SET 
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
    WHERE id = NEW.queue_item_id 
      AND completed_executions >= target_executions
      AND status != 'completed';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS execution_logs_update_queue ON execution_logs;
CREATE TRIGGER execution_logs_update_queue
    AFTER INSERT ON execution_logs
    FOR EACH ROW EXECUTE FUNCTION update_queue_status_on_execution();

-- comment_pool 사용 시 가중치 감소
CREATE OR REPLACE FUNCTION decrease_comment_weight()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.comment_id IS NOT NULL THEN
        UPDATE comment_pool 
        SET 
            use_count = use_count + 1,
            last_used_at = CURRENT_TIMESTAMP,
            weight = GREATEST(weight - 1, 10)  -- 최소 10 유지
        WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS execution_logs_comment_used ON execution_logs;
CREATE TRIGGER execution_logs_comment_used
    AFTER INSERT ON execution_logs
    FOR EACH ROW EXECUTE FUNCTION decrease_comment_weight();

-- =====================================================
-- 뷰
-- =====================================================

-- 대기열 상태 요약
CREATE OR REPLACE VIEW video_queue_summary AS
SELECT 
    status,
    source,
    COUNT(*) as count,
    SUM(target_executions) as total_target,
    SUM(completed_executions) as total_completed,
    SUM(failed_executions) as total_failed,
    ROUND(AVG(completed_executions::float / NULLIF(target_executions, 0) * 100)::numeric, 1) as avg_progress
FROM video_queue
GROUP BY status, source;

-- 일별 실행 통계
CREATE OR REPLACE VIEW daily_execution_stats AS
SELECT 
    DATE(completed_at) as date,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE status = 'success') as success_count,
    COUNT(*) FILTER (WHERE status = 'partial') as partial_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'error') as error_count,
    COUNT(*) FILTER (WHERE did_like = TRUE) as like_count,
    COUNT(*) FILTER (WHERE did_comment = TRUE) as comment_count,
    ROUND(AVG(watch_percent)::numeric, 1) as avg_watch_percent,
    SUM(watch_duration_seconds) as total_watch_time,
    COUNT(DISTINCT device_id) as unique_devices,
    COUNT(DISTINCT queue_item_id) as unique_videos
FROM execution_logs
WHERE completed_at IS NOT NULL
GROUP BY DATE(completed_at)
ORDER BY date DESC;

-- 디바이스별 통계
CREATE OR REPLACE VIEW device_execution_stats AS
SELECT 
    d.id as device_id,
    d.hierarchy_id,
    d.serial_number,
    d.youtube_logged_in,
    COUNT(el.id) as total_executions,
    COUNT(el.id) FILTER (WHERE el.status = 'success') as success_count,
    COUNT(el.id) FILTER (WHERE el.did_like = TRUE) as like_count,
    COUNT(el.id) FILTER (WHERE el.did_comment = TRUE) as comment_count,
    ROUND(AVG(el.watch_percent)::numeric, 1) as avg_watch_percent,
    SUM(el.watch_duration_seconds) as total_watch_time,
    MAX(el.completed_at) as last_execution
FROM devices d
LEFT JOIN execution_logs el ON d.id = el.device_id
GROUP BY d.id, d.hierarchy_id, d.serial_number, d.youtube_logged_in;

-- 에러 통계
CREATE OR REPLACE VIEW error_stats AS
SELECT 
    el.error_code,
    ec.category,
    ec.description,
    ec.should_retry,
    COUNT(*) as occurrence_count,
    MAX(el.completed_at) as last_occurrence
FROM execution_logs el
JOIN error_codes ec ON el.error_code = ec.code
WHERE el.error_code IS NOT NULL
GROUP BY el.error_code, ec.category, ec.description, ec.should_retry
ORDER BY occurrence_count DESC;

-- =====================================================
-- 함수: 랜덤 댓글 선택 (가중치 기반)
-- =====================================================
CREATE OR REPLACE FUNCTION get_random_comment(
    p_category VARCHAR DEFAULT NULL,
    p_language VARCHAR DEFAULT 'ko'
)
RETURNS TABLE(id UUID, content TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT cp.id, cp.content
    FROM comment_pool cp
    WHERE cp.is_active = TRUE
      AND (p_category IS NULL OR cp.category = p_category)
      AND (p_language = 'mixed' OR cp.language = p_language OR cp.language = 'mixed')
    ORDER BY RANDOM() * cp.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 함수: 인터랙션 확률 계산 (조회수 기반)
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_interaction_probability(
    p_view_count INTEGER,
    p_base_probability FLOAT
)
RETURNS FLOAT AS $$
BEGIN
    -- 조회수가 적을수록 확률 증가
    IF p_view_count < 1000 THEN
        RETURN LEAST(p_base_probability * 2.0, 1.0);
    ELSIF p_view_count < 10000 THEN
        RETURN LEAST(p_base_probability * 1.5, 1.0);
    ELSE
        RETURN p_base_probability;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 함수: 다음 실행할 대기열 항목 가져오기
-- =====================================================
CREATE OR REPLACE FUNCTION get_next_queue_item()
RETURNS TABLE(
    id UUID,
    youtube_video_id VARCHAR,
    title VARCHAR,
    search_keyword VARCHAR,
    duration_seconds INTEGER,
    like_probability FLOAT,
    comment_probability FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vq.id,
        vq.youtube_video_id,
        vq.title,
        COALESCE(vq.search_keyword, vq.title) as search_keyword,
        vq.duration_seconds,
        calculate_interaction_probability(vq.view_count, vq.like_probability),
        calculate_interaction_probability(vq.view_count, vq.comment_probability)
    FROM video_queue vq
    WHERE vq.status IN ('ready', 'pending')
      AND vq.is_ready = TRUE
      AND vq.completed_executions < vq.target_executions
      AND (vq.retry_count < vq.max_retries OR vq.failed_executions = 0)
    ORDER BY vq.priority DESC, vq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 함수: 사용 가능한 디바이스 목록 (50% 선택)
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_devices(
    p_percent FLOAT DEFAULT 0.5,
    p_workstation_id VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    device_id UUID,
    hierarchy_id VARCHAR,
    serial_number VARCHAR,
    youtube_logged_in BOOLEAN
) AS $$
DECLARE
    v_total_count INTEGER;
    v_select_count INTEGER;
BEGIN
    -- 사용 가능한 디바이스 수 계산
    SELECT COUNT(*) INTO v_total_count
    FROM devices d
    WHERE d.status = 'idle'
      AND (p_workstation_id IS NULL OR d.workstation_id = p_workstation_id);
    
    -- 선택할 디바이스 수 (최소 1대)
    v_select_count := GREATEST(CEIL(v_total_count * p_percent), 1);
    
    RETURN QUERY
    SELECT 
        d.id,
        d.hierarchy_id,
        d.serial_number,
        d.youtube_logged_in
    FROM devices d
    WHERE d.status = 'idle'
      AND (p_workstation_id IS NULL OR d.workstation_id = p_workstation_id)
    ORDER BY RANDOM()
    LIMIT v_select_count;
END;
$$ LANGUAGE plpgsql;
