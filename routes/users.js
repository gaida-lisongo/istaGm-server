const express = require('express');
const router = express.Router();
const { db, cache } = require('../config');
const { authenticateToken } = require('./auth');

// Get all users (cached for 60 seconds)
router.get('/', authenticateToken, cache.cacheMiddleware(60), async (req, res) => {
  try {
    const users = await db.query('SELECT id, username, email, created_at FROM users');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const cacheKey = `user_${userId}`;
    
    // Try to get from cache first
    let user = await cache.cache.get(cacheKey);
    
    if (!user) {
      // Not in cache, get from database
      const users = await db.query('SELECT id, username, email, created_at FROM users WHERE id = ?', [userId]);
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      user = users[0];
      
      // Store in cache for 5 minutes
      await cache.cache.set(cacheKey, user, 300);
    }
    
    res.json(user);
  } catch (error) {
    console.error(`Error fetching user ${req.params.id}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new user
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // In production, hash the password before storing
    const result = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, password]
    );
    
    // Clear users list cache
    await cache.cache.delete('__express__/api/users');
    
    res.status(201).json({ id: result.insertId, username, email });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;