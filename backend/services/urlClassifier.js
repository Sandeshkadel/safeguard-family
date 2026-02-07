// ╔═══════════════════════════════════════════════════════════════╗
// ║  SERVICE - URL CLASSIFIER                                     ║
// ║  Determines if a URL should be blocked based on category      ║
// ╚═══════════════════════════════════════════════════════════════╝

const Child = require('../models/Child');

// ═══════════════════════════════════════════════════════════════
// BLOCKED KEYWORDS DATABASE
// ═══════════════════════════════════════════════════════════════
// This is a simplified version. In production, use a comprehensive
// database or API service like Google Safe Browsing API

const CATEGORY_KEYWORDS = {
  Adult: [
    'porn', 'xxx', 'adult', 'sex', 'nude', 'nsfw', 'erotic',
    'hentai', 'webcam', 'camgirl', 'xvideos', 'pornhub', 
    'redtube', 'youporn', 'xhamster', 'spankwire'
  ],
  Gambling: [
    'casino', 'poker', 'gambling', 'bet', 'betting', 'lottery',
    'slots', 'blackjack', 'roulette', 'wager', 'jackpot',
    'sportsbook', 'bookmaker', 'bookie'
  ],
  Violence: [
    'gore', 'violence', 'death', 'murder', 'torture', 'weapon',
    'gun', 'bestgore', 'liveleak', 'watchpeopledie'
  ],
  Drugs: [
    'drugs', 'cocaine', 'heroin', 'meth', 'marijuana', 'weed',
    '420', 'cannabis', 'recreational-drugs'
  ],
  Hate: [
    'nazi', 'hate-speech', 'extremism', 'terrorist', 'racism',
    'white-supremacy', 'hate-group'
  ],
  Malware: [
    'malware', 'virus', 'trojan', 'phishing', 'scam', 'fraud',
    'fake-download', 'suspicious'
  ]
};

// Known safe domains (whitelist)
const SAFE_DOMAINS = [
  'google.com', 'youtube.com', 'wikipedia.org', 'github.com',
  'stackoverflow.com', 'microsoft.com', 'apple.com',
  'khan academy.org', 'coursera.org', 'udemy.com', 'edx.org',
  'duolingo.com', 'nationalgeographic.com', 'smithsonian.com'
];

// ═══════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════

async function classifyUrl(url, childId) {
  try {
    // Parse URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const fullUrl = url.toLowerCase();
    
    // Check if in safe domains list
    if (isSafeDomain(domain)) {
      return {
        blocked: false,
        category: 'Safe',
        confidence: 1.0
      };
    }
    
    // Get child's custom lists
    let customBlocklist = [];
    let customAllowlist = [];
    
    if (childId) {
      const child = await Child.findOne({ childId });
      if (child) {
        customBlocklist = child.customBlocklist || [];
        customAllowlist = child.customAllowlist || [];
        
        // Check custom allowlist first
        if (isInCustomAllowlist(domain, customAllowlist)) {
          return {
            blocked: false,
            category: 'Parent Approved',
            confidence: 1.0
          };
        }
        
        // Check custom blocklist
        const customBlock = isInCustomBlocklist(domain, customBlocklist);
        if (customBlock) {
          return {
            blocked: true,
            category: customBlock.category,
            confidence: 1.0,
            reason: 'Parent blocked'
          };
        }
      }
    }
    
    // Check against keyword database
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (fullUrl.includes(keyword) || domain.includes(keyword)) {
          return {
            blocked: true,
            category: category,
            confidence: 0.9,
            matchedKeyword: keyword
          };
        }
      }
    }
    
    // No match found - allow by default (fail-safe approach)
    return {
      blocked: false,
      category: 'Uncategorized',
      confidence: 0.5
    };
    
  } catch (error) {
    console.error('URL classification error:', error);
    // Fail-safe: don't block on error
    return {
      blocked: false,
      category: 'Error',
      confidence: 0.0,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function isSafeDomain(domain) {
  return SAFE_DOMAINS.some(safeDomain => 
    domain === safeDomain || domain.endsWith('.' + safeDomain)
  );
}

function isInCustomBlocklist(domain, blocklist) {
  return blocklist.find(item => 
    domain.includes(item.domain) || item.domain.includes(domain)
  );
}

function isInCustomAllowlist(domain, allowlist) {
  return allowlist.some(item => 
    domain.includes(item.domain) || item.domain.includes(domain)
  );
}

// ═══════════════════════════════════════════════════════════════
// ADVANCED CLASSIFICATION (Optional - requires external API)
// ═══════════════════════════════════════════════════════════════

async function classifyWithAI(url) {
  // This would integrate with services like:
  // - Google Safe Browsing API
  // - WebPurify API
  // - OpenAI API for content analysis
  // Implementation left for production deployment
  
  return {
    blocked: false,
    category: 'AI_Classification_Not_Implemented',
    confidence: 0.0
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  classifyUrl,
  CATEGORY_KEYWORDS,
  SAFE_DOMAINS
};
