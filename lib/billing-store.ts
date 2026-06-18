import type Stripe from "stripe";
import { getRedis } from "./redis.js";
import type { BillingRecord, PlanId } from "./billing-types.js";
import { getStripe } from "./stripe-client.js";

function billingKey(userId: string) {
  return `billing:${userId}`;
}

function subMapKey(subscriptionId: string) {
  return `submap:${subscriptionId}`;
}

export async function getBillingRecord(userId: string): Promise<BillingRecord | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<string>(billingKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BillingRecord;
  } catch {
    return null;
  }
}

export async function saveBillingRecord(userId: string, record: BillingRecord): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(billingKey(userId), JSON.stringify(record));
  await redis.set(subMapKey(record.subscriptionId), userId);
}

export async function getUserIdForSubscription(subscriptionId: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<string>(subMapKey(subscriptionId));
}

export function isSubscriptionActive(record: BillingRecord | null): boolean {
  if (!record) return false;
  const okStatus = record.status === "active" || record.status === "trialing";
  if (!okStatus) return false;
  if (!record.currentPeriodEnd) return true;
  return record.currentPeriodEnd * 1000 > Date.now();
}

export async function refreshBillingRecordFromStripe(
  userId: string
): Promise<BillingRecord | null> {
  const existing = await getBillingRecord(userId);
  if (!existing?.subscriptionId) return existing;

  const stripe = getStripe();
  if (!stripe) return existing;

  try {
    const sub = await stripe.subscriptions.retrieve(existing.subscriptionId);
    const record = recordFromStripeSubscription(sub, existing.plan);
    if (record) {
      await saveBillingRecord(userId, record);
      return record;
    }
  } catch (e) {
    console.error("Failed to refresh subscription from Stripe:", e);
  }

  return existing;
}

export function planFromPriceId(priceId: string): PlanId | null {
  const weekly = process.env.STRIPE_WEEKLY_PRICE_ID?.trim();
  const monthly = process.env.STRIPE_MONTHLY_PRICE_ID?.trim();
  if (priceId === weekly) return "weekly";
  if (priceId === monthly) return "monthly";
  return null;
}

function subscriptionPeriodEnd(sub: Stripe.Subscription): number {
  const itemEnd = sub.items.data[0]?.current_period_end;
  if (typeof itemEnd === "number") return itemEnd;

  const legacyEnd = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  if (typeof legacyEnd === "number") return legacyEnd;

  return 0;
}

export function recordFromStripeSubscription(
  sub: Stripe.Subscription,
  fallbackPlan?: PlanId
): BillingRecord | null {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;

  const priceId = sub.items.data[0]?.price?.id;
  const metadataPlan = sub.metadata?.plan;
  const plan =
    (metadataPlan === "weekly" || metadataPlan === "monthly" ? metadataPlan : null) ||
    (priceId ? planFromPriceId(priceId) : null) ||
    fallbackPlan;
  if (!plan) return null;

  return {
    stripeCustomerId: customerId,
    subscriptionId: sub.id,
    status: sub.status,
    plan,
    currentPeriodEnd: subscriptionPeriodEnd(sub),
  };
}
