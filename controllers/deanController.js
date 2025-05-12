// controllers/deanController.js
const bcrypt = require('bcrypt');
const pool   = require('../db');

// ✅ Middleware: Only allow Dean
exports.isDean = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'dean') {
    return next();
  }
  return res.redirect('/login');
};

// ✅ GET: Dean Dashboard
exports.getDeanDashboard = async (req, res) => {
  try {
    // ← no department filter, just count all professors
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count
         FROM users
        WHERE role = 'professor'`
    );
    const professorCount = parseInt(rows[0].count, 10);

    // mocked attendance stats
    const attendanceTodayCount = 12;
    const attendanceRate       = '85%';
    const recentAttendance     = [
      { professor: 'John Doe', date: '2025-05-03', timeIn: '8:00 AM', status: 'On Time' },
      { professor: 'Jane Smith', date: '2025-05-03', timeIn: '8:30 AM', status: 'Late' }
    ];

    res.render('dean/dean', {
      user: req.session.user,
      professorCount,
      attendanceTodayCount,
      attendanceRate,
      recentAttendance
    });
  } catch (err) {
    console.error('❌ Dean Dashboard Error:', err.message);
    res.status(500).send('Server Error');
  }
};

// ✅ GET: Professors (all)
exports.getDepartmentProfessors = async (req, res) => {
  try {
    // ← no department filter
    const result = await pool.query(
      `SELECT username, firstname, lastname, email
         FROM users
        WHERE role = 'professor'
        ORDER BY lastname, firstname`
    );
    res.render('dean/professors', {
      title: 'Professors',
      user: req.session.user,
      professors: result.rows
    });
  } catch (err) {
    console.error('❌ Error fetching professors:', err.message);
    res.status(500).send('Server Error');
  }
};

// ✅ GET: Department Reports
exports.getDepartmentReports = (req, res) => {
  res.render('dean/reports', {
    title: 'Department Reports',
    user: req.session.user
  });
};

// ✅ GET: Dean Profile
exports.getViewProfile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [req.session.user.id]
    );
    if (!rows.length) return res.status(404).send('Dean not found');
    res.render('dean/profile', {
      title: 'My Profile',
      user: rows[0]
    });
  } catch (err) {
    console.error('❌ Error fetching profile:', err.message);
    res.status(500).send('Server Error');
  }
};

// ✅ GET: Settings Page
exports.getSettingsPage = (req, res) => {
  const success = req.session.success;
  delete req.session.success;
  res.render('dean/settings', {
    title: 'Dean Settings',
    user: req.session.user,
    success
  });
};

// ✅ POST: Update Settings
exports.postUpdateSettings = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const currentUsername = req.session.user.username;
    const newUsername     = username.trim();

    // 1) duplicate username check
    const dup = await pool.query(
      'SELECT 1 FROM users WHERE username = $1 AND username != $2',
      [newUsername, currentUsername]
    );
    if (dup.rows.length) {
      req.session.success = '⚠️ Username already taken';
      return res.redirect('/dean/settings');
    }

    // 2) fetch current hash
    const { rows } = await pool.query(
      'SELECT password FROM users WHERE username = $1',
      [currentUsername]
    );
    const currentHash = rows[0].password;

    let query, values;
    if (password && password.trim()) {
      const isSame = await bcrypt.compare(password, currentHash);
      if (isSame) {
        req.session.success = '⚠️ New password must differ';
        return res.redirect('/dean/settings');
      }
      const hash = await bcrypt.hash(password, 10);
      query  = `UPDATE users SET username = $1, email = $2, password = $3 WHERE username = $4`;
      values = [newUsername, email, hash, currentUsername];
    } else {
      query  = `UPDATE users SET username = $1, email = $2 WHERE username = $3`;
      values = [newUsername, email, currentUsername];
    }

    await pool.query(query, values);

    // sync session
    req.session.user.username = newUsername;
    req.session.user.email    = email;
    req.session.success        = '✅ Settings updated!';
    res.redirect('/dean/settings');

  } catch (err) {
    console.error('❌ Error updating settings:', err.message);
    res.status(500).send('Server Error');
  }
};
