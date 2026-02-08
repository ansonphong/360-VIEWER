@echo off
REM Windows batch script for starting development server
REM Double-click to run

REM Get the directory where this script is located
cd /d "%~dp0.."

echo.
echo ===================================
echo  Phong 360 Viewer Dev Server
echo ===================================
echo.
echo Starting server at http://localhost:8080
echo Press Ctrl+C to stop
echo.

REM Start Python HTTP server
python -m http.server 8080
