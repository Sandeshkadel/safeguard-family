// ╔═══════════════════════════════════════════════════════════════╗
// ║  API ROUTE - URL CLASSIFICATION                               ║
// ║  Checks if a URL should be blocked                            ║
// ╚═══════════════════════════════════════════════════════════════╝

const express = require('express');
const router = express.Router();
const urlClassifier = require('../services/urlClassifier');

// ═══════════════════════════════════════════════════════════════
// POST /api/classify - Classify URL
// ═══════════════════════════════════════════════════════════════

router.post('/', async (req, res) => {
  try {
    const { url, childId } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }
    
    // Classify the URL
    const result = await urlClassifier.classifyUrl(url, childId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({
      error: 'Classification failed',
      blocked: false // Fail-safe: don't block on error
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/blocklist/:childId - Get blocklist for child
// ═══════════════════════════════════════════════════════════════

router.get('/blocklist/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    
    const Child = require('../models/Child');
    const child = await Child.findOne({ childId });
    
    if (!child) {
      return res.json({
        blocklist: []
      });
    }
    
    // Return custom blocklist + default blocked categories
    const blocklist = [
      ...child.customBlocklist.map(item => ({
        domain: item.domain,
        category: item.category
      }))
    ];
    
    res.json({
      blocklist,
      settings: child.settings
    });
    
  } catch (error) {
    console.error('Error fetching blocklist:', error);
    res.status(500).json({
      error: 'Failed to fetch blocklist',
      blocklist: []
    });
  }
});

module.exports = router;
