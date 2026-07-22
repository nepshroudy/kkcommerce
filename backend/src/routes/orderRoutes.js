const router = require('express').Router();
const controller = require('../controllers/orderController');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

router.post('/', optionalAuth, controller.create);
router.get('/mine', auth, controller.myOrders);
router.get('/admin/all', auth, requireRole('SUPERADMIN', 'ADMIN'), controller.adminList);
router.patch('/:id/status', auth, requireRole('SUPERADMIN', 'ADMIN'), controller.updateStatus);
module.exports = router;
