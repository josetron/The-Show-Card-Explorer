import json
import os

def inspect():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    json_path = os.path.join(base_dir, "data", "players.json")
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    teams = set()
    series = set()
    for p in data:
        if p.get("team"):
            teams.add(p["team"])
        if p.get("series"):
            series.add(p["series"])
            
    print("Unique Teams:")
    for t in sorted(teams):
        print(f"  - {t}")
        
    print("\nUnique Series:")
    for s in sorted(series):
        print(f"  - {s}")

if __name__ == "__main__":
    inspect()
