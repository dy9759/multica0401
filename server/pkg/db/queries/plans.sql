-- name: CreatePlan :one
INSERT INTO plan (workspace_id, title, description, source_type, source_ref_id, constraints, expected_output, steps, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetPlan :one
SELECT * FROM plan WHERE id = $1;

-- name: ListPlans :many
SELECT * FROM plan WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: UpdatePlanSteps :exec
UPDATE plan SET steps = $2, updated_at = NOW() WHERE id = $1;

-- name: DeletePlan :exec
DELETE FROM plan WHERE id = $1;
