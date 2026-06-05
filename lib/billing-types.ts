export type PlanId = "weekly" | "monthly";

export type BillingRecord = {
  stripeCustomerId: string;
  subscriptionId: string;
  status: string;
  plan: PlanId;
  currentPeriodEnd: number;
};

export type UsageSnapshot = {
  tier: "free" | "pro";
  plan: PlanId | null;
  dailyUses: number;
  dailyLimit: number;
  subscriptionActive: boolean;
  currentPeriodEnd: number | null;
};

export const FREE_DAILY_LIMIT = 10;
