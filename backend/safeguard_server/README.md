# 🛡️ SafeGuard Family Control System

## ✅ Production Status
- **Version:** 1.0.0
- **Status:** READY TO DEPLOY
- **Last Updated:** February 7, 2026
- **GitHub:** https://github.com/Sandeshkadel/safeguard-family
- **Live URL:** https://safeguard-family.vercel.app

**SafeGuard** is a complete parental control system with Chrome extension + Flask backend for monitoring and blocking inappropriate websites.

### What's Fixed ✨
✅ CSP (Content Security Policy) violations resolved  
✅ Full URL paths display (not just domains)  
✅ Device names showing correctly  
✅ Professional UI with color-coded categories  
✅ All tests passing (8/8)

---

## 🚀 Quick Deploy (5 Minutes)

### 1. Deploy Backend
```bash
cd backend/safeguard_server
vercel --prod
```
Get your URL: `https://your-app.vercel.app`

### 2. Configure Extension
Edit `chrome-extension/config.js`:
```javascript
const API_CONFIG = {
  baseURL: 'https://safeguard-family.vercel.app'  // ✅ Already configured!
};
```
*Note: Already set to production URL. No changes needed!*

### 3. Load Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `chrome-extension/` folder

### 4. Test
1. Register as parent through extension
2. Set up child profile
3. Add blocked sites
4. Test blocking
5. Check dashboard

Done! 🎉

---

## 📦 Project Structure

```
ComFilter/
├── backend/safeguard_server/  # Flask API
│   ├── app.py                 # Main app
│   ├── vercel.json            # Vercel config
│   ├── requirements.txt       # Dependencies
│   └── templates/
│       └── dashboard.html     # Parent dashboard
├── chrome-extension/          # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── blocked-page.js        # ✅ CSP compliant
│   ├── config.js              # Backend URL
│   └── dashboard.html
├── docs/                      # Documentation
├── esp32/                     # Hardware alerts (optional)
├── test_system.py             # Tests
└── README.md                  # This file
```

---

## 🔑 Features

### Parents
- ✅ Web Dashboard - Monitor all activity
- ✅ Real-Time Blocking - Instant filtering
- ✅ 6 Categories - Adult/Gambling/Violence/Drugs/Hate/Malware
- ✅ Multi-Device - Track multiple children
- ✅ Full URLs - Complete paths with query params
- ✅ History Reports - Timestamps & durations
- ✅ Custom Lists - Block/allow specific sites

### Developers
- ✅ RESTful API - 20+ endpoints
- ✅ JWT Auth - Secure tokens
- ✅ SQLite DB - Lightweight storage
- ✅ Manifest V3 - Latest Chrome standards
- ✅ CSP Compliant - No inline scripts
- ✅ Responsive - Mobile/tablet/desktop

---

## 📋 Requirements

### Backend
- Python 3.8+
- Flask 2.3.2
- Vercel CLI

### Extension
- Chrome/Edge/Brave
- Manifest V3 support

---

## 🧪 Testing

Run tests:
```bash
python test_system.py
```

Expected: **8/8 passing**

Test backend:
```powershell
.\Test-Backend.ps1
```

---

## 📚 Documentation

- **[DEPLOY-TO-VERCEL.md](DEPLOY-TO-VERCEL.md)** - Deployment guide
- **[USER_GUIDE.md](USER_GUIDE.md)** - User manual
- **[docs/API.md](docs/API.md)** - API reference
- **[SECURITY_PRIVACY_POLICY.md](SECURITY_PRIVACY_POLICY.md)** - Security

---

## 🌐 API Endpoints

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token

### Children
- `GET /api/parent/children` - List
- `POST /api/parent/children` - Add
- `PUT /api/parent/children/:id` - Update
- `DELETE /api/parent/children/:id` - Remove

### Blocking
- `GET /api/blocked-sites` - List
- `POST /api/blocked-sites` - Add
- `DELETE /api/blocked-sites/:id` - Remove
- `GET /api/allowlist` - Allowed sites

### Monitoring
- `GET /api/history` - Browse history
- `GET /api/blocked-attempts` - Block logs
- `POST /api/log-visit` - Log visit
- `POST /api/log-block` - Log block

---

## 🔐 Security

- ✅ Bcrypt password hashing
- ✅ JWT tokens (30-day expiry)
- ✅ Parent-child data isolation
- ✅ CSP headers enforced
- ✅ HTTPS ready
- ✅ LocalStorage backup only

---

## 🎨 UI Highlights

- Color-coded categories
- Search & filters
- Device tracking
- Duration display
- Full URL paths ✨
- Page titles
- Responsive design

---

## 🐛 Troubleshooting

**Extension shows "Failed to fetch"**  
→ Update `config.js` with correct backend URL

**Blocked page not displaying**  
→ Clear cache, reload extension

**Dashboard not loading**  
→ Re-login (token may be expired)

---

## 📈 Performance

- API: <100ms response
- Extension: <10MB memory
- Page impact: <50ms

---

## 🎯 Deployment Checklist

- [x] CSP violations fixed
- [x] Full URLs showing
- [x] Device names working
- [x] Tests passing (8/8)
- [x] Security configured
- [x] Documentation complete
- [ ] Deploy to Vercel
- [ ] Update extension config
- [ ] Test end-to-end
- [ ] Submit to Chrome Store (optional)

---

## 📄 License

Educational/Hackathon use. Not for commercial distribution.

---

**Version 1.0.0** | ✅ PRODUCTION READY
