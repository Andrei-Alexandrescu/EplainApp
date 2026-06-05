import Stripe from "stripe";
import type { PlanId } from "./billing-types.js";

let stripe: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (stripe !== undefined) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    stripe = null;
    return stripe;
  }
  stripe = new Stripe(key);
  return stripe;
}

export function getPriceId(plan: PlanId): string | null {
  if (plan === "weekly") return process.env.STRIPE_WEEKLY_PRICE_ID ?? null;
  if (plan === "monthly") return process.env.STRIPE_MONTHLY_PRICE_ID ?? null;
  return null;
}

export function getSiteUrl(): string {
  const url = process.env.SITE_URL ?? process.env.VERCEL_URL;
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http")) return url.replace(/\/$/, "");
  return `https://${url.replace(/\/$/, "")}`;
}
