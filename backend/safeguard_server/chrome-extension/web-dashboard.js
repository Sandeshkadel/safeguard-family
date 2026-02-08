// ═══════════════════════════════════════════════════════════════
// SAFEGUARD FAMILY - WEB DASHBOARD (NO CHROME EXTENSION APIS)
// Uses localStorage instead of chrome.storage.local
// ═══════════════════════════════════════════════════════════════

const API_URL = window.location.origin + '/api';
let currentChildId = null;
let authToken = null;

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  authToken = localStorage.getItem('authToken');
  if (!authToken) {
    window.location.href = 'web-login.html';
    return;
  }

  // Verify token is valid
  try {
    const response = await apiCall('POST', '/auth/verify');
    if (!response.success) {
      throw new Error('Token invalid');
    }
  } catch (error) {
    console.error('Auth error:', error);
    localStorage.clear();
    window.location.href = 'web-login.html';
    return;
  }

  // Load parent info
  const parentEmail = localStorage.getItem('parentEmail');
  document.getElementById('parentEmail').textContent = parentEmail || 'Parent';

  // Bind navigation
  bindNav();
  bindActions();

  // Load children and select first one
  await loadChildren();
  await refreshAll();
});

// ═══════════════════════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════════════════════

async function apiCall(method, endpoint, data = null) {
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + authToken
    }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(API_URL + endpoint, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'API call failed');
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION & ACTIONS
// ═══════════════════════════════════════════════════════════════

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
  document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'web-login.html';
  });

  document.getElementById('refreshOverview').addEventListener('click', refreshAll);
  document.getElementById('refreshHistory').addEventListener('click', loadHistory);
  document.getElementById('refreshBlocked').addEventListener('click', loadBlocked);
  document.getElementById('refreshUsage').addEventListener('click', loadUsageAndLimits);
  
  document.getElementById('addBlock').addEventListener('click', addBlocklistItem);
  document.getElementById('addAllow').addEventListener('click', addAllowlistItem);
  document.getElementById('addLimit').addEventListener('click', saveTimeLimit);

  document.getElementById('historySearch').addEventListener('input', loadHistory);
  document.getElementById('blockedSearch').addEventListener('input', loadBlocked);
  document.getElementById('blockedCategory').addEventListener('change', loadBlocked);

  document.getElementById('createChildBtn').addEventListener('click', createChild);
  document.getElementById('childSelect').addEventListener('change', (e) => {
    currentChildId = e.target.value;
    localStorage.setItem('currentChildId', currentChildId);
    refreshAll();
  });
}

// ═══════════════════════════════════════════════════════════════
// CHILD MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function loadChildren() {
  try {
    const response = await apiCall('GET', '/children');
    const children = response.children || [];

    if (children.length === 0) {
      document.getElementById('childNameDisplay').textContent = 'No children yet';
      document.getElementById('childSelector').style.display = 'block';
      return;
    }

    // Populate select
    const select = document.getElementById('childSelect');
    select.innerHTML = children.map(child => 
      `<option value="${child.id}">${child.name}</option>`
    ).join('');

    // Load last selected or first child
    currentChildId = localStorage.getItem('currentChildId') || children[0].id;
    select.value = currentChildId;

    const currentChild = children.find(c => c.id === currentChildId);
    document.getElementById('childNameDisplay').textContent = currentChild ? currentChild.name : children[0].name;
    
    if (children.length > 1) {
      document.getElementById('childSelector').style.display = 'block';
    }
  } catch (error) {
    console.error('Load children error:', error);
    document.getElementById('childNameDisplay').textContent = 'Error loading';
  }
}

