# 🔧 FIX: Dashboard Stuck on Loading & Backend Error

## ⚠️ Problem Identified

Your extension and dashboard were trying to connect to:
- ❌ `https://safeguard-family.vercel.app` (production - not running)

Instead of:
- ✅ `http://192.168.254.156:5000` (your local server)

## ✅ Fixed Files

I've updated both config.js files to use your local IP:
- `chrome-extension/config.js` → Now points to 192.168.254.156:5000
- `backend/safeguard_server/chrome-extension/config.js` → Now points to 192.168.254.156:5000

---

## 🚀 STEP-BY-STEP FIX (5 minutes)

### Step 1: Verify Server is Running ✓

```powershell
# Make sure your server is running
cd C:\Users\acer\OneDrive\Desktop\ComFilter
python app.py
```

**You should see:**
```
🚀 SafeGuard Backend Server Starting...
📱 API: http://0.0.0.0:5000
✓ Database initialized
* Running on http://0.0.0.0:5000
```

**Leave this window open and running!**

---

### Step 2: Test Server (Optional but Recommended)

Double-click: **TEST-SERVER.bat**

This will verify:
- ✅ Server is listening
- ✅ API responding
- ✅ Dashboard loading
- ✅ Assets loading

---

### Step 3: Reload Extension (CRITICAL!)

Because we changed config.js, you MUST reload the extension:

1. Open Chrome
2. Type in address bar: **chrome://extensions/**
3. Find "SafeGuard Family" extension
4. Click the **🔄 RELOAD** button (circular arrow icon)
5. Verify it loaded without errors

---

### Step 4: Clear Browser Cache & Refresh Dashboard

1. In browser with dashboard open, press: **Ctrl+Shift+R** (hard refresh)
2. Or press **Ctrl+Shift+Delete** → Clear cache → Clear data
3. Close and reopen: **http://192.168.254.156:5000**

---

### Step 5: First Time Setup (If Fresh Start)

#### A. Parent Registration

If you see a login page:
1. Click **"Register as Parent"** (if not logged in)
2. Fill in:
   ```
   Email: parent@example.com
   Password: YourPassword123
   ```
3. Click **Register**
4. You should be redirected to dashboard

#### B. Login (If Already Registered)

1. Enter your email and password
2. Click **Login**
3. Dashboard should load with your data

---

### Step 6: Create Child Profile (If First Time)

1. After login, you should see dashboard
2. Click **"Create Child"** or go to child management
3. Enter child name: "Test Child"
4. Click **Create**
5. **COPY the Child ID** - you'll need this

---

### Step 7: Setup Extension on Child Device

1. Click SafeGuard icon in Chrome toolbar
2. If it shows setup screen:
   - Paste the **Child ID** from Step 6
   - Click **Setup**
3. Extension should now show: **✅ Active**

---

## 📊 Verification Checklist

After following all steps, verify:

### ✅ Server Running
- [ ] Command prompt shows "Running on http://0.0.0.0:5000"
- [ ] No error messages in server console

### ✅ Dashboard Working
- [ ] Open: http://192.168.254.156:5000
- [ ] Shows parent email (not "Loading...")
- [ ] Shows child name (not "Loading...")
- [ ] Stats show numbers (even if 0 initially)
- [ ] Navigation tabs work
- [ ] No console errors (F12 → Console tab)

### ✅ Extension Working
- [ ] Extension reloaded in chrome://extensions/
- [ ] Extension icon clickable
- [ ] Shows "Backend: Connected" (not "Backend: Error")
- [ ] Child ID entered and saved
- [ ] Visits a website → logs appear in dashboard

---

## 🐛 Still Not Working? Troubleshooting

### Issue: "Backend: Error" in extension

**Fix:**
1. Make sure server is running: `python app.py`
2. Reload extension: chrome://extensions/ → Reload
3. Check config.js shows: `baseURL: 'http://192.168.254.156:5000'`
4. Test URL in browser: http://192.168.254.156:5000/health
   - Should show: `{"status":"ok","version":"1.0.0"}`

