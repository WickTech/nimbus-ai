import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth configuration.
 *
 * This file must NOT import Node-only APIs (node:crypto), the Prisma adapter,
 * or the database — it is loaded by `middleware.ts`, which runs in the Edge
 * runtime. The Credentials provider (which needs both) is added in `auth.ts`
 * for the Node server only. This is the documented NextAuth v5 split-config
 * pattern.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // real providers are attached in auth.ts (Node runtime)
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) session.user.id = String(token.uid);
      return session;
    },
  },
} satisfies NextAuthConfig;
