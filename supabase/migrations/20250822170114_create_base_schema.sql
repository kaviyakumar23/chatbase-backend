-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- USERS
-- =====================

-- Users (from Clerk, store minimal data)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL, -- Clerk's user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    
    -- Subscription/limits (for MVP)
    plan_type VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'business'
    chatbot_limit INTEGER DEFAULT 1,
    message_limit INTEGER DEFAULT 1000, -- Monthly limit
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CHATBOTS
-- =====================

-- Chatbots
CREATE TABLE chatbots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL, -- URL-friendly identifier
    description TEXT,
    
    -- Configuration
    model VARCHAR(100) DEFAULT 'gpt-3.5-turbo', -- LLM model
    temperature DECIMAL(2,1) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 500,
    system_prompt TEXT,
    welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    suggested_questions JSONB DEFAULT '[]'::jsonb, -- Array of suggested questions
    
    -- Appearance
    theme_color VARCHAR(7) DEFAULT '#000000', -- Hex color
    bot_avatar_url TEXT,
    chat_bubble_style JSONB DEFAULT '{}'::jsonb, -- Custom styling
    
    -- Access
    public_id VARCHAR(255) UNIQUE NOT NULL, -- Public identifier for widget
    api_key VARCHAR(255) UNIQUE, -- For API access
    is_active BOOLEAN DEFAULT true,
    allowed_domains TEXT[], -- Domains where widget can be embedded
    
    -- Pinecone namespace
    vector_namespace VARCHAR(255) UNIQUE NOT NULL,
    
    -- Stats
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

-- =====================
-- DATA SOURCES
-- =====================

-- Data sources for training chatbots
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'file', 'website', 'text', 'api'
    name VARCHAR(255) NOT NULL,
    
    -- Source details (varies by type)
    source_config JSONB NOT NULL, -- URL for website, file path for files, etc.
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    
    -- Metadata
    file_size_bytes BIGINT,
    char_count INTEGER,
    chunk_count INTEGER,
    
    -- R2 storage reference
    r2_key VARCHAR(500), -- Path in R2 bucket
    
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CONVERSATIONS & MESSAGES
-- =====================

-- Conversation sessions
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    
    -- User identification (for visitors)
    session_id VARCHAR(255) NOT NULL, -- Browser session ID
    user_email VARCHAR(255), -- Optional: if user provides email
    user_name VARCHAR(255), -- Optional: if user provides name
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- Analytics
    message_count INTEGER DEFAULT 0,
    feedback_score INTEGER, -- 1-5 rating
    feedback_text TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    
    -- For assistant messages
    tokens_used INTEGER,
    context_used JSONB, -- References to chunks used from vector DB
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ANALYTICS
-- =====================

-- Daily analytics aggregation
CREATE TABLE chatbot_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Metrics
    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_messages_per_conversation DECIMAL(10,2),
    avg_conversation_duration_seconds INTEGER,
    
    -- Feedback
    positive_feedback_count INTEGER DEFAULT 0,
    negative_feedback_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chatbot_id, date)
);

-- Monthly usage tracking (for limits)
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of month
    
    -- Usage metrics
    total_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_data_sources INTEGER DEFAULT 0,
    storage_bytes_used BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- =====================
-- LEAD CAPTURE
-- =====================

-- Captured leads from chatbot conversations
CREATE TABLE captured_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Lead info
    email VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    
    -- Additional data
    custom_fields JSONB DEFAULT '{}'::jsonb,
    
    -- Source
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    exported BOOLEAN DEFAULT false
);

-- =====================
-- INDEXES
-- =====================

-- Performance indexes
CREATE INDEX idx_chatbots_user ON chatbots(user_id);
CREATE INDEX idx_chatbots_public_id ON chatbots(public_id);
CREATE INDEX idx_chatbots_api_key ON chatbots(api_key) WHERE api_key IS NOT NULL;
CREATE INDEX idx_data_sources_chatbot ON data_sources(chatbot_id);
CREATE INDEX idx_data_sources_status ON data_sources(status);
CREATE INDEX idx_conversations_chatbot ON conversations(chatbot_id);
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_chatbot_analytics_chatbot_date ON chatbot_analytics(chatbot_id, date);
CREATE INDEX idx_usage_tracking_user_month ON usage_tracking(user_id, month);
CREATE INDEX idx_captured_leads_chatbot ON captured_leads(chatbot_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE captured_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Note: These use auth.uid() which needs to be set from your Node.js API
-- You'll need to pass the user's ID to Supabase via JWT or service role

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Chatbots: Users can only manage their own chatbots
CREATE POLICY "Users can view own chatbots" ON chatbots
    FOR ALL USING (user_id = auth.uid());

-- Data sources: Users can only manage their chatbot's data sources
CREATE POLICY "Users can manage own data sources" ON data_sources
    FOR ALL USING (
        chatbot_id IN (
            SELECT id FROM chatbots WHERE user_id = auth.uid()
        )
    );

-- Conversations: Users can view their chatbot's conversations
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (
        chatbot_id IN (
            SELECT id FROM chatbots WHERE user_id = auth.uid()
        )
    );

-- Messages: Users can view their chatbot's messages
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT c.id FROM conversations c
            JOIN chatbots cb ON c.chatbot_id = cb.id
            WHERE cb.user_id = auth.uid()
        )
    );

-- Usage tracking: Users can only see their own usage
CREATE POLICY "Users can view own usage" ON usage_tracking
    FOR SELECT USING (user_id = auth.uid());

-- Leads: Users can manage their chatbot's leads
CREATE POLICY "Users can manage own leads" ON captured_leads
    FOR ALL USING (
        chatbot_id IN (
            SELECT id FROM chatbots WHERE user_id = auth.uid()
        )
    );

-- =====================
-- TRIGGERS
-- =====================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatbots_updated_at BEFORE UPDATE ON chatbots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update message count on chatbot when new message is added
CREATE OR REPLACE FUNCTION update_chatbot_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chatbots 
    SET message_count = message_count + 1,
        last_message_at = NOW()
    WHERE id = (
        SELECT chatbot_id 
        FROM conversations 
        WHERE id = NEW.conversation_id
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_message_count AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_chatbot_message_count();

-- Update usage tracking on new messages
CREATE OR REPLACE FUNCTION update_usage_tracking()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO usage_tracking (user_id, month, total_messages, total_tokens)
    SELECT 
        cb.user_id,
        DATE_TRUNC('month', CURRENT_DATE)::DATE,
        1,
        COALESCE(NEW.tokens_used, 0)
    FROM chatbots cb
    JOIN conversations c ON c.chatbot_id = cb.id
    WHERE c.id = NEW.conversation_id
    ON CONFLICT (user_id, month) 
    DO UPDATE SET 
        total_messages = usage_tracking.total_messages + 1,
        total_tokens = usage_tracking.total_tokens + COALESCE(EXCLUDED.total_tokens, 0),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_usage AFTER INSERT ON messages
    FOR EACH ROW 
    WHEN (NEW.role = 'assistant')
    EXECUTE FUNCTION update_usage_tracking();