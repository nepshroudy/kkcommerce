const prisma = require('../utils/prisma');

const normalizeCode = (value) => String(value || '').trim().toUpperCase();
const toDate = (value) => value ? new Date(value) : null;
const toMoney = (value) => value === '' || value === null || value === undefined ? null : Number(value);

function serialize(discount) {
  return {
    ...discount,
    value: Number(discount.value),
    minimumOrder: discount.minimumOrder === null ? null : Number(discount.minimumOrder),
    maximumDiscount: discount.maximumDiscount === null ? null : Number(discount.maximumDiscount),
  };
}

async function validateDiscount({ code, subtotal, userId, email }) {
  const normalized = normalizeCode(code);
  if (!normalized) throw Object.assign(new Error('Enter a discount code'), { status: 400 });

  const discount = await prisma.discount.findUnique({ where: { code: normalized } });
  if (!discount || !discount.active) throw Object.assign(new Error('Discount code is not valid'), { status: 400 });

  const now = new Date();
  if (discount.startsAt && discount.startsAt > now) throw Object.assign(new Error('Discount code is not active yet'), { status: 400 });
  if (discount.expiresAt && discount.expiresAt < now) throw Object.assign(new Error('Discount code has expired'), { status: 400 });
  if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) throw Object.assign(new Error('Discount code usage limit has been reached'), { status: 400 });

  const orderSubtotal = Number(subtotal);
  if (!Number.isFinite(orderSubtotal) || orderSubtotal <= 0) throw Object.assign(new Error('A valid basket subtotal is required'), { status: 400 });
  if (discount.minimumOrder !== null && orderSubtotal < Number(discount.minimumOrder)) {
    throw Object.assign(new Error(`Minimum order is £${Number(discount.minimumOrder).toFixed(2)}`), { status: 400 });
  }

  if (discount.perCustomerLimit !== null && email) {
    const count = await prisma.discountUsage.count({
      where: {
        discountId: discount.id,
        OR: [
          ...(userId ? [{ userId: Number(userId) }] : []),
          { email: String(email).trim().toLowerCase() },
        ],
      },
    });
    if (count >= discount.perCustomerLimit) throw Object.assign(new Error('You have already used this discount code'), { status: 400 });
  }

  let discountAmount = discount.type === 'PERCENTAGE'
    ? orderSubtotal * (Number(discount.value) / 100)
    : Number(discount.value);

  if (discount.maximumDiscount !== null) discountAmount = Math.min(discountAmount, Number(discount.maximumDiscount));
  discountAmount = Math.min(discountAmount, orderSubtotal);
  discountAmount = Number(discountAmount.toFixed(2));

  return {
    discount,
    code: discount.code,
    subtotal: Number(orderSubtotal.toFixed(2)),
    discountAmount,
    total: Number((orderSubtotal - discountAmount).toFixed(2)),
  };
}

exports.list = async (_req, res) => {
  const discounts = await prisma.discount.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(discounts.map(serialize));
};

exports.create = async (req, res) => {
  try {
    const { code, description, type, value, minimumOrder, maximumDiscount, usageLimit, perCustomerLimit, startsAt, expiresAt, active } = req.body;
    const normalized = normalizeCode(code);
    if (!normalized || !['PERCENTAGE', 'FIXED'].includes(type) || Number(value) <= 0) {
      return res.status(400).json({ message: 'Code, type and a positive value are required' });
    }
    if (type === 'PERCENTAGE' && Number(value) > 100) return res.status(400).json({ message: 'Percentage discount cannot exceed 100%' });

    const discount = await prisma.discount.create({ data: {
      code: normalized,
      description: description?.trim() || null,
      type,
      value: String(Number(value).toFixed(2)),
      minimumOrder: toMoney(minimumOrder) === null ? null : String(toMoney(minimumOrder).toFixed(2)),
      maximumDiscount: toMoney(maximumDiscount) === null ? null : String(toMoney(maximumDiscount).toFixed(2)),
      usageLimit: usageLimit === '' || usageLimit === null || usageLimit === undefined ? null : Number(usageLimit),
      perCustomerLimit: perCustomerLimit === '' || perCustomerLimit === null || perCustomerLimit === undefined ? null : Number(perCustomerLimit),
      startsAt: toDate(startsAt),
      expiresAt: toDate(expiresAt),
      active: active !== false,
    }});
    res.status(201).json(serialize(discount));
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'A discount with this code already exists' });
    res.status(500).json({ message: 'Unable to create discount', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await prisma.discount.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ message: 'Discount not found' });
    const body = req.body;
    if (body.type && !['PERCENTAGE', 'FIXED'].includes(body.type)) return res.status(400).json({ message: 'Invalid discount type' });
    const nextType = body.type || existing.type;
    const nextValue = body.value === undefined ? Number(existing.value) : Number(body.value);
    if (nextValue <= 0 || (nextType === 'PERCENTAGE' && nextValue > 100)) return res.status(400).json({ message: 'Invalid discount value' });

    const data = {};
    if (body.code !== undefined) data.code = normalizeCode(body.code);
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.type !== undefined) data.type = body.type;
    if (body.value !== undefined) data.value = String(nextValue.toFixed(2));
    for (const key of ['minimumOrder', 'maximumDiscount']) {
      if (body[key] !== undefined) data[key] = toMoney(body[key]) === null ? null : String(toMoney(body[key]).toFixed(2));
    }
    for (const key of ['usageLimit', 'perCustomerLimit']) {
      if (body[key] !== undefined) data[key] = body[key] === '' || body[key] === null ? null : Number(body[key]);
    }
    if (body.startsAt !== undefined) data.startsAt = toDate(body.startsAt);
    if (body.expiresAt !== undefined) data.expiresAt = toDate(body.expiresAt);
    if (body.active !== undefined) data.active = Boolean(body.active);

    const discount = await prisma.discount.update({ where: { id: existing.id }, data });
    res.json(serialize(discount));
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'A discount with this code already exists' });
    res.status(500).json({ message: 'Unable to update discount', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usageCount = await prisma.discountUsage.count({ where: { discountId: id } });
    if (usageCount > 0) {
      const discount = await prisma.discount.update({ where: { id }, data: { active: false } });
      return res.json({ message: 'Discount has order history, so it was deactivated instead of deleted', discount: serialize(discount) });
    }
    await prisma.discount.delete({ where: { id } });
    res.json({ message: 'Discount deleted' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Discount not found' });
    res.status(500).json({ message: 'Unable to delete discount', error: error.message });
  }
};

exports.validate = async (req, res) => {
  try {
    const result = await validateDiscount({
      code: req.body.code,
      subtotal: req.body.subtotal,
      userId: req.user?.id,
      email: req.body.email,
    });
    res.json({ code: result.code, subtotal: result.subtotal, discountAmount: result.discountAmount, total: result.total, description: result.discount.description });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Unable to validate discount' });
  }
};

exports.validateDiscount = validateDiscount;
