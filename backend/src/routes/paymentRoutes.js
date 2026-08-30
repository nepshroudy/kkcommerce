const router = require("express").Router();
const controller = require("../controllers/paymentController");
const { optionalAuth } = require("../middleware/auth");

router.post("/checkout-session", optionalAuth, controller.createCheckoutSession);
router.get("/session/:sessionId", controller.getSessionStatus);

module.exports = router;