async function createChild() {
  const name = prompt('Enter child name:');
  if (!name) return;

  try {
    const response = await apiCall('POST', '/children', { name: name });
    if (response.success) {
      alert('Child created: ' + response.name);
      await loadChildren();
      currentChildId = response.child_id;
      await refreshAll();
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// REFRESH ALL DATA
// ═══════════════════════════════════════════════════════════════

async function refreshAll() {
  if (!currentChildId) return;

  try {
    await Promise.all([
      loadStats(),
      loadRecentActivity(),
      loadHistory(),
      loadBlocked(),
      loadBlocklist(),
      loadAllowlist(),
      loadUsageAndLimits()
    ]);
  } catch (error) {
    console.error('Refresh error:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// LOAD STATS
// ═══════════════════════════════════════════════════════════════

async function loadStats() {
  try {
    const [historyRes, blockedRes, childRes] = await Promise.all([
      apiCall('GET', `/logs/history/${currentChildId}`),
      apiCall('GET', `/logs/blocked/${currentChildId}`),
      apiCall('GET', `/children/${currentChildId}`)
    ]);

    const history = historyRes.history || [];
    const blocked = blockedRes.blocked || [];
    const child = childRes.child || {};

    document.getElementById('totalVisits').textContent = history.length;
    document.getElementById('totalBlocked').textContent = blocked.length;
    document.getElementById('totalDevices').textContent = child.device_count || 0;

    // Blocked today
    const today = new Date().toDateString();
    const todayBlocked = blocked.filter(item => 
      new Date(item.blocked_at).toDateString() === today
    ).length;
    document.getElementById('todayBlocked').textContent = todayBlocked;
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// LOAD RECENT ACTIVITY
// ═══════════════════════════════════════════════════════════════

async function loadRecentActivity() {
  try {
    const [historyRes, blockedRes] = await Promise.all([
      apiCall('GET', `/logs/history/${currentChildId}`),
      apiCall('GET', `/logs/blocked/${currentChildId}`)
    ]);

    const history = (historyRes.history || []).slice(0, 5).map(item => ({
      ...item,
      type: 'visit',
      timestamp: item.visited_at
    }));

    const blocked = (blockedRes.blocked || []).slice(0, 5).map(item => ({
      ...item,
      type: 'blocked',
      timestamp: item.blocked_at
    }));

    const combined = [...history, ...blocked]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    const container = document.getElementById('recentActivityTable');
    if (combined.length === 0) {
      container.innerHTML = '<div class="table-row"><div colspan="4">No activity yet</div></div>';
      return;
    }

    container.innerHTML = combined.map(item => `
      <div class="table-row">
        <div>${formatDate(item.timestamp)}</div>
        <div>${escapeHtml(item.url || item.domain)}</div>
        <div>${item.device_name || 'Unknown'}</div>
        <div>${item.type === 'blocked' ? '🚫 Blocked' : '✓ Visited'}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load recent activity error:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// LOAD HISTORY
// ═══════════════════════════════════════════════════════════════

async function loadHistory() {
  try {
    const search = document.getElementById('historySearch').value.toLowerCase();
    const response = await apiCall('GET', `/logs/history/${currentChildId}`);
    let history = response.history || [];

    if (search) {
      history = history.filter(item => 
        (item.url || '').toLowerCase().includes(search) ||
        (item.domain || '').toLowerCase().includes(search)
      );
    }

    const container = document.getElementById('historyTable');
    if (history.length === 0) {
      container.innerHTML = '<div class="table-row"><div colspan="4">No history found</div></div>';
      return;
    }

    container.innerHTML = history.slice(0, 200).map(item => `
      <div class="table-row">
        <div>${formatDate(item.visited_at)}</div>
        <div>${escapeHtml(item.url || item.domain)}</div>
        <div>${item.device_name || 'Unknown'}</div>
        <div>${item.duration || 0}s</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load history error:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// LOAD BLOCKED
// ═══════════════════════════════════════════════════════════════

async function loadBlocked() {
  try {
    const search = document.getElementById('blockedSearch').value.toLowerCase();
    const category = document.getElementById('blockedCategory').value;
    const response = await apiCall('GET', `/logs/blocked/${currentChildId}`);
    let blocked = response.blocked || [];

    if (search) {
      blocked = blocked.filter(item => 
        (item.url || '').toLowerCase().includes(search) ||
        (item.domain || '').toLowerCase().includes(search)
      );
    }

    if (category) {
      blocked = blocked.filter(item => item.category === category);
    }

    const container = document.getElementById('blockedTable');
    if (blocked.length === 0) {
      container.innerHTML = '<div class="table-row"><div colspan="4">No blocked sites</div></div>';
      return;
    }

    container.innerHTML = blocked.slice(0, 200).map(item => `
      <div class="table-row">
        <div>${formatDate(item.blocked_at)}</div>
        <div>${escapeHtml(item.url || item.domain)}</div>
        <div>${item.category}</div>
        <div>${item.device_name || 'Unknown'}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load blocked error:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// BLOCKLIST / ALLOWLIST
// ═══════════════════════════════════════════════════════════════

async function loadBlocklist() {
  try {
    const response = await apiCall('GET', `/blocklist/${currentChildId}`);
    const blocklist = response.blocklist || [];

    const container = document.getElementById('blocklist');
    if (blocklist.length === 0) {
      container.innerHTML = '<div style="padding: 10px; color: #718096;">No blocked domains</div>';
      return;
    }

    container.innerHTML = blocklist.map(item => `
      <div class="list-item" style="display: flex; justify-content: space-between; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px;">
        <div>
          <strong>${escapeHtml(item.domain)}</strong>
          <div class="small">${item.category}</div>
        </div>
        <button class="btn btn-ghost" onclick="removeBlocklist('${item.id}')">Remove</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load blocklist error:', error);
  }
}

async function loadAllowlist() {
  try {
    const response = await apiCall('GET', `/allowlist/${currentChildId}`);
    const allowlist = response.allowlist || [];

    const container = document.getElementById('allowlist');
    if (allowlist.length === 0) {
      container.innerHTML = '<div style="padding: 10px; color: #718096;">No allowed domains</div>';
      return;
    }

    container.innerHTML = allowlist.map(item => `
      <div class="list-item" style="display: flex; justify-content: space-between; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px;">
        <div>
          <strong>${escapeHtml(item.domain)}</strong>
        </div>
        <button class="btn btn-ghost" onclick="removeAllowlist('${item.id}')">Remove</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load allowlist error:', error);
  }
}

async function addBlocklistItem() {
  const domain = document.getElementById('blockDomain').value.trim().toLowerCase();
  const category = document.getElementById('blockCategory').value;

  if (!domain) {
    alert('Please enter a domain');
    return;
  }

  try {
    await apiCall('POST', '/blocklist', {
      child_id: currentChildId,
      domain: domain,
      category: category
    });

    document.getElementById('blockDomain').value = '';
    await loadBlocklist();
    alert('Domain blocked: ' + domain);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function addAllowlistItem() {
  const domain = document.getElementById('allowDomain').value.trim().toLowerCase();

  if (!domain) {
    alert('Please enter a domain');
    return;
  }

  try {
    await apiCall('POST', '/allowlist', {
      child_id: currentChildId,
      domain: domain
    });

    document.getElementById('allowDomain').value = '';
    await loadAllowlist();
    alert('Domain allowed: ' + domain);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function removeBlocklist(domainId) {
  if (!confirm('Remove this block?')) return;

  try {
    await apiCall('DELETE', `/blocklist/${domainId}`);
    await loadBlocklist();
    alert('Domain unblocked');
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function removeAllowlist(domainId) {
  if (!confirm('Remove from allowlist?')) return;

  try {
    await apiCall('DELETE', `/allowlist/${domainId}`);
    await loadAllowlist();
    alert('Domain removed from allowlist');
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// USAGE & TIME LIMITS
// ═══════════════════════════════════════════════════════════════

async function loadUsageAndLimits() {
  if (!currentChildId) return;
  try {
    const [usageRes, limitsRes] = await Promise.all([
      apiCall('GET', `/usage/${currentChildId}?days=1`),
      apiCall('GET', `/limits/${currentChildId}`)
    ]);

    const usage = usageRes.usage || [];
    const limits = limitsRes.limits || [];

    renderUsageSummary(usageRes, usage);
    renderUsageTable(usage, limits);
    renderLimitsList(limits);
  } catch (error) {
    console.error('Load usage error:', error);
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
    container.innerHTML = '<div class="table-row"><div colspan="4">No usage recorded yet</div></div>';
    return;
  }

  container.innerHTML = usage.map(item => {
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
}

function renderLimitsList(limits) {
  const container = document.getElementById('limitsList');
  if (!limits.length) {
    container.innerHTML = '<div style="padding: 10px; color: #718096;">No time limits yet</div>';
    return;
  }

  container.innerHTML = limits.map(rule => {
    const label = rule.permanent_block
      ? 'Permanent block'
      : `${rule.daily_limit_minutes || 0} minutes per day`;
    const cooldown = rule.blocked_until ? `Blocked until ${formatDate(rule.blocked_until)}` : 'Active';
    return `
      <div class="list-item" style="display: flex; justify-content: space-between; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px;">
        <div>
          <strong>${escapeHtml(rule.domain)}</strong>
          <div class="small">${label} · ${cooldown}</div>
        </div>
        <button class="btn btn-ghost" onclick="removeTimeLimit('${rule.id}')">Remove</button>
      </div>
    `;
  }).join('');
}

async function saveTimeLimit() {
  const domainInput = document.getElementById('limitDomain');
  const minutesInput = document.getElementById('limitMinutes');
  const permanentToggle = document.getElementById('limitPermanent');

  const domain = normalizeDomain(domainInput.value);
  if (!domain) {
    alert('Please enter a domain');
    return;
  }

  const minutes = parseInt(minutesInput.value || '0', 10);
  const permanent = permanentToggle.checked;

  try {
    await apiCall('POST', '/limits', {
      child_id: currentChildId,
      domain,
      daily_limit_minutes: permanent ? 0 : Math.max(0, minutes),
      cooldown_hours: 24,
      permanent_block: permanent
    });

    domainInput.value = '';
    minutesInput.value = '';
    permanentToggle.checked = false;
    await loadUsageAndLimits();
    alert('Time rule saved: ' + domain);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function removeTimeLimit(limitId) {
  if (!confirm('Remove this time limit?')) return;
  try {
    await apiCall('DELETE', `/limits/${limitId}`);
    await loadUsageAndLimits();
  } catch (error) {
    alert('Error: ' + error.message);
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

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function normalizeDomain(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
