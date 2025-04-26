const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Convert pool to use promises
const promisePool = pool.promise();

// Test the connection
async function testConnection() {
  try {
    const [rows] = await promisePool.query('SELECT 1');
    console.log('MySQL connection successful');
    return true;
  } catch (error) {
    console.error('MySQL connection error:', error);
    return false;
  }
}

module.exports = {
  pool: promisePool,
  testConnection,
  
  // Helper function for queries
  query: async (sql, params) => {
    try {
      const [rows] = await promisePool.query(sql, params);
      return rows;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }
};