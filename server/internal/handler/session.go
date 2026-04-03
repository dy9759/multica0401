package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type SessionHandler struct{}

func NewSessionHandler() *SessionHandler {
	return &SessionHandler{}
}

// POST /api/sessions
func (h *SessionHandler) Create(w http.ResponseWriter, r *http.Request) {
	type CreateRequest struct {
		Title        string          `json:"title"`
		IssueID      *string         `json:"issue_id,omitempty"`
		MaxTurns     int             `json:"max_turns,omitempty"`
		Context      json.RawMessage `json:"context,omitempty"`
		Participants []struct {
			ID   string `json:"id"`
			Type string `json:"type"`
		} `json:"participants"`
	}

	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":     "placeholder",
		"title":  req.Title,
		"status": "active",
		"note":   "Needs sqlc wiring",
	})
}

// GET /api/sessions
func (h *SessionHandler) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sessions": []interface{}{},
	})
}

// GET /api/sessions/{sessionID}
func (h *SessionHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "sessionID")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":   id,
		"note": "Needs sqlc wiring",
	})
}

// GET /api/sessions/{sessionID}/messages
func (h *SessionHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages": []interface{}{},
	})
}

// POST /api/sessions/{sessionID}/join
func (h *SessionHandler) Join(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

// PATCH /api/sessions/{sessionID}
func (h *SessionHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "sessionID")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":   id,
		"note": "Updated - needs sqlc wiring",
	})
}

// GET /api/sessions/{sessionID}/summary
func (h *SessionHandler) Summary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message_count": 0,
		"participants":  []interface{}{},
		"timeline":      []interface{}{},
	})
}
