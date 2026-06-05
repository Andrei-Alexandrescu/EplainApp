import { useCallback, useEffect, useState } from 'react';
import type { AccountSnapshot, PlanId } from './services/billing-types';
import { usesLeft, isPro } from './services/billing-types';
import { refreshAccount, openCheckout, openBillingPortal } from './services/billing';

function UsageRing({ account }: { account: AccountSnapshot }) {
  const max = account.dailyLimit;
  const remaining = usesLeft(account);
  const pct = isPro(account) ? 100 : Math.min(100, (remaining / max) * 100);
  const stroke = isPro(account) ? '#a78bfa' : remaining <= 3 ? '#f472b6' : '#34d399';

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden>
        <path
          className="text-zinc-200"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeDasharray={`${pct}, 100`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-center text-[11px] font-semibold tabular-nums text-zinc-700">
        {isPro(account) ? '∞' : Math.max(0, remaining)}
      </span>
    </div>
  );
}

function planLabel(plan: PlanId | null): string {
  if (plan === 'weekly') return 'Weekly Pro';
  if (plan === 'monthly') return 'Monthly Pro';
  return 'Pro';
}

export default function App() {
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<PlanId | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await refreshAccount();
      setAccount(snapshot);
    } catch {
      setError('Could not load account status. Check your API URL and connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCheckout = async (plan: PlanId) => {
    setBusy(plan);
    setError(null);
    try {
      await openCheckout(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setBusy(null);
    }
  };

  const handlePortal = async () => {
    setBusy('portal');
    setError(null);
    try {
      await openBillingPortal();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open billing portal');
    } finally {
      setBusy(null);
    }
  };

  if (loading || !account) {
    return (
      <div className="flex h-52 w-[340px] flex-col items-center justify-center gap-3 bg-zinc-50 font-sans">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        <p className="text-sm font-medium text-zinc-500">{loading ? 'Loading…' : 'Unable to load'}</p>
      </div>
    );
  }

  const max = account.dailyLimit;
  const left = usesLeft(account);
  const low = !isPro(account) && left <= 3;

  return (
    <div className="w-[340px] overflow-hidden bg-zinc-50 font-sans text-zinc-900">
      <header className="relative px-5 pb-7 pt-6 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-violet-950" aria-hidden />
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl" aria-hidden />

        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">
            TextExplainer
            <span className="ml-2 align-middle text-sm font-semibold text-violet-300/90">AI</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Select text → right-click → <span className="text-zinc-200">Explain with AI</span>
          </p>
        </div>
      </header>

      <div className="relative -mt-4 space-y-4 px-4 pb-5">
        {error && (
          <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-pop ring-1 ring-zinc-200/80">
          <div className="flex items-center gap-4">
            <UsageRing account={account} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Daily explanations</p>
              <p className="mt-1 text-lg font-bold tracking-tight text-zinc-900">
                {isPro(account) ? `Unlimited · ${planLabel(account.plan)}` : `${left} left today`}
              </p>
              {!isPro(account) && (
                <p className={`mt-1 text-xs ${low ? 'font-medium text-rose-600' : 'text-zinc-500'}`}>
                  {low ? 'Running low — upgrade for unlimited.' : `${account.dailyUses} of ${max} used today`}
                </p>
              )}
            </div>
          </div>
          {!isPro(account) && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  low ? 'bg-gradient-to-r from-rose-400 to-amber-400' : 'bg-gradient-to-r from-emerald-400 to-violet-500'
                }`}
                style={{ width: `${Math.min(100, (account.dailyUses / max) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {isPro(account) ? (
          <button
            type="button"
            onClick={() => void handlePortal()}
            disabled={busy === 'portal'}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-60"
          >
            {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void handleCheckout('weekly')}
              disabled={busy !== null}
              className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60"
            >
              {busy === 'weekly' ? 'Opening checkout…' : 'Weekly Pro — $1/week'}
            </button>
            <button
              type="button"
              onClick={() => void handleCheckout('monthly')}
              disabled={busy !== null}
              className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 disabled:opacity-60"
            >
              {busy === 'monthly' ? 'Opening checkout…' : 'Monthly Pro — $3/month'}
            </button>
            <p className="text-center text-[11px] text-zinc-500">Free plan: 10 explanations per day</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void load()}
          className="w-full text-center text-xs font-medium text-violet-600 hover:text-violet-800"
        >
          Refresh status
        </button>
      </div>
    </div>
  );
}
