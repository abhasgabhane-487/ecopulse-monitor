import asyncio
import io
import csv
import json
import math
import random
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from collections import deque

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="EcoPulse - Smart Sustainability & Environmental Monitoring System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Data Models -----------------
class TelemetryData(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    temperature: float  # Celsius
    humidity: float     # % Relative Humidity
    aqi: int            # Air Quality Index (0 - 500)
    pm25: float         # µg/m³
    pm10: float         # µg/m³
    co2: int            # ppm
    pressure: float     # hPa
    noise: float        # dB
    light: int          # Lux
    source: str = "simulated"

class WasteBinData(BaseModel):
    id: str
    name: str
    bin_type: str        # 'Organic', 'Recyclables', 'General', 'E-Waste'
    location: str
    fill_level: float    # 0 - 100 %
    weight_kg: float     # kg
    odor_methane_ppm: float  # ppm
    lid_status: str      # 'Closed', 'Open'
    fire_alert: bool = False
    status: str = "Normal"  # 'Normal', 'Warning', 'Critical'
    last_collected: str = "2 hours ago"

class EnergyData(BaseModel):
    solar_watts: float          # Real-time Solar PV generation
    solar_peak_watts: float     # Peak capacity
    daily_kwh: float            # Total clean energy produced today
    battery_soc: float          # State of Charge (0 - 100 %)
    battery_voltage: float      # Battery bus voltage (e.g. 51.2V)
    battery_status: str         # 'Charging', 'Discharging', 'Standby'
    facility_load_watts: float  # Power currently drawn by building
    grid_power_watts: float     # Positive = import from grid, Negative = export clean power
    renewable_ratio: float      # % of power currently from solar/storage
    co2_saved_kg: float         # CO2 emissions offset today
    trees_equivalent: float     # Tree absorption equivalent
    solar_efficiency: float     # Solar panel output vs irradiance %

class ThresholdConfig(BaseModel):
    temp_min: float = 16.0
    temp_max: float = 32.0
    humidity_min: float = 30.0
    humidity_max: float = 70.0
    aqi_warning: int = 100
    aqi_critical: int = 150
    co2_warning: int = 1000
    co2_critical: int = 1600
    noise_warning: float = 75.0
    pressure_min: float = 980.0
    pressure_max: float = 1040.0
    bin_warning_pct: float = 75.0
    bin_critical_pct: float = 90.0
    methane_warning_ppm: float = 25.0
    battery_low_soc: float = 20.0

class AnomalyTrigger(BaseModel):
    type: str  # 'heatwave', 'smoke', 'co2_spike', 'storm', 'bin_overflow', 'methane_leak', 'solar_cloud', 'grid_blackout', 'reset'
    duration_seconds: int = 30

# ----------------- State & Simulator Engine -----------------
class SensorEngine:
    def __init__(self):
        self.history: deque = deque(maxlen=300)
        self.energy_history: deque = deque(maxlen=300)
        self.alerts: deque = deque(maxlen=100)
        self.thresholds = ThresholdConfig()
        self.preset = "Standard Office"
        self.is_paused = False
        self.update_interval = 1.5
        self.active_anomaly: Optional[str] = None
        self.anomaly_expires_at: float = 0.0

        # Base nominal states for environmental presets
        self.presets = {
            "Standard Office": {
                "temp": 22.5, "humidity": 45.0, "aqi": 35, "pm25": 8.5,
                "pm10": 15.0, "co2": 550, "pressure": 1013.2, "noise": 42.0, "light": 480,
                "base_solar": 3200.0, "facility_load": 2700.0
            },
            "Server Room": {
                "temp": 18.0, "humidity": 38.0, "aqi": 18, "pm25": 4.0,
                "pm10": 7.0, "co2": 420, "pressure": 1014.5, "noise": 68.0, "light": 120,
                "base_solar": 4100.0, "facility_load": 4800.0
            },
            "Greenhouse": {
                "temp": 27.5, "humidity": 78.0, "aqi": 25, "pm25": 6.0,
                "pm10": 12.0, "co2": 850, "pressure": 1011.0, "noise": 34.0, "light": 1250,
                "base_solar": 5200.0, "facility_load": 1800.0
            },
            "Industrial Factory": {
                "temp": 28.0, "humidity": 52.0, "aqi": 115, "pm25": 38.0,
                "pm10": 65.0, "co2": 920, "pressure": 1012.0, "noise": 82.0, "light": 360,
                "base_solar": 6800.0, "facility_load": 8200.0
            },
            "Urban City": {
                "temp": 25.0, "humidity": 55.0, "aqi": 85, "pm25": 28.0,
                "pm10": 45.0, "co2": 620, "pressure": 1010.5, "noise": 65.0, "light": 650,
                "base_solar": 3600.0, "facility_load": 3400.0
            }
        }

        # Initialize Smart Waste Bins
        self.waste_bins = [
            WasteBinData(
                id="BIN-01",
                name="Cafeteria Compost Hub",
                bin_type="Organic",
                location="Ground Floor Dining",
                fill_level=68.5,
                weight_kg=28.4,
                odor_methane_ppm=14.2,
                lid_status="Closed",
                status="Normal",
                last_collected="3h ago"
            ),
            WasteBinData(
                id="BIN-02",
                name="Main Quad Recycler",
                bin_type="Recyclables",
                location="Central Plaza",
                fill_level=86.0,
                weight_kg=15.8,
                odor_methane_ppm=2.1,
                lid_status="Closed",
                status="Warning",
                last_collected="5h ago"
            ),
            WasteBinData(
                id="BIN-03",
                name="Office Landfill Container",
                bin_type="General",
                location="Tower B, Fl 3",
                fill_level=44.2,
                weight_kg=12.1,
                odor_methane_ppm=4.8,
                lid_status="Closed",
                status="Normal",
                last_collected="1h ago"
            ),
            WasteBinData(
                id="BIN-04",
                name="Tech Lab E-Waste Station",
                bin_type="E-Waste",
                location="Engineering Hub",
                fill_level=22.0,
                weight_kg=9.3,
                odor_methane_ppm=0.8,
                lid_status="Closed",
                status="Normal",
                last_collected="Yesterday"
            ),
        ]

        # Initialize Renewable Energy Metrics
        self.accumulated_kwh = 28.4
        self.battery_soc = 84.5
        self.step_counter = 0

        # Pre-seed history with 40 readings
        now = time.time()
        for i in range(40, 0, -1):
            past_time = datetime.fromtimestamp(now - i * 3).isoformat()
            env, energy = self._generate_simulated_readings(custom_timestamp=past_time)
            self.history.append(env)
            self.energy_history.append(energy)

    def _generate_simulated_readings(self, custom_timestamp: Optional[str] = None):
        self.step_counter += 1
        base = self.presets.get(self.preset, self.presets["Standard Office"])

        # Check anomaly expiry
        if self.active_anomaly and time.time() > self.anomaly_expires_at:
            self.active_anomaly = None

        # Base drift
        wave = math.sin(self.step_counter * 0.15) * 0.5
        noise_factor = random.gauss(0, 0.3)

        temp = round(base["temp"] + wave + noise_factor, 1)
        humidity = round(max(10.0, min(99.0, base["humidity"] - (wave * 1.2) + random.gauss(0, 0.6))), 1)
        co2 = int(max(350, base["co2"] + (wave * 30) + random.randint(-15, 20)))
        pm25 = round(max(1.0, base["pm25"] + random.gauss(0, 0.8)), 1)
        pm10 = round(max(pm25, base["pm10"] + random.gauss(0, 1.2)), 1)
        aqi = int(max(5, base["aqi"] + int(pm25 * 1.5) + random.randint(-2, 3)))
        pressure = round(base["pressure"] + (wave * 0.2) + random.gauss(0, 0.1), 1)
        noise = round(max(25.0, base["noise"] + random.gauss(0, 2.5)), 1)
        light = int(max(0, base["light"] + random.randint(-25, 30)))

        # Energy Simulation
        base_solar = base.get("base_solar", 3500.0)
        facility_load = round(base.get("facility_load", 2800.0) + (wave * 150) + random.gauss(0, 40), 1)
        solar_watts = round(max(0.0, base_solar + (wave * 200) + (light * 0.8) + random.gauss(0, 50)), 1)

        # Environmental Anomalies
        if self.active_anomaly == "heatwave":
            temp += random.uniform(9.0, 14.0)
            humidity -= random.uniform(8.0, 15.0)
        elif self.active_anomaly == "smoke":
            pm25 += random.uniform(65.0, 120.0)
            pm10 += random.uniform(90.0, 170.0)
            aqi += random.randint(110, 190)
            co2 += random.randint(300, 700)
        elif self.active_anomaly == "co2_spike":
            co2 += random.randint(900, 1500)
        elif self.active_anomaly == "storm":
            pressure -= random.uniform(22.0, 35.0)
            humidity += random.uniform(15.0, 25.0)
            noise += random.uniform(15.0, 25.0)
            solar_watts = round(solar_watts * 0.15, 1)

        # Energy Anomalies
        if self.active_anomaly == "solar_cloud":
            solar_watts = round(solar_watts * 0.2, 1)
        elif self.active_anomaly == "grid_blackout":
            # Grid power is forced to 0, running completely off solar & battery
            pass

        # Waste simulation updates
        for bin_item in self.waste_bins:
            # Slow gradual fill accumulation
            if random.random() < 0.2:
                bin_item.fill_level = round(min(100.0, bin_item.fill_level + random.uniform(0.1, 0.4)), 1)
                bin_item.weight_kg = round(bin_item.weight_kg + random.uniform(0.05, 0.15), 1)

            # Odor drift in organic
            if bin_item.bin_type == "Organic":
                bin_item.odor_methane_ppm = round(max(2.0, bin_item.odor_methane_ppm + random.gauss(0, 0.3)), 1)

            # Check Waste Anomalies
            if self.active_anomaly == "bin_overflow" and bin_item.id == "BIN-02":
                bin_item.fill_level = round(min(99.0, max(94.0, bin_item.fill_level + 1.2)), 1)
            elif self.active_anomaly == "methane_leak" and bin_item.bin_type == "Organic":
                bin_item.odor_methane_ppm = round(min(95.0, max(65.0, bin_item.odor_methane_ppm + 5.0)), 1)

            # Update bin status
            if bin_item.fill_level >= self.thresholds.bin_critical_pct:
                bin_item.status = "Critical"
            elif bin_item.fill_level >= self.thresholds.bin_warning_pct or bin_item.odor_methane_ppm >= self.thresholds.methane_warning_ppm:
                bin_item.status = "Warning"
            else:
                bin_item.status = "Normal"

        # Energy Calculations
        power_net = solar_watts - facility_load  # Positive = surplus, Negative = deficit
        if power_net > 0:
            # Solar covers load, excess charges battery or exports to grid
            if self.battery_soc < 99.5:
                self.battery_soc = round(min(100.0, self.battery_soc + (power_net / 10000.0)), 2)
                battery_status = "Charging"
                grid_power = round(-max(0.0, power_net * 0.4), 1)  # Export surplus to grid
            else:
                battery_status = "Float / Standby"
                grid_power = round(-power_net, 1)  # 100% export to grid
            renewable_ratio = 100.0
        else:
            # Solar deficit: drawn from battery or grid
            deficit = abs(power_net)
            if self.active_anomaly == "grid_blackout" or self.battery_soc > self.thresholds.battery_low_soc:
                self.battery_soc = round(max(5.0, self.battery_soc - (deficit / 12000.0)), 2)
                battery_status = "Discharging"
                grid_power = 0.0 if self.active_anomaly == "grid_blackout" else round(deficit * 0.15, 1)
                renewable_ratio = round(min(100.0, (solar_watts + (deficit * 0.85)) / facility_load * 100), 1)
            else:
                battery_status = "Low / Standby"
                grid_power = round(deficit, 1)  # Draw from grid
                renewable_ratio = round((solar_watts / facility_load) * 100, 1)

        self.accumulated_kwh = round(self.accumulated_kwh + (solar_watts / 3600000.0) * self.update_interval, 2)
        co2_saved = round(self.accumulated_kwh * 0.708, 2)  # ~0.708 kg CO2 per kWh grid offset
        trees_equiv = round(co2_saved / 0.06, 1)  # ~1 mature tree absorbs ~0.06 kg CO2/day

        battery_voltage = round(48.0 + (self.battery_soc / 100.0) * 4.2, 1)
        panel_eff = round(min(22.8, max(12.0, 19.5 + (random.gauss(0, 0.4)))), 1)

        env_data = TelemetryData(
            timestamp=custom_timestamp or datetime.now().isoformat(),
            temperature=round(temp, 1),
            humidity=round(humidity, 1),
            aqi=max(1, min(500, aqi)),
            pm25=round(pm25, 1),
            pm10=round(pm10, 1),
            co2=max(350, co2),
            pressure=round(pressure, 1),
            noise=round(noise, 1),
            light=max(0, light),
            source="simulated" if not self.active_anomaly else f"anomaly:{self.active_anomaly}"
        )

        energy_data = EnergyData(
            solar_watts=solar_watts,
            solar_peak_watts=base_solar,
            daily_kwh=self.accumulated_kwh,
            battery_soc=self.battery_soc,
            battery_voltage=battery_voltage,
            battery_status=battery_status,
            facility_load_watts=facility_load,
            grid_power_watts=grid_power,
            renewable_ratio=min(100.0, max(0.0, renewable_ratio)),
            co2_saved_kg=co2_saved,
            trees_equivalent=trees_equiv,
            solar_efficiency=panel_eff
        )

        self._check_alerts(env_data, energy_data)
        return env_data, energy_data

    def _check_alerts(self, data: TelemetryData, energy: EnergyData):
        alerts_found = []
        now_str = datetime.now().strftime("%H:%M:%S")

        # Environmental
        if data.temperature > self.thresholds.temp_max:
            alerts_found.append({
                "severity": "critical", "sensor": "Temperature",
                "message": f"High temperature detected: {data.temperature}°C (Limit: {self.thresholds.temp_max}°C)", "time": now_str
            })
        if data.aqi >= self.thresholds.aqi_critical:
            alerts_found.append({
                "severity": "critical", "sensor": "Air Quality",
                "message": f"Hazardous air quality! AQI: {data.aqi} (PM2.5: {data.pm25} ug/m3)", "time": now_str
            })
        if data.co2 >= self.thresholds.co2_critical:
            alerts_found.append({
                "severity": "critical", "sensor": "Carbon Dioxide",
                "message": f"Dangerous CO2 levels detected: {data.co2} ppm", "time": now_str
            })

        # Smart Waste alerts
        for b in self.waste_bins:
            if b.fill_level >= self.thresholds.bin_critical_pct:
                alerts_found.append({
                    "severity": "critical", "sensor": f"Waste-{b.id}",
                    "message": f"Bin overflow critical: {b.name} ({b.id}) at {b.fill_level}% capacity!", "time": now_str
                })
            elif b.fill_level >= self.thresholds.bin_warning_pct:
                alerts_found.append({
                    "severity": "warning", "sensor": f"Waste-{b.id}",
                    "message": f"Collection needed soon: {b.name} ({b.id}) is {b.fill_level}% full", "time": now_str
                })
            if b.odor_methane_ppm >= self.thresholds.methane_warning_ppm:
                alerts_found.append({
                    "severity": "warning", "sensor": f"WasteOdor-{b.id}",
                    "message": f"High decomposition odor/methane in {b.name}: {b.odor_methane_ppm} ppm", "time": now_str
                })

        # Renewable Energy alerts
        if energy.battery_soc <= self.thresholds.battery_low_soc:
            alerts_found.append({
                "severity": "warning", "sensor": "Battery-Storage",
                "message": f"Low Battery Storage State of Charge: {energy.battery_soc}%", "time": now_str
            })
        if self.active_anomaly == "grid_blackout":
            alerts_found.append({
                "severity": "critical", "sensor": "Microgrid-Grid",
                "message": "Public Utility Grid Blackout! Facility islanded on 100% Solar & Battery backup.", "time": now_str
            })

        for alert in alerts_found:
            # Check if an alert for this exact sensor and severity occurred in recent alerts
            recent_sensors = [(a.get("sensor"), a.get("severity")) for a in list(self.alerts)[:10]]
            if (alert["sensor"], alert["severity"]) not in recent_sensors:
                self.alerts.appendleft(alert)

    def trigger_anomaly(self, anomaly_type: str, duration: int = 30):
        if anomaly_type == "reset":
            self.active_anomaly = None
            self.anomaly_expires_at = 0
            # Reset any critical bin levels
            for b in self.waste_bins:
                if b.fill_level > 85:
                    b.fill_level = 45.0
                    b.weight_kg = 12.0
                    b.status = "Normal"
                if b.odor_methane_ppm > 25:
                    b.odor_methane_ppm = 12.0
        else:
            self.active_anomaly = anomaly_type
            self.anomaly_expires_at = time.time() + duration

    def empty_bin(self, bin_id: str):
        for b in self.waste_bins:
            if b.id == bin_id:
                b.fill_level = round(random.uniform(2.0, 8.0), 1)
                b.weight_kg = round(random.uniform(1.0, 3.5), 1)
                b.odor_methane_ppm = round(random.uniform(0.5, 3.0), 1)
                b.status = "Normal"
                b.last_collected = "Just now"
                return True
        return False

    def set_preset(self, preset_name: str):
        if preset_name in self.presets:
            self.preset = preset_name
            self.active_anomaly = None
            return True
        return False

    def get_eco_score(self) -> int:
        """Calculates a holistic Sustainability Score (0 - 100) combining Air, Waste, and Energy."""
        last_env = self.history[-1] if self.history else None
        last_energy = self.energy_history[-1] if self.energy_history else None

        # 1. Air factor (0-35 pts)
        aqi_val = last_env.aqi if last_env else 40
        air_score = max(0, min(35, int((1.0 - min(1.0, aqi_val / 200.0)) * 35)))

        # 2. Waste factor (0-35 pts)
        avg_fill = sum(b.fill_level for b in self.waste_bins) / len(self.waste_bins)
        waste_score = max(0, min(35, int((1.0 - min(1.0, avg_fill / 100.0)) * 35)))

        # 3. Clean Energy factor (0-30 pts)
        ren_ratio = last_energy.renewable_ratio if last_energy else 75.0
        energy_score = max(0, min(30, int((ren_ratio / 100.0) * 30)))

        return air_score + waste_score + energy_score

    def tick(self):
        if self.is_paused:
            return None, None
        env_data, energy_data = self._generate_simulated_readings()
        self.history.append(env_data)
        self.energy_history.append(energy_data)
        return env_data, energy_data

engine = SensorEngine()

# ----------------- WebSocket Connection Manager -----------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)

manager = ConnectionManager()

# Background generator loop
@app.on_event("startup")
async def start_simulator_task():
    async def simulator_loop():
        while True:
            try:
                env_data, energy_data = engine.tick()
                if env_data and manager.active_connections:
                    payload = {
                        "type": "telemetry",
                        "environmental": env_data.dict(),
                        "energy": energy_data.dict(),
                        "waste": [b.dict() for b in engine.waste_bins],
                        "eco_score": engine.get_eco_score(),
                        "preset": engine.preset,
                        "anomaly": engine.active_anomaly,
                        "alerts": list(engine.alerts)[:12]
                    }
                    await manager.broadcast(payload)
            except Exception as e:
                print(f"Simulator loop error: {e}")
            await asyncio.sleep(engine.update_interval)

    asyncio.create_task(simulator_loop())

# ----------------- REST Endpoints -----------------

@app.get("/api/current")
async def get_current_reading():
    env_curr = engine.history[-1] if engine.history else None
    energy_curr = engine.energy_history[-1] if engine.energy_history else None
    return {
        "environmental": env_curr.dict() if env_curr else None,
        "energy": energy_curr.dict() if energy_curr else None,
        "waste": [b.dict() for b in engine.waste_bins],
        "eco_score": engine.get_eco_score(),
        "preset": engine.preset,
        "anomaly": engine.active_anomaly,
        "alerts": list(engine.alerts)[:15],
        "thresholds": engine.thresholds.dict()
    }

@app.post("/api/waste/empty")
async def empty_waste_bin(payload: Dict[str, str] = Body(...)):
    bin_id = payload.get("id")
    if bin_id and engine.empty_bin(bin_id):
        # Broadcast immediate update
        return {"status": "ok", "message": f"Bin {bin_id} marked as collected and emptied"}
    raise HTTPException(status_code=404, detail="Bin not found")

@app.post("/api/telemetry")
async def ingest_telemetry(reading: TelemetryData):
    reading.source = "hardware"
    engine.history.append(reading)
    return {"status": "success", "message": "Environmental telemetry accepted"}

@app.post("/api/simulate/preset")
async def change_preset(payload: Dict[str, str] = Body(...)):
    preset_name = payload.get("preset", "Standard Office")
    if engine.set_preset(preset_name):
        return {"status": "ok", "preset": engine.preset}
    raise HTTPException(status_code=400, detail="Unknown preset name")

@app.post("/api/simulate/anomaly")
async def trigger_anomaly(payload: AnomalyTrigger):
    engine.trigger_anomaly(payload.type, payload.duration_seconds)
    return {"status": "ok", "anomaly": engine.active_anomaly, "duration": payload.duration_seconds}

@app.post("/api/simulate/control")
async def simulator_control(payload: Dict[str, Any] = Body(...)):
    if "paused" in payload:
        engine.is_paused = bool(payload["paused"])
    if "interval" in payload:
        engine.update_interval = max(0.5, float(payload["interval"]))
    return {"paused": engine.is_paused, "interval": engine.update_interval}

@app.get("/api/export/csv")
async def export_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp", "Temperature (C)", "Humidity (%)", "AQI", "PM2.5 (ug/m3)",
        "CO2 (ppm)", "Pressure (hPa)", "Solar Power (W)", "Battery SoC (%)", "Grid Power (W)"
    ])

    for i in range(len(engine.history)):
        env_d = engine.history[i]
        eng_d = engine.energy_history[i] if i < len(engine.energy_history) else None
        writer.writerow([
            env_d.timestamp, env_d.temperature, env_d.humidity, env_d.aqi, env_d.pm25,
            env_d.co2, env_d.pressure,
            eng_d.solar_watts if eng_d else "",
            eng_d.battery_soc if eng_d else "",
            eng_d.grid_power_watts if eng_d else ""
        ])

    output.seek(0)
    filename = f"sustainability_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/api/thresholds")
