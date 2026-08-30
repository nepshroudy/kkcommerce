const prisma = require("../utils/prisma");

function serializeMethod(method, subtotal = 0) {
  const basePrice = Number(method.price);
  const freeOver = method.freeOver === null ? null : Number(method.freeOver);
  const effectivePrice = freeOver !== null && Number(subtotal) >= freeOver ? 0 : basePrice;
  const estimate =
    method.estimatedDaysMin && method.estimatedDaysMax
      ? `${method.estimatedDaysMin}-${method.estimatedDaysMax} working days`
      : method.estimatedDaysMin
      ? `${method.estimatedDaysMin}+ working days`
      : null;

  return { ...method, price: basePrice, freeOver, effectivePrice, estimate };
}

async function getActiveShippingMethods(subtotal = 0) {
  const methods = await prisma.shippingMethod.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });
  return methods.map((method) => serializeMethod(method, subtotal));
}

async function getShippingMethodForOrder(shippingMethodId, subtotal) {
  let method = null;

  if (shippingMethodId) {
    method = await prisma.shippingMethod.findFirst({
      where: { id: Number(shippingMethodId), active: true },
    });
  } else {
    method = await prisma.shippingMethod.findFirst({
      where: { active: true, isDefault: true },
      orderBy: { sortOrder: "asc" },
    });
    if (!method) {
      method = await prisma.shippingMethod.findFirst({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
      });
    }
  }

  if (!method) {
    const error = new Error("No delivery method is currently available.");
    error.status = 400;
    throw error;
  }

  return serializeMethod(method, subtotal);
}

module.exports = { serializeMethod, getActiveShippingMethods, getShippingMethodForOrder };
