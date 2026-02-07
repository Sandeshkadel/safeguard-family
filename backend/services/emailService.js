// ╔═══════════════════════════════════════════════════════════════╗
// ║  SERVICE - EMAIL NOTIFICATIONS                                ║
// ║  Sends email alerts to parents                                ║
// ╚═══════════════════════════════════════════════════════════════╝

const nodemailer = require('nodemailer');

// ═══════════════════════════════════════════════════════════════
// EMAIL TRANSPORTER CONFIGURATION
// ═══════════════════════════════════════════════════════════════

let transporter = null;

function initializeTransporter() {
  if (transporter) return transporter;
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  console.log('✅ Email service initialized');
  return transporter;
}

// ═══════════════════════════════════════════════════════════════
// SEND BLOCKED SITE ALERT
// ═══════════════════════════════════════════════════════════════

async function sendBlockedSiteAlert({ parentEmail, childName, url, category, timestamp }) {
  try {
    const trans = initializeTransporter();
    
    if (!trans) {
      console.log('Email service disabled - alert not sent');
      return { success: false, reason: 'Email not configured' };
    }
    
    const formattedTime = new Date(timestamp).toLocaleString();
    
    const mailOptions = {
      from: `SafeGuard Family <${process.env.EMAIL_USER}>`,
      to: parentEmail,
      subject: `⚠️ Parental Alert: Unsafe Website Blocked`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f7fafc;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .alert-box {
      background: #fff;
      border-left: 4px solid #e53e3e;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .detail {
      margin: 10px 0;
      padding: 10px;
      background: white;
      border-radius: 5px;
    }
    .label {
      font-weight: bold;
      color: #2d3748;
    }
    .value {
      color: #4a5568;
    }
    .category-badge {
      background: #fed7d7;
      color: #742a2a;
      padding: 5px 15px;
      border-radius: 20px;
      display: inline-block;
      font-weight: bold;
      margin: 10px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #718096;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ SafeGuard Family Alert</h1>
  </div>
  
  <div class="content">
    <div class="alert-box">
      <h2 style="margin-top: 0; color: #e53e3e;">⚠️ Unsafe Website Blocked</h2>
      <p>An attempt to access a potentially harmful website has been blocked by SafeGuard Family.</p>
    </div>
    
    <div class="detail">
      <span class="label">Child Profile:</span><br>
      <span class="value">${childName}</span>
    </div>
    
    <div class="detail">
      <span class="label">Website:</span><br>
      <span class="value">${url}</span>
    </div>
    
    <div class="detail">
      <span class="label">Category:</span><br>
      <span class="category-badge">${category}</span>
    </div>
    
    <div class="detail">
      <span class="label">Time:</span><br>
      <span class="value">${formattedTime}</span>
    </div>
    
    <div class="detail">
      <span class="label">Action Taken:</span><br>
      <span class="value">✓ Page blocked immediately<br>✓ Alert logged to dashboard<br>✓ ESP32 device notified (if enabled)</span>
    </div>
    
    <center>
      <a href="http://localhost:3000/dashboard" class="button">View Dashboard</a>
    </center>
    
    <div style="background: #fef5e7; padding: 15px; border-radius: 5px; margin-top: 20px;">
      <strong>💡 Tip:</strong> Consider having an open conversation with ${childName} about online safety and why this site was blocked.
    </div>
  </div>
  
  <div class="footer">
    <p>This is an automated alert from SafeGuard Family.<br>
    You're receiving this because you're registered as the parent/guardian.</p>
    <p style="font-size: 12px;">To modify notification settings, visit your dashboard.</p>
  </div>
</body>
</html>
      `
    };
    
    const info = await trans.sendMail(mailOptions);
    
    console.log(`✅ Email sent to ${parentEmail}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SEND WEEKLY SUMMARY
// ═══════════════════════════════════════════════════════════════

async function sendWeeklySummary({ parentEmail, childName, stats }) {
  try {
    const trans = initializeTransporter();
    
    if (!trans) return { success: false };
    
    const mailOptions = {
      from: `SafeGuard Family <${process.env.EMAIL_USER}>`,
      to: parentEmail,
      subject: `📊 Weekly Safety Summary for ${childName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .stat-box {
      background: white;
      padding: 20px;
      margin: 10px 0;
      border-radius: 10px;
      border-left: 4px solid #667eea;
    }
    .stat-number {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Weekly Safety Summary</h1>
    <p>${childName}'s Activity</p>
  </div>
  
  <div style="padding: 20px;">
    <div class="stat-box">
      <div class="stat-number">${stats.totalBlocked}</div>
      <div>Sites Blocked This Week</div>
    </div>
    
    <div class="stat-box">
      <h3>Category Breakdown:</h3>
      <ul>
        ${stats.categories.map(cat => `<li>${cat.name}: ${cat.count}</li>`).join('')}
      </ul>
    </div>
    
    <p style="margin-top: 20px;">Keep up the great work protecting ${childName} online! 🛡️</p>
  </div>
</body>
</html>
      `
    };
    
    const info = await trans.sendMail(mailOptions);
    
    console.log(`✅ Weekly summary sent to ${parentEmail}`);
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Weekly summary failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  sendBlockedSiteAlert,
  sendWeeklySummary
};
