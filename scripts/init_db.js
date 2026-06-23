const { getConnection } = require('../lib/db');
const bcrypt = require('bcryptjs');

async function init() {
  try {
    const db = await getConnection();
    const adminEmail = 'admin@unand.ac.id';
    const plainPassword = 'password';
    
    console.log('Generating fresh bcrypt hash natively in Node...');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 1. Clear out any old or corrupted entry with this email to prevent duplicate key errors
    await db.query('DELETE FROM users WHERE email = ?', [adminEmail]);

    // 2. Insert into the existing table using only the columns we need to fill
    // MySQL will automatically set the extra Laravel columns to NULL
    await db.query(
      'INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', 
      ['admin', adminEmail, hashedPassword]
    );
    
    console.log('Database operation completed successfully.');
    console.log('Email registered: ' + adminEmail);

    process.exit(0);
  } catch (err) {
    console.error('Error seeding user:', err);
    process.exit(1);
  }
}

init();