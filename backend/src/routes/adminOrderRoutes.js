const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const controller = require('../controllers/adminOrderController');

router.use(auth, requireRole('SUPERADMIN', 'ADMIN'));
router.get('/', controller.listOrders);
router.get('/:id', controller.getOrder);
router.patch('/:id/status', controller.updateOrderStatus);

module.exports = router;
