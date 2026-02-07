// ╔═══════════════════════════════════════════════════════════════╗
// ║  DATABASE MODEL - CHILD PROFILE                               ║
// ║  Stores child profile and configuration                       ║
// ╚═══════════════════════════════════════════════════════════════╝

const mongoose = require('mongoose');

const ChildSchema = new mongoose.Schema({
  childId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  childName: {
    type: String,
    required: true
  },
  parentEmail: {
    type: String,
    required: true,
    index: true
  },
  customBlocklist: [{
    domain: String,
    category: String,
    addedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  customAllowlist: [{
    domain: String,
    addedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  settings: {
    blockAdult: {
      type: Boolean,
      default: true
    },
    blockGambling: {
      type: Boolean,
      default: true
    },
    blockViolence: {
      type: Boolean,
      default: true
    },
    blockDrugs: {
      type: Boolean,
      default: true
    },
    blockHate: {
      type: Boolean,
      default: true
    },
    safeSearch: {
      type: Boolean,
      default: true
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  setupDate: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastActive on any query
ChildSchema.pre('save', function(next) {
  this.lastActive = Date.now();
  next();
});

module.exports = mongoose.model('Child', ChildSchema);
