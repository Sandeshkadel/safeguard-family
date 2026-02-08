# 🚀 SAFEGUARD FAMILY - COMPLETE COMMAND PROMPT GUIDE
## Full Commands to Run Everything & Verify Connectivity

---

## 📌 QUICK COPY-PASTE COMMANDS

### For Windows PowerShell (Recommended):

```powershell
# Navigate to project
cd c:\Users\acer\OneDrive\Desktop\ComFilter

# Run automatic setup
powershell -ExecutionPolicy Bypass -File setup.ps1
```

### For Windows Command Prompt:

```cmd
# Navigate to project
cd c:\Users\acer\OneDrive\Desktop\ComFilter

# Run batch script
setup_and_run.bat
```

### For Manual Setup (Command Prompt):

```cmd
# 1. Navigate to project
cd c:\Users\acer\OneDrive\Desktop\ComFilter

# 2. Install dependencies
pip install -r requirements_enhanced.txt

# 3. Start backend server
python backend_enhanced.py
```

---

## 📋 DETAILED STEP-BY-STEP COMMANDS

### STEP 1: Open Terminal/PowerShell

Windows 11/10:
- Press `Win + X` → Select "Windows Terminal" or "Command Prompt"
- OR Search for "Command Prompt" or "PowerShell"

### STEP 2: Navigate to Project Directory

```cmd
cd c:\Users\acer\OneDrive\Desktop\ComFilter
```

Verify you're in correct directory:
```cmd
dir
```

You should see:
```
backend_enhanced.py
requirements_enhanced.txt
chrome-extension/
.env (or create it)
```

### STEP 3: Create .env File (if missing)

**Check if .env exists:**
```cmd
type .env
```

**If not found, create it:**
```cmd
echo DATABASE_URL=sqlite:///./video_downloader.db > .env
echo JWT_SECRET=safeguard-family-secret-2026 >> .env
echo GROQ_API_KEY=your_api_key_here >> .env
echo API_KEY=60113a172a6391a21af8032938e8febd >> .env
```

**Edit .env to add real Groq API key:**
- Get key from https://console.groq.com
- Open `.env` in notepad and paste your key

### STEP 4: Install Python Packages

```cmd
pip install -r requirements_enhanced.txt
```

**Wait for completion.** Expected output ends with:
```
Successfully installed fastapi uvicorn sqlalchemy groq...
```

### STEP 5: Test Installation

```cmd
python -c "import fastapi, sqlalchemy, groq; print('✓ All packages OK')"
```

Should show: `✓ All packages OK`

---

## 🎬 START THE BACKEND SERVER

### The Command:

```cmd
python backend_enhanced.py
```

### Expected Output (You'll See):

```
🚀 Starting Enhanced Video Analyzer Server...
📁 Videos will be saved to: /home/madan/WebDev/SocialMediaParentsCare/backend/Videos
🎵 Using yt-dlp with audio support and LLM analysis
👨‍👩‍👧 Parent-Child authentication enabled
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

**Keep this window open!** The backend must be running.

---

## ✅ VERIFY BACKEND IS RUNNING (NEW TERMINAL)

**Open a NEW Command Prompt/PowerShell** while backend is running.

### Test 1: Health Check

```cmd
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Enhanced Video Analyzer with Parental Controls",
  "version": "2.0.0"
}
```

### Test 2: Check API Endpoints

```cmd
curl http://localhost:8000/api
```

Expected response: JSON with all endpoints listed

### Test 3: Verify Port

```cmd
netstat -ano | findstr :8000
```

Should show a process listening on port 8000

---

## 🔑 TEST PARENT REGISTRATION

If curl is not available, use PowerShell:

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body '{"email":"demo@test.com","password":"demo123","full_name":"Demo Parent"}'
$response | ConvertTo-Json
```

Or with curl (Command Prompt):

```cmd
curl -X POST http://localhost:8000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"demo@test.com\",\"password\":\"demo123\",\"full_name\":\"Demo Parent\"}"
```

Expected response:
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "parent": {
    "id": "uuid-value",
    "email": "demo@test.com",
    "full_name": "Demo Parent"
  },
  "expires_in": 86400
}
```

**Save the token**, you'll need it for next tests.

---

## 👶 TEST ADD CHILD

Replace `<TOKEN_HERE>` with actual token from previous step:

```cmd
curl -X POST http://localhost:8000/api/children ^
  -H "Authorization: Bearer <TOKEN_HERE>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Johnny\",\"device_id\":\"device_001\"}"
```

Expected response:
```json
{
  "status": "success",
  "child": {
    "id": "child-uuid",
    "name": "Johnny",
    "device_id": "device_001",
    "created_at": "2026-02-08T..."
  }
}
```

---

## 📊 TEST GET WEEKLY REPORT

Replace `<TOKEN_HERE>` and `<CHILD_ID>` with actual values:

```cmd
curl http://localhost:8000/api/reports/weekly/<CHILD_ID> ^
  -H "Authorization: Bearer <TOKEN_HERE>"
```

Expected response:
```json
{
  "status": "success",
  "report": {
    "week_start": "2026-02-01T...",
    "week_end": "2026-02-08T...",
    "total_videos": 0,
    "total_duration_minutes": 0,
    "videos": [],
    "child_name": "Johnny"
  }
}
```

---

## 📱 LOAD EXTENSION IN CHROME

### Manual Steps:

1. **Open Chrome**
2. Type in address bar: `chrome://extensions`
3. **Toggle "Developer mode"** (upper right corner)
4. **Click "Load unpacked"** button
5. **Select folder**: `c:\Users\acer\OneDrive\Desktop\ComFilter\chrome-extension`
6. **Click "Open"**
7. Extension will appear in your extensions list
8. **Click extension icon** to see auth.html

