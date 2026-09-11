"""
Traffic Data Collector
Polls TomTom Traffic Flow API every 60s for roads near Pune colleges
Writes JSON records directly to HDFS using hdfs3 / pyarrow
No Kafka needed — Hadoop HDFS is the stream buffer
"""

import time
import json
import requests
import subprocess
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# ─── CONFIG ──────────────────────────────────────────────────────────────────
TOMTOM_API_KEY  = os.environ["TOMTOM_API_KEY"]   # set in .env
HDFS_BASE_DIR   = "/traffic/raw"          # HDFS directory
POLL_INTERVAL   = 60                       # seconds
HADOOP_CMD      = "hdfs"                   # or full path if needed

# ─── PUNE COLLEGE ROAD CHECKPOINTS ───────────────────────────────────────────
CHECKPOINTS = [
    {"id": "pict",       "college": "PICT Pune",        "road": "Katraj-Dehu Road",     "lat": 18.4528, "lon": 73.8563},
    {"id": "coep",       "college": "COEP Pune",        "road": "FC Road Shivajinagar", "lat": 18.5308, "lon": 73.8474},
    {"id": "vit",        "college": "VIT Pune",         "road": "Kondhwa Road",         "lat": 18.4611, "lon": 73.8930},
    {"id": "mit",        "college": "MIT Pune",         "road": "Paud Road Kothrud",    "lat": 18.5074, "lon": 73.8077},
    {"id": "univ",       "college": "Pune University",  "road": "Ganeshkhind Road",     "lat": 18.5590, "lon": 73.8143},
    {"id": "pcce",       "college": "PCCE Pimpri",      "road": "Nigdi-Akurdi Road",    "lat": 18.6508, "lon": 73.7896},
    {"id": "nit",        "college": "NIT Pune",         "road": "Narhe Road",           "lat": 18.4585, "lon": 73.8074},
    {"id": "symbiosis",  "college": "Symbiosis Lavale", "road": "Lavale-Hinjewadi Rd",  "lat": 18.5575, "lon": 73.7295},
]

TOMTOM_URL = (
    "https://api.tomtom.com/traffic/services/4"
    "/flowSegmentData/absolute/10/json"
    "?key={key}&point={lat},{lon}&unit=KMPH"
)

def fetch_traffic(cp):
    url = TOMTOM_URL.format(key=TOMTOM_API_KEY, lat=cp["lat"], lon=cp["lon"])
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    d = resp.json()["flowSegmentData"]

    current_speed  = d["currentSpeed"]
    freeflow_speed = d["freeFlowSpeed"]
    congestion_pct = round((1 - current_speed / max(freeflow_speed, 1)) * 100, 1)
    congestion_pct = max(0, min(100, congestion_pct))

    if congestion_pct >= 70:   level = "SEVERE"
    elif congestion_pct >= 45: level = "HIGH"
    elif congestion_pct >= 20: level = "MODERATE"
    else:                      level = "FREE"

    hour = datetime.now().hour
    return {
        "id":               cp["id"],
        "college":          cp["college"],
        "road":             cp["road"],
        "lat":              cp["lat"],
        "lon":              cp["lon"],
        "current_speed":    current_speed,
        "freeflow_speed":   freeflow_speed,
        "congestion_pct":   congestion_pct,
        "congestion_level": level,
        "road_closed":      d.get("roadClosure", False),
        "timestamp":        datetime.now().isoformat(),
        "hour":             hour,
        "is_morning_rush":  7 <= hour <= 9,
        "date":             datetime.now().strftime("%Y-%m-%d"),
    }

def write_to_hdfs(records, timestamp):
    """Write batch of records as JSON lines to HDFS"""
    # create directory if not exists
    subprocess.run([HADOOP_CMD, "dfs", "-mkdir", "-p", HDFS_BASE_DIR],
                   capture_output=True)

    filename = f"/tmp/traffic_{timestamp}.json"
    hdfs_path = f"{HDFS_BASE_DIR}/traffic_{timestamp}.json"

    # write locally first then put to HDFS
    with open(filename, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")

    result = subprocess.run(
        [HADOOP_CMD, "dfs", "-put", "-f", filename, hdfs_path],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  ✓ Written {len(records)} records → HDFS:{hdfs_path}")
    else:
        print(f"  ✗ HDFS write failed: {result.stderr}")

    # also write to local latest.json for FastAPI to read quickly
    with open("/tmp/traffic_latest.json", "w") as f:
        json.dump(records, f)

def main():
    print(f"[Collector] Started. Polling {len(CHECKPOINTS)} checkpoints every {POLL_INTERVAL}s")
    print(f"[Collector] Writing to HDFS:{HDFS_BASE_DIR}")

    # create HDFS directory
    subprocess.run([HADOOP_CMD, "dfs", "-mkdir", "-p", HDFS_BASE_DIR], capture_output=True)

    while True:
        ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
        time_str = datetime.now().strftime("%H:%M:%S")
        print(f"\n[{time_str}] Fetching traffic data...")

        records = []
        for cp in CHECKPOINTS:
            try:
                rec = fetch_traffic(cp)
                records.append(rec)
                print(f"  ✓ {cp['college']}: {rec['current_speed']} km/h "
                      f"({rec['congestion_level']} — {rec['congestion_pct']}%)")
            except Exception as e:
                print(f"  ✗ {cp['college']}: {e}")
                # write mock data if API fails
                records.append(mock_record(cp))

        write_to_hdfs(records, ts)
        print(f"[{time_str}] Done. Sleeping {POLL_INTERVAL}s...")
        time.sleep(POLL_INTERVAL)

def mock_record(cp):
    """Fallback mock if TomTom API not configured yet"""
    import random
    hour = datetime.now().hour
    rush = 7 <= hour <= 9
    cong = round(random.uniform(50, 80) if rush else random.uniform(10, 40), 1)
    level = "SEVERE" if cong >= 70 else "HIGH" if cong >= 45 else "MODERATE" if cong >= 20 else "FREE"
    return {
        "id": cp["id"], "college": cp["college"], "road": cp["road"],
        "lat": cp["lat"], "lon": cp["lon"],
        "current_speed": round(60 - cong * 0.5, 1),
        "freeflow_speed": 60, "congestion_pct": cong,
        "congestion_level": level, "road_closed": False,
        "timestamp": datetime.now().isoformat(),
        "hour": hour, "is_morning_rush": rush,
        "date": datetime.now().strftime("%Y-%m-%d"),
    }

if __name__ == "__main__":
    main()
