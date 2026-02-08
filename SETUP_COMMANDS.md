# SafeGuard Family - Complete Setup Commands & Verification Guide

## 🚀 QUICK START - Copy & Paste Commands

### Option 1: Automatic Setup (Recommended)

**For Windows (PowerShell):**
```powershell
cd c:\Users\acer\OneDrive\Desktop\ComFilter
powershell -ExecutionPolicy Bypass -File setup.ps1
```

**For Windows (Command Prompt):**
```cmd
cd c:\Users\acer\OneDrive\Desktop\ComFilter
setup_and_run.bat
```

---

## 📋 MANUAL STEP-BY-STEP SETUP

### Step 1: Navigate to Project Directory
```bash
cd c:\Users\acer\OneDrive\Desktop\ComFilter
```

**Verify you see:**
- `backend_enhanced.py`
- `requirements_enhanced.txt`
- `chrome-extension/` folder
- `.env` file (create if missing)

---

### Step 2: Create .env File (if not exists)

**Create file**: `c:\Users\acer\OneDrive\Desktop\ComFilter\.env`

**Content:**
```env
DATABASE_URL=sqlite:///./video_downloader.db
JWT_SECRET=safeguard-family-secret-2026
GROQ_API_KEY=your_groq_api_key_here_from_console.groq.com
API_KEY=60113a172a6391a21af8032938e8febd
```

**Get Groq API Key:**
1. Go to https://console.groq.com
2. Sign up/Login
3. Create new API key
4. Copy and paste into .env

---

### Step 3: Install Python Dependencies

```bash
pip install -r requirements_enhanced.txt
```

**Expected output:**
```
Successfully installed fastapi uvicorn sqlalchemy groq python-dotenv...
```

**If you get errors:**
```bash
pip install --upgrade pip
pip install -r requirements_enhanced.txt --no-cache-dir
```

---

### Step 4: Verify Installation

**Check Python packages:**
```bash
python -c "import fastapi; import sqlalchemy; import groq; print('✓ All packages installed')"
```

**Check backend file:**
```bash
python -c "from backend_enhanced import app; print('✓ Backend loaded successfully')"
```

---

### Step 5: Test Database Connection

```bash
python -c "from backend_enhanced import db, Parent, Child; print('✓ Database initialized')"
```

---

## 🎬 START THE BACKEND SERVER

### Command to Run:

```bash
python backend_enhanced.py
```

### Expected Output:
```
🚀 Starting Enhanced Video Analyzer Server...
📁 Videos will be saved to: /home/madan/WebDev/SocialMediaParentsCare/backend/Videos
🎵 Using yt-dlp with audio support and LLM analysis
👨‍👩‍👧 Parent-Child authentication enabled
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Keep this terminal open while testing!**

---

## ✅ VERIFY BACKEND IS WORKING

### In a NEW terminal/PowerShell:

**Test 1: Check Health Status**
```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "Enhanced Video Analyzer with Parental Controls",
  "version": "2.0.0",
  "features": ["Video Download", "Audio Transcription", "LLM Analysis", "Weekly Reports", "Parent Authentication"]
}
```

**Test 2: Check API Root**
```bash
curl http://localhost:8000/api
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "Enhanced Video Analyzer API",
  "version": "2.0.0",
  "endpoints": { ... }
}
```

---

## 📱 LOAD CHROME EXTENSION

### Steps:

1. **Open Chrome** and go to: `chrome://extensions`

2. **Enable Developer Mode** (toggle in top right corner)

3. **Click "Load unpacked"** button

4. **Select folder**: `c:\Users\acer\OneDrive\Desktop\ComFilter\chrome-extension`

5. **Extension will appear** - Click it to open auth.html

6. **You should see** the login/register page with SafeGuard branding

---

## 🧪 FULL SYSTEM TEST

### Test 1: Parent Registration via API

**Terminal Command:**
```bash
curl -X POST http://localhost:8000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"parent@test.com\",\"password\":\"test123\",\"full_name\":\"Test Parent\"}"
```

