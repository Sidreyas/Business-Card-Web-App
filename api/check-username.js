// Check username availability API
// /api/check-username.js

const { checkUsernameExists, createUser } = require('./lib/database');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Check if username exists
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

  if (req.method === 'POST') {
    // Create new user
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

  return res.status(405).json({ error: 'Method not allowed' });
}