---

## 📋 CONNECTIVITY VERIFICATION COMMANDS

Run these to verify everything is connected:

### Check Backend Running:
```cmd
curl http://localhost:8000/health
```
Should return status: `healthy`

### Check Port 8000:
```cmd
netstat -ano | findstr :8000
```
Should show a listening process

### Check Database:
```cmd
python -c "from backend_enhanced import db; print('✓ Database OK')"
```
Should show: `✓ Database OK`

### List Extension Files:
```cmd
dir chrome-extension
```
Should show all .html, .js files

### Check Python Packages:
```cmd
pip list | findstr fastapi
```
Should show: `fastapi  0.104.1` or similar

---

## 🎯 SYSTEM STATUS DASHBOARD

### All Systems Check:

```powershell
# Run all tests in sequence
Write-Host "Backend Health:" -ForegroundColor Yellow
curl http://localhost:8000/health | ConvertFrom-Json | Select status, service

Write-Host "`nDatabase Status:" -ForegroundColor Yellow
python -c "from backend_enhanced import db; print('✓ Connected')"

Write-Host "`nPort Status:" -ForegroundColor Yellow
netstat -ano | findstr :8000 | Select-Object -First 1

Write-Host "`nPython Packages:" -ForegroundColor Yellow
pip list | findstr "fastapi uvicorn sqlalchemy groq"
```

---

## 🔄 FULL AUTOMATION SCRIPT

Save this as `run_all.bat`:

```batch
@echo off
title SafeGuard Family - Complete Setup

echo.
echo ================================================
echo    SafeGuard Family - Full Setup
echo ================================================
echo.

REM Install dependencies
echo [1/4] Installing dependencies...
pip install -r requirements_enhanced.txt
echo [2/4] Dependencies installed

REM Check .env
if not exist .env (
    echo [3/4] Creating .env file...
    echo DATABASE_URL=sqlite:///./video_downloader.db > .env
    echo JWT_SECRET=safeguard-family-secret-2026 >> .env
    echo GROQ_API_KEY=your_key_here >> .env
    echo API_KEY=60113a172a6391a21af8032938e8febd >> .env
    echo Please edit .env with your Groq API key!
    pause
)

REM Start backend
echo.
echo [4/4] Starting backend server...
echo.
echo Backend will run on http://localhost:8000
echo.
python backend_enhanced.py

pause
```

Run with: `run_all.bat`

---

## 🆘 QUICK FIX COMMANDS

### Port 8000 Already in Use:
```cmd
netstat -ano | findstr :8000
taskkill /F /PID <PID_NUMBER>
```

### Reinstall All Packages:
```cmd
pip uninstall -y fastapi uvicorn sqlalchemy groq pydantic
pip install -r requirements_enhanced.txt
```

### Clear Python Cache:
```cmd
rmdir __pycache__ /s /q
rmdir chrome-extension\__pycache__ /s /q
```

### Reset Database:
```cmd
del video_downloader.db
python backend_enhanced.py
```

### Check Logs:
```cmd
python backend_enhanced.py 2>&1 | tee log.txt
```

---

## 📊 FINAL VERIFICATION CHECKLIST

Copy this and run each command:

```cmd
REM 1. Backend Running
curl http://localhost:8000/health

REM 2. API Accessible
curl http://localhost:8000/api

REM 3. Database Exists
dir /b video_downloader.db

REM 4. Extension Files Present
dir chrome-extension\*.html
dir chrome-extension\*.js

REM 5. Python Packages
pip show fastapi

REM 6. Port in Use
netstat -ano | findstr :8000

REM 7. .env File
type .env
```

All should succeed! ✓

---

## 🎉 EVERYTHING IS WORKING WHEN:

✅ Backend starts with "Uvicorn running on http://127.0.0.1:8000"  
✅ curl http://localhost:8000/health returns status: healthy  
✅ Parent registration API returns token  
✅ Child add API returns child_id  
✅ Extension loads in chrome://extensions  
✅ auth.html appears when clicking extension  
✅ Database file exists (video_downloader.db)  
✅ No errors in any command outputs  

---

## 📞 SUPPORT SUMMARY

**Issue**: Backend won't start  
**Fix**: Check Python 3.8+, reinstall packages

**Issue**: "Port already in use"  
**Fix**: Kill process on 8000: `taskkill /F /PID <number>`

**Issue**: "Module not found"  
**Fix**: `pip install -r requirements_enhanced.txt`

**Issue**: API returns 401  
**Fix**: Token expired, re-register

**Issue**: Extension won't load  
**Fix**: Developer mode on, correct folder selected

---

## 🚀 NEXT STEPS

1. **Backend Running** → `python backend_enhanced.py`
2. **Extension Loaded** → chrome://extensions
3. **Parent Registration** → Click extension, register
4. **Add Child** → Dashboard → Add child device
5. **Child Mode** → Click extension → "Continue as Child"
6. **View Reports** → Parent dashboard → Select child

---

**Everything is connected and fully functional! You're ready to use SafeGuard Family! 🎉**

Version: 2.0.0 | Date: February 8, 2026
