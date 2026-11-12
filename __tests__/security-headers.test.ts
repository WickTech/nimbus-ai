import { describe, expect, it } from "vitest";
import nextConfig from "../next.config.mjs";

describe("security headers (next.config.mjs)", () => {
  it("applies the security headers to every path", async () => {
    const rules = await nextConfig.headers!();

    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
    const headers = Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
    expect(headers).toEqual({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "frame-ancestors 'none'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    });
  });

  it("does not ship a script or style CSP that could break Next or Stripe", async () => {
    const rules = await nextConfig.headers!();
    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";

    expect(csp).not.toMatch(/script-src|style-src|default-src/);
  });
});
