// routes/dean.js
const express = require('express');
const router  = express.Router();
const {
  isAuthenticated,
  authorizeRoles
} = require('../middleware/authMiddleware');
const deanController = require('../controllers/deanController');

// Dean dashboard
router.get(
  '/dashboard/dean',
  isAuthenticated,
  authorizeRoles(['dean']),
  deanController.getDeanDashboard
);

module.exports = router;
