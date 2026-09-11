# PuneTraffic.ai — Traffic-to-Attendance Dashboard

A real-time dashboard that predicts college attendance in Pune using live road traffic data. Built with React, FastAPI, and the TomTom Traffic API, with an optional PySpark/Hadoop pipeline for large-scale processing.

## Stack

- **React 18** + Vite — frontend dashboard
- **FastAPI** — backend API serving live snapshots
- **TomTom Traffic API** — real-time road congestion data
- **PySpark + Hadoop HDFS** — optional big-data pipeline for aggregating traffic streams
- **python-dotenv** — environment-based secret management

## Features

- Live congestion tracking across 8 Pune college zones
- Predicted attendance percentage per college, derived from real-time road speeds
- "Highest congestion right now" ranking with auto-refreshing data
- Live city-wide snapshot: average congestion, active alerts, colleges live
- Falls back to realistic mock data automatically when no live feed is available — dashboard always renders something meaningful

## Architecture

```
collector/     Polls TomTom API for road speeds near each college
                ├─ collector.py         full pipeline: writes to Hadoop HDFS
                └─ collector_simple.py  lightweight: writes straight to JSON, no Hadoop needed
spark/         PySpark job that aggregates raw HDFS traffic records into per-college stats
backend/       FastAPI server exposing /api/snapshot — reads Spark output, falls back to mock
frontend/      React + Vite dashboard consuming the backend API
```

## Local setup

**1. Install dependencies**
```bash
npm install --prefix frontend
python3 -m pip install -r requirements.txt
```

**2. Add your TomTom API key**

Get a free key at [developer.tomtom.com](https://developer.tomtom.com), then create a `.env` file in the project root:
```
TOMTOM_API_KEY=your_key_here
```

**3. Run the backend**
```bash
cd backend
python3 -m uvicorn main:app --reload --port 8000
```

**4. Run the frontend**
```bash
cd frontend
npm run dev
```
Navigate to `http://localhost:5173`.

**5. (Optional) Pull in real traffic data**
```bash
python3 collector/collector_simple.py          # fetch once
python3 collector/collector_simple.py --loop    # refresh every 60s
```
Without this step, the dashboard runs entirely on realistic mock data.

## Credits

Built by Yash Talikhede — portfolio project. Traffic data via the TomTom Traffic API; attendance predictions are a heuristic model, not verified against real attendance records.