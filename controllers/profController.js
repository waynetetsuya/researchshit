// controllers/profController.js
// No more need for 'pool' or Postgres queries here

// Middleware to ensure only professors can view
function isProfessor(req, res, next) {
  if (req.session.user && req.session.user.role === 'professor') {
    return next();
  }
  req.flash('error', 'Access denied. Professors only.');
  return res.redirect('/login');
}

// GET /professor/dashboard
function getProfessorDashboard(req, res) {
  // We just pass the user; the page will fetch live/checkin‐checkout
  // and today's history on the client side.
  return res.render('professors/professor', {
    user: req.session.user
  });
}

module.exports = {
  isProfessor,
  getProfessorDashboard
};
