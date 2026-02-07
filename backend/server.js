// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - MAIN SERVER                               ║
// ║  Express.js Backend with MongoDB                              ║
// ╚═══════════════════════════════════════════════════════════════╝

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const classifyRoutes = require('./routes/classify');
const alertsRoutes = require('./routes/alerts');
const parentRoutes = require('./routes/parent');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE SETUP
// ═══════════════════════════════════════════════════════════════

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    /^chrome-extension:\/\//,  // Allow all Chrome extensions
    process.env.FRONTEND_URL
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ═══════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safeguard-family', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB database');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('Please make sure MongoDB is running or check your MONGODB_URI in .env file');
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'SafeGuard Family Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check API endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/classify', classifyRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/parent', parentRoutes);

// Serve static dashboard files
app.use('/dashboard', express.static('../dashboard'));

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   🛡️  SafeGuard Family Backend Server           ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Database: ${process.env.MONGODB_URI ? 'Connected' : 'Local'}`);
  console.log(`✅ Email Service: ${process.env.EMAIL_SERVICE || 'Not Configured'}`);
  console.log(`✅ ESP32 Alerts: ${process.env.ESP32_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log('\n📡 API Endpoints:');
  console.log(`   POST /api/classify - URL classification`);
  console.log(`   POST /api/alerts/blocked - Log blocked site`);
  console.log(`   POST /api/parent/register - Register parent`);
  console.log(`   GET  /dashboard - Parent dashboard\n`);
  console.log('Press Ctrl+C to stop the server\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('✅ Database connection closed');
    process.exit(0);
  });
});
