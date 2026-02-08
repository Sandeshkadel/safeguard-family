/**
 * Enhanced SafeGuard - Background Service Worker
 * Handles authentication, video tracking, comment filtering, and backend sync
 */

const API_URL = "http://localhost:8000";

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

let isEnabled = true;
let intervalId = null;
let lastSentUrl = null;
let trackingStats = {
    videosTracked: 0,
    daysTracked: 0,
    profileAvailable: false
};
let parentToken = null;
let userType = 'child'; // 'parent' or 'child'
let childId = null;
let parentId = null;

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

// Initialize on startup
chrome.storage.local.get(['filterEnabled', 'parentToken', 'userType', 'childId', 'parentId'], (result) => {
    isEnabled = result.filterEnabled !== false;
    parentToken = result.parentToken || null;
    userType = result.userType || 'child';
    childId = result.childId || null;
    parentId = result.parentId || null;

    console.log(`🛡️  SafeGuard initialized - Mode: ${userType}`);

    if (isEnabled && userType === 'child') {
        startFiltering();
    }
});

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION HELPERS
// ═══════════════════════════════════════════════════════════════

async function getAuthHeaders() {
    return parentToken ? {
        'Authorization': `Bearer ${parentToken}`,
        'Content-Type': 'application/json'
    } : {
        'Content-Type': 'application/json'
    };
}

async function handleAuthError(response) {
    if (response.status === 401) {
        // Token expired, redirect to auth
        chrome.storage.local.clear(() => {
            chrome.runtime.sendMessage({
                action: 'redirectToAuth'
            }).catch(() => {
                // Popup might be closed
                console.log('Redirecting to auth...');
            });
        });
        return false;
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════
// COMMENT FILTERING
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleFilter") {
        isEnabled = request.enabled;
        isEnabled ? startFiltering() : stopFiltering();
        sendResponse({ status: "ok", isEnabled });
    } else if (request.action === "logout") {
        handleLogout();
        sendResponse({ status: "ok" });
    } else if (request.action === "switchMode") {
        userType = request.userType;
        chrome.storage.local.set({ userType });
        sendResponse({ status: "ok" });
    }
    return true;
});

function startFiltering() {
    if (intervalId) return;
    console.log("🔍 Comment Filter: Started");
    cleanComments();
    intervalId = setInterval(cleanComments, 3000);
}

function stopFiltering() {
    if (!intervalId) return;
    console.log("🔍 Comment Filter: Stopped");
    clearInterval(intervalId);
    intervalId = null;

    document.querySelectorAll('div[role="article"][data-scanned]').forEach((el) => {
        el.style.display = "";
    });
}

function cleanComments() {
    if (!isEnabled || userType !== 'child') return;

    const articles = document.querySelectorAll(
        'div[role="article"][aria-label^="Comment by"]:not([data-scanned]), ' +
        'div[role="article"][aria-label^="Reply by"]:not([data-scanned])'
    );

    articles.forEach((article) => {
        article.dataset.scanned = "true";

        const commentDiv = article.querySelector('div[dir="auto"]');
        if (!commentDiv) return;

        const commentText = commentDiv.innerText.trim();
        if (!commentText) return;

        fetch("https://facebook-content-filter-api.onrender.com/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": "60113a172a6391a21af8032938e8febd",
            },
            body: JSON.stringify({ text: commentText }),
        })
            .then(async (response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            })
            .then((result) => {
                if (result.hide && isEnabled) {
                    console.log("🚫 Hiding toxic comment");
                    article.style.display = "none";
                    article.dataset.hidden = "true";
                } else {
                    article.dataset.hidden = "false";
                }
            })
            .catch((err) => {
                console.error("Filter Error:", err);
                delete article.dataset.scanned;
            });
    });
}

// ═══════════════════════════════════════════════════════════════
// VIDEO TRACKING & ANALYSIS
// ═══════════════════════════════════════════════════════════════

async function checkTrackingStatus() {
    try {
        const response = await fetch(`${API_URL}/behavior-stats`, {
            headers: await getAuthHeaders()
        });

        if (!await handleAuthError(response)) return;

        if (response.ok) {
            const stats = await response.json();
            trackingStats = {
                videosTracked: stats.total_videos,
                daysTracked: stats.days_tracked,
                profileAvailable: stats.profile_available
            };

            console.log("📊 Tracking Status:", {
                "Videos Tracked": stats.total_videos,
                "Days Tracked": stats.days_tracked,
                "Profile Ready": stats.profile_available ? "✅ YES" : `❌ NO (${7 - stats.days_tracked} days remaining)`
            });

            if (stats.profile_available && !localStorage.getItem('profile_notification_shown')) {
                console.log("\n" + "=".repeat(70));
                console.log("🎉 YOUR USER PROFILE IS READY!");
                console.log("=".repeat(70) + "\n");
                localStorage.setItem('profile_notification_shown', 'true');
            }
        }
    } catch (error) {
        console.error("Failed to check tracking status:", error);
    }
}

// Track video URLs every 3 seconds
setInterval(() => {
    if (userType !== 'child') return;

    const currentUrl = window.location.href;

    if (currentUrl === lastSentUrl) {
        return;
    }

    const isVideoUrl = /facebook\.com\/(reel|watch|videos?)\//.test(currentUrl);

    if (!isVideoUrl) {
        return;
    }

    console.log("📹 Video Detected!");
    lastSentUrl = currentUrl;

    fetch(`${API_URL}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": "60113a172a6391a21af8032938e8febd",
        },
        body: JSON.stringify({ url: currentUrl }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log("✅ Backend Response:", data.status);

            if (data.status === "success") {
                console.log("📊 Video Info:");
                console.log("  • Title:", data.video_info?.title);
                console.log("  • Duration:", data.video_info?.duration, "seconds");
                trackingStats.videosTracked++;
                trackingStats.daysTracked = data.days_tracked;
                trackingStats.profileAvailable = data.profile_available;
            } else if (data.status === "skipped") {
                console.log("⏭️  Skipped (same URL as before)");
            }
        })
        .catch((error) => {
            console.error("❌ Fetch error:", error);
        });

}, 3000);

// Check tracking status periodically
setInterval(checkTrackingStatus, 5 * 60 * 1000);
checkTrackingStatus();

// ═══════════════════════════════════════════════════════════════
// PARENT DASHBOARD SYNC
// ═══════════════════════════════════════════════════════════════

async function syncChildVideos() {
    if (userType !== 'parent' || !parentToken) return;

    try {
        // Fetch from /api/reports/weekly/{childId}
        const response = await fetch(`${API_URL}/api/reports/weekly/${childId}`, {
            headers: {
                'Authorization': `Bearer ${parentToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!await handleAuthError(response)) return;

        if (response.ok) {
            const data = await response.json();
            chrome.storage.local.set({
                weeklyReportCache: data.report,
                lastSyncTime: new Date().toISOString()
            });
            console.log("📊 Weekly report synced");
        }
    } catch (error) {
        console.error("Sync error:", error);
    }
}

// Sync parent reports every 5 minutes
setInterval(syncChildVideos, 5 * 60 * 1000);
if (userType === 'parent') {
    syncChildVideos();
}

// ═══════════════════════════════════════════════════════════════
// LOGOUT HANDLER
// ═══════════════════════════════════════════════════════════════

function handleLogout() {
    chrome.storage.local.clear(() => {
        console.log("🚪 Logged out successfully");
        chrome.runtime.sendMessage({ action: 'redirectToAuth' }).catch(() => {
            window.location.href = 'auth.html';
        });
    });
}

console.log("🛡️  SafeGuard Background Service Worker Active");
