# SafeGuard Family - Implementation Guide
## Parent-Child Authentication with Video Analysis & Weekly Reports

---

## 📋 Overview

This guide walks you through implementing the complete SafeGuard system with:
- **Parent/Child Authentication**: Secure login system for parents and child access
- **Video Analysis**: Download, transcribe, and analyze Facebook videos using LLM
- **Weekly Reports**: Generate insights based on child's video watching behavior
- **Comment Filtering**: Automatic toxic comment filtering on Facebook
- **Dual Dashboard**: Different UI for parents (reports) vs children (activity tracking)

---

## 🚀 Setup Instructions

### Step 1: Backend Setup

#### Prerequisites
```bash
pip install fastapi uvicorn sqlalchemy groq python-dotenv python-jwt yt-dlp
```

#### Create `.env` file in root directory:
```env
DATABASE_URL=sqlite:///./video_downloader.db
JWT_SECRET=your-secret-key-change-in-production
GROQ_API_KEY=your_groq_api_key_here
API_KEY=60113a172a6391a21af8032938e8febd
```

#### Run the backend:
```bash
python backend_enhanced.py
```

Server will start at: `http://127.0.0.1:8000`

**Verify it's working:**
```bash
curl http://localhost:8000/health
# Expected response:
# {"status":"healthy","service":"Enhanced Video Analyzer...","version":"2.0.0",...}
```

---

### Step 2: Extension Setup

#### Files to Add/Modify:

**New Files:**
- `chrome-extension/auth.html` - Login/Register page
- `chrome-extension/background_auth.js` - Enhanced service worker with auth
- `chrome-extension/dashboard_enhanced.html` - Unified dashboard (parent + child)

**Configuration:**
Update `chrome-extension/config.js`:
```javascript
const CONFIG = {
    API_URL: "http://localhost:8000",
    BACKEND_URL: "https://facebook-content-filter-api.onrender.com",
    API_KEY: "60113a172a6391a21af8032938e8febd",
    JWT_REFRESH_INTERVAL: 24 * 60 * 60 * 1000  // 24 hours
};
```

#### Update `manifest.json`:

```json
{
    "manifest_version": 3,
    "name": "SafeGuard Family",
    "version": "2.0.0",
    "description": "Parent-controlled video monitoring with weekly reports",
    "permissions": [
        "storage",
        "tabs",
        "webNavigation",
        "scripting"
    ],
    "host_permissions": [
        "https://www.facebook.com/*",
        "http://localhost:8000/*"
    ],
    "background": {
        "service_worker": "background_auth.js"
    },
    "action": {
        "default_popup": "auth.html",
        "default_title": "SafeGuard Family"
    },
    "content_scripts": [
        {
            "matches": ["https://www.facebook.com/*", "https://m.facebook.com/*"],
            "js": ["content.js"],
            "run_at": "document_start"
        }
    ],
    "icons": {
        "16": "icons/16.png",
        "48": "icons/48.png",
        "128": "icons/128.png"
    }
}
```

---

## 🔐 Authentication Flow

### Parent Registration & Login

**1. User opens extension popup → Loads `auth.html`**

**2. Parent Registration:**
```
POST /api/auth/register
Body: {
    "email": "parent@example.com",
    "password": "secure_password",
    "full_name": "John Doe"
}

Response: {
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "parent": {
        "id": "uuid",
        "email": "parent@example.com",
        "full_name": "John Doe"
    },
    "expires_in": 86400
}
```

**3. Token is stored in chrome.storage.local:**
```javascript
chrome.storage.local.set({
    parentToken: "eyJhbGciOiJIUzI1NiIs...",
    parentId: "uuid",
    userType: "parent",
    parentEmail: "parent@example.com",
    parentName: "John Doe"
});
```

**4. Redirect to dashboard_enhanced.html**

### Child Direct Access

**1. User clicks "Continue as Child"**

**2. Storage is set to child mode:**
```javascript
chrome.storage.local.set({
    childMode: true,
    userType: "child"
});
```

**3. Dashboard loads in child view mode**

---

## 📊 API Endpoints

### Authentication

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

### Children Management

```
POST /api/children
    - Body: { name, device_id }
    - Returns: Created child object
    
GET /api/children
    - Returns: List of parent's children
    
DELETE /api/children/{child_id}
    - Removes child profile
```

### Video Analysis

```
POST /api/videos/analyze (HEADER: Authorization: Bearer {token})
    - Body: { url, quality }
    - Returns: {
        "status": "success",
        "analysis": {
            "id": "uuid",
            "title": "Video Title",
            "transcription": "Full audio text...",
            "summary": "LLM-generated summary..."
        }
    }
```

### Weekly Reports

