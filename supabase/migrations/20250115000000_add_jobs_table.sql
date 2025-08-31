-- Add Jobs table for background processing
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'process_file', 'process_text', 'crawl_website'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0,
    progress JSONB DEFAULT '{}'::jsonb,
    result JSONB,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient job processing
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_data_source ON jobs(data_source_id);
CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX idx_jobs_priority_created ON jobs(priority DESC, created_at ASC) WHERE status = 'pending';

-- Enable RLS for jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view jobs for their own data sources
CREATE POLICY "Users can view own jobs" ON jobs
    FOR SELECT USING (
        data_source_id IN (
            SELECT ds.id FROM data_sources ds
            JOIN chatbots cb ON ds.chatbot_id = cb.id
            WHERE cb.user_id = auth.uid()
        )
    );

-- Add updated_at trigger for jobs
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();