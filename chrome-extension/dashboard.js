// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - DASHBOARD WITH BACKEND API                ║
// ║  Connects to backend database for data sync                   ║
// ╚═══════════════════════════════════════════════════════════════╝

const STORAGE_KEYS = {
  setupComplete: 'setupComplete',
  parentEmail: 'parentEmail',
  parentId: 'parentId',
  childName: 'childName',
  childId: 'childId',
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
  
  // ═══════════════════════════════════════════════════════════════
  // AUTO-REFRESH FOR REAL-TIME UPDATES (every 10 seconds)
  // ═══════════════════════════════════════════════════════════════
  let autoRefreshInterval = null;
  
  function startAutoRefresh() {
    if (autoRefreshInterval) return; // Already running
    
    console.log('🔄 Dashboard: Auto-refresh started (every 10 seconds)');
    autoRefreshInterval = setInterval(async () => {
      try {
        // Only refresh usage and overview tabs for performance
        const activeTab = document.querySelector('.tab.active');
        if (activeTab.id === 'usage') {
          await loadUsageAndLimits();
        } else if (activeTab.id === 'overview') {
          await loadOverviewStats();
        } else if (activeTab.id === 'comments') {
          await loadHiddenComments();
        }
      } catch (error) {
        console.warn('Auto-refresh error:', error);
      }
    }, 10000); // 10 seconds
  }
  
  function stopAutoRefresh() {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
      console.log('🛑 Dashboard: Auto-refresh stopped');
    }
  }
  
  // Start auto-refresh when loading usage or overview tab
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId === 'usage' || tabId === 'overview' || tabId === 'comments') {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });
  });
  
  // Initial start for overview tab
  startAutoRefresh();
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

  // Try to verify token with backend (with timeout)
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    const apiPromise = apiCall('GET', '/api/profile');
    
    await Promise.race([apiPromise, timeoutPromise]);
    console.log('Session verified with backend');
  } catch (error) {
    if (String(error.message || '').includes('401')) {
      await removeStorageValue('authToken');
      window.location.href = 'login.html';
      return;
    }
    console.warn('Backend verification skipped (continuing with local data):', error.message);
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

  // Improved refresh buttons with visual feedback
  const refreshButtons = [
    { id: 'refreshOverview', handler: () => refreshOverviewWithSpinner() },
    { id: 'refreshUsage', handler: () => refreshUsageWithSpinner() },
    { id: 'refreshComments', handler: () => refreshCommentsWithSpinner() }
  ];
  
  refreshButtons.forEach(({ id, handler }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', handler);
    }
  });

  document.getElementById('syncLists').addEventListener('click', syncListsFromBackend);

  document.getElementById('openExtensions').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
  });

  document.getElementById('addBlock').addEventListener('click', addBlocklistItem);
  document.getElementById('addAllow').addEventListener('click', addAllowlistItem);
  document.getElementById('addLimit').addEventListener('click', saveTimeLimit);

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
    STORAGE_KEYS.settings,
    STORAGE_KEYS.childId
  ]);

  document.getElementById('parentEmail').textContent = data[STORAGE_KEYS.parentEmail] || 'parent@example.com';
  
  // Get child name from storage or fetch from API
  let childName = data[STORAGE_KEYS.childName];
  if (!childName && data[STORAGE_KEYS.childId]) {
    // Try to fetch from backend
    try {
      const profile = await apiCall('GET', '/api/profile', {});
      if (profile && profile.children && profile.children.length > 0) {
        childName = profile.children[0].name;
        await chrome.storage.local.set({ [STORAGE_KEYS.childName]: childName });
      }
    } catch (error) {
      console.warn('Could not fetch child name from backend');
    }
  }
  document.getElementById('childNameDisplay').textContent = childName || 'My Child';

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
  await loadUsageAndLimits();
  await loadHiddenComments();
}

// ═══════════════════════════════════════════════════════════════
// REFRESH HELPERS WITH VISUAL FEEDBACK (Spinner)
// ═══════════════════════════════════════════════════════════════

async function refreshOverviewWithSpinner() {
  const btn = document.getElementById('refreshOverview');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '🔄 Refreshing...';
  
  try {
    await refreshAll();
    btn.textContent = '✅ Updated!';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  } catch (error) {
    btn.textContent = '❌ Error';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  }
}

async function refreshUsageWithSpinner() {
  const btn = document.getElementById('refreshUsage');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '🔄 Refreshing...';
  
  try {
    await loadUsageAndLimits();
    btn.textContent = '✅ Updated!';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  } catch (error) {
    btn.textContent = '❌ Error';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  }
}

async function refreshCommentsWithSpinner() {
  const btn = document.getElementById('refreshComments');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '🔄 Refreshing...';
  
  try {
    await loadHiddenComments();
    btn.textContent = '✅ Updated!';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  } catch (error) {
    btn.textContent = '❌ Error';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  }
}

