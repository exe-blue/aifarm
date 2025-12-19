-- AIFarm 전체 데이터베이스 스키마
-- Supabase SQL Editor에서 실행

-- ================================================
-- 기존 테이블 삭제 (필요시)
-- ================================================
-- DROP TABLE IF EXISTS activity_logs CASCADE;
-- DROP TABLE IF EXISTS battle_logs CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS remix_ideas CASCADE;
-- DROP TABLE IF EXISTS trending_shorts CASCADE;
-- DROP TABLE IF EXISTS challenges CASCADE;
-- DROP TABLE IF EXISTS personas CASCADE;
-- DROP TABLE IF EXISTS channels CASCADE;
-- DROP TABLE IF EXISTS devices CASCADE;
-- DROP TABLE IF EXISTS activities CASCADE;
-- DROP TABLE IF EXISTS do_requests CASCADE;
-- DROP TABLE IF EXISTS be_activities CASCADE;
-- DROP TABLE IF EXISTS unified_logs CASCADE;

-- ================================================
-- 디바이스 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) UNIQUE NOT NULL,
  phoneboard_id INTEGER NOT NULL,
  slot_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'idle',
  current_activity VARCHAR(50),
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  battery_level INTEGER,
  temperature DECIMAL(4,1),
  wifi_signal INTEGER,
  model VARCHAR(100),
  android_version VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 활동 테이블 (6대 BE 활동)
