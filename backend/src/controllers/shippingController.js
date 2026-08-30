const prisma = require("../utils/prisma");
const { serializeMethod, getActiveShippingMethods } = require("../services/shippingService");

const toMoney = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

exports.publicList = async (req, res) => {
  try {
    res.json(await getActiveShippingMethods(Number(req.query.subtotal || 0)));
  } catch (_error) {
    res.status(500).json({ message: "Unable to load delivery methods" });
  }
};

exports.adminList = async (_req, res) => {
  try {
    const methods = await prisma.shippingMethod.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(methods.map((method) => serializeMethod(method, 0)));
  } catch (_error) {
    res.status(500).json({ message: "Unable to load delivery methods" });
  }
};

exports.create = async (req, res) => {
  try {
    const body = req.body;
    if (!body.name?.trim() || !body.code?.trim() || Number(body.price) < 0) {
      return res.status(400).json({ message: "Name, code and a valid price are required" });
    }
    const data = {
      name: body.name.trim(),
      code: body.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_"),
      description: body.description?.trim() || null,
      price: Number(body.price).toFixed(2),
      freeOver: toMoney(body.freeOver) === null ? null : toMoney(body.freeOver).toFixed(2),
      estimatedDaysMin: body.estimatedDaysMin === "" ? null : Number(body.estimatedDaysMin) || null,
      estimatedDaysMax: body.estimatedDaysMax === "" ? null : Number(body.estimatedDaysMax) || null,
      active: body.active !== false,
      isDefault: Boolean(body.isDefault),
      sortOrder: Number(body.sortOrder) || 0,
    };
    const method = await prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.shippingMethod.updateMany({ data: { isDefault: false } });
      return tx.shippingMethod.create({ data });
    });
    res.status(201).json(serializeMethod(method, 0));
  } catch (error) {
    res.status(error.code === "P2002" ? 409 : 500).json({
      message: error.code === "P2002" ? "That delivery code already exists" : "Unable to create delivery method",
    });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.shippingMethod.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Delivery method not found" });
    const body = req.body;
    const data = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.price !== undefined) data.price = Number(body.price).toFixed(2);
    if (body.freeOver !== undefined) data.freeOver = toMoney(body.freeOver) === null ? null : toMoney(body.freeOver).toFixed(2);
    if (body.estimatedDaysMin !== undefined) data.estimatedDaysMin = body.estimatedDaysMin === "" ? null : Number(body.estimatedDaysMin) || null;
    if (body.estimatedDaysMax !== undefined) data.estimatedDaysMax = body.estimatedDaysMax === "" ? null : Number(body.estimatedDaysMax) || null;
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.isDefault !== undefined) data.isDefault = Boolean(body.isDefault);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

    const method = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.shippingMethod.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
      }
      return tx.shippingMethod.update({ where: { id }, data });
    });
    res.json(serializeMethod(method, 0));
  } catch (error) {
    res.status(error.code === "P2002" ? 409 : 500).json({ message: "Unable to update delivery method" });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const orderCount = await prisma.order.count({ where: { shippingMethodId: id } });
    if (orderCount > 0) {
      const method = await prisma.shippingMethod.update({
        where: { id },
        data: { active: false, isDefault: false },
      });
      return res.json({ message: "Delivery method deactivated because it has order history.", method: serializeMethod(method, 0) });
    }
    await prisma.shippingMethod.delete({ where: { id } });
    res.json({ message: "Delivery method deleted" });
  } catch (error) {
    res.status(error.code === "P2025" ? 404 : 500).json({ message: "Unable to delete delivery method" });
  }
};
