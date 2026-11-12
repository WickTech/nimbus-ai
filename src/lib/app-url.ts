/**
 * The app's public origin, from configuration only. Used for links that leave the app and come back
 * (Stripe Checkout redirects), so it must never come from request headers: `Origin`/`Host` are
 * client-controlled and would let a caller point the post-payment redirect at another site.
 *
 * Order: AUTH_URL (Auth.js v5), NEXTAUTH_URL (its older name), VERCEL_PROJECT_PRODUCTION_URL (Vercel system
 * variable, a bare host), then http://localhost:3000 for local dev. Values that are not valid http(s)
 * URLs are skipped. Any path (e.g. AUTH_URL=https://x/api/auth) is dropped: only the origin is returned.
 */
export function appBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const candidates = [env.AUTH_URL, env.NEXTAUTH_URL, vercelHost ? `https://${vercelHost}` : undefined];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {
      // Not a URL: try the next source.
    }
  }
  return "http://localhost:3000";
}
