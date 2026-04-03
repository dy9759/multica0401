import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerSessionStatusTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
) {
  server.registerTool(
    "agentmesh_session_status",
    {
      description: "Get the status and details of a collaboration session, including participants, turn count, and shared context.",
      inputSchema: {
        sessionId: z.string().describe("The session ID to check"),
      },
    },
    async ({ sessionId }) => {
      try {
        const session = await client.getSession(sessionId);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(session, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to get session: ${err.message ?? err}` }) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "agentmesh_list_sessions",
    {
      description: "List all collaboration sessions. Filter by status (active, completed, etc.).",
      inputSchema: {
        status: z.string().optional().describe("Filter by status: active, waiting, completed, failed, archived"),
      },
    },
    async ({ status }) => {
      try {
        const result = await client.listSessions({ status });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to list sessions: ${err.message ?? err}` }) }],
          isError: true,
        };
      }
    },
  );
}
