import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import { authConfig } from "@/lib/auth.config";

// NOTE: For a portfolio demo we hash with a salted SHA-256. In production,
// swap to argon2/bcrypt — the verify/hash boundary is isolated here.
export function hashPassword(password: string): string {
  const salt = process.env.AUTH_SECRET ?? "nimbus";
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  const candidate = Buffer.from(hashPassword(password));
  const stored = Buffer.from(hash);
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

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
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  events: {
    // Grant free credits when a new OAuth user is created for the first time.
    async createUser({ user }) {
      if (!user.id) return;
      const freeCredits = Number(process.env.SIGNUP_FREE_CREDITS ?? "100");
      await grantCredits(db, user.id, freeCredits, "signup").catch(() => {});
    },
  },
});
