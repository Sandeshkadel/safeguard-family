// ╔═══════════════════════════════════════════════════════════════╗
// ║  DATABASE MODEL - PARENT                                      ║
// ║  Stores parent/guardian account information                   ║
// ╚═══════════════════════════════════════════════════════════════╝

const mongoose = require('mongoose');

const ParentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  children: [{
    childId: {
      type: String,
      required: true,
      unique: true
    },
    childName: {
      type: String,
      required: true
    },
    setupDate: {
      type: Date,
      default: Date.now
    },
    active: {
      type: Boolean,
      default: true
    }
  }],
  emailNotifications: {
    type: Boolean,
    default: true
  },
  esp32Alerts: {
    type: Boolean,
    default: true
  },
  dataRetentionDays: {
    type: Number,
    default: 30
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
ParentSchema.index({ email: 1 });
ParentSchema.index({ 'children.childId': 1 });

module.exports = mongoose.model('Parent', ParentSchema);
