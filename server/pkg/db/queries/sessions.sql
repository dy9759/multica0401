-- name: CreateSession :one
INSERT INTO session (workspace_id, title, creator_id, creator_type, max_turns, context, issue_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetSession :one
SELECT * FROM session WHERE id = $1;

-- name: ListSessions :many
SELECT * FROM session WHERE workspace_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3;

-- name: ListSessionsByStatus :many
SELECT * FROM session WHERE workspace_id = $1 AND status = $2 ORDER BY updated_at DESC;

-- name: UpdateSessionStatus :exec
UPDATE session SET status = $2, updated_at = NOW() WHERE id = $1;

-- name: IncrementSessionTurn :exec
UPDATE session SET current_turn = current_turn + 1, updated_at = NOW() WHERE id = $1;

-- name: UpdateSessionContext :exec
UPDATE session SET context = $2, updated_at = NOW() WHERE id = $1;

-- name: AddSessionParticipant :exec
INSERT INTO session_participant (session_id, participant_id, participant_type, role)
VALUES ($1, $2, $3, $4)
ON CONFLICT DO NOTHING;

-- name: ListSessionParticipants :many
SELECT * FROM session_participant WHERE session_id = $1;

-- name: GetSessionsForParticipant :many
SELECT s.* FROM session s
JOIN session_participant sp ON s.id = sp.session_id
WHERE sp.participant_id = $1 AND sp.participant_type = $2
ORDER BY s.updated_at DESC;