async function loadOverviewStats() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.blockedLog,
    STORAGE_KEYS.historyLog,
    STORAGE_KEYS.childId
  ]);
  
  const blockedLog = data[STORAGE_KEYS.blockedLog] || [];
  const historyLog = data[STORAGE_KEYS.historyLog] || [];
  
  updateStats(blockedLog, historyLog);
  renderRecentBlocked(blockedLog);
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

async function loadUsageAndLimits() {
  const childId = await getStorageValue('childId');
  if (!childId) return;

  try {
    const [usageRes, limitsRes] = await Promise.all([
      apiCall('GET', `/api/usage/${childId}?days=1`, {}),
      apiCall('GET', `/api/limits/${childId}`, {})
    ]);

    const usage = usageRes.usage || [];
    const limits = limitsRes.limits || [];

    await chrome.storage.local.set({ siteTimeRules: limits });

    renderUsageSummary(usageRes, usage);
    renderUsageTable(usage, limits);
    renderLimitsList(limits);
  } catch (error) {
    console.warn('Usage/limits load failed:', error);
  }
}

function renderUsageSummary(usageRes, usage) {
  const totalSeconds = usageRes.total_seconds || 0;
  const topSite = usage.length ? usage[0].domain : '-';

  document.getElementById('totalTimeToday').textContent = formatDuration(totalSeconds);
  document.getElementById('topSiteToday').textContent = topSite;
  document.getElementById('sitesUsedToday').textContent = usage.length;
}

function renderUsageTable(usage, limits) {
  const container = document.getElementById('usageTable');
  if (!usage.length) {
    container.innerHTML = emptyRow('No usage recorded yet.');
    return;
  }

  const rows = usage.map(item => {
    const limit = findLimitForDomain(item.domain, limits);
    const limitMinutes = limit ? limit.daily_limit_minutes : 0;
    const limitText = limit ? (limit.permanent_block ? 'Permanent' : `${limitMinutes}m`) : '-';
    const status = getLimitStatus(item.seconds, limit);
    return `
      <div class="table-row">
        <div>${escapeHtml(item.domain)}</div>
        <div>${formatDuration(item.seconds)}</div>
        <div>${limitText}</div>
        <div>${status}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = rows;
}

function renderLimitsList(limits) {
  const container = document.getElementById('limitsList');
  if (!limits.length) {
    container.innerHTML = '<div class="list-item">No time limits yet.</div>';
    return;
  }

  container.innerHTML = limits.map(rule => {
    const label = rule.permanent_block
      ? 'Permanent block'
      : `${rule.daily_limit_minutes || 0} minutes per day`;
    const cooldown = rule.blocked_until ? `Blocked until ${formatDate(rule.blocked_until)}` : 'Active';
    return `
      <div class="list-item">
        <div>
          <strong>${escapeHtml(rule.domain)}</strong>
          <div class="small">${label} · ${cooldown}</div>
        </div>
        <button class="btn btn-ghost" data-limit-id="${rule.id}">Remove</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-limit-id]').forEach(btn => {
    btn.addEventListener('click', () => removeTimeLimit(btn.dataset.limitId));
  });
}

