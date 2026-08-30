const router = require("express").Router();
const controller = require("../controllers/shippingController");
const { auth, requireRole } = require("../middleware/auth");

router.get("/methods", controller.publicList);
router.get("/admin", auth, requireRole("SUPERADMIN", "ADMIN"), controller.adminList);
router.post("/admin", auth, requireRole("SUPERADMIN", "ADMIN"), controller.create);
router.patch("/admin/:id", auth, requireRole("SUPERADMIN", "ADMIN"), controller.update);
router.delete("/admin/:id", auth, requireRole("SUPERADMIN", "ADMIN"), controller.remove);

module.exports = router;
