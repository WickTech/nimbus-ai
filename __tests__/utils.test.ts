import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names and drops falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("lets the later Tailwind utility win", () => {
    expect(cn("px-2 py-1", "px-6")).toBe("py-1 px-6");
  });
});
