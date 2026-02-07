# 🚀 QUICK DEPLOY COMMANDS

## Deploy to Vercel (1 minute)

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Navigate to backend
cd backend/safeguard_server

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

**You'll get:** `https://your-app.vercel.app`

---

## Update Extension Config

Edit `chrome-extension/config.js`:
```javascript
const API_CONFIG = {
  baseURL: 'https://your-app.vercel.app',  // ← YOUR VERCEL URL
  // ...
};
```

---

## Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `chrome-extension` folder

Done! ✅

---

## Test Commands

### Run System Tests (after backend is live)
```bash
python test_system.py
```

### Test Backend Locally
```bash
cd backend/safeguard_server
python app.py
```

### Verify Extension
```powershell
.\Test-Backend.ps1
```

---

## Package Extension for Chrome Store

```bash
cd chrome-extension
# Zip all files
# Submit to Chrome Web Store
```

---

## File Structure Quick View

```
✅ backend/safeguard_server/  ← Deploy this to Vercel
✅ chrome-extension/          ← Load this in Chrome
✅ docs/                      ← Reference docs
✅ README.md                  ← Start here
✅ DEPLOY-TO-VERCEL.md       ← Full guide
```

---

## Status: ✅ READY TO DEPLOY

All fixes complete:
- ✅ CSP violations fixed
- ✅ Full URLs showing
- ✅ Device names working
- ✅ Files cleaned up
- ✅ Documentation ready

**Just deploy and test!** 🎉
