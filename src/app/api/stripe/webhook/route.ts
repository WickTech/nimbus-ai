import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { grantCredits } from "@/lib/credits";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  // Raw body required for signature verification.
  const rawBody = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits ?? 0);

    if (userId && credits > 0) {
      try {
        // The checkout session id is the idempotency key: Stripe retries deliveries, and one payment must
        // grant its credits exactly once.
        await grantCredits(db, userId, credits, "topup", session.id);
      } catch (error) {
        const alreadyGranted =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!alreadyGranted) throw error;
      }
    }
  }

  return new Response("ok");
}
