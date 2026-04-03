import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerRemoteSessionTools(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string },
) {
  server.registerTool("agentmesh_create_remote_session", {
    description: "Create a remote session to track an agent's work on another machine.",
    inputSchema: {
      agentId: z.string().describe("Agent ID to track"),
      title: z.string().optional().describe("Session title/description"),
    },
  }, async ({ agentId, title }) => {
    try {
      const session = await client.createRemoteSession(agentId, title);
      return { content: [{ type: "text" as const, text: JSON.stringify(session, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  });

  server.registerTool("agentmesh_remote_session_status", {
    description: "Get the status and event log of a remote session.",
    inputSchema: { sessionId: z.string().describe("Remote session ID") },
  }, async ({ sessionId }) => {
    try {
      const session = await client.getRemoteSession(sessionId);
      return { content: [{ type: "text" as const, text: JSON.stringify(session, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  });

  server.registerTool("agentmesh_list_remote_sessions", {
    description: "List all remote sessions for the current owner.",
    inputSchema: {},
  }, async () => {
    try {
      const result = await client.listRemoteSessions();
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  });
}
