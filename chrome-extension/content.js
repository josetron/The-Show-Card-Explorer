const UUID_PATTERN = /\b[a-f0-9]{32}\b/gi;

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function findUuids(text) {
  if (!text) return [];
  return unique(String(text).match(UUID_PATTERN) || []).map(value => value.toLowerCase());
}

function getNearbyCardText(element, fallbackDocument = document) {
  const cardRoot = element?.closest?.(
    '[class*="card"], [class*="item"], [class*="inventory"], li, article, tr, .row'
  );
  const text = (cardRoot || element || fallbackDocument.body).textContent || '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 240);
}

function getRecordForUuid(uuid, sourceElement, sourceUrl, sourceDocument = document) {
  const nearbyText = getNearbyCardText(sourceElement, sourceDocument);
  const quantityMatch = nearbyText.match(/\b(?:x|qty|quantity)[:\s]*([0-9]{1,4})\b/i);

  return {
    uuid,
    quantity: quantityMatch ? Number(quantityMatch[1]) : 1,
    nearbyText,
    sourceUrl
  };
}

function scanAttributes(sourceDocument = document, sourceUrl = window.location.href) {
  const records = new Map();
  const elements = sourceDocument.querySelectorAll('a[href], img[src], source[src], [data-uuid], [data-id], [data-card-id]');

  elements.forEach(element => {
    const values = [
      element.getAttribute('href'),
      element.getAttribute('src'),
      element.getAttribute('data-uuid'),
      element.getAttribute('data-id'),
      element.getAttribute('data-card-id')
    ];

    values.flatMap(findUuids).forEach(uuid => {
      if (!records.has(uuid)) {
        records.set(uuid, getRecordForUuid(uuid, element, sourceUrl, sourceDocument));
      }
    });
  });

  return records;
}

function scanPageSource(existingRecords, sourceDocument = document, sourceUrl = window.location.href) {
  const html = sourceDocument.documentElement.outerHTML || '';
  findUuids(html).forEach(uuid => {
    if (!existingRecords.has(uuid)) {
      existingRecords.set(uuid, {
        uuid,
        quantity: 1,
        nearbyText: '',
        sourceUrl
      });
    }
  });
}

function scanDocument(sourceDocument = document, sourceUrl = window.location.href) {
  const records = scanAttributes(sourceDocument, sourceUrl);
  scanPageSource(records, sourceDocument, sourceUrl);
  return records;
}

function makeInventory(records, sourceUrl, scanMode, pagesScanned = 1) {
  const cards = Array.from(records.values()).sort((a, b) => a.uuid.localeCompare(b.uuid));

  return {
    exportedAt: new Date().toISOString(),
    sourceUrl,
    sourceTitle: document.title,
    scanMode,
    pagesScanned,
    count: cards.length,
    cards
  };
}

function scanInventory() {
  const records = scanDocument();

  return makeInventory(records, window.location.href, 'current-page', 1);
}

function getPageUrl(pageNumber) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', String(pageNumber));
  return url.toString();
}

function findMaxPage(sourceDocument = document) {
  const candidates = [];
  const pageText = sourceDocument.body?.textContent || '';
  const ofMatch = pageText.match(/\bpage\s+\d+\s+of\s+(\d+)\b/i) || pageText.match(/\bof\s+(\d+)\b/i);

  if (ofMatch) {
    candidates.push(Number(ofMatch[1]));
  }

  sourceDocument.querySelectorAll('a[href]').forEach(link => {
    try {
      const url = new URL(link.getAttribute('href'), window.location.href);
      const page = Number(url.searchParams.get('page'));
      if (Number.isInteger(page) && page > 0) {
        candidates.push(page);
      }
    } catch (_error) {
      // Ignore non-URL links.
    }
  });

  return Math.max(1, ...candidates.filter(Number.isFinite));
}

function mergeRecords(target, source) {
  source.forEach((record, uuid) => {
    if (!target.has(uuid)) {
      target.set(uuid, record);
      return;
    }

    const existing = target.get(uuid);
    existing.quantity = Math.max(existing.quantity || 1, record.quantity || 1);
    if (!existing.nearbyText && record.nearbyText) {
      existing.nearbyText = record.nearbyText;
    }
  });
}

async function fetchInventoryPage(pageNumber) {
  const sourceUrl = getPageUrl(pageNumber);
  const response = await fetch(sourceUrl, {
    credentials: 'include',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Page ${pageNumber} returned ${response.status}`);
  }

  const html = await response.text();
  const fetchedDocument = new DOMParser().parseFromString(html, 'text/html');
  return {
    sourceUrl,
    sourceDocument: fetchedDocument,
    records: scanDocument(fetchedDocument, sourceUrl)
  };
}

async function scanAllInventoryPages() {
  const records = scanDocument(document, window.location.href);
  let maxPage = findMaxPage(document);
  let pagesScanned = 1;

  if (maxPage === 1) {
    const firstPage = await fetchInventoryPage(1);
    mergeRecords(records, firstPage.records);
    maxPage = Math.max(maxPage, findMaxPage(firstPage.sourceDocument));
  }

  const hardLimit = Math.min(Math.max(maxPage, 1), 250);

  for (let pageNumber = 1; pageNumber <= hardLimit; pageNumber++) {
    const currentPage = Number(new URL(window.location.href).searchParams.get('page') || '1');
    if (pageNumber === currentPage) continue;

    const pageResult = await fetchInventoryPage(pageNumber);
    mergeRecords(records, pageResult.records);
    pagesScanned++;
  }

  return makeInventory(records, window.location.href, 'all-pages', pagesScanned);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SCAN_INVENTORY') {
    try {
      sendResponse({ ok: true, inventory: scanInventory() });
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || String(error) });
    }

    return true;
  }

  if (message?.type === 'SCAN_ALL_INVENTORY') {
    scanAllInventoryPages()
      .then(inventory => sendResponse({ ok: true, inventory }))
      .catch(error => sendResponse({ ok: false, error: error?.message || String(error) }));

    return true;
  }

  return false;
});

window.addEventListener('message', event => {
  if (event.source !== window) return;
  if (event.data?.type !== 'MLB_INVENTORY_SYNC_REQUEST') return;

  chrome.runtime.sendMessage({
    type: 'START_INVENTORY_SYNC',
    sourceUrl: event.data.sourceUrl
  }, response => {
    window.postMessage({
      type: 'MLB_INVENTORY_SYNC_RESULT',
      requestId: event.data.requestId,
      ok: response?.ok === true,
      inventory: response?.inventory,
      error: response?.error || chrome.runtime.lastError?.message || ''
    }, '*');
  });
});