```
GET /api/reports/weekly/{child_id}
    - Returns: {
        "report": {
            "week_start": "2024-01-01T00:00:00",
            "week_end": "2024-01-08T00:00:00",
            "total_videos": 15,
            "total_duration_minutes": 420,
            "videos": [...]
        }
    }

GET /api/reports/all/{child_id}
    - Returns: List of all weekly reports
```

---

## 🎯 Parent Dashboard Features

### 1. Home Tab
- **Total Children**: Count of registered children
- **This Week Videos**: Number of videos tracked
- **Total Duration**: Minutes watched this week
- Quick access to children selection

### 2. My Children Tab
- List of registered children
- Device information
- Videos tracked per child
- Add new child registration
- Delete child profiles

### 3. Weekly Reports Tab
- Click any child to view their weekly report
- **Video Stats**: Total videos, total duration
- **Video List**: Titles, uploaders, durations watched
- **Time Period**: Week start/end dates
- **Parent Insights**: Key observations

### 4. Settings Tab
- Account information (email, name, member since)
- Profile management
- Session management

---

## 👶 Child Dashboard Features

### 1. Home Tab
- **Videos Tracked**: This week's count
- **Watch Time**: Total duration in hours
- **Filter Status**: Comment filter state
- How SafeGuard works explanation

### 2. Filter Settings Tab
- Toggle for toxic comment filter
- Auto-hides inappropriate comments from Facebook
- Educational information about the filter

### 3. Activity Stats Tab
- Weekly video statistics
- Watch time breakdown
- Activity summary

---

## 🔄 Data Flow Diagram

```
Child on Facebook
    ↓
Content Script detects video URL
    ↓
Background Service Worker (background_auth.js)
    ↓
POST /api/videos/analyze (with parent's token if they set it up)
    ↓
Backend Service:
    1. Download video with yt-dlp
    2. Extract audio
    3. Transcribe with Whisper (Groq)
    4. Generate summary with LLM
    5. Store in database
    ↓
Parent views weekly report in dashboard_enhanced.html via:
    GET /api/reports/weekly/{child_id}
```

---

## 🗄️ Database Schema

### Parents Table
```sql
id (UUID, primary)
email (unique)
password_hash
full_name
created_at
last_login
```

### Children Table
```sql
id (UUID, primary)
parent_id (FK → Parents)
name
device_id
created_at
```

### VideoAnalysis Table
```sql
id (UUID, primary)
child_id (FK → Children)
url
title
duration (seconds)
transcription (text)
summary (text)
categories (JSON)
analyzed_at
created_at
```

### WeeklyReport Table
```sql
id (UUID, primary)
parent_id (FK → Parents)
child_id (FK → Children)
week_start
week_end
total_videos_watched
total_duration_minutes
category_breakdown (JSON)
top_videos (JSON)
llm_insights (text)
created_at
```

### ParentSession Table
```sql
id (UUID, primary)
parent_id (FK → Parents)
token (unique)
expires_at
created_at
```

---

## 🧪 Testing Guide

### 1. Test Parent Registration

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "full_name": "Test Parent"
  }'

# Expected: Returns token, parent ID, and user info
```

### 2. Test Parent Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### 3. Test Add Child

```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X POST http://localhost:8000/api/children \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Johnny",
    "device_id": "chrome_device_001"
  }'
```

### 4. Test Video Analysis

```bash
curl -X POST http://localhost:8000/api/videos/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.facebook.com/reel/...",
    "quality": "720p"
  }'

# Note: This is long-running, may take 1-3 minutes
```

### 5. Test Weekly Report

```bash
CHILD_ID="uuid-of-child"

curl -X GET "http://localhost:8000/api/reports/weekly/$CHILD_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Test Extension in Browser

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. Click on the extension icon
6. Should show `auth.html` (login page)

---

## 🔑 Key Implementation Details

### Authentication Flow in Extension

```javascript
// 1. User logs in (auth.html)
chrome.storage.local.set({
    parentToken: "jwt_token_here",
    parentId: "uuid",
    parentEmail: "email@example.com",
    userType: "parent"
});

// 2. Background service worker uses token
const headers = {
    'Authorization': `Bearer ${parentToken}`,
    'Content-Type': 'application/json'
};

// 3. Dashboard reads from storage
chrome.storage.local.get(['parentToken', 'userType'], (result) => {
    if (result.parentToken) {
        // Show parent dashboard
    }
});
```

### Comment Filtering Logic

```javascript
// In first available window with Facebook detector, checks:
1. Is URL a Facebook domain?
2. Is user in child mode or filter enabled?
3. Get all comment elements (~3 second interval)
4. Extract comment text
5. Send to filter API endpoint
6. Hide if toxic detected
```

### Video Tracking Flow

