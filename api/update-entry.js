// API endpoint to update business card entries
// /api/update-entry.js

const { updateBusinessCardEntry, getBusinessCardEntry } = require('./lib/database');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,PATCH');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed. Use POST, PUT, or PATCH.' });
  }

  try {
    const { id, user_comment, ...otherUpdates } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Entry ID is required' });
    }

    // Check if entry exists
    const existingEntry = await getBusinessCardEntry(id);
    if (!existingEntry) {
      return res.status(404).json({ error: 'Business card entry not found' });
    }

    // Prepare updates object
    const updates = {};
    if (user_comment !== undefined) {
      updates.user_comment = user_comment;
    }
    
    // Add any other fields that need to be updated
    Object.keys(otherUpdates).forEach(key => {
      if (otherUpdates[key] !== undefined) {
        updates[key] = otherUpdates[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Update the entry
    const updatedEntry = await updateBusinessCardEntry(id, updates);

    return res.status(200).json({
      success: true,
      message: 'Business card entry updated successfully',
      entry: updatedEntry,
      updated_fields: Object.keys(updates)
    });

  } catch (error) {
    console.error('Update entry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update business card entry',
      details: error.message
    });
  }
}
