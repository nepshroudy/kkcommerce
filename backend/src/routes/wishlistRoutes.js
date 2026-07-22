const router = require('express').Router();
const controller = require('../controllers/wishlistController');
const { auth } = require('../middleware/auth');
router.use(auth);
router.get('/', controller.list);
router.post('/', controller.add);
router.delete('/:productId', controller.remove);
module.exports = router;
