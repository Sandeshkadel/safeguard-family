// ╔═══════════════════════════════════════════════════════════════╗
// ║  SERVICE - ESP32 COMMUNICATION                                ║
// ║  Triggers alerts on ESP32 IoT device                          ║
// ╚═══════════════════════════════════════════════════════════════╝

const axios = require('axios');

// ═══════════════════════════════════════════════════════════════
// ESP32 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const ESP32_CONFIG = {
  enabled: process.env.ESP32_ENABLED === 'true',
  alertUrl: process.env.ESP32_ALERT_URL || 'http://192.168.1.100/alert',
  timeout: 5000 // 5 seconds timeout
};

// ═══════════════════════════════════════════════════════════════
// TRIGGER ALERT ON ESP32
// ═══════════════════════════════════════════════════════════════

async function triggerAlert({ category, childName, timestamp }) {
  try {
    if (!ESP32_CONFIG.enabled) {
      console.log('ESP32 alerts disabled');
      return {
        success: false,
        reason: 'ESP32 disabled in configuration'
      };
    }
    
    console.log(`[ESP32] Sending alert: ${category} - ${childName}`);
    
    // Send HTTP request to ESP32
    const response = await axios.post(
      ESP32_CONFIG.alertUrl,
      {
        type: 'blocked_site',
        category: category,
        childName: childName,
        timestamp: timestamp,
        severity: getSeverity(category)
      },
      {
        timeout: ESP32_CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200) {
      console.log('✅ ESP32 alert triggered successfully');
      return {
        success: true,
        response: response.data
      };
    } else {
      console.log('⚠️  ESP32 responded with non-200 status:', response.status);
      return {
        success: false,
        status: response.status
      };
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ ESP32 connection refused. Is the device online?');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('❌ ESP32 connection timeout. Check network connection.');
    } else {
      console.error('❌ ESP32 alert failed:', error.message);
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// GET SEVERITY LEVEL
// ═══════════════════════════════════════════════════════════════

function getSeverity(category) {
  const severityMap = {
    'Adult': 'HIGH',
    'Violence': 'HIGH',
    'Drugs': 'HIGH',
    'Gambling': 'MEDIUM',
    'Hate': 'HIGH',
    'Malware': 'CRITICAL',
    'Phishing': 'CRITICAL',
    'Other': 'LOW'
  };
  
  return severityMap[category] || 'MEDIUM';
}

// ═══════════════════════════════════════════════════════════════
// TEST ESP32 CONNECTION
// ═══════════════════════════════════════════════════════════════

async function testConnection() {
  try {
    const response = await axios.get(ESP32_CONFIG.alertUrl + '/ping', {
      timeout: 3000
    });
    
    return {
      connected: true,
      response: response.data
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SEND CUSTOM MESSAGE TO ESP32
// ═══════════════════════════════════════════════════════════════

async function sendCustomMessage(message) {
  try {
    if (!ESP32_CONFIG.enabled) {
      return { success: false, reason: 'ESP32 disabled' };
    }
    
    const response = await axios.post(
      ESP32_CONFIG.alertUrl + '/message',
      { message: message },
      { timeout: ESP32_CONFIG.timeout }
    );
    
    return {
      success: true,
      response: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  triggerAlert,
  testConnection,
  sendCustomMessage,
  ESP32_CONFIG
};
