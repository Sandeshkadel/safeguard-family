# 🎯 SIMPLE GUIDE: Update Extension Config

## What You Need to Do (3 Steps)

```
┌────────────────────────────────────────────────────────┐
│  STEP 1: DEPLOY BACKEND                                │
└────────────────────────────────────────────────────────┘

Open terminal, run:
    cd backend/safeguard_server
    vercel --prod

You'll get a URL like:
    ✓ https://safeguard-abc123.vercel.app

👉 COPY THIS URL!


┌────────────────────────────────────────────────────────┐
│  STEP 2: UPDATE CONFIG FILE                            │
└────────────────────────────────────────────────────────┘

Open this file:
    📂 chrome-extension/config.js

Find line 10:
    baseURL: 'https://YOUR-APP-NAME.vercel.app',

Replace with YOUR URL from Step 1:
    baseURL: 'https://safeguard-family.vercel.app',

💾 SAVE THE FILE


┌────────────────────────────────────────────────────────┐
│  STEP 3: RELOAD EXTENSION                              │
└────────────────────────────────────────────────────────┘

In Chrome:
    1. Go to: chrome://extensions/
    2. Find your extension
    3. Click the 🔄 reload button

DONE! ✅
```

---

## Example: What to Change

### In `chrome-extension/config.js`

**BEFORE (with placeholder):**
```javascript
const API_CONFIG = {
  baseURL: 'https://YOUR-APP-NAME.vercel.app',  // ❌ Placeholder
```

**AFTER (with your real URL):**
```javascript
const API_CONFIG = {
  baseURL: 'https://safeguard-abc123.vercel.app',  // ✅ Your actual URL
```

---

## How to Test

1. Click extension icon
2. Try to register: `test@email.com` / `Password123!`
3. Should work WITHOUT errors
4. If you see "Failed to fetch" → URL is wrong, check again

---

## ⚠️ Common Mistakes

❌ Forgot to save config.js file  
❌ Left it as "YOUR-APP-NAME" (need actual URL)  
❌ Used `http://` instead of `https://`  
❌ Added slash at end: `https://app.vercel.app/` (remove `/`)  
❌ Forgot to reload extension  

✅ Use exact URL from Vercel  
✅ Save file after editing  
✅ Reload extension  
✅ Test registration  

---

## Quick Commands

```bash
# 1. Deploy
cd backend/safeguard_server && vercel --prod

# 2. Get Vercel URL (if you forgot)
vercel ls

# 3. Test backend directly
curl https://your-app.vercel.app/api
```

---

**That's all!** Just copy your Vercel URL into config.js and reload the extension. 🚀
