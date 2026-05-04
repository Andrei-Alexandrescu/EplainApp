/// <reference types="chrome" />
/**
 * Runs before the heavy content bundle finishes loading. CRXJS uses an async loader
 * for the main chunk, so onMessage must live here or messages are dropped.
 */
const pending: string[] = [];
let mount: ((text: string) => void) | undefined;

function resolveSelectedText(fromContextMenu: string): string {
  try {
    const dom = window.getSelection()?.toString() ?? "";
    const trimmedDom = dom.trim();
    // `chrome.contextMenus` selectionText can drop/mangle some Unicode math; prefer DOM when it has content.
    if (trimmedDom.length > 0) return dom;
    return fromContextMenu;
  } catch {
    return fromContextMenu;
  }
}

chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
  const msg = request as { type?: string; text?: string };
  if (msg?.type === 'EXPLAIN_TEXT' && typeof msg.text === 'string') {
    const text = resolveSelectedText(msg.text);
    if (mount) {
      mount(text);
    } else {
      pending.push(text);
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
