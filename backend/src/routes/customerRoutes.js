const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const controller = require('../controllers/customerController');

router.use(auth, requireRole('SUPERADMIN', 'ADMIN'));
router.get('/', controller.listCustomers);
router.patch('/:id/role', controller.updateUserRole);

module.exports = router;
