import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use the edge-safe config only — importing the full auth.ts here would pull
// node:crypto + Prisma into the Edge runtime and break the build.
const { auth } = NextAuth(authConfig);

// Protect the dashboard. Unauthenticated users are bounced to /login.
export default auth((req) => {
  const isProtected = req.nextUrl.pathname.startsWith("/chat");
  if (isProtected && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("from", req.nextUrl.pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/chat/:path*"],
};
