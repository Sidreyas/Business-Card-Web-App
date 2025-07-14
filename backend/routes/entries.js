// Get business card entries API
// /api/entries.js

const { getBusinessCardEntries, getAllBusinessCardEntries, getUserStats } = require('./lib/database');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
