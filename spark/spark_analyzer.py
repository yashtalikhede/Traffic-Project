"""
PySpark Traffic Analyzer
Reads latest traffic JSON from HDFS
Computes attendance predictions + congestion stats
Saves results back to HDFS as JSON
Run with: spark-submit spark_analyzer.py
Or on YARN: spark-submit --master yarn spark_analyzer.py
"""

import json
import subprocess
from datetime import datetime
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, avg, max as spark_max, min as spark_min,
    udf, lit, current_timestamp
)
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType,
    BooleanType, IntegerType, FloatType
)

HDFS_INPUT  = "hdfs://localhost:9000/traffic/raw"
HDFS_OUTPUT = "hdfs://localhost:9000/traffic/results"
LOCAL_OUT   = "/tmp/traffic_results.json"

SCHEMA = StructType([
    StructField("id",               StringType(),  True),
    StructField("college",          StringType(),  True),
    StructField("road",             StringType(),  True),
    StructField("lat",              DoubleType(),  True),
    StructField("lon",              DoubleType(),  True),
    StructField("current_speed",    DoubleType(),  True),
    StructField("freeflow_speed",   DoubleType(),  True),
    StructField("congestion_pct",   DoubleType(),  True),
    StructField("congestion_level", StringType(),  True),
    StructField("road_closed",      BooleanType(), True),
    StructField("timestamp",        StringType(),  True),
    StructField("hour",             IntegerType(), True),
    StructField("is_morning_rush",  BooleanType(), True),
    StructField("date",             StringType(),  True),
])

# ─── ATTENDANCE MODEL ─────────────────────────────────────────────────────────
@udf(FloatType())
def predict_attendance(congestion_pct, is_rush, level):
    base = 88.0
    drop = congestion_pct * 0.28
    if is_rush:
        drop += 6.5
    if level == "SEVERE":
        drop += 8.0
    return round(float(max(42.0, base - drop)), 1)

@udf(FloatType())
def late_prob(congestion_pct, is_rush):
    prob = min(95.0, congestion_pct * 0.85)
    if is_rush:
        prob = min(98.0, prob * 1.4)
    return round(float(prob), 1)

def main():
    spark = SparkSession.builder \
        .appName("TrafficAttendanceAnalyzer") \
        .config("spark.sql.shuffle.partitions", "4") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")
    print("[Spark] Reading traffic data from HDFS...")

    try:
        df = spark.read.schema(SCHEMA).json(HDFS_INPUT)
        count = df.count()
        print(f"[Spark] Loaded {count} records from HDFS")
    except Exception as e:
        print(f"[Spark] HDFS read failed: {e}")
        print("[Spark] Reading from local fallback...")
        df = spark.read.schema(SCHEMA).json("file:///tmp/traffic_latest.json")

    # aggregate per college — latest reading
    agg = df.groupBy("college", "road", "lat", "lon") \
        .agg(
            avg("congestion_pct").alias("avg_congestion"),
            spark_max("congestion_pct").alias("max_congestion"),
            spark_min("current_speed").alias("min_speed"),
            spark_max("congestion_level").alias("worst_level"),
            spark_max("is_morning_rush").alias("is_rush"),
            spark_max("timestamp").alias("last_updated"),
        )

    # add predictions
    result = agg \
        .withColumn("predicted_attendance",
                    predict_attendance(col("avg_congestion"), col("is_rush"), col("worst_level"))) \
        .withColumn("late_arrival_prob",
                    late_prob(col("avg_congestion"), col("is_rush"))) \
        .withColumn("alert",
                    (col("worst_level") == "SEVERE") & col("is_rush"))

    result.show(truncate=False)

    # save to HDFS
    try:
        result.coalesce(1).write.mode("overwrite").json(HDFS_OUTPUT)
        print(f"[Spark] Results saved to HDFS:{HDFS_OUTPUT}")
    except Exception as e:
        print(f"[Spark] HDFS write failed: {e}")

    # also save locally for FastAPI
    rows = result.collect()
    records = []
    for r in rows:
        records.append({
            "college":              r["college"],
            "road":                 r["road"],
            "lat":                  r["lat"],
            "lon":                  r["lon"],
            "avg_congestion":       round(float(r["avg_congestion"]), 1),
            "max_congestion":       round(float(r["max_congestion"]), 1),
            "min_speed":            round(float(r["min_speed"]), 1),
            "congestion_level":     r["worst_level"],
            "predicted_attendance": float(r["predicted_attendance"]),
            "late_arrival_prob":    float(r["late_arrival_prob"]),
            "is_morning_rush":      bool(r["is_rush"]),
            "alert":                bool(r["alert"]),
            "last_updated":         r["last_updated"],
        })

    with open(LOCAL_OUT, "w") as f:
        json.dump(records, f, indent=2)
    print(f"[Spark] Results also saved locally → {LOCAL_OUT}")
    print(f"[Spark] Processed {len(records)} colleges")

    spark.stop()

if __name__ == "__main__":
    main()
