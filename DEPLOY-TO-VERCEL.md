# 🚀 DEPLOY TO VERCEL - Complete Guide

Your SafeGuard Family is ready for production! Here's the step-by-step deployment process.

---

## ⏱️ **Total Time: ~30 Minutes**

- Backend deployment: 10 min
- Extension update: 5 min
- Testing: 10 min
- Chrome Web Store: 5 min

---

## 📋 **Prerequisites Checklist**

Before starting, verify:

- [ ] Flask server running without errors
- [ ] All tests passing: `python test_system.py`
- [ ] History logging working in dashboard
- [ ] Extension loading without errors
- [ ] Vercel account created (free: https://vercel.com)
- [ ] GitHub account with your code repo

---

## **PHASE 1: Deploy Backend to Vercel**

### **Step 1.1: Install Vercel CLI**

```powershell
npm install -g vercel
```

Verify installation:
```powershell
vercel --version
```

Should show: `Vercel CLI 28.x.x` (or higher)

### **Step 1.2: Login to Vercel**

```powershell
vercel login
```

Choose:
- Provider: **GitHub** (recommended)
- Opens browser → Click "Authorize"

### **Step 1.3: Deploy Backend**

```powershell
cd c:\Users\acer\OneDrive\Desktop\ComFilter\backend\safeguard_server
vercel --prod
```

You'll be asked several questions:

| Question | Answer |
|----------|--------|
| Link to existing project? | **N** (No) |
| Set up and deploy? | **Y** (Yes) |
| Project name? | `safeguard-family` |
| Which scope? | Your username |
| Link to existing? | **N** |
| Framework? | **Other** |
| Root directory? | **./** |
| Build command? | **ignore** (press Enter) |
| Output directory? | **press Enter** |

### **Step 1.4: Wait for Deployment**

Watch the output. When done, you'll see:

```
✅ Production: https://safeguard-family-abc123.vercel.app
```

**SAVE THIS URL** - you'll need it!

### **Step 1.5: Verify Deployment**

Open browser and test:
```
https://safeguard-family-abc123.vercel.app/api
```

Should return JSON:
```json
{
  "status": "ok",
  "message": "SafeGuard Family API v1.0",
  "endpoints": { ... }
}
```

**NOT:** "Not Found" error

---

## **PHASE 2: Update Extension Config**

### **Step 2.1: Edit Extension Config**

Open file: `chrome-extension/config.js`

Around line **9**, change:

```javascript
// OLD (localhost):
baseURL: 'http://192.168.254.156:3000',

// NEW (Vercel - use YOUR URL from Step 1.4):
baseURL: 'https://safeguard-family-abc123.vercel.app',
```

**Example:**
If your Vercel URL is `https://safeguard-family-xyz789.vercel.app`, change it to exactly that.

### **Step 2.2: Save File**

Save `chrome-extension/config.js`

### **Step 2.3: Reload Extension in Chrome**

```
1. Open: chrome://extensions/
2. Find: SafeGuard Family
3. Click: Reload button (arrow icon)
```

Extension reloads automatically with new URL.

---

## **PHASE 3: Test Production Deployment**

### **Step 3.1: Update Dashboard URL**

Open browser and go to (use YOUR Vercel URL):
```
https://safeguard-family-abc123.vercel.app/dashboard
```

You should see the dashboard page.

### **Step 3.2: Create Test Account**

You can either:
- Log in with existing account (from before)
- OR create new account to verify deployment

### **Step 3.3: Test Extension with Vercel**

1. Visit some websites
2. Check dashboard History tab
3. Should see visited sites

### **Step 3.4: Run Full Test Suite**

In new terminal, update IP/URL and run:

```powershell
# Edit test_system.py line that sets BASE_URL to your Vercel URL
# Or test manually using curl:
Invoke-WebRequest https://safeguard-family-abc123.vercel.app/api
```

Should return JSON, not errors.

---

## **PHASE 4: Submit to Chrome Web Store**

### **Step 4.1: Create Developer Account**

1. Go: https://chrome.google.com/webstore/devconsole
2. Sign in with Google account
3. Pay **$5 developer fee** (one-time)

### **Step 4.2: Package Extension**

Create ZIP file of extension:

```powershell
# Navigate to ComFilter folder
cd c:\Users\acer\OneDrive\Desktop\ComFilter

# Create ZIP file
Compress-Archive -Path chrome-extension -DestinationPath chrome-extension.zip
```

This creates: `chrome-extension.zip`

### **Step 4.3: Create New Item**

1. Go to Chrome Web Store devconsole
2. Click **+ New item**
3. Upload `chrome-extension.zip`

### **Step 4.4: Fill Store Listing**

| Field | Value |
|-------|-------|
| **Name** | SafeGuard Family - Parental Control |
| **Description** | Comprehensive parental control system. Block inappropriate websites, monitor activity, and protect children online. |
| **Category** | Productivity |
| **Language** | English |
| **Homepage URL** | https://safeguard-family-abc123.vercel.app |
| **Support Email** | your-email@example.com |
| **Privacy Policy** | https://safeguard-family-abc123.vercel.app/privacy.html |

### **Step 4.5: Upload Screenshots**

Upload 3 screenshots (1280x800 each):

Screenshot 1: Dashboard overview
Screenshot 2: Blocklist feature
Screenshot 3: History tracking

### **Step 4.6: Review & Submit**

1. Check all fields filled
2. Review content policy (parental control OK)
3. Click **Submit for Review**

### **Step 4.7: Wait for Review**

Google reviews in **3-5 days**:
- ✅ Approved → Listed automatically
- ❌ Rejected → Email with reason

---

## 🎉 **After Approval**

Extension appears in Chrome Web Store!

Users can:
1. Search "SafeGuard Family"
2. Click "Add to Chrome"
3. Extension installs automatically

---

## 🔄 **Update & Maintenance**

### **Update Extension Version**

1. Change version in `chrome-extension/manifest.json`:
   ```json
   "version": "1.0.1"  // Increment number
   ```

2. Re-upload to Chrome Web Store:
   - Update from devconsole
   - Choose new `chrome-extension.zip`
   - Submit (much faster, ~24 hours)

### **Update Backend**

```powershell
cd c:\Users\acer\OneDrive\Desktop\ComFilter\backend\safeguard_server
vercel --prod
```

Auto-deploys latest code.

---

## ✅ **Post-Deployment Checklist**

After everything is live:

- [ ] Vercel backend responding
- [ ] Extension working with Vercel URL
- [ ] History logging to production database
- [ ] Dashboard loads from Vercel
- [ ] Chrome Web Store submission pending/approved
- [ ] Users can install extension
- [ ] Test account works end-to-end

---

## 📞 **Troubleshooting**

### **"Connection refused" with Vercel URL**

**Solution:** Make sure you edited `chrome-extension/config.js` correctly and reloaded the extension.

Test URL in browser first:
```
https://safeguard-family-abc123.vercel.app/api
```

### **Extension still connects to localhost**

**Solution:** 
1. Go to `chrome://extensions/`
2. Find SafeGuard Family
3. Clear data (⋯ menu → Clear data)
4. Reload extension

### **Chrome Web Store rejects submission**

**Common reasons:**
- Missing privacy policy → Add to extension
- Suspicious permissions → Update manifest.json description
- Incomplete form → Fill all required fields

Check rejection email for exact reason.

### **History not syncing with Vercel**

**Check:**
```powershell
# Test endpoint directly
curl https://safeguard-family-abc123.vercel.app/api/logs/history

# Should return JSON, not error
```

---

## 📊 **Vercel Dashboard**

You can monitor your deployment at:
- https://vercel.com/dashboard
- See deployments, logs, analytics

---

## 🎯 **Success Criteria**

Your deployment is successful when:

✅ Backend running on Vercel
✅ Extension configured for Vercel URL
✅ History logging works end-to-end
✅ Dashboard loads from Vercel
✅ All APIs returning JSON (not errors)
✅ Chrome Web Store awaiting review/approved

---

## 🚀 **You Did It!**

SafeGuard Family is now:
- ✅ Deployed to production
- ✅ Available in Chrome Web Store (pending)
- ✅ Protected by modern security
- ✅ Scaling automatically with Vercel
- ✅ Ready to protect families!

---

**Questions? Check:**
- Vercel logs: https://vercel.com/dashboard
- Chrome Web Store: https://chrome.google.com/webstore/devconsole
- Our docs: See TROUBLESHOOTING-HISTORY-LOGGING.md

