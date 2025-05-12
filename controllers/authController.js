// controllers/authController.js
const bcrypt = require('bcrypt');
const pool = require('../db');

// Login Page
exports.getLogin = (req, res) => {
  const error = req.flash('error');
  res.render('login', { error });
};

// Handle Login
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error', 'Please provide both email/username and password');
    return res.redirect('/login');
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [email]
    );

    if (result.rows.length === 0) {
      req.flash('error', 'No account found with this email or username');
      return res.redirect('/login');
    }

    const user = result.rows[0];

    // Check if the account is disabled
    if (user.status !== 'active') {
      req.flash('error', '⚠️ Your account has been disabled. Please contact an administrator.');
      return res.redirect('/login');
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      req.flash('error', 'Incorrect Credentials');
      return res.redirect('/login');
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    res.redirect('/dashboard');
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).send('Server error');
  }
};

// Handle Logout
exports.getLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error destroying session:', err);
      return res.redirect('/dashboard');
    }

    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
};

// View Accounts (Admin)
exports.getAccounts = async (req, res) => {
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

    const usersResult = await pool.query(`
      SELECT username, firstname, lastname, role, email, status
      FROM users
      ORDER BY id
    `);

    const users = usersResult.rows;

    res.render('ADMINISTRATOR/accounts', {
      user: req.session.user,
      users,
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
    console.error('❌ Error fetching account stats:', error.message);
    res.status(500).send('Server error');
  }
};

// Other controller functions like getRemovePage, postRemoveUser, getProfessorsPage, etc. go here...

// GET /ADMINISTRATOR/remove (View Users for Removal)
exports.getRemovePage = async (req, res) => {
  try {
    const usersResult = await pool.query(`
      SELECT username, firstname, lastname, role, email, status
      FROM users
      ORDER BY id
    `);

    const users = usersResult.rows;
    const successMessage = req.session.success;
    const messageType = req.session.messageType;

    delete req.session.success;
    delete req.session.messageType;

    res.render('ADMINISTRATOR/remove', {
      user: req.session.user,
      users,
      currentPage: 1,
      successMessage,
      messageType // Pass this to your view
    });
  } catch (error) {
    console.error('❌ Error loading remove page:', error.message);
    res.status(500).send('Server Error');
  }
};

// POST /ADMINISTRATOR/remove (Delete User)
exports.postRemoveUser = async (req, res) => {
  try {
    const { username } = req.body;
    const currentUser = req.session.user.username;

    if (username === currentUser) {
      req.session.success = "⚠️ You cannot delete your own account.";
      req.session.messageType = "warning"; // For SweetAlert2 icon
      return res.redirect('/ADMINISTRATOR/remove');
    }

    await pool.query('DELETE FROM users WHERE username = $1', [username]);

    console.log(`✅ User ${username} deleted successfully.`);
    req.session.success = `User ${username} has been deleted successfully.`;
    req.session.messageType = "success";

    res.redirect('/ADMINISTRATOR/remove');
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    res.status(500).send('Server Error');
  }
};

// GET /ADMINISTRATOR/professors (View Professors)
exports.getProfessorsPage = async (req, res) => {
  try {
    // 1️⃣ Counts by role (for dashboard stats)
    const roleCounts = await pool.query('SELECT role, COUNT(*) FROM users GROUP BY role');
    let totalAdmins = 0, totalHRs = 0, totalDeans = 0, totalProfessors = 0;
    roleCounts.rows.forEach(row => {
      if (row.role === 'admin')     totalAdmins     = parseInt(row.count, 10);
      if (row.role === 'hr')        totalHRs        = parseInt(row.count, 10);
      if (row.role === 'dean')      totalDeans      = parseInt(row.count, 10);
      if (row.role === 'professor') totalProfessors = parseInt(row.count, 10);
    });

    // 2️⃣ Total accounts
    const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalAccounts    = parseInt(totalUsersResult.rows[0].count, 10);

    // 3️⃣ Fetch professors **including** their username
    const professorsResult = await pool.query(`
      SELECT username, firstname, lastname, email, status
      FROM users
      WHERE role = 'professor'
      ORDER BY id
    `);
    const users = professorsResult.rows;

    // 4️⃣ Render
    res.render('ADMINISTRATOR/professors', {
      user: req.session.user,
      users,
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
    console.error('❌ Error fetching professor stats (Admin):', error.message);
    res.status(500).send('Server error');
  }
};


// GET /notifications (View Notifications)
exports.getNotifications = (req, res) => {
  const notifications = [
    {
      items: [
        { type: "success", text: "Mr. Sebastian successfully reached their respective room.", subtext: null },
        { type: "warning", text: "Mr. Sebastian has been stationary for too long.", subtext: "Move to avoid being marked absent." },
        { type: "danger", text: "Mr. Sebastian disconnected from the server.", subtext: null }
      ]
    },
    {
      items: [
        { type: "success", text: "Mr. Immaculate has successfully logged in at Room 205.", subtext: null },
        { type: "warning", text: "Mr. Immaculate has been inactive for 10 minutes", subtext: null },
        { type: "danger", text: "Mr. Immaculate has left room 205 at 10:11am.", subtext: null }
      ]
    }
  ];

  res.render('ADMINISTRATOR/notifications', {
    notifications,
    user: req.session.user
  });
};

// GET /viewprofile (View Admin Profile)
exports.getViewProfile = async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
    const user = userResult.rows[0];

    res.render('ADMINISTRATOR/viewprofile', {
      user: req.session.user,
      profile: user
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error.message);
    res.status(500).send('Server error');
  }
};

// GET Register Page
exports.getRegister = async (req, res) => {
  try {
    const subjectResult = await pool.query(
      'SELECT id, subject_name, schedule_time FROM subjects ORDER BY subject_name ASC'
    );

    const successMessage = req.session.success;
    const errorMessage = req.session.error;
    delete req.session.success;
    delete req.session.error;

    res.render('ADMINISTRATOR/register', {
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

// POST Register Page
exports.postRegister = async (req, res) => {
  const { username, password, role, firstname, lastname, email, subject_id } = req.body;

  if (!['admin', 'hr', 'dean', 'professor'].includes(role)) {
    req.session.error = 'Invalid role selected.';
    return res.redirect('/ADMINISTRATOR/register');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users 
        (username, password, role, firstname, lastname, email, subject_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [username, hashedPassword, role, firstname, lastname, email, subject_id || null]
    );
    req.session.success = 'User added successfully!';
    res.redirect('/ADMINISTRATOR/register'); // redirect back to register page after success
  } catch (err) {
    console.error('❌ Error creating user:', err.message);

    if (err.code === '23505') {
      req.session.error = 'Username or email already exists.';
    } else {
      req.session.error = 'Error creating user.';
    }

    res.redirect('/ADMINISTRATOR/register'); // redirect back to register page after error
  }
};

// GET /ADMINISTRATOR/disable
exports.getAdminDisablePage = async (req, res) => {
  try {
    // Fetch all users (you can add WHERE role <> 'admin' if you want to exclude admins)
    const usersResult = await pool.query(`
      SELECT username, firstname, lastname, role, email, status
      FROM users
      ORDER BY id
    `);
    const users = usersResult.rows;

    const successMessage = req.session.success;
    const messageType   = req.session.messageType;
    delete req.session.success;
    delete req.session.messageType;

    res.render('ADMINISTRATOR/disable', {
      user: req.session.user,
      users,
      currentPage: 1,
      successMessage,
      messageType
    });
  } catch (error) {
    console.error('❌ Error loading admin disable page:', error);
    res.status(500).send('Server Error');
  }
};


exports.getAdminSettingsPage = (req, res) => {
  res.render('ADMINISTRATOR/settings', { user: req.session.user });
};

// POST /ADMINISTRATOR/disable
exports.postAdminToggleUser = async (req, res) => {
  try {
    const { username, action } = req.body;
    const currentUser = req.session.user.username;

    // Prevent self-disable/enable
    if (username === currentUser) {
      req.session.success     = "⚠️ You cannot change your own status.";
      req.session.messageType = "warning";
      return res.redirect('/ADMINISTRATOR/disable');
    }

    // Look up current status
    const { rows } = await pool.query(
      `SELECT status FROM users WHERE username = $1`,
      [username]
    );
    if (!rows.length) {
      req.session.success     = `User ${username} not found.`;
      req.session.messageType = "error";
      return res.redirect('/ADMINISTRATOR/disable');
    }

    const currentStatus = rows[0].status;
    let newStatus, verb;

    if (action === 'disable') {
      if (currentStatus !== 'active') {
        req.session.success     = `User ${username} is already inactive.`;
        req.session.messageType = "warning";
        return res.redirect('/ADMINISTRATOR/disable');
      }
      newStatus = 'inactive';
      verb = 'disabled';
    } else if (action === 'enable') {
      if (currentStatus !== 'inactive') {
        req.session.success     = `User ${username} is already active.`;
        req.session.messageType = "warning";
        return res.redirect('/ADMINISTRATOR/disable');
      }
      newStatus = 'active';
      verb = 'enabled';
    } else {
      // unknown action
      req.session.success     = `Unknown action.`;
      req.session.messageType = "error";
      return res.redirect('/ADMINISTRATOR/disable');
    }

    // Perform the update
    await pool.query(
      `UPDATE users
         SET status = $1
       WHERE username = $2`,
      [newStatus, username]
    );

    req.session.success     = `User ${username} has been ${verb} successfully.`;
    req.session.messageType = "success";
    res.redirect('/ADMINISTRATOR/disable');

  } catch (error) {
    console.error('❌ Error toggling user status:', error);
    res.status(500).send('Server Error');
  }
};

exports.getAdminSettingsPage = (req, res) => {
  const success = req.session.success;
  delete req.session.success;

  res.render('ADMINISTRATOR/settings', {
    user: req.session.user,
    success
  });
};


exports.getViewProfile = async (req, res) => {
  try {
    // Get username from query params
    const username = req.query.user;
    if (!username) return res.status(400).send('Missing username');

    const result = await pool.query(`
      SELECT u.*, s.subject_name, s.schedule_time
      FROM users u
      LEFT JOIN subjects s ON u.subject_id = s.id
      WHERE u.username = $1
    `, [username]);

    if (result.rows.length === 0) {
      return res.status(404).send('Professor not found');
    }

    const professor = result.rows[0];

    // Mock attendance history (replace with real query later)
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

    // Set default values for the demo
    professor.room = '301';
    professor.checkInTime = '8:00 A.M.';
    professor.checkOutTime = '12:30 P.M.';

    // Render the correct view based on user role
    const viewTemplate = req.session.user.role === 'admin' 
      ? 'ADMINISTRATOR/viewprofile' 
      : 'hr/hrviewprofile';

    res.render(viewTemplate, {
      user: req.session.user,
      professor,
      attendanceHistory
    });

  } catch (error) {
    console.error('❌ Error fetching profile:', error.message);
    res.status(500).send('Server error');
  }
};


exports.AdminPostUpdateSettings = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const currentUsername = req.session.user.username;

    const newUsername = username.trim();

    // 1. Check if username is already taken
    const duplicate = await pool.query(
      'SELECT username FROM users WHERE username = $1 AND username != $2',
      [newUsername, currentUsername]
    );
    if (duplicate.rows.length > 0) {
      req.session.success = '⚠️ Username is already taken.';
      return res.redirect('/ADMINISTRATOR/settings');
    }

    // 2. Get current password from DB
    const result = await pool.query(
      'SELECT password FROM users WHERE username = $1',
      [currentUsername]
    );
    const currentHashedPassword = result.rows[0].password;

    let query, values;

    // 3. If a password is provided, check if it's different
    if (password && password.trim() !== '') {
      const isSame = await bcrypt.compare(password, currentHashedPassword);
      if (isSame) {
        req.session.success = '⚠️ New password must be different from current password.';
        return res.redirect('/ADMINISTRATOR/settings');
      }

      const newHashedPassword = await bcrypt.hash(password, 10);
      query = `UPDATE users SET username = $1, email = $2, password = $3 WHERE username = $4`;
      values = [newUsername, email, newHashedPassword, currentUsername];
    } else {
      query = `UPDATE users SET username = $1, email = $2 WHERE username = $3`;
      values = [newUsername, email, currentUsername];
    }

    await pool.query(query, values);

    // 4. Update session
    req.session.user.username = newUsername;
    req.session.user.email = email;

    req.session.success = '✅ Settings updated successfully!';
    res.redirect('/ADMINISTRATOR/settings');

  } catch (error) {
    console.error('❌ Error updating admin settings:', error.message);
    res.status(500).send('Error updating settings');
  }
};






// const isAuthenticated = (req, res, next) => {
//   if (req.session.user) {
//     return next();
//   }
//   res.redirect('/login');
// };

// const isAdmin = (req, res, next) => {
//   if (req.session.user && req.session.user.role === 'admin') {
//     return next();
//   }
//   res.redirect('/login');
// };
