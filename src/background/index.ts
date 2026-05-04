/// <reference types="chrome" />
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explain-text",
    title: "Explain with AI",
    contexts: ["selection"]
  });
});

type ExplainPayload = { type: "EXPLAIN_TEXT"; text: string };

async function sendExplainMessage(tabId: number, payload: ExplainPayload, frameId?: number) {
  const options = frameId != null ? { frameId } : undefined;
  return chrome.tabs.sendMessage(tabId, payload, options);
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
