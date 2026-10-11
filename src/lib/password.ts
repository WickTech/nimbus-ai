import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;

// Pre-scrypt format: hex SHA-256 of `${AUTH_SECRET ?? "nimbus"}:${password}`.
const LEGACY_SHA256 = /^[0-9a-f]{64}$/;

// Per-user random salt + scrypt (deliberately slow/memory-hard, unlike a
// single SHA-256 round). Format: "scrypt:<salt-hex>:<derived-hex>".
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

// Fixed dummy hash so every failed or legacy check still pays scryptSync's
// cost — otherwise response time leaks whether an email exists, or that an
// account still carries a (weaker) legacy hash.
const DUMMY_HASH = hashPassword(randomBytes(32).toString("hex"));

export type VerifyResult = { ok: boolean; needsRehash: boolean };

/**
 * Verify `password` against a stored hash. Pass `undefined` for a missing
 * user; it is checked against a dummy hash so timing stays uniform.
 *
 * Accepts legacy SHA-256 hashes so accounts created before the scrypt switch
 * can still sign in; `needsRehash` tells the caller to upgrade them.
 */
export function verifyPassword(password: string, stored: string | undefined): VerifyResult {
  if (stored && LEGACY_SHA256.test(stored)) {
    const ok = verifyLegacy(password, stored);
    verifyScrypt(password, DUMMY_HASH); // equalise timing with the scrypt path
    return { ok, needsRehash: ok };
  }
  const ok = verifyScrypt(password, stored ?? DUMMY_HASH);
  return { ok: Boolean(stored) && ok, needsRehash: false };
}

function verifyScrypt(password: string, stored: string): boolean {
  const [scheme, salt, derivedHex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !derivedHex) return false;

  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const target = Buffer.from(derivedHex, "hex");
  return candidate.length === target.length && timingSafeEqual(candidate, target);
}

function verifyLegacy(password: string, stored: string): boolean {
  // Salt was AUTH_SECRET; if it has been rotated since, legacy hashes can't
  // verify and those users must reset their password.
  const salt = process.env.AUTH_SECRET ?? "nimbus";
  const candidate = createHash("sha256").update(`${salt}:${password}`).digest();
  return timingSafeEqual(candidate, Buffer.from(stored, "hex"));
}
