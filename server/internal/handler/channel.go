package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type ChannelHandler struct{}

func NewChannelHandler() *ChannelHandler {
	return &ChannelHandler{}
}

// POST /api/channels
func (h *ChannelHandler) Create(w http.ResponseWriter, r *http.Request) {
	type CreateRequest struct {
		Name        string `json:"name"`
		Description string `json:"description,omitempty"`
	}

	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, `{"error":"name required"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":   "placeholder",
		"name": req.Name,
		"note": "Needs sqlc wiring",
	})
}

// GET /api/channels
func (h *ChannelHandler) List(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"channels": []interface{}{},
	})
}

// GET /api/channels/{channelID}
func (h *ChannelHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "channelID")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":   id,
		"note": "Needs sqlc wiring",
	})
}

// POST /api/channels/{channelID}/join
func (h *ChannelHandler) Join(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/channels/{channelID}/leave
func (h *ChannelHandler) Leave(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/channels/{channelID}/members
func (h *ChannelHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"members": []interface{}{},
	})
}

// GET /api/channels/{channelID}/messages
func (h *ChannelHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages": []interface{}{},
	})
}
