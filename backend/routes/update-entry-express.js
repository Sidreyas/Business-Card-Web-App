// Update entry route for Express
// backend/routes/update-entry-express.js

const { updateBusinessCardEntry, getBusinessCardEntry } = require('../lib/database');

async function updateEntryHandler(req, res) {
  try {
    const { id, user_comment, ...otherUpdates } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Entry ID is required' });
    }

    // Check if entry exists
    const existingEntry = await getBusinessCardEntry(id);
    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Prepare updates
    const updates = {};
    if (user_comment !== undefined) {
      updates.user_comment = user_comment;
    }

    // Add other allowed updates
    Object.keys(otherUpdates).forEach(key => {
      if (['name', 'title', 'company', 'email', 'phone', 'website', 'address'].includes(key)) {
        updates[key] = otherUpdates[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    // Update the entry
    const updatedEntry = await updateBusinessCardEntry(id, updates);

    return res.status(200).json({
      success: true,
      entry: updatedEntry,
      message: 'Entry updated successfully'
    });

  } catch (error) {
    console.error('Update entry error:', error);
    return res.status(500).json({
      error: 'Failed to update entry',
      details: error.message,
      success: false
    });
  }
}

module.exports = updateEntryHandler;
