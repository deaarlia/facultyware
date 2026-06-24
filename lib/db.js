const mysql = require('mysql2/promise');
require('dotenv').config();

let connection;

async function getConnection() {
  if (connection) {
    try {
      await connection.ping();
      return connection;
    } catch {
      connection = null;
    }
  }

  connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    
  });

  return connection;
}

module.exports = { getConnection };