async function saveTimeLimit() {
  const domainInput = document.getElementById('limitDomain');
  const minutesInput = document.getElementById('limitMinutes');
  const permanentToggle = document.getElementById('limitPermanent');

  const domain = normalizeDomain(domainInput.value);
  if (!domain) return;

  const minutes = parseInt(minutesInput.value || '0', 10);
  const permanent = permanentToggle.checked;

  const childId = await getStorageValue('childId');
  if (!childId) {
    alert('Child ID not found. Please logout and login again.');
    return;
  }

  try {
    await apiCall('POST', '/api/limits', {
      child_id: childId,
      domain,
      daily_limit_minutes: permanent ? 0 : Math.max(0, minutes),
      cooldown_hours: 24,
      permanent_block: permanent
    });

    domainInput.value = '';
    minutesInput.value = '';
    permanentToggle.checked = false;
    await loadUsageAndLimits();
    alert(`✅ Time rule saved for ${domain}`);
  } catch (error) {
    console.error('Error saving time limit:', error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function removeTimeLimit(limitId) {
  if (!confirm('Remove this time limit?')) return;
  try {
    await apiCall('DELETE', `/api/limits/${limitId}`, {});
    await loadUsageAndLimits();
  } catch (error) {
    console.error('Error removing time limit:', error);
    alert(`❌ Error: ${error.message}`);
  }
}

function getLimitStatus(usedSeconds, rule) {
  if (!rule) return 'No limit';
  if (rule.permanent_block) return 'Permanent';
  if (rule.blocked_until && new Date(rule.blocked_until).getTime() > Date.now()) return 'Cooldown';
  const limitSeconds = (rule.daily_limit_minutes || 0) * 60;
  if (limitSeconds > 0 && usedSeconds >= limitSeconds) return 'Limit reached';
  return 'Active';
}

function findLimitForDomain(domain, limits) {
  return limits.find(rule => domainMatches(domain, rule.domain));
}

function domainMatches(domain, pattern) {
  if (!domain || !pattern) return false;
  const cleanDomain = domain.toLowerCase();
  const cleanPattern = pattern.toLowerCase().replace('www.', '');
  return cleanDomain === cleanPattern || cleanDomain.endsWith('.' + cleanPattern);
}

async function loadHiddenComments() {
  const childId = await getStorageValue('childId');
  if (!childId) return;

  try {
    const response = await apiCall('GET', `/api/comments/hidden/${childId}`, {});
    renderHiddenComments(response);
  } catch (error) {
    console.error('Error loading hidden comments:', error);
    document.getElementById('commentsContainer').innerHTML = '<div class="info-message">❌ Failed to load comments</div>';
  }
}

function renderHiddenComments(data) {
  const container = document.getElementById('commentsContainer');
  
  if (!data.posts || data.posts.length === 0) {
    container.innerHTML = '<div class="info-message">✅ No filtered comments yet. Great job!</div>';
    return;
  }

  let html = `<div class="stats" style="margin-bottom: 20px;">
    <div class="stat-card">
      <div class="stat-icon">💬</div>
      <div class="stat-label">Total Hidden</div>
      <div class="stat-value">${data.total_comments}</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📄</div>
      <div class="stat-label">Posts Filtered</div>
      <div class="stat-value">${data.total_posts}</div>
    </div>
  </div>`;

  data.posts.forEach(post => {
    html += `
      <div class="section" style="margin-bottom: 20px; border: 2px solid #e0e0e0; border-radius: 8px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div>
            <h3 style="margin: 0; font-size: 16px; color: #667eea;">${escapeHtml(post.post_title)}</h3>
            <div class="small" style="margin-top: 4px; color: #666;">
              <a href="${escapeHtml(post.post_url)}" target="_blank" style="color: #667eea; text-decoration: none;">
                🔗 View Post
              </a>
              <span style="margin-left: 12px;">📊 ${post.comments_count} comment${post.comments_count > 1 ? 's' : ''} hidden</span>
            </div>
          </div>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
    `;

    post.comments.forEach(comment => {
      const severityColor = comment.severity === 2 ? '#e74c3c' : comment.severity === 1 ? '#f39c12' : '#95a5a6';
      const severityLabel = comment.severity === 2 ? 'High' : comment.severity === 1 ? 'Medium' : 'Low';
      
      html += `
        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid ${severityColor};">
          <div style="display: flex; justify-content: between; margin-bottom: 8px;">
            <span style="background: ${severityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
              ${severityLabel} Risk
            </span>
            <span style="font-size: 12px; color: #666; margin-left: 12px;">${formatDate(comment.hidden_at)}</span>
          </div>
          <div style="background: white; padding: 8px; border-radius: 4px; margin-bottom: 6px; font-size: 13px; color: #333;">
            "${escapeHtml(comment.text)}"
          </div>
          <div style="font-size: 12px; color: #e74c3c;">
            🛡️ Reason: ${escapeHtml(comment.reason)}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function syncListsFromBackend() {
  try {
    const childId = await getStorageValue('childId');
    if (!childId) {
      alert('Child ID not found. Please logout and login again.');
      return;
    }

    // Show loading state
    const btn = document.getElementById('syncLists');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Syncing...';
    btn.disabled = true;

    // Fetch blocklist
    const blocklistResponse = await apiCall('GET', `/api/blocklist/${childId}`, {});
    if (blocklistResponse && blocklistResponse.blocklist) {
      const blockedDomains = blocklistResponse.blocklist;
      await chrome.storage.local.set({ blockedDomains });
    }

    // Fetch allowlist
    const allowlistResponse = await apiCall('GET', `/api/allowlist/${childId}`, {});
    if (allowlistResponse && allowlistResponse.allowlist) {
      const allowedDomains = allowlistResponse.allowlist;
      await chrome.storage.local.set({ allowedDomains });
    }

    // Fetch time limits
    const limitsResponse = await apiCall('GET', `/api/limits/${childId}`, {});
    if (limitsResponse && limitsResponse.limits) {
      const siteTimeRules = limitsResponse.limits;
      await chrome.storage.local.set({ siteTimeRules });
    }

    // Refresh display
    await refreshAll();
    await loadUsageAndLimits();

    btn.textContent = originalText;
    btn.disabled = false;
    alert('✅ Lists synced successfully from backend!');
  } catch (error) {
    console.error('Error syncing lists:', error);
    alert(`❌ Sync failed: ${error.message}`);
    const btn = document.getElementById('syncLists');
    btn.textContent = '🔄 Sync from Backend';
    btn.disabled = false;
  }
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

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return map[char] || char;
  });
}
