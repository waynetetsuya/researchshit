// authMiddleware.js

const pool = require('../db');    // adjust path to your DB pool
// Middleware to check if user is authenticated AND still active
async function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    // not even logged in
    return res.redirect('/login');
  }

  try {
    // re-fetch current status from DB
    const result = await pool.query(
      'SELECT status FROM users WHERE username = $1',
      [req.session.user.username]
    );
    const status = result.rows[0]?.status;

    if (status !== 'active') {
      // user was disabled in the meantime
      req.session.destroy(() => {});
      return res.redirect('/login');
    }

    // optionally keep session.user.status in sync
    req.session.user.status = status;
    return next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err);
    req.session.destroy(() => {});
    return res.redirect('/login');
  }
}

// Middleware to authorize specific roles
function authorizeRoles(roles) {
  return (req, res, next) => {
    if (req.session.user && roles.includes(req.session.user.role)) {
      return next();
    }
    return res.status(403).send('Access Denied');
  };
}

// Individual middleware for specific roles
const isAdmin = authorizeRoles(['admin']);
const isProfessor = authorizeRoles(['professor']);
const isHR = authorizeRoles(['hr']);
const isDean = authorizeRoles(['dean']);

module.exports = {
  isAuthenticated,
  authorizeRoles,
  isAdmin,
  isProfessor,
  isHR,
  isDean
};
