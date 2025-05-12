// routes/prof.js
const express = require('express');
const router  = express.Router();

// assume you already have middleware that populates req.user & req.professor
router.get('/dashboard', (req, res) => {
  res.render('professor', {
    user:      req.user,
    professor: req.professor,
    // no `attendance` or `logs` passed here
  });
});

module.exports = router;