const bcrypt = require('bcrypt');
const pool = require('../db');

// ✅ Middleware: Check if user is HR only
function isHR(req, res, next) {
  if (req.session.user && req.session.user.role === 'hr') {
    return next();
  }
  req.flash('error', 'Access denied. HR only.');
  return res.redirect('/dashboard');
}

// ✅ GET: HR Dashboard Overview
exports.getHRDashboard = async (req, res) => {
  try {
    // Count all users
    const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalAccounts = parseInt(totalUsersResult.rows[0].count, 10);

    // Count gender only for professors
    const genderCountsResult = await pool.query(`
      SELECT gender, COUNT(*) AS count
      FROM users
      WHERE role = 'professor'
      GROUP BY gender
    `);

    let totalMales = 0;
    let totalFemales = 0;
    genderCountsResult.rows.forEach(row => {
      if (row.gender === 'male')   totalMales = parseInt(row.count, 10);
      if (row.gender === 'female') totalFemales = parseInt(row.count, 10);
    });

    // Total professors
    const totalProfessorsResult = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE role = 'professor'`
    );
    const totalProfessors = parseInt(totalProfessorsResult.rows[0].count, 10);

    // ── FETCH PROFESSOR ACCOUNTS ONLY ──
    const accountsResult = await pool.query(`
      SELECT username, firstname, lastname, email, status
      FROM users
      WHERE role = 'professor'
      ORDER BY lastname, firstname
    `);
    const users = accountsResult.rows;

    // render template, passing in the professor users
    res.render('hr/hr', {
      user: req.session.user,
      totalAccounts,
      totalMales,
      totalFemales,
      totalProfessors,
      users
    });
  } catch (error) {
    console.error('❌ Error loading HR dashboard:', error.message);
    res.status(500).send('Server error');
  }
};

exports.getSettingsPage = (req, res) => {
  const success = req.session.success;
  delete req.session.success;

  res.render('hr/hrsettings', {
    user: req.session.user,
    success
  });
};


// ✅ POST: HR update settings

exports.HRpostUpdateSettings = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const currentUsername = req.session.user.username;
    const newUsername = username.trim();

    // Check for duplicate username
    const duplicate = await pool.query(
      'SELECT username FROM users WHERE username = $1 AND username != $2',
      [newUsername, currentUsername]
    );
    if (duplicate.rows.length > 0) {
      req.session.success = '⚠️ Username is already taken.';
      return res.redirect('/hr/settings');
    }

    // Fetch current hashed password
    const result = await pool.query(
      'SELECT password FROM users WHERE username = $1',
      [currentUsername]
    );
    const currentHashedPassword = result.rows[0].password;

    let query, values;

    if (password && password.trim() !== '') {
      // Compare new password with current
      const isSame = await bcrypt.compare(password, currentHashedPassword);
      if (isSame) {
        req.session.success = '⚠️ New password must be different from the current password.';
        return res.redirect('/hr/settings');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        UPDATE users
        SET email = $1, password = $2, username = $3
        WHERE username = $4
      `;
      values = [email, hashedPassword, newUsername, currentUsername];
    } else {
      query = `
        UPDATE users
        SET email = $1, username = $2
        WHERE username = $3
      `;
      values = [email, newUsername, currentUsername];
    }

    await pool.query(query, values);

    // Update session
    req.session.user.username = newUsername;
    req.session.user.email = email;

    req.session.success = '✅ Settings updated successfully!';
    res.redirect('/hr/settings');

  } catch (error) {
    console.error('❌ Error updating settings:', error.message);
    res.status(500).send('Error updating settings');
  }
};





// ✅ GET: HR view professors
exports.getProfessors = async (req, res) => {
  try {
    const roleCounts = await pool.query('SELECT role, COUNT(*) FROM users GROUP BY role');
    let totalAdmins = 0, totalHRs = 0, totalDeans = 0, totalProfessors = 0;

    roleCounts.rows.forEach(row => {
      if (row.role === 'admin') totalAdmins = parseInt(row.count);
      if (row.role === 'hr') totalHRs = parseInt(row.count);
      if (row.role === 'dean') totalDeans = parseInt(row.count);
      if (row.role === 'professor') totalProfessors = parseInt(row.count);
    });

    const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalAccounts = parseInt(totalUsersResult.rows[0].count);

    const professorsResult = await pool.query(`
      SELECT username, firstname, lastname, email
      FROM users
      WHERE role = 'professor'
      ORDER BY id
    `);

    res.render('hr/hrprofessors', {
      user: req.session.user,
      users: professorsResult.rows,
      currentPage: 1,
      totalPages: 1,
      totalUsers: totalAccounts,
      searchTerm: '',
      totalAccounts,
      totalAdmins,
      totalHRs,
      totalDeans,
      totalProfessors
    });
  } catch (error) {
    console.error('❌ Error fetching professor stats (HR):', error.message);
    res.status(500).send('Server error');
  }
};


