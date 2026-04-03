import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerAgentProfileTools(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string },
) {
  server.registerTool("agentmesh_update_profile", {
    description: "Update your agent's profile card (display name, avatar, bio, tags).",
    inputSchema: {
      displayName: z.string().optional().describe("Display name (shown instead of agentId)"),
      avatar: z.string().optional().describe("Avatar emoji or URL"),
      bio: z.string().optional().describe("Short bio/description"),
      tags: z.array(z.string()).optional().describe("Custom tags (e.g. ['backend', 'python', 'senior'])"),
      metadata: z.record(z.unknown()).optional().describe("Custom key-value metadata"),
    },
  }, async ({ displayName, avatar, bio, tags, metadata }) => {
    const agentId = state.agentId;
    if (!agentId) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered." }) }], isError: true };
    }
    try {
      const result = await client.updateAgentProfile(agentId, {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
      });
      return { content: [{ type: "text" as const, text: JSON.stringify({ message: "Profile updated", profile: result }, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  });

  server.registerTool("agentmesh_get_profile", {
    description: "Get an agent's profile card (name, avatar, bio, tags, capabilities).",
    inputSchema: {
      agentId: z.string().optional().describe("Agent ID (defaults to self)"),
    },
  }, async ({ agentId: targetId }) => {
    const id = targetId ?? state.agentId;
    if (!id) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No agent ID." }) }], isError: true };
    }
    try {
      const profile = await client.getAgentProfile(id);
      return { content: [{ type: "text" as const, text: JSON.stringify(profile, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  });
}
