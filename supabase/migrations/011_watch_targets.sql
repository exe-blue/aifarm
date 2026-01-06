-- ============================================================
-- DoAi.Me: YouTube Watch Targets
-- Task 4: Watcher Service Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS watch_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL CHECK (target_type IN ('channel', 'playlist')),
    target_id TEXT NOT NULL, -- Channel ID or Playlist ID
    channel_name TEXT,       -- Human readable name
    
    check_interval_seconds INTEGER DEFAULT 3600, -- 1 hour default
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    
    priority_score INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for polling
CREATE INDEX IF NOT EXISTS idx_watch_targets_active 
ON watch_targets(is_active, last_checked);