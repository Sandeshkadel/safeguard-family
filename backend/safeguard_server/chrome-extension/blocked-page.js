// SafeGuard Blocked Page Handler
// This script manages the blocked website page functionality

document.addEventListener('DOMContentLoaded', initializePage);

// Get blocked URL info from query parameters
const params = new URLSearchParams(window.location.search);
const blockedUrl = params.get('url') || 'Unknown';
const domain = params.get('domain') || 'Unknown';
const category = params.get('category') || 'Other';
const timestamp = params.get('timestamp') || Date.now();

// Button functions with improved reliability
function goBack() {
    try {
        // Try to go back in history
        const backTimeout = setTimeout(() => {
            // Fallback if back doesn't work after 500ms
            goHome();
        }, 500);
        
        window.history.back();
        
        // Clear timeout if back worked
        window.addEventListener('popstate', () => {
            clearTimeout(backTimeout);
        }, { once: true });
    } catch (e) {
        // If history.back() fails, go home
        goHome();
    }
}

function goHome() {
    // Redirect to blank page
    window.location.href = 'about:blank';
}

// Initialize when DOM is ready
function initializePage() {
    // Display full URL instead of just domain
    document.getElementById('blocked-url').textContent = blockedUrl;
    document.getElementById('blocked-time').textContent = new Date(parseInt(timestamp)).toLocaleString();

    // Create category badge
    const categoryBadge = document.createElement('span');
    categoryBadge.className = `category-badge category-${category.toLowerCase()}`;
    categoryBadge.textContent = category;
    document.getElementById('category-badge').innerHTML = '';
    document.getElementById('category-badge').appendChild(categoryBadge);

    // Customize reason text based on category
    const reasonTexts = {
        'Adult': 'This website contains adult content that is not appropriate for children.',
        'Gambling': 'This website is related to gambling, which can be harmful and addictive.',
        'Violence': 'This website contains violent content that may be disturbing.',
        'Drugs': 'This website has content related to drugs or illegal substances.',
        'Hate': 'This website contains hateful content that promotes discrimination.',
        'Malware': 'This website has been identified as potentially harmful or dangerous.',
        'Other': 'This website has been blocked by parental controls.',
        'Custom': 'This website has been blocked by custom parental controls.'
    };

    document.getElementById('reason-text').textContent = reasonTexts[category] || reasonTexts['Other'];
    
    // Add click feedback to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.style.opacity = '0.7';
            setTimeout(() => {
                this.style.opacity = '1';
            }, 200);
        });
    });
}

// Prevent navigation away (in case URL is typed)
window.addEventListener('beforeunload', function(e) {
    // This page is meant to stay visible
});
