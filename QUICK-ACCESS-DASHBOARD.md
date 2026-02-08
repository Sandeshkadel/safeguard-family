# 🚀 Quick Start - Access Dashboard at 192.168.254.156:5000

## 1️⃣ Start Backend Server

**Choose one method:**

### Method A: Easy Button (Recommended)
1. Open file: `C:\Users\acer\OneDrive\Desktop\ComFilter\RUN_LOCAL.bat`
2. Double-click it
3. Black window should show:
   ```
   🚀 SafeGuard Backend Server Starting...
   📱 API: http://0.0.0.0:5000
   ```
4. Leave it running

### Method B: Command Line
```powershell
cd C:\Users\acer\OneDrive\Desktop\ComFilter
python app.py
```

---

## 2️⃣ Access Dashboard

### From Your Computer (Same Network)
- Open browser: **http://192.168.254.156:5000**
- You should see SafeGuard login page

### From Another Device on Same Network
- Replace `192.168.254.156` with your actual IP if different
- Example: Parent's phone: **http://192.168.254.156:5000**

---

## 3️⃣ First Time Setup (2-5 minutes)

### Step 1: Register Parent Account
```
Email: parent@example.com
Password: YourStrongPassword123
→ Click "Register"
```

### Step 2: Create Child Profile
```
Child Name: "Johnny"
→ Click "Create Child"
→ Copy the CHILD_ID (you'll need this!)
```

Example Child ID:
```
550e8400-e29b-41d4-a716-446655440000
```

### Step 3: Install Extension on Child Device

On child's computer:
1. Open Chrome browser
2. Type in address bar: `chrome://extensions/`
3. Enable "Developer Mode" (toggle top right)
4. Click "Load unpacked"
5. Browse to: `C:\Users\acer\OneDrive\Desktop\ComFilter\chrome-extension`
6. Click "Select Folder"

### Step 4: Setup Extension ID

On child's device:
1. Click SafeGuard icon in Chrome toolbar
2. Click "Setup Child Account"
3. Paste the CHILD_ID from Step 2
4. Click "Setup"

**That's it!** Extension is now active and logging data.

---

## 4️⃣ Monitor Child Activity

Go back to parent dashboard: **http://192.168.254.156:5000**

### Tabs Available:

**📊 Overview**
- Quick stats (total blocks, today's blocks, total visits)
- Recent blocked sites

**🧾 All Visits**
- EVERY website child visited
- Search by URL
- Filter by date
- Export as CSV

**🚫 Blocked Sites**
- Every attempt to visit blocked content
- See why it was blocked (category)
- See exact time

**📋 Manage Lists**
- **ADD BLOCKS** (ban any website instantly)
  - Type: `facebook.com`
  - Category: `Custom`
  - Click "Add Block"
- **ADD WHITELIST** (allow specific sites)
  - Type: `khan-academy.com`
  - Click "Add Allow"
- See existing blocks

**⚙️ Settings**
- Toggle blocking categories on/off
- Block Adult, Gambling, Violence, Drugs, Hate, Malware

---

## 5️⃣ Ban a Site (Parent Control)

This is the power of SafeGuard - parents can ban ANY site in 3 clicks:

1. **Go to:** Manage Lists tab
2. **Type:** `youtube.com` (or any domain)
3. **Click:** Add Block button
4. ✅ **Done!** Instantly blocked on child's device

To unban:
1. **Go to:** Manage Lists tab
2. **Find:** The domain in blocklist
3. **Click:** Remove button
4. ✅ **Done!** Unblocked instantly

---

## 6️⃣ Data Confirmed Working

✅ **Extension logs data** to `instance/safeguard.db`
✅ **Dashboard shows data** from database
✅ **Parent can ban/unban instantly**
✅ **All features are live and functional**

---

## 📊 Real-Time Example

**What you see as parent:**

```
OVERVIEW
├─ Total Blocked: 47
├─ Blocked Today: 5
├─ Total Visits: 312
└─ Top Category: Adult

ALL VISITS (Sample)
├─ 3:45 PM → google.com
├─ 3:42 PM → youtube.com
├─ 3:40 PM → khan-academy.com
├─ 3:38 PM → reddit.com
└─ [SEARCH AVAILABLE]

BLOCKED SITES
├─ 2:15 PM → adult-site.com [ADULT]
├─ 1:50 PM → casino.bet [GAMBLING]
├─ 1:22 PM → violent-video.com [VIOLENCE]
└─ [FILTER BY CATEGORY]

MANAGE LISTS
├─ ADD BLOCK:
│  ├─ Domain: facebook.com
│  ├─ Category: Custom
│  └─ → Add Block ✓
└─ [ALL EXISTING BLOCKS LISTED]
```

---

## 🔌 Network Access Verified

Your system:
- ✅ IP: 192.168.254.156
- ✅ Port: 5000
- ✅ Database: `instance/safeguard.db`
- ✅ API: Fully functional
- ✅ Parent dashboard: Ready
- ✅ All data features: Enabled

---

## ⚠️ If Something Doesn't Work

### Issue: "Page not found" at http://192.168.254.156:5000

**Fix:**
1. Check server is running (see Step 1)
2. Verify correct IP: open Command Prompt → type `ipconfig` → look for IPv4 Address
3. Check Windows Firewall: Allow Python through firewall
4. Try localhost first: http://localhost:5000
5. If localhost works but IP doesn't → firewall issue

### Issue: "No data in dashboard"

**Fix:**
1. Extension must be installed on child device
2. Child must visit some websites after setup
3. Check Child ID is correct (copy-paste carefully)
4. Wait a few seconds for data to sync
5. Refresh dashboard (F5)

### Issue: "Can't add blocks"

**Fix:**
1. Check you're logged in
2. Check Flask server running
3. Try logging out and back in
4. Check auth token is valid

---

## 💡 Pro Tips

1. **Bookmark the dashboard:** http://192.168.254.156:5000
2. **Check daily:**        Review what child accessed
3. **Set categories:**     Block Adult + Gambling + Violence
4. **Whitelist school:**   Add school websites to allowlist
5. **Export reports:**     Use CSV export for records

---

## ✨ You're All Set!

Your SafeGuard system is:
- ✅ **Data connected** (backend database working)
- ✅ **Parent dashboard live** (full control interface)
- ✅ **Extension logging** (all activity captured)
- ✅ **Banning ready** (ban any site instantly)

**Start monitoring:** http://192.168.254.156:5000 🚀

---

## 📞 Quick Commands

Check if server running:
```powershell
netstat -an | findstr 5000
# Should show: TCP 0.0.0.0:5000 LISTENING
```

Restart server:
```powershell
# Stop: Press Ctrl+C in the server window
# Restart: python app.py
```

Clear database (start fresh):
```powershell
cd C:\Users\acer\OneDrive\Desktop\ComFilter
Remove-Item instance\safeguard.db
python app.py
```

---

## 📚 More Information

See detailed guide: `DATA-CONNECTION-GUIDE.md`
See setup guide: `LOCAL_SETUP.md`
