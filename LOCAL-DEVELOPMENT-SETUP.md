# ⚡ Switch Extension to Local Development Mode

Your extension is currently configured to use **Vercel production** (https://safeguard-family.vercel.app).

To test locally at **192.168.254.156:5000**, follow these steps:

## 🔧 Update Extension Config

1. Open file: `chrome-extension/config.js`

2. Find this section (around line 11-14):
```javascript
const API_CONFIG = {
  // 🚀 PRODUCTION (Vercel)
  baseURL: 'https://safeguard-family.vercel.app',
  
  // 💻 LOCAL DEVELOPMENT (Uncomment for local testing)
  // baseURL: 'http://192.168.254.156:5000',
  // baseURL: 'http://localhost:5000',
```

3. **Comment out** the Vercel line and **uncomment** the local line:
```javascript
const API_CONFIG = {
  // 🚀 PRODUCTION (Vercel)
  // baseURL: 'https://safeguard-family.vercel.app',
  
  // 💻 LOCAL DEVELOPMENT (Uncomment for local testing)
  baseURL: 'http://192.168.254.156:5000',
  // baseURL: 'http://localhost:5000',
```

**KEEP THIS:**
```
  // baseURL: 'http://localhost:5000',
  // (keep this one commented as backup)
```

4. **Save the file** (Ctrl+S)

## 🔄 Reload Extension in Chrome

1. On child device, open Chrome
2. Go to: **chrome://extensions/**
3. Find "SafeGuard Family" extension
4. Click "Reload" button (circular arrow)
5. Extension now connects to `192.168.254.156:5000`

## ✅ Verify It Works

1. Open SafeGuard icon in Chrome
2. Click "Setup Child Account"
3. Verify you can see the input fields
4. If it loads: ✅ Connected to local backend!

---

## 📱 Dashboard Access Options

### Option 1: Parent Dashboard (Browser)
- **URL:** http://192.168.254.156:5000
- **Access from:** Any browser on same network
- **What you see:** All child activity
- **What you can do:** Ban/unban sites, view history

### Option 2: Local Testing
- **URL:** http://localhost:5000
- **Access from:** Same computer only
- **Use when:** Testing on same device

---

## 🚀 Full Setup Checklist

### Backend Server
- [ ] Python installed
- [ ] dependencies installed: `pip install -r requirements.txt`
- [ ] Server running: `python app.py`
- [ ] Can access: http://localhost:5000

### Parent Setup
- [ ] Web browser open
- [ ] Visit: http://192.168.254.156:5000
- [ ] Registered parent account
- [ ] Created child profile
- [ ] Copied Child ID

### Child Device Setup
- [ ] Chrome browser open
- [ ] Extension installed (load unpacked)
- [ ] config.js updated to local URL
- [ ] Extension reloaded
- [ ] Child ID entered in extension setup

### Verification
- [ ] Parent can see "All Visits" page
- [ ] Child can visit URLs (google.com)
- [ ] Parent sees those URLs in dashboard
- [ ] Parent can add block (facebook.com)
- [ ] Child visits facebook.com → gets blocked
- [ ] Parent sees block attempt in dashboard

---

## 🐛 Troubleshooting Extension Connection

### **Extension says "Backend unavailable"**
- Check: Is `python app.py` still running?
- Check: Verify IP in config.js (192.168.254.156)
- Fix: Reload extension (chrome://extensions)
- Test: Visit http://192.168.254.156:5000 in browser

### **Config.js changes not taking effect**
- Make sure you saved the file (Ctrl+S)
- Reload extension in Chrome (circular arrow icon)
- Clear Chrome cache (Ctrl+Shift+Delete) if persistent

### **Can't see backend URL in extension**
- Open extension settings
- Go to Website details: chrome://extensions/
- Check "Allow in incognito" is enabled

### **Parent dashboard loads but shows API errors**
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Common error: "Connection refused at 192.168.254.156"
   - This means backend not running
   - Solutions:
     - Run: `python app.py`
     - Check: `netstat -an | findstr 5000`

---

## 📝 Quick Reference - Config URLs

| Scenario | URL | File |
|----------|-----|------|
| Local testing | http://localhost:5000 | config.js line 13 |
| Network testing | http://192.168.254.156:5000 | config.js line 14 |
| Production | https://safeguard-family.vercel.app | config.js line 11 |

---

## ✨ Summary

1. Edit `chrome-extension/config.js` → Change baseURL
2. Reload extension in Chrome
3. Parent accesses: http://192.168.254.156:5000
4. Monitor child activity in real-time!

That's it! 🚀
