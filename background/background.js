// Update badge count
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateBadge') {
    const count = message.count;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF4500' });
  }
});

// Set initial badge on install/startup
chrome.runtime.onInstalled.addListener(async () => {
  const { threadQueue = [] } = await chrome.storage.local.get('threadQueue');
  const count = threadQueue.length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#FF4500' });
});
