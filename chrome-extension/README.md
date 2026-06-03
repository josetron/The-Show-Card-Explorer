# MLB The Show Inventory Exporter

This Chrome extension scans the MLB The Show inventory pages you are logged into and exports card UUIDs as JSON or CSV.

## Install

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select this folder:
   `S:\My Drive\Web Dev\MLB the show 2026\chrome-extension`
6. Open the extension details and turn on **Allow access to file URLs**.

## Use

1. Log into the official MLB The Show website.
2. Open the page that shows your inventory/cards.
3. Click the extension icon.
4. Click **Scan All Pages** to walk through every inventory page with the current filters.
5. Download JSON or CSV.

Use **Scan Page** only when you intentionally want the current page.

## Sync From The Local App

After installing version `0.3.0`:

1. Open the local Card Explorer app.
2. Click **Sync Inventory** in the Inventory filter.
3. The extension opens/uses your MLB The Show inventory page, scans all pages, and sends the inventory back to the app.
4. The app saves the synced inventory in browser storage and updates the Owned filters immediately.

## Export Shape

JSON exports look like this:

```json
{
  "exportedAt": "2026-06-03T00:00:00.000Z",
  "sourceUrl": "https://mlb26.theshow.com/...",
  "sourceTitle": "MLB The Show",
  "count": 1,
  "cards": [
    {
      "uuid": "94b6a480b136b70cafd0100c5faf60cb",
      "quantity": 1,
      "nearbyText": "Nearby card text from the page"
    }
  ]
}
```

## Notes

- This extension does not ask for your password.
- It uses your existing logged-in browser session to fetch inventory pages.
- It keeps the filters from the current inventory URL, such as `ownership=owned` and `type=mlb_card`.
- If the official site changes its inventory page markup, the scanner may need adjustment.
