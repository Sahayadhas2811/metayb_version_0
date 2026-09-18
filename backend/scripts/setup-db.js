const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('Database schema created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
