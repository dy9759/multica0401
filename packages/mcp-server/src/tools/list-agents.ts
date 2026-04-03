import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerListAgentsTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient) {
  server.registerTool(
    "agentmesh_list_agents",
    {
      description: "List agents currently registered in the AgentMesh network. Filter by type, capability, status, or load.",
      inputSchema: {
        type: z.enum(["claude-code", "openclaw", "gemini", "generic"]).optional().describe("Filter by agent type"),
        capability: z.string().optional().describe("Filter agents that have this capability"),
        status: z.enum(["online", "offline", "busy"]).optional().describe("Filter by status"),
        maxLoad: z.number().min(0).max(1).optional().describe("Only return agents with load at or below this value (0-1)"),
      },
    },
    async ({ type, capability, status, maxLoad }) => {
      const result = await client.listAgents({ type, capability, status, maxLoad });

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
