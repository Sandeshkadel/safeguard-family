# 📝 How to Update Extension Config & Test

## What Does "Update Extension Config" Mean?

The Chrome extension needs to know where your backend server is located. When you deploy to Vercel, you need to tell the extension to use your Vercel URL instead of your local computer.

---

## 🎯 Complete Process (Step-by-Step)

### **STEP 1: Deploy Backend to Vercel**

Open terminal and run:

```bash
cd backend/safeguard_server
vercel login
vercel --prod
```

**Expected output:**
```
...building...
✓ Production: https://safeguard-abc123.vercel.app [23s]
```

**📋 Copy this URL!** You need it for the next step.

Example URLs you might get:
- `https://safeguard-abc123.vercel.app`
- `https://comfilter-xyz789.vercel.app`
- `https://your-chosen-name.vercel.app`

---

### **STEP 2: Update Extension Config**

#### Option A: Edit Manually (Recommended)

1. **Open the file:**
   ```
   chrome-extension/config.js
   ```

2. **Find line 10-ish** (look for `baseURL:`):
   ```javascript
   baseURL: 'https://YOUR-APP-NAME.vercel.app',
   ```

3. **Replace with YOUR actual Vercel URL:**
   ```javascript
   baseURL: 'https://safeguard-abc123.vercel.app',  // ← PASTE YOUR URL HERE
   ```

4. **Save the file** (Ctrl+S)

#### Before/After Example:

**BEFORE:**
```javascript
const API_CONFIG = {
  baseURL: 'https://YOUR-APP-NAME.vercel.app',  // ← Placeholder
  endpoints: {
    // ...
  }
};
```

**AFTER:**
```javascript
const API_CONFIG = {
  baseURL: 'https://safeguard-abc123.vercel.app',  // ← Your actual URL
  endpoints: {
    // ...
  }
};
```

**⚠️ Important:**
- ✅ Use `https://` (not `http://`)
- ✅ NO trailing slash (`/`) at the end
- ✅ Copy the EXACT URL from Vercel output
- ❌ Don't leave it as `YOUR-APP-NAME.vercel.app`

---

### **STEP 3: Load/Reload Extension in Chrome**

#### If Extension is NOT Loaded Yet:

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Navigate to and select the `chrome-extension` folder
6. Click "Select Folder"

#### If Extension is ALREADY Loaded:

1. Open Chrome
2. Go to `chrome://extensions/`
3. Find "SafeGuard Family" (or your extension name)
4. Click the 🔄 **Reload** button (circular arrow)

---

### **STEP 4: Test the Connection**

Now verify the extension can connect to your Vercel backend:

#### Test 1: Register a Parent Account

1. Click the extension icon in Chrome toolbar
2. Click "Register" or "Parent Setup"
3. Fill in:
   - Email: `test@example.com`
   - Password: `Test123!`
   - Name: `Test Parent`
4. Click "Register"

**Expected result:**
- ✅ Success message: "Registration successful!"
- ✅ Redirects to dashboard or next step

**If you see error:**
- ❌ "Failed to fetch" → Config URL is wrong
- ❌ "Network error" → Backend not deployed or URL typo
- ❌ "CORS error" → Backend CORS not configured (should be fine)

#### Test 2: Check Dashboard

1. After registering, open the dashboard
2. Either:
   - Click extension → "Open Dashboard"
   - OR go directly to: `https://your-app.vercel.app`
3. Login with the account you just created
4. You should see the parent dashboard

#### Test 3: Add a Blocked Site

1. In the extension or dashboard
2. Add a blocked website (e.g., `example.com`)
3. Try to visit `example.com`
4. Should be blocked with a block page

**If blocking works:** ✅ Everything is configured correctly!

---

## 🔍 Troubleshooting

### Error: "Failed to fetch"

**Cause:** Extension can't reach the backend URL

