import { getRedis, billingDisabled } from "./redis.js";
import { FREE_DAILY_LIMIT, type UsageSnapshot } from "./billing-types.js";
import {
  getBillingRecord,
  isSubscriptionActive,
  refreshBillingRecordFromStripe,
} from "./billing-store.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function usageKey(userId: string) {
  return `usage:${userId}:${todayKey()}`;
}

export async function getDailyUsage(userId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const count = await redis.get<number>(usageKey(userId));
  return typeof count === "number" ? count : 0;
}

export async function incrementDailyUsage(userId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const key = usageKey(userId);
  const next = await redis.incr(key);
  if (next === 1) {
    await redis.expire(key, 60 * 60 * 48);
  }
  return next;
}

export type QuotaResult =
  | { allowed: true; tier: "free" | "pro" }
  | { allowed: false; error: string; code: "LIMIT_REACHED" | "BILLING_UNAVAILABLE" };

export async function checkAndConsumeQuota(userId: string): Promise<QuotaResult> {
  if (billingDisabled()) {
    return { allowed: true, tier: "pro" };
  }

  const redis = getRedis();
  if (!redis) {
    return {
      allowed: false,
      error: "Billing storage is not configured on the server.",
      code: "BILLING_UNAVAILABLE",
    };
  }

  const record = await getBillingRecord(userId);
  const refreshed = record?.subscriptionId
    ? (await refreshBillingRecordFromStripe(userId)) ?? record
    : record;
  if (isSubscriptionActive(refreshed)) {
    await incrementDailyUsage(userId);
    return { allowed: true, tier: "pro" };
  }

  const used = await getDailyUsage(userId);
  if (used >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      error: "Daily free limit reached (10/day). Upgrade for unlimited explanations.",
      code: "LIMIT_REACHED",
    };
  }

  await incrementDailyUsage(userId);
  return { allowed: true, tier: "free" };
}

export async function getUsageAfterExplain(userId: string) {
  return buildUsageSnapshot(userId);
}

export async function buildUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  let record = await getBillingRecord(userId);
  if (record?.subscriptionId) {
    record = (await refreshBillingRecordFromStripe(userId)) ?? record;
  }
  const active = isSubscriptionActive(record);
  const dailyUses = await getDailyUsage(userId);

  if (active && record) {
    return {
      tier: "pro",
      plan: record.plan,
      dailyUses,
      dailyLimit: FREE_DAILY_LIMIT,
      subscriptionActive: true,
      currentPeriodEnd: record.currentPeriodEnd,
    };
  }

  return {
    tier: "free",
    plan: null,
    dailyUses,
    dailyLimit: FREE_DAILY_LIMIT,
    subscriptionActive: false,
    currentPeriodEnd: record?.currentPeriodEnd ?? null,
  };
}
