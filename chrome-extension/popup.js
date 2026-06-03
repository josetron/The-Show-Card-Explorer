let currentInventory = null;

const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const scanBtn = document.getElementById('scan-btn');
const scanAllBtn = document.getElementById('scan-all-btn');
const jsonBtn = document.getElementById('json-btn');
const csvBtn = document.getElementById('csv-btn');
const copyBtn = document.getElementById('copy-btn');

function setStatus(text) {
  statusEl.textContent = text;
}

function setInventory(inventory) {
  currentInventory = inventory;
  countEl.textContent = `${inventory.count.toLocaleString()} cards`;

  const hasCards = inventory.count > 0;
  jsonBtn.disabled = !hasCards;
  csvBtn.disabled = !hasCards;
  copyBtn.disabled = !hasCards;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function scanPage() {
  setStatus('Scanning current page...');
  setInventory({ count: 0, cards: [] });

  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus('No active tab found.');
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_INVENTORY' });
    if (!response?.ok) {
      throw new Error(response?.error || 'Scan failed.');
    }

    setInventory(response.inventory);
    setStatus(response.inventory.count > 0
      ? `Scanned ${new URL(response.inventory.sourceUrl).hostname}.`
      : 'No card UUIDs found on this page.');
  } catch (error) {
    setStatus('Open an MLB The Show page, refresh it, then scan again.');
    console.error(error);
  }
}

async function scanAllPages() {
  setStatus('Scanning all inventory pages. Keep this popup open...');
  setInventory({ count: 0, cards: [] });

  scanBtn.disabled = true;
  scanAllBtn.disabled = true;

  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus('No active tab found.');
    scanBtn.disabled = false;
    scanAllBtn.disabled = false;
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_ALL_INVENTORY' });
    if (!response?.ok) {
      throw new Error(response?.error || 'All-pages scan failed.');
    }

    setInventory(response.inventory);
    setStatus(response.inventory.count > 0
      ? `Scanned ${response.inventory.pagesScanned || '?'} pages from ${new URL(response.inventory.sourceUrl).hostname}.`
      : 'No card UUIDs found across inventory pages.');
  } catch (error) {
    setStatus('All-pages scan failed. Refresh the inventory page and try again.');
    console.error(error);
  } finally {
    scanBtn.disabled = false;
    scanAllBtn.disabled = false;
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url,
    filename,
    saveAs: true
  }, () => {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadJson() {
  if (!currentInventory) return;
  downloadFile(
    `mlb-the-show-inventory-${Date.now()}.json`,
    JSON.stringify(currentInventory, null, 2),
    'application/json'
  );
}

function downloadCsv() {
  if (!currentInventory) return;
  const rows = [
    ['uuid', 'quantity', 'nearbyText'],
    ...currentInventory.cards.map(card => [card.uuid, card.quantity, card.nearbyText])
  ];
  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n');
  downloadFile(`mlb-the-show-inventory-${Date.now()}.csv`, csv, 'text/csv');
}

async function copyUuids() {
  if (!currentInventory) return;
  const text = currentInventory.cards.map(card => card.uuid).join('\n');
  await navigator.clipboard.writeText(text);
  setStatus(`Copied ${currentInventory.count.toLocaleString()} UUIDs.`);
}

scanBtn.addEventListener('click', scanPage);
scanAllBtn.addEventListener('click', scanAllPages);
jsonBtn.addEventListener('click', downloadJson);
csvBtn.addEventListener('click', downloadCsv);
copyBtn.addEventListener('click', copyUuids);

scanPage();
