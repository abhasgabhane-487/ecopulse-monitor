<div align="center">

# 🌿 EcoPulse | Environmental Monitoring & Sustainability Simulator

**A Python/FastAPI prototype for simulated environmental telemetry, smart-waste monitoring, and renewable-energy microgrid visualization.**

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-REST%20API-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 1. Project overview

EcoPulse is a prototype that simulates environmental readings and presents environmental-quality, smart-waste, and renewable-energy information. The backend is implemented with FastAPI. It generates simulated readings in memory, exposes REST endpoints, and broadcasts live updates over WebSockets. A separate Python client can post telemetry to the server, and an ESP32 Arduino sketch is provided as a hardware-oriented example.

**Prototype note:** The default dashboard data is simulated in software. The ESP32 sketch also currently uses placeholder/mock values for the measurements shown in the sketch. Do not treat the demo values as measurements from calibrated physical sensors.

## 2. Main features

- Simulated temperature, humidity, AQI, PM2.5, PM10, CO₂, pressure, noise, and light readings.
- Simulated waste-bin fill level, weight, methane/odor, and status.
- Simulated solar generation, battery state of charge, grid power, and related energy metrics.
- Presets and anomaly scenarios in the simulation engine.
- FastAPI REST endpoints and a WebSocket endpoint for live updates.
- CSV export endpoint.
- Python telemetry client and an example ESP32 firmware sketch.

Feature availability should be checked in the running prototype; some hardware behavior is illustrative and does not replace real sensor integration.

## 3. Technology stack

- Python 3.10 or later
- FastAPI
- Uvicorn
- Pydantic
- WebSockets
- HTML/CSS/JavaScript assets in `static/` (required for the full dashboard)
- Arduino framework / ESP32 example sketch (optional)

## 4. Repository structure

```text
.
├── server.py
├── client_simulator.py
├── esp32_firmware_sample.ino
├── requirements.txt
├── run.bat
├── robots.txt
├── LICENSE
├── .gitignore
├── README.md
├── docs/
│   └── TECHNICAL_DESIGN.md
├── sample_data/
│   └── environmental_readings.json
├── tests/
│   └── test_cases.md
└── static/
    ├── index.html
    ├── style.css
    └── app.js
```

The `static/` directory and its required files must be included in the repository for the complete web dashboard. Keep any other folders that are required by your actual prototype.

## 5. Prerequisites

- Python 3.10 or later installed and available as `python`
- Git, if cloning the repository
- A modern browser
- Optional: Arduino IDE and an ESP32 board for experimenting with the firmware example

## 6. Installation (Windows PowerShell)

Clone the repository after replacing the example URL with your real GitHub repository URL:

```powershell
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks virtual-environment activation, you can run the environment's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 7. Run the application

### Option A: Windows batch file

From the project root, run:

```powershell
.\run.bat
```

### Option B: Start Uvicorn directly

```powershell
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

When the server starts, open `http://127.0.0.1:8000` in your browser. The dashboard depends on the required files in `static/`.

### Optional: Run the external client simulator

Keep the server running. Open a second terminal in the project root, activate the same virtual environment if needed, and run:

```powershell
python client_simulator.py
```

The simulator posts sample telemetry to `http://127.0.0.1:8000/api/telemetry` every two seconds. Stop it with `Ctrl+C`.

## 8. Environment variables and configuration

The Python server and Python client currently use code-defined defaults; they do not read environment variables for their primary configuration.

- Server default: `127.0.0.1:8000` (see `run.bat` and the `__main__` block in `server.py`).
- Python client endpoint: `http://127.0.0.1:8000/api/telemetry` (see `client_simulator.py`).
- ESP32 sketch: edit `WIFI_SSID`, `WIFI_PASSWORD`, and `SERVER_URL` in `esp32_firmware_sample.ino` before flashing. Use placeholders in the public repository; do not commit real Wi-Fi credentials. `SERVER_URL` must use the reachable LAN IP address of the computer running the server, not `127.0.0.1`, because `127.0.0.1` on the ESP32 would refer to the ESP32 itself.

