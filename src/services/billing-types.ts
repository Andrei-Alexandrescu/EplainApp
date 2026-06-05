export type PlanId = "weekly" | "monthly";

export type AccountSnapshot = {
  tier: "free" | "pro";
  plan: PlanId | null;
  dailyUses: number;
  dailyLimit: number;
  subscriptionActive: boolean;
  currentPeriodEnd: number | null;
};

export const FREE_DAILY_LIMIT = 10;

export function isPro(snapshot: AccountSnapshot): boolean {
  return snapshot.subscriptionActive && snapshot.tier === "pro";
}

export function usesLeft(snapshot: AccountSnapshot): number {
  if (isPro(snapshot)) return Infinity;
  return Math.max(0, snapshot.dailyLimit - snapshot.dailyUses);
}
