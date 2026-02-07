# SafeGuard Family - Local Development Setup

## 🚀 Quick Start (Windows)

### Option 1: Run with batch file (easiest)
1. Double-click: `RUN_LOCAL.bat`
2. Wait for the server to start
3. Open your browser and go to: http://localhost:5000

### Option 2: Manual startup with terminal
1. Open **PowerShell** or **Command Prompt**
2. Navigate to the project folder:
   ```
   cd C:\Users\acer\OneDrive\Desktop\ComFilter
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Run the server:
   ```
   python app.py
   ```
5. Open browser: http://localhost:5000

---

## ✅ What You'll See

When the server starts, you should see:
```
======================================================================
🚀 SafeGuard Backend Server Starting...
======================================================================

📱 Local Access (same device):
   🔗 Dashboard: http://localhost:5000
   🔗 API: http://localhost:5000/api

🌐 Network Access (from other devices):
   Replace 'localhost' with your computer IP address
   Example: http://192.168.1.X:5000

💾 Database: instance/safeguard.db (local file)
======================================================================

⌨️  Press Ctrl+C to stop the server
```

---

## 🌐 Access the Dashboard

### From Same Device
- Open browser and go to: **http://localhost:5000**

### From Other Device on Network
1. Find your computer's IP address:
   - **Windows:** Open Command Prompt and type `ipconfig`
   - Look for "IPv4 Address" (usually starts with 192.168.x.x)

2. On the other device, open browser and go to:
   - **http://YOUR_COMPUTER_IP:5000**
   - Example: http://192.168.1.100:5000

---

## 📱 First Time Login

### Create Parent Account
1. When you open the dashboard, you should see a login page
2. Click **Register**
3. Fill in:
   - **Email:** your_email@example.com
   - **Password:** your password (min 6 chars)
   - **Full Name:** Your Name
4. Click **Register**

### Login
1. Use your email and password to login
2. You'll see the dashboard

### Create Child Profile
1. In the dashboard, you can add a child
2. Give the child a name (e.g., "John")
3. This creates a profile to monitor

---

## 🗄️ Database Location

Your data is stored in a local file:
```
C:\Users\acer\OneDrive\Desktop\ComFilter\instance\safeguard.db
```

**This file is:**
- ✅ Automatically created on first run
- ✅ Persists across server restarts
- ✅ Stores all parent accounts, children, devices, and logs

**To reset everything:**
- Stop the server (Ctrl+C)
- Delete the file: `instance\safeguard.db`
- Run the server again (new empty database)

---

## 🔌 API Endpoints (for developers)

Once the server is running, you can test API calls:

### Register Parent
```
POST http://localhost:5000/api/auth/register
Body: {
  "email": "parent@example.com",
  "password": "SecurePass123",
  "full_name": "John Parent"
}
```

### Login
```
POST http://localhost:5000/api/auth/login
Body: {
  "email": "parent@example.com",
  "password": "SecurePass123"
}
Returns: { "token": "abc123...", "parent_id": "xyz..." }
```

### Get Children
```
GET http://localhost:5000/api/children
Header: Authorization: Bearer abc123...
```

Full API docs: http://localhost:5000/api

---

## ⚙️ Configuration

### Change Server Port
If port 5000 is already in use, edit `app.py` at the bottom:
```python
app.run(
    host='0.0.0.0',
    port=5000,  # Change this number
    debug=True
)
```

### Disable Debug Mode
For production, change in `app.py`:
```python
app.run(
    host='0.0.0.0',
    port=5000,
    debug=False  # Set to False
)
```

---

## 🐛 Troubleshooting

### "Port 5000 already in use"
- Change port number in app.py (see Configuration above)
- Or close the application using port 5000

### "ModuleNotFoundError: No module named 'flask'"
- Run: `pip install -r requirements.txt`

### "Database locked"
- Stop the server (Ctrl+C)
- Wait 5 seconds
- Start again

### Dashboard not loading
- Make sure browser goes to `http://localhost:5000` (not https://)
- Check the terminal for error messages
- Clear browser cache (Ctrl+Shift+Delete)

---

## 📦 What's Included

```
SafeGuard Family Backend includes:
✅ Parent authentication (register/login)
✅ Child profile management
✅ Device tracking
✅ Browsing history logging
✅ Website blocking logs
✅ Custom blocklist/allowlist
✅ Web dashboard
✅ Persistent local database
✅ REST API
✅ CORS support for mobile apps
```

---

## 🎯 Next Steps

1. ✅ Run the server (RUN_LOCAL.bat or python app.py)
2. ✅ Register a parent account
3. ✅ Create a child profile
4. ✅ Test the dashboard features
5. ✅ Deploy to Vercel when ready (use DATABASE_URL environment variable)

---

## 📞 Support

If something doesn't work:
1. Check error messages in the terminal
2. Make sure Python is installed: `python --version`
3. Make sure Flask is installed: `pip list | findstr Flask`
4. Restart the server

Enjoy SafeGuard! 🛡️
