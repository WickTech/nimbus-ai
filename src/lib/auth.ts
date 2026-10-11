import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import { authConfig } from "@/lib/auth.config";
import { clientIp, isRateLimited } from "@/lib/rateLimit";
import { hashPassword, verifyPassword } from "@/lib/password";

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
        // Always run verifyPassword, even for a missing user (it checks a
        // fixed dummy hash) — a non-existent email must cost the same time
        // as a wrong password, or response timing leaks which emails exist.
        const { ok, needsRehash } = verifyPassword(password, user?.passwordHash ?? undefined);
        if (!user?.passwordHash || !ok) return null;

        if (needsRehash) {
          // Legacy SHA-256 hash verified: upgrade to scrypt now that we have
          // the plaintext. Compare-and-swap on the old hash so a concurrent
          // password change isn't overwritten. Best-effort — a failure just
          // means we retry on the next login.
          await db.user
            .updateMany({
              where: { id: user.id, passwordHash: user.passwordHash },
              data: { passwordHash: hashPassword(password) },
            })
            .catch((err) => console.error(`Password rehash failed for user ${user.id}:`, err));
        }

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
