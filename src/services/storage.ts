/// <reference types="chrome" />
import type { AccountSnapshot } from "./billing-types";
import { FREE_DAILY_LIMIT } from "./billing-types";

const USER_ID_KEY = "userId";
const ACCOUNT_KEY = "cachedAccount";

const DEFAULT_ACCOUNT: AccountSnapshot = {
  tier: "free",
  plan: null,
  dailyUses: 0,
  dailyLimit: FREE_DAILY_LIMIT,
  subscriptionActive: false,
  currentPeriodEnd: null,
};

function createUserId(): string {
  return crypto.randomUUID();
}

export async function getOrCreateUserId(): Promise<string> {
  const data = await chrome.storage.local.get([USER_ID_KEY]);
  const existing = data[USER_ID_KEY];
  if (typeof existing === "string" && existing.length > 0) {
    return existing;
  }
  const userId = createUserId();
  await chrome.storage.local.set({ [USER_ID_KEY]: userId });
  return userId;
}

export async function getCachedAccount(): Promise<AccountSnapshot> {
  const data = await chrome.storage.local.get([ACCOUNT_KEY]);
  const raw = data[ACCOUNT_KEY] as AccountSnapshot | undefined;
  if (!raw) return { ...DEFAULT_ACCOUNT };
  return {
    tier: raw.tier === "pro" ? "pro" : "free",
    plan: raw.plan === "weekly" || raw.plan === "monthly" ? raw.plan : null,
    dailyUses: typeof raw.dailyUses === "number" ? raw.dailyUses : 0,
    dailyLimit: typeof raw.dailyLimit === "number" ? raw.dailyLimit : FREE_DAILY_LIMIT,
    subscriptionActive: Boolean(raw.subscriptionActive),
    currentPeriodEnd:
      typeof raw.currentPeriodEnd === "number" ? raw.currentPeriodEnd : null,
  };
}

export async function saveCachedAccount(account: AccountSnapshot): Promise<void> {
  await chrome.storage.local.set({ [ACCOUNT_KEY]: account });
}

/** @deprecated use getCachedAccount + refreshAccount from billing.ts */
export async function getUserState(): Promise<{
  dailyUses: number;
  lastUsedDate: string;
  isPro: boolean;
}> {
  const account = await getCachedAccount();
  return {
    dailyUses: account.dailyUses,
    lastUsedDate: new Date().toDateString(),
    isPro: account.subscriptionActive && account.tier === "pro",
  };
}
