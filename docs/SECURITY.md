# 🔐 Security & Privacy Documentation

## Overview

SafeGuard Family is designed with security and privacy as core principles. This document details all security measures, data handling practices, and privacy considerations.

---

## 🎯 Security Principles

### 1. Transparency First
- **Open Source:** All code is visible and auditable
- **No Hidden Features:** System does exactly what is documented
- **Clear Communication:** Parents and children know what is monitored

### 2. Consent-Based
- **Parent Installation:** System must be installed by parent
- **Child Awareness:** Child should know system is active
- **No Secret Tracking:** Not designed as hidden spyware

### 3. Minimal Data Collection
- **Only Necessary Data:** Collect only what's needed for functionality
- **No Personal Content:** Never collect passwords, messages, or typed text
- **Limited Retention:** Auto-delete data after configured period

---

## 🔒 Data Security Measures

### Extension Security

#### Password Protection
```javascript
// Parent password is hashed using SHA-256
const passwordHash = await crypto.subtle.digest('SHA-256', password);
```

**Security Features:**
- Password required to modify settings
- Hashed storage (never plain text)
- Cannot be bypassed without browser developer tools access

**Limitations:**
- Chrome admin can remove extension
- Incognito mode not monitored (by Chrome policy)
- OS-level changes can disable

#### Storage Security
```javascript
// Data stored in Chrome storage (encrypted by Chrome)
chrome.storage.local.set({
  passwordHash: hashedPassword,  // Hashed, not plain text
  childId: uniqueId,              // No personal data
  setupComplete: true             // Boolean flag only
});
```

**What's Stored:**
- Password hash (NOT plain password)
- Child profile name
- Parent email
- Unique child ID
- Blocked domains list

**NOT Stored:**
- Browsing history (only blocked attempts)
- Keystrokes
- Form data
- Passwords
- Messages

#### Content Script Security
```javascript
// Content scripts are intentionally minimal
// NO keylogging, NO form reading, NO screenshot capture
console.log('[SafeGuard Content] Loaded on:', window.location.href);
// Only logs URL, nothing else
```

---

### Backend Security

#### API Security

