// ╔═══════════════════════════════════════════════════════════════╗
// ║  DATABASE MODEL - BLOCKED SITE LOG                            ║
// ║  Stores logs of blocked website attempts                      ║
// ╚═══════════════════════════════════════════════════════════════╝

const mongoose = require('mongoose');

const BlockedSiteSchema = new mongoose.Schema({
  childId: {
    type: String,
    required: true,
    index: true
  },
  childName: {
    type: String,
    required: true
  },
  parentEmail: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Adult', 'Gambling', 'Violence', 'Drugs', 'Hate', 'Malware', 'Phishing', 'Other']
  },
  action: {
    type: String,
    enum: ['BLOCKED', 'WARNED', 'ALLOWED'],
    default: 'BLOCKED'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  esp32Triggered: {
    type: Boolean,
    default: false
  },
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
BlockedSiteSchema.index({ childId: 1, timestamp: -1 });
BlockedSiteSchema.index({ parentEmail: 1, timestamp: -1 });
BlockedSiteSchema.index({ timestamp: 1 }); // For data retention cleanup

// Auto-delete old records based on retention policy
BlockedSiteSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days default
);

module.exports = mongoose.model('BlockedSite', BlockedSiteSchema);
