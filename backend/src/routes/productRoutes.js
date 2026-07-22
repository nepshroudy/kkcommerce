const express = require("express");
const controller = require("../controllers/productController");
const { auth, allowRoles } = require("../middleware/auth");

const router = express.Router();
router.get("/", controller.list);
router.get("/admin", auth, allowRoles("SUPERADMIN", "ADMIN"), controller.adminList);
router.get("/admin/:id", auth, allowRoles("SUPERADMIN", "ADMIN"), controller.adminGet);
router.get("/:slug", controller.get);
router.post("/", auth, allowRoles("SUPERADMIN", "ADMIN"), controller.create);
router.put("/:id", auth, allowRoles("SUPERADMIN", "ADMIN"), controller.update);
router.delete("/:id", auth, allowRoles("SUPERADMIN", "ADMIN"), controller.remove);
module.exports = router;
