// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - DASHBOARD WITH BACKEND API                ║
// ║  Connects to backend database for data sync                   ║
// ╚═══════════════════════════════════════════════════════════════╝

const STORAGE_KEYS = {
  setupComplete: 'setupComplete',
  parentEmail: 'parentEmail',
  parentId: 'parentId',
  childName: 'childName',
  authToken: 'authToken',
  blockedLog: 'blockedLog',
  historyLog: 'historyLog',
  blockedDomains: 'blockedDomains',
  allowedDomains: 'allowedDomains',
  settings: 'settings',
  session: 'dashboardSession'
};

const DEFAULT_SETTINGS = {
  blockAdult: true,
  blockGambling: true,
  blockViolence: true,
  blockDrugs: true,
  blockHate: true,
  blockMalware: true,
  logAllVisits: true
};

document.addEventListener('DOMContentLoaded', async () => {
  await ensureSession();
  bindNav();
  bindActions();
  await refreshAll();
});

async function ensureSession() {
  const token = await getStorageValue('authToken');
  const email = await getStorageValue('parentEmail');
  
  // Check if setup is complete
  const data = await chrome.storage.local.get([STORAGE_KEYS.setupComplete]);
  if (!data[STORAGE_KEYS.setupComplete]) {
    window.location.href = 'parent-setup.html';
    return;
  }

  // If no token, redirect to login
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Try to verify token with backend
  try {
    await apiCall('POST', '/api/auth/verify', {});
    console.log('Session verified with backend');
  } catch (error) {
    console.warn('Backend unavailable, continuing with local data', error);
    // Allow local-only access if backend is unavailable
  }
}

function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
    });
  });
}

function bindActions() {
  document.getElementById('logoutButton').addEventListener('click', async () => {
    await removeStorageValue('session');
    await removeStorageValue('authToken');
    window.location.href = 'login.html';
  });

  document.getElementById('refreshOverview').addEventListener('click', refreshAll);

  document.getElementById('openExtensions').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
  });

  document.getElementById('addBlock').addEventListener('click', addBlocklistItem);
  document.getElementById('addAllow').addEventListener('click', addAllowlistItem);

  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('clearAllData').addEventListener('click', clearAllData);

  document.getElementById('exportHistory').addEventListener('click', exportHistory);
  document.getElementById('clearHistory').addEventListener('click', clearHistory);

  document.getElementById('historySearch').addEventListener('input', renderHistoryTable);
  document.getElementById('blockedSearch').addEventListener('input', renderBlockedTable);
  document.getElementById('blockedCategory').addEventListener('change', renderBlockedTable);
}

async function refreshAll() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.parentEmail,
    STORAGE_KEYS.childName,
    STORAGE_KEYS.blockedLog,
    STORAGE_KEYS.historyLog,
    STORAGE_KEYS.blockedDomains,
    STORAGE_KEYS.allowedDomains,
    STORAGE_KEYS.settings
  ]);

  document.getElementById('parentEmail').textContent = data[STORAGE_KEYS.parentEmail] || 'Parent';
  document.getElementById('childNameDisplay').textContent = data[STORAGE_KEYS.childName] || 'Child';

  const blockedLog = data[STORAGE_KEYS.blockedLog] || [];
  const historyLog = data[STORAGE_KEYS.historyLog] || [];

  updateStats(blockedLog, historyLog);
  renderRecentBlocked(blockedLog);
  renderHistoryTable();
  renderBlockedTable();
  
  // Fetch blocked/allowed domains from backend API
  let blockedDomains = data[STORAGE_KEYS.blockedDomains] || [];
  let allowedDomains = data[STORAGE_KEYS.allowedDomains] || [];
  
  try {
    const childId = await getStorageValue('childId');
    if (childId) {
      const blocklistResponse = await apiCall('GET', `/api/blocklist/${childId}`, {});
      if (blocklistResponse && blocklistResponse.blocklist) {
        blockedDomains = blocklistResponse.blocklist;
        await chrome.storage.local.set({ [STORAGE_KEYS.blockedDomains]: blockedDomains });
      }
      
      const allowlistResponse = await apiCall('GET', `/api/allowlist/${childId}`, {});
      if (allowlistResponse && allowlistResponse.allowlist) {
        allowedDomains = allowlistResponse.allowlist;
        await chrome.storage.local.set({ [STORAGE_KEYS.allowedDomains]: allowedDomains });
      }
    }
  } catch (error) {
    console.warn('Could not fetch lists from backend, using local data:', error);
  }
  
  renderLists(blockedDomains, allowedDomains);
  loadSettings(data[STORAGE_KEYS.settings] || DEFAULT_SETTINGS);
}

