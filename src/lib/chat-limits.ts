// Request bounds for /api/chat, shared by the route (enforces them) and the chat client (trims to them),
// so the two cannot drift apart.

export const MAX_MESSAGES = 40;
export const MAX_MESSAGE_CHARS = 8000;
export const MAX_TOTAL_CHARS = 48_000;
// Output cap per reply, also the output part of the credit reserve.
export const MAX_OUTPUT_TOKENS = 1024;
// Smallest credit reserve the server will ever take; below this balance every send gets a 402.
export const MIN_CREDITS_TO_SEND = 2;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Trim a chat history to the newest window the server accepts: at most MAX_MESSAGES messages and
 * MAX_TOTAL_CHARS characters. Drops the oldest first, always keeps the newest message, keeps the order, and
 * starts the window at a user message (leading assistant replies are dropped). Roles other than
 * user/assistant are ignored. A single message over MAX_MESSAGE_CHARS is not cut here: the server refuses it.
 */
export function trimChatWindow<T extends { role: string; content: string }>(history: T[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of history) {
    if (m.role === "user" || m.role === "assistant") turns.push({ role: m.role, content: m.content });
  }

  let start = turns.length;
  let chars = 0;
  while (start > 0) {
    const next = turns[start - 1];
    const fits = turns.length - start < MAX_MESSAGES && chars + next.content.length <= MAX_TOTAL_CHARS;
    // The newest message is always kept, even if it alone is over the total.
    if (!fits && start !== turns.length) break;
    chars += next.content.length;
    start--;
  }
  // Prefer a user message first, but never drop the newest message to get there.
  while (start < turns.length - 1 && turns[start].role !== "user") start++;
  return turns.slice(start);
}