```javascript
// When user navigates to Facebook video:
1. Content script detects video URL pattern
2. Background service worker receives message
3. Fetches video metadata with yt-dlp
4. Extracts audio track
5. Sends audio to Groq Whisper for transcription
6. Generates summary with Groq LLM
7. Stores in database with child_id
8. Parent can view in weekly report next sync
```

---

## 🛠️ Troubleshooting

### "Connection refused" Error

**Problem**: Extension can't reach backend

**Solution**:
```bash
# 1. Check backend is running
curl http://localhost:8000/health

# 2. Update API_URL in config.js if needed
# 3. Check CORS is enabled in backend_enhanced.py (it is by default)
# 4. Check firewall allows port 8000
```

### "Invalid token" Error

**Problem**: JWT token expired or invalid

**Solution**:
- Clear chrome.storage.local: Go to DevTools → Application → Storage → Clear All
- Re-login to generate new token
- Token expires in 24 hours by default

### Video Analysis Takes Too Long

**Problem**: Transcription or LLM processing slow

**Solution**:
- Background tasks run async, user can close popup
- Check Groq API status at https://status.groq.com
- Reduce quality setting (360p instead of 1080p) for faster downloads

### Database Connection Error

**Problem**: SQLite database locked or missing

**Solution**:
```bash
# Delete old database and restart
rm video_downloader.db
python backend_enhanced.py
```

---

## 📱 Extension Manifest Configuration

Your manifest.json should include:

```json
{
    "manifest_version": 3,
    "name": "SafeGuard Family",
    "version": "2.0.0",
    "description": "Family-friendly browsing with parental controls",
    
    "permissions": [
        "storage",
        "tabs",
        "webNavigation",
        "scripting"
    ],
    
    "host_permissions": [
        "https://www.facebook.com/*",
        "https://m.facebook.com/*",
        "http://localhost:8000/*"
    ],
    
    "background": {
        "service_worker": "background_auth.js"
    },
    
    "action": {
        "default_popup": "auth.html",
        "default_title": "SafeGuard Family"
    },
    
    "web_accessible_resources": [
        {
            "resources": ["*.png", "*.jpg"],
            "matches": ["<all_urls>"]
        }
    ]
}
```

---

## 🎓 Architecture Summary

```
SafeGuard System Architecture
│
├── Backend (FastAPI) - port 8000
│   ├── SQLAlchemy ORM
│   │   ├── Parent (User accounts)
│   │   ├── Child (Registered children)
│   │   ├── VideoAnalysis (Analyzed videos)
│   │   ├── WeeklyReport (Generated insights)
│   │   └── ParentSession (JWT tokens)
│   │
│   ├── Authentication Endpoints
│   │   ├── POST /api/auth/register
│   │   ├── POST /api/auth/login
│   │   └── POST /api/auth/logout
│   │
│   ├── Children Management
│   │   ├── POST /api/children (add)
│   │   ├── GET /api/children (list)
│   │   └── DELETE /api/children/{id}
│   │
│   ├── Video Analysis Service
│   │   ├── yt-dlp (download)
│   │   ├── Groq Whisper (transcribe)
│   │   └── Groq LLM (summarize)
│   │
│   └── Reports Service
│       ├── Weekly aggregation
│       ├── Category breakdown
│       └── LLM insights generation
│
├── Chrome Extension
│   ├── auth.html: Login/Register UI
│   ├── background_auth.js: Service worker
│   │   ├── Token management
│   │   ├── Video detection
│   │   ├── Comment filtering
│   │   └── Backend sync
│   │
│   └── dashboard_enhanced.html: Unified dashboard
│       ├── Parent view (reports, children)
│       └── Child view (stats, filter settings)
│
└── External Services
    ├── Groq LLM API (transcription + summarization)
    ├── Facebook (content source)
    └── Comment Filter API (toxicity detection)
```

---

## 📝 Next Steps

1. **Setup Backend**: Run `python backend_enhanced.py`
2. **Load Extension**: via `chrome://extensions`
3. **Register Parent Account**: Email + password through auth.html
4. **Add Child**: Register child device in parent dashboard
5. **Test Video Tracking**: Navigate to Facebook video on device
6. **View Weekly Report**: Check parent dashboard for insights

---

## 🔐 Security Notes

- **JWT Token**: Stored in chrome.storage.local (encrypted in extension)
- **Password**: Hashed with SHA256 on backend, never sent in plaintext again
- **API Calls**: All use CORS + token validation
- **Rate Limiting**: 100 requests per 60 seconds recommended
- **HTTPS**: Use HTTPS in production (update API_URL to https://)

---

## 📞 Support

For issues or questions:
1. Check backend logs: `python backend_enhanced.py` output
2. Check extension console: DevTools → Extensions → SafeGuard → Errors
3. Verify API reachability: `curl http://localhost:8000/health`
4. Clear storage and re-login if needed

---

**v2.0.0 - Parent-Child Authentication & Weekly Reports**
