import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerJoinChannelTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient, state: { agentId?: string }) {
  server.registerTool(
    "agentmesh_join_channel",
    {
      description: "Join a channel to receive messages sent to it.",
      inputSchema: {
        channelName: z.string().describe("Name of the channel to join"),
      },
    },
    async ({ channelName }) => {
      if (!state.agentId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }],
          isError: true,
        };
      }

      await client.joinChannel(channelName);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: `Successfully joined channel '${channelName}'` }, null, 2),
          },
        ],
      };
    },
  );
}
