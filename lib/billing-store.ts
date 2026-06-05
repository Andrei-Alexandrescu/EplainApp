import type Stripe from "stripe";
import { getRedis } from "./redis.js";
import type { BillingRecord, PlanId } from "./billing-types.js";

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
  return okStatus && record.currentPeriodEnd * 1000 > Date.now();
}

export function planFromPriceId(priceId: string): PlanId | null {
  if (priceId === process.env.STRIPE_WEEKLY_PRICE_ID) return "weekly";
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) return "monthly";
  return null;
}

export function recordFromStripeSubscription(
  sub: Stripe.Subscription,
  fallbackPlan?: PlanId
): BillingRecord | null {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;

  const priceId = sub.items.data[0]?.price?.id;
  const plan = (priceId && planFromPriceId(priceId)) || fallbackPlan;
  if (!plan) return null;

  return {
    stripeCustomerId: customerId,
    subscriptionId: sub.id,
    status: sub.status,
    plan,
    currentPeriodEnd: sub.current_period_end,
  };
}
