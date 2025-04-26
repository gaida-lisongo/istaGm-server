const memjs = require('memjs');
require('dotenv').config();

// Create Memcached client
const memcached = memjs.Client.create(process.env.MEMCACHED_HOST, {
  username: process.env.MEMCACHED_USER,
  password: process.env.MEMCACHED_PASSWORD
});

// Test Memcached connection
async function testConnection() {
  try {
    await memcached.set('test', 'connected', { expires: 60 });
    const { value } = await memcached.get('test');
    console.log('Memcached connection successful');
    return true;
  } catch (error) {
    console.error('Memcached connection error:', error);
    return false;
  }
}

// Cache middleware for Express routes
function cacheMiddleware(duration) {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    
    memcached.get(key, (err, val) => {
      if (err) return next();
      
      if (val) {
        try {
          const cachedBody = val.toString();
          res.send(JSON.parse(cachedBody));
          return;
        } catch (e) {
          return next();
        }
      } else {
        res.sendResponse = res.send;
        res.send = (body) => {
          if (typeof body === 'object') {
            memcached.set(key, JSON.stringify(body), { expires: duration }, (err) => {
              if (err) console.error('Memcache set error:', err);
            });
          }
          res.sendResponse(body);
        };
        next();
      }
    });
  };
}

// Helper functions for cache operations
const cacheHelpers = {
  // Set a value in cache
  set: async (key, value, expiresInSeconds = 60) => {
    return new Promise((resolve, reject) => {
      memcached.set(key, JSON.stringify(value), { expires: expiresInSeconds }, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  },
  
  // Get a value from cache
  get: async (key) => {
    return new Promise((resolve, reject) => {
      memcached.get(key, (err, val) => {
        if (err) reject(err);
        else {
          if (val) {
            try {
              resolve(JSON.parse(val.toString()));
            } catch (e) {
              resolve(val.toString());
            }
          } else {
            resolve(null);
          }
        }
      });
    });
  },
  
  // Delete a key from cache
  delete: async (key) => {
    return new Promise((resolve, reject) => {
      memcached.delete(key, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }
};

// Close connection when needed
function close() {
  memcached.close();
  console.log('Memcached connection closed');
}

module.exports = {
  memcached,
  testConnection,
  cacheMiddleware,
  cache: cacheHelpers,
  close
};