import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import { authConfig } from "@/lib/auth.config";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

const SCRYPT_KEYLEN = 64;

// Per-user random salt + scrypt (deliberately slow/memory-hard, unlike a
// single SHA-256 round). Format: "scrypt:<salt-hex>:<derived-hex>".
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, derivedHex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !derivedHex) return false;

  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const target = Buffer.from(derivedHex, "hex");
  return candidate.length === target.length && timingSafeEqual(candidate, target);
}

// Fixed dummy salt+hash so a non-existent email still pays scryptSync's
// cost — otherwise response time differs for valid vs. invalid emails
// (existing emails always run scrypt, missing ones used to short-circuit).
const DUMMY_HASH = hashPassword(randomBytes(32).toString("hex"));

// Full config: edge-safe base + Node-only adapter, Credentials + GitHub providers.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds, request) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        // Unthrottled login was the one credential-guessing surface that
        // never got a limiter (register did). 10 attempts / 15 min / IP.
        if (isRateLimited(`login:${clientIp(request)}`, 10, 15 * 60 * 1000)) return null;

        const user = await db.user.findUnique({ where: { email } });
        // Always run verifyPassword, even for a missing user (against a
        // fixed dummy hash) — a non-existent email must cost the same time
        // as a wrong password, or response timing leaks which emails exist.
        const ok = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user?.passwordHash || !ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  events: {
    // Grant free credits when a new OAuth user is created for the first time.
    async createUser({ user }) {
      if (!user.id) return;
      const freeCredits = Number(process.env.SIGNUP_FREE_CREDITS ?? "100");
      // Best-effort: a failure here shouldn't block OAuth signup, but it
      // used to vanish silently, leaving a new user with 0 credits and no
      // trace. At minimum, log it so it's visible in monitoring.
      await grantCredits(db, user.id, freeCredits, "signup").catch((err) => {
        console.error(`Failed to grant signup credits for user ${user.id}:`, err);
      });
    },
  },
});
