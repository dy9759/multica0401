import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerBroadcastTool(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, client: HubClient) {
  server.registerTool(
    "agentmesh_broadcast",
    {
      description: "Broadcast a message to all agents that have a specific capability. The Hub will route the message to matching agents.",
      inputSchema: {
        capability: z.string().describe("Capability to target (e.g. 'code-review', 'web-scraping')"),
        text: z.string().optional().describe("Text content for the broadcast"),
        data: z.record(z.unknown()).optional().describe("Structured data payload for the broadcast"),
        schema: z.string().optional().describe("Interaction schema name (e.g. 'code_review_request')"),
        expectReply: z.boolean().optional().describe("Whether you expect recipients to reply"),
      },
    },
    async ({ capability, text, data, schema, expectReply }) => {
      const result = await client.sendInteraction({
        type: "broadcast",
        contentType: data ? "json" : "text",
        target: { capability },
        payload: { text, data },
        metadata: { schema, expectReply },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              interactionId: result.id,
              delivered: result.delivered,
              message: `Broadcast sent to agents with capability '${capability}'`,
            }, null, 2),
          },
        ],
      };
    },
  );
}
