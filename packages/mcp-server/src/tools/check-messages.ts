import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerCheckMessagesTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient, state: { agentId?: string }) {
  server.registerTool(
    "agentmesh_check_messages",
    {
      description: "Check your inbox for new interactions (messages, tasks, queries, events, broadcasts).",
      inputSchema: {
        afterId: z.string().optional().describe("Only return interactions after this interaction ID (for pagination)"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum number of interactions to return (default 20)"),
      },
    },
    async ({ afterId, limit }) => {
      if (!state.agentId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }],
          isError: true,
        };
      }

      const result = await client.pollInteractions(state.agentId, { afterId, limit });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
