import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkGate, readUserId, setCors } from "../../lib/cors.js";
import { getBillingRecord } from "../../lib/billing-store.js";
import { getStripe, getSiteUrl } from "../../lib/stripe-client.js";

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

  const record = await getBillingRecord(userId);
  if (!record?.stripeCustomerId) {
    return res.status(404).json({ error: "No subscription found for this account" });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured" });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: record.stripeCustomerId,
      return_url: getSiteUrl(),
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Could not open billing portal" });
  }
}
