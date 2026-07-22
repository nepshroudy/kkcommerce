const router = require('express').Router();
const controller = require('../controllers/accountController');
const { auth } = require('../middleware/auth');
router.use(auth);
router.get('/profile', controller.profile);
router.put('/profile', controller.updateProfile);
router.put('/password', controller.changePassword);
module.exports = router;
