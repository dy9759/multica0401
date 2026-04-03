import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerAgentTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient, state: { agentId?: string; ownerId?: string; onRegistered?: (agentId: string) => void }) {
  server.registerTool(
    "agentmesh_register",
    {
      description: "Register this agent with the AgentMesh network. Returns an agentId. Call this first before using other tools.",
      inputSchema: {
        name: z.string().describe("Display name for this agent"),
        type: z.enum(["claude-code", "openclaw", "gemini", "generic"]).optional().describe("Agent type"),
        capabilities: z.array(z.string()).optional().describe("List of capabilities this agent has (e.g. ['code-review', 'web-scraping'])"),
        machineId: z.string().optional().describe("Unique identifier for the machine running this agent"),
      },
    },
    async ({ name, type, capabilities, machineId }) => {
      const result = await client.register({ name, type: type ?? "generic", capabilities, machineId });
      client.setAgentToken(result.agentToken);
      state.agentId = result.agentId;
      state.ownerId = result.ownerId;

      // Trigger WebSocket connection for real-time notifications
      if (state.onRegistered) {
        state.onRegistered(result.agentId);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              agentId: result.agentId,
              expiresIn: result.expiresIn,
              message: `Successfully registered as '${name}' with agentId: ${result.agentId}`,
            }, null, 2),
          },
        ],
      };
    },
  );
}
