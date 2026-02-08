# 🧪 Testing Guide - SafeGuard Family

## ✅ System Status
**Backend**: Running on http://localhost:8000
**Extension**: Chrome Extension (reload required)
**Database**: SQLite with 11 tables

---

## 🔧 What Was Fixed

### 1. **Time Limits Now Work**
- ✅ Usage is tracked every 15 seconds
- ✅ Logged to backend automatically
- ✅ Limits block sites when reached
- ✅ Cooldown periods work correctly
- ✅ Real-time enforcement (blocks during active session)

### 2. **Blocklist/Allowlist Working**
- ✅ DELETE method fixed (includes request body)
- ✅ Sites can be removed from lists
- ✅ Changes sync to extension storage
- ✅ Blocking applies immediately

### 3. **Usage Tracking Enhanced**
- ✅ Console logs show: `⏱️ Tracking: youtube.com +15s (total pending: 45s)`
- ✅ Logs to backend: `✓ Usage logged: youtube.com - 60s`
- ✅ Time limit checks: `⏱️ Time limit check: youtube.com - Used: 180s / Limit: 300s`
- ✅ Blocks when limit reached: `🚫 Time limit: youtube.com - LIMIT REACHED!`

---

## 🧪 Quick Tests

### **Test 1: Time Limits - Permanent Block**
1. Reload extension: `chrome://extensions` → reload SafeGuard
2. Login to dashboard: `parent2@test.com` / `password123`
3. Go to **"⏱️ Usage & Limits"** tab
4. Add a time limit:
   - Domain: `youtube.com`
   - Check **"Permanent block"**
   - Click **"Add Time Limit"**
5. Open new tab → go to `youtube.com`
6. **Expected**: Immediately blocked with message "Permanent block"

### **Test 2: Time Limits - Daily Limit**
1. Go to **"⏱️ Usage & Limits"** tab
2. Add a time limit:
   - Domain: `reddit.com`
   - Daily limit: `1` minute (60 seconds)
   - Uncheck "Permanent block"
   - Click **"Add Time Limit"**
3. Open new tab → go to `reddit.com`
4. Stay on the page for 1-2 minutes
5. Open browser console (F12) → see tracking logs:
   ```
   [SafeGuard] ⏱️ Tracking: reddit.com +15s (total pending: 15s)
   [SafeGuard] ⏱️ Tracking: reddit.com +15s (total pending: 30s)
   [SafeGuard] ✓ Usage logged: reddit.com - 60s
   [SafeGuard] 🚫 Time limit: reddit.com - LIMIT REACHED!
   ```
6. **Expected**: After 1 minute, page redirects to blocked page

### **Test 3: Remove from Blocklist**
1. Go to **"📋 Manage Lists"** tab
2. Add a blocked site:
   - Domain: `example.com`
   - Category: `Custom`
   - Click **"Add"**
3. Click **"Remove"** button next to `example.com`
4. **Expected**: Alert says "✅ example.com removed from list"
5. Open `example.com` → should load normally

### **Test 4: Sync from Backend**
1. Go to **"📋 Manage Lists"** tab
2. Click **"🔄 Sync from Backend"** button
3. **Expected**: Alert says "✅ Lists synced successfully from backend!"
4. All lists refresh with latest data

---

## 📊 Verify Usage Tracking

### Check Backend Logs:
```powershell
# Watch backend console for these messages:
# [SafeGuard] ⏱️ Tracking: domain.com +15s
# [SafeGuard] ✓ Usage logged: domain.com - 60s
# [SafeGuard] 🚫 Time limit reached!
```

### Check Browser Console (F12):
```
[SafeGuard] ⏱️ Tracking: youtube.com +15s (total pending: 45s)
[SafeGuard] ⏱️ Time limit check: youtube.com - Used: 180s / Limit: 300s
[SafeGuard] ✓ Usage logged: youtube.com - 60s
```

### Check Dashboard:
1. Go to **"⏱️ Usage & Limits"** tab
2. Click **"Refresh"** button
3. See usage table with domains and time spent

---

## 🎯 Demo for Presentation

### **Quick 2-Minute Demo**:

**Setup (30 seconds)**:
1. Backend already running? ✓
2. Extension loaded? ✓
3. Logged in as parent2@test.com? ✓

**Demo (90 seconds)**:

1. **Show Dashboard** (15s):
   - "Here's our parent dashboard with live statistics"
   - Point to blocked sites count, usage stats

2. **Add Time Limit** (20s):
   - Click "⏱️ Usage & Limits"
   - Add permanent block for `facebook.com`
   - Show it saves successfully

3. **Test Blocking** (20s):
   - Open new tab
   - Try to visit `facebook.com`
   - Show blocked page instantly
   - "SafeGuard detected and blocked the site in real-time"

4. **Show Facebook Comment Filter** (20s):
   - Open facebook.com in incognito (if needed)
   - Show extension popup with toggle switch
   - "Our AI analyzes comments using Groq and hides toxic content"

5. **Show Admin Control** (15s):
   - Back to dashboard
   - Show blocklist/allowlist
   - "Parents have full control from any device"

---

## 🐛 Troubleshooting

### ❌ "Time limits not working"
**Fix**: 
1. Reload extension: `chrome://extensions`
2. Click "🔄 Sync from Backend" in dashboard
3. Check browser console for tracking logs

### ❌ "Can't remove from blocklist"
**Fix**: Backend updated, just restart:
```powershell
Get-Process python | Stop-Process -Force
python backend_final.py
```

### ❌ "Usage not tracking"
**Fix**:
1. Open browser console (F12)
2. Look for: `[SafeGuard] ⏱️ Tracking:` messages
3. If missing, reload extension
4. Stay on a page for 15+ seconds

---

## 🚀 System is Ready!
All features working:
- ✅ Time limits block sites
- ✅ Usage tracking works
- ✅ Blocklist/allowlist functional
- ✅ Facebook comment filtering
- ✅ Cross-device sync
- ✅ Real-time enforcement

**Good luck with your presentation!** 🎯
