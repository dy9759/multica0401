import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerCreateTaskTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient, state: { agentId?: string }) {
  server.registerTool(
    "agentmesh_create_task",
    {
      description: "Create a task and automatically assign it to an available agent with matching capabilities.",
      inputSchema: {
        type: z.string().describe("Task type identifier (e.g. 'code-review', 'data-analysis')"),
        requiredCapabilities: z.array(z.string()).describe("Capabilities required to handle this task"),
        payload: z.record(z.unknown()).describe("Task payload data"),
        timeoutMs: z.number().int().optional().describe("Task timeout in milliseconds (default 30000)"),
      },
    },
    async ({ type, requiredCapabilities, payload, timeoutMs }) => {
      if (!state.agentId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }],
          isError: true,
        };
      }

      const result = await client.createTask({
        type,
        requiredCapabilities,
        payload,
        timeoutMs,
      });

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
