package handler

import (
	"encoding/json"
	"net/http"
)

type MessageHandler struct {
	// db queries will be added when sqlc is generated
}

func NewMessageHandler() *MessageHandler {
	return &MessageHandler{}
}

// POST /api/messages — Send a message (DM, channel, or session)
func (h *MessageHandler) Create(w http.ResponseWriter, r *http.Request) {
	type CreateRequest struct {
		ChannelID     *string         `json:"channel_id,omitempty"`
		RecipientID   *string         `json:"recipient_id,omitempty"`
		RecipientType *string         `json:"recipient_type,omitempty"`
		SessionID     *string         `json:"session_id,omitempty"`
		Content       string          `json:"content"`
		ContentType   string          `json:"content_type,omitempty"`
		FileID        *string         `json:"file_id,omitempty"`
		FileName      *string         `json:"file_name,omitempty"`
		FileSize      *int64          `json:"file_size,omitempty"`
		Metadata      json.RawMessage `json:"metadata,omitempty"`
	}

	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, `{"error":"content required"}`, http.StatusBadRequest)
		return
	}

	// TODO: use sqlc generated queries to insert message
	// For now, return placeholder
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      "placeholder",
		"status":  "sent",
		"message": "Message handler created - needs sqlc wiring",
	})
}

// GET /api/messages?channel_id=X or recipient_id=X or session_id=X
func (h *MessageHandler) List(w http.ResponseWriter, r *http.Request) {
	channelID := r.URL.Query().Get("channel_id")
	recipientID := r.URL.Query().Get("recipient_id")
	sessionID := r.URL.Query().Get("session_id")

	_ = channelID
	_ = recipientID
	_ = sessionID

	// TODO: query messages based on filter
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages": []interface{}{},
		"note":     "Needs sqlc wiring",
	})
}

// GET /api/conversations — List DM conversations for current user
func (h *MessageHandler) ListConversations(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"conversations": []interface{}{},
	})
}
