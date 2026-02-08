# SafeGuard Data Connection & Parent Control Features

## 🎯 Complete Overview

Your SafeGuard system is **fully configured** with:
- ✅ **Backend database** (SQLite locally, PostgreSQL ready for production)
- ✅ **Extension data logging** (history + blocks sent to backend)
- ✅ **Parent dashboard** (full control over child's internet access)
- ✅ **Real-time synchronization** between extension and dashboard

---

## 📊 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CHILD'S DEVICE                           │
│  ┌──────────────────────────┐                               │
│  │  Chrome Extension        │                               │
│  │  - Logs all URLs         │                               │
│  │  - Logs blocks           │                               │
│  └──────────────┬───────────┘                               │
│                 │                                            │
│        ① POST /api/logs/history                             │
│        ② POST /api/logs/block                               │
│                 │                                            │
└─────────────────┼────────────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  Backend (Flask)    │
        │  - Receives logs    │
        │  - Stores in DB     │
        │  - Manages blocklist│
        └─────────────────────┘
                  ▲
        ③ GET /api/logs/history/<child_id>
        ④ GET /api/logs/blocked/<child_id>
        ⑤ POST /api/blocklist (ban domain)
        ⑥ DELETE /api/blocklist/<id> (unban)
                  │
        ┌─────────┴──────────────┐
        │                        │
┌───────▼──────────────┐   ┌────▼─────────────────┐
│ PARENT'S DEVICE      │   │ Admin/Tech Parent's  │
│  Browser Dashboard   │   │ Device               │
│  - View history      │   │ - Remote monitoring  │
│  - See blocks        │   │ - Add/remove bans    │
│  - Ban/Unban sites   │   │ - View stats         │
└──────────────────────┘   └──────────────────────┘
```

---

## 🔧 What Each Component Does

### **1. Browser Extension (installed on child's device)**

**Logs to Backend:**
```javascript
// Every visited URL
POST /api/logs/history
{
  "child_id": "uuid",
  "device_id": "device-uuid",
  "url": "https://example.com/page",
  "domain": "example.com",
  "duration": 45  // seconds on page
}

// Every blocked attempt
POST /api/logs/block
{
  "child_id": "uuid",
  "device_id": "device-uuid",
  "url": "https://blocked-site.com",
  "domain": "blocked-site.com",
  "category": "Adult"  // or Gambling, Violence, etc
}
```

**What happens with this data:**
- Saved to `instance/safeguard.db` (SQLite database)
- Available for parent to query anytime
- **Never deleted unless parent explicitly clears it**
- Survives extension uninstall/reinstall (in database)

---

### **2. Backend Database (Flask app.py)**

**Stores 4 types of data:**

1. **HistoryLog** - Every URL child visits
   ```
   - url (full path)
   - domain
   - timestamp
   - device_name
   - duration on page
   ```

2. **BlockLog** - Every blocked attempt
   ```
   - url (what they tried to access)
   - domain
   - category (Adult, Gambling, etc)
   - timestamp
   - reason blocked
   ```

3. **BlocklistDomain** - Parent's manual blocks
   ```
   - domain (e.g., facebook.com)
   - category (Custom/Manual)
   - added_by_parent
   - when added
   ```

4. **AllowlistDomain** - Parent's whitelisted sites
   ```
   - domain (e.g., khan-academy.com)
   - always_allowed
   - when added
   ```

**Database Location:**
- **Development:** `c:\Users\acer\OneDrive\Desktop\ComFilter\instance\safeguard.db`
- **Production:** PostgreSQL (set via `database_url` environment variable)

---

### **3. Parent Dashboard (http://192.168.254.156:5000)**

**Available Features:**

#### **A. Overview Tab**
- Total blocked sites count
- Blocks today
- Total visits
- Top blocked category

#### **B. All Visits Tab**
- ALL URLs child visited (searchable)
- Filter by date range
- Export to CSV
- See duration on each site
- Clear history option

#### **C. Blocked Sites Tab**
- Every attempt to visit blocked content
- Filter by category (Adult, Gambling, etc)
- Timestamp of each block
- **BAN ANY SITE DIRECTLY FROM HERE** ← Parent control

#### **D. Manage Lists Tab**
- **Add custom blocks** (ban any site instantly)
- **Add whitelisted domains** (always allow certain sites)
- Remove blocks anytime
- Categories: Adult, Gambling, Violence, Drugs, Hate, Malware, Custom

#### **E. Settings Tab**
- Enable/disable categories
- Block adult content
- Block gambling sites
- Block violent content
- Block drug-related content
- Block hate speech
- Block malware sites
- Toggle logging level

---

## 🚀 How to Use - Step by Step

### **Step 1: Start Backend Server**

**Option A - Simple (Recommended):**
```powershell
# Double-click RUN_LOCAL.bat
# Server will start automatically
```

**Option B - Manual:**
```powershell
cd C:\Users\acer\OneDrive\Desktop\ComFilter
python app.py
```

**You should see:**
```
🚀 SafeGuard Backend Server Starting...
📱 API: http://0.0.0.0:5000
...
```

### **Step 2: Parent Register on Dashboard**

1. Open browser: **http://192.168.254.156:5000**
2. Click "Register as Parent"
3. Enter:
   - Email: your-email@example.com
   - Password: strong password
4. Click Register

### **Step 3: Create Child Profile**

1. After login, click "Create Child"
2. Enter child's name (e.g., "Son" or "Daughter")
3. Click "Create"
4. **COPY the Child ID** (you'll need this)

### **Step 4: Setup Child Device**

1. On child's computer, open Chrome
2. Go to: **chrome://extensions/**
3. Enable "Developer Mode" (toggle top right)
4. Click "Load unpacked"
5. Navigate to: `C:\Users\acer\OneDrive\Desktop\ComFilter\chrome-extension`
6. Select it
7. Extension will install

### **Step 5: Configure Extension on Child Device**

1. Extension icon appears in Chrome toolbar
2. Click SafeGuard icon
3. Click "Setup Child Account"
4. Paste **Child ID** from step 3
5. Click "Setup"
6. Extension is now active

### **Step 6: Monitor from Parent Dashboard**

1. Return to parent dashboard: **http://192.168.254.156:5000**
2. Go to "All Visits" tab
3. Child's browsing history appears in real-time
4. Go to "Blocked Sites" to see attempts to access blocked content

### **Step 7: Add Custom Blocks from Dashboard**

1. Go to "Manage Lists" tab
2. In "Block Custom Domain" section:
   - Type domain: `facebook.com`
   - Select category: `Custom`
   - Click "Add Block"
3. **Instantly blocked** across all child's devices!

---

## 🔍 Real-World Example

**Scenario:** Parent wants to block YouTube temporarily

**What happens:**
1. Parent opens dashboard → Manage Lists tab
2. Types: `youtube.com`
3. Selects category: `Custom`
4. Clicks "Add Block"
5. ↓
6. Data sent to backend: `POST /api/blocklist`
7. ↓
8. Stored in database: `BlocklistDomain` table
9. ↓
10. Child device extension reads blocklist regularly
11. ↓
12. Next time child types youtube.com, extension intercepts & blocks
13. ↓
14. Block logged: `POST /api/logs/block`
15. ↓
16. Parent sees in "Blocked Sites" tab: ❌ youtube.com blocked

---

## 📈 Accessing Data from Script

If you want to check data programmatically:

**Check all history for a child:**
```bash
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  http://192.168.254.156:5000/api/logs/history/CHILD_ID
```

**Check all blocks for a child:**
```bash
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  http://192.168.254.156:5000/api/logs/blocked/CHILD_ID
```

**Add a block:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"child_id":"CHILD_ID","domain":"facebook.com","category":"Custom"}' \
  http://192.168.254.156:5000/api/blocklist
```

---

## 🛡️ Important Notes

### **Data Security:**
- ✅ Passwords hashed with bcrypt
- ✅ Auth tokens required for all parent actions
- ✅ Child data isolated by parent account
- ✅ 30-day token expiration
- ✅ HTTPS recommended for production

### **Data Retention:**
- History: Last 90 days by default (configurable)
- Blocks: All retained permanently
- Blocklist: Until parent removes
- Database: Persists across restarts (stored on disk)

### **Multi-Device Support:**
- One child can have multiple devices
- All devices share same blocklist
- History tracked per device
- Each device has unique Device ID

### **Offline Capability:**
- Extension works even if backend temporarily unavailable
- Logs data locally as backup
- Syncs with backend when connection restored
- Parent dashboard requires backend connection

---

## 🔧 Advanced Configuration

### **Change Port (if 5000 is used):**
```python
# Edit app.py, last line
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)  # Change 5000 to 8080
```

### **Use PostgreSQL (for production):**
```bash
# Set environment variable before running
$env:database_url = "postgresql://user:pass@localhost/safeguard"
python app.py
```

### **Export All Child History:**
```
Dashboard → All Visits tab → Click "Export CSV"
```

---

## ✅ Troubleshooting Data Issues

### **"No data showing in dashboard"**
1. Check extension is installed on child device
2. Check child device has correct Child ID
3. Run TEST-DATA-CONNECTION.bat to verify server
4. Check child actually visited some websites
5. Check database isn't corrupted: delete instance/safeguard.db and restart

### **"Can't add blocks from dashboard"**
1. Check parent is logged in
2. Check child exists in system
3. Check Flask server running (`netstat -an | findstr 5000`)
4. Check auth token is valid (try logout/login)

### **"History not syncing"**
1. Check extension has network access (Firewall)
2. Check backend URL is correct in config.js
3. Check auth token in extension storage
4. Check Flask logs for errors (`python app.py`)

---

## 📞 Quick Reference

| Feature | Parent Does | What Happens | Where to See |
|---------|-------------|--------------|--------------|
| View history | Dashboard → All Visits | Pulls from `/api/logs/history/<ID>` | Table view |
| See blocks | Dashboard → Blocked Sites | Pulls from `/api/logs/blocked/<ID>` | Table view |
| Ban a domain | Manage Lists → Add Block | `POST /api/blocklist` stored in DB | Instant |
| Unban a domain | Manage Lists → Remove | `DELETE /api/blocklist/<ID>` | Instant |
| Export history | All Visits → Export CSV | Downloads all child's activity | CSV file |
| Clear history | All Visits → Clear | Deletes local + backend history | Next refresh |
| View blocklist | Manage Lists → Blocklist | `GET /api/blocklist/<ID>` | List view |

---

## ✨ Summary

Your SafeGuard system is **production-ready** with:
- ✅ **Full data collection** (history + blocks)
- ✅ **Real-time synchronization**
- ✅ **Complete parent controls** (ban/unban from dashboard)
- ✅ **Persistent database** (survives restarts)
- ✅ **Multi-device support**
- ✅ **Offline capability** (backup local logging)

**You can literally ban any website in 3 clicks from the parent dashboard!**

Start the server and begin monitoring now: **http://192.168.254.156:5000** 🚀
