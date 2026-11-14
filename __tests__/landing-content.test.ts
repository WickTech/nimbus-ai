import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHAT_SAMPLE, FEATURES, FLOW, HERO_LEDE, HISTORY_SAMPLE, PACKS } from "../src/components/landing/content";
import { TOKENS_PER_CREDIT, tokensToCredits } from "../src/lib/credits";
import { BUCKETS } from "../src/lib/history";
import { CREDIT_PACKAGES } from "../src/lib/stripe";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("landing content stays true to the product", () => {
  it("has the three features and four steps, with the titles the page has always had", () => {
    expect(FEATURES.map((f) => f.title)).toEqual(["Streaming chat", "Credit billing", "Auth + persistence"]);
    expect(FLOW.map((s) => s.title)).toEqual(["1. Sign up", "2. Chat", "3. Pay for what you use", "4. Top up"]);
  });

  it.each(FLOW.flatMap((step) => step.entries.map((e) => [e.reason, e] as const)))(
    'the ledger reason "%s" is still written by %s',
    (_reason, entry) => {
      expect(read(entry.source), `"${entry.reason}" is gone from ${entry.source}`).toContain(`"${entry.reason}"`);
    },
  );

  it("shows the same packs Stripe sells", () => {
    expect(PACKS.map((p) => p.credits)).toEqual(CREDIT_PACKAGES.map((p) => p.credits));
    // The labels read "100 credits - $1"; the dollars must match what the landing shows.
    for (const pack of PACKS) {
      const label = CREDIT_PACKAGES.find((p) => p.credits === pack.credits)?.label ?? "";
      expect(label).toContain(`$${pack.dollars}`);
    }
    expect(PACKS.filter((p) => p.best)).toHaveLength(1);
  });

  it("prices the sample chat by the real rule (1 credit per 1k tokens, rounded up, at least 1 per request)", () => {
    expect(TOKENS_PER_CREDIT).toBe(1000);
    expect(tokensToCredits(CHAT_SAMPLE.tokens)).toBe(2);
    expect(tokensToCredits(1)).toBe(1); // the "minimum of 1 credit per request" the first answer states
    expect(read("src/lib/credits.ts")).toContain("minimum 1 credit");
    const last = CHAT_SAMPLE.messages[CHAT_SAMPLE.messages.length - 1];
    expect(last.role).toBe("assistant");
    expect(last.text).toContain("1,412 tokens");
    expect(last.text).toContain("2 credits");
    expect(CHAT_SAMPLE.tokensLabel).toBe("1,412 tokens");
    expect(CHAT_SAMPLE.messages.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
  });

  it("uses the real history group labels and the schema's default chat title", () => {
    expect(BUCKETS).toContain("Today");
    expect(BUCKETS).toContain("Yesterday");
    expect(read("prisma/schema.prisma")).toContain('@default("New chat")');
    expect(HISTORY_SAMPLE.today.map((c) => c.title)).toContain("New chat");
  });

  it("says passwords are scrypt-hashed because they are", () => {
    expect(HISTORY_SAMPLE.note).toContain("scrypt");
    expect(read("src/lib/password.ts")).toContain("scrypt");
  });

  it("does not claim a single credit is reserved (the reserve is the estimated worst case)", () => {
    expect(FLOW[1].body).not.toMatch(/one credit is reserved/i);
  });

  it("uses no em or en dashes in any visible string", () => {
    const text = JSON.stringify({ HERO_LEDE, FEATURES, CHAT_SAMPLE, HISTORY_SAMPLE, FLOW, PACKS });
    expect(text).not.toContain("—");
    expect(text).not.toContain("–");
  });
});
