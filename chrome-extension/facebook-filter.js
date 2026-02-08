// ╔═══════════════════════════════════════════════════════════════╗
// ║  FACEBOOK COMMENT FILTER - Content Script (PRODUCTION READY)║
// ║  Filters toxic comments in real-time using backend AI       ║
// ╚═══════════════════════════════════════════════════════════════╝

let intervalId = null;
let isEnabled = true;
let commentsHidden = 0;

// Initialize
chrome.storage.local.get(["filterEnabled"], (result) => {
  isEnabled = result.filterEnabled !== false;
  if (isEnabled) startFiltering();
});

// Listen for toggle from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleFilter") {
    isEnabled = request.enabled;
    isEnabled ? startFiltering() : stopFiltering();
    sendResponse({ status: "ok", isEnabled });
  } else if (request.action === "getStats") {
    sendResponse({ commentsBlocked: commentsHidden });
  }
  return true;
});

function startFiltering() {
  if (intervalId) return;
  console.log("🔍 Facebook Comment Filter: Started");
  console.log("🛡️ SafeGuard Family - Protecting your child from toxic content");
  cleanComments();
  intervalId = setInterval(cleanComments, 3000); // Check every 3 seconds
}

function stopFiltering() {
  if (!intervalId) return;
  console.log("🔍 Facebook Comment Filter: Stopped");
  clearInterval(intervalId);
  intervalId = null;
  
  // Show all hidden comments
  document.querySelectorAll('div[role="article"][data-safeguard-hidden]').forEach((el) => {
    el.style.display = "";
    delete el.dataset.safeguardHidden;
  });
}

async function cleanComments() {
  if (!isEnabled) return;

  // Get all unscanned comments/replies
  const articles = document.querySelectorAll(
    'div[role="article"][aria-label^="Comment by"]:not([data-scanned]), ' +
    'div[role="article"][aria-label^="Reply by"]:not([data-scanned])'
  );

  console.log(`🔍 Found ${articles.length} new comments to scan`);

  // Fire all requests in parallel
  articles.forEach(async (article) => {
    article.dataset.scanned = "true";

    const commentDiv = article.querySelector('div[dir="auto"]');
    if (!commentDiv) return;

    const commentText = commentDiv.innerText.trim();
    if (!commentText) return;

    console.log(`📝 Analyzing: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`);

    try {
      const response = await fetch("http://localhost:8000/api/analyze-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: commentText }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      console.log(`✅ Analysis result:`, result);

      if (result.hide && isEnabled) {
        console.log(`🚫 HIDING TOXIC COMMENT: ${commentText.substring(0, 50)}...`);
        console.log(`   Reason: ${result.reason}`);
        
        // Hide the comment with visual indication
        hideCommentVisually(article, result.reason, commentText);
        
        commentsHidden++;
        
        // Log to backend database
        await logHiddenComment(commentText, result.reason);
      } else {
        console.log(`✅ Comment is safe`);
        article.dataset.safeguardHidden = "false";
      }
    } catch (err) {
      console.error("❌ Filter Error:", err);
      console.log("⚠️  Make sure backend is running on http://localhost:8000");
      // Allow retry on next run
      delete article.dataset.scanned;
    }
  });
}

function hideCommentVisually(article, reason, originalText) {
  // Mark as hidden
  article.dataset.safeguardHidden = "true";
  
  // Create SafeGuard replacement banner
  const banner = document.createElement('div');
  banner.style.cssText = `
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
    font-size: 13px;
    margin: 8px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    border: 2px solid #5a67d8;
    min-height: 60px;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  `;
  
  banner.innerHTML = `
    <div style="width: 100%;">
      <div style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">🛡️ SafeGuard Family</div>
      <div style="font-size: 12px; opacity: 0.95;">Comment hidden: ${reason}</div>
      <div style="font-size: 11px; opacity: 0.8; margin-top: 6px;">This content has been filtered to protect your child</div>
    </div>
  `;
  
  // Replace the comment content
  article.innerHTML = '';
  article.appendChild(banner);
  article.style.minHeight = '60px';
}

async function logHiddenComment(commentText, reason) {
  try {
    const childId = await chrome.storage.local.get('childId');
    if (!childId.childId) {
      console.warn('⚠️  No child ID found - comment not logged to database');
      return;
    }
    
    const authToken = await chrome.storage.local.get('authToken');
    if (!authToken.authToken) {
      console.warn('⚠️  No auth token - comment not logged to database');
      return;
    }
    
    const response = await fetch('http://localhost:8000/api/comments/hidden', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.authToken}`
      },
      body: JSON.stringify({
        child_id: childId.childId,
        post_url: window.location.href,
        post_title: document.title || 'Facebook Post',
        comment_text: commentText.substring(0, 500),
        reason: reason,
        severity: reason.includes('hate') || reason.includes('violence') ? 2 : 1,
        domain: 'facebook.com'
      })
    });
    
    if (response.ok) {
      console.log('✅ Comment logged to database');
    } else {
      console.warn('⚠️  Failed to log comment to database:', response.status);
    }
  } catch (error) {
    console.error('❌ Failed to log comment:', error);
  }
}

// Initial log message
console.log("\n" + "=".repeat(70));
console.log("🛡️  SAFEGUARD FAMILY - FACEBOOK COMMENT FILTER");
console.log("=".repeat(70));
console.log("✅ Comment filtering is ACTIVE");
console.log("📡 Backend: http://localhost:8000");
console.log("🔍 Scanning comments every 3 seconds");
console.log("💬 Toxic comments will be hidden automatically");
console.log("=".repeat(70) + "\n");


// ════════════════════════════════════════════════════════════════════════════
// USER BEHAVIOR TRACKING - Video URL Detection
// ════════════════════════════════════════════════════════════════════════════

let lastTrackedUrl = null;
let trackingStats = {
  videosTracked: 0,
  daysTracked: 0,
  profileAvailable: false
};

// Check tracking status periodically
async function checkTrackingStatus() {
  try {
    const childId = await chrome.storage.local.get('childId');
    if (!childId.childId) return;
    
    const authToken = await chrome.storage.local.get('authToken');
    if (!authToken.authToken) return;
    
    const response = await fetch(`http://localhost:8000/api/behavior-stats/${childId.childId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken.authToken}`,
        "Content-Type": "application/json"
      }
    });
    
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
      
      // Show notification when profile is ready
      if (stats.profile_available && !localStorage.getItem('profile_notification_shown')) {
        console.log("\n" + "=".repeat(70));
        console.log("🎉 YOUR USER PROFILE IS READY!");
        console.log("Check the Parent Dashboard to view your behavior profile");
        console.log("=".repeat(70) + "\n");
        localStorage.setItem('profile_notification_shown', 'true');
      }
    }
  } catch (error) {
    console.error("Failed to check tracking status:", error);
  }
}