async def update_thresholds(thresholds: ThresholdConfig):
    engine.thresholds = thresholds
    return {"status": "ok", "thresholds": engine.thresholds.dict()}

# ----------------- WebSocket Endpoint -----------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    initial_payload = {
        "type": "init",
        "environmental_history": [r.dict() for r in list(engine.history)],
        "energy_history": [e.dict() for e in list(engine.energy_history)],
        "waste": [b.dict() for b in engine.waste_bins],
        "eco_score": engine.get_eco_score(),
        "preset": engine.preset,
        "anomaly": engine.active_anomaly,
        "thresholds": engine.thresholds.dict(),
        "alerts": list(engine.alerts)[:15]
    }
    await websocket.send_text(json.dumps(initial_payload))

    try:
        while True:
            text = await websocket.receive_text()
            data = json.loads(text)
            action = data.get("action")
            if action == "set_preset":
                engine.set_preset(data.get("preset"))
            elif action == "trigger_anomaly":
                engine.trigger_anomaly(data.get("type"), data.get("duration", 30))
            elif action == "toggle_pause":
                engine.is_paused = not engine.is_paused
            elif action == "set_interval":
                engine.update_interval = float(data.get("interval", 1.5))
            elif action == "empty_bin":
                engine.empty_bin(data.get("id"))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# ----------------- Serve Static Frontend -----------------
import os
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/robots.txt")
async def get_robots():
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse("User-agent: *\nAllow: /\n", media_type="text/plain")

@app.get("/")
@app.get("/environmental")
@app.get("/waste")
@app.get("/renewable")
@app.get("/energy")
async def get_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>EcoPulse is booting...</h1>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
