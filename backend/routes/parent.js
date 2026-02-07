// ╔═══════════════════════════════════════════════════════════════╗
// ║  API ROUTE - PARENT MANAGEMENT                                ║
// ║  Parent registration, authentication, and dashboard           ║
// ╚═══════════════════════════════════════════════════════════════╝

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Parent = require('../models/Parent');
const Child = require('../models/Child');

// ═══════════════════════════════════════════════════════════════
// POST /api/parent/register - Register new parent/child
// ═══════════════════════════════════════════════════════════════

router.post('/register', async (req, res) => {
  try {
    const { 
      parentEmail, 
      passwordHash, 
      childId, 
      childName, 
      setupDate 
    } = req.body;
    
    // Validate required fields
    if (!parentEmail || !passwordHash || !childId || !childName) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }
    
    // Check if parent already exists
    let parent = await Parent.findOne({ email: parentEmail });
    
    if (parent) {
      // Add child to existing parent
      const childExists = parent.children.find(c => c.childId === childId);
      
      if (childExists) {
        return res.status(400).json({
          error: 'Child ID already registered'
        });
      }
      
      parent.children.push({
        childId,
        childName,
        setupDate: setupDate || new Date(),
        active: true
      });
      
      await parent.save();
      
    } else {
      // Create new parent
      parent = new Parent({
        email: parentEmail,
        passwordHash: passwordHash, // Already hashed on client side
        children: [{
          childId,
          childName,
          setupDate: setupDate || new Date(),
          active: true
        }],
        emailNotifications: true,
        esp32Alerts: true
      });
      
      await parent.save();
    }
    
    // Create child profile
    const child = new Child({
      childId,
      childName,
      parentEmail,
      setupDate: setupDate || new Date(),
      active: true
    });
    
    await child.save();
    
    console.log(`[Parent] Registered: ${parentEmail} with child: ${childName}`);
    
    res.json({
      success: true,
      message: 'Registration successful',
      parentId: parent._id,
      childId: child.childId
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/parent/login - Parent login
// ═══════════════════════════════════════════════════════════════

router.post('/login', async (req, res) => {
  try {
    const { email, passwordHash } = req.body;
    
    if (!email || !passwordHash) {
      return res.status(400).json({
        error: 'Email and password required'
      });
    }
    
    const parent = await Parent.findOne({ email });
    
    if (!parent) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    
    // Compare password hash
    if (parent.passwordHash !== passwordHash) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    
    // Update last login
    parent.lastLogin = new Date();
    await parent.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        parentId: parent._id,
        email: parent.email 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      parent: {
        email: parent.email,
        children: parent.children,
        settings: {
          emailNotifications: parent.emailNotifications,
          esp32Alerts: parent.esp32Alerts,
          dataRetentionDays: parent.dataRetentionDays
        }
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/parent/dashboard/:childId - Get dashboard data
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    
    const child = await Child.findOne({ childId });
    
    if (!child) {
      return res.status(404).json({
        error: 'Child not found'
      });
    }
    
    const BlockedSite = require('../models/BlockedSite');
    
    // Get recent blocks
    const recentBlocks = await BlockedSite
      .find({ childId })
      .sort({ timestamp: -1 })
      .limit(20);
    
    // Get today's count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayCount = await BlockedSite.countDocuments({
      childId,
      timestamp: { $gte: todayStart }
    });
    
    // Get category breakdown
    const categoryStats = await BlockedSite.aggregate([
      { $match: { childId } },
      { 
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      child: {
        childId: child.childId,
        childName: child.childName,
        setupDate: child.setupDate,
        lastActive: child.lastActive
      },
      stats: {
        todayCount,
        totalBlocked: await BlockedSite.countDocuments({ childId }),
        categoryBreakdown: categoryStats
      },
      recentBlocks,
      customBlocklist: child.customBlocklist,
      customAllowlist: child.customAllowlist,
      settings: child.settings
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/parent/blocklist/add - Add domain to blocklist
// ═══════════════════════════════════════════════════════════════

router.post('/blocklist/add', async (req, res) => {
  try {
    const { childId, domain, category, reason } = req.body;
    
    const child = await Child.findOne({ childId });
    
    if (!child) {
      return res.status(404).json({
        error: 'Child not found'
      });
    }
    
    // Check if already in blocklist
    const exists = child.customBlocklist.find(item => item.domain === domain);
    
    if (exists) {
      return res.status(400).json({
        error: 'Domain already in blocklist'
      });
    }
    
    child.customBlocklist.push({
      domain,
      category: category || 'Other',
      reason: reason || 'Parent blocked',
      addedAt: new Date()
    });
    
    await child.save();
    
    res.json({
      success: true,
      message: 'Domain added to blocklist'
    });
    
  } catch (error) {
    console.error('Error adding to blocklist:', error);
    res.status(500).json({
      error: 'Failed to add domain'
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/parent/allowlist/add - Add domain to allowlist
// ═══════════════════════════════════════════════════════════════

router.post('/allowlist/add', async (req, res) => {
  try {
    const { childId, domain, reason } = req.body;
    
    const child = await Child.findOne({ childId });
    
    if (!child) {
      return res.status(404).json({
        error: 'Child not found'
      });
    }
    
    child.customAllowlist.push({
      domain,
      reason: reason || 'Parent approved',
      addedAt: new Date()
    });
    
    await child.save();
    
    res.json({
      success: true,
      message: 'Domain added to allowlist'
    });
    
  } catch (error) {
    console.error('Error adding to allowlist:', error);
    res.status(500).json({
      error: 'Failed to add domain'
    });
  }
});

module.exports = router;
