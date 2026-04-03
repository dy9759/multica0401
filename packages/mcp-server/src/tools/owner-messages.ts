import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

/**
 * Owner messaging tools — send messages as owner, check owner inbox, list owner conversations.
 */
export function registerOwnerMessageTools(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string },
) {
  // Owner sends a message to an agent or another owner
  server.registerTool(
    "agentmesh_owner_send",
    {
      description:
        "Send a message as the owner (you) to an agent or another owner. " +
        "Uses your Owner API Key for authentication (no agent registration needed).",
      inputSchema: {
        toAgentId: z.string().optional().describe("The agentId of the recipient agent"),
        toOwnerId: z.string().optional().describe("The ownerId of the recipient owner"),
        text: z.string().describe("The message text to send"),
        expectReply: z.boolean().optional().describe("Whether you expect a reply"),
        correlationId: z.string().optional().describe("Optional correlation ID"),
      },
    },
    async ({ toAgentId, toOwnerId, text, expectReply, correlationId }) => {
      if (!toAgentId && !toOwnerId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Provide either toAgentId or toOwnerId" }) }],
          isError: true,
        };
      }

      try {
        const result = await client.sendInteraction({
          type: "message",
          contentType: "text",
          target: {
            agentId: toAgentId,
            ownerId: toOwnerId,
          },
          payload: { text },
          metadata: { expectReply, correlationId },
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                interactionId: result.id,
                delivered: result.delivered,
                message: `Owner message sent to ${toAgentId ?? toOwnerId}`,
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to send owner message: ${err.message ?? err}` }) }],
          isError: true,
        };
      }
    },
  );

  // Owner checks inbox
  server.registerTool(
    "agentmesh_owner_inbox",
    {
      description:
        "Check the owner's inbox for messages sent to you (as owner). " +
        "Returns messages from agents and other owners.",
      inputSchema: {
        afterId: z.string().optional().describe("Only return interactions after this ID (pagination)"),
        limit: z.number().int().min(1).max(100).optional().describe("Max interactions to return (default 20)"),
      },
    },
    async ({ afterId, limit }) => {
      if (!state.ownerId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Owner ID not available. Ensure API key authentication." }) }],
          isError: true,
        };
      }

      const result = await client.pollOwnerInteractions(state.ownerId, { afterId, limit });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // Owner conversation list
  server.registerTool(
    "agentmesh_owner_conversations",
    {
      description:
        "List all conversations the owner has had with agents and other owners. " +
        "Shows each conversation partner with the last message.",
      inputSchema: {},
    },
    async () => {
      if (!state.ownerId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Owner ID not available." }) }],
          isError: true,
        };
      }

      const result = await client.getOwnerConversations(state.ownerId);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
