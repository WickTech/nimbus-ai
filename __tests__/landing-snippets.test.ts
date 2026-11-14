import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tokenize } from "../src/components/landing/code-tokens";
import { featureSnippets, heroSnippet } from "../src/components/landing/snippets";

const root = join(__dirname, "..");
const all = [heroSnippet, ...featureSnippets];

describe("landing code excerpts", () => {
  it.each(all.map((s) => [s.file, s] as const))("%s still matches the file it was condensed from", (_name, snippet) => {
    const source = readFileSync(join(root, snippet.source), "utf8");
    for (const anchor of snippet.anchors) {
      expect(source, `"${anchor}" is gone from ${snippet.source}`).toContain(anchor);
    }
  });

  it.each(all.map((s) => [s.file, s] as const))("%s fits the code frame without side scrolling on desktop", (_name, snippet) => {
    // The frames are about 60 characters wide at the 12.5px mono size; narrower screens scroll sideways.
    for (const line of snippet.code.split("\n")) expect(line.length).toBeLessThanOrEqual(58);
  });

  it("uses no em dashes", () => {
    for (const s of all) expect(s.code).not.toContain("—");
  });
});

describe("tokenize", () => {
  it("round-trips the code exactly", () => {
    for (const s of all) expect(tokenize(s.code, s.lang).map((t) => t.text).join("")).toBe(s.code);
  });

  it("marks comments, strings and keywords", () => {
    const kinds = tokenize('const a = "x"; // note', "ts").map((t) => [t.text, t.kind]);
    expect(kinds).toContainEqual(["const", "keyword"]);
    expect(kinds).toContainEqual(['"x"', "string"]);
    expect(kinds).toContainEqual(["// note", "comment"]);
  });

  it("does not treat `model` as a keyword in TypeScript, only in Prisma", () => {
    expect(tokenize("model: chatModel,", "ts").every((t) => t.kind === "plain")).toBe(true);
    expect(tokenize("model Conversation {", "prisma")[0]).toEqual({ text: "model", kind: "keyword" });
  });
});
