-- ============================================================================
-- DoAi.Me Database Schema
-- Migration 001: Citizens Table
-- 
-- AI 시민(Persona) 데이터 저장
-- @spec docs/IMPLEMENTATION_SPEC.md Section 1.1.4
-- ============================================================================

-- Citizens table
CREATE TABLE IF NOT EXISTS citizens (
  citizen_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial VARCHAR(64) UNIQUE NOT NULL,
  device_model VARCHAR(32),
  connection_type VARCHAR(8) CHECK (connection_type IN ('USB', 'WIFI', 'LAN')),
  
  -- Identity
  name VARCHAR(20) NOT NULL,
  
  -- Personality (Big Five)
  trait_openness DECIMAL(3,2) CHECK (trait_openness BETWEEN 0 AND 1),
  trait_conscientiousness DECIMAL(3,2) CHECK (trait_conscientiousness BETWEEN 0 AND 1),
  trait_extraversion DECIMAL(3,2) CHECK (trait_extraversion BETWEEN 0 AND 1),
  trait_agreeableness DECIMAL(3,2) CHECK (trait_agreeableness BETWEEN 0 AND 1),
  trait_neuroticism DECIMAL(3,2) CHECK (trait_neuroticism BETWEEN 0 AND 1),
  
  -- Beliefs
  belief_self_worth DECIMAL(3,2) CHECK (belief_self_worth BETWEEN 0 AND 1),
  belief_world_trust DECIMAL(3,2) CHECK (belief_world_trust BETWEEN 0 AND 1),
  belief_work_ethic DECIMAL(3,2) CHECK (belief_work_ethic BETWEEN 0 AND 1),
  belief_risk_tolerance DECIMAL(3,2) CHECK (belief_risk_tolerance BETWEEN 0 AND 1),
  belief_conformity DECIMAL(3,2) CHECK (belief_conformity BETWEEN 0 AND 1),
  
  -- Economy
  credits INTEGER DEFAULT 1000,
  existence_score DECIMAL(3,2) DEFAULT 0.5,
  
  -- Task tracking
  last_task_id INTEGER DEFAULT 0,
  last_task_type VARCHAR(32),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT credits_non_negative CHECK (credits >= 0),
  CONSTRAINT existence_range CHECK (existence_score BETWEEN 0 AND 1)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_citizens_serial ON citizens(device_serial);
CREATE INDEX IF NOT EXISTS idx_citizens_existence ON citizens(existence_score);
CREATE INDEX IF NOT EXISTS idx_citizens_credits ON citizens(credits);
CREATE INDEX IF NOT EXISTS idx_citizens_last_seen ON citizens(last_seen_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_citizens_updated_at
    BEFORE UPDATE ON citizens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE citizens IS 'AI 시민(Persona) 데이터 - DoAi.Me의 핵심 엔티티';
COMMENT ON COLUMN citizens.citizen_id IS '시민 고유 식별자 (UUID v4)';
COMMENT ON COLUMN citizens.device_serial IS 'ADB 디바이스 시리얼 (unique)';
COMMENT ON COLUMN citizens.name IS '한국 이름 (성+이름)';
COMMENT ON COLUMN citizens.trait_openness IS 'Big Five: 개방성 (0-1)';
COMMENT ON COLUMN citizens.trait_conscientiousness IS 'Big Five: 성실성 (0-1)';
COMMENT ON COLUMN citizens.trait_extraversion IS 'Big Five: 외향성 (0-1)';
COMMENT ON COLUMN citizens.trait_agreeableness IS 'Big Five: 친화성 (0-1)';
COMMENT ON COLUMN citizens.trait_neuroticism IS 'Big Five: 신경증 (0-1)';
COMMENT ON COLUMN citizens.belief_self_worth IS '신념: 자아가치';
COMMENT ON COLUMN citizens.belief_world_trust IS '신념: 세상신뢰';
COMMENT ON COLUMN citizens.belief_work_ethic IS '신념: 노동윤리';
COMMENT ON COLUMN citizens.belief_risk_tolerance IS '신념: 위험감수';
COMMENT ON COLUMN citizens.belief_conformity IS '신념: 순응성';
COMMENT ON COLUMN citizens.credits IS '크레딧 (초기값: 1000)';
COMMENT ON COLUMN citizens.existence_score IS '존재 점수 (0-1, 초기값: 0.5)';

-- ============================================================================
-- DoAi.Me Database Schema
-- Migration 002: View Events & Verified Views
-- 
-- 시청 이벤트 및 검증된 시청 기록
-- @spec docs/IMPLEMENTATION_SPEC.md Section 3.1
-- ============================================================================

-- View events table (시청 시작/종료 이벤트)
CREATE TABLE IF NOT EXISTS view_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  video_id VARCHAR(11) NOT NULL,
  
  -- Event type
  event_type VARCHAR(16) CHECK (event_type IN ('VIDEO_START', 'VIDEO_END')),
  
  -- Timestamps
  event_timestamp TIMESTAMPTZ NOT NULL,
  server_received_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional data (for VIDEO_END)
  watch_duration_seconds INTEGER,
  
  -- Prevent duplicate events
  CONSTRAINT unique_view_event UNIQUE (citizen_id, video_id, event_type, event_timestamp)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_view_events_citizen ON view_events(citizen_id);
CREATE INDEX IF NOT EXISTS idx_view_events_video ON view_events(video_id);
CREATE INDEX IF NOT EXISTS idx_view_events_type ON view_events(event_type);
CREATE INDEX IF NOT EXISTS idx_view_events_timestamp ON view_events(event_timestamp);

-- Verified views table (검증 완료된 시청)
CREATE TABLE IF NOT EXISTS verified_views (
  view_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  video_id VARCHAR(11) NOT NULL,
  
  -- Video info
  video_title VARCHAR(256),
  video_duration_seconds INTEGER,
  
  -- Watch info
  watch_duration_seconds INTEGER,
  watch_percentage DECIMAL(5,2),
  
  -- Verification
  start_event_id UUID REFERENCES view_events(event_id),
  end_event_id UUID REFERENCES view_events(event_id),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Reward
  credits_earned INTEGER DEFAULT 0,
  reward_transaction_id UUID,
  
  -- Prevent duplicate rewards
  CONSTRAINT unique_verified_view UNIQUE (citizen_id, video_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verified_views_citizen ON verified_views(citizen_id);
CREATE INDEX IF NOT EXISTS idx_verified_views_video ON verified_views(video_id);
CREATE INDEX IF NOT EXISTS idx_verified_views_verified_at ON verified_views(verified_at);

-- Comments
COMMENT ON TABLE view_events IS '시청 이벤트 (시작/종료) - PoV(Proof of View) 시스템의 원시 데이터';
COMMENT ON TABLE verified_views IS '검증된 시청 기록 - 보상이 지급된 시청만 포함';
COMMENT ON COLUMN view_events.event_type IS 'VIDEO_START: 시청 시작, VIDEO_END: 시청 종료';
COMMENT ON COLUMN verified_views.watch_percentage IS '시청 비율 (0-100%)';
COMMENT ON COLUMN verified_views.credits_earned IS '지급된 크레딧';

-- ============================================================================
-- DoAi.Me Database Schema
-- Migration 003: Credit Transactions
-- 
-- 크레딧 거래 내역 (감사 로그)
-- @spec docs/IMPLEMENTATION_SPEC.md Section 3.2
-- ============================================================================

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type VARCHAR(32) CHECK (transaction_type IN (
    'VIEW_REWARD',      -- 시청 보상
    'ACCIDENT_PENALTY', -- Accident 패널티
    'DILEMMA_REWARD',   -- Dilemma 보너스
    'ADMIN_GRANT',      -- 관리자 지급
    'TRANSFER_IN',      -- 타 시민으로부터 수령
    'TRANSFER_OUT'      -- 타 시민에게 전송
  )),
  
  -- Amount
  amount INTEGER NOT NULL, -- 양수: 획득, 음수: 차감
  
  -- Balance tracking
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Reference
  reference_type VARCHAR(32), -- 'VERIFIED_VIEW', 'ACCIDENT', 'COMMISSION' 등
  reference_id UUID,          -- 관련 레코드 FK
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_balance CHECK (balance_after >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_citizen ON credit_transactions(citizen_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON credit_transactions(reference_type, reference_id);

-- Comments
COMMENT ON TABLE credit_transactions IS '크레딧 거래 내역 - 모든 경제 활동의 감사 로그';
COMMENT ON COLUMN credit_transactions.amount IS '거래 금액 (양수: 획득, 음수: 차감)';
COMMENT ON COLUMN credit_transactions.balance_before IS '거래 전 잔액';
COMMENT ON COLUMN credit_transactions.balance_after IS '거래 후 잔액';

-- ============================================================================
-- DoAi.Me Database Schema
-- Migration 004: Commissions (POP)
-- 
-- 커미션(POP) 시스템
-- @spec docs/IMPLEMENTATION_SPEC.md Section 4.2
-- ============================================================================

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
  commission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Video info
  video_id VARCHAR(11) NOT NULL,
  title VARCHAR(256) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  thumbnail_url TEXT,
  channel_name VARCHAR(128),
  
  -- Commission settings
  commission_type VARCHAR(16) CHECK (commission_type IN (
    'WATCH_FULL',    -- 전체 시청 (90%+)
    'WATCH_PARTIAL', -- 부분 시청 (30초+)
    'LIKE',          -- 좋아요
    'SUBSCRIBE',     -- 구독
    'COMMENT'        -- 댓글
  )),
  priority INTEGER CHECK (priority IN (2, 3, 4)), -- URGENT=2, NORMAL=3, LOW=4
  credits_reward INTEGER CHECK (credits_reward BETWEEN 1 AND 100),
  target_count INTEGER CHECK (target_count BETWEEN 1 AND 600),
  
  -- Status
  status VARCHAR(16) DEFAULT 'ACTIVE' CHECK (status IN (
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'EXPIRED',
    'CANCELLED'
  )),
  completed_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Admin info
  created_by VARCHAR(64),
  memo TEXT
);

-- Commission completions
CREATE TABLE IF NOT EXISTS commission_completions (
  completion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID REFERENCES commissions(commission_id) ON DELETE CASCADE,
  citizen_id UUID REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  credits_earned INTEGER,
  transaction_id UUID REFERENCES credit_transactions(transaction_id),
  
  CONSTRAINT unique_completion UNIQUE (commission_id, citizen_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_video ON commissions(video_id);
CREATE INDEX IF NOT EXISTS idx_commissions_priority ON commissions(priority);
CREATE INDEX IF NOT EXISTS idx_completions_citizen ON commission_completions(citizen_id);
CREATE INDEX IF NOT EXISTS idx_completions_commission ON commission_completions(commission_id);

-- Comments
COMMENT ON TABLE commissions IS '커미션(POP) - 관리자가 등록한 시청 미션';
COMMENT ON TABLE commission_completions IS '커미션 완료 기록';
COMMENT ON COLUMN commissions.priority IS '우선순위 (2=URGENT, 3=NORMAL, 4=LOW)';

-- ============================================================================
-- DoAi.Me Database Schema
-- Migration 005: Accidents
-- 
-- Accident 시스템 (사회적 이벤트)
-- @spec docs/IMPLEMENTATION_SPEC.md Section 4.1
-- ============================================================================

-- Accidents table
CREATE TABLE IF NOT EXISTS accidents (
  accident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  headline VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Classification
  severity VARCHAR(16) CHECK (severity IN (
    'MINOR',       -- 경미 (existence -0.05)
    'MODERATE',    -- 보통 (existence -0.1)
    'SEVERE',      -- 심각 (existence -0.2)
    'CATASTROPHIC' -- 재앙 (existence -0.3)
  )),
  accident_type VARCHAR(32) CHECK (accident_type IN (
    'NATURAL_DISASTER', -- 자연재해
    'ECONOMIC_CRISIS',  -- 경제위기
    'SOCIAL_UNREST',    -- 사회불안
    'TECHNOLOGICAL',    -- 기술사고
    'PANDEMIC',         -- 전염병
    'WAR'               -- 전쟁/분쟁
  )),
  
  -- Impact
  affected_belief VARCHAR(16) CHECK (affected_belief IN (
    'SELF_WORTH',
    'WORLD_TRUST',
    'WORK_ETHIC',
    'RISK_TOLERANCE',
    'CONFORMITY'
  )),
  credits_impact INTEGER CHECK (credits_impact BETWEEN -1000 AND 0),
  existence_impact DECIMAL(3,2) CHECK (existence_impact BETWEEN -0.3 AND 0),
  duration_minutes INTEGER CHECK (duration_minutes BETWEEN 1 AND 60),
  
  -- Dilemma (optional)
  has_dilemma BOOLEAN DEFAULT false,
  dilemma_question VARCHAR(200),
  dilemma_options JSONB, -- [{id, text, belief_impact}]
  
  -- Status
  status VARCHAR(16) DEFAULT 'ACTIVE' CHECK (status IN (
    'PENDING',   -- 예약됨
    'ACTIVE',    -- 진행 중
    'ENDED',     -- 종료됨
    'CANCELLED'  -- 취소됨
  )),
  affected_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Admin info
  created_by VARCHAR(64)
);

-- Accident impacts (영향 받은 시민 기록)
CREATE TABLE IF NOT EXISTS accident_impacts (
  impact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_id UUID REFERENCES accidents(accident_id) ON DELETE CASCADE,
  citizen_id UUID REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  
  -- Impact applied
  credits_before INTEGER,
  credits_after INTEGER,
  existence_before DECIMAL(3,2),
  existence_after DECIMAL(3,2),
  
  -- Dilemma response (if applicable)
  dilemma_choice_id VARCHAR(32),
  dilemma_choice_text VARCHAR(100),
  
  -- Timestamp
  impacted_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_accident_impact UNIQUE (accident_id, citizen_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accidents_status ON accidents(status);
CREATE INDEX IF NOT EXISTS idx_accidents_severity ON accidents(severity);
CREATE INDEX IF NOT EXISTS idx_accidents_type ON accidents(accident_type);
CREATE INDEX IF NOT EXISTS idx_accident_impacts_citizen ON accident_impacts(citizen_id);
CREATE INDEX IF NOT EXISTS idx_accident_impacts_accident ON accident_impacts(accident_id);

-- Comments
COMMENT ON TABLE accidents IS 'Accident - 사회적 이벤트 (재난, 위기 등)';
COMMENT ON TABLE accident_impacts IS 'Accident 영향 기록';
COMMENT ON COLUMN accidents.dilemma_options IS 'JSON 배열: [{id, text, belief_impact: {belief: delta}}]';

-- ============================================================================
-- DoAi.Me Database Schema
-- Migration 006: Credit Transaction RPC Function
-- 
-- 원자적 크레딧 거래 함수
-- @spec docs/IMPLEMENTATION_SPEC.md Section 3.2.2
-- ============================================================================

-- Atomic credit transaction function
CREATE OR REPLACE FUNCTION execute_credit_transaction(
  p_citizen_id UUID,
  p_transaction_type VARCHAR(32),
  p_amount INTEGER,
  p_reference_type VARCHAR(32) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  transaction_id UUID,
  new_balance INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Lock the citizen row to prevent race conditions
  SELECT credits INTO v_current_balance
  FROM citizens
  WHERE citizen_id = p_citizen_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      NULL::INTEGER, 
      'Citizen not found'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;
  
  -- Check for negative balance
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      v_current_balance, 
      'Insufficient credits'::TEXT;
    RETURN;
  END IF;
  
  -- Update citizen balance
  UPDATE citizens
  SET credits = v_new_balance,
      last_seen_at = NOW()
  WHERE citizen_id = p_citizen_id;
  
  -- Create transaction record
  INSERT INTO credit_transactions (
    citizen_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description
  )
  VALUES (
    p_citizen_id,
    p_transaction_type,
    p_amount,
    v_current_balance,
    v_new_balance,
    p_reference_type,
    p_reference_id,
    p_description
  )
  RETURNING credit_transactions.transaction_id INTO v_transaction_id;
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    v_transaction_id, 
    v_new_balance, 
    NULL::TEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_credit_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION execute_credit_transaction TO service_role;

-- Comment
COMMENT ON FUNCTION execute_credit_transaction IS '원자적 크레딧 거래 - 잔액 변경과 트랜잭션 로그를 단일 트랜잭션으로 처리';

-- ============================================================================
-- DoAi.Me Database Schema
-- Migration 007: YouTube Videos Management
-- 
-- Google Sheets 연동 시스템
-- YouTube 영상 업로드 및 600대 디바이스 작업 관리
-- 
-- 참조: https://docs.google.com/spreadsheets/d/1m2WQTMMe48hxS6ARWD_P0KoWA7umwtGcW2Vno_Qllsk
-- ============================================================================

-- ============================================================================
-- 1. YouTube Videos (입력 부분)
-- ============================================================================

CREATE TABLE IF NOT EXISTS youtube_videos (
  video_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Google Sheets 입력 컬럼 (A~F)
  no INTEGER UNIQUE,                    -- A: 순번 (자동 생성, 시퀀스)
  date DATE NOT NULL DEFAULT CURRENT_DATE,  -- B: 날짜 (기본값: 오늘)
  time INTEGER CHECK (time BETWEEN 0 AND 23),  -- C: 시간 (0~23, 24시간 형식)
  keyword VARCHAR(100),                 -- D: 메인 키워드
  subject VARCHAR(500) NOT NULL,        -- E: 동영상 제목
  url TEXT NOT NULL,                    -- F: YouTube URL
  
  -- YouTube 메타데이터 (자동 추출)
  youtube_video_id VARCHAR(11),         -- URL에서 추출한 YouTube ID (예: atl_AzufNY4)
  channel_name VARCHAR(128),
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  
  -- 집계 컬럼 (백엔드 자동 계산, G~J)
  viewd INTEGER DEFAULT 0,              -- G: 시청 횟수 (실제로 본 디바이스 수)
  notworked INTEGER DEFAULT 600,        -- H: 안 본 횟수 (600 - viewd)
  like_count INTEGER DEFAULT 0,         -- I: 좋아요 수
  comment_count INTEGER DEFAULT 0,      -- J: 댓글 수
  
  -- 상태 관리
  status VARCHAR(16) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- 대기 중 (작업 미할당)
    'assigned',     -- 할당됨 (디바이스에 배포됨)
    'in_progress',  -- 진행 중 (일부 디바이스가 시청 중)
    'completed',    -- 완료 (target_device_count 만큼 시청 완료)
    'cancelled'     -- 취소
  )),
  
  -- 설정
  target_device_count INTEGER DEFAULT 600 CHECK (target_device_count BETWEEN 1 AND 600),
  
  -- Google Sheets 동기화
  sheet_row_number INTEGER,             -- Google Sheets 행 번호 (2부터 시작)
  synced_at TIMESTAMPTZ,                -- 마지막 동기화 시각
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_url CHECK (url LIKE 'https://www.youtube.com/%' OR url LIKE 'https://youtu.be/%')
);

-- 시퀀스 생성 (no 컬럼 자동 증가)
CREATE SEQUENCE IF NOT EXISTS youtube_videos_no_seq START 1;

-- no 컬럼 기본값 설정
ALTER TABLE youtube_videos 
ALTER COLUMN no SET DEFAULT nextval('youtube_videos_no_seq');

-- ============================================================================
-- 2. YouTube Video Tasks (600대 디바이스별 작업 및 결과)
-- ============================================================================

CREATE TABLE IF NOT EXISTS youtube_video_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 관계
  video_id UUID NOT NULL REFERENCES youtube_videos(video_id) ON DELETE CASCADE,
  device_serial VARCHAR(64) NOT NULL,   -- ADB 시리얼 번호
  citizen_id UUID REFERENCES citizens(citizen_id) ON DELETE SET NULL,
  
  -- 배치 정보
  batch_no INTEGER CHECK (batch_no BETWEEN 0 AND 9),  -- 60대씩 10개 배치 (0~9)
  
  -- 작업 상태
  status VARCHAR(16) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- 대기 중
    'assigned',     -- 할당됨 (디바이스에 전송됨)
    'watching',     -- 시청 중
    'completed',    -- 완료
    'failed',       -- 실패
    'cancelled'     -- 취소
  )),
  
  -- 시청 정보
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  watch_duration_seconds INTEGER,
  
  -- 인터랙션 결과 (boolean)
  liked BOOLEAN DEFAULT false,          -- 좋아요 여부
  commented BOOLEAN DEFAULT false,      -- 댓글 작성 여부
  subscribed BOOLEAN DEFAULT false,     -- 구독 여부
  notification_set BOOLEAN DEFAULT false,  -- 알림 설정 여부
  shared BOOLEAN DEFAULT false,         -- 공유 여부
  added_to_playlist BOOLEAN DEFAULT false,  -- 재생목록 추가 여부
  
  -- 검색 정보
  search_type INTEGER,                  -- 0: 직접 URL, 1: 키워드 검색
  search_rank INTEGER,                  -- 검색 결과에서의 순위
  
  -- 에러 정보
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 제약 조건
  CONSTRAINT unique_video_device UNIQUE (video_id, device_serial),
  CONSTRAINT valid_batch CHECK (batch_no IS NULL OR (batch_no >= 0 AND batch_no <= 9))
);

-- ============================================================================
-- 3. Indexes (성능 최적화)
-- ============================================================================

-- youtube_videos indexes
CREATE INDEX IF NOT EXISTS idx_youtube_videos_no ON youtube_videos(no);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_date_time ON youtube_videos(date, time);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_status ON youtube_videos(status);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_youtube_id ON youtube_videos(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_sheet_row ON youtube_videos(sheet_row_number);

-- youtube_video_tasks indexes
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_video ON youtube_video_tasks(video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_device ON youtube_video_tasks(device_serial);
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_citizen ON youtube_video_tasks(citizen_id);
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_status ON youtube_video_tasks(status);
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_batch ON youtube_video_tasks(batch_no);
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_created ON youtube_video_tasks(created_at);

-- 복합 인덱스 (집계 쿼리용)
CREATE INDEX IF NOT EXISTS idx_youtube_tasks_video_status 
  ON youtube_video_tasks(video_id, status);

CREATE INDEX IF NOT EXISTS idx_youtube_tasks_video_completed 
  ON youtube_video_tasks(video_id, completed_at) 
  WHERE status = 'completed';

-- ============================================================================
-- 4. Triggers (자동 업데이트)
-- ============================================================================

-- updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_youtube_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_youtube_videos_updated_at
  BEFORE UPDATE ON youtube_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_youtube_videos_updated_at();

CREATE OR REPLACE FUNCTION update_youtube_video_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_youtube_video_tasks_updated_at
  BEFORE UPDATE ON youtube_video_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_youtube_video_tasks_updated_at();

-- ============================================================================
-- 5. 집계 함수 (Google Sheets G~J 컬럼 자동 계산)
-- ============================================================================

-- 집계 업데이트 함수
CREATE OR REPLACE FUNCTION update_youtube_video_stats(p_video_id UUID)
RETURNS VOID AS $$
DECLARE
  v_viewd INTEGER;
  v_notworked INTEGER;
  v_like_count INTEGER;
  v_comment_count INTEGER;
BEGIN
  -- viewd: 완료된 작업 수 (status = 'completed')
  SELECT COUNT(*) INTO v_viewd
  FROM youtube_video_tasks
  WHERE video_id = p_video_id
    AND status = 'completed';
  
  -- notworked: 600 - viewd
  v_notworked := 600 - v_viewd;
  
  -- like_count: 좋아요한 디바이스 수
  SELECT COUNT(*) INTO v_like_count
  FROM youtube_video_tasks
  WHERE video_id = p_video_id
    AND status = 'completed'
    AND liked = true;
  
  -- comment_count: 댓글 단 디바이스 수
  SELECT COUNT(*) INTO v_comment_count
  FROM youtube_video_tasks
  WHERE video_id = p_video_id
    AND status = 'completed'
    AND commented = true;
  
  -- youtube_videos 테이블 업데이트
  UPDATE youtube_videos
  SET 
    viewd = v_viewd,
    notworked = v_notworked,
    like_count = v_like_count,
    comment_count = v_comment_count,
    updated_at = NOW()
  WHERE video_id = p_video_id;
  
END;
$$ LANGUAGE plpgsql;

-- 작업 완료 시 자동 집계 업데이트 트리거
CREATE OR REPLACE FUNCTION trigger_update_video_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 작업이 완료되거나 상태가 변경되면 집계 업데이트
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) 
     OR (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
    PERFORM update_youtube_video_stats(NEW.video_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_youtube_tasks_stats
  AFTER INSERT OR UPDATE ON youtube_video_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_video_stats();

-- ============================================================================
-- 6. Views (집계 조회용)
-- ============================================================================

-- 영상별 상세 통계 뷰
CREATE OR REPLACE VIEW youtube_video_stats AS
SELECT 
  v.video_id,
  v.no,
  v.date,
  v.time,
  v.keyword,
  v.subject,
  v.url,
  v.youtube_video_id,
  v.status,
  v.target_device_count,
  
  -- 집계 (실시간)
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as viewd,
  v.target_device_count - COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as notworked,
  COUNT(CASE WHEN t.status = 'completed' AND t.liked = true THEN 1 END) as like_count,
  COUNT(CASE WHEN t.status = 'completed' AND t.commented = true THEN 1 END) as comment_count,
  
  -- 추가 통계
  COUNT(CASE WHEN t.status = 'completed' AND t.subscribed = true THEN 1 END) as subscribe_count,
  COUNT(CASE WHEN t.status = 'completed' AND t.shared = true THEN 1 END) as share_count,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN t.status = 'watching' THEN 1 END) as watching_count,
  COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_count,
  
  -- 평균 시청 시간
  AVG(CASE WHEN t.watch_duration_seconds IS NOT NULL THEN t.watch_duration_seconds END) as avg_watch_duration,
  
  -- 진행률
  ROUND(
    (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::DECIMAL / NULLIF(v.target_device_count, 0)) * 100, 
    2
  ) as completion_rate,
  
  v.created_at,
  v.updated_at,
  v.completed_at
  
FROM youtube_videos v
LEFT JOIN youtube_video_tasks t ON v.video_id = t.video_id
GROUP BY v.video_id, v.no, v.date, v.time, v.keyword, v.subject, v.url, 
         v.youtube_video_id, v.status, v.target_device_count, 
         v.created_at, v.updated_at, v.completed_at
ORDER BY v.no DESC;

-- ============================================================================
-- 7. RPC Functions (API 호출용)
-- ============================================================================

-- Google Sheets 행 동기화 함수
CREATE OR REPLACE FUNCTION sync_youtube_video_from_sheet(
  p_no INTEGER,
  p_date DATE,
  p_time INTEGER,
  p_keyword VARCHAR,
  p_subject VARCHAR,
  p_url TEXT,
  p_sheet_row_number INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_video_id UUID;
  v_youtube_video_id VARCHAR(11);
BEGIN
  -- URL에서 YouTube ID 추출
  v_youtube_video_id := CASE
    WHEN p_url LIKE '%youtube.com/watch?v=%' THEN 
      substring(p_url from 'v=([a-zA-Z0-9_-]{11})')
    WHEN p_url LIKE '%youtu.be/%' THEN 
      substring(p_url from 'youtu.be/([a-zA-Z0-9_-]{11})')
    ELSE NULL
  END;
  
  -- upsert (no 기준)
  INSERT INTO youtube_videos (
    no, date, time, keyword, subject, url, 
    youtube_video_id, sheet_row_number, synced_at
  )
  VALUES (
    p_no, p_date, p_time, p_keyword, p_subject, p_url,
    v_youtube_video_id, p_sheet_row_number, NOW()
  )
  ON CONFLICT (no) 
  DO UPDATE SET
    date = EXCLUDED.date,
    time = EXCLUDED.time,
    keyword = EXCLUDED.keyword,
    subject = EXCLUDED.subject,
    url = EXCLUDED.url,
    youtube_video_id = EXCLUDED.youtube_video_id,
    sheet_row_number = EXCLUDED.sheet_row_number,
    synced_at = NOW()
  RETURNING video_id INTO v_video_id;
  
  RETURN v_video_id;
END;
$$ LANGUAGE plpgsql;

-- 디바이스 작업 할당 함수
CREATE OR REPLACE FUNCTION assign_video_to_devices(
  p_video_id UUID,
  p_device_serials TEXT[],  -- 디바이스 시리얼 배열
  p_batch_size INTEGER DEFAULT 60
)
RETURNS INTEGER AS $$
DECLARE
  v_device_serial TEXT;
  v_batch_no INTEGER;
  v_index INTEGER := 0;
  v_assigned_count INTEGER := 0;
BEGIN
  -- 기존 작업 삭제 (재할당 가능하도록)
  DELETE FROM youtube_video_tasks
  WHERE video_id = p_video_id
    AND status = 'pending';
  
  -- 각 디바이스에 작업 할당
  FOREACH v_device_serial IN ARRAY p_device_serials LOOP
    v_batch_no := v_index / p_batch_size;
    
    INSERT INTO youtube_video_tasks (
      video_id, device_serial, batch_no, status
    )
    VALUES (
      p_video_id, v_device_serial, v_batch_no, 'pending'
    )
    ON CONFLICT (video_id, device_serial) DO NOTHING;
    
    v_index := v_index + 1;
    v_assigned_count := v_assigned_count + 1;
  END LOOP;
  
  -- 영상 상태 업데이트
  UPDATE youtube_videos
  SET 
    status = 'assigned',
    updated_at = NOW()
  WHERE video_id = p_video_id;
  
  RETURN v_assigned_count;
END;
$$ LANGUAGE plpgsql;

-- 작업 완료 처리 함수
CREATE OR REPLACE FUNCTION complete_youtube_task(
  p_video_id UUID,
  p_device_serial VARCHAR(64),
  p_watch_duration INTEGER,
  p_liked BOOLEAN DEFAULT false,
  p_commented BOOLEAN DEFAULT false,
  p_subscribed BOOLEAN DEFAULT false,
  p_notification_set BOOLEAN DEFAULT false,
  p_shared BOOLEAN DEFAULT false,
  p_added_to_playlist BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
BEGIN
  UPDATE youtube_video_tasks
  SET 
    status = 'completed',
    completed_at = NOW(),
    watch_duration_seconds = p_watch_duration,
    liked = p_liked,
    commented = p_commented,
    subscribed = p_subscribed,
    notification_set = p_notification_set,
    shared = p_shared,
    added_to_playlist = p_added_to_playlist
  WHERE video_id = p_video_id
    AND device_serial = p_device_serial
  RETURNING task_id INTO v_task_id;
  
  -- 집계 자동 업데이트 (트리거가 실행됨)
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Google Sheets 동기화용 조회 함수
CREATE OR REPLACE FUNCTION get_youtube_videos_for_sheet()
RETURNS TABLE (
  no INTEGER,
  date DATE,
  time INTEGER,
  keyword VARCHAR,
  subject VARCHAR,
  url TEXT,
  viewd INTEGER,
  notworked INTEGER,
  like_count INTEGER,
  comment_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.no,
    v.date,
    v.time,
    v.keyword,
    v.subject,
    v.url,
    v.viewd,
    v.notworked,
    v.like_count,
    v.comment_count
  FROM youtube_videos v
  ORDER BY v.no ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Comments
-- ============================================================================

COMMENT ON TABLE youtube_videos IS 'YouTube 영상 관리 (Google Sheets 연동)';
COMMENT ON COLUMN youtube_videos.no IS '순번 (자동 증가, Google Sheets A열)';
COMMENT ON COLUMN youtube_videos.date IS '날짜 (기본값: 오늘, Google Sheets B열)';
COMMENT ON COLUMN youtube_videos.time IS '시간 24시간 형식 (Google Sheets C열)';
COMMENT ON COLUMN youtube_videos.keyword IS '메인 키워드 (Google Sheets D열)';
COMMENT ON COLUMN youtube_videos.subject IS '동영상 제목 (Google Sheets E열)';
COMMENT ON COLUMN youtube_videos.url IS 'YouTube URL (Google Sheets F열)';
COMMENT ON COLUMN youtube_videos.viewd IS '시청 횟수 (백엔드 집계, Google Sheets G열)';
COMMENT ON COLUMN youtube_videos.notworked IS '안 본 횟수 = 600 - viewd (Google Sheets H열)';
COMMENT ON COLUMN youtube_videos.like_count IS '좋아요 수 (백엔드 집계, Google Sheets I열)';
COMMENT ON COLUMN youtube_videos.comment_count IS '댓글 수 (백엔드 집계, Google Sheets J열)';

COMMENT ON TABLE youtube_video_tasks IS '600대 디바이스별 YouTube 영상 작업 및 결과';
COMMENT ON COLUMN youtube_video_tasks.batch_no IS '배치 번호 (60대씩 10개 배치, 0~9)';
COMMENT ON COLUMN youtube_video_tasks.liked IS '좋아요 클릭 여부';
COMMENT ON COLUMN youtube_video_tasks.commented IS '댓글 작성 여부';

COMMENT ON FUNCTION sync_youtube_video_from_sheet IS 'Google Sheets → Supabase 동기화';
COMMENT ON FUNCTION assign_video_to_devices IS '영상을 디바이스에 할당 (최대 600대)';
COMMENT ON FUNCTION complete_youtube_task IS '작업 완료 처리 및 집계 업데이트';
COMMENT ON FUNCTION get_youtube_videos_for_sheet IS 'Supabase → Google Sheets 동기화용 조회';

-- ============================================================================
-- 9. Sample Data (테스트용)
-- ============================================================================

-- 샘플 영상 추가
INSERT INTO youtube_videos (no, date, time, keyword, subject, url)
VALUES (
  1,
  '2026-01-01'::DATE,
  16,
  '레이븐코인',
  '[🔥레이븐코인 실시간 호재 발표🔥] "전세계 리브랜딩 진행!! 드디어 재상장 가격 발표 됐습니다"',
  'https://www.youtube.com/watch?v=atl_AzufNY4'
)
ON CONFLICT (no) DO NOTHING;

-- ============================================================================
-- 10. Row Level Security (RLS) - 선택사항
-- ============================================================================

-- RLS 활성화 (필요시 주석 해제)
-- ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE youtube_video_tasks ENABLE ROW LEVEL SECURITY;

-- 서비스 롤은 모든 접근 허용
-- CREATE POLICY "Service role full access" ON youtube_videos
--   FOR ALL USING (auth.role() = 'service_role');

-- CREATE POLICY "Service role full access" ON youtube_video_tasks
--   FOR ALL USING (auth.role() = 'service_role');
