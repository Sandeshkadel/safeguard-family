// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - BACKGROUND SERVICE WORKER (Fixed V3)      ║
// ║  Uses chrome.storage.local (NOT localStorage!)                ║
// ║  Monitors all URLs and logs to Python backend                 ║
// ╚═══════════════════════════════════════════════════════════════╝

importScripts('config.js');

// Session data (runtime only)
let sessionData = {
    setupComplete: false,
    childName: '',
    childId: '',
    backendUrl: `${API_CONFIG.baseURL}/api`,
    deviceId: '',
    parentPassword: '',
    extensionEnabled: true
};

// Category keywords for URL classification
const CATEGORY_KEYWORDS = {
    Adult: ['adult', 'xxx', 'porn', 'sex', 'nude', 'naked', 'explicit', 'naughty'],
    Gambling: ['poker', 'casino', 'bet', 'gambling', 'slots', 'blackjack', 'roulette'],
    Violence: ['kill', 'murder', 'violence', 'gore', 'blood', 'weapon', 'gun'],
    Drugs: ['cocaine', 'heroin', 'meth', 'weed', 'marijuana', 'drugs', 'dealer'],
    Hate: ['hate', 'racist', 'racism', 'bigot', 'homophobe', 'discrimination'],
    Malware: ['malware', 'virus', 'phishing', 'ransomware', 'trojan', 'spyware']
};

const USAGE_TICK_MS = 5000;    // Track every 5 seconds (was 15) - real-time tracking
const USAGE_FLUSH_SECONDS = 20; // Sync every 20 seconds (was 60) - faster backend updates
const DEFAULT_COOLDOWN_HOURS = 24;

let activeSession = {
    tabId: null,
    url: '',
    domain: '',
    startedAt: 0,
    lastTickAt: 0,
    pendingSeconds: 0
};

// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER INITIALIZATION
// ═══════════════════════════════════════════════════════════════

console.log('[SafeGuard] Service worker starting...');

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('[SafeGuard] Extension installed');
    loadSettings();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
    console.log('[SafeGuard] Browser startup');
    loadSettings();
});

// Initialize immediately on worker start
loadSettings();

async function loadSettings() {
    try {
        console.log('[SafeGuard] Loading settings from Chrome storage...');
        const data = await chrome.storage.local.get([
            'setupComplete',
            'childId', 
            'childName', 
            'backendUrl', 
            'deviceId',
            'parentPassword',
            'extensionEnabled',
            'authToken'
        ]);
        
        console.log('[SafeGuard] Retrieved data:', data);
        
        sessionData.setupComplete = data.setupComplete || false;
        sessionData.childId = data.childId || '';
        sessionData.childName = data.childName || '';
        const defaultBackendUrl = `${API_CONFIG.baseURL}/api`;
        const storedBackendUrl = data.backendUrl || defaultBackendUrl;
        sessionData.backendUrl = storedBackendUrl;
        sessionData.deviceId = data.deviceId || '';
        sessionData.parentPassword = data.parentPassword || '';
        sessionData.extensionEnabled = data.extensionEnabled !== false;
        
        console.log('[SafeGuard] Session loaded successfully');
        
        // If backend URL is outdated, correct it
        if (!storedBackendUrl || storedBackendUrl.includes('192.168.1.75')) {
            sessionData.backendUrl = defaultBackendUrl;
            await chrome.storage.local.set({ backendUrl: sessionData.backendUrl });
        }

        // Reconcile child profile with backend if needed
        await reconcileChildProfile(data.authToken);

        // If setup is complete but no device ID, create one
        if (sessionData.setupComplete && !sessionData.deviceId) {
            sessionData.deviceId = generateDeviceId();
            await chrome.storage.local.set({ deviceId: sessionData.deviceId });
            console.log('[SafeGuard] Created device ID');
            
            // Register device with backend
            if (sessionData.childId) {
                await registerDevice();
            }
        }
        
        // Sync with backend on startup
        setTimeout(syncBlocklistAndAllowlist, 1000);
    } catch (error) {
        console.error('[SafeGuard] Settings load error:', error);
    }
}