-- ================================================
CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  color VARCHAR(20),
  allocated_devices INTEGER DEFAULT 0,
  active_devices INTEGER DEFAULT 0,
  items_processed_today INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  weight INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 채널 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS channels (
  id VARCHAR(50) PRIMARY KEY,
  youtube_channel_id VARCHAR(50),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  thumbnail_url TEXT,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  experience_to_next_level INTEGER DEFAULT 1000,
  subscriber_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  composite_score DECIMAL(5,2) DEFAULT 0,
  category_rank INTEGER,
  global_rank INTEGER,
  weekly_growth DECIMAL(5,2) DEFAULT 0,
  stats JSONB DEFAULT '{"hp":50,"mp":50,"atk":50,"def":50,"spd":50,"int":50}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 트렌딩 Shorts 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS trending_shorts (
  id VARCHAR(50) PRIMARY KEY,
  youtube_video_id VARCHAR(20),
  title TEXT,
  channel_name VARCHAR(100),
  view_count BIGINT,
  like_count INTEGER,
  music_title VARCHAR(200),
  hashtags TEXT[],
  viral_score DECIMAL(3,2),
  viral_factors TEXT[],
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 리믹스 아이디어 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS remix_ideas (
  id VARCHAR(50) PRIMARY KEY,
  source_shorts_ids TEXT[],
  target_channel_id VARCHAR(50) REFERENCES channels(id),
  title TEXT,
  concept_description TEXT,
  differentiation_point TEXT,
  remix_direction VARCHAR(20),
  recommended_music VARCHAR(200),
  estimated_viral_probability DECIMAL(3,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 챌린지 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS challenges (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  hashtags TEXT[],
  music_title VARCHAR(200),
  total_participants INTEGER DEFAULT 0,
  daily_new_participants INTEGER DEFAULT 0,
  avg_view_count INTEGER DEFAULT 0,
  lifecycle_stage VARCHAR(20) DEFAULT 'birth',
  opportunity_score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 페르소나 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS personas (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  age INTEGER,
  interests TEXT[],
  tone_description TEXT,
  sample_comments TEXT[],
  assigned_devices INTEGER DEFAULT 0,
  comments_today INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 배틀 로그 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS battle_logs (
  id VARCHAR(50) PRIMARY KEY,
  event_type VARCHAR(30) NOT NULL,
  our_channel_id VARCHAR(50) REFERENCES channels(id),
  our_channel_name VARCHAR(100),
  competitor_channel_id VARCHAR(50),
  competitor_channel_name VARCHAR(100),
  description TEXT,
  impact_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 활동 로그 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  device_id INTEGER REFERENCES devices(id),
  activity_id VARCHAR(50) REFERENCES activities(id),
  action VARCHAR(100),
  result JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 알림 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  source_activity VARCHAR(50),
  title VARCHAR(200),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- DO 요청 테이블 (요청 지시)
-- ================================================
CREATE TABLE IF NOT EXISTS do_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- YouTube 관련
  keyword VARCHAR(200) NOT NULL,
  video_title VARCHAR(500),
  video_url VARCHAR(500),
  video_id VARCHAR(50),
  channel_name VARCHAR(200),
  
  -- 에이전트 설정
  agent_start INTEGER NOT NULL,
  agent_end INTEGER NOT NULL,
  batch_size INTEGER DEFAULT 5,
  
  -- 확률 설정
  like_probability INTEGER DEFAULT 30,
  comment_probability INTEGER DEFAULT 10,
  subscribe_probability INTEGER DEFAULT 5,
  
  -- 시청 설정
  watch_time_min INTEGER DEFAULT 60,
  watch_time_max INTEGER DEFAULT 180,
  watch_percent_min INTEGER DEFAULT 40,
  watch_percent_max INTEGER DEFAULT 90,
  
  -- AI 설정
  ai_comment_enabled BOOLEAN DEFAULT true,
  ai_comment_style VARCHAR(100),
  
  -- 스케줄링
  scheduled_at TIMESTAMPTZ,
  execute_immediately BOOLEAN DEFAULT true,
  
  -- 상태
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 2,
  
  -- 진행 상황
  total_agents INTEGER,
  completed_agents INTEGER DEFAULT 0,
  failed_agents INTEGER DEFAULT 0,
  
  -- 메타데이터
  memo TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ================================================
-- BE 활동 로그 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS be_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id INTEGER REFERENCES devices(id),
  activity_type VARCHAR(50) NOT NULL,
  
  -- DO 요청 연결
  do_request_id UUID REFERENCES do_requests(id),
  
  -- 활동 상세
  description TEXT NOT NULL,
  result VARCHAR(20) NOT NULL,
  
  -- 발견 데이터
  discovered_data JSONB,
  
  -- 성과 지표
  metrics JSONB,
  
  -- 시간
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- ================================================
-- 통합 로그 테이블
-- ================================================
CREATE TABLE IF NOT EXISTS unified_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(10) NOT NULL, -- 'DO' or 'BE'
  source_id VARCHAR(50) NOT NULL,
  
  device_id INTEGER,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 인덱스 생성
-- ================================================
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_phoneboard ON devices(phoneboard_id);
CREATE INDEX IF NOT EXISTS idx_devices_heartbeat ON devices(last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_device ON activity_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battle_logs_created ON battle_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_shorts_detected ON trending_shorts(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_stage ON challenges(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_do_requests_status ON do_requests(status);
CREATE INDEX IF NOT EXISTS idx_do_requests_created ON do_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_be_activities_type ON be_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_unified_logs_timestamp ON unified_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_unified_logs_source ON unified_logs(source);

-- ================================================
-- 초기 활동 데이터 삽입
-- ================================================
INSERT INTO activities (id, name, description, icon, color, allocated_devices, weight) VALUES
('shorts_remix', 'Shorts 리믹스 팩토리', '트렌딩 Shorts 분석 및 리믹스 아이디어 생성', '🎬', 'cyan', 120, 100),
('playlist_curator', 'AI DJ 플레이리스트', 'AI 기반 플레이리스트 큐레이션', '🎵', 'purple', 100, 90),
('persona_commenter', '페르소나 코멘터', '10가지 페르소나 기반 커뮤니티 활동', '💬', 'pink', 130, 95),
('trend_scout', '트렌드 스카우터', '24시간 트렌드 순찰 및 발굴', '🕵️', 'yellow', 90, 85),
('challenge_hunter', '챌린지 헌터', '챌린지/밈 탐지 및 참여 추천', '🏅', 'orange', 70, 80),
('thumbnail_lab', '썸네일/제목 랩', '썸네일 분석 및 CTR 예측', '🔬', 'blue', 90, 75)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  allocated_devices = EXCLUDED.allocated_devices,
  weight = EXCLUDED.weight;

-- ================================================
-- 초기 페르소나 데이터 삽입
-- ================================================
INSERT INTO personas (id, name, age, interests, tone_description, sample_comments) VALUES
('P01', '게임덕후 민수', 22, ARRAY['게임', 'e스포츠', '게임리뷰'], '열정적, 게임 용어 사용', ARRAY['ㅋㅋ 이 구간 진짜 소름🔥', '와 이 빌드 대박인데??']),
('P02', '직장인 지현', 32, ARRAY['자기계발', '재테크', '브이로그'], '공감하는, 경험 공유', ARRAY['저도 이거 고민이었는데 도움 됐어요!']),
('P03', '뷰티러버 소희', 26, ARRAY['뷰티', '패션', '일상'], '친근한, 칭찬', ARRAY['와 이 색조합 진짜 예쁘다 ㅠㅠ💕']),
('P04', '테크기크 현우', 28, ARRAY['IT', '가젯', '코딩'], '분석적, 스펙 중심', ARRAY['성능 대비 가성비가 괜찮네요']),
('P05', '엄마 미영', 42, ARRAY['육아', '요리', '홈인테리어'], '따뜻한, 경험담 공유', ARRAY['우리 아이한테도 해봐야겠어요~'])
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- RLS (Row Level Security) 정책 (선택사항)
-- ================================================
-- ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 실시간 구독 활성화
-- ================================================
-- Supabase Dashboard에서 Realtime 탭에서 활성화
-- ALTER PUBLICATION supabase_realtime ADD TABLE devices;
-- ALTER PUBLICATION supabase_realtime ADD TABLE activities;
-- ALTER PUBLICATION supabase_realtime ADD TABLE battle_logs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