No `.env` file is required by the current Python code. If environment-variable support is added later, document the actual variable names and provide only safe placeholder values in `.env.example`.

## 9. REST API and WebSocket endpoints

The following endpoints are defined in `server.py`:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Serves the dashboard HTML if `static/index.html` exists |
| `GET` | `/environmental` | Dashboard route |
| `GET` | `/waste` | Dashboard route |
| `GET` | `/renewable` | Dashboard route |
| `GET` | `/energy` | Dashboard route |
| `GET` | `/api/current` | Returns current environmental, energy, waste, alert, preset, and threshold state |
| `POST` | `/api/telemetry` | Accepts a validated environmental telemetry object |
| `POST` | `/api/waste/empty` | Marks a known waste bin as emptied |
| `POST` | `/api/simulate/preset` | Changes the simulation preset |
| `POST` | `/api/simulate/anomaly` | Triggers a named simulation anomaly |
| `POST` | `/api/simulate/control` | Pauses/resumes or changes the simulation interval |
| `GET` | `/api/export/csv` | Exports retained telemetry/energy history as CSV |
| `POST` | `/api/thresholds` | Updates alert thresholds |
| `GET` | `/robots.txt` | Returns crawler policy |
| WebSocket | `/ws` | Sends initial state and live updates; accepts UI actions |

### Example telemetry payload

The `POST /api/telemetry` endpoint requires the fields below (the timestamp and source have defaults):

```json
{
  "timestamp": "2026-10-15T10:00:00",
  "temperature": 24.5,
  "humidity": 55.2,
  "aqi": 38,
  "pm25": 8.2,
  "pm10": 14.0,
  "co2": 590,
  "pressure": 1013.2,
  "noise": 42.0,
  "light": 480,
  "source": "sample-client"
}
```

The API validates the payload using the `TelemetryData` Pydantic model. On successful acceptance, the server returns a success status and message. The endpoint overwrites the submitted source with `hardware` to label readings received through this endpoint.

### WebSocket

- URL: `ws://127.0.0.1:8000/ws`
- The server sends an initial state after a client connects.
- Live telemetry is broadcast by the simulation loop approximately every 1.5 seconds by default.
- The WebSocket accepts JSON actions such as preset changes, anomaly triggers, pause toggles, interval changes, and waste-bin emptying.

## 10. Sample data and testing

- Example telemetry payloads: `sample_data/environmental_readings.json`
- Manual verification plan: `tests/test_cases.md`
- Technical architecture and data flow: `docs/TECHNICAL_DESIGN.md`

Run the test scenarios and update their observed results before claiming that they passed. The sample data is illustrative and is not a record of real-world measurements.

## 11. Security and network notes

- Do not commit Wi-Fi passwords, API keys, tokens, or private `.env` files.
- The sample server configures permissive CORS (`allow_origins=["*"]`). Review and restrict this before exposing the service to an untrusted network.
- The development commands use reload mode and a local bind address; use an appropriate production deployment configuration for public hosting.
- The ESP32 sketch is an example and should be tested safely with the correct network and hardware configuration.

## 12. Known limitations

- Default readings are generated by a software simulation and held in memory; they are not durable database records.
- The Python simulator and ESP32 sketch generate illustrative values unless replaced with actual sensor integrations.
- Hardware readings, electrical characteristics, sensor calibration, and wiring must be verified before real-world use.
- Dashboard availability depends on the front-end files in `static/`.

## 13. Technical design

See [`docs/TECHNICAL_DESIGN.md`](docs/TECHNICAL_DESIGN.md) for the component breakdown, architecture diagram, data flow, API behavior, and limitations.

## 14. License and acknowledgements

This project is distributed under the MIT License; see [`LICENSE`](LICENSE).
