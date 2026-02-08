// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - CONTENT SCRIPT                            ║
// ║  Runs on every webpage - Page-level protection                ║
// ║  NO KEYLOGGING | NO FORM READING | ONLY URL MONITORING       ║
// ╚═══════════════════════════════════════════════════════════════╝

console.log('[SafeGuard Content] Loaded on:', window.location.href);

// ═══════════════════════════════════════════════════════════════
// IMPORTANT: WHAT THIS SCRIPT DOES NOT DO
// ═══════════════════════════════════════════════════════════════
// ✗ Does NOT log keystrokes
// ✗ Does NOT read form inputs
// ✗ Does NOT capture passwords
// ✗ Does NOT read messages or chat
// ✗ Does NOT track mouse movements
// ✗ Does NOT screenshot pages
// ═══════════════════════════════════════════════════════════════

// This content script is intentionally minimal
// All URL checking happens in background.js
// Content script only handles blocked page display if needed

// Optional: Add visual indicator that SafeGuard is active
function addSafeGuardIndicator() {
  // Only show on regular websites, not on blocked page
  if (window.location.href.includes('blocked-page.html')) {
    return;
  }
  
  const indicator = document.createElement('div');
  indicator.id = 'safeguard-indicator';
  indicator.innerHTML = '🛡️ SafeGuard Active';
  indicator.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(102, 126, 234, 0.9);
    color: white;
    padding: 8px 15px;
    border-radius: 20px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    z-index: 999999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 5px;
    transition: opacity 0.3s;
    opacity: 0.7;
  `;
  
  // Fade out after 3 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => indicator.remove(), 300);
  }, 3000);
  
  document.body.appendChild(indicator);
}

// Add indicator when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addSafeGuardIndicator);
} else {
  addSafeGuardIndicator();
}

// ═══════════════════════════════════════════════════════════════
// TAMPER DETECTION - Prevent script removal attempts
// ═══════════════════════════════════════════════════════════════

// Watch for attempts to remove SafeGuard elements
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.removedNodes.forEach((node) => {
      if (node.id === 'safeguard-indicator') {
        console.log('[SafeGuard] Tamper attempt detected');
        // Log to backend (optional)
      }
    });
  });
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

console.log('[SafeGuard Content] Protection active');
