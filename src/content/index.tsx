/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import tailwindCss from '../index.css?inline';
import { fetchExplanation, type ExplanationLevels } from '../services/ai';
import { incrementUsage } from '../services/storage';

type LevelId = keyof ExplanationLevels;

const LEVEL_TABS: { id: LevelId; label: string; hint: string }[] = [
  { id: 'beginner', label: 'Beginner', hint: 'Plain & simple' },
  { id: 'amateur', label: 'Amateur', hint: 'More depth' },
  { id: 'pro', label: 'Pro', hint: 'For experts' },
];

function renderFormattedParagraphs(text: string) {
  return text.split('\n').map((line, i) => (
    <p
      key={i}
      className="mb-3 last:mb-0 text-[15px] leading-[1.65] text-zinc-700"
      dangerouslySetInnerHTML={{
        __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>'),
      }}
    />
  ));
}

function FloatingPopup({ text, onClose }: { text: string; onClose: () => void }) {
  const [levels, setLevels] = useState<ExplanationLevels | null>(null);
  const [active, setActive] = useState<LevelId>('beginner');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const allowed = await incrementUsage();
      if (!allowed) {
        setError("You've reached your daily limit of 10 free explanations. Please upgrade to Pro in the extension settings.");
        return;
      }
      try {
        const result = await fetchExplanation(text);
        if (typeof result === 'string') {
          setError(result.replace(/\*\*/g, ''));
        } else {
          setLevels(result);
        }
      } catch {
        setError('Failed to fetch explanation. Please try again later.');
      }
    }
    load();
  }, [text]);

  return (
    <div className="fixed top-4 right-4 z-[9999] w-[432px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/95 font-sans shadow-float ring-1 ring-black/5 backdrop-blur-md">
      <div className="relative border-b border-zinc-100 bg-gradient-to-br from-zinc-50 via-white to-violet-50/40 px-5 py-4">
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-400/10 blur-2xl" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-violet-100/80 px-2 py-0.5 ring-1 ring-violet-200/60">
              <span className="h-1 w-1 rounded-full bg-violet-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-700">Explain</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">TextExplainer</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-lg leading-none text-zinc-400 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="max-h-[min(68vh,520px)] overflow-y-auto px-5 py-4">
        <section className="mb-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Selection</p>
          <blockquote className="rounded-xl border border-zinc-100 border-l-[3px] border-l-violet-400 bg-zinc-50/80 py-3 pl-4 pr-3 text-sm italic leading-relaxed text-zinc-600 ring-1 ring-inset ring-zinc-100/80">
            {text.length > 180 ? text.substring(0, 180) + '…' : text}
          </blockquote>
        </section>

        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Your levels</p>
          {error ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100/80">
              {error}
            </div>
          ) : levels ? (
            <>
              <div className="mb-3 flex gap-1.5 rounded-xl bg-zinc-100/90 p-1 ring-1 ring-zinc-200/60">
                {LEVEL_TABS.map(({ id, label, hint }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActive(id)}
                    className={`relative flex min-w-0 flex-1 flex-col items-center rounded-lg px-2 py-2.5 text-center transition-all ${
                      active === id
                        ? 'bg-white text-zinc-900 shadow-md shadow-zinc-200/50 ring-1 ring-zinc-200/80'
                        : 'text-zinc-500 hover:bg-white/60 hover:text-zinc-800'
                    }`}
                  >
                    <span className="text-xs font-semibold">{label}</span>
                    <span
                      className={`mt-0.5 text-[10px] font-medium leading-tight ${
                        active === id ? 'text-violet-600' : 'text-zinc-400'
                      }`}
                    >
                      {hint}
                    </span>
                  </button>
                ))}
              </div>
              <div
                className={`rounded-xl border border-zinc-100 bg-gradient-to-br p-5 ring-1 ring-inset ring-white/60 ${
                  active === 'beginner'
                    ? 'from-emerald-50/90 to-white'
                    : active === 'amateur'
                      ? 'from-amber-50/80 to-white'
                      : 'from-violet-50/90 to-white'
                }`}
              >
                <div className="min-h-[100px]">{renderFormattedParagraphs(levels[active])}</div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-zinc-100 bg-zinc-50/90 px-4 py-5 ring-1 ring-zinc-100/80">
              <div className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
              <div>
                <p className="text-sm font-medium text-zinc-800">Preparing three explanations…</p>
                <p className="mt-0.5 text-xs text-zinc-500">Beginner, Amateur, and Pro in one request</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function handleExplainText(text: string) {
  const attach = () => {
    let container = document.getElementById('textexplainer-root');
    if (container) {
      container.remove();
    }

    const parent = document.body ?? document.documentElement;
    container = document.createElement('div');
    container.id = 'textexplainer-root';
    parent.appendChild(container);

    const shadow = container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = tailwindCss;
    shadow.appendChild(style);

    const rootElement = document.createElement('div');
    shadow.appendChild(rootElement);

    const root = createRoot(rootElement);
    root.render(<FloatingPopup text={text} onClose={() => container?.remove()} />);
  };

  if (document.body) {
    attach();
  } else {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  }
}

const g = globalThis as unknown as { __textexplainerRegisterMount?: (fn: (text: string) => void) => void };
if (typeof g.__textexplainerRegisterMount === 'function') {
  g.__textexplainerRegisterMount((text: string) => handleExplainText(text));
}
