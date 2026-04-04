-- name: CreateWorkflow :one
INSERT INTO workflow (plan_id, workspace_id, title, status, type, cron_expr, dag, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetWorkflow :one
SELECT * FROM workflow WHERE id = $1;

-- name: ListWorkflows :many
SELECT * FROM workflow WHERE workspace_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3;

-- name: UpdateWorkflowStatus :exec
UPDATE workflow SET status = $2, updated_at = NOW() WHERE id = $1;

-- name: UpdateWorkflowDAG :exec
UPDATE workflow SET dag = $2, version = version + 1, updated_at = NOW() WHERE id = $1;

-- name: DeleteWorkflow :exec
DELETE FROM workflow WHERE id = $1;

-- name: CreateWorkflowStep :one
INSERT INTO workflow_step (workflow_id, step_order, description, agent_id, fallback_agent_ids, required_skills, timeout_ms, retry_count, depends_on)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: ListWorkflowSteps :many
SELECT * FROM workflow_step WHERE workflow_id = $1 ORDER BY step_order ASC;

-- name: UpdateWorkflowStepStatus :exec
UPDATE workflow_step SET status = $2, started_at = CASE WHEN $2 = 'running' THEN NOW() ELSE started_at END, completed_at = CASE WHEN $2 IN ('completed','failed') THEN NOW() ELSE completed_at END, result = $3, error = $4 WHERE id = $1;

-- name: GetWorkflowStep :one
SELECT * FROM workflow_step WHERE id = $1;
