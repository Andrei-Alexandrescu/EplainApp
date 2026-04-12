/// <reference types="chrome" />
export interface UserState {
  dailyUses: number;
  lastUsedDate: string;
  isPro: boolean;
}

const DEFAULT_STATE: UserState = {
  dailyUses: 0,
  lastUsedDate: new Date().toDateString(),
  isPro: false,
};

function pickUserState(raw: unknown): UserState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const r = raw as Record<string, unknown>;
  return {
    dailyUses: typeof r.dailyUses === "number" ? r.dailyUses : DEFAULT_STATE.dailyUses,
    lastUsedDate: typeof r.lastUsedDate === "string" ? r.lastUsedDate : DEFAULT_STATE.lastUsedDate,
    isPro: typeof r.isPro === "boolean" ? r.isPro : DEFAULT_STATE.isPro,
  };
}

export async function getUserState(): Promise<UserState> {
  const data = await chrome.storage.local.get(["userState"]);
  const raw = data.userState;
  const state = pickUserState(raw);

  if (raw && typeof raw === "object" && "mode" in raw) {
    await saveUserState(state);
  }

  const today = new Date().toDateString();
  if (state.lastUsedDate !== today) {
    state.dailyUses = 0;
    state.lastUsedDate = today;
    await saveUserState(state);
  }

  return state;
}

export async function saveUserState(state: UserState): Promise<void> {
  await chrome.storage.local.set({ userState: state });
}

export async function incrementUsage(): Promise<boolean> {
  const state = await getUserState();
  if (state.isPro || state.dailyUses < 10) {
    state.dailyUses += 1;
    await saveUserState(state);
    return true;
  }
  return false;
}
