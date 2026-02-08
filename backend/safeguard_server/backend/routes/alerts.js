// ╔═══════════════════════════════════════════════════════════════╗
// ║  API ROUTE - ALERTS & LOGGING                                 ║
// ║  Handles blocked site logging and alerts                      ║
// ╚═══════════════════════════════════════════════════════════════╝

const express = require('express');
const router = express.Router();
const BlockedSite = require('../models/BlockedSite');
const emailService = require('../services/emailService');
const esp32Service = require('../services/esp32Service');

// ═══════════════════════════════════════════════════════════════
// POST /api/alerts/blocked - Log blocked site attempt
// ═══════════════════════════════════════════════════════════════

router.post('/blocked', async (req, res) => {
  try {
    const { 
      childId, 
      childName, 
      parentEmail, 
      url, 
      category, 
      timestamp,
      action 
    } = req.body;
    
    // Validate required fields
    if (!childId || !url || !category) {
      return res.status(400).json({
        error: 'Missing required fields: childId, url, category'
      });
    }
    
    // Extract domain from URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Save to database
    const blockedSite = new BlockedSite({
      childId,
      childName,
      parentEmail,
      url,
      domain,
      category,
      action: action || 'BLOCKED',
      timestamp: timestamp || new Date(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
    
    await blockedSite.save();
    
    console.log(`[Alert] Blocked site logged: ${domain} (${category}) - Child: ${childName}`);
    
    // Send email notification (async, don't wait)
    if (parentEmail) {
      emailService.sendBlockedSiteAlert({
        parentEmail,
        childName,
        url: domain,
        category,
        timestamp: blockedSite.timestamp
      }).then(() => {
        blockedSite.emailSent = true;
        blockedSite.save();
      }).catch(err => {
        console.error('Email notification failed:', err.message);
      });
    }
    
    // Trigger ESP32 alert (async, don't wait)
    if (process.env.ESP32_ENABLED === 'true') {
      esp32Service.triggerAlert({
        category,
        childName,
        timestamp: blockedSite.timestamp
      }).then(() => {
        blockedSite.esp32Triggered = true;
        blockedSite.save();
      }).catch(err => {
        console.error('ESP32 alert failed:', err.message);
      });
    }
    
    res.json({
      success: true,
      message: 'Alert logged successfully',
      alertId: blockedSite._id
    });
    
  } catch (error) {
    console.error('Error logging blocked site:', error);
    res.status(500).json({
      error: 'Failed to log alert',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/alerts/count - Get blocked count
// ═══════════════════════════════════════════════════════════════

router.get('/count', async (req, res) => {
  try {
    const { childId, date } = req.query;
    
    let query = {};
    
    if (childId) {
      query.childId = childId;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.timestamp = {
        $gte: startDate,
        $lt: endDate
      };
    }
    
    const count = await BlockedSite.countDocuments(query);
    
    res.json({ count });
    
  } catch (error) {
    console.error('Error counting alerts:', error);
    res.status(500).json({
      error: 'Failed to count alerts',
      count: 0
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/alerts/recent - Get recent blocked sites
// ═══════════════════════════════════════════════════════════════

router.get('/recent', async (req, res) => {
  try {
    const { childId, limit = 20 } = req.query;
    
    const query = childId ? { childId } : {};
    
    const recentBlocks = await BlockedSite
      .find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('-__v');
    
    res.json({
      count: recentBlocks.length,
      alerts: recentBlocks
    });
    
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    res.status(500).json({
      error: 'Failed to fetch recent alerts',
      alerts: []
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/alerts/stats - Get statistics
// ═══════════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const { childId, startDate, endDate } = req.query;
    
    let query = {};
    
    if (childId) {
      query.childId = childId;
    }
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Category breakdown
    const categoryStats = await BlockedSite.aggregate([
      { $match: query },
      { 
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Daily trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyTrend = await BlockedSite.aggregate([
      { 
        $match: { 
          ...query,
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Total count
    const totalBlocked = await BlockedSite.countDocuments(query);
    
    res.json({
      totalBlocked,
      categoryStats,
      dailyTrend
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;
