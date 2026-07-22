const router = require('express').Router();
const controller = require('../controllers/discountController');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

router.post('/validate', optionalAuth, controller.validate);
router.get('/', auth, requireRole('SUPERADMIN', 'ADMIN'), controller.list);
router.post('/', auth, requireRole('SUPERADMIN', 'ADMIN'), controller.create);
router.patch('/:id', auth, requireRole('SUPERADMIN', 'ADMIN'), controller.update);
router.delete('/:id', auth, requireRole('SUPERADMIN', 'ADMIN'), controller.remove);

module.exports = router;
