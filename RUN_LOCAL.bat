@echo off
REM SafeGuard Family - Local Development Server

echo.
echo ============================================================
echo  SafeGuard Family - Local Dashboard
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

REM Install dependencies if needed
echo Checking dependencies...
pip install -r requirements.txt > nul 2>&1

REM Start the Flask server
echo.
echo Starting SafeGuard Backend Server...
echo.
python app.py

pause
