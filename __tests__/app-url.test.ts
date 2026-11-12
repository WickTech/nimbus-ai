import { describe, expect, it } from "vitest";
import { appBaseUrl } from "@/lib/app-url";

describe("appBaseUrl", () => {
  it("prefers AUTH_URL and returns only its origin", () => {
    expect(
      appBaseUrl({ AUTH_URL: "https://nimbus.example.test/api/auth", NEXTAUTH_URL: "https://old.example.test" }),
    ).toBe("https://nimbus.example.test");
  });

  it("falls back to NEXTAUTH_URL, then the Vercel production host, then localhost", () => {
    expect(appBaseUrl({ NEXTAUTH_URL: "https://old.example.test/" })).toBe("https://old.example.test");
    expect(appBaseUrl({ VERCEL_PROJECT_PRODUCTION_URL: "nimbus.vercel.app" })).toBe("https://nimbus.vercel.app");
    expect(appBaseUrl({})).toBe("http://localhost:3000");
  });

  it("skips blank, malformed and non-http values", () => {
    expect(
      appBaseUrl({
        AUTH_URL: "   ",
        NEXTAUTH_URL: "javascript:alert(1)",
        VERCEL_PROJECT_PRODUCTION_URL: "nimbus.vercel.app",
      }),
    ).toBe("https://nimbus.vercel.app");
    expect(appBaseUrl({ AUTH_URL: "not a url" })).toBe("http://localhost:3000");
  });

  it("keeps a non-default port", () => {
    expect(appBaseUrl({ AUTH_URL: "http://localhost:3100" })).toBe("http://localhost:3100");
  });
});
