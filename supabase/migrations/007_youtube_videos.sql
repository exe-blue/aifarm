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