function updateStats(blockedLog, historyLog) {
  const today = new Date().toDateString();
  const todayBlocked = blockedLog.filter(item => new Date(item.timestamp).toDateString() === today).length;

  document.getElementById('totalBlocked').textContent = blockedLog.length;
  document.getElementById('todayBlocked').textContent = todayBlocked;
  document.getElementById('totalVisits').textContent = historyLog.length;

  const counts = blockedLog.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('topCategory').textContent = top ? top[0] : '-';
}

function renderRecentBlocked(blockedLog) {
  const container = document.getElementById('recentBlockedTable');
  if (!blockedLog.length) {
    container.innerHTML = emptyRow('No blocked sites yet.');
    return;
  }

  container.innerHTML = blockedLog.slice(0, 8).map(item => rowHtml(item)).join('');
}

function renderHistoryTable() {
  const search = document.getElementById('historySearch').value.toLowerCase();
  chrome.storage.local.get([STORAGE_KEYS.historyLog]).then(data => {
    const historyLog = data[STORAGE_KEYS.historyLog] || [];
    const filtered = historyLog.filter(item => item.url.toLowerCase().includes(search) || item.domain.toLowerCase().includes(search));
    const container = document.getElementById('historyTable');

    if (!filtered.length) {
      container.innerHTML = emptyRow('No history recorded yet.');
      return;
    }

    container.innerHTML = filtered.slice(0, 200).map(item => rowHtml(item)).join('');
  });
}

function renderBlockedTable() {
  const search = document.getElementById('blockedSearch').value.toLowerCase();
  const category = document.getElementById('blockedCategory').value;

  chrome.storage.local.get([STORAGE_KEYS.blockedLog]).then(data => {
    const blockedLog = data[STORAGE_KEYS.blockedLog] || [];
    const filtered = blockedLog.filter(item => {
      const matchesSearch = item.url.toLowerCase().includes(search) || item.domain.toLowerCase().includes(search);
      const matchesCategory = !category || item.category === category;
      return matchesSearch && matchesCategory;
    });

    const container = document.getElementById('blockedTable');
    if (!filtered.length) {
      container.innerHTML = emptyRow('No blocked sites yet.');
      return;
    }

    container.innerHTML = filtered.slice(0, 200).map(item => rowHtml(item)).join('');
  });
}

function rowHtml(item) {
  return `
    <div class="table-row">
      <div>${formatDate(item.timestamp)}</div>
      <div>${escapeHtml(item.url)}</div>
      <div>${item.category}</div>
      <div>${item.action}</div>
    </div>
  `;
}

function emptyRow(text) {
  return `
    <div class="table-row">
      <div>${text}</div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  `;
}

function renderLists(blockedDomains, allowedDomains) {
  const blocklistEl = document.getElementById('blocklist');
  const allowlistEl = document.getElementById('allowlist');

  blocklistEl.innerHTML = blockedDomains.length
    ? blockedDomains.map(item => listItemHtml(item.domain, item.category, 'block')).join('')
    : '<div class="list-item">No custom blocked sites.</div>';

  allowlistEl.innerHTML = allowedDomains.length
    ? allowedDomains.map(item => listItemHtml(item.domain, 'Allowed', 'allow')).join('')
    : '<div class="list-item">No custom allowed sites.</div>';

  bindListActions();
}

function listItemHtml(domain, category, type) {
  return `
    <div class="list-item">
      <div>
        <strong>${escapeHtml(domain)}</strong>
        <div class="small">${category}</div>
      </div>
      <button class="btn btn-ghost" data-type="${type}" data-domain="${escapeHtml(domain)}">Remove</button>
    </div>
  `;
}

