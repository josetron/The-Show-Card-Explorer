import urllib.request
import json
import ssl

def print_full_item():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    url = "https://mlb26.theshow.com/apis/items.json?page=1"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        items = data.get("items", [])
        if items:
            # Find a hitter and a pitcher to see both kinds of attributes
            hitter = None
            pitcher = None
            for item in items:
                if item.get("is_hitter") and not hitter:
                    hitter = item
                if not item.get("is_hitter") and not pitcher:
                    pitcher = item
                if hitter and pitcher:
                    break
            
            print("--- HITTER ---")
            print(json.dumps(hitter, indent=2))
            print("\n--- PITCHER ---")
            print(json.dumps(pitcher, indent=2))

if __name__ == "__main__":
    print_full_item()