**Expected response:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "parent": {
    "id": "uuid-here",
    "email": "parent@test.com",
    "full_name": "Test Parent"
  },
  "expires_in": 86400
}
```

**Save the token from response:**
```
TOKEN=eyJhbGciOiJIUzI1NiIs...
```

---

### Test 2: Add a Child

```bash
curl -X POST http://localhost:8000/api/children ^
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Johnny\",\"device_id\":\"chrome_device_001\"}"
```

**Expected response:**
```json
{
  "status": "success",
  "child": {
    "id": "child-uuid",
    "name": "Johnny",
    "device_id": "chrome_device_001",
    "created_at": "2026-02-08T..."
  }
}
```

**Save the child_id:**
```
CHILD_ID=child-uuid
```

---

### Test 3: List Children

```bash
curl http://localhost:8000/api/children ^
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>"
```

**Expected response:**
```json
{
  "status": "success",
  "count": 1,
  "children": [
    {
      "id": "child-uuid",
      "name": "Johnny",
      "device_id": "chrome_device_001",
      "created_at": "2026-02-08T...",
      "videos_count": 0
    }
  ]
}
```

---

### Test 4: Get Weekly Report (Empty)

```bash
curl http://localhost:8000/api/reports/weekly/<CHILD_ID> ^
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>"
```

**Expected response:**
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

## 🔗 CONNECTIVITY VERIFICATION

### Is Backend Running?
```bash
netstat -ano | findstr :8000
```
**Should show a process listening on port 8000**

### Can Access API?
```bash
curl -I http://localhost:8000/health
```
**Should return HTTP/1.1 200 OK**

### Is Database Working?
```bash
python -c "from backend_enhanced import db; print('✓ Database connected')"
```

### Are All Extensions Files Present?
```bash
dir chrome-extension /b
```
**Should show:**
```
auth.html
background_auth.js
dashboard_enhanced.html
child.html
parent_reports.html
config_extended.js
manifest.json
icons\
```

---

## 📊 SYSTEM ARCHITECTURE VERIFICATION

```
Your Computer
│
├─ Command Prompt/PowerShell
│  └─ Runs: python backend_enhanced.py
│     └─ Listens on http://localhost:8000
│
├─ Chrome Browser
│  ├─ Extension loaded from chrome-extension/
│  │  ├─ auth.html (login page)
│  │  ├─ dashboard_enhanced.html (main dashboard)
│  │  ├─ background_auth.js (handles tracking & sync)
│  │  ├─ child.html (child view)
│  │  └─ parent_reports.html (reports)
│  │
│  └─ Can send requests to:
│     └─ http://localhost:8000/api/*
│
├─ Database (SQLite)
│  ├─ Location: ./video_downloader.db
│  ├─ Tables: parents, children, video_analyses, weekly_reports
│  └─ Auto-created on first run
│
└─ External APIs
   ├─ Groq LLM API (for summaries)
   ├─ Groq Whisper API (for transcription)
   └─ Facebook (for video/comment collection)
```

---

## 🎯 EVERYTHING WORKING CHECKLIST

- [ ] Backend starts: `python backend_enhanced.py`
- [ ] /health endpoint returns 200: http://localhost:8000/health
- [ ] /api endpoint accessible: http://localhost:8000/api
- [ ] Extension loads in chrome://extensions
- [ ] auth.html opens when clicking extension
- [ ] Parent registration works (API test above)
- [ ] Add child works (API test above)
- [ ] Can login via UI
- [ ] Dashboard loads after login
- [ ] Child mode works
- [ ] Database file created: video_downloader.db
- [ ] All extension files are present

---

## 🚨 COMMON ERRORS & FIXES

### Error: "Port 8000 already in use"
```bash
# Find and kill the process
netstat -ano | findstr :8000
taskkill /F /PID <PID>

# Then restart
python backend_enhanced.py
```

### Error: "Module not found: fastapi"
```bash
pip install -r requirements_enhanced.txt --no-cache-dir
```

### Error: "No module named 'groq'"
```bash
pip install groq --upgrade
```

### Error: ".env file not found"
Create the file with required variables (see Step 2 above)

### Error: "Cannot connect to http://localhost:8000"
- Verify backend is running
- Check port 8000 is not blocked by firewall
- Try: `curl http://127.0.0.1:8000/health`

### Error: "Invalid JWT token"
- Re-login to get fresh token
- Tokens expire after 24 hours
- Clear chrome.storage.local in DevTools

---

## 📞 QUICK TROUBLESHOOTING

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check if port is in use
netstat -ano | findstr :8000

# Check Python version
python --version

# Check installed packages
pip list | findstr fastapi

# Clear Python cache
rmdir __pycache__ /s /q

# Test database
python -c "from sqlalchemy import create_engine; engine = create_engine('sqlite:///./video_downloader.db'); print('✓ DB OK')"

# View recent logs
type video_downloader.db
```

---

## ✨ YOU'RE READY!

```
Backend Server: python backend_enhanced.py
Extension: chrome://extensions → Load unpacked → chrome-extension folder
API: http://localhost:8000
Documentation: QUICK_START.md and IMPLEMENTATION_GUIDE.md
```

**Everything is connected and ready to use!** 🎉
