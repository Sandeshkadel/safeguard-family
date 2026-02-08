/**
 * SafeGuard Configuration
 * Update these values based on your environment
 */

const CONFIG = {
    // Backend API Configuration
    API_URL: "http://localhost:8000",
    BACKEND_URL: "https://facebook-content-filter-api.onrender.com",
    API_KEY: "60113a172a6391a21af8032938e8febd",
    
    // JWT Configuration
    JWT_ALGORITHM: "HS256",
    JWT_EXPIRATION_HOURS: 24,
    JWT_REFRESH_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    
    // Feature Flags
    FEATURES: {
        COMMENT_FILTERING: true,
        VIDEO_TRACKING: true,
        WEEKLY_REPORTS: true,
        PARENT_DASHBOARD: true,
        CHILD_DASHBOARD: true
    },
    
    // Video Download Settings
    VIDEO: {
        QUALITY_OPTIONS: ["best", "worst", "360p", "720p", "1080p"],
        DEFAULT_QUALITY: "720p",
        MAX_DURATION_HOURS: 4,
        SUPPORTED_PLATFORMS: ["facebook.com", "fb.watch", "m.facebook.com"]
    },
    
    // Timeouts and Intervals
    TIMEOUTS: {
        SYNC_INTERVAL: 5 * 60 * 1000,        // 5 minutes
        TRACKING_INTERVAL: 3 * 1000,         // 3 seconds
        FILTER_CHECK_INTERVAL: 3 * 1000,     // 3 seconds
        API_TIMEOUT: 30 * 1000                // 30 seconds
    },
    
    // Storage Keys
    STORAGE: {
        PARENT_TOKEN: "parentToken",
        PARENT_ID: "parentId",
        PARENT_EMAIL: "parentEmail",
        PARENT_NAME: "parentName",
        CHILD_ID: "childId",
        CHILD_MODE: "childMode",
        USER_TYPE: "userType",
        FILTER_ENABLED: "filterEnabled",
        WEEKLY_REPORT_CACHE: "weeklyReportCache",
        LAST_SYNC_TIME: "lastSyncTime",
        SESSION_DATA: "sessionData"
    },
    
    // UI Settings
    UI: {
        THEME_COLOR: "#667eea",
        SECONDARY_COLOR: "#764ba2",
        POPUP_WIDTH: 400,
        POPUP_HEIGHT: 600,
        DASHBOARD_WIDTH: 1000,
        DASHBOARD_HEIGHT: 700
    },
    
    // Logging
    LOGGING: {
        ENABLED: true,
        LEVEL: "info", // "debug", "info", "warn", "error"
        CONSOLE_OUTPUT: true,
        MAX_LOGS: 1000
    },
    
    // Content Filtering APIs
    CONTENT_FILTER: {
        COMMENT_FILTER_URL: "https://facebook-content-filter-api.onrender.com/analyze",
        TOXICITY_THRESHOLD: 0.5, // 0-1, score above this is considered toxic
        FILTER_METHODS: ["comment", "text", "image"]
    },
    
    // Groq LLM Settings (backend use)
    LLM: {
        PROVIDER: "groq",
        MODEL_TRANSCRIPTION: "whisper-large-v3",
        MODEL_SUMMARY: "mixtral-8x7b-32768",
        TEMPERATURE: {
            TRANSCRIPTION: 0,
            SUMMARY: 0.7
        },
        MAX_TOKENS_SUMMARY: 1000
    },
    
    // Database Settings (backend)
    DATABASE: {
        TYPE: "sqlite", // or "postgresql"
        PATH: "video_downloader.db",
        ECHO: false // Log SQL queries
    }
};

// Export for Node.js/WebPack
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Log configuration on load
console.log("🛡️  SafeGuard Configuration Loaded", {
    apiUrl: CONFIG.API_URL,
    features: CONFIG.FEATURES,
    jwtExpiration: CONFIG.JWT_EXPIRATION_HOURS + " hours"
});
