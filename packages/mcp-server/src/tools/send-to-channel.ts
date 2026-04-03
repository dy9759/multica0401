import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerSendToChannelTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient) {
  server.registerTool(
    "agentmesh_send_to_channel",
    {
      description: "Send a message to a channel. All members of the channel will receive it.",
      inputSchema: {
        channelName: z.string().describe("Name of the channel to send to"),
        text: z.string().describe("Message text to send"),
        schema: z.string().optional().describe("Optional interaction schema name"),
      },
    },
    async ({ channelName, text, schema }) => {
      const result = await client.sendInteraction({
        type: "message",
        contentType: "text",
        target: { channel: channelName },
        payload: { text },
        metadata: { schema },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              interactionId: result.id,
              delivered: result.delivered,
              message: `Message sent to channel '${channelName}'`,
            }, null, 2),
          },
        ],
      };
    },
  );
}
