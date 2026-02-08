@echo off
echo ========================================
echo  BEHAVIOR TRACKING - QUICK START
echo ========================================
echo.

echo [1/4] Checking backend...
timeout /t 2 /nobreak >nul

cd /d "%~dp0"

echo [2/4] Testing health endpoint...
curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend not running on port 8000
    echo.
    echo Please start backend first:
    echo   python backend_final.py
    echo.
    pause
    exit /b 1
)

echo [3/4] Testing behavior tracking endpoint...
curl -s -X POST http://localhost:8000/api/track-video -H "Content-Type: application/json" -d "{\"url\":\"https://facebook.com/reel/test\",\"child_id\":\"test\"}" >nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo [4/4] SUCCESS! Behavior tracking is working!
    echo.
    echo ========================================
    echo  NEXT STEPS:
    echo ========================================
    echo.
    echo 1. Reload Chrome Extension:
    echo    - Go to: chrome://extensions
    echo    - Find: SafeGuard Family
    echo    - Click: Reload button
    echo.
    echo 2. Test on Facebook:
    echo    - Go to: facebook.com
    echo    - Watch any video/reel
    echo    - Press F12 and check Console
    echo.
    echo 3. Expected Console Output:
    echo    - "USER BEHAVIOR TRACKING ACTIVE"
    echo    - "Video Detected!"
    echo    - "Backend Response: success"
    echo.
    echo 4. Check Backend Terminal for:
    echo    - "Video Tracked: ..."
    echo    - "Categories: ..."
    echo.
    echo ========================================
    echo  DOCUMENTATION:
    echo ========================================
    echo.
    echo - Full Guide: TEST-BEHAVIOR-TRACKING.md
    echo - Summary: INTEGRATION-COMPLETE.md
    echo - Test Script: test_behavior_tracking.py
    echo.
) else (
    echo ERROR: Behavior tracking endpoint not responding
    echo.
    echo Please check backend logs for errors.
    echo.
)

echo ========================================
pause