### Issue: Dashboard shows "Loading..." forever

**Fix:**
1. **You might not be logged in!**
   - Check if login page appears when you visit http://192.168.254.156:5000
   - Register or login with parent account
2. Clear browser cache: Ctrl+Shift+Delete
3. Hard refresh: Ctrl+Shift+R
4. Check browser console (F12):
   - Look for red error messages
   - Common: "Failed to fetch" → Server not running
   - Common: "401 Unauthorized" → Need to login

### Issue: "No data in dashboard" (but not loading)

**Fix:**
1. Child ID must be entered in extension
2. Child must visit some websites first
3. Wait 5-10 seconds for sync
4. Click "Refresh" button on dashboard
5. Check database exists: `instance\safeguard.db`

### Issue: Extension shows "Setup incomplete"

**Fix:**
1. Click extension icon
2. Click "Setup Child Account"
3. Enter Child ID from parent dashboard
4. Click "Setup"
5. Should show "✅ Setup complete"

---

## 🔍 Debug Commands

### Check if server is responding:
```powershell
# In PowerShell
Invoke-WebRequest -Uri "http://192.168.254.156:5000/health"
# Should show: StatusCode: 200
```

### Check API endpoints:
```powershell
# Health check
curl http://192.168.254.156:5000/health

# API root
curl http://192.168.254.156:5000/api
```

### Check config.js is updated:
```powershell
# In PowerShell
Select-String -Path "chrome-extension\config.js" -Pattern "baseURL"
# Should show: baseURL: 'http://192.168.254.156:5000'
```

---

## 📝 Common Login Flow Issues

### Scenario 1: Fresh Install (Never Registered)
1. Visit http://192.168.254.156:5000
2. See login page
3. Click "Register"
4. Fill email + password
5. Click Register
6. → Lands on dashboard ✅

### Scenario 2: Already Registered
1. Visit http://192.168.254.156:5000
2. See login page
3. Enter email + password
4. Click Login
5. → Lands on dashboard ✅

### Scenario 3: Already Logged In
1. Visit http://192.168.254.156:5000
2. → Directly lands on dashboard ✅

If you're in Scenario 3 but dashboard shows "Loading...", it means:
- An API call is failing
- Check browser console (F12) for errors
- Likely auth token expired → Logout and login again

---

## ✅ Expected Behavior After Fix

### Dashboard:
```
🛡️ SafeGuard Family
parent@example.com [Logout]

Protected Child: Test Child

📊 Overview
Total Blocked: 0
Blocked Today: 0
Total Visits: 0
```

### Extension:
```
SafeGuard Family

Status: ✅ Active
Backend: ✅ Connected
Child: Test Child
Device: Chrome-xxxxx

[View Dashboard]
```

---

## 🎯 Quick Test After Fix

1. **Server running:** ✓ python app.py
2. **Extension reloaded:** ✓ chrome://extensions → Reload
3. **Dashboard opened:** ✓ http://192.168.254.156:5000
4. **Logged in:** ✓ Parent account
5. **Child created:** ✓ Child ID copied
6. **Extension setup:** ✓ Child ID entered

**Now test:**
1. Visit google.com in child browser
2. Go to parent dashboard
3. Click "All Visits" tab
4. Should see: google.com in the list!

---

## 💡 Key Points

- **Config.js is NOW fixed** → Points to 192.168.254.156:5000
- **Must reload extension** after config change
- **Must be logged in** to see dashboard data
- **Must have Child ID** entered in extension
- **Must visit websites** for data to appear

---

## 📞 Need More Help?

If still stuck after all these steps:

1. Run TEST-SERVER.bat
2. Take screenshot of:
   - Server console output
   - Dashboard (with F12 console open)
   - Extension popup
3. Check for specific error messages
4. Report exact error message seen

Your system is configured correctly now - just need to follow the reload/login steps! 🚀