async function reconcileChildProfile(authToken) {
    try {
        if (!sessionData.setupComplete) return;
        if (!authToken) return;

        const needsRepair = !sessionData.childId || String(sessionData.childId).startsWith('child_');
        if (!needsRepair) return;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };

        const listResponse = await fetch(`${sessionData.backendUrl}/children`, { headers });
        if (listResponse.ok) {
            const listData = await listResponse.json();
            if (listData.children && listData.children.length) {
                const child = listData.children[0];
                sessionData.childId = child.id;
                sessionData.childName = child.name;
                await chrome.storage.local.set({ childId: child.id, childName: child.name });
                return;
            }
        }

        if (!sessionData.childName) return;

        const createResponse = await fetch(`${sessionData.backendUrl}/children`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: sessionData.childName })
        });

        if (createResponse.ok) {
            const createData = await createResponse.json();
            if (createData.child_id) {
                sessionData.childId = createData.child_id;
                await chrome.storage.local.set({ childId: createData.child_id });
            }
        }
    } catch (error) {
        console.warn('[SafeGuard] Child profile sync failed:', error);
    }
}

// Generate unique device ID
function generateDeviceId() {
    return 'device-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
}

// Get device name
function getDeviceName() {
    return 'Windows Computer';
}

// ═══════════════════════════════════════════════════════════════
// DEVICE REGISTRATION
// ═══════════════════════════════════════════════════════════════

