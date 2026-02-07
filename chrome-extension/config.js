// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - EXTENSION CONFIG                           ║
// ║  Backend API Configuration                                    ║
// ╚═══════════════════════════════════════════════════════════════╝

// BACKEND API CONFIGURATION
// 🚀 Production URL: https://safeguard-family.vercel.app
// 📦 GitHub: https://github.com/Sandeshkadel/safeguard-family

const API_CONFIG = {
  // 🚀 PRODUCTION (Vercel)
  baseURL: 'https://safeguard-family.vercel.app',
  
  // 💻 LOCAL DEVELOPMENT (Uncomment for local testing)
  // baseURL: 'http://192.168.254.156:3000',
  // baseURL: 'http://localhost:5000',
  
  endpoints: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    verify: '/api/auth/verify',
    getParent: '/api/parent/me',
    getChildren: '/api/parent/children',
    getChild: '/api/child/:childId',
    getDevices: '/api/child/:childId/devices',
    getBlockedLogs: '/api/child/:childId/blocked-logs',
    getHistoryLogs: '/api/child/:childId/history-logs',
    addBlockedDomain: '/api/child/:childId/blocklist',
    addAllowedDomain: '/api/child/:childId/allowlist',
    updateSettings: '/api/child/:childId/settings'
  },
  
  timeout: 10000 // 10 seconds
};

// Helper function to make API calls with error handling
async function apiCall(method, endpoint, data = null) {
  const url = API_CONFIG.baseURL + endpoint;
  const token = await getStorageValue('authToken');
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: API_CONFIG.timeout
  };
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `API Error: ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error(`API Call Failed (${method} ${endpoint}):`, error);
    throw error;
  }
}

// Storage helper functions
async function getStorageValue(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] || null);
    });
  });
}

async function setStorageValue(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

async function removeStorageValue(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], resolve);
  });
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_CONFIG, apiCall, getStorageValue, setStorageValue, removeStorageValue };
}
