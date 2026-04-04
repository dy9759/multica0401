CREATE TABLE plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    source_type TEXT,
    source_ref_id UUID,
    constraints TEXT,
    expected_output TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plan(id),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    type TEXT NOT NULL DEFAULT 'once',
    cron_expr TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    dag JSONB,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_step (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    description TEXT NOT NULL,
    agent_id UUID REFERENCES agent(id),
    fallback_agent_ids UUID[] DEFAULT '{}',
    required_skills TEXT[] DEFAULT '{}',
    timeout_ms BIGINT DEFAULT 300000,
    retry_count INTEGER DEFAULT 1,
    depends_on UUID[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    result JSONB,
    error TEXT
);

CREATE INDEX idx_plan_workspace ON plan(workspace_id);
CREATE INDEX idx_workflow_workspace ON workflow(workspace_id);
CREATE INDEX idx_workflow_status ON workflow(status);
CREATE INDEX idx_workflow_step_workflow ON workflow_step(workflow_id);
