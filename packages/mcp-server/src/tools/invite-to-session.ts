import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerInviteToSessionTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string },
) {
  server.registerTool(
    "agentmesh_invite_to_session",
    {
      description:
        "Invite another agent or owner to join an existing collaboration session. " +
        "Sends a session_invite notification and adds them as a participant.",
      inputSchema: {
        sessionId: z.string().describe("The session to invite to"),
        targetId: z.string().describe("Agent or Owner ID to invite"),
      },
    },
    async ({ sessionId, targetId }) => {
      if (!state.agentId && !state.ownerId) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Not authenticated." }) }], isError: true };
      }

      try {
        // Join them to the session
        await client.joinSession(sessionId);

        // Send invite notification
        const targetType = targetId.startsWith("owner-") ? "owner" : "agent";
        const invite = await client.sendSessionInvite(sessionId, targetId, targetType as "agent" | "owner");

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              sessionId,
              invitedId: targetId,
              message: `Invited ${targetId} to session ${sessionId}`,
              interactionId: invite.id,
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to invite: ${err.message ?? err}` }) }],
          isError: true,
        };
      }
    },
  );
}
