const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,       
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false     
  }
};

let connection = null;

function handleDisconnect() {
  console.log('Database: Creating single connection...');
  connection = mysql.createConnection(dbConfig);

  connection.connect((err) => {
    if (err) {
      console.error('Database connection error:', err);
      // Retry connection after 2 seconds
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('Database connected successfully.');
    }
  });

  connection.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.fatal) {
      console.log('Database connection lost. Reconnecting...');
      handleDisconnect();
    }
  });
}

// Initialize connection
handleDisconnect();

// Export a proxy object that delegates to the active promise-based connection
const db = {
  query: function(...args) {
    return connection.promise().query(...args);
  },
  execute: function(...args) {
    return connection.promise().execute(...args);
  }
};

module.exports = db;