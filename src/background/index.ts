/// <reference types="chrome" />
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explain-text",
    title: "Explain with AI",
    contexts: ["selection"]
  });
});

async function sendExplainMessage(tabId: number, text: string) {
  return chrome.tabs.sendMessage(tabId, { type: "EXPLAIN_TEXT", text });
}

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
  if (info.menuItemId !== "explain-text" || !info.selectionText || tab?.id == null) return;

  const tabId = tab.id;
  const text = info.selectionText;

  void sendExplainMessage(tabId, text).catch(() =>
    new Promise((r) => setTimeout(r, 400))
      .then(() => sendExplainMessage(tabId, text))
      .catch(() => {})
  );
});
