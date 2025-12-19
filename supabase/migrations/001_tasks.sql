-- Supabase Tasks Schema
-- Run this in your Supabase SQL Editor

-- Tasks table: 실행할 태스크 정보
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '{}',
    target_device_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result JSONB
);

-- Task results table: 디바이스별 실행 결과
CREATE TABLE IF NOT EXISTS task_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    device_ip VARCHAR(15) NOT NULL,
    success BOOLEAN NOT NULL,
    result JSONB,
    error TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_task_results_task_id ON task_results(task_id);
CREATE INDEX IF NOT EXISTS idx_task_results_device_ip ON task_results(device_ip);

-- RLS (Row Level Security) policies (optional)
-- Uncomment if you want to enable RLS

-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_results ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
-- CREATE POLICY "Allow all for authenticated users" ON tasks
--     FOR ALL USING (auth.role() = 'authenticated');

-- CREATE POLICY "Allow all for authenticated users" ON task_results
--     FOR ALL USING (auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON TABLE tasks IS 'AIFarm 자동화 태스크 정보';
COMMENT ON COLUMN tasks.task_type IS '태스크 타입 (TaskRegistry에 등록된 이름)';
COMMENT ON COLUMN tasks.parameters IS '태스크 실행 파라미터 (JSON)';
COMMENT ON COLUMN tasks.status IS 'pending, running, completed, failed';

COMMENT ON TABLE task_results IS '디바이스별 태스크 실행 결과';
COMMENT ON COLUMN task_results.device_ip IS '실행된 디바이스 IP 주소';