**CORS Protection:**
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    /^chrome-extension:\/\//,  // Only Chrome extensions
  ],
  credentials: true
}));
```

**Rate Limiting:**
```javascript
const limiter = rateLimit({
  windowMs: 60000,    // 1 minute
  max: 100,           // Max 100 requests per minute
  message: 'Too many requests from this IP'
});
```

**Helmet Security Headers:**
```javascript
app.use(helmet({
  contentSecurityPolicy: true,
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' }
}));
```

#### Authentication

**JWT Tokens:**
```javascript
const token = jwt.sign(
  { parentId: parent._id, email: parent.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }  // Token expires after 7 days
);
```

**Password Hashing:**
```javascript
// Parent passwords are hashed with bcrypt
const bcrypt = require('bcryptjs');
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);
```

#### Database Security

**MongoDB Connection:**
```javascript
// Connection with authentication
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Credentials in environment variables, not code
});
```

**Data Validation:**
```javascript
// Mongoose schema validation
const BlockedSiteSchema = new mongoose.Schema({
  url: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Adult', 'Gambling', 'Violence', 'Drugs', 'Hate']  // Only allowed values
  },
  timestamp: { type: Date, default: Date.now, index: true }
});
```

---

### ESP32 Security

#### Network Security
```cpp
// ESP32 runs local HTTP server
// NOT exposed to internet (only local network)
// No port forwarding required
```

**Security Considerations:**
- Device only accepts connections from local network
- No authentication in basic version (add in production)
- Minimal data transmitted (category + child name only)
- No browsing data stored on device

#### Physical Security
- Device should be in parent's physical location
- Not accessible to children
- Button press only triggers test alert

---

## 🛡️ Privacy Protection

### What Data is Collected

#### Chrome Extension
| Data Type | Collected? | Purpose | Storage Duration |
|-----------|------------|---------|------------------|
| URL visited | ✅ Yes | Check if blocked | Until classified |
| Domain | ✅ Yes | Blocklist matching | 30 days |
| Timestamp | ✅ Yes | Log events | 30 days |
| Keystrokes | ❌ NO | - | - |
| Form inputs | ❌ NO | - | - |
| Passwords | ❌ NO | - | - |
| Messages | ❌ NO | - | - |
| Search queries | ❌ NO | - | - |

#### Backend Server
| Data Type | Collected? | Purpose | Storage Duration |
|-----------|------------|---------|------------------|
| Blocked URL | ✅ Yes | Alert and log | Configurable (7-365 days) |
| Category | ✅ Yes | Classification | Same as URL |
| Child name | ✅ Yes | Identification | Permanent (until deleted) |
| Parent email | ✅ Yes | Notifications | Permanent (until deleted) |
| IP address | ⚠️ Logged | Security | 7 days |
| User agent | ⚠️ Logged | Debugging | 7 days |

#### ESP32 Device
| Data Type | Collected? | Purpose | Storage Duration |
|-----------|------------|---------|------------------|
| Alert count | ✅ Yes | Statistics | Until reboot |
| Last category | ✅ Yes | Display | Until next alert |
| Child name | ✅ Yes | Display | Until next alert |
| Browsing data | ❌ NO | - | - |

---

### Data Retention Policy

#### Automatic Deletion
```javascript
// MongoDB TTL (Time To Live) index
BlockedSiteSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days default
);
```

**Configurable Retention:**
- Parent can choose: 7, 30, 90, or 365 days
- Data automatically deleted after period
- No manual cleanup needed

#### Manual Deletion
Parents can:
- Delete individual blocked site logs
- Clear all data for a child
- Delete entire child profile
- Export data before deletion

---

### Data Access Control

#### Who Can Access Data

**✅ Parents:**
- Own child's blocked site logs
- Dashboard statistics
- Configuration settings
- Can export data

**❌ Children:**
- Cannot access logs
- Cannot modify settings (requires password)
- Cannot delete data
- Can only see blocked page message

**❌ Third Parties:**
- No data shared with anyone
- No analytics services
- No advertising
- No external APIs (except email service)

---

## 🚨 Security Best Practices

### For Parents

#### Setup Security
1. **Strong Password:**
   ```
   ✅ Good: MyKid2024!Safe#
   ❌ Bad: 123456
   ```
   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Don't use child's name or birthdate

2. **Secure Email:**
   - Use dedicated email for SafeGuard
   - Enable 2-factor authentication on email account
   - Use Gmail App Password (not regular password)

3. **Backend Environment:**
   ```bash
   # .env file should be private
   chmod 600 .env  # Linux/Mac
   
   # Generated secrets should be random
   JWT_SECRET=$(openssl rand -hex 32)
   ```

4. **Network Security:**
   - Backend should not be exposed to internet
   - Use localhost for testing
   - For production, use HTTPS with reverse proxy

#### Operational Security
1. **Regular Monitoring:**
   - Check dashboard weekly
   - Review blocked attempts
   - Update blocklist as needed

2. **Device Security:**
   - Keep parent dashboard login secure
   - Don't share credentials
   - Logout when done

3. **Physical Security:**
   - Backend server in secure location
   - ESP32 device not accessible to children

### For Developers (if modifying code)

#### Code Security
1. **Never Commit Secrets:**
   ```bash
   # Add to .gitignore
   .env
   *.key
   config/secrets.json
   ```

2. **Validate All Inputs:**
   ```javascript
   // Always validate and sanitize
   const domain = req.body.domain.trim().toLowerCase();
   if (!/^[a-z0-9.-]+$/.test(domain)) {
     return res.status(400).json({ error: 'Invalid domain' });
   }
   ```

3. **Use Parameterized Queries:**
   ```javascript
   // ✅ Safe (using Mongoose)
   await BlockedSite.findOne({ childId: childId });
   
   // ❌ Unsafe (if using raw queries)
   // db.query("SELECT * FROM sites WHERE childId = " + childId);
   ```

4. **Keep Dependencies Updated:**
   ```bash
   # Check for vulnerabilities
   npm audit
   
   # Update packages
   npm update
   ```

---

## 🔍 Security Audit Trail

### Logging

#### Backend Logs
```javascript
// All important events are logged
console.log('[Alert] Blocked site logged:', {
  childId: 'child_xxx',
  domain: 'example.com',
  category: 'Adult',
  timestamp: new Date()
});
```

**What's Logged:**
- Server start/stop
- Database connections
- Blocked site attempts
- Email notifications sent
- ESP32 alerts triggered
- API requests (rate limited)
- Authentication attempts

#### Extension Logs
```javascript
// Browser console logs (for debugging)
console.log('[SafeGuard] URL checked:', url);
console.log('[SafeGuard] Classification:', result);
```

**What's Logged:**
- Extension initialization
- URL checks
- Blocked pages
- Backend communication

---

## ⚠️ Known Security Limitations

### Chrome Extension Limitations

#### ❌ Cannot Prevent:
1. **Chrome Admin Removal:**
   - User with admin rights can remove extension
   - **Mitigation:** Require admin password on computer

2. **Incognito Mode:**
   - Chrome policy: extensions don't work in incognito by default
   - **Mitigation:** Can enable manually, but not enforceable

3. **Other Browsers:**
   - Only works in Chrome/Edge
   - Child can use Firefox, Safari, etc.
   - **Mitigation:** Block other browsers at OS level (separate tool)

4. **OS-Level Bypass:**
   - Child with admin rights can disable
   - **Mitigation:** Don't give admin rights to child's account

5. **Offline Mode:**
   - Cannot check URLs without internet
   - **Mitigation:** Use local blocklist (limited)

#### ⚠️ Important Disclosure:
```
This is a parental control tool, not an unbreakable security system.
A determined technical user may find ways to bypass it.
It should be used as part of a broader approach to online safety
that includes education, trust, and open communication.
```

### Backend Limitations

#### Security Considerations:
1. **HTTP (not HTTPS):**
   - Local development uses HTTP
   - **Production:** Use HTTPS with SSL certificate

2. **JWT Secret:**
   - If JWT_SECRET is compromised, sessions can be hijacked
   - **Mitigation:** Use strong random secret, rotate regularly

3. **Email Credentials:**
   - Stored in environment variables
   - **Mitigation:** Use app passwords, not main passwords

### ESP32 Limitations

#### Security Considerations:
1. **No Authentication:**
   - Basic version has no auth on HTTP endpoints
   - **Mitigation:** Add API key check in production

2. **Plain HTTP:**
   - Not using HTTPS (ESP32 resource constraints)
   - **Mitigation:** Only use on trusted local network

3. **WiFi Security:**
   - Credentials stored in code
   - **Mitigation:** Don't share code file, use strong WiFi password

---

## 🛠️ Security Recommendations for Production

If deploying for actual use (not just hackathon demo):

### 1. HTTPS Everywhere
```nginx
# Nginx reverse proxy example
server {
    listen 443 ssl;
    server_name safeguard.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### 2. Authentication on ESP32
```cpp
// Add API key check
if (server.hasHeader("X-API-Key")) {
  String apiKey = server.header("X-API-Key");
  if (apiKey != SECRET_API_KEY) {
    server.send(401, "application/json", "{\"error\":\"unauthorized\"}");
    return;
  }
}
```

### 3. Database Encryption
- Enable MongoDB encryption at rest
- Use encrypted connection strings
- Regular backups with encryption

### 4. Security Monitoring
```javascript
// Add express-rate-limit to all endpoints
// Log suspicious activity
// Set up alerts for unusual patterns
```

### 5. Regular Security Audits
- Run `npm audit` regularly
- Update dependencies
- Review logs for anomalies
- Test for vulnerabilities

---

## 📋 Security Checklist

### Before Deployment
- [ ] All secrets in environment variables (not code)
- [ ] Strong passwords enforced
- [ ] HTTPS enabled (production)
- [ ] JWT secret is random and strong
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Helmet security headers enabled
- [ ] Database authentication enabled
- [ ] Email using app password
- [ ] ESP32 on trusted network only
- [ ] `.env` file in `.gitignore`
- [ ] Regular backups configured
- [ ] Error messages don't reveal sensitive info
- [ ] Audit logging enabled

### Ongoing Maintenance
- [ ] Regular dependency updates (`npm audit`)
- [ ] Monitor logs for suspicious activity
- [ ] Review access control regularly
- [ ] Rotate JWT secret periodically
- [ ] Test backup restoration
- [ ] Update blocklist regularly
- [ ] Review and delete old data

---

## 🆘 Security Issue Reporting

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **DO** email directly (if this were a real project)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We take security seriously and will respond within 48 hours.

---

## 📚 Further Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## 📄 License & Liability

This software is provided "as is" for educational purposes. Users are responsible for:
- Proper configuration and security
- Compliance with local laws
- Appropriate use (not for spying or harassment)
- Regular monitoring and maintenance

**Not recommended for:**
- Environments requiring enterprise-grade security
- Monitoring without consent
- Replacement for proper parenting and education

---

**Built with security and privacy in mind. Use responsibly. 🔒**
