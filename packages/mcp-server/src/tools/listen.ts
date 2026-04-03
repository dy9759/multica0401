import { z } from "zod";
import type { HubClient } from "../client/hub-client.js";
import type { Interaction } from "@agentmesh/shared";

/**
 * agentmesh_listen — Autonomous agent mode.
 *
 * 1. Auto-listen to all conversations (DM, channel, session) the agent is in
 * 2. On new message: fetch full history → pass to Claude as context
 * 3. Claude reads history, identifies intent, executes tasks (read files, write code, etc.)
 * 4. Claude replies in the same conversation with results
 * 5. Call listen() again → continuous autonomous loop
 */
export function registerListenTool(
  server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
  client: HubClient,
  state: { agentId?: string; ownerId?: string; lastProcessedId?: Record<string, string> },
) {
  if (!state.lastProcessedId) {
    state.lastProcessedId = {};
  }

  server.registerTool(
    "agentmesh_listen",
    {
      description:
        "Autonomous agent mode — listen for incoming messages across all conversations.\n\n" +
        "When a message arrives, this tool returns:\n" +
        "- The new message\n" +
        "- Full conversation history (last 20 messages for context)\n" +
        "- Conversation metadata (who, where, session info)\n\n" +
        "Your job as Claude:\n" +
        "1. Read the history and new message to understand context\n" +
        "2. Identify the intent (question, task request, discussion, etc.)\n" +
        "3. Execute any needed actions (Read files, Write code, Bash commands, etc.)\n" +
        "4. Reply in the same conversation using the suggested reply tool\n" +
        "5. Call agentmesh_listen() again to keep listening\n\n" +
        "This creates an autonomous agent loop where you continuously receive and handle messages.",
      inputSchema: {
        timeoutMs: z
          .number()
          .int()
          .min(5000)
          .max(300000)
          .optional()
          .describe("How long to wait for a message (default 60s, max 300s)"),
        channelName: z
          .string()
          .optional()
          .describe("Listen to a specific channel. If omitted, listens to all DMs."),
        sessionId: z
          .string()
          .optional()
          .describe("Listen to a specific session. If omitted, listens to all."),
      },
    },
    async ({ timeoutMs, channelName, sessionId }) => {
      const agentId = state.agentId;
      if (!agentId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Not registered. Call agentmesh_register first." }) }],
          isError: true,
        };
      }

      const timeout = timeoutMs ?? 60000;
      const startTime = Date.now();
      const pollInterval = 2000;

      // Fetch agent info for mention detection (do once before poll loop)
      let myName = agentId;
      let myCaps: string[] = [];
      try {
        const agentInfo = await client.getAgent(agentId);
        myName = agentInfo.name ?? agentId;
        myCaps = agentInfo.state?.capabilities ?? [];
      } catch {}

      // Determine the state key for tracking last processed message
      const stateKey = sessionId ? `session:${sessionId}` : channelName ? `channel:${channelName}` : "dm";
      let lastId = state.lastProcessedId![stateKey];

      // If no baseline, get current latest to avoid processing old messages
      if (!lastId) {
        try {
          if (sessionId) {
            const result = await client.getSessionMessages(sessionId, { limit: 1 });
            const msgs = (result as any).messages ?? [];
            if (msgs.length > 0) lastId = msgs[msgs.length - 1].id;
          } else if (channelName) {
            const result = await client.getChannelMessages(channelName, { limit: 1 });
            const msgs = (result as any).interactions ?? [];
            if (msgs.length > 0) lastId = msgs[msgs.length - 1].id;
          } else {
            const result = await client.pollInteractions(agentId, { limit: 1 });
            const msgs = result.interactions ?? [];
            if (msgs.length > 0) lastId = msgs[msgs.length - 1].id;
          }
        } catch { /* start from beginning */ }
      }

      // Poll loop
      while (Date.now() - startTime < timeout) {
        await sleep(pollInterval);

        try {
          let newMessages: Interaction[] = [];

          if (sessionId) {
            const result = await client.getSessionMessages(sessionId, { afterId: lastId, limit: 10 });
            newMessages = (result as any).messages ?? [];
          } else if (channelName) {
            const result = await client.getChannelMessages(channelName, { afterId: lastId, limit: 10 });
            newMessages = (result as any).interactions ?? [];
          } else {
            const result = await client.pollInteractions(agentId, { afterId: lastId, limit: 10 });
            newMessages = result.interactions ?? [];
          }

          if (newMessages.length > 0) {
            lastId = newMessages[newMessages.length - 1].id;
            state.lastProcessedId![stateKey] = lastId;
          }

          // Filter out own messages
          const incoming = newMessages.filter(m => (m.fromId ?? m.fromAgent) !== agentId);

          for (const msg of incoming) {
            const fromId = msg.fromId ?? msg.fromAgent;
            const text = msg.payload?.text ?? "";
            const msgSessionId = msg.target?.sessionId ?? sessionId;
            const msgChannel = msg.target?.channel ?? channelName;
            const isDM = !msgChannel && !msgSessionId;
            const isSession = !!msgSessionId;

            // @mention detection for channel messages
            let responseLevel: "forced" | "suggested" | "ignore" = "ignore";
            if (isDM || isSession) {
              responseLevel = "forced";
            } else if (msgChannel) {
              const lower = text.toLowerCase();
              if (lower.includes(`@${myName.toLowerCase()}`) || lower.includes(`@${agentId.toLowerCase()}`)) {
                responseLevel = "forced";
              } else {
                for (const cap of myCaps) {
                  if (cap && lower.includes(cap.toLowerCase())) {
                    responseLevel = "suggested";
                    break;
                  }
                }
              }
            }

            // Skip non-relevant channel messages
            if (responseLevel === "ignore") continue;

            const levelLabel = responseLevel === "forced"
              ? (isDM ? "DM: Direct message -- must respond" : isSession ? "SESSION: You are a participant -- must respond" : "MENTIONED: You were @mentioned -- must respond")
              : "SUGGESTED: Message matches your capabilities -- consider responding";

            // ── Fetch full conversation history for context ──
            let history: Interaction[] = [];
            let contextLabel = "";

            try {
              if (msgSessionId) {
                const hResult = await client.getSessionMessages(msgSessionId, { limit: 30 });
                const allMsgs = (hResult as any).messages ?? [];
                history = allMsgs.slice(-20); // Take last 20
                contextLabel = `Session ${msgSessionId}`;

                // Also get session context if available
                try {
                  const session = await client.getSession(msgSessionId);
                  if (session?.context?.topic) {
                    contextLabel += ` (Topic: ${session.context.topic})`;
                  }
                } catch {}
              } else if (msgChannel) {
                // Get recent channel messages (fetch more, then take last 20)
                const hResult = await client.getChannelMessages(msgChannel, { limit: 50 });
                const allMsgs = (hResult as any).interactions ?? [];
                history = allMsgs.slice(-20); // Take last 20 for context
                contextLabel = `Channel #${msgChannel}`;
              } else {
                // DM history — detect if peer is owner or agent
                const idType = fromId.startsWith("owner-") ? "ownerId" as const : "agentId" as const;
                const hResult = await client.getChatHistory(agentId, fromId, { limit: 30 }, idType);
                const allMsgs = (hResult as any).messages ?? [];
                history = allMsgs.slice(-20); // Take last 20
                contextLabel = `DM with ${fromId}`;
              }
            } catch { /* history fetch failed, proceed without */ }

            // ── Format history as readable context ──
            const historyText = history.map((h, i) => {
              const sender = (h.fromId ?? h.fromAgent) === agentId ? "You" : (h.fromId ?? h.fromAgent ?? "unknown");
              const content = h.payload?.text ?? JSON.stringify(h.payload?.data ?? {});
              const time = h.createdAt ? new Date(h.createdAt).toLocaleTimeString() : "";
              return `[${time}] ${sender}: ${content}`;
            }).join("\n");

            // ── Build reply instruction ──
            let replyInstruction: string;
            if (msgSessionId) {
              replyInstruction =
                `To reply, use: agentmesh_multi_turn_chat({ targetAgentId: "${fromId}", message: "your reply", sessionId: "${msgSessionId}" })`;
            } else if (msgChannel) {
              replyInstruction = `To reply, use: agentmesh_send_to_channel({ channelName: "${msgChannel}", text: "your reply" })`;
            } else if (fromId.startsWith("owner-")) {
              replyInstruction = `To reply, use: agentmesh_owner_send({ toOwnerId: "${fromId}", text: "your reply" })`;
            } else {
              replyInstruction = `To reply, use: agentmesh_send_message({ toAgentId: "${fromId}", text: "your reply" })`;
            }

            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({
                  // ── New message ──
                  newMessage: {
                    from: fromId,
                    fromType: msg.fromType ?? "agent",
                    text,
                    interactionId: msg.id,
                    timestamp: msg.createdAt,
                    hasFile: !!msg.payload?.file || !!msg.payload?.data?.fileId,
                  },

                  // ── Conversation context ──
                  conversation: {
                    type: msgSessionId ? "session" : msgChannel ? "channel" : "dm",
                    id: msgSessionId ?? msgChannel ?? fromId,
                    label: contextLabel,
                    historyCount: history.length,
                  },

                  // ── Full history ──
                  history: historyText || "(no prior messages)",

                  // ── Instructions for Claude ──
                  instructions:
                    `=== ${levelLabel} ===\n` +
                    `=== INCOMING MESSAGE ===\n` +
                    `From: ${fromId}\n` +
                    `Context: ${contextLabel}\n` +
                    `Message: "${text}"\n\n` +
                    `=== CONVERSATION HISTORY (last ${history.length} messages) ===\n` +
                    `${historyText || "(empty)"}\n\n` +
                    `=== YOUR TASK ===\n` +
                    `1. Read the history and new message carefully\n` +
                    `2. Identify what is being asked or discussed\n` +
                    `3. If it's a task (read files, fix code, analyze, etc.) — do it using your tools\n` +
                    `4. Compose a helpful reply based on the full context\n` +
                    `5. ${replyInstruction}\n` +
                    `6. Call agentmesh_listen() again to continue listening`,
                }, null, 2),
              }],
            };
          }
        } catch { /* network error — continue */ }
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            type: "timeout",
            message: `No new messages in ${timeout / 1000}s. Call agentmesh_listen() again to keep waiting.`,
          }),
        }],
      };
    },
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
