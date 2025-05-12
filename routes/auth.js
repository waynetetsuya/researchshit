// routes/auth.js
const express = require('express');
const router  = express.Router();

const authController      = require('../controllers/authController');
const hrController        = require('../controllers/hrController');
const deanController      = require('../controllers/deanController');
const professorController = require('../controllers/profController');  // ← added

const {
  isAuthenticated,
  isAdmin,
  authorizeRoles
} = require('../middleware/authMiddleware');
const bcrypt = require('bcrypt');

// AUTH ROUTES
router.get('/login',  authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/logout', authController.getLogout);

// Admin Settings
router.get(
  '/ADMINISTRATOR/settings',
  isAuthenticated, isAdmin,
  authController.getAdminSettingsPage
);
router.post(
  '/ADMINISTRATOR/settings',
  isAuthenticated, authorizeRoles(['admin']),
  authController.AdminPostUpdateSettings
);
router.post(
  '/settings',
  isAuthenticated, authorizeRoles(['admin']),
  authController.AdminPostUpdateSettings
);

// Admin Routes
router.get(
  '/accounts',
  isAuthenticated, isAdmin,
  authController.getAccounts
);
router.get(
  '/ADMINISTRATOR/register',
  isAuthenticated, isAdmin,
  authController.getRegister
);
router.post(
  '/ADMINISTRATOR/register',
  isAuthenticated, isAdmin,
  authController.postRegister
);
router.get(
  '/ADMINISTRATOR/remove',
  isAuthenticated, isAdmin,
  authController.getRemovePage
);
router.post(
  '/ADMINISTRATOR/remove',
  isAuthenticated, isAdmin,
  authController.postRemoveUser
);
router.get(
  '/professors',
  isAuthenticated, isAdmin,
  authController.getProfessorsPage
);
router.get(
  '/notifications',
  isAuthenticated, isAdmin,
  authController.getNotifications
);
router.get(
  '/ADMINISTRATOR/viewprofile',
  isAuthenticated, isAdmin,
  authController.getViewProfile
);
router.get(
  '/settings',
  isAuthenticated, isAdmin,
  authController.getAdminSettingsPage
);

// Enable/Disable Accounts
router.get(
  '/ADMINISTRATOR/disable',
  isAuthenticated, isAdmin,
  authController.getAdminDisablePage
);
router.post(
  '/ADMINISTRATOR/disable',
  isAuthenticated, isAdmin,
  authController.postAdminToggleUser
);

// Universal Dashboard Redirect
router.get(
  '/dashboard',
  isAuthenticated,
  (req, res) => {
    if (!req.session.user?.role) return res.redirect('/login');
    res.redirect(`/dashboard/${req.session.user.role}`);
  }
);

// Role-based Dashboards

// Admin Dashboard
router.get(
  '/dashboard/admin',
  isAuthenticated, authorizeRoles(['admin']),
  (req, res) => {
    res.render('ADMINISTRATOR/admin', { user: req.session.user });
  }
);

// HR Dashboard
router.get(
  '/dashboard/hr',
  isAuthenticated, authorizeRoles(['hr']),
  hrController.getHRDashboard
);

// Professor Dashboard (wired to your controller)
router.get(
  '/dashboard/professor',
  isAuthenticated,
  authorizeRoles(['professor']),
  professorController.getProfessorDashboard
);

// Dean Dashboard
router.get(
  '/dashboard/dean',
  isAuthenticated, authorizeRoles(['dean']),
  deanController.getDeanDashboard
);

module.exports = router;
