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
            await blockSite(details.tabId, url, domain, classification.category);
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
            await blockSite(details.tabId, url, domain, classification.category);
        } else {
            // LOG ALL VISITS TO HISTORY (not just blocked ones!)
            console.log(`[SafeGuard] ✓ LOGGING VISIT: ${domain}`);
            await logHistoryToBackend(url, domain, classification.category);
        }
    } catch (error) {
        console.error('[SafeGuard] Committed navigation error:', error);
    }
});

// ═══════════════════════════════════════════════════════════════
// BLOCKING LOGIC
// ═══════════════════════════════════════════════════════════════

async function blockSite(tabId, url, domain, category) {
    try {
        // Log to backend
        await logBlockToBackend(url, domain, category);
        
        // Log locally
        await logBlockLocal(url, domain, category);
        
        // Redirect to blocked page
        const blockedPageUrl = chrome.runtime.getURL('blocked-page.html') + 
            `?url=${encodeURIComponent(url)}&domain=${encodeURIComponent(domain)}&category=${encodeURIComponent(category)}`;
        
        chrome.tabs.update(tabId, { url: blockedPageUrl });
        console.log(`[SafeGuard] BLOCKED: ${domain}`);
    } catch (error) {
        console.error('[SafeGuard] Block error:', error);
    }
}

async function logBlockLocal(url, domain, category) {
    try {
        const data = await chrome.storage.local.get('blockedLog');
        const blockedLog = data.blockedLog || [];
        
        blockedLog.push({
            url,
            domain,
            category,
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

async function logHistoryToBackend(url, domain, category = 'SAFE') {
    try {
        if (!sessionData.childId || !sessionData.deviceId) {
            console.warn('[SafeGuard] Cannot log history: missing child_id or device_id');
            return;
        }
        
        const historyRecord = {
            url,
            domain,
            page_title: domain,
            duration: 0,
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
                duration: 0
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
