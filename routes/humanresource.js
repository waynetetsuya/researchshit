const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrcontroller');

const { isAuthenticated, authorizeRoles } = require('../middleware/authMiddleware');

// ✅ Middleware: Check if user is HR only
const { isHR } = hrController;

// Routes

// ✅ HR Dashboard home
router.get('/dashboard/hr', isAuthenticated, authorizeRoles(['hr']), hrController.getHRDashboard);
router.get('/professors', isAuthenticated, isHR, hrController.getProfessors);
router.get('/register', isAuthenticated, authorizeRoles(['hr']), hrController.getRegisterPage);
router.post('/register', isAuthenticated, authorizeRoles(['hr']), hrController.postRegisterProfessor);
router.get('/viewprofile', isAuthenticated, isHR, hrController.getViewProfile);
router.get(
  '/settings',
  isAuthenticated,
  authorizeRoles(['hr']),
  hrController.getSettingsPage
);
router.post(
  '/settings',
  isAuthenticated,
  authorizeRoles(['hr']),
  hrController.HRpostUpdateSettings
);
router.get('/hr/dashboard', isAuthenticated, authorizeRoles(['hr']), hrController.getHRDashboard);

router.get('/hr/settings', isAuthenticated, authorizeRoles(['hr']), hrController.getSettingsPage);
router.post('/hr/settings', isAuthenticated, authorizeRoles(['hr']), hrController.HRpostUpdateSettings);



router.post(
  '/settings',
  isAuthenticated,
  authorizeRoles(['hr']),
  hrController.HRpostUpdateSettings
);


router.get(
    '/disable',
    isAuthenticated,
    authorizeRoles(['hr']),       // or isHR
    hrController.getDisablePage
  );
  
  // Handle disable POST
  router.post(
    '/disable',
    isAuthenticated,
    authorizeRoles(['hr']),       // or isHR
    hrController.postDisableUser
  );

module.exports = router;
