const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

router.get(
  '/summary',
  auth,
  requireRole('SUPERADMIN', 'ADMIN'),
  dashboardController.getSummary
);

module.exports = router;
