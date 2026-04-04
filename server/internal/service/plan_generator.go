package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/multica-ai/multica/server/internal/util"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

type PlanStep struct {
	Order            int      `json:"order"`
	Description      string   `json:"description"`
	RequiredSkills   []string `json:"required_skills"`
	EstimatedMinutes int      `json:"estimated_minutes"`
	DependsOn        []int    `json:"depends_on"`
	Parallelizable   bool     `json:"parallelizable"`
}

type GeneratedPlan struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Steps       []PlanStep `json:"steps"`
	Constraints string     `json:"constraints"`
}

type PlanGeneratorService struct {
	Queries *db.Queries
}

func NewPlanGeneratorService(q *db.Queries) *PlanGeneratorService {
	return &PlanGeneratorService{Queries: q}
}

// GeneratePlanFromText uses LLM to parse natural language into structured plan.
func (s *PlanGeneratorService) GeneratePlanFromText(ctx context.Context, input string, workspaceID string) (*GeneratedPlan, error) {
	prompt := fmt.Sprintf(`You are a project planner. Parse the following request into a structured plan.

Request: %s

Respond with JSON only:
{
  "title": "short title",
  "description": "what needs to be done",
  "steps": [
    {"order": 1, "description": "step description", "required_skills": ["skill1"], "estimated_minutes": 30, "depends_on": [], "parallelizable": false}
  ],
  "constraints": "any constraints"
}`, input)

	apiKey := getEnv("ANTHROPIC_API_KEY", getEnv("LLM_API_KEY", ""))
	if apiKey == "" {
		// Fallback: simple parsing without LLM
		return &GeneratedPlan{
			Title:       truncate(input, 60),
			Description: input,
			Steps: []PlanStep{
				{Order: 1, Description: input, RequiredSkills: []string{}, Parallelizable: false},
			},
		}, nil
	}

	endpoint := getEnv("LLM_ENDPOINT", "https://api.anthropic.com/v1/messages")
	model := getEnv("LLM_MODEL", "claude-sonnet-4-20250514")

	body, _ := json.Marshal(map[string]any{
		"model":      model,
		"max_tokens": 2048,
		"system":     "You are a project planning assistant. Always respond with valid JSON.",
		"messages":   []map[string]string{{"role": "user", "content": prompt}},
	})

	req, _ := http.NewRequestWithContext(ctx, "POST", endpoint, strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Warn("LLM call failed", "error", err)
		return &GeneratedPlan{
			Title:       truncate(input, 60),
			Description: input,
			Steps:       []PlanStep{{Order: 1, Description: input}},
		}, nil
	}
	defer resp.Body.Close()

	var llmResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	json.NewDecoder(resp.Body).Decode(&llmResp)

	if len(llmResp.Content) == 0 {
		return &GeneratedPlan{Title: truncate(input, 60), Description: input, Steps: []PlanStep{{Order: 1, Description: input}}}, nil
	}

	var plan GeneratedPlan
	if err := json.Unmarshal([]byte(llmResp.Content[0].Text), &plan); err != nil {
		slog.Warn("failed to parse LLM plan", "error", err)
		return &GeneratedPlan{Title: truncate(input, 60), Description: input, Steps: []PlanStep{{Order: 1, Description: input}}}, nil
	}

	return &plan, nil
}

// MatchAgentsToSteps finds best agents for each plan step based on capabilities.
func (s *PlanGeneratorService) MatchAgentsToSteps(ctx context.Context, steps []PlanStep, workspaceID string) (map[int][]string, error) {
	assignments := make(map[int][]string)

	for _, step := range steps {
		for _, skill := range step.RequiredSkills {
			agents, err := s.Queries.ListAgentsWithCapability(ctx, db.ListAgentsWithCapabilityParams{
				WorkspaceID:  util.ParseUUID(workspaceID),
				Capabilities: []string{skill},
			})
			if err != nil {
				continue
			}
			for _, a := range agents {
				assignments[step.Order] = append(assignments[step.Order], util.UUIDToString(a.ID))
			}
		}
	}

	return assignments, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
