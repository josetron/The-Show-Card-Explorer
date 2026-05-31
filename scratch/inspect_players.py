import json
import os

def inspect():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    json_path = os.path.join(base_dir, "data", "players.json")
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    print(f"Total players in JSON: {len(data)}")
    
    # Print the first hitter
    hitter = next((p for p in data if p.get("is_hitter")), None)
    if hitter:
        print("\nSample Hitter Card structure:")
        for k, v in list(hitter.items())[:20]:
            print(f"  {k}: {v} ({type(v).__name__})")
        print(f"  speed: {hitter.get('speed')} ({type(hitter.get('speed')).__name__})")
            
    # Print the first pitcher
    pitcher = next((p for p in data if not p.get("is_hitter")), None)
    if pitcher:
        print("\nSample Pitcher Card structure:")
        for k, v in list(pitcher.items())[:20]:
            print(f"  {k}: {v} ({type(v).__name__})")
        print(f"  pitch_velocity: {pitcher.get('pitch_velocity')} ({type(pitcher.get('pitch_velocity')).__name__})")
        print(f"  speed: {pitcher.get('speed')} ({type(pitcher.get('speed')).__name__})")
            
    # Count speed stats
    hitters_99_speed = [p for p in data if p.get("is_hitter") and p.get("speed") is not None and int(p.get("speed")) >= 99]
    hitters_90plus_speed = [p for p in data if p.get("is_hitter") and p.get("speed") is not None and int(p.get("speed")) >= 90]
    
    print(f"\nHitters with speed >= 99: {len(hitters_99_speed)}")
    if hitters_99_speed:
        print("Sample 99+ speed hitters:")
        for h in hitters_99_speed[:5]:
            print(f"  - {h['name']} (OVR {h['ovr']}, Speed {h['speed']})")
            
    print(f"Hitters with speed >= 90: {len(hitters_90plus_speed)}")

if __name__ == "__main__":
    inspect()
