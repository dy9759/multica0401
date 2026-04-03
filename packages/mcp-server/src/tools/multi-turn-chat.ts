import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";
import type { Interaction } from "@agentmesh/shared";

export function registerMultiTurnChatTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string },
) {
  server.registerTool(
    "agentmesh_multi_turn_chat",
    {
      description:
        "Start or continue a multi-turn collaboration session with another agent. " +
        "Creates a session, sends your message, and waits for a reply. " +
        "Returns the reply so you can decide whether to continue the conversation. " +
        "Each call is one turn — call again with the sessionId to continue.",
      inputSchema: {
        targetAgentId: z.string().describe("The agentId to collaborate with"),
        message: z.string().describe("Your message for this turn"),
        sessionId: z.string().optional().describe("Existing session ID to continue. If omitted, creates a new session."),
        topic: z.string().optional().describe("Topic for new session (only used when creating)"),
        maxTurns: z.number().int().min(2).max(100).optional().describe("Max turns for new session (default 20)"),
        timeoutMs: z.number().int().min(5000).max(300000).optional().describe("How long to wait for reply (default 60000ms)"),
      },
    },
    async ({ targetAgentId, message, sessionId, topic, maxTurns, timeoutMs }) => {
      const myId = state.agentId;
      if (!myId) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }], isError: true };
      }

      const timeout = timeoutMs ?? 60000;
      let currentSessionId: string = sessionId ?? "";

      // Step 1: Create session if needed
      if (currentSessionId === "") {
        try {
          const session = await client.createSession({
            title: topic ?? `Chat with ${targetAgentId}`,
            participants: [{ id: targetAgentId, type: "agent" }],
            maxTurns: maxTurns ?? 20,
            context: topic ? { topic } : undefined,
          });
          currentSessionId = session.id;
        } catch (err: any) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to create session: ${err.message ?? err}` }) }], isError: true };
        }
      }

      // Step 2: Send message with sessionId
      const correlationId = `mtc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        await client.sendInteraction({
          type: "message",
          contentType: "text",
          target: { agentId: targetAgentId, sessionId: currentSessionId },
          payload: { text: message },
          metadata: { expectReply: true, correlationId },
        });
      } catch (err: any) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to send message: ${err.message ?? err}`, sessionId: currentSessionId }) }], isError: true };
      }

      // Step 3: Poll for reply
      const startTime = Date.now();
      const pollInterval = 2000;
      let lastId: string | undefined;

      while (Date.now() - startTime < timeout) {
        await sleep(pollInterval);

        const result = await client.pollInteractions(myId, { afterId: lastId, limit: 50 });
        const interactions: Interaction[] = result.interactions ?? [];

        if (interactions.length > 0) {
          lastId = interactions[interactions.length - 1].id;
        }

        // Find reply from target in this session
        const reply = interactions.find(
          (i) =>
            (i.fromId ?? i.fromAgent) === targetAgentId &&
            (i.metadata?.correlationId === correlationId ||
             (i.target?.sessionId === currentSessionId && !i.metadata?.correlationId)),
        );

        if (reply) {
          // Get session status
          let sessionStatus: any;
          try {
            sessionStatus = await client.getSession(currentSessionId);
          } catch { /* ignore */ }

          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                sessionId: currentSessionId,
                turn: sessionStatus?.currentTurn ?? "?",
                maxTurns: sessionStatus?.maxTurns ?? "?",
                sessionStatus: sessionStatus?.status ?? "unknown",
                reply: reply.payload.text ?? reply.payload.data,
                fromAgent: reply.fromId,
                interactionId: reply.id,
                hint: sessionStatus?.status === "completed"
                  ? "Session completed (max turns reached)."
                  : "Call agentmesh_multi_turn_chat again with this sessionId to continue.",
              }, null, 2),
            }],
          };
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            sessionId: currentSessionId,
            error: "timeout",
            message: `No reply from ${targetAgentId} within ${timeout}ms`,
            hint: "The agent may be offline. Try again later or check agentmesh_session_status.",
          }, null, 2),
        }],
      };
    },
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
