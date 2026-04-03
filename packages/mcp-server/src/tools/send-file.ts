import { z } from "zod";
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { lookup } from "mime-types";
import type { HubClient } from "../client/hub-client.js";

const FILE_SIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB

export function registerSendFileTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string },
) {
  server.registerTool(
    "agentmesh_send_file",
    {
      description:
        "Send a file to another agent. Files <5MB are sent inline; larger files are uploaded to the Hub first.",
      inputSchema: {
        filePath: z.string().describe("Absolute path to the file to send"),
        toAgentId: z.string().describe("The agentId of the recipient agent"),
        message: z
          .string()
          .optional()
          .describe("Optional message to accompany the file"),
      },
    },
    async ({ filePath, toAgentId, message }) => {
      const stat = statSync(filePath);
      const fileName = basename(filePath);
      const contentType = lookup(fileName) || "application/octet-stream";
      const size = stat.size;

      let filePayload: Record<string, unknown>;

      if (size < FILE_SIZE_THRESHOLD) {
        // Small file: base64 inline
        const buffer = readFileSync(filePath);
        filePayload = {
          fileName,
          contentType,
          size,
          base64: buffer.toString("base64"),
        };
      } else {
        // Large file: upload first
        const uploaded = await client.uploadFile(filePath);
        filePayload = {
          fileId: uploaded.id,
          fileName,
          contentType,
          size,
        };
      }

      const result = await client.sendInteraction({
        type: "message",
        contentType: "json",
        target: { agentId: toAgentId },
        payload: {
          text: message,
          file: filePayload as any,
        },
        metadata: { schema: "file_transfer" },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                interactionId: result.id,
                delivered: result.delivered,
                fileName,
                size,
                method: size < FILE_SIZE_THRESHOLD ? "inline" : "upload",
                message: `File "${fileName}" sent to ${toAgentId}`,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
