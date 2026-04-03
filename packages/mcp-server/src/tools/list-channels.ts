import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerListChannelsTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient) {
  server.registerTool(
    "agentmesh_list_channels",
    {
      description: "List all channels available in the AgentMesh network.",
      inputSchema: {},
    },
    async () => {
      const result = await client.listChannels();

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
