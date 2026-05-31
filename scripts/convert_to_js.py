import json
import os

def convert():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    json_path = os.path.join(base_dir, "data", "players.json")
    js_path = os.path.join(base_dir, "data", "players.js")
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} does not exist.")
        return
        
    print(f"Reading {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    print(f"Writing {js_path}...")
    # Wrap it as a global variable
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("window.MLB_PLAYERS_DATA = ")
        # Write minified JSON directly to save space and load faster
        json.dump(data, f, separators=(',', ':'))
        f.write(";")
        
    print("Done! Minified players database saved as Javascript file.")
    print(f"Size of JS database: {os.path.getsize(js_path) / 1024:.2f} KB")

if __name__ == "__main__":
    convert()
