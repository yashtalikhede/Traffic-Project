"""
FastAPI Backend
Reads Spark output and serves to React dashboard
Supports SSE for live push every 30s
"""

import json
import asyncio
import subprocess
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

app = FastAPI(title="Traffic Attendance API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

RESULTS_FILE  = "/tmp/traffic_results.json"
LATEST_FILE   = "/tmp/traffic_latest.json"
HDFS_RESULTS  = "hdfs://localhost:9000/traffic/results"

def load_results():
    """Load Spark results — try local file first, fallback to mock"""
    try:
        if Path(RESULTS_FILE).exists():
            with open(RESULTS_FILE) as f:
                data = json.load(f)
            if data:
                return data
    except Exception:
        pass
    return generate_mock()

def generate_mock():
    hour = datetime.now().hour
    rush = 7 <= hour <= 9
    import random
    colleges = [
        {"college": "PICT Pune",        "road": "Katraj-Dehu Road",     "lat": 18.4528, "lon": 73.8563},
        {"college": "COEP Pune",        "road": "FC Road Shivajinagar", "lat": 18.5308, "lon": 73.8474},
        {"college": "VIT Pune",         "road": "Kondhwa Road",         "lat": 18.4611, "lon": 73.8930},
        {"college": "MIT Pune",         "road": "Paud Road Kothrud",    "lat": 18.5074, "lon": 73.8077},
        {"college": "Pune University",  "road": "Ganeshkhind Road",     "lat": 18.5590, "lon": 73.8143},
        {"college": "PCCE Pimpri",      "road": "Nigdi-Akurdi Road",    "lat": 18.6508, "lon": 73.7896},
        {"college": "NIT Pune",         "road": "Narhe Road",           "lat": 18.4585, "lon": 73.8074},
        {"college": "Symbiosis Lavale", "road": "Lavale-Hinjewadi Rd",  "lat": 18.5575, "lon": 73.7295},
    ]
    result = []
    for c in colleges:
        cong  = round(random.uniform(50, 80) if rush else random.uniform(10, 40), 1)
        level = "SEVERE" if cong >= 70 else "HIGH" if cong >= 45 else "MODERATE" if cong >= 20 else "FREE"
        att   = round(max(42, 88 - cong * 0.28 - (6.5 if rush else 0) - (8 if level == "SEVERE" else 0)), 1)
        late  = round(min(98, cong * 0.85 * (1.4 if rush else 1)), 1)
        result.append({**c,
            "avg_congestion": cong, "max_congestion": round(cong + 8, 1),
            "min_speed": round(max(5, 60 - cong * 0.5), 1),
            "congestion_level": level, "predicted_attendance": att,
            "late_arrival_prob": late, "is_morning_rush": rush,
            "alert": level == "SEVERE" and rush,
            "last_updated": datetime.now().isoformat(),
        })
    return result

def build_response(colleges):
    avg_cong = round(sum(c["avg_congestion"] for c in colleges) / max(len(colleges), 1), 1)
    return {
        "colleges":           colleges,
        "updated_at":         datetime.now().isoformat(),
        "total_colleges":     len(colleges),
        "alerts":             sum(1 for c in colleges if c.get("alert")),
        "avg_city_congestion": avg_cong,
        "source":             "spark+hdfs" if Path(RESULTS_FILE).exists() else "mock",
    }

@app.get("/api/snapshot")
def snapshot():
    return JSONResponse(build_response(load_results()))

@app.get("/api/stream")
async def stream():
    async def gen():
        while True:
            try:
                payload = json.dumps(build_response(load_results()))
                yield f"data: {payload}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            await asyncio.sleep(30)
    return StreamingResponse(gen(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.post("/api/trigger-spark")
def trigger_spark():
    """Manually trigger a Spark analysis run"""
    try:
        result = subprocess.Popen(
            ["spark-submit", "spark_analyzer.py"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        return JSONResponse({"status": "started", "pid": result.pid})
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat(),
            "has_spark_results": Path(RESULTS_FILE).exists()}
