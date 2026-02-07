// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - POPUP SCRIPT                              ║
// ║  Extension Popup UI Logic                                     ║
// ╚═══════════════════════════════════════════════════════════════╝

const PAGES = {
  dashboard: 'dashboard.html',
  login: 'login.html',
  test: 'test.html'
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  setupEventListeners();
});

// ═══════════════════════════════════════════════════════════════
// LOAD STATUS - Get current protection status
// ═══════════════════════════════════════════════════════════════

async function loadStatus() {
  try {
    const data = await chrome.storage.local.get([
      'setupComplete',
      'childName',
      'childId',
      'blockedDomains'
    ]);
    
    const statusCard = document.getElementById('statusCard');
    const statusText = document.getElementById('statusText');
    const childNameEl = document.getElementById('childName');
    const blockedCountEl = document.getElementById('blockedCount');
    
    if (data.setupComplete) {
      statusCard.classList.add('active');
      statusText.textContent = 'Active & Protecting';
      childNameEl.textContent = data.childName || 'Not Set';
      
      // Get today's blocked count
      const blockedCount = await getTodayBlockedCount();
      blockedCountEl.textContent = blockedCount;
    } else {
      statusCard.classList.add('inactive');
      statusText.textContent = 'Setup Required';
      childNameEl.textContent = 'Not Configured';
      blockedCountEl.textContent = '0';
    }
    
  } catch (error) {
    console.error('Error loading status:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET TODAY'S BLOCKED COUNT - Fetch from backend
// ═══════════════════════════════════════════════════════════════

async function getTodayBlockedCount() {
  const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
  return response.todayBlocked || 0;
}

// ═══════════════════════════════════════════════════════════════
// SETUP EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

function setupEventListeners() {
  // Open parent dashboard
  document.getElementById('dashboardButton').addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['setupComplete']);
    const target = data.setupComplete ? PAGES.login : 'parent-setup.html';
    chrome.tabs.create({ url: chrome.runtime.getURL(target) });
  });

  document.getElementById('testButton').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL(PAGES.test) });
  });
  
  // Settings (requires password)
  document.getElementById('settingsButton').addEventListener('click', async () => {
    const password = prompt('Enter parent password to access settings:');
    
    if (password) {
      const isValid = await verifyPassword(password);
      
      if (isValid) {
        showSettings();
      } else {
        alert('❌ Incorrect password. Settings cannot be modified without parent authentication.');
      }
    }
  });
  
  // Help link
  document.getElementById('helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: chrome.runtime.getURL('help.html')
    });
  });

  document.getElementById('incognitoButton').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
  });

  // Remove button - requires password
  document.getElementById('removeButton').addEventListener('click', async () => {
    const password = prompt('⚠️ PROTECTION ENABLED\n\nEnter parent password to remove this extension:');
    
    if (password) {
      const isValid = await verifyPassword(password);
      
      if (isValid) {
        const confirm = window.confirm(
          '🔒 FINAL CONFIRMATION REQUIRED\n\n' +
          'Are you absolutely sure you want to remove SafeGuard Family?\n\n' +
          'Click OK to proceed to extension removal.'
        );
        
        if (confirm) {
          // Open the extension management page to remove
          chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
          alert('✅ Opening extension management page...\n\nClick the "Remove" button in Chrome to complete removal.');
        }
      } else {
        alert('❌ Incorrect password. Extension is protected and cannot be removed without proper authentication.');
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// VERIFY PASSWORD - Check parent password
// ═══════════════════════════════════════════════════════════════

async function verifyPassword(password) {
  try {
    const data = await chrome.storage.local.get(['passwordHash']);
    const providedHash = await hashPassword(password);
    
    return providedHash === data.passwordHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ═══════════════════════════════════════════════════════════════
// SHOW SETTINGS - Display settings dialog
// ═══════════════════════════════════════════════════════════════

function showSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL(PAGES.login) });
}

console.log('[SafeGuard] Popup loaded');
