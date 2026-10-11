import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

/** Exactly what the pre-scrypt hashPassword produced. */
function legacyHash(password: string, secret = process.env.AUTH_SECRET ?? "nimbus") {
  return createHash("sha256").update(`${secret}:${password}`).digest("hex");
}

describe("password hashing", () => {
  let savedSecret: string | undefined;
  beforeEach(() => {
    savedSecret = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "test-secret";
  });
  afterEach(() => {
    if (savedSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = savedSecret;
  });

  it("hashes with scrypt and a per-call random salt", () => {
    const a = hashPassword("hunter22");
    const b = hashPassword("hunter22");
    expect(a).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(a).not.toBe(b);
  });

  it("verifies scrypt hashes without asking for a rehash", () => {
    const stored = hashPassword("correct horse");
    expect(verifyPassword("correct horse", stored)).toEqual({ ok: true, needsRehash: false });
    expect(verifyPassword("wrong horse", stored)).toEqual({ ok: false, needsRehash: false });
  });

  it("accepts a legacy SHA-256 hash and flags it for upgrade", () => {
    const stored = legacyHash("old-password");
    expect(verifyPassword("old-password", stored)).toEqual({ ok: true, needsRehash: true });
  });

  it("rejects a wrong password against a legacy hash, with no rehash", () => {
    const stored = legacyHash("old-password");
    expect(verifyPassword("guess", stored)).toEqual({ ok: false, needsRehash: false });
  });

  it("fails legacy verification if AUTH_SECRET was rotated", () => {
    const stored = legacyHash("old-password", "previous-secret");
    expect(verifyPassword("old-password", stored).ok).toBe(false);
  });

  it("uses the 'nimbus' default salt when AUTH_SECRET was unset", () => {
    const stored = legacyHash("old-password", "nimbus");
    delete process.env.AUTH_SECRET;
    expect(verifyPassword("old-password", stored)).toEqual({ ok: true, needsRehash: true });
  });

  it("never succeeds for a missing user or a malformed hash", () => {
    expect(verifyPassword("anything", undefined)).toEqual({ ok: false, needsRehash: false });
    expect(verifyPassword("anything", "")).toEqual({ ok: false, needsRehash: false });
    expect(verifyPassword("anything", "bcrypt:abc:def")).toEqual({ ok: false, needsRehash: false });
    // 64 chars but not hex: must not be treated as legacy.
    expect(verifyPassword("anything", "z".repeat(64)).ok).toBe(false);
  });

  it("an upgraded hash verifies as scrypt afterwards", () => {
    const legacy = legacyHash("migrate-me");
    expect(verifyPassword("migrate-me", legacy).needsRehash).toBe(true);
    const upgraded = hashPassword("migrate-me");
    expect(verifyPassword("migrate-me", upgraded)).toEqual({ ok: true, needsRehash: false });
  });
});
