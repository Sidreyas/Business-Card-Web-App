// Check username route for Express
// backend/routes/check-username-express.js

const { checkUsernameExists, createUser } = require('../lib/database');

// GET: Check if username exists
async function checkUsernameGet(req, res) {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const exists = await checkUsernameExists(username);
    
    return res.status(200).json({ 
      exists,
      username: username,
      success: true 
    });

  } catch (error) {
    console.error('Error checking username:', error);
    return res.status(500).json({ 
      error: 'Failed to check username availability',
      details: error.message 
    });
  }
}

// POST: Create new username
async function checkUsernamePost(req, res) {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Validate username format
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be 3-50 characters long' });
    }

    const validUsername = /^[a-zA-Z0-9_-]+$/.test(username);
    if (!validUsername) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscore, and hyphen' });
    }

    // Check if username already exists
    const exists = await checkUsernameExists(username);
    if (exists) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Create the user
    const user = await createUser(username);
    
    return res.status(201).json({ 
      success: true,
      user: user,
      message: 'Username created successfully' 
    });

  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username is already taken' });
    }
    
    return res.status(500).json({ 
      error: 'Failed to create user',
      details: error.message 
    });
  }
}

module.exports = { checkUsernameGet, checkUsernamePost };
