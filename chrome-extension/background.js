const DEFAULT_INVENTORY_URL = 'https://mlb26.theshow.com/inventory?page=1&captains=&display_position=&event=&has_augment=&max_rank=&min_rank=&name=&ownership=owned&rarity_id=&series_id=&stars=&team_id=&type=mlb_card';

function waitForTabComplete(tabId) {
  return new Promise(resolve => {
    chrome.tabs.get(tabId, tab => {
      if (tab?.status === 'complete') {
        resolve();
        return;
      }

      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

async function getInventoryTab(sourceUrl) {
  const inventoryUrl = sourceUrl && sourceUrl.includes('/inventory')
    ? sourceUrl
    : DEFAULT_INVENTORY_URL;

  const existingTabs = await chrome.tabs.query({ url: 'https://mlb26.theshow.com/inventory*' });
  if (existingTabs.length > 0) {
    const tab = existingTabs[0];
    await chrome.tabs.update(tab.id, { url: inventoryUrl, active: false });
    await waitForTabComplete(tab.id);
    return tab.id;
  }

  const tab = await chrome.tabs.create({ url: inventoryUrl, active: false });
  await waitForTabComplete(tab.id);
  return tab.id;
}

async function scanAllInventoryPages(sourceUrl) {
  const tabId = await getInventoryTab(sourceUrl);

  // Give the content script a moment to attach after navigation.
  await new Promise(resolve => setTimeout(resolve, 750));

  const response = await chrome.tabs.sendMessage(tabId, { type: 'SCAN_ALL_INVENTORY' });
  if (!response?.ok) {
    throw new Error(response?.error || 'Inventory scan failed.');
  }

  return response.inventory;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'START_INVENTORY_SYNC') {
    scanAllInventoryPages(message.sourceUrl)
      .then(inventory => sendResponse({ ok: true, inventory }))
      .catch(error => sendResponse({ ok: false, error: error?.message || String(error) }));

    return true;
  }

  return false;
});
