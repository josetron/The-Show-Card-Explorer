import urllib.request
import json
import ssl
import time
import os
import concurrent.futures

def clean_item(item):
    """Keep only fields we need for filtering/searching/displaying to reduce file size."""
    fields = [
        "uuid", "name", "img", "baked_img", "baked_img_lg", "rarity", "team", "team_short_name",
        "ovr", "series", "display_position", "display_secondary_positions", "jersey_number",
        "age", "bat_hand", "throw_hand", "weight", "height", "born", "is_hitter",
        # Hitter stats
        "contact_left", "contact_right", "power_left", "power_right",
        "plate_vision", "plate_discipline", "batting_clutch", "bunting_ability",
        "drag_bunting_ability", "hitting_durability", "fielding_durability",
        "fielding_ability", "arm_strength", "arm_accuracy", "blocking", "speed",
        "baserunning_ability", "baserunning_aggression", "base_stealing",
        "reaction_left", "reaction_right", "reaction_forward", "reaction_back",
        # Pitcher stats
        "stamina", "pitching_clutch", "bb_per_bf", "hr_per_bf", "pitch_velocity",
        "pitch_control", "pitch_movement", "hits_per_bf_left", "hits_per_bf_right",
        "k_per_bf_left", "k_per_bf_right", "pitches", "quirks"
    ]
    return {k: item[k] for k in fields if k in item}

def fetch_page(page, ctx):
    url = f"https://mlb26.theshow.com/apis/items.json?page={page}&type=mlb_card"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                items = data.get("items", [])
                total_pages = data.get("total_pages", 0)
                cleaned = [clean_item(x) for x in items]
                return page, total_pages, cleaned
        except Exception as e:
            print(f"Error page {page} attempt {attempt+1}: {e}")
            time.sleep(1)
    return page, 0, []

def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # First, fetch page 1 to get total pages
    print("Fetching page 1...")
    page, total_pages, items = fetch_page(1, ctx)
    if total_pages == 0:
        print("Failed to fetch page 1. Exiting.")
        return
    
    print(f"Total pages: {total_pages}. Fetching remaining pages...")
    
    all_items = list(items)
    
    # We can fetch concurrently using ThreadPoolExecutor
    pages_to_fetch = list(range(2, total_pages + 1))
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        # Submit all pages
        future_to_page = {executor.submit(fetch_page, p, ctx): p for p in pages_to_fetch}
        
        for future in concurrent.futures.as_completed(future_to_page):
            p = future_to_page[future]
            try:
                page_num, _, page_items = future.result()
                if page_items:
                    all_items.extend(page_items)
                    print(f"Fetched page {page_num}/{total_pages} (found {len(page_items)} cards)")
                else:
                    print(f"Page {page_num} failed or returned no items.")
            except Exception as e:
                print(f"Exception for page {p}: {e}")
            # Add a minor delay to avoid aggressive rate limits
            time.sleep(0.05)
            
    # Sort items by overall (ovr) descending for easy default sorting in client
    all_items.sort(key=lambda x: x.get("ovr", 0), reverse=True)
    
    # Create data directory if not exists
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    
    # Save as JSON
    json_path = os.path.join(data_dir, "players.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_items, f, indent=2)
    print(f"Successfully saved {len(all_items)} players to {json_path} ({os.path.getsize(json_path) / 1024:.2f} KB)")
        
    # Save as JS (CORS-friendly global variable)
    js_path = os.path.join(data_dir, "players.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("window.MLB_PLAYERS_DATA = ")
        json.dump(all_items, f, separators=(',', ':'))
        f.write(";")
    print(f"Successfully saved {len(all_items)} players to {js_path} ({os.path.getsize(js_path) / 1024:.2f} KB)")

if __name__ == "__main__":
    main()