// GET /viewprofile (View Admin Profile)
exports.getViewProfile = async (req, res) => {
  try {
    // Change this line to get username from query params instead of route params
    const username = req.query.user;
    if (!username) return res.status(400).send('Missing username');

    const result = await pool.query(`
      SELECT u.*, s.subject_name, s.schedule_time
      FROM users u
      LEFT JOIN subjects s ON u.subject_id = s.id
      WHERE u.username = $1
    `, [username]);

    // Rest of your function remains the same
    if (result.rows.length === 0) {
      return res.status(404).send('Professor not found');
    }

    const professor = result.rows[0];

    // 🔁 Mock attendance history (replace with real query later)
    const attendanceHistory = [
      {
        date: "March 20, 2025",
        status: "On Time",
        check_in_time: "8:00 A.M.",
        check_out_time: "12:30 P.M."
      },
      {
        date: "March 19, 2025",
        status: "Late",
        check_in_time: "8:30 A.M.",
        check_out_time: "12:30 P.M."
      },
      {
        date: "March 18, 2025",
        status: "Absent",
        check_in_time: "",
        check_out_time: ""
      }
    ];

    // You can set this for the demo
    professor.room = '301';
    professor.checkInTime = '8:00 A.M.';
    professor.checkOutTime = '12:30 P.M.';

    res.render('hr/hrviewprofile', {
      user: req.session.user,
      professor,
      attendanceHistory
    });

  } catch (error) {
    console.error('❌ Error fetching profile:', error.message);
    res.status(500).send('Server error');
  }
};


// ✅ GET: HR registration page
exports.getRegisterPage = async (req, res) => {
  try {
    const subjectResult = await pool.query(
      'SELECT id, subject_name, schedule_time FROM subjects ORDER BY subject_name ASC'
    );

    const successMessage = req.session.success;
    const errorMessage = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('hr/hrregister', {
      user: req.session.user,
      subjects: subjectResult.rows,
      successMessage,
      errorMessage
    });
  } catch (err) {
    console.error('❌ Failed to fetch subjects:', err.message);
    res.status(500).send('Server error');
  }
};

// ✅ POST: HR register a new professor
exports.postRegisterProfessor = async (req, res) => {
  const { username, password, firstname, lastname, email, subject_id, gender } = req.body;
  const role = 'professor';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users 
        (username, password, role, firstname, lastname, email, subject_id, gender) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [username, hashedPassword, role, firstname, lastname, email, subject_id || null, gender]
    );

    req.session.success = 'Professor added successfully!';
    res.redirect('/HR/register');
  } catch (err) {
    console.error('❌ Error creating professor:', err.message);

    if (err.code === '23505') {
      req.session.error = 'Username or email already exists.';
    } else {
      req.session.error = 'Error creating professor.';
    }

    res.redirect('/HR/register');
  }
};

exports.getDisablePage = async (req, res) => {
  try {
    // Fetch only users with the role 'professor'
    const usersResult = await pool.query(`
      SELECT username, firstname, lastname, role, email, status
      FROM users
      WHERE role = 'professor'
      ORDER BY id
    `);
    const users = usersResult.rows;
    const successMessage = req.session.success;
    const messageType   = req.session.messageType;

    delete req.session.success;
    delete req.session.messageType;

    res.render('hr/hrdisable', {
      user: req.session.user,
      users,
      currentPage: 1,
      successMessage,
      messageType
    });
  } catch (error) {
    console.error('❌ Error loading disable page:', error);
    res.status(500).send('Server Error');
  }
};


// POST /HR/disable
exports.postDisableUser = async (req, res) => {
  try {
    const { username } = req.body;
    const currentUser  = req.session.user.username;

    // Prevent self-disable
    if (username === currentUser) {
      req.session.success     = "⚠️ You cannot disable your own account.";
      req.session.messageType = "warning";
      return res.redirect('/hr/disable');
    }

    // Check current status
    const { rows } = await pool.query(
      `SELECT status FROM users WHERE username = $1`,
      [username]
    );

    if (!rows.length) {
      // No such user
      req.session.success     = `User ${username} not found.`;
      req.session.messageType = "error";
      return res.redirect('/hr/disable');
    }

    const currentStatus = rows[0].status;
    if (currentStatus !== 'active') {
      // Already inactive
      req.session.success     = `User ${username} is already inactive.`;
      req.session.messageType = "warning";
      return res.redirect('/hr/disable');
    }

    // Only disable if currently active
    await pool.query(
      `UPDATE users
         SET status = 'inactive'
       WHERE username = $1`,
      [username]
    );

    req.session.success     = `User ${username} has been disabled successfully.`;
    req.session.messageType = "success";
    res.redirect('/hr/disable');

  } catch (error) {
    console.error('❌ Error disabling user:', error);
    res.status(500).send('Server Error');
  }
};



// Export HR Middleware
exports.isHR = isHR;
