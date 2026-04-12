import { useEffect, useState } from 'react';
import { getUserState } from './services/storage';
import type { UserState } from './services/storage';

function UsageRing({ used, max, isPro }: { used: number; max: number; isPro: boolean }) {
  const remaining = max - used;
  const pct = isPro ? 100 : Math.min(100, (remaining / max) * 100);
  const stroke = isPro ? '#a78bfa' : remaining <= 3 ? '#f472b6' : '#34d399';

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
        {isPro ? '∞' : Math.max(0, remaining)}
      </span>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<UserState | null>(null);

  useEffect(() => {
    getUserState().then(setState);
  }, []);

  if (!state) {
    return (
      <div className="flex h-52 w-[340px] flex-col items-center justify-center gap-3 bg-zinc-50 font-sans">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        <p className="text-sm font-medium text-zinc-500">Loading…</p>
      </div>
    );
  }

  const max = 10;
  const usesLeft = max - state.dailyUses;
  const low = !state.isPro && usesLeft <= 3;

  return (
    <div className="w-[340px] overflow-hidden bg-zinc-50 font-sans text-zinc-900">
      <header className="relative px-5 pb-7 pt-6 text-white">
        <div
          className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-violet-950"
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden />

        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">Extension</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            TextExplainer
            <span className="ml-2 align-middle text-sm font-semibold text-violet-300/90">AI</span>
          </h1>
          <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-zinc-400">
            Select text on any page, right-click, and choose <span className="text-zinc-200">Explain with AI</span>.
          </p>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
            <span className="mt-0.5 text-violet-400">✦</span>
            <span>Three levels — Beginner, Amateur, Pro — in one panel. Switch tabs after the response loads.</span>
          </p>
        </div>
      </header>

      <div className="relative -mt-4 space-y-4 px-4 pb-5">
        <div className="rounded-2xl bg-white p-4 shadow-pop ring-1 ring-zinc-200/80">
          <div className="flex items-center gap-4">
            <UsageRing used={state.dailyUses} max={max} isPro={state.isPro} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Daily explanations</p>
              <p className="mt-1 text-lg font-bold tracking-tight text-zinc-900">
                {state.isPro ? 'Unlimited' : `${usesLeft} left today`}
              </p>
              {!state.isPro && (
                <p className={`mt-1 text-xs ${low ? 'font-medium text-rose-600' : 'text-zinc-500'}`}>
                  {low ? 'Running low — upgrade or try again tomorrow.' : `${state.dailyUses} of ${max} used`}
                </p>
              )}
            </div>
          </div>
          {!state.isPro && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  low ? 'bg-gradient-to-r from-rose-400 to-amber-400' : 'bg-gradient-to-r from-emerald-400 to-violet-500'
                }`}
                style={{ width: `${Math.min(100, (state.dailyUses / max) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {!state.isPro && (
          <button
            type="button"
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-500/35 active:scale-[0.99]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-base opacity-90" aria-hidden>
                ✦
              </span>
              Upgrade to Pro — $2.99/mo
            </span>
            <span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-full"
              aria-hidden
            />
          </button>
        )}
      </div>
    </div>
  );
}
