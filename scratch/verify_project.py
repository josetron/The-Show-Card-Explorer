import os

def verify():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    files_to_check = [
        "index.html",
        "index.css",
        "app.js",
        "data/players.js",
        "scripts/fetch_players.py"
    ]
    
    print("Checking files...")
    all_ok = True
    for f in files_to_check:
        path = os.path.join(base_dir, f)
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  [OK] {f} ({size / 1024:.2f} KB)")
        else:
            print(f"  [ERROR] {f} is missing!")
            all_ok = False
            
    if all_ok:
        print("\nProject structure verified successfully! Ready to be run.")
    else:
        print("\nProject structure verification failed. Some files are missing.")

if __name__ == "__main__":
    verify()
