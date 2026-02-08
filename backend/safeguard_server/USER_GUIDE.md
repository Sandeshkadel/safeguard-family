# SafeGuard Family - User Guide

## Welcome to SafeGuard Family! 🛡️

SafeGuard Family is a comprehensive parental control system that helps you manage your child's internet activity across all their devices.

---

## **Quick Start (5 Minutes)**

### Step 1: Create Parent Account
Go to: `https://safeguard-family.vercel.app/dashboard`

1. Click "Register here"
2. Enter your full name
3. Enter your email
4. Create a **strong password** (min. 8 characters)
5. **⚠️ IMPORTANT: Write down your password or screenshot it!**
   - There is NO way to recover your password if lost
   - We recommend: Password manager like 1Password/LastPass
6. Click "Create Account"

### Step 2: Install Extension on Child's Device

On the **child's computer**:

1. Open Chrome
2. Go to **chrome://extensions**
3. Enable "Developer Mode" (top right)
4. Click "Load unpacked"
5. Select the SafeGuard Family extension folder
6. Click "Open"

### Step 3: Setup Child Profile

1. Click SafeGuard Family icon (top right)
2. Enter child's name (e.g., "Emma")
3. Create a password for child account
4. Click "Complete Setup"

Extension is now **active** and monitoring! ✅

### Step 4: Manage From Dashboard

After setup, log in to the web dashboard:
- Email: Your parent email
- Password: Your parent password

You now have **full control** over your child's internet activity! 🎉

---

## **Features Overview**

### 🔒 Website Blocking
**Block specific websites or categories:**
- Adult content
- Gambling sites
- Violence
- Drugs
- Hate speech

**How to use:**
1. Go to Dashboard → "Blocklist" tab
2. Enter domain name (e.g., "pornhub.com")
3. Select category
4. Click "Add" button

When child tries to visit blocked site:
- Page redirects to "Blocked" screen
- Shows domain + reason
- Cannot access the site

### ✅ Allow List
**Whitelist specific sites** (bypass blocking):
1. Go to "Allowlist" tab
2. Add domain name
3. Click "Add"

Whitelisted sites always accessible, even if matching block rules.

### 📊 Activity History
**View all visited websites:**
1. Go to "History" tab
2. See every domain visited
3. Filter by date/device
4. Search for specific site

**Local backup:** History stored locally even if database down.

### 🚫 Blocked Websites Log
**View all blocked attempts:**
1. Go to "Blocked" tab
2. See what child tried to access
3. Reason for blocking shown
4. Option to whitelist from here

### 💻 Device Management
**Monitor all connected devices:**
1. Go to "Devices" tab
2. See each child's device name
3. Last sync time shown
4. Can ban device if compromised

**To ban a device:**
- Click "Ban Device" button
- Child cannot access internet until unbanned
- Admin can unban from dashboard

### 📱 Multi-Device Support
**Manage child across multiple devices:**

|Task|Dashboard|Extension|
|----|---------|---------|
|View history|✅|Local backup|
|Block sites|✅ (syncs in 5 min)|✅ Instant|
|Manage allowlist|✅|✅ Auto-syncs|
|Ban device|✅|Blocks access|
|View stats|✅|N/A|

---

## **Common Tasks**

### How to Block a website?
```
1. Login to dashboard
2. Click "Blocklist" tab
3. Enter domain (e.g., "youtube.com")
4. Select category
5. Click "Add to Blocklist"
✅ Blocked! (updates within 5 minutes)
```

### How to Allow a website?
```
1. Login to dashboard
2. Click "Allowlist" tab
3. Enter domain
4. Click "Add to Allowlist"
✅ Now accessible even if matching block rules
```

### How to Check Activity?
```
1. Login to dashboard
2. Click "History" tab
3. See all visited sites
4. Filter by device/date
5. Search for specific domain
```

### How to See Blocked Attempts?
```
1. Login to dashboard
2. Click "Blocked" tab
3. View all blocked website attempts
4. See time + category
5. Option to whitelist from here
```

### How to Access from Another Device?
**On parent's phone/tablet:**
```
1. Open browser
2. Go to: https://safeguard-family.vercel.app/dashboard
3. Login with parent email/password
4. See ALL children and their activity
5. Make changes (applies immediately)
```

---

## **Safety Features**

### 🔐 Data Privacy
- Your data is encrypted
- Only you can see your children's activity
- No data shared with third parties
- Secure communication (HTTPS)

### ⏱️ Session Management
- Login session expires after 30 days
- Can login from multiple devices
- Logout automatically on 30 days
- Your data safe if device lost

