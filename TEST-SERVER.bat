@echo off
REM Quick test to verify backend is responding at 192.168.254.156:5000

echo.
echo [TEST] Checking SafeGuard Backend at 192.168.254.156:5000
echo ============================================================
echo.

REM Test if server is listening
echo [1] Checking if server is listening on port 5000...
netstat -an | findstr ":5000" > nul
if %errorlevel% equ 0 (
    echo     ✅ Server IS listening on port 5000
) else (
    echo     ❌ Server NOT running. Start with: python app.py
    pause
    exit /b 1
)

echo.
echo [2] Testing API health endpoint...
powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.254.156:5000/health' -UseBasicParsing -TimeoutSec 5; Write-Host '    ✅ Health endpoint OK (' $response.StatusCode ')'; $content = $response.Content | ConvertFrom-Json; Write-Host '    Backend Version:' $content.version } catch { Write-Host '    ❌ Health check failed:' $_.Exception.Message }"

echo.
echo [3] Testing dashboard access...
powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.254.156:5000/' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '    ✅ Dashboard HTML is accessible' } } catch { Write-Host '    ❌ Dashboard failed:' $_.Exception.Message }"

echo.
echo [4] Testing assets (CSS/JS)...
powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.254.156:5000/assets/config.js' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '    ✅ Assets are loading correctly' } } catch { Write-Host '    ❌ Assets failed:' $_.Exception.Message }"

echo.
echo ============================================================
echo [RESULT] Backend status check complete!
echo.
echo Next steps:
echo 1. Open browser: http://192.168.254.156:5000
echo 2. Open Chrome DevTools (F12) → Console tab
echo 3. Look for any error messages
echo 4. If extension shows error:
echo    - Go to chrome://extensions/
echo    - Find SafeGuard extension
echo    - Click RELOAD button
echo    - Try again
echo.
pause
