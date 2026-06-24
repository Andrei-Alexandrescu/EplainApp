import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { getStripe } from "../lib/stripe-client.js";
import {
  getUserIdForSubscription,
  planFromPriceId,
  recordFromStripeSubscription,
  saveBillingRecord,
} from "../lib/billing-store.js";
import type { PlanId } from "../lib/billing-types.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve());
    req.on("error", reject);
  });
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return res.status(503).json({ error: "Stripe webhook is not configured" });
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || Array.isArray(sig)) {
    return res.status(400).json({ error: "Missing Stripe signature" });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.client_reference_id ??
          session.metadata?.userId ??
          (session.subscription
            ? null
            : null);
        const planMeta = session.metadata?.plan as PlanId | undefined;
        if (!userId || !session.subscription) break;

        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const record = recordFromStripeSubscription(sub, planMeta);
        if (record) {
          await saveBillingRecord(userId, record);
        } else {
          console.error("checkout.session.completed: could not build billing record", {
            userId,
            subId,
            priceId: sub.items.data[0]?.price?.id,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          sub.metadata?.userId ?? (await getUserIdForSubscription(sub.id));
        if (!userId) break;
        const priceId = sub.items.data[0]?.price?.id;
        const metadataPlan = sub.metadata?.plan;
        const plan =
          (metadataPlan === "weekly" || metadataPlan === "monthly"
            ? metadataPlan
            : undefined) ?? (priceId ? planFromPriceId(priceId) : undefined);
        const record = recordFromStripeSubscription(sub, plan ?? undefined);
        if (record) await saveBillingRecord(userId, record);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  return res.status(200).json({ received: true });
}
