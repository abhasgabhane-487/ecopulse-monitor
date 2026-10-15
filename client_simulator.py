"""
EcoPulse - External Hardware IoT Device Simulator
Simulates a physical IoT node (e.g., ESP32, Raspberry Pi) sending real-time
sensor data over HTTP POST to the EcoPulse REST API.
"""

import time
import random
import urllib.request
import json
from datetime import datetime

SERVER_URL = "http://127.0.0.1:8000/api/telemetry"

def generate_hardware_telemetry():
    return {
        "timestamp": datetime.now().isoformat(),
        "temperature": round(24.0 + random.uniform(-1.5, 2.5), 1),
        "humidity": round(52.0 + random.uniform(-4.0, 4.0), 1),
        "aqi": random.randint(35, 65),
        "pm25": round(9.0 + random.uniform(-2.0, 3.0), 1),
        "pm10": round(16.0 + random.uniform(-3.0, 4.0), 1),
        "co2": random.randint(500, 700),
        "pressure": round(1013.2 + random.uniform(-0.5, 0.5), 1),
        "noise": round(44.0 + random.uniform(-3.0, 6.0), 1),
        "light": random.randint(400, 550),
        "source": "ESP32-Node-01"
    }

def send_telemetry(payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        SERVER_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status, resp.read().decode("utf-8")
    except Exception as e:
        return None, str(e)

if __name__ == "__main__":
    print(f"[*] Starting IoT Hardware Simulator Node (Target: {SERVER_URL})")
    print("[*] Press Ctrl+C to stop.")
    
    while True:
        telemetry = generate_hardware_telemetry()
        status, response = send_telemetry(telemetry)
        if status == 200:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Telemetry published -> Temp: {telemetry['temperature']}°C, AQI: {telemetry['aqi']}, CO2: {telemetry['co2']} ppm")
        else:
            print(f"[!] Failed to send: {response}")
        time.sleep(2.0)
