// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - EXTENSION CONFIG                           ║
// ║  Backend API Configuration                                    ║
// ╚═══════════════════════════════════════════════════════════════╝

// BACKEND API CONFIGURATION
// 🚀 Production URL: https://safeguard-family.vercel.app
// 📦 GitHub: https://github.com/Sandeshkadel/safeguard-family

const API_CONFIG = {
  // 🚀 LOCAL DEVELOPMENT - CORRECT SETUP
  baseURL: 'http://localhost:8000',
  
  // 🚀 PRODUCTION (Vercel) - Uncomment when deploying
  // baseURL: 'https://safeguard-family.vercel.app',
  
  endpoints: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    getProfile: '/api/profile',
    getChildren: '/api/children',
    addChild: '/api/children',
    deleteChild: '/api/children/:childId',
    getReport: '/api/reports/weekly/:childId',
    health: '/health'
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
    }
  };
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    // Implement timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    options.signal = controller.signal;
    
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    const contentType = response.headers.get('content-type') || '';
    let result = null;

    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      throw new Error(text || `API Error: ${response.status}`);
    }
    
    if (!response.ok) {
      throw new Error(result.message || result.error || `API Error: ${response.status}`);
    }
    
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`API Call Timeout (${method} ${endpoint})`);
      throw new Error('Request timeout - backend not responding');
    }
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
