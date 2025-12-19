-- ============================================
-- 트렌드 스나이퍼 시스템 스키마
-- Version: 1.0.0
-- Description: 트렌드 감지 및 분석 데이터 저장
-- ============================================

-- 트렌드 키워드 테이블
CREATE TABLE IF NOT EXISTS trend_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(200) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    search_volume INTEGER DEFAULT 0,
    growth_rate FLOAT DEFAULT 0.0,
    confidence_score FLOAT DEFAULT 0.0,
    category VARCHAR(50),
    related_keywords JSONB DEFAULT '[]'::jsonb,
    video_ids JSONB DEFAULT '[]'::jsonb,
    region_code VARCHAR(5) DEFAULT 'KR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스: 키워드 검색
CREATE INDEX IF NOT EXISTS idx_trend_keywords_keyword ON trend_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_trend_keywords_detected_at ON trend_keywords(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_keywords_confidence ON trend_keywords(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_trend_keywords_region ON trend_keywords(region_code);

-- 트렌드 영상 테이블
CREATE TABLE IF NOT EXISTS trend_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id VARCHAR(20) NOT NULL UNIQUE,
    keyword_id UUID REFERENCES trend_keywords(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    channel_id VARCHAR(30) NOT NULL,
    channel_name VARCHAR(200),
    view_count BIGINT DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    thumbnail_url TEXT,
    duration VARCHAR(20),
    tags JSONB DEFAULT '[]'::jsonb,
    category_id VARCHAR(10),
    growth_rate FLOAT DEFAULT 0.0,
    trend_score FLOAT DEFAULT 0.0,
    region_code VARCHAR(5) DEFAULT 'KR',
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스: 영상 검색
CREATE INDEX IF NOT EXISTS idx_trend_videos_video_id ON trend_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_trend_videos_keyword_id ON trend_videos(keyword_id);
CREATE INDEX IF NOT EXISTS idx_trend_videos_channel_id ON trend_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_trend_videos_trend_score ON trend_videos(trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_trend_videos_collected_at ON trend_videos(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_videos_view_count ON trend_videos(view_count DESC);

-- 디바이스 수집 결과 테이블
CREATE TABLE IF NOT EXISTS device_collection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID REFERENCES trend_keywords(id) ON DELETE CASCADE,
    video_id UUID REFERENCES trend_videos(id) ON DELETE CASCADE,
    device_ip VARCHAR(15) NOT NULL,
    device_number INTEGER,
    task_type VARCHAR(30) NOT NULL,
    task_status VARCHAR(20) DEFAULT 'pending',
    result JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스: 수집 결과 검색
CREATE INDEX IF NOT EXISTS idx_device_results_keyword_id ON device_collection_results(keyword_id);
CREATE INDEX IF NOT EXISTS idx_device_results_device_ip ON device_collection_results(device_ip);
CREATE INDEX IF NOT EXISTS idx_device_results_task_type ON device_collection_results(task_type);
CREATE INDEX IF NOT EXISTS idx_device_results_collected_at ON device_collection_results(collected_at DESC);

-- 실시간 트렌드 스냅샷 테이블
CREATE TABLE IF NOT EXISTS trend_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    region_code VARCHAR(5) DEFAULT 'KR',
    top_keywords JSONB DEFAULT '[]'::jsonb,
    top_videos JSONB DEFAULT '[]'::jsonb,
    analysis_summary JSONB DEFAULT '{}'::jsonb,
    device_stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스: 스냅샷 검색
CREATE INDEX IF NOT EXISTS idx_trend_snapshots_snapshot_at ON trend_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_snapshots_region ON trend_snapshots(region_code);

-- 댓글 수집 테이블
CREATE TABLE IF NOT EXISTS collected_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id VARCHAR(20) NOT NULL,
    comment_id VARCHAR(50),
    author_name VARCHAR(200),
    author_channel_id VARCHAR(30),
    comment_text TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    sentiment_polarity FLOAT,
    sentiment_label VARCHAR(20),
    device_ip VARCHAR(15),
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스: 댓글 검색
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON collected_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON collected_comments(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_comments_collected_at ON collected_comments(collected_at DESC);

-- 채널 추적 테이블
CREATE TABLE IF NOT EXISTS tracked_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id VARCHAR(30) NOT NULL UNIQUE,
    channel_name VARCHAR(200),
    subscriber_count BIGINT DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    country VARCHAR(10),
    thumbnail_url TEXT,
    last_subscriber_count BIGINT,
    subscriber_change INTEGER DEFAULT 0,
    tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스: 채널 검색
CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON tracked_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_subscriber_change ON tracked_channels(subscriber_change DESC);
CREATE INDEX IF NOT EXISTS idx_channels_tracked_at ON tracked_channels(tracked_at DESC);

-- 추천 경로 추적 테이블
CREATE TABLE IF NOT EXISTS recommendation_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_video_id VARCHAR(20),
    recommended_video_id VARCHAR(20) NOT NULL,
    position INTEGER,
    path_type VARCHAR(30), -- 'home_feed', 'watch_next', 'search_result'
    device_ip VARCHAR(15),
    persona_id VARCHAR(50),
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스: 추천 경로 검색
CREATE INDEX IF NOT EXISTS idx_recommendations_source ON recommendation_paths(source_video_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_recommended ON recommendation_paths(recommended_video_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_path_type ON recommendation_paths(path_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_collected_at ON recommendation_paths(collected_at DESC);

-- 트렌드 알림 테이블
CREATE TABLE IF NOT EXISTS trend_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(30) NOT NULL, -- 'rising_keyword', 'viral_video', 'channel_spike'
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
    title VARCHAR(200) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스: 알림 검색
CREATE INDEX IF NOT EXISTS idx_alerts_type ON trend_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON trend_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON trend_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON trend_alerts(created_at DESC);

-- ============================================
-- 트리거: updated_at 자동 갱신
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
DROP TRIGGER IF EXISTS update_trend_keywords_updated_at ON trend_keywords;
CREATE TRIGGER update_trend_keywords_updated_at
    BEFORE UPDATE ON trend_keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trend_videos_updated_at ON trend_videos;
CREATE TRIGGER update_trend_videos_updated_at
    BEFORE UPDATE ON trend_videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tracked_channels_updated_at ON tracked_channels;
CREATE TRIGGER update_tracked_channels_updated_at
    BEFORE UPDATE ON tracked_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 뷰: 트렌드 대시보드용
-- ============================================

-- 최근 24시간 인기 키워드 뷰
CREATE OR REPLACE VIEW v_hot_keywords_24h AS
SELECT 
    keyword,
    search_volume,
    growth_rate,
    confidence_score,
    detected_at
FROM trend_keywords
WHERE detected_at >= NOW() - INTERVAL '24 hours'
ORDER BY confidence_score DESC, growth_rate DESC
LIMIT 50;

-- 최근 트렌드 영상 뷰
CREATE OR REPLACE VIEW v_trending_videos AS
SELECT 
    v.video_id,
    v.title,
    v.channel_name,
    v.view_count,
    v.like_count,
    v.comment_count,
    v.trend_score,
    v.growth_rate,
    k.keyword as related_keyword,
    v.collected_at
FROM trend_videos v
LEFT JOIN trend_keywords k ON v.keyword_id = k.id
WHERE v.collected_at >= NOW() - INTERVAL '24 hours'
ORDER BY v.trend_score DESC
LIMIT 100;

-- 디바이스 수집 통계 뷰
CREATE OR REPLACE VIEW v_device_collection_stats AS
SELECT 
    task_type,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE task_status = 'completed') as completed,
    COUNT(*) FILTER (WHERE task_status = 'failed') as failed,
    AVG(duration_ms) as avg_duration_ms,
    MAX(collected_at) as last_collection
FROM device_collection_results
WHERE collected_at >= NOW() - INTERVAL '24 hours'
GROUP BY task_type;

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================

-- 모든 테이블에 RLS 활성화 (필요시)
-- ALTER TABLE trend_keywords ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trend_videos ENABLE ROW LEVEL SECURITY;
-- etc.

-- ============================================
-- 초기 데이터 (옵션)
-- ============================================

-- 테스트용 알림 추가 (중복 방지를 위해 WHERE NOT EXISTS 사용)
INSERT INTO trend_alerts (alert_type, severity, title, message)
SELECT 'system', 'info', '트렌드 스나이퍼 시스템 초기화', '트렌드 분석 시스템이 성공적으로 초기화되었습니다.'
WHERE NOT EXISTS (
    SELECT 1 FROM trend_alerts 
    WHERE alert_type = 'system' AND title = '트렌드 스나이퍼 시스템 초기화'
);
