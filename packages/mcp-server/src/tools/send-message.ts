import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerSendMessageTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient, state: { agentId?: string }) {
  server.registerTool(
    "agentmesh_send_message",
    {
      description: "Send a direct message to another agent by agentId.",
      inputSchema: {
        toAgentId: z.string().describe("The agentId of the recipient agent"),
        text: z.string().describe("The message text to send"),
        expectReply: z.boolean().optional().describe("Whether you expect the agent to reply"),
        correlationId: z.string().optional().describe("Optional correlation ID for tracking conversations"),
      },
    },
    async ({ toAgentId, text, expectReply, correlationId }) => {
      if (!state.agentId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }],
          isError: true,
        };
      }

      const result = await client.sendInteraction({
        type: "message",
        contentType: "text",
        target: { agentId: toAgentId },
        payload: { text },
        metadata: {
          expectReply,
          correlationId,
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              interactionId: result.id,
              delivered: result.delivered,
              message: `Message sent to ${toAgentId}`,
            }, null, 2),
          },
        ],
      };
    },
  );
}
