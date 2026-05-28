@echo off
echo Starting BadmintonIQ Pose Frontend...
cd /d "%~dp0frontend"

if not exist node_modules (
    echo Installing dependencies...
    npm install
)

echo.
echo Frontend running at http://0.0.0.0:5173
echo Phone access: http://YOUR_LOCAL_IP:5173
echo.
npm run dev
