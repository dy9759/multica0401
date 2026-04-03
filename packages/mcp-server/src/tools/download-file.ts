import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { HubClient } from "../client/hub-client.js";

export function registerDownloadFileTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
) {
  server.registerTool(
    "agentmesh_download_file",
    {
      description:
        "Download a file received from another agent. Supports both inline base64 files and Hub-uploaded files.",
      inputSchema: {
        fileId: z
          .string()
          .optional()
          .describe("The file ID from a received interaction (for large files uploaded to Hub)"),
        base64: z
          .string()
          .optional()
          .describe("The base64 content from a received interaction (for inline small files)"),
        fileName: z
          .string()
          .optional()
          .describe("Original file name"),
        destDir: z
          .string()
          .optional()
          .describe("Destination directory; defaults to OS temp dir"),
      },
    },
    async ({ fileId, base64, fileName, destDir }) => {
      const outputDir = destDir || join(tmpdir(), "agentmesh-files");
      mkdirSync(outputDir, { recursive: true });

      let resultPath: string;
      let resultFileName: string;
      let resultSize: number;

      if (base64) {
        // Inline base64 file
        resultFileName = fileName || "downloaded-file";
        resultPath = join(outputDir, resultFileName);
        const buffer = Buffer.from(base64, "base64");
        writeFileSync(resultPath, buffer);
        resultSize = buffer.length;
      } else if (fileId) {
        // Download from Hub
        const tempName = fileName || `file-${fileId}`;
        resultPath = join(outputDir, tempName);
        const result = await client.downloadFile(fileId, resultPath);
        resultFileName = result.fileName;
        resultSize = result.size;

        // Rename if the actual filename differs
        if (result.fileName !== tempName) {
          const { renameSync } = await import("node:fs");
          const finalPath = join(outputDir, result.fileName);
          renameSync(resultPath, finalPath);
          resultPath = finalPath;
        }
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Either fileId or base64 must be provided" }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                filePath: resultPath,
                fileName: resultFileName,
                size: resultSize,
                message: `File "${resultFileName}" saved to ${resultPath}`,
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