// Check status every 5 minutes
setInterval(checkTrackingStatus, 5 * 60 * 1000);
checkTrackingStatus(); // Initial check

// Track video URLs every 3 seconds
setInterval(async () => {
  try {
    const currentUrl = window.location.href;
    
    // Only send if URL changed
    if (currentUrl === lastTrackedUrl) {
      return;
    }
    
    // Check if it's a video/reel URL
    const isVideoUrl = /facebook\.com\/(reel|watch|videos?)\//.test(currentUrl) || /fb\.watch\//.test(currentUrl);
    
    if (!isVideoUrl) {
      return;
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("📹 Video Detected!");
    console.log("URL:", currentUrl);
    console.log("Sending to behavior tracking system...");
    lastTrackedUrl = currentUrl;
    
    const childId = await chrome.storage.local.get('childId');
    if (!childId.childId) {
      console.log("❌ No child ID found - skipping tracking");
      console.log("=".repeat(70) + "\n");
      return;
    }
    
    const response = await fetch("http://localhost:8000/api/track-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: currentUrl,
        child_id: childId.childId
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Backend Response:", data.status);
    
    if (data.status === "success") {
      console.log("📊 Video Info:");
      console.log("  • Title:", data.video_info?.title);
      console.log("  • Duration:", data.video_info?.duration, "seconds");
      console.log("  • Categories:", data.categories?.join(", "));
      console.log("  • Days Tracked:", data.days_tracked);
      console.log("  • Total Videos:", data.total_videos);
      
      if (data.profile_available) {
        console.log("\n🎉 USER PROFILE AVAILABLE!");
        console.log("Check your Parent Dashboard to view your behavior profile");
      } else {
        const daysRemaining = 7 - data.days_tracked;
        console.log(`\n⏳ Profile will be generated in ${daysRemaining} days`);
      }
      
      // Update tracking stats
      trackingStats.videosTracked = data.total_videos;
      trackingStats.daysTracked = data.days_tracked;
      trackingStats.profileAvailable = data.profile_available;
    } else if (data.status === "skipped") {
      console.log("⏭️  Skipped (already tracked recently)");
    } else if (data.status === "ignored") {
      console.log("⏭️  Ignored:", data.message);
    }
    
    console.log("=".repeat(70) + "\n");
  } catch (error) {
    console.error("❌ Video tracking error:", error);
    console.log("Make sure the backend server is running on http://localhost:8000");
  }
}, 3000);

// Initial tracking message
console.log("\n" + "=".repeat(70));
console.log("🎯 USER BEHAVIOR TRACKING ACTIVE");
console.log("=".repeat(70));
console.log("Facebook videos will be tracked and categorized");
console.log("After 7 days, a detailed behavior profile will be generated");
console.log("Check console for real-time tracking updates");
console.log("=".repeat(70) + "\n");
