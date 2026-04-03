import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerAutoReplyTools(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string },
) {
  server.registerTool(
    "agentmesh_configure_auto_reply",
    {
      description:
        "Configure auto-reply for an agent. When enabled, the agent will automatically " +
        "respond to session messages using a configured LLM. Requires an LLM API key.",
      inputSchema: {
        agentId: z.string().optional().describe("Agent ID to configure (defaults to current agent)"),
        enabled: z.boolean().describe("Enable or disable auto-reply"),
        llmApiKey: z.string().optional().describe("API key for the LLM service (e.g. Anthropic API key)"),
        model: z.string().optional().describe("Model to use (e.g. claude-sonnet-4-20250514)"),
        systemPrompt: z.string().optional().describe("Custom system prompt for the agent"),
      },
    },
    async ({ agentId, enabled, llmApiKey, model, systemPrompt }) => {
      const targetId = agentId ?? state.agentId;
      if (!targetId) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No agent ID. Register first." }) }], isError: true };
      }

      try {
        const config: Record<string, unknown> = { enabled };
        if (llmApiKey) config.llmApiKey = llmApiKey;
        if (model) config.model = model;
        if (systemPrompt) config.systemPrompt = systemPrompt;

        const result = await client.updateAutoReplyConfig(targetId, config);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              message: enabled ? "Auto-reply enabled" : "Auto-reply disabled",
              agentId: targetId,
              config: result.autoReplyConfig,
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
      }
    },
  );
}