**Solutions:**
1. Check if you saved `config.js` after editing
2. Verify URL has NO trailing slash: `https://app.vercel.app` not `https://app.vercel.app/`
3. Make sure you used `https://` not `http://`
4. Reload extension: `chrome://extensions/` → click reload
5. Check Vercel URL is actually working: Open it in browser

### Error: "CORS policy blocked"

**Cause:** Backend doesn't allow requests from extension

**Solution:**
- Should already be configured in Flask app
- Check `app.py` has `CORS(app)` enabled
- Redeploy if needed: `vercel --prod`

### Error: "404 Not Found"

**Cause:** API endpoint doesn't exist

**Solution:**
- Check the endpoint in config.js matches backend routes
- Visit `https://your-app.vercel.app/api` in browser to test
- Check Vercel deployment logs

### Extension Shows Old Data

**Cause:** Browser cache

**Solution:**
1. Clear extension data:
   - Right-click extension icon
   - "Inspect popup"
   - Console tab
   - Type: `chrome.storage.local.clear()`
2. Reload extension
3. Try again

---

## 📊 Quick Checklist

Before testing, ensure:

- [ ] Backend deployed to Vercel successfully
- [ ] Copied exact Vercel URL (with `https://`)
- [ ] Updated `chrome-extension/config.js` line 10
- [ ] Saved the config.js file
- [ ] Reloaded extension in Chrome
- [ ] Extension icon is visible in toolbar

After testing, verify:

- [ ] Can register parent account
- [ ] Can login to dashboard
- [ ] Can add blocked sites
- [ ] Blocking actually works
- [ ] Dashboard shows data
- [ ] Full URLs displaying (not just domains)
- [ ] Device names showing

---

## 🎯 Example: Complete Flow

Here's a real example from start to finish:

### 1. Deploy Backend
```bash
cd backend/safeguard_server
vercel --prod
```
Output: `https://safeguard-family-abc123.vercel.app`

### 2. Update Config
Open `chrome-extension/config.js`:
```javascript
// Change this line:
baseURL: 'https://YOUR-APP-NAME.vercel.app',

// To this (using the URL from step 1):
baseURL: 'https://safeguard-family-abc123.vercel.app',
```
Save file.

### 3. Reload Extension
- Go to `chrome://extensions/`
- Find your extension
- Click 🔄 reload button

### 4. Test
- Click extension icon
- Register: `parent@email.com` / `SecurePass123!`
- Should work and show success message
- Open dashboard at `https://safeguard-family-abc123.vercel.app`
- Login should work
- Add a blocked site → test blocking

**Done!** ✅

---

## 💡 Pro Tips

1. **Bookmark your Vercel URL** - You'll need it often
2. **Test in incognito** - To verify without cached data
3. **Check browser console** - Press F12 to see any errors
4. **Keep local version** - Comment out local config, don't delete it

```javascript
const API_CONFIG = {
  // Production
  baseURL: 'https://safeguard-abc123.vercel.app',
  
  // Local development (keep commented for reference)
  // baseURL: 'http://192.168.254.156:3000',
```

4. **Test on another device** - Ensure it works universally

---

## 📞 Need Help?

If something isn't working:

1. Check Vercel deployment status: `vercel ls`
2. View Vercel logs: `vercel logs`
3. Test backend directly: Visit `https://your-app.vercel.app/api` in browser
4. Check extension console: Right-click extension → Inspect → Console tab
5. Verify config.js was saved: Re-open file and check URL is correct

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Extension connects without "Failed to fetch" errors
2. ✅ Parent registration works
3. ✅ Dashboard loads at your Vercel URL
4. ✅ Can add/remove blocked sites
5. ✅ Blocked sites actually get blocked
6. ✅ Dashboard shows browsing history
7. ✅ Full URLs display (not just domains)
8. ✅ Device names show correctly

---

**That's it!** You've successfully updated the extension config and can now test your deployed application. 🎉
