# EcoPulse Test Cases

**Important:** These are test procedures, not pre-claimed test results. Run each test in your environment and update `Status` and `Observed Result` honestly.

## TC-01 — Dependency installation
- **Objective:** Confirm the listed Python dependencies install.
- **Steps:** Create and activate a virtual environment; run `pip install -r requirements.txt`.
- **Expected:** Installation completes without unresolved dependency errors.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-02 — Server startup
- **Objective:** Confirm the FastAPI server starts.
- **Steps:** From the project root, run `python -m uvicorn server:app --host 127.0.0.1 --port 8000`.
- **Expected:** Uvicorn reports that the server is running on `http://127.0.0.1:8000`.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-03 — Current-state endpoint
- **Objective:** Check the current-state API.
- **Steps:** With the server running, open `http://127.0.0.1:8000/api/current` in a browser or request it with a REST client.
- **Expected:** A JSON response contains current environmental/energy data, waste state, alerts, preset, and thresholds.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-04 — Valid telemetry submission
- **Objective:** Verify a valid telemetry payload is accepted.
- **Steps:** Send the JSON payload in `sample_data/environmental_readings.json` to `POST http://127.0.0.1:8000/api/telemetry` with `Content-Type: application/json`.
- **Expected:** The server returns a success response.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-05 — Invalid telemetry
- **Objective:** Verify model validation.
- **Steps:** Send a telemetry payload missing a required field such as `temperature`.
- **Expected:** FastAPI/Pydantic rejects the request with a validation error response (normally HTTP 422).
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-06 — Unknown simulation preset
- **Objective:** Verify unsupported presets are rejected.
- **Steps:** POST `{"preset":"Unknown Preset"}` to `/api/simulate/preset`.
- **Expected:** HTTP 400 with an error detail.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-07 — Unknown waste-bin ID
- **Objective:** Verify an unknown bin is not silently accepted.
- **Steps:** POST `{"id":"BIN-UNKNOWN"}` to `/api/waste/empty`.
- **Expected:** HTTP 404 with `Bin not found`.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-08 — CSV export
- **Objective:** Verify history export.
- **Steps:** Request `GET http://127.0.0.1:8000/api/export/csv`.
- **Expected:** The response is a CSV download with a header row and available history rows.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-09 — Python client simulator
- **Objective:** Verify the client can submit telemetry to the local server.
- **Steps:** Keep the server running, open a second terminal, run `python client_simulator.py`.
- **Expected:** The client reports successful telemetry submissions periodically.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-10 — Server unavailable
- **Objective:** Check client behavior when the server is stopped.
- **Steps:** Stop the server and run `python client_simulator.py`.
- **Expected:** The client prints a failure rather than crashing from an unhandled network exception.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-11 — WebSocket connection
- **Objective:** Check live update channel.
- **Steps:** Open the dashboard or connect a WebSocket client to `ws://127.0.0.1:8000/ws`.
- **Expected:** The connection receives an initial JSON state; connected clients receive periodic telemetry broadcasts.
- **Observed result:** Not run.
- **Status:** Not Run.

## TC-12 — Dashboard static files
- **Objective:** Confirm the frontend is included and served.
- **Steps:** Start the server and open `http://127.0.0.1:8000`.
- **Expected:** The dashboard HTML and its referenced static assets load correctly.
- **Observed result:** Not run.
- **Status:** Not Run.
