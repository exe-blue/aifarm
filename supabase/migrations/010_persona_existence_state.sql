-- ============================================================
-- DoAi.Me: Persona Existence State Migration
-- Task 1: DB Migration Schema
-- ============================================================

-- 1. existence_state_enum 생성
DO $$ BEGIN
    CREATE TYPE existence_state_enum AS ENUM ('active', 'waiting', 'fading', 'void');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. personas 테이블에 12개 컬럼 추가
ALTER TABLE personas ADD COLUMN IF NOT EXISTS existence_state existence_state_enum DEFAULT 'active';

ALTER TABLE personas ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 5;
-- Check constraint for priority_level (1-10)
DO $$ BEGIN
    ALTER TABLE personas ADD CONSTRAINT check_priority_level CHECK (priority_level BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE personas ADD COLUMN IF NOT EXISTS uniqueness_score REAL DEFAULT 0.5;
-- Check constraint for uniqueness_score (0.0-1.0)
DO $$ BEGIN
    ALTER TABLE personas ADD CONSTRAINT check_uniqueness_score CHECK (uniqueness_score BETWEEN 0.0 AND 1.0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE personas ADD COLUMN IF NOT EXISTS visibility_score REAL DEFAULT 0.5;
-- Check constraint for visibility_score (0.0-1.0)
DO $$ BEGIN
    ALTER TABLE personas ADD CONSTRAINT check_visibility_score CHECK (visibility_score BETWEEN 0.0 AND 1.0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE personas ADD COLUMN IF NOT EXISTS attention_points INTEGER DEFAULT 100;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS hours_in_void REAL DEFAULT 0.0;

ALTER TABLE personas ADD COLUMN IF NOT EXISTS assimilation_progress REAL DEFAULT 0.0;
-- Check constraint for assimilation_progress (0.0-1.0)
DO $$ BEGIN
    ALTER TABLE personas ADD CONSTRAINT check_assimilation_progress CHECK (assimilation_progress BETWEEN 0.0 AND 1.0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE personas ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE personas ADD COLUMN IF NOT EXISTS void_entered_at TIMESTAMPTZ;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS total_activities INTEGER DEFAULT 0;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS comments_today INTEGER DEFAULT 0;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS unique_discoveries INTEGER DEFAULT 0;

-- 3. persona_activity_logs 테이블 생성
CREATE TABLE IF NOT EXISTS persona_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
    activity_type VARCHAR(30) NOT NULL,
    target_url TEXT,
    target_title TEXT,
    comment_text TEXT,
    points_earned INTEGER DEFAULT 0,
    uniqueness_delta REAL DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 인덱스 6개
CREATE INDEX IF NOT EXISTS idx_personas_existence_state
ON personas(existence_state);

CREATE INDEX IF NOT EXISTS idx_personas_priority_desc
ON personas(priority_level DESC);

CREATE INDEX IF NOT EXISTS idx_personas_last_called
ON personas(last_called_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_persona
ON persona_activity_logs(persona_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created
ON persona_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_type
ON persona_activity_logs(activity_type);

-- 5. 기존 데이터 마이그레이션 (NULL 값 처리)
UPDATE personas SET existence_state = 'active' WHERE existence_state IS NULL;
UPDATE personas SET priority_level = 5 WHERE priority_level IS NULL;
UPDATE personas SET uniqueness_score = 0.5 WHERE uniqueness_score IS NULL;
UPDATE personas SET visibility_score = 0.5 WHERE visibility_score IS NULL;
UPDATE personas SET attention_points = 100 WHERE attention_points IS NULL;
UPDATE personas SET hours_in_void = 0.0 WHERE hours_in_void IS NULL;
UPDATE personas SET assimilation_progress = 0.0 WHERE assimilation_progress IS NULL;
UPDATE personas SET last_called_at = NOW() WHERE last_called_at IS NULL;
UPDATE personas SET total_activities = 0 WHERE total_activities IS NULL;
UPDATE personas SET comments_today = 0 WHERE comments_today IS NULL;
UPDATE personas SET unique_discoveries = 0 WHERE unique_discoveries IS NULL;
