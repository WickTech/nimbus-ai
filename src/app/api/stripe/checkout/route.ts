import { z } from "zod";
import { auth } from "@/lib/auth";
import { stripe, CREDIT_PACKAGES } from "@/lib/stripe";
import { appBaseUrl } from "@/lib/app-url";

export const runtime = "nodejs";

const BodySchema = z.object({
  priceId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { priceId } = parsed.data;

  const pkg = CREDIT_PACKAGES.find((p) => p.priceId === priceId);
  if (!pkg) {
    return Response.json({ error: "Unknown price" }, { status: 400 });
  }

  // From configuration, never from the request headers (see appBaseUrl).
  const origin = appBaseUrl();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/account?tab=credits&topup=success`,
    cancel_url: `${origin}/account?tab=credits`,
    metadata: {
      userId: session.user.id,
      credits: String(pkg.credits),
    },
  });

  return Response.json({ url: checkoutSession.url });
}
