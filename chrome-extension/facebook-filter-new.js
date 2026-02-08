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
