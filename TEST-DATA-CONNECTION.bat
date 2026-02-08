@echo off
REM ═══════════════════════════════════════════════════════════════
REM  SafeGuard Data Connection Test
REM  Tests backend API endpoints and database connectivity
REM ═══════════════════════════════════════════════════════════════

echo.
echo [TEST] SafeGuard Data Connection Verification
echo ═══════════════════════════════════════════════════════════════
echo.

REM Test if Python is running on port 5000
echo [STEP 1] Checking if backend server is running...
netstat -an | findstr ":5000" > nul
if %errorlevel% equ 0 (
    echo ✅ Server is RUNNING on port 5000
) else (
    echo ❌ Server NOT running!
    echo    Please start with: python app.py
    exit /b 1
)

echo.
echo [STEP 2] Testing API endpoints...

REM Test health endpoint
echo Testing /health endpoint...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000/health' -ErrorAction Stop; if($r.StatusCode -eq 200) { Write-Host '✅ Health check: OK' } } catch { Write-Host '❌ Health check failed' }"

echo.
echo [STEP 3] Database Status
echo ═══════════════════════════════════════════════════════════════
echo Database location: instance\safeguard.db
if exist "instance\safeguard.db" (
    echo ✅ Database file EXISTS
    REM Get file size
    for %%A in ("instance\safeguard.db") do (
        echo    Size: %%~zA bytes
        echo    Created: %%~tA
    )
) else (
    echo ⚠️  Database not yet created (will be created on first use)
)

echo.
echo [STEP 4] Accessing Dashboard
echo ═══════════════════════════════════════════════════════════════
echo Your IP: 192.168.254.156
echo.
echo Access at:
echo   - http://localhost:5000 (same computer)
echo   - http://192.168.254.156:5000 (other devices)
echo.

echo [STEP 5] Test Data Features
echo ═══════════════════════════════════════════════════════════════
echo To test data connection:
echo.
echo 1. Open dashboard and register parent account
echo 2. Create child profile
echo 3. Install extension on child device with Child ID
echo 4. Browse websites on child device
echo 5. Check dashboard for:
echo    - History logs (All Visits tab)
echo    - Blocked sites (if visiting blocked content)
echo    - Add custom blocks from dashboard
echo.

echo ═══════════════════════════════════════════════════════════════
echo [SUCCESS] System is ready for data connection testing!
echo ═══════════════════════════════════════════════════════════════
echo.
pause
