import { describe, expect, it } from "vitest";
import { MAX_MESSAGES, MAX_MESSAGE_CHARS, MAX_TOTAL_CHARS, trimChatWindow } from "@/lib/chat-limits";

type Role = "user" | "assistant";
const chat = (n: number, size = 10) =>
  Array.from({ length: n }, (_, i) => ({
    role: (i % 2 === 0 ? "user" : "assistant") as Role,
    content: `${i}`.padEnd(size, "x"),
  }));

describe("trimChatWindow", () => {
  it("leaves a short chat untouched", () => {
    const h = chat(5);
    expect(trimChatWindow(h)).toEqual(h);
  });

  it("caps at 40 messages, drops the oldest, keeps order and starts with a user message", () => {
    const h = chat(61); // ends with a user message (index 60)
    const out = trimChatWindow(h);
    expect(out.length).toBeLessThanOrEqual(MAX_MESSAGES);
    expect(out[0].role).toBe("user");
    expect(out[out.length - 1]).toEqual(h[60]);
    const start = h.length - out.length;
    expect(out).toEqual(h.slice(start));
    expect(out).toHaveLength(39); // 40 would start on an assistant message, which is dropped
  });

  it("caps at 48,000 characters", () => {
    const h = chat(21, MAX_MESSAGE_CHARS); // 21 x 8,000 = 168,000
    const out = trimChatWindow(h);
    expect(out.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(MAX_TOTAL_CHARS);
    expect(out).toHaveLength(5); // 6 x 8,000 fits the total but starts on an assistant message
    expect(out[0].role).toBe("user");
    expect(out[out.length - 1]).toEqual(h[20]);
  });

  it("keeps the newest message even when it alone exceeds the total", () => {
    const h = [...chat(4), { role: "user" as Role, content: "y".repeat(MAX_TOTAL_CHARS + 1) }];
    const out = trimChatWindow(h);
    expect(out).toEqual([h[4]]);
  });

  it("ignores non user/assistant roles and extra fields", () => {
    const h = [
      { role: "system", content: "s", id: "1" },
      { role: "user", content: "hi", id: "2" },
    ];
    expect(trimChatWindow(h)).toEqual([{ role: "user", content: "hi" }]);
  });

  it("returns an empty list for an empty history", () => {
    expect(trimChatWindow([])).toEqual([]);
  });
});
