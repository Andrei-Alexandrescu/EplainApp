/// <reference types="chrome" />
/**
 * Runs before the heavy content bundle finishes loading. CRXJS uses an async loader
 * for the main chunk, so onMessage must live here or messages are dropped.
 */
const pending: string[] = [];
let mount: ((text: string) => void) | undefined;

chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
  const msg = request as { type?: string; text?: string };
  if (msg?.type === 'EXPLAIN_TEXT' && typeof msg.text === 'string') {
    if (mount) {
      mount(msg.text);
    } else {
      pending.push(msg.text);
    }
    sendResponse({ status: 'received' });
  }
});

(globalThis as unknown as { __textexplainerRegisterMount?: (fn: (text: string) => void) => void }).__textexplainerRegisterMount = (
  fn: (text: string) => void
) => {
  mount = fn;
  while (pending.length > 0) {
    const t = pending.shift();
    if (t !== undefined) fn(t);
  }
};
