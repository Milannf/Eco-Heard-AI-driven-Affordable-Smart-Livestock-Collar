from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import sqlite3

app = FastAPI()

# Biar frontend (Expo) bisa akses tanpa masalah CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "sensor_data.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            suhu REAL,
            accel_x REAL, accel_y REAL, accel_z REAL,
            gyro_x REAL, gyro_y REAL, gyro_z REAL,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

class SensorData(BaseModel):
    suhu: float
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float

@app.post("/api/sensor-data")
def receive_data(data: SensorData):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("""
        INSERT INTO readings (suhu, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (data.suhu, data.accel_x, data.accel_y, data.accel_z,
          data.gyro_x, data.gyro_y, data.gyro_z, datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/api/sensor-data")
def get_latest(limit: int = 20):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM readings ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(row) for row in c.fetchall()]
    conn.close()
    return rows