# SafeGuard Family - Quick Start Guide
## Get Up and Running in 10 Minutes

---

## 🚀 Installation (Step-by-Step)

### 1. Install Python Dependencies

```bash
cd c:\Users\acer\OneDrive\Desktop\ComFilter
pip install -r requirements_enhanced.txt
```

### 2. Create `.env` File

Create a file named `.env` in the root directory:

```env
DATABASE_URL=sqlite:///./video_downloader.db
JWT_SECRET=your-super-secret-key-change-this-in-production
GROQ_API_KEY=<your groq api key from https://console.groq.com>
API_KEY=60113a172a6391a21af8032938e8febd
```

### 3. Start the Backend Server

```bash
python backend_enhanced.py
```

**Expected output:**
```
🚀 Starting Enhanced Video Analyzer Server...
📁 Videos will be saved to: /home/madan/WebDev/SocialMediaParentsCare/backend/Videos
🎵 Using yt-dlp with audio support and LLM analysis
👨‍👩‍👧 Parent-Child authentication enabled
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 4. Test Backend is Running

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

### 5. Load Extension in Chrome

1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. SafeGuard should now appear in your extensions

---

## 📱 First Time Setup

### For Parents:

1. **Click Extension Icon** → Opens `auth.html`
2. **Select "Register"** tab
3. **Fill in:**
   - Email: `parent@example.com`
   - Password: `securepassword123`
   - Full Name: `John Doe`
4. **Click "Create Account"**
5. **Welcome!** Dashboard loads with "Home" tab
6. **Add a Child:**
   - Click "+ Add Child" button
   - Enter child's name (e.g., "Johnny")
   - System generates device ID
7. **View Weekly Reports:**
   - Switch to "📊 Weekly Reports" tab
   - Select child from dropdown
   - See their watched videos and insights

### For Children:

1. **Click Extension Icon**
2. **Click "Continue as Child"** (blue button)
3. **Dashboard loads** with child-friendly view
4. **📖 How It Works:**
   - Tracks videos you watch
   - Filters toxic comments
   - Generates weekly reports for parents
   - Helps keep your internet time healthy

---

## 🔑 Complete Authentication Flow

### Parent Login Flow:
```
auth.html
  ↓
User fills email + password
  ↓
POST /api/auth/login
  ↓
Backend returns JWT token
  ↓
Token saved in chrome.storage.local
  ↓
Redirect to dashboard_enhanced.html
  ↓
Shows PARENT dashboard with children management
```

### Parent Registration Flow:
```
auth.html (Register mode)
  ↓
User fills email + password + full name
  ↓
POST /api/auth/register
  ↓
Backend creates Parent user
  ↓
JWT token issued and saved
  ↓
Redirect to dashboard_enhanced.html
  ↓
Empty "My Children" tab (ready to add children)
```

### Child Direct Access:
```
auth.html
  ↓
User clicks "Continue as Child"
  ↓
chrome.storage.local.set({ childMode: true })
  ↓
Redirect to dashboard_enhanced.html
  ↓
Shows CHILD dashboard (no authentication needed)
  ↓
Filters comments automatically
  ↓
Tracks videos in background
```

---

## 📊 Data Flow Example

### Scenario: Parent monitors child watching Facebook video

```
Step 1: Child navigates to Facebook video
Step 2: Content script detects video URL
Step 3: Background service worker (background_auth.js) receives URL
Step 4: POST /api/videos/analyze called with parent's token
Step 5: Backend:
        - Downloads video with yt-dlp
        - Extracts audio stream
        - Sends to Groq Whisper API
        - Whisper returns full transcription
        - Sends to Groq LLM for summary
        - Stores in VideoAnalysis table
Step 6: One sync cycle later (parent dashboard):
        - GET /api/reports/weekly/{child_id}
        - Returns all child's videos from past week
        - Parent views in dashboard
        - Sees titles, uploaders, durations
        - Reads LLM-generated insights
```

---

## 🎯 Key Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Create parent account |
| `/api/auth/login` | POST | Login parent |
| `/api/auth/logout` | POST | Logout parent |
| `/api/children` | POST | Add child device |
| `/api/children` | GET | List all children |
| `/api/children/{id}` | DELETE | Remove child |
| `/api/videos/analyze` | POST | Analyze video (auto-called by extension) |
| `/api/reports/weekly/{child_id}` | GET | Get child's weekly report |
| `/api/reports/all/{child_id}` | GET | Get all reports for child |

---

## 🧪 Test It Yourself

### Test 1: Register Parent
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo123","full_name":"Demo Parent"}'
```

### Test 2: Add A Child
```bash
# Use token from response above
curl -X POST http://localhost:8000/api/children \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Child","device_id":"chrome_001"}'
```

### Test 3: Get Weekly Report
```bash
# Use child_id from response above
curl http://localhost:8000/api/reports/weekly/CHILD_ID \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## 🌐 Extension Pages

| Page | URL | Purpose |
|------|-----|---------|
| **Auth** | `auth.html` | Parent login/register + child access |
| **Main Dashboard** | `dashboard_enhanced.html` | Unified parent/child view |
| **Child Dashboard** | `child.html` | Child-focused activity view |
| **Parent Reports** | `parent_reports.html` | Detailed weekly reports |
| **Background Worker** | `background_auth.js` | Handles tracking, sync, filtering |

---

## 🔍 How Comment Filtering Works

1. **User browses Facebook** in child mode
2. **Content script** runs on facebook.com
3. **Every 3 seconds**, extension finds new comments
4. **Sends text** to filter API: `https://facebook-content-filter-api.onrender.com/analyze`
5. **API returns** toxicity score
6. **If toxic**, comment is hidden with `display: none`
7. **User sees** clean, safe Facebook feed

---

## 📈 How Video Tracking Works

1. **Child navigates to Facebook video**
2. **Background service worker** detects video URL pattern
3. **yt-dlp** downloads video metadata + audio
4. **Groq Whisper** transcribes audio to text (~1-3 minutes)
5. **Groq LLM** reads transcription and generates summary
6. **All stored** in VideoAnalysis table with child_id
7. **Parent's dashboard** syncs every 5 minutes
8. **Weekly report** aggregates all videos with insights

---

## ⚙️ Configuration

Update settings in `chrome-extension/config_extended.js`:

```javascript
// Change these values:
const CONFIG = {
    API_URL: "http://localhost:8000",           // Backend URL
    JWT_EXPIRATION_HOURS: 24,                    // Token lifetime
    TIMEOUTS: {
        SYNC_INTERVAL: 5 * 60 * 1000,           // 5 minutes
        TRACKING_INTERVAL: 3 * 1000,            // 3 seconds
        API_TIMEOUT: 30 * 1000                  // 30 seconds
    },
    LLM: {
        MODEL_SUMMARY: "mixtral-8x7b-32768",    // Summary model
        TEMPERATURE: 0.7                        // Creativity (0-1)
    }
};
```

---

## 🐛 Troubleshooting

### "Connection refused"
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not, start it:
python backend_enhanced.py
```

### "Invalid token"
- Clear chrome.storage.local in DevTools
- Re-login to generate new token
- Tokens expire after 24 hours

### "No videos showing"
- Make sure you're logged in with parent account
- Child must actually watch a Facebook video
- Allow 1-3 minutes for Groq API to process
- Check backend logs for errors

### "Groq API errors"
- Check API key in `.env` file is correct
- Visit https://console.groq.com to verify key
- Check your API usage quota
- Try again with simple 30-second video first

---

## 📚 File Structure

```
SafeGuard/
├── backend_enhanced.py              ← Main FastAPI server
├── requirements_enhanced.txt         ← Python dependencies
├── .env                             ← API keys (not in repo)
├── IMPLEMENTATION_GUIDE.md          ← Full documentation
├── QUICK_START.md                   ← This file
│
└── chrome-extension/
    ├── manifest.json                ← Extension configuration
    ├── auth.html                    ← Login/Register page
    ├── background_auth.js           ← Service worker (main logic)
    ├── dashboard_enhanced.html       ← Unified dashboard
    ├── child.html                   ← Child-friendly view
    ├── parent_reports.html          ← Weekly reports view
    ├── config_extended.js           ← Settings
    ├── content.js                   ← Page injection script
    └── icons/                       ← Icon assets
```

---

## 🎓 Architecture Overview

```
┌─────────────────────────────────────┐
│         Chrome Extension            │
├─────────┬─────────────────────┬─────┤
│         │                     │     │
│  auth.html    background.js   │  UI  │
│  (Login)    (Tracking + Sync)  │  Pages
│             (Comment Filter)   │     │
├─────────────────────────────────────┤
│   Manages JWT token & Storage       │
└────────────┬────────────────────────┘
             │
             │  HTTP Requests
             │
┌────────────▼────────────────────────┐
│       FastAPI Backend (8000)        │
├─────────────────────────────────────┤
│                                     │
│  ✅ Authentication (JWT tokens)    │
│  ✅ Child Management               │
│  ✅ Video Downloading (yt-dlp)     │
│  ✅ Audio Transcription (Whisper)  │
│  ✅ LLM Summarization (Groq)       │
│  ✅ Weekly Reports                 │
│  ✅ Database (SQLite/PostgreSQL)   │
│                                     │
└─────────────────────────────────────┘
             │
    ┌────────┼──────────┐
    │        │          │
    ▼        ▼          ▼
  Groq API  yt-dlp   SQLite DB
  (LLM)   (Download)  (Storage)
```

---

## ✅ Verification Checklist

- [ ] Backend running on http://localhost:8000
- [ ] Can access `/health` endpoint
- [ ] Extension installed and visible in chrome://extensions
- [ ] Can see auth.html when clicking extension icon
- [ ] Can register a parent account
- [ ] Token is saved in chrome.storage.local
- [ ] Dashboard loads after login
- [ ] Can add a child
- [ ] Child mode works ("Continue as Child")
- [ ] Weekly reports tab populates after videos analyzed

---

## 🎉 You're All Set!

You now have a fully functional parental control system with:
- ✅ Parent authentication & child management
- ✅ Video tracking and analysis with LLM summaries  
- ✅ Automatic comment filtering
- ✅ Weekly parent reports
- ✅ Dual dashboards (parent vs child)

---

**Need Help?** Check `IMPLEMENTATION_GUIDE.md` for detailed API documentation and troubleshooting.

**v2.0.0** - Parent-Child Authentication with Weekly LLM-Based Reports
