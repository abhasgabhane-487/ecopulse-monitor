@echo off
title EcoPulse - Environmental Monitoring Server
echo ========================================================
echo        EcoPulse Environmental Monitoring System
echo ========================================================
echo Starting FastAPI server at http://127.0.0.1:8000 ...
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
pause
