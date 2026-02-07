# 🚀 Setup Guide - SafeGuard Family

Complete installation and configuration guide for the SafeGuard Family parental control system.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Database Setup](#database-setup)
4. [Chrome Extension Setup](#chrome-extension-setup)
5. [ESP32 Device Setup](#esp32-device-setup)
6. [Parent Dashboard Setup](#parent-dashboard-setup)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### System Requirements

| Component | Minimum Requirement |
|-----------|-------------------|
| Operating System | Windows 10/11, macOS 10.14+, Linux (Ubuntu 20.04+) |
| RAM | 4GB |
| Storage | 500MB free space |
| Internet | Broadband connection |
| Browser | Chrome/Edge (Chromium-based) |

### Software to Install

1. **Node.js** (v16 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **MongoDB** (v5.0 or higher)
   - **Option A:** Local Installation
     - Download: https://www.mongodb.com/try/download/community
   - **Option B:** MongoDB Atlas (Cloud - Recommended)
     - Sign up: https://www.mongodb.com/cloud/atlas

3. **Git** (for cloning repository)
   - Download: https://git-scm.com/

4. **Arduino IDE** (for ESP32)
   - Download: https://www.arduino.cc/en/software

5. **Code Editor** (Optional but recommended)
   - VS Code: https://code.visualstudio.com/

---

## 🗄️ Database Setup

### Option A: Local MongoDB

#### Windows:
```powershell
# Download MongoDB Installer
# Install MongoDB Community Edition
# MongoDB Compass (GUI) will be included

# Start MongoDB Service
net start MongoDB

# Verify installation
mongo --version
```

#### macOS (using Homebrew):
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0

# Verify
mongo --version
```

#### Linux (Ubuntu/Debian):
```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongod --version
```

### Option B: MongoDB Atlas (Cloud) [RECOMMENDED]

1. **Sign up for free:**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Create account (free tier available)

2. **Create a Cluster:**
   - Click "Build a Database"
   - Choose "Free" tier (M0)
   - Select cloud provider and region (choose closest to you)
   - Click "Create Cluster"

3. **Configure Access:**
   - Database Access:
     - Create database user
     - Username: `safeguard_admin`
     - Password: Generate strong password (save it!)
   - Network Access:
     - Add IP Address
     - For testing: Allow access from anywhere (0.0.0.0/0)
     - For production: Add your specific IP

4. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

---

## 🔧 Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

This will install all required packages:
- express (web server)
- mongoose (MongoDB ODM)
- nodemailer (email service)
- axios (HTTP client)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- cors, helmet (security)

### 3. Configure Environment Variables

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` file with your settings:

```bash
# ═══════════════════════════════════════════════
# SERVER CONFIGURATION
# ═══════════════════════════════════════════════
PORT=3000
NODE_ENV=development

# ═══════════════════════════════════════════════
# DATABASE (Choose one)
# ═══════════════════════════════════════════════

# Option A: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/safeguard-family

# Option B: MongoDB Atlas (replace with your connection string)
# MONGODB_URI=mongodb+srv://safeguard_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/safeguard-family?retryWrites=true&w=majority

# ═══════════════════════════════════════════════
# EMAIL SERVICE (Gmail)
# ═══════════════════════════════════════════════
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# How to get Gmail App Password:
# 1. Go to: https://myaccount.google.com/security
# 2. Enable 2-Step Verification
# 3. Go to: https://myaccount.google.com/apppasswords
# 4. Generate app password for "Mail"
# 5. Use that password here (16 characters, no spaces)

# ═══════════════════════════════════════════════
# ESP32 CONFIGURATION
# ═══════════════════════════════════════════════
ESP32_ENABLED=false
ESP32_ALERT_URL=http://192.168.1.100/alert
# Update this after setting up ESP32 device

# ═══════════════════════════════════════════════
# SECURITY
# ═══════════════════════════════════════════════
JWT_SECRET=change-this-to-a-random-secret-string-in-production
BCRYPT_ROUNDS=10

# ═══════════════════════════════════════════════
# DATA RETENTION
# ═══════════════════════════════════════════════
DATA_RETENTION_DAYS=30
```

### 4. Test Database Connection

Run the server:
```bash
npm start
```

Expected output:
```
╔════════════════════════════════════════════════════╗
║   🛡️  SafeGuard Family Backend Server           ║
╚════════════════════════════════════════════════════╝

✅ Connected to MongoDB database
✅ Server running on http://localhost:3000
✅ Environment: development
✅ Email Service: gmail
✅ ESP32 Alerts: Disabled
```

If you see errors:
- **MongoDB connection error:** Check MONGODB_URI
- **Email error:** Email will work but notifications may fail (configure later)

### 5. Verify API is Working

Open browser:
```
http://localhost:3000
```

You should see:
```json
{
  "status": "online",
  "service": "SafeGuard Family Backend",
  "version": "1.0.0"
}
```

---

## 🔌 Chrome Extension Setup

### 1. Locate Extension Files
```bash
cd chrome-extension
```

### 2. Create Icon Placeholders (Optional)

The extension references icons in `icons/` folder. For testing, you can skip this, but for production:

1. Use online tool: https://favicon.io/
2. Generate icons: 16x16, 48x48, 128x128 PNG
3. Save to `chrome-extension/icons/` folder

### 3. Update Backend URL (if needed)

Edit `chrome-extension/background.js`:
```javascript
const CONFIG = {
  BACKEND_URL: 'http://localhost:3000', // Change if backend is on different URL
  // ...
};
```

### 4. Load Extension in Chrome

1. Open Chrome/Edge browser
2. Go to: `chrome://extensions/`
3. Enable "**Developer mode**" (toggle in top-right)
4. Click "**Load unpacked**"
5. Select the `chrome-extension` folder
6. Extension should appear in list

### 5. Pin Extension to Toolbar

1. Click Extensions icon (puzzle piece) in Chrome toolbar
2. Find "SafeGuard Family"
3. Click pin icon to pin to toolbar

### 6. First-Time Setup (Parent Configuration)

**Important:** This should be done by the PARENT, not the child.

1. Click the SafeGuard Family extension icon
2. Automatic redirect to setup page
3. Fill in:
   - **Parent Email:** Your email address
   - **Parent Password:** Strong password (remember this!)
   - **Child Name:** Name of the child
4. Check consent checkbox
5. Click "Complete Setup & Activate Protection"

### 7. Verify Extension is Active

1. Click extension icon
2. Popup should show:
   - Status: "Active & Protecting"
   - Child name
   - Sites blocked count

---

## 📡 ESP32 Device Setup

### 1. Hardware Assembly

Follow the complete wiring guide in `esp32/wiring-diagram.md`

**Quick summary:**
- Buzzer → GPIO 25
- Red LED (+ 220Ω resistor) → GPIO 26
- Green LED (+ 220Ω resistor) → GPIO 27
- Button → GPIO 34

### 2. Software Setup

#### Install ESP32 Board Support in Arduino IDE

1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add to "Additional Board Manager URLs":
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
4. Go to **Tools → Board → Board Manager**
5. Search "ESP32"
6. Install "ESP32 by Espressif Systems"

#### Configure and Upload

1. Open `esp32/esp32_alert_system.ino`
2. Update WiFi credentials:
   ```cpp
   const char* WIFI_SSID = "YourHomeWiFi";
   const char* WIFI_PASSWORD = "YourWiFiPassword";
   ```
3. Select board: **Tools → Board → ESP32 Dev Module**
4. Select port: **Tools → Port → [Your COM Port]**
5. Click **Upload** (arrow button)
6. Wait for upload complete

### 3. Get ESP32 IP Address

1. Open **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. Press **Reset** button on ESP32
4. Look for line:
   ```
   WiFi Connected! IP Address: 192.168.1.105
   ```
5. **SAVE THIS IP ADDRESS**

### 4. Update Backend Configuration

Edit `backend/.env`:
```bash
ESP32_ENABLED=true
ESP32_ALERT_URL=http://192.168.1.105/alert
```
(Replace with your actual ESP32 IP)

### 5. Restart Backend Server

```bash
npm start
```

### 6. Test ESP32

**Method 1: Manual Button**
- Press button on breadboard
- Buzzer should beep
- Red LED should light up

**Method 2: Web Browser**
- Open: `http://192.168.1.105`
- You should see ESP32 status page

**Method 3: Test from Backend**
- Simulate a blocked site in extension
- ESP32 should trigger alert

---

## 🖥️ Parent Dashboard Setup

### 1. Access Dashboard

The dashboard is served by the backend server.

Open browser:
```
http://localhost:3000/dashboard/index.html
```

### 2. Login

Use the credentials you set during extension setup:
- **Email:** Parent email from extension setup
- **Password:** Parent password from extension setup

### 3. Dashboard Features

After login, you can:
- ✅ View blocked sites statistics
- ✅ See recent blocked attempts
- ✅ Manage custom blocklist/allowlist
- ✅ Configure email notifications
- ✅ Test ESP32 device
- ✅ Export data as CSV

---

## 🧪 Testing the Complete System

### Test 1: Basic Extension Test

1. With extension installed and configured
2. Visit a test URL (safe site): `https://google.com`
3. Check extension icon → should show "0" blocked today
4. Extension should show small indicator briefly

### Test 2: Blocked Site Test

**⚠️ Warning:** The following test uses example keywords. Do NOT visit actual harmful sites.

1. The extension checks for keywords in URLs
2. Test with a demo URL: `http://test-adult-site.example.com`
3. Page should be blocked immediately
4. You should see blocking screen

### Test 3: Backend Logging Test

1. After blocking a site (Test 2)
2. Check backend console
3. You should see:
   ```
   [Alert] Blocked site logged: test-adult-site.example.com (Adult)
   ```

### Test 4: Email Notification Test

1. Ensure EMAIL_USER and EMAIL_PASSWORD are configured
2. Trigger a blocked site
3. Check parent email inbox
4. You should receive alert email

### Test 5: ESP32 Alert Test

1. Ensure ESP32 is powered and connected
2. Trigger a blocked site
3. ESP32 buzzer should sound
4. Red LED should light up
5. Check serial monitor for confirmation

### Test 6: Dashboard Test

1. Login to dashboard
2. Check "Blocked Sites" tab
3. You should see logged attempts
4. Try adding a domain to blocklist
5. Try test ESP32 button

---

## 🔧 Troubleshooting

### Problem: Backend won't start

**Error:** `MongoDB connection error`
```
Solutions:
1. Check if MongoDB is running:
   - Windows: net start MongoDB
   - macOS: brew services list
   - Linux: sudo systemctl status mongod
2. Verify MONGODB_URI in .env
3. For Atlas: Check whitelist IP in MongoDB Atlas
```

**Error:** `Port 3000 already in use`
```
Solutions:
1. Change PORT in .env to different number (e.g., 3001)
2. Or kill process using port:
   - Windows: netstat -ano | findstr :3000
   - macOS/Linux: lsof -ti:3000 | xargs kill
```

### Problem: Extension not blocking sites

**Symptom:** Sites not being blocked
```
Solutions:
1. Check extension popup - is it "Active"?
2. Check backend is running (http://localhost:3000)
3. Open browser console (F12) → check for errors
4. Verify setup was completed (check storage in extension)
```

### Problem: Email notifications not sending

**Error:** `Email sending failed / Authentication failed`
```
Solutions:
1. Gmail users: Must use App Password (not regular password)
   - Enable 2-Step Verification first
   - Generate App Password: https://myaccount.google.com/apppasswords
2. Check EMAIL_USER and EMAIL_PASSWORD in .env
3. Restart backend after .env changes
```

### Problem: ESP32 not connecting to WiFi

**Symptom:** Serial monitor shows "Connection failed"
```
Solutions:
1. Check WiFi credentials (case-sensitive)
2. Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
3. Move ESP32 closer to router
4. Check router firewall settings
```

### Problem: Backend can't reach ESP32

**Error:** `ESP32 connection refused`
```
Solutions:
1. Verify ESP32 IP address is correct
2. Check both on same WiFi network
3. Test manually: Open http://[ESP32-IP]/ping in browser
4. Check ESP32 is powered and running (green LED on)
5. Restart ESP32 (press reset button)
```

### Problem: Dashboard login fails

**Error:** `Invalid credentials`
```
Solutions:
1. Use exact email/password from extension setup
2. Password is case-sensitive
3. If forgotten: Clear extension data and re-setup
```

---

## 📊 Verification Checklist

Use this checklist to ensure everything is working:

### Backend
- [ ] Backend server starts without errors
- [ ] Can access http://localhost:3000 in browser
- [ ] MongoDB connection successful
- [ ] Email service configured (optional for testing)

### Chrome Extension
- [ ] Extension loaded in Chrome
- [ ] Appears in extensions list
- [ ] First-time setup completed
- [ ] Popup shows "Active & Protecting"
- [ ] Can see child name in popup

### ESP32 Device
- [ ] Hardware assembled correctly
- [ ] Code uploaded successfully
- [ ] Connects to WiFi
- [ ] IP address noted
- [ ] Manual button test works
- [ ] Can access via browser
- [ ] Backend .env updated with ESP32 IP

### Parent Dashboard
- [ ] Can access login page
- [ ] Login successful
- [ ] Dashboard loads correctly
- [ ] Statistics displayed
- [ ] Can navigate between tabs

### End-to-End Test
- [ ] Visit blocked site → Page is blocked
- [ ] Backend logs the event
- [ ] Email notification received (if configured)
- [ ] ESP32 triggers alert (if configured)
- [ ] Dashboard shows blocked attempt

---

## 🎯 Next Steps

After successful setup:

1. **Parent-Child Conversation:**
   - Inform the child about the system
   - Explain it's for safety, not surveillance
   - Be transparent and educational

2. **Customize Settings:**
   - Add trusted sites to allowlist
   - Add specific sites to blocklist
   - Configure notification preferences

3. **Monitor Regularly:**
   - Check dashboard weekly
   - Review blocked attempts
   - Adjust settings as needed

4. **Maintain System:**
   - Keep backend server running
   - Monitor ESP32 connection
   - Update blocklist periodically

---

## 📞 Support

If you encounter issues not covered here:

1. Check the detailed documentation in `docs/` folder
2. Review error messages in:
   - Backend console
   - Browser console (F12)
   - ESP32 serial monitor
3. Verify all configuration files
4. Check GitHub issues/discussions

---

## 🎉 Congratulations!

Your SafeGuard Family system is now set up and ready to protect your child online!

Remember: This is a **parental control tool**, not spyware. Use it ethically and maintain open communication with your child about online safety.

**Built with ❤️ for safer internet for children**
