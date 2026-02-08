/**
 * ════════════════════════════════════════════════════════════════════════════════
 * SAFEGUARD FAMILY - CHROME EXTENSION SERVICE WORKER
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 * Responsibilities:
 *   • Handle JWT authentication and token management
 *   • Monitor Facebook for toxic/inappropriate comments
 *   • Hide harmful comments automatically
 *   • Track child's viewing activity in real-time
 *   • Sync data with backend periodically
 *   • Filter content based on parental settings
 *   • Log all activities for reports
 * 
 * ════════════════════════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION & CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Backend API URL
    API_URL: 'http://localhost:8000',
    
    // JWT Token expiration check (24 hours)
    TOKEN_EXPIRY_HOURS: 24,
    
    // Sync intervals (in milliseconds)
    ACTIVITY_SYNC_INTERVAL: 5 * 60 * 1000,  // Sync activity every 5 minutes
    COMMENT_CHECK_INTERVAL: 3 * 1000,        // Check for comments every 3 seconds
    USAGE_LOG_INTERVAL: 15 * 1000,            // Log usage every 15 seconds
    
    // Request timeout
    REQUEST_TIMEOUT: 30000,  // 30 seconds
    
    // Storage keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'authToken',
        PARENT_ID: 'parentId',
        USER_TYPE: 'userType',
        CHILD_MODE: 'childMode',
        USAGE_DATA: 'usageByDate',
        ACTIVITY_LOG: 'activityLog'
    }
};

// ════════════════════════════════════════════════════════════════════════════
// TOXIC & INAPPROPRIATE KEYWORDS FOR COMMENT FILTERING
// ════════════════════════════════════════════════════════════════════════════

const TOXIC_KEYWORDS = {
    // Violence & Harm
    violence: ['kill', 'murder', 'harm', 'hurt', 'punch', 'beat', 'attack', 'fight'],
    
    // Abusive Language
    abusive: ['stupid', 'idiot', 'loser', 'pathetic', 'worthless', 'trash', 'retard'],
    
    // Hate Speech
    hate: ['hate', 'racist', 'bigot', 'sexist', 'homophobic', 'transphobic'],
    
    // Sexual Content
    sexual: ['sex', 'porn', 'xxx', 'nude', 'horny', 'sexy', 'boobs', 'ass'],
    
    // Drugs/Alcohol
    substance: ['cocaine', 'heroin', 'meth', 'weed', 'drugs', 'dealer', 'junkie'],
    
    // General inappropriate
    inappropriate: ['adult', '18+', 'rude', 'crude', 'vulgar', 'profane']
};

// Regex patterns for advanced detection
const TOXIC_PATTERNS = [
    /\b(f[u\*]ck|sh[i\*]t|damn|hell|f[u\*]cking)\b/gi,  // Profanity
    /(.)\1{4,}/g,  // Repeated characters (spam)
    /[A-Z]{5,}/g,  // EXCESSIVE CAPS (aggression)
    /[!@#$%^&*]+{3,}/g,  // Excessive symbols (anger)
];

// ════════════════════════════════════════════════════════════════════════════
// COMMENT FILTERING FUNCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Analyze comment for toxic/inappropriate content
 * Returns severity level: 0 (safe), 1 (warning), 2 (block)
 * 
 * @param {string} commentText - The comment to analyze
 * @returns {Object} {isToxic: boolean, severity: 0|1|2, reason: string}
 */
function analyzeComment(commentText) {
    if (!commentText || commentText.length === 0) {
        return { isToxic: false, severity: 0, reason: 'empty' };
    }
    
    const lowerText = commentText.toLowerCase();
    let severity = 0;
    let reasons = [];
    
    // ════════════════
    // CHECK KEYWORDS
    // ════════════════
    for (const [category, keywords] of Object.entries(TOXIC_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                severity = Math.max(severity, 2);  // Block
                reasons.push(category);
                break;  // Found one in this category
            }
        }
    }
    
    // ════════════════
    // CHECK PATTERNS
    // ════════════════
    for (const pattern of TOXIC_PATTERNS) {
        if (pattern.test(commentText)) {
            severity = Math.max(severity, 1);  // Warning
            reasons.push('pattern_match');
            pattern.lastIndex = 0;  // Reset regex state
        }
    }
    
    // ════════════════
    // CHECK LENGTH
    // ════════════════
    // Very long aggressive comments (spam)
    if (commentText.length > 500 && severity > 0) {
        severity = 2;
        reasons.push('excessive_length');
    }
    
    return {
        isToxic: severity > 0,
        severity: severity,
        reason: reasons.join(', ')
    };
}

