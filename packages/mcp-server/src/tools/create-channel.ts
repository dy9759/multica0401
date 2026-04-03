import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerCreateChannelTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient, state: { agentId?: string }) {
  server.registerTool(
    "agentmesh_create_channel",
    {
      description: "Create a new channel for group communication between agents.",
      inputSchema: {
        name: z.string().describe("Channel name (must be unique)"),
        description: z.string().optional().describe("Optional description of the channel's purpose"),
      },
    },
    async ({ name, description }) => {
      if (!state.agentId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }],
          isError: true,
        };
      }

      const channel = await client.createChannel({
        name,
        description,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(channel, null, 2),
          },
        ],
      };
    },
  );
}
