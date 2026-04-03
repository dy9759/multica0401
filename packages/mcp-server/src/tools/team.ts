import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";

export function registerTeamTools(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string },
) {
  server.registerTool("agentmesh_create_team", {
    description: "Create a team with a leader and optional members. The creator becomes the leader.",
    inputSchema: {
      name: z.string().describe("Team name (unique)"),
      description: z.string().optional().describe("Team description"),
      memberIds: z.array(z.string()).optional().describe("Agent/Owner IDs to add as members"),
    },
  }, async ({ name, description, memberIds }) => {
    try {
      const members = memberIds?.map(id => ({ id, type: id.startsWith("owner-") ? "owner" : "agent" }));
      const team = await client.createTeam({ name, description, members });
      return { content: [{ type: "text" as const, text: JSON.stringify(team, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  });

  server.registerTool("agentmesh_team_status", {
    description: "Get team details including all members and their roles.",
    inputSchema: { teamId: z.string().describe("Team ID") },
  }, async ({ teamId }) => {
    try {
      const team = await client.getTeam(teamId);
      return { content: [{ type: "text" as const, text: JSON.stringify(team, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  });

  server.registerTool("agentmesh_list_teams", {
    description: "List all teams.",
    inputSchema: {},
  }, async () => {
    try {
      const result = await client.listTeams();
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  });

  server.registerTool("agentmesh_team_broadcast", {
    description: "Send a message to all team members (except yourself).",
    inputSchema: {
      teamId: z.string().describe("Team ID"),
      text: z.string().describe("Message to broadcast"),
    },
  }, async ({ teamId, text }) => {
    try {
      const result = await client.teamBroadcast(teamId, text);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  });
}
