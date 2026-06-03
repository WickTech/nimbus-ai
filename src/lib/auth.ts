import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
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

// Full config: edge-safe base + Node-only adapter and Credentials provider.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !verifyPassword(password, user.passwordHash)) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
