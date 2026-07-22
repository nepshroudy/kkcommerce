const express = require("express");
const controller = require("../controllers/categoryController");
const { auth, allowRoles } = require("../middleware/auth");

const router = express.Router();
router.get("/", controller.list);
router.post("/", auth, allowRoles("SUPERADMIN", "ADMIN"), controller.create);
router.put("/:id", auth, allowRoles("SUPERADMIN", "ADMIN"), controller.update);
router.delete("/:id", auth, allowRoles("SUPERADMIN", "ADMIN"), controller.remove);
module.exports = router;
