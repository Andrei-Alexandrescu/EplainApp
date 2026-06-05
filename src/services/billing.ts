import type { AccountSnapshot, PlanId } from "./billing-types";
import { FREE_DAILY_LIMIT, isPro } from "./billing-types";
import { buildApiHeaders, getApiBase } from "./api";
import { getOrCreateUserId, saveCachedAccount } from "./storage";

export async function refreshAccount(): Promise<AccountSnapshot> {
  const base = getApiBase();
  if (!base) {
    const fallback: AccountSnapshot = {
      tier: "free",
      plan: null,
      dailyUses: 0,
      dailyLimit: FREE_DAILY_LIMIT,
      subscriptionActive: false,
      currentPeriodEnd: null,
    };
    await saveCachedAccount(fallback);
    return fallback;
  }

  const headers = await buildApiHeaders();
  const res = await fetch(`${base}/api/billing/status`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Could not load account status (${res.status})`);
  }

  const data = (await res.json()) as AccountSnapshot;
  await saveCachedAccount(data);
  return data;
}

export async function startCheckout(plan: PlanId): Promise<string> {
  const base = getApiBase();
  if (!base) throw new Error("API URL is not configured");

  const headers = await buildApiHeaders();
  const res = await fetch(`${base}/api/billing/checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan }),
  });

  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Checkout failed");
  }
  return data.url;
}

export async function openCheckout(plan: PlanId): Promise<void> {
  const url = await startCheckout(plan);
  await chrome.tabs.create({ url });
}

export async function openBillingPortal(): Promise<void> {
  const base = getApiBase();
  if (!base) throw new Error("API URL is not configured");

  const headers = await buildApiHeaders();
  const res = await fetch(`${base}/api/billing/portal`, {
    method: "POST",
    headers,
  });

  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Could not open billing portal");
  }
  await chrome.tabs.create({ url: data.url });
}

export { isPro };
