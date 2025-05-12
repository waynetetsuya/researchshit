const bcrypt = require('bcrypt');
const pool = require('./db'); // adjust path as needed

(async () => {
  try {
    const username = 'admin1';
    const rawPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const role = 'admin';
    const firstname = 'Admin';
    const lastname = 'User';
    const email = 'admin@example.com';
    const subjectId = null; // Admin doesn't need a subject
    const status = 'active'; // or any valid status value

    const result = await pool.query(
      `INSERT INTO users 
        (username, password, role, firstname, lastname, email, subject_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [username, hashedPassword, role, firstname, lastname, email, subjectId, status]
    );

    console.log('✅ Admin user created:', result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      console.log('⚠️ User already exists.');
    } else {
      console.error('❌ Error inserting admin:', err.message);
    }
  } finally {
    process.exit();
  }
})();