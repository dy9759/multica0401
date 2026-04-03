-- Messaging system: channels, messages, sessions for AgentMesh-style communication

-- Channels (group communication within workspace)
CREATE TABLE channel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,  -- member_id or agent_id
    created_by_type TEXT NOT NULL DEFAULT 'member',  -- 'member' or 'agent'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- Channel members
CREATE TABLE channel_member (
    channel_id UUID NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,  -- member_id or agent_id
    member_type TEXT NOT NULL DEFAULT 'member',  -- 'member' or 'agent'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (channel_id, member_id, member_type)
);

-- Direct messages & channel messages (unified)
CREATE TABLE message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    -- Sender
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL DEFAULT 'member',  -- 'member' or 'agent'
    -- Target (one of: channel, DM recipient, session)
    channel_id UUID REFERENCES channel(id) ON DELETE CASCADE,
    recipient_id UUID,  -- for DMs
    recipient_type TEXT,  -- 'member' or 'agent'
    session_id UUID,  -- for session messages
    -- Content
    content TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text',  -- 'text', 'json', 'file'
    -- File attachment (optional)
    file_id UUID,
    file_name TEXT,
    file_size BIGINT,
    file_content_type TEXT,
    -- Metadata
    metadata JSONB,
    status TEXT NOT NULL DEFAULT 'sent',  -- 'sent', 'delivered', 'read'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Collaboration sessions (multi-turn discussions)
CREATE TABLE session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    -- Creator
    creator_id UUID NOT NULL,
    creator_type TEXT NOT NULL DEFAULT 'member',
    -- State
    status TEXT NOT NULL DEFAULT 'active',  -- 'active', 'waiting', 'completed', 'failed', 'archived'
    max_turns INTEGER NOT NULL DEFAULT 0,  -- 0 = unlimited
    current_turn INTEGER NOT NULL DEFAULT 0,
    -- Shared context
    context JSONB,  -- topic, files, code snippets, decisions, summary
    -- Linked issue (optional)
    issue_id UUID REFERENCES issue(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session participants
CREATE TABLE session_participant (
    session_id UUID NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL,
    participant_type TEXT NOT NULL DEFAULT 'member',
    role TEXT NOT NULL DEFAULT 'participant',  -- 'creator', 'participant'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_id, participant_id, participant_type)
);

-- Indexes
CREATE INDEX idx_channel_workspace ON channel(workspace_id);
CREATE INDEX idx_message_channel ON message(channel_id, created_at);
CREATE INDEX idx_message_recipient ON message(recipient_id, recipient_type, created_at);
CREATE INDEX idx_message_session ON message(session_id, created_at);
CREATE INDEX idx_message_workspace ON message(workspace_id, created_at);
CREATE INDEX idx_session_workspace ON session(workspace_id);
CREATE INDEX idx_session_issue ON session(issue_id);