### 🛡️ Password Protection
- Passwords hashed (not stored)
- Child cannot change blocklist
- Child cannot bypass extension
- Parent controls via password

---

## **Troubleshooting**

### "Extension not blocking sites"
**Solution:**
1. Check extension enabled: `chrome://extensions`
2. Check SafeGuard is "On" in popup
3. Refresh page after enabling
4. Restart Chrome
5. Check blocklist synced (Dashboard → Blocklist)

### "Dashboard won't load"
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Try incognito mode
3. Check internet connection
4. Try different browser
5. Check Dashboard URL correct

### "Can't login to dashboard"
**Solution:**
1. Check email is correct
2. Check password (case-sensitive)
3. Check caps lock OFF
4. Try password show button (👁️)
5. Wait 1 minute if account just created

### "History not syncing"
**Solution:**
1. Check extension online (WiFi connected)
2. Check parent logged in (dashboard)
3. Re-login extension
4. Refresh dashboard page
5. Wait 5 minutes for sync

### "Child bypassed block"
**Solution:**
1. Ban device (Dashboard → Devices)
2. Reinstall extension on device
3. Create new child account
4. Check allowlist (accidental whitelisting?)
5. Contact support if continues

---

## **Best Practices**

### 📝 Password Management
✅ **DO:**
- Write down password in safe place
- Screenshot password before forgetting
- Use password manager (1Password, Bitwarden)
- Use strong password (min 8 chars, mixed case)

❌ **DON'T:**
- Share password with child
- Use same password as other accounts
- Forget your password (no recovery!)
- Store in plain text email

### 🔐 Account Security
✅ **DO:**
- Login from secure WiFi
- Logout before leaving device
- Use unique email per account
- Enable notifications on device changes

❌ **DON'T:**
- Give child parent email
- Login on public WiFi (use VPN)
- Share login credentials
- Allow auto-login on child's device

### 👶 Child Safety
✅ **DO:**
- Explain why sites are blocked
- Update blocklist based on age
- Review history weekly
- Adjust allowlist as child grows

❌ **DON'T:**
- Block everything (causes resentment)
- Secret blocking without explaining
- Ignore signs of VPN usage
- Forget to monitor multiple devices

---

## **Advanced Features**

### Custom Categories
Create custom block categories:
```
Example: "Games"
- fortnite.com
- roblox.com
- steam.com
```

### Scheduled Blocking
Set time-based access:
```
School Days (Mon-Fri): 8am-3:30pm → Strict
After School (3:30pm-6pm): → Limited
Homework Time (6pm-8pm) → Blocked
Free Time (8pm+) → Allowed
```
(Coming in v2.0)

### Time Limits
Set daily internet usage:
```
Weekday: 1 hour per day
Weekend: 2 hours per day
```
(Coming in v2.0)

---

## **Support & Help**

### Getting Help
- **Email:** support@safeguard-family.com
- **FAQ:** safeguard-family.com/faq
- **Status:** safeguard-family.com/status
- **Community:** forum.safeguard-family.com

### Report a Bug
If you find a problem:
1. Note the exact issue
2. Take screenshot
3. Email to: bugs@safeguard-family.com
4. Include device/browser info

### Request a Feature
Have an idea?
1. Go to: safeguard-family.com/feedback
2. Describe feature
3. Vote on others' ideas
4. Top features built next!

---

## **FAQ**

**Q: Can my child remove the extension?**
A: Not if done correctly. You control the account, not them.

**Q: Does it work on mobile?**
A: iOS/Android apps coming soon. For now: web dashboard + Chrome extension.

**Q: Is there a password reset?**
A: No. We don't store password recovery. Create new account if lost.

**Q: Can I monitor from outside home?**
A: Yes! Dashboard works everywhere. Just need internet + login.

**Q: How often does history sync?**
A: Every 5 minutes. Instant if logged in.

**Q: What if child uses different browser?**
A: Install extension on all browsers your child uses.

**Q: Can I use one account for multiple children?**
A: Yes! Create each child in dashboard. Each has own blocklist.

**Q: Does it work on Chromebook?**
A: Yes! Chrome extensions work natively.

---

## **Terms of Service**

By using SafeGuard Family, you agree to:
- Use only for your own children
- Not bypass security features
- Not share credentials
- Comply with local laws
- Respect child's privacy

For full terms: safeguard-family.com/terms

---

**Version: 1.0.0**
**Last Updated: Feb 7, 2026**
**Support Email: support@safeguard-family.com**

---

### Need Help Right Now?
📧 Email: support@safeguard-family.com
💬 Chat: safeguard-family.com/chat (9am-6pm EST)
📞 Phone: +1-800-SAFEGUARD (Mon-Fri)