function bindListActions() {
  document.querySelectorAll('[data-type="block"]').forEach(btn => {
    btn.addEventListener('click', () => removeListItem('block', btn.dataset.domain));
  });

  document.querySelectorAll('[data-type="allow"]').forEach(btn => {
    btn.addEventListener('click', () => removeListItem('allow', btn.dataset.domain));
  });
}

async function addBlocklistItem() {
  const domainInput = document.getElementById('blockDomain');
  const categorySelect = document.getElementById('blockCategory');

  const domain = normalizeDomain(domainInput.value);
  if (!domain) return;

  const childId = await getStorageValue('childId');
  if (!childId) {
    alert('Child ID not found. Please logout and login again.');
    return;
  }

  try {
    // Send to backend API
    const response = await apiCall('POST', '/api/blocklist', {
      child_id: childId,
      domain: domain,
      category: categorySelect.value
    });

    if (response && response.success) {
      domainInput.value = '';
      categorySelect.value = 'Custom';
      await refreshAll();
      alert(`✅ ${domain} added to blocked list`);
    } else {
      throw new Error(response?.message || 'Failed to add domain');
    }
  } catch (error) {
    console.error('Error adding to blocklist:', error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function addAllowlistItem() {
  const domainInput = document.getElementById('allowDomain');
  const domain = normalizeDomain(domainInput.value);
  if (!domain) return;

  const childId = await getStorageValue('childId');
  if (!childId) {
    alert('Child ID not found. Please logout and login again.');
    return;
  }

  try {
    // Send to backend API
    const response = await apiCall('POST', '/api/allowlist', {
      child_id: childId,
      domain: domain
    });

    if (response && response.success) {
      domainInput.value = '';
      await refreshAll();
      alert(`✅ ${domain} added to allowed list`);
    } else {
      throw new Error(response?.message || 'Failed to add domain');
    }
  } catch (error) {
    console.error('Error adding to allowlist:', error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function removeListItem(type, domain) {
  const childId = await getStorageValue('childId');
  if (!childId) {
    alert('Child ID not found. Please logout and login again.');
    return;
  }

  try {
    // Determine API endpoint
    const endpoint = type === 'block' ? '/api/blocklist' : '/api/allowlist';
    
    // Send to backend API - delete the domain
    const response = await apiCall('DELETE', endpoint, {
      child_id: childId,
      domain: domain
    });

    if (response && response.success) {
      await refreshAll();
      alert(`✅ ${domain} removed from list`);
    } else {
      throw new Error(response?.message || 'Failed to remove domain');
    }
  } catch (error) {
    console.error('Error removing from list:', error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function loadSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  for (const [key, value] of Object.entries(merged)) {
    const el = document.getElementById(key);
    if (el) el.checked = value;
  }
}

async function saveSettings() {
  const updated = {
    blockAdult: document.getElementById('blockAdult').checked,
    blockGambling: document.getElementById('blockGambling').checked,
    blockViolence: document.getElementById('blockViolence').checked,
    blockDrugs: document.getElementById('blockDrugs').checked,
    blockHate: document.getElementById('blockHate').checked,
    blockMalware: document.getElementById('blockMalware').checked,
    logAllVisits: document.getElementById('logAllVisits').checked
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: updated });
  alert('✅ Settings saved');
}

async function clearHistory() {
  if (!confirm('Clear all visit history?')) return;
  await chrome.storage.local.set({ [STORAGE_KEYS.historyLog]: [] });
  await refreshAll();
}

async function clearAllData() {
  if (!confirm('This will delete all SafeGuard data and require setup again. Continue?')) return;
  await chrome.storage.local.clear();
  window.location.href = 'parent-setup.html';
}

async function exportHistory() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.historyLog]);
  const historyLog = data[STORAGE_KEYS.historyLog] || [];

  const header = 'timestamp,url,domain,category,action\n';
  const rows = historyLog.map(item => {
    return `${new Date(item.timestamp).toISOString()},"${item.url}","${item.domain}","${item.category}","${item.action}"`;
  }).join('\n');

  downloadFile('safeguard-history.csv', header + rows);
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeDomain(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
}

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return map[char] || char;
  });
}
