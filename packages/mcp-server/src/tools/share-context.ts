import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerShareContextTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
) {
  server.registerTool(
    "agentmesh_share_context",
    {
      description:
        "Share context (files, code snippets, decisions) to a collaboration session. " +
        "All participants can see the shared context.",
      inputSchema: {
        sessionId: z.string().describe("The session to share context with"),
        files: z.array(z.object({
          name: z.string(),
          content: z.string().optional(),
          fileId: z.string().optional(),
        })).optional().describe("Files to share"),
        codeSnippets: z.array(z.object({
          language: z.string(),
          code: z.string(),
          description: z.string(),
        })).optional().describe("Code snippets to share"),
        decision: z.string().optional().describe("Record a decision made during discussion"),
        summary: z.string().optional().describe("Update the session summary"),
      },
    },
    async ({ sessionId, files, codeSnippets, decision, summary }) => {
      try {
        // Get current context
        const session = await client.getSession(sessionId);
        const ctx: Record<string, any> = session.context ?? { topic: session.title };

        // Merge new context
        if (files) {
          const existing = ctx.files ?? [];
          const merged = [...existing];
          for (const f of files) {
            const idx = merged.findIndex((e: any) => e.name === f.name);
            if (idx >= 0) merged[idx] = f; else merged.push(f);
          }
          ctx.files = merged;
        }
        if (codeSnippets) ctx.codeSnippets = [...(ctx.codeSnippets ?? []), ...codeSnippets];
        if (decision) {
          ctx.decisions = [...(ctx.decisions ?? []), {
            decision,
            by: "current-agent",
            at: new Date().toISOString(),
          }];
        }
        if (summary) ctx.summary = summary;

        // Update session context
        await client.updateSession(sessionId, { context: ctx });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              sessionId,
              message: "Context updated",
              context: ctx,
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed to share context: ${err.message ?? err}` }) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "agentmesh_get_session_context",
    {
      description: "Get the shared context of a collaboration session, including files, code snippets, and decisions.",
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
      },
    },
    async ({ sessionId }) => {
      const session = await client.getSession(sessionId);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            sessionId,
            title: session.title,
            status: session.status,
            currentTurn: session.currentTurn,
            maxTurns: session.maxTurns,
            context: session.context ?? {},
          }, null, 2),
        }],
      };
    },
  );
}
