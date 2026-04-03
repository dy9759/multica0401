import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerSubmitPlanTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string },
) {
  server.registerTool(
    "agentmesh_submit_plan",
    {
      description:
        "Submit a plan or proposal to a session for review by other participants. " +
        "Sends a plan_request interaction that others can approve or provide feedback on.",
      inputSchema: {
        sessionId: z.string().describe("The session to submit the plan to"),
        targetId: z.string().describe("Agent or Owner ID to send the plan to (usually the coordinator)"),
        plan: z.string().describe("The plan/proposal text"),
        data: z.record(z.unknown()).optional().describe("Optional structured data for the plan"),
      },
    },
    async ({ sessionId, targetId, plan, data }) => {
      if (!state.agentId) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered." }) }], isError: true };
      }

      try {
        const targetType = targetId.startsWith("owner-") ? "ownerId" : "agentId";
        const result = await client.sendInteraction({
          type: "plan_request" as any,
          contentType: "text",
          target: { [targetType]: targetId, sessionId },
          payload: { text: plan, data },
          metadata: { expectReply: true, correlationId: `plan-${Date.now()}` },
        });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              sessionId,
              planId: result.id,
              sentTo: targetId,
              message: "Plan submitted for review",
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to submit plan: ${err.message ?? err}` }) }],
          isError: true,
        };
      }
    },
  );

  // Get session summary
  server.registerTool(
    "agentmesh_session_summary",
    {
      description:
        "Get a structured summary of a collaboration session, including message timeline, " +
        "participant contribution counts, and session status.",
      inputSchema: {
        sessionId: z.string().describe("The session to summarize"),
      },
    },
    async ({ sessionId }) => {
      try {
        const summary = await client.getSessionSummary(sessionId);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to get summary: ${err.message ?? err}` }) }],
          isError: true,
        };
      }
    },
  );
}
