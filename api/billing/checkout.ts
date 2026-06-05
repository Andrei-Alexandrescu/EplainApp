import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { checkGate, parseJsonBody, readUserId, setCors } from "../../lib/cors.js";
import { getStripe, getPriceId, getSiteUrl } from "../../lib/stripe-client.js";
import type { PlanId } from "../../lib/billing-types.js";
import { getBillingRecord } from "../../lib/billing-store.js";

function isPlan(value: unknown): value is PlanId {
  return value === "weekly" || value === "monthly";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkGate(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = readUserId(req);
  if (!userId) {
    return res.status(400).json({ error: "Missing or invalid X-User-Id header" });
  }

  let body: Record<string, unknown>;
  try {
    body = parseJsonBody(req.body);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const plan = body.plan;
  if (!isPlan(plan)) {
    return res.status(400).json({ error: "plan must be weekly or monthly" });
  }

  const stripe = getStripe();
  const priceId = getPriceId(plan);
  if (!stripe || !priceId) {
    return res.status(503).json({ error: "Stripe is not configured on the server" });
  }

  const site = getSiteUrl();
  const existing = await getBillingRecord(userId);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${site}/billing/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/billing/cancel.html`,
      client_reference_id: userId,
      metadata: { userId, plan },
      ...(existing?.stripeCustomerId ? { customer: existing.stripeCustomerId } : {}),
      subscription_data: {
        metadata: { userId, plan },
      },
    });

    if (!session.url) {
      return res.status(500).json({ error: "Could not create checkout session" });
    }

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Stripe.errors.StripeError
        ? e.message
        : "Failed to create checkout session";
    return res.status(500).json({ error: message });
  }
}
