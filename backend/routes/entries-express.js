// Entries route for Express
// backend/routes/entries-express.js

const { getBusinessCardEntries, getAllBusinessCardEntries, getUserStats } = require('../lib/database');

async function entriesHandler(req, res) {
  try {
    const { userName, limit = 50, offset = 0, includeStats = false } = req.query;

    let entries;
    let stats = null;

    if (userName) {
      // Get entries for specific user
      entries = await getBusinessCardEntries(userName, parseInt(limit), parseInt(offset));
      
      if (includeStats === 'true') {
        stats = await getUserStats(userName);
      }
    } else {
      // Get all entries (admin view)
      entries = await getAllBusinessCardEntries(parseInt(limit), parseInt(offset));
    }

    const response = {
      success: true,
      entries: entries,
      count: entries.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (stats) {
      response.stats = stats;
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Get entries error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve entries',
      details: error.message,
      success: false
    });
  }
}

module.exports = entriesHandler;
