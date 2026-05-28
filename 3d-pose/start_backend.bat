@echo off
echo Starting BadmintonIQ Pose Backend (HTTPS)...
cd /d "%~dp0backend"

echo.
echo Backend running at https://0.0.0.0:8000
echo Phone camera requires HTTPS - accept the browser security warning on your phone.
echo.
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload --ssl-certfile cert.pem --ssl-keyfile key.pem
