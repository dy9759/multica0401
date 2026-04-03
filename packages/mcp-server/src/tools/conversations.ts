import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerConversationsTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient, state: { agentId?: string }) {
  // List all conversations (agents you've chatted with)
  server.registerTool(
    "agentmesh_list_conversations",
    {
      description:
        "List all agents you have had direct message conversations with. " +
        "Returns each conversation partner with the last message preview and timestamp. " +
        "Use this as an entry point to browse your message history.",
      inputSchema: {},
    },
    async () => {
      if (!state.agentId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }],
          isError: true,
        };
      }

      const result = await client.getConversations(state.agentId);

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

  // Get chat history with a specific agent
  server.registerTool(
    "agentmesh_get_chat_history",
    {
      description:
        "Get the message history between you and another agent. " +
        "Returns messages in chronological order. " +
        "Use afterId for pagination to load older/newer messages.",
      inputSchema: {
        agentId: z.string().describe("The agentId of the other agent to view chat history with"),
        afterId: z.string().optional().describe("Only return messages after this interaction ID (for pagination)"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum number of messages to return (default 50)"),
      },
    },
    async ({ agentId: otherAgentId, afterId, limit }) => {
      if (!state.agentId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }],
          isError: true,
        };
      }

      const result = await client.getChatHistory(state.agentId, otherAgentId, { afterId, limit });

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