async function registerDevice() {
    try {
        if (!sessionData.childId || !sessionData.deviceId || !sessionData.backendUrl) {
            console.warn('[SafeGuard] Cannot register device: missing required data');
            return;
        }
        
        const tokenData = await chrome.storage.local.get('authToken');
        const authToken = tokenData.authToken;
        if (!authToken) {
            console.warn('[SafeGuard] Cannot register device: no auth token');
            return;
        }
        
        const url = `${sessionData.backendUrl}/devices`;
        console.log('[SafeGuard] Registering device to:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                child_id: sessionData.childId,
                device_id: sessionData.deviceId,
                device_name: getDeviceName(),
                device_type: 'windows'
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.warn('[SafeGuard] Device registration failed:', response.status, error);
            return;
        }
        
        const data = await response.json();
        console.log('[SafeGuard] Device registered successfully');
    } catch (error) {
        console.error('[SafeGuard] Device registration error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// URL CLASSIFICATION & BLOCKING
// ═══════════════════════════════════════════════════════════════

async function classifyUrl(url, domain) {
    try {
        const timeLimit = await checkTimeLimit(domain);
        if (timeLimit.blocked) {
            return {
                category: 'Time Limit',
                blocked: true,
                timeLimit
            };
        }

        // Check allowlist first
        const allowedData = await chrome.storage.local.get('allowedDomains');
        if (allowedData.allowedDomains && isDomainInList(domain, allowedData.allowedDomains)) {
            return { category: 'Allowed', allowed: true };
        }
        
        // Check custom blocklist
        const blockedData = await chrome.storage.local.get('blockedDomains');
        if (blockedData.blockedDomains) {
            for (const item of blockedData.blockedDomains) {
                if (isDomainMatched(domain, item.domain)) {
                    return { category: item.category, blocked: true, custom: true };
                }
            }
        }
        
        // Check keywords
        const lowerUrl = url.toLowerCase() + ' ' + domain.toLowerCase();
        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (keywords.some(keyword => lowerUrl.includes(keyword))) {
                return { category, blocked: true, custom: false };
            }
        }
        
        return { category: 'Safe', blocked: false };
    } catch (error) {
        console.error('[SafeGuard] Classification error:', error);
        return { category: 'Unknown', blocked: false };
    }
}

function isDomainMatched(domain, pattern) {
    domain = domain.toLowerCase();
    pattern = pattern.toLowerCase().replace('www.', '');
    
    return domain === pattern || 
           domain.endsWith('.' + pattern) ||
           domain === pattern.replace('www.', '');
}

function isDomainInList(domain, list) {
    if (!Array.isArray(list)) return false;
    
    for (const item of list) {
        const checkDomain = typeof item === 'string' ? item : item.domain;
        if (isDomainMatched(domain, checkDomain)) {
            return true;
        }
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════
// URL NAVIGATION MONITORING (AGGRESSIVE MODE)
// ═══════════════════════════════════════════════════════════════

// Listen to onBeforeNavigate - catches navigation before it starts
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (!sessionData.extensionEnabled) return;
    if (details.frameId !== 0) return; // Only main frame
    
    try {
        const url = details.url;
        let domain = '';
        
        try {
            domain = new URL(url).hostname;
        } catch {
            return; // Invalid URL
        }
        
        // Skip extension pages
        if (url.includes('chrome-extension://')) return;
        if (url.includes('blocked-page.html')) return;
        
        // Classify URL
        const classification = await classifyUrl(url, domain);
        console.log(`[SafeGuard] Checking: ${domain} - ${classification.category} - Blocked: ${classification.blocked}`);
        
        if (classification.blocked && !classification.allowed) {
            console.log(`[SafeGuard] 🛑 BLOCKING: ${domain}`);
            // Block the site
            await blockSite(details.tabId, url, domain, classification.category, classification.timeLimit || null);
        }
    } catch (error) {
        console.error('[SafeGuard] Navigation error:', error);
    }
});

// ALSO listen to onCommitted - catches navigation after it commits
// This ensures we catch navigations that onBeforeNavigate might miss
chrome.webNavigation.onCommitted.addListener(async (details) => {
    if (!sessionData.extensionEnabled) return;
    if (details.frameId !== 0) return; // Only main frame
    
    try {
        const url = details.url;
        let domain = '';
        
        try {
            domain = new URL(url).hostname;
        } catch {
            return; // Invalid URL
        }
        
        // Skip extension pages and chrome pages
        if (url.includes('chrome-extension://')) return;
        if (url.includes('blocked-page.html')) return;
        if (url.startsWith('chrome://')) return;
        if (url.startsWith('about:')) return;
        
        // Classify URL
        const classification = await classifyUrl(url, domain);
        
        if (classification.blocked && !classification.allowed) {
            console.log(`[SafeGuard] 🛑 BLOCKING (committed): ${domain}`);
            // Block the site immediately
            await blockSite(details.tabId, url, domain, classification.category, classification.timeLimit || null);
        } else {
            // LOG ALL VISITS TO HISTORY (not just blocked ones!)
            console.log(`[SafeGuard] ✓ LOGGING VISIT: ${domain}`);
            await logHistoryToBackend(url, domain, classification.category, 0);
        }
    } catch (error) {
        console.error('[SafeGuard] Committed navigation error:', error);
    }
});

// ═══════════════════════════════════════════════════════════════
// BLOCKING LOGIC
// ═══════════════════════════════════════════════════════════════

async function blockSite(tabId, url, domain, category, timeLimit = null) {
    try {
        // Log to backend
        await logBlockToBackend(url, domain, category);
        
        // Log locally
        const action = timeLimit ? 'TIME_LIMIT' : 'BLOCKED';
        await logBlockLocal(url, domain, category, action);
        
        // Redirect to blocked page
        let blockedPageUrl = chrome.runtime.getURL('blocked-page.html') + 
            `?url=${encodeURIComponent(url)}&domain=${encodeURIComponent(domain)}&category=${encodeURIComponent(category)}`;
        if (timeLimit && timeLimit.blockedUntil) {
            blockedPageUrl += `&blockedUntil=${encodeURIComponent(timeLimit.blockedUntil)}`;
        }
        
        chrome.tabs.update(tabId, { url: blockedPageUrl });
        console.log(`[SafeGuard] BLOCKED: ${domain}`);
    } catch (error) {
        console.error('[SafeGuard] Block error:', error);
    }
}

async function logBlockLocal(url, domain, category, action) {
    try {
        const data = await chrome.storage.local.get('blockedLog');
        const blockedLog = data.blockedLog || [];
        
        blockedLog.push({
            url,
            domain,
            category,
            action: action || 'BLOCKED',
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const filtered = blockedLog.filter(log => new Date(log.timestamp) > ninetyDaysAgo);
        
        await chrome.storage.local.set({ blockedLog: filtered });
    } catch (error) {
        console.error('[SafeGuard] Local block logging error:', error);
    }
}

async function logBlockToBackend(url, domain, category) {
    try {
        if (!sessionData.childId || !sessionData.deviceId) {
            console.warn('[SafeGuard] Cannot log: missing child_id or device_id');
            return;
        }
        
        const tokenData = await chrome.storage.local.get('authToken');
        const authToken = tokenData.authToken;
        if (!authToken) {
            console.warn('[SafeGuard] Cannot log block: no auth token');
            return;
        }
        
        const response = await fetch(`${sessionData.backendUrl}/logs/block`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                child_id: sessionData.childId,
                device_id: sessionData.deviceId,
                url,
                domain,
                category
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.warn('[SafeGuard] Backend logging failed:', response.status, error);
        }
    } catch (error) {
        console.error('[SafeGuard] Backend logging error:', error);
    }
}

async function logHistoryToBackend(url, domain, category = 'SAFE', durationSeconds = 0) {
    try {
        if (!sessionData.childId || !sessionData.deviceId) {
            console.warn('[SafeGuard] Cannot log history: missing child_id or device_id');
            return;
        }
        
        const historyRecord = {
            url,
            domain,
            page_title: domain,
            duration: durationSeconds,
            timestamp: new Date().toISOString()
        };
        
        // ✅ SAVE TO LOCAL STORAGE FIRST (survives even if child clears history)
        await saveHistoryLocally(historyRecord);
        
        // Then try to send to backend
        const tokenData = await chrome.storage.local.get('authToken');
        const authToken = tokenData.authToken;
        if (!authToken) {
            console.warn('[SafeGuard] Cannot log history to backend: no auth token');
            return;
        }
        
        const response = await fetch(`${sessionData.backendUrl}/logs/history`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                child_id: sessionData.childId,
                device_id: sessionData.deviceId,
                url,
                domain,
                page_title: domain,
                duration: durationSeconds
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.warn('[SafeGuard] History logging failed:', response.status, error);
        } else {
            console.log(`[SafeGuard] ✓ History logged: ${domain}`);
        }
    } catch (error) {
        console.error('[SafeGuard] History logging error:', error);
    }
}

// ✅ SAVE HISTORY TO LOCAL CHROME STORAGE
async function saveHistoryLocally(record) {
    try {
        const data = await chrome.storage.local.get('historyLog');
        const historyLog = data.historyLog || [];
        
        // Add new record
        historyLog.unshift(record);
        
        // Keep last 500 records (to avoid storage limits)
        const trimmedLog = historyLog.slice(0, 500);
        
        await chrome.storage.local.set({ historyLog: trimmedLog });
        
        console.log(`[SafeGuard] ✓ Local history saved (${trimmedLog.length} total)`);
    } catch (error) {
        console.error('[SafeGuard] Error saving to local storage:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// TIME LIMITS & USAGE TRACKING
// ═══════════════════════════════════════════════════════════════

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isTrackableUrl(url) {
    if (!url) return false;
    if (url.startsWith('chrome://') || url.startsWith('about:')) return false;
    if (url.startsWith('chrome-extension://')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

async function addUsageSeconds(domain, seconds) {
    if (!domain || seconds <= 0) return;

    const dateKey = getTodayKey();
    const data = await chrome.storage.local.get('usageByDate');
    const usageByDate = data.usageByDate || {};
    const dayUsage = usageByDate[dateKey] || {};
    const normalizedDomain = domain.toLowerCase();
    dayUsage[normalizedDomain] = (dayUsage[normalizedDomain] || 0) + seconds;
    usageByDate[dateKey] = dayUsage;
    await chrome.storage.local.set({ usageByDate });
}

async function getUsageSecondsToday(domain) {
    if (!domain) return 0;

    const dateKey = getTodayKey();
    const data = await chrome.storage.local.get(['usageByDate', 'serverUsageToday']);
    const usageByDate = data.usageByDate || {};
    const serverUsageToday = data.serverUsageToday || {};
    const normalizedDomain = domain.toLowerCase();
    const localSeconds = (usageByDate[dateKey] || {})[normalizedDomain] || 0;
    const serverSeconds = (serverUsageToday[dateKey] || {})[normalizedDomain] || 0;
    return localSeconds + serverSeconds;
}

async function updateRuleInStorage(ruleId, updates) {
    const data = await chrome.storage.local.get('siteTimeRules');
    const rules = data.siteTimeRules || [];
    const updatedRules = rules.map(rule => {
        if (rule.id === ruleId) {
            return { ...rule, ...updates };
        }
        return rule;
    });
    await chrome.storage.local.set({ siteTimeRules: updatedRules });
}

async function updateTimeRuleBackend(rule, updates) {
    try {
        const tokenData = await chrome.storage.local.get('authToken');
        const authToken = tokenData.authToken;
        if (!authToken) return;

        await fetch(`${sessionData.backendUrl}/limits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                child_id: sessionData.childId,
                domain: rule.domain,
                daily_limit_minutes: rule.daily_limit_minutes,
                cooldown_hours: rule.cooldown_hours || DEFAULT_COOLDOWN_HOURS,
                permanent_block: rule.permanent_block,
                blocked_until: updates.blocked_until || rule.blocked_until || null
            })
        });
    } catch (error) {
        console.warn('[SafeGuard] Failed to update time rule:', error);
    }
}

async function checkTimeLimit(domain) {
    const data = await chrome.storage.local.get('siteTimeRules');
    const rules = data.siteTimeRules || [];
    const rule = rules.find(item => isDomainMatched(domain, item.domain));
    if (!rule) return { blocked: false };

    // Permanent block - always block
    if (rule.permanent_block) {
        console.log(`[SafeGuard] ⏱️ Time limit: ${domain} - PERMANENT BLOCK`);
        return { blocked: true, reason: 'permanent', rule };
    }

    // Check cooldown period
    if (rule.blocked_until) {
        const blockedUntil = new Date(rule.blocked_until);
        if (!isNaN(blockedUntil.getTime()) && blockedUntil.getTime() > Date.now()) {
            console.log(`[SafeGuard] ⏱️ Time limit: ${domain} - IN COOLDOWN until ${blockedUntil.toISOString()}`);
            return { blocked: true, reason: 'cooldown', blockedUntil: blockedUntil.toISOString(), rule };
        }
    }

    // Check daily time limit
    const limitMinutes = Number(rule.daily_limit_minutes || 0);
    if (limitMinutes <= 0) {
        return { blocked: false, rule };
    }

    const usedSeconds = await getUsageSecondsToday(domain);
    const limitSeconds = limitMinutes * 60;
    
    console.log(`[SafeGuard] ⏱️ Time limit check: ${domain} - Used: ${usedSeconds}s / Limit: ${limitSeconds}s`);
    
    if (usedSeconds >= limitSeconds) {
        const cooldownHours = Number(rule.cooldown_hours || DEFAULT_COOLDOWN_HOURS);
        const blockedUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000).toISOString();
        await updateRuleInStorage(rule.id, { blocked_until: blockedUntil });
        await updateTimeRuleBackend(rule, { blocked_until: blockedUntil });
        console.log(`[SafeGuard] 🚫 Time limit: ${domain} - LIMIT REACHED! Blocked until ${blockedUntil}`);
        return { blocked: true, reason: 'limit-reached', blockedUntil, rule };
    }

    return {
        blocked: false,
        remainingSeconds: Math.max(0, limitSeconds - usedSeconds),
        rule
    };
}

async function flushPendingUsage() {
    if (!activeSession.domain || activeSession.pendingSeconds <= 0) return;
    const durationSeconds = Math.round(activeSession.pendingSeconds);
    const domain = activeSession.domain;
    const url = activeSession.url;
    activeSession.pendingSeconds = 0;
    
    // Log to backend with activity type
    try {
        if (!sessionData.childId) return;
        
        const tokenData = await chrome.storage.local.get('authToken');
        const authToken = tokenData.authToken;
        if (!authToken) return;
        
        await fetch(`${sessionData.backendUrl}/logs/history`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                child_id: sessionData.childId,
                type: 'page_view',
                domain: domain,
                title: domain,
                duration: durationSeconds,
                flagged: false
            })
        });
        
        console.log(`[SafeGuard] ✓ Usage logged: ${domain} - ${durationSeconds}s`);
    } catch (error) {
        console.error('[SafeGuard] Usage flush error:', error);
    }
}

async function endActiveSession() {
    if (!activeSession.domain) return;
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.round((now - (activeSession.lastTickAt || now)) / 1000));
    if (elapsedSeconds > 0) {
        await addUsageSeconds(activeSession.domain, elapsedSeconds);
        activeSession.pendingSeconds += elapsedSeconds;
    }
    await flushPendingUsage();

    activeSession = {
        tabId: null,
        url: '',
        domain: '',
        startedAt: 0,
        lastTickAt: 0,
        pendingSeconds: 0
    };
}

async function setActiveSession(tabId, url) {
    if (!sessionData.extensionEnabled) return;
    if (!isTrackableUrl(url)) {
        await endActiveSession();
        return;
    }

    let domain = '';
    try {
        domain = new URL(url).hostname;
    } catch {
        return;
    }

    if (activeSession.domain && activeSession.domain !== domain) {
        await endActiveSession();
    }

    if (!activeSession.domain) {
        activeSession = {
            tabId,
            url,
            domain,
            startedAt: Date.now(),
            lastTickAt: Date.now(),
            pendingSeconds: 0
        };
    } else {
        activeSession.url = url;
        activeSession.tabId = tabId;
    }
}

async function trackActiveUsageTick() {
    if (!sessionData.extensionEnabled) return;
    if (!activeSession.domain) return;
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.round((now - activeSession.lastTickAt) / 1000));
    if (elapsedSeconds <= 0) return;

    activeSession.lastTickAt = now;
    await addUsageSeconds(activeSession.domain, elapsedSeconds);
    activeSession.pendingSeconds += elapsedSeconds;
    
    console.log(`[SafeGuard] ⏱️ Tracking: ${activeSession.domain} +${elapsedSeconds}s (total pending: ${activeSession.pendingSeconds}s)`);

    if (activeSession.pendingSeconds >= USAGE_FLUSH_SECONDS) {
        await flushPendingUsage();
    }
    
    // Check if time limit reached during active session
    const timeLimit = await checkTimeLimit(activeSession.domain);
    if (timeLimit.blocked) {
        console.log(`[SafeGuard] 🚫 Time limit reached during session: ${activeSession.domain}`);
        // Block the current tab
        if (activeSession.tabId) {
            await blockSite(activeSession.tabId, activeSession.url, activeSession.domain, 'Time Limit', timeLimit);
        }
        await endActiveSession();
    }
}

// Track active tab usage
chrome.tabs.onActivated.addListener(async (info) => {
    try {
        const tab = await chrome.tabs.get(info.tabId);
        await setActiveSession(info.tabId, tab.url || '');
    } catch (error) {
        console.error('[SafeGuard] Tab activation error:', error);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab.active) return;
    await setActiveSession(tabId, tab.url || '');
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
    if (activeSession.tabId === tabId) {
        await endActiveSession();
    }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        await endActiveSession();
    }
});

setInterval(trackActiveUsageTick, USAGE_TICK_MS);

// ═══════════════════════════════════════════════════════════════
// MESSAGE HANDLING
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'getStatus') {
            getTodayBlockedCount().then(count => {
                sendResponse({
                    extensionEnabled: sessionData.extensionEnabled,
                    setupComplete: sessionData.setupComplete,
                    childName: sessionData.childName,
                    todayBlocked: count
                });
            });
            return true;
        }
        
        if (request.action === 'toggleExtension') {
            sessionData.extensionEnabled = !sessionData.extensionEnabled;
            chrome.storage.local.set({ extensionEnabled: sessionData.extensionEnabled });
            sendResponse({ enabled: sessionData.extensionEnabled });
            return true;
        }
        
        if (request.action === 'getSessionData') {
            sendResponse(sessionData);
            return true;
        }
    } catch (error) {
        console.error('[SafeGuard] Message error:', error);
        sendResponse({ error: error.message });
    }
});

// Get today's blocked count
async function getTodayBlockedCount() {
    try {
        const data = await chrome.storage.local.get('blockedLog');
        const blockedLog = data.blockedLog || [];
        const today = new Date().toDateString();
        
        return blockedLog.filter(log => 
            new Date(log.timestamp).toDateString() === today
        ).length;
    } catch (error) {
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════
// PERIODIC SYNC WITH BACKEND
// ═══════════════════════════════════════════════════════════════

async function syncBlocklistAndAllowlist() {
    if (!sessionData.setupComplete || !sessionData.childId) return;
    
    try {
        const tokenData = await chrome.storage.local.get('authToken');
        const authToken = tokenData.authToken;
        if (!authToken) return;

        const headers = { 'Authorization': `Bearer ${authToken}` };

        // Sync blocklist
        const blocklistResponse = await fetch(`${sessionData.backendUrl}/blocklist/${sessionData.childId}`, { headers });
        if (blocklistResponse.ok) {
            const data = await blocklistResponse.json();
            const blockedDomains = data.blocklist || [];
            await chrome.storage.local.set({ blockedDomains });
        }
        
        // Sync allowlist
        const allowlistResponse = await fetch(`${sessionData.backendUrl}/allowlist/${sessionData.childId}`, { headers });
        if (allowlistResponse.ok) {
            const data = await allowlistResponse.json();
            const allowedDomains = data.allowlist || [];
            await chrome.storage.local.set({ allowedDomains });
        }

        // Sync time limits
        const limitsResponse = await fetch(`${sessionData.backendUrl}/limits/${sessionData.childId}`, { headers });
        if (limitsResponse.ok) {
            const data = await limitsResponse.json();
            const siteTimeRules = data.limits || [];
            await chrome.storage.local.set({ siteTimeRules });
        }

        // Sync usage summary (today)
        const usageResponse = await fetch(`${sessionData.backendUrl}/usage/${sessionData.childId}?days=1`, { headers });
        if (usageResponse.ok) {
            const data = await usageResponse.json();
            const dateKey = getTodayKey();
            const usageMap = data.usage_map || {};
            await chrome.storage.local.set({ serverUsageToday: { [dateKey]: usageMap } });
        }
    } catch (error) {
        console.error('[SafeGuard] Sync error:', error);
    }
}

// Sync every 5 minutes
setInterval(syncBlocklistAndAllowlist, 5 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
// EXTENSION REMOVAL DETECTION (HEARTBEAT)
// ═══════════════════════════════════════════════════════════════

async function sendHeartbeat() {
    if (!sessionData.setupComplete || !sessionData.deviceId) return;
    
    try {
        const response = await fetch(`${sessionData.backendUrl}/devices/${sessionData.deviceId}/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timestamp: new Date().toISOString(),
                extension_version: '1.0',
                status: 'active'
            })
        });
        
        if (response.ok) {
            console.log('[SafeGuard] ✓ Heartbeat sent');
        }
    } catch (error) {
        console.error('[SafeGuard] Heartbeat error:', error);
    }
}

// Send heartbeat every 2 minutes
setInterval(sendHeartbeat, 2 * 60 * 1000);

// Send initial heartbeat
setTimeout(sendHeartbeat, 5000);

console.log('[SafeGuard] Service worker loaded with heartbeat monitoring');
