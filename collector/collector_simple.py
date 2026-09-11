"""
Simplified Traffic Collector — no HDFS/Spark required.
Fetches real TomTom traffic data and writes directly to /tmp/traffic_results.json
in the exact shape backend/main.py expects. Good for local dev/demo.

Run once:      python3 collector_simple.py
Run forever:   python3 collector_simple.py --loop
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

TOMTOM_API_KEY = os.environ["TOMTOM_API_KEY"]
OUTPUT_FILE = "/tmp/traffic_results.json"
POLL_INTERVAL = 60  # seconds, only used with --loop

CHECKPOINTS = [
    {"college": "PICT Pune",        "road": "Katraj-Dehu Road",     "lat": 18.4528, "lon": 73.8563},
    {"college": "COEP Pune",        "road": "FC Road Shivajinagar", "lat": 18.5308, "lon": 73.8474},
    {"college": "VIT Pune",         "road": "Kondhwa Road",         "lat": 18.4611, "lon": 73.8930},
    {"college": "MIT Pune",         "road": "Paud Road Kothrud",    "lat": 18.5074, "lon": 73.8077},
    {"college": "Pune University",  "road": "Ganeshkhind Road",     "lat": 18.5590, "lon": 73.8143},
    {"college": "PCCE Pimpri",      "road": "Nigdi-Akurdi Road",    "lat": 18.6508, "lon": 73.7896},
    {"college": "NIT Pune",         "road": "Narhe Road",           "lat": 18.4585, "lon": 73.8074},
    {"college": "Symbiosis Lavale", "road": "Lavale-Hinjewadi Rd",  "lat": 18.5575, "lon": 73.7295},
]

TOMTOM_URL = (
    "https://api.tomtom.com/traffic/services/4"
    "/flowSegmentData/absolute/10/json"
    "?key={key}&point={lat},{lon}&unit=KMPH"
)


def predict_attendance(congestion_pct, is_rush, level):
    base = 88.0
    drop = congestion_pct * 0.28
    if is_rush:
        drop += 6.5
    if level == "SEVERE":
        drop += 8.0
    return round(max(42.0, base - drop), 1)


def late_prob(congestion_pct, is_rush):
    prob = min(95.0, congestion_pct * 0.85)
    if is_rush:
        prob = min(98.0, prob * 1.4)
    return round(prob, 1)


def fetch_one(cp):
    url = TOMTOM_URL.format(key=TOMTOM_API_KEY, lat=cp["lat"], lon=cp["lon"])
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    d = resp.json()["flowSegmentData"]

    current_speed = d["currentSpeed"]
    freeflow_speed = d["freeFlowSpeed"]
    congestion_pct = round((1 - current_speed / max(freeflow_speed, 1)) * 100, 1)
    congestion_pct = max(0, min(100, congestion_pct))

    if congestion_pct >= 70:
        level = "SEVERE"
    elif congestion_pct >= 45:
        level = "HIGH"
    elif congestion_pct >= 20:
        level = "MODERATE"
    else:
        level = "FREE"

    hour = datetime.now().hour
    is_rush = 7 <= hour <= 9

    return {
        "college": cp["college"],
        "road": cp["road"],
        "lat": cp["lat"],
        "lon": cp["lon"],
        "avg_congestion": congestion_pct,
        "max_congestion": congestion_pct,
        "min_speed": current_speed,
        "congestion_level": level,
        "predicted_attendance": predict_attendance(congestion_pct, is_rush, level),
        "late_arrival_prob": late_prob(congestion_pct, is_rush),
        "is_morning_rush": is_rush,
        "alert": level == "SEVERE" and is_rush,
        "last_updated": datetime.now().isoformat(),
    }


def run_once():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Fetching real traffic data from TomTom...")
    results = []
    for cp in CHECKPOINTS:
        try:
            rec = fetch_one(cp)
            results.append(rec)
            print(f"  ✓ {rec['college']}: {rec['congestion_level']} "
                  f"({rec['avg_congestion']}% congestion, {rec['predicted_attendance']}% attendance)")
        except Exception as e:
            print(f"  ✗ {cp['college']}: {e}")

    if results:
        with open(OUTPUT_FILE, "w") as f:
            json.dump(results, f, indent=2)
        print(f"[✓] Wrote {len(results)} colleges → {OUTPUT_FILE}")
    else:
        print("[✗] No data fetched — check your TOMTOM_API_KEY in .env")


if __name__ == "__main__":
    if "--loop" in sys.argv:
        print(f"[Collector] Looping every {POLL_INTERVAL}s. Ctrl+C to stop.")
        while True:
            run_once()
            time.sleep(POLL_INTERVAL)
    else:
        run_once()