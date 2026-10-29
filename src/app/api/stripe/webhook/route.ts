import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { grantCreditsInTx } from "@/lib/credits";

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
        // One transaction: record the checkout session id (primary key), then grant. Stripe retries
        // deliveries, and a repeat fails the insert (P2002), which rolls the grant back too.
        await db.$transaction(async (tx) => {
          await tx.processedStripeSession.create({ data: { id: session.id } });
          await grantCreditsInTx(tx, userId, credits, "topup");
        });
      } catch (error) {
        const alreadyGranted =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!alreadyGranted) throw error;
      }
    }
  }

  return new Response("ok");
}
