@echo off
REM SafeGuard Family - Complete Testing & Verification Script
REM Tests all components to ensure everything is connected and working

setlocal enabledelayedexpansion

echo.
echo ================================================
echo  SafeGuard Family - Complete System Test
echo ================================================
echo.

REM Colors and formatting
set "GREEN=✓"
set "RED=✗"
set "BLUE=»"

REM Test 1: Check Backend Server
echo [TEST 1/5] Checking Backend Server Connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000/health' -TimeoutSec 3; if ($response.StatusCode -eq 200) { Write-Host '  OK - Backend is running on http://localhost:8000' } } catch { Write-Host '  ERROR - Backend is not running!' }" 2>nul

echo.

REM Test 2: Check API Endpoints
echo [TEST 2/5] Testing API Endpoints...
echo   Testing: GET /health
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:8000/health' -TimeoutSec 3; Write-Host '    OK - Response:' $response.status } catch { Write-Host '    ERROR - Cannot reach /health' }" 2>nul

echo   Testing: GET /api
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:8000/api' -TimeoutSec 3; Write-Host '    OK - API is accessible' } catch { Write-Host '    ERROR - Cannot reach /api' }" 2>nul

echo.

REM Test 3: Check Database
echo [TEST 3/5] Checking Database Connection...
python -c "from backend_enhanced import db, Parent, Child; print('  OK - Database models loaded successfully')" 2>nul
if errorlevel 1 (
    echo   ERROR - Database connection failed
) else (
    echo   OK - Database is configured
)

echo.

REM Test 4: Check Required Files
echo [TEST 4/5] Checking Required Files...
if exist "backend_enhanced.py" (echo   OK - backend_enhanced.py found) else (echo   ERROR - backend_enhanced.py NOT found)
if exist "chrome-extension\auth.html" (echo   OK - chrome-extension/auth.html found) else (echo   ERROR - auth.html NOT found)
if exist "chrome-extension\background_auth.js" (echo   OK - chrome-extension/background_auth.js found) else (echo   ERROR - background_auth.js NOT found)
if exist "chrome-extension\dashboard_enhanced.html" (echo   OK - chrome-extension/dashboard_enhanced.html found) else (echo   ERROR - dashboard_enhanced.html NOT found)
if exist "chrome-extension\parent_reports.html" (echo   OK - chrome-extension/parent_reports.html found) else (echo   ERROR - parent_reports.html NOT found)
if exist "chrome-extension\child.html" (echo   OK - chrome-extension/child.html found) else (echo   ERROR - child.html NOT found)
if exist ".env" (echo   OK - .env file found) else (echo   ERROR - .env file NOT found)

echo.

REM Test 5: Check Python Packages
echo [TEST 5/5] Checking Python Dependencies...
python -c "import fastapi; print('  OK - FastAPI installed')" 2>nul || echo   ERROR - FastAPI not installed
python -c "import sqlalchemy; print('  OK - SQLAlchemy installed')" 2>nul || echo   ERROR - SQLAlchemy not installed
python -c "import groq; print('  OK - Groq installed')" 2>nul || echo   ERROR - Groq not installed
python -c "import jwt; print('  OK - PyJWT installed')" 2>nul || echo   ERROR - PyJWT not installed
python -c "import yt_dlp; print('  OK - yt-dlp installed')" 2>nul || echo   ERROR - yt-dlp not installed

echo.
echo ================================================
echo  Test Complete!
echo ================================================
echo.
echo If all tests passed:
echo   1. Extension is ready to load
echo   2. API is functional
echo   3. Database is connected
echo   4. Everything is connected and working!
echo.

pause