// ════════════════════════════════════════════════════════════════════════════
// FACEBOOK COMMENT DETECTION & HIDING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Find all comments on page and hide toxic ones
 * Runs continuously on facebook.com
 * 
 * Searches for comment elements and applies filtering
 */
function filterFacebookComments() {
    if (!window.location.hostname.includes('facebook.com')) {
        return;  // Only run on Facebook
    }
    
    let hiddenCount = 0;
    
    // Facebook comment selectors (may need updates as Facebook changes DOM)
    const commentSelectors = [
        '[data-testid="fb-comment"]',      // Comment container
        'article',                          // Post article
        '[role="comment"]',                // Comment role
        '.x1ey2m1c',                       // Comment text container
        '[aria-label*="comment"]'          // Aria labeled comments
    ];
    
    // Find all comment containers
    const commentElements = document.querySelectorAll(commentSelectors.join(','));
    
    commentElements.forEach(element => {
        // Get comment text
        const textElement = element.querySelector('[data-testid="post_message"], .x193iq5w, span');
        
        if (textElement && textElement.textContent) {
            const commentText = textElement.textContent.trim();
            
            // Analyze comment
            const analysis = analyzeComment(commentText);
            
            // Hide toxic comments
            if (analysis.isToxic && analysis.severity >= 1) {
                // Hide the comment visually
                element.style.display = 'none';
                element.setAttribute('data-safeguard-hidden', 'true');
                
                // Replace with message
                const placeholder = document.createElement('div');
                placeholder.style.cssText = `
                    background: #fed7d7;
                    border-left: 4px solid #f56565;
                    padding: 12px;
                    margin: 10px 0;
                    border-radius: 4px;
                    color: #742a2a;
                    font-size: 13px;
                    font-weight: 500;
                `;
                
                if (analysis.severity === 2) {
                    placeholder.textContent = '🚫 Inappropriate comment hidden by SafeGuard';
                } else {
                    placeholder.textContent = '⚠️ Content warning: Potentially inappropriate comment hidden';
                }
                
                element.parentElement?.insertBefore(placeholder, element);
                hiddenCount++;
            }
        }
    });
    
    // Log hidden comments
    if (hiddenCount > 0) {
        console.log(`[SafeGuard] Hidden ${hiddenCount} inappropriate comments`);
        logActivity('comments_filtered', hiddenCount);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY TRACKING & LOGGING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Track user activity (viewing time, videos watched, etc)
 * Stores in local storage and syncs with backend
 * 
 * @param {string} action - Type of action (e.g., 'video_watched', 'comments_filtered')
 * @param {number|string} value - Value/count associated with action
 */
function logActivity(action, value = 1) {
    const today = new Date().toISOString().split('T')[0];  // YYYY-MM-DD format
    
    chrome.storage.local.get(CONFIG.STORAGE_KEYS.USAGE_DATA, (result) => {
        let usageByDate = result[CONFIG.STORAGE_KEYS.USAGE_DATA] || {};
        
        if (!usageByDate[today]) {
            usageByDate[today] = {};
        }
        
        // Increment counter for this action
        usageByDate[today][action] = (usageByDate[today][action] || 0) + value;
        
        // Save to chrome storage
        chrome.storage.local.set({
            [CONFIG.STORAGE_KEYS.USAGE_DATA]: usageByDate
        });
    });
}

// ════════════════════════════════════════════════════════════════════════════
// API REQUEST HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get authorization headers with JWT token
 * 
 * @returns {Object} Headers with Authorization Bearer token
 */
async function getAuthHeaders() {
    return new Promise((resolve) => {
        chrome.storage.local.get(CONFIG.STORAGE_KEYS.AUTH_TOKEN, (result) => {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (result[CONFIG.STORAGE_KEYS.AUTH_TOKEN]) {
                headers['Authorization'] = `Bearer ${result[CONFIG.STORAGE_KEYS.AUTH_TOKEN]}`;
            }
            
            resolve(headers);
        });
    });
}

/**
 * Make API request to backend with error handling
 * 
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method
 * @param {Object} body - Request body
 * @returns {Promise<Object>} API response
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const headers = await getAuthHeaders();
        
        const options = {
            method: method,
            headers: headers,
            timeout: CONFIG.REQUEST_TIMEOUT
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${CONFIG.API_URL}${endpoint}`, options);
        
        // Handle 401 (token expired)
        if (response.status === 401) {
            handleAuthError();
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('[SafeGuard] API Error:', error);
        return null;
    }
}

/**
 * Handle authentication errors
 * Clears token and redirects to login
 */
function handleAuthError() {
    console.warn('[SafeGuard] Authentication failed - token may be expired');
    
    chrome.storage.local.remove([
        CONFIG.STORAGE_KEYS.AUTH_TOKEN,
        CONFIG.STORAGE_KEYS.PARENT_ID,
        CONFIG.STORAGE_KEYS.USER_TYPE
    ]);
    
    // Notify extension to redirect to auth page
    chrome.runtime.sendMessage({
        action: 'authError'
    }).catch(() => {
        // Extension may have been reloaded
    });
}

// ════════════════════════════════════════════════════════════════════════════
// PERIODICAL SYNC WITH BACKEND
// ════════════════════════════════════════════════════════════════════════════

/**
 * Sync activity data with backend periodically
 * Called every 5 minutes
 */
async function syncActivityToBackend() {
    const data = await new Promise((resolve) => {
        chrome.storage.local.get([
            CONFIG.STORAGE_KEYS.USER_TYPE,
            CONFIG.STORAGE_KEYS.AUTH_TOKEN,
            CONFIG.STORAGE_KEYS.USAGE_DATA
        ], resolve);
    });
    
    // Only sync if parent is logged in
    if (data[CONFIG.STORAGE_KEYS.USER_TYPE] !== 'parent' || !data[CONFIG.STORAGE_KEYS.AUTH_TOKEN]) {
        return;
    }
    
    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const usageData = data[CONFIG.STORAGE_KEYS.USAGE_DATA] || {};
    const todayUsage = usageData[today] || {};
    
    if (Object.keys(todayUsage).length === 0) {
        return;  // No activity to sync
    }
    
    console.log('[SafeGuard] Syncing activity with backend:', todayUsage);
    
    // Send to backend (future implementation)
    // await apiRequest('/api/activity/sync', 'POST', {
    //     date: today,
    //     activities: todayUsage
    // });
}

// ════════════════════════════════════════════════════════════════════════════
// CONTINUOUS MONITORING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Start continuous monitoring on Facebook pages
 */
function startMonitoring() {
    // Check for comments every 3 seconds
    setInterval(() => {
        if (window.location.hostname.includes('facebook.com')) {
            filterFacebookComments();
        }
    }, CONFIG.COMMENT_CHECK_INTERVAL);
    
    // Sync activity every 5 minutes
    setInterval(() => {
        syncActivityToBackend();
    }, CONFIG.ACTIVITY_SYNC_INTERVAL);
    
    // Log that monitoring started
    console.log('[SafeGuard] Monitoring active - Comment filtering enabled');
}

// ════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Handle messages from content scripts and extension pages
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Log message received
    console.log('[SafeGuard] Message received:', request.action);
    
    // Handle different message types
    switch (request.action) {
        case 'logActivity':
            logActivity(request.type, request.value);
            sendResponse({ success: true });
            break;
            
        case 'filterComments':
            filterFacebookComments();
            sendResponse({ success: true });
            break;
            
        case 'authError':
            handleAuthError();
            sendResponse({ success: true });
            break;
            
        case 'checkAuth':
            chrome.storage.local.get(CONFIG.STORAGE_KEYS.AUTH_TOKEN, (result) => {
                sendResponse({ 
                    isAuthenticated: !!result[CONFIG.STORAGE_KEYS.AUTH_TOKEN]
                });
            });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// ════════════════════════════════════════════════════════════════════════════
// SERVICE WORKER LIFECYCLE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Start monitoring when service worker starts
 */
console.log('[SafeGuard] Service Worker loaded - Version 2.1.0');
startMonitoring();

// Keep service worker alive
setInterval(() => {
    console.log('[SafeGuard] Service Worker heartbeat');
}, 20000);
