/// <reference types="chrome" />
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explain-text",
    title: "Explain with AI",
    contexts: ["selection"]
  });
});

type ExplainPayload = { type: "EXPLAIN_TEXT"; text: string };

function messageOptionsForFrame(frameId?: number): { frameId: number } | undefined {
  // Main frame uses frameId 0 in some APIs, but `tabs.sendMessage` targets the main frame when
  // `frameId` is omitted. Passing `{ frameId: 0 }` can prevent delivery.
  if (frameId == null || frameId === 0) return undefined;
  return { frameId };
}

async function sendExplainMessage(tabId: number, payload: ExplainPayload, frameId?: number) {
  const opts = messageOptionsForFrame(frameId);
  try {
    return await chrome.tabs.sendMessage(tabId, payload, opts);
  } catch {
    if (opts) {
      return await chrome.tabs.sendMessage(tabId, payload, undefined);
    }
    throw new Error("sendMessage failed");
  }
}

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
  if (info.menuItemId !== "explain-text" || tab?.id == null) return;

  const tabId = tab.id;
  const frameId = info.frameId;
  const text = info.selectionText ?? "";
  const payload: ExplainPayload = { type: "EXPLAIN_TEXT", text };

  void sendExplainMessage(tabId, payload, frameId).catch(() =>
    new Promise((r) => setTimeout(r, 400))
      .then(() => sendExplainMessage(tabId, payload, frameId))
      .catch(() => {})
  );
});
