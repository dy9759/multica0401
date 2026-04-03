import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerCreateSessionTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string },
) {
  server.registerTool(
    "agentmesh_create_session",
    {
      description:
        "Create a multi-turn collaboration session with another agent or owner. " +
        "Sessions track conversation history, shared context, and turn count. " +
        "Use this to start a structured discussion on a specific topic.",
      inputSchema: {
        title: z.string().describe("Topic/title for the session"),
        participantIds: z.array(z.string()).describe("Agent or Owner IDs to invite"),
        maxTurns: z.number().int().min(2).max(100).optional().describe("Max conversation turns (default 20)"),
        topic: z.string().optional().describe("Initial context/topic description"),
      },
    },
    async ({ title, participantIds, maxTurns, topic }) => {
      const myId = state.agentId ?? state.ownerId;
      if (!myId) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }], isError: true };
      }

      const participants = participantIds.map((id) => ({
        id,
        type: id.startsWith("owner-") ? "owner" : "agent",
      }));

      try {
        const result = await client.createSession({
          title,
          participants,
          maxTurns,
          context: topic ? { topic } : undefined,
        });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              sessionId: result.id,
              title: result.title,
              status: result.status,
              participants: result.participants,
              maxTurns: result.maxTurns,
              message: `Session '${title}' created. Use agentmesh_multi_turn_chat to start the conversation.`,
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to create session: ${err.message ?? err}` }) }],
          isError: true,
        };
      }
    },
  );
}
