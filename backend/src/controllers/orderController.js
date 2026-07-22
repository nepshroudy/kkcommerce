const prisma = require('../utils/prisma');
const { validateDiscount } = require('./discountController');

exports.create = async (req, res) => {
  try {
    const { customerName, customerEmail, shippingAddress, items, discountCode } = req.body;
    if (!customerName || !customerEmail || !shippingAddress || !items?.length) {
      return res.status(400).json({ message: 'Customer details and items are required' });
    }

    const ids = items.map((item) => Number(item.productId));
    const products = await prisma.product.findMany({ where: { id: { in: ids }, published: true } });
    let subtotal = 0;
    const orderItems = items.map((item) => {
      const product = products.find((entry) => entry.id === Number(item.productId));
      if (!product) throw Object.assign(new Error('One or more products are unavailable'), { status: 400 });
      const quantity = Math.max(1, Number(item.quantity) || 1);
      if (product.stock < quantity) throw Object.assign(new Error(`Not enough stock for ${product.name}`), { status: 400 });
      const price = Number(product.salePrice || product.price);
      subtotal += price * quantity;
      return { productId: product.id, quantity, price: String(price.toFixed(2)) };
    });

    subtotal = Number(subtotal.toFixed(2));
    let discountResult = null;
    if (discountCode) {
      discountResult = await validateDiscount({
        code: discountCode,
        subtotal,
        userId: req.user?.id,
        email: customerEmail,
      });
    }

    const discountAmount = discountResult?.discountAmount || 0;
    const total = discountResult?.total ?? subtotal;
    const normalizedEmail = String(customerEmail).trim().toLowerCase();

    const order = await prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw Object.assign(new Error('Stock changed while placing the order. Please refresh your basket.'), { status: 409 });
      }

      const created = await tx.order.create({
        data: {
          userId: req.user?.id || null,
          customerName,
          customerEmail: normalizedEmail,
          shippingAddress,
          subtotal: String(subtotal.toFixed(2)),
          discountAmount: String(discountAmount.toFixed(2)),
          discountCode: discountResult?.code || null,
          discountId: discountResult?.discount.id || null,
          total: String(total.toFixed(2)),
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } }, discount: true },
      });

      if (discountResult) {
        await tx.discount.update({ where: { id: discountResult.discount.id }, data: { usageCount: { increment: 1 } } });
        await tx.discountUsage.create({ data: {
          discountId: discountResult.discount.id,
          userId: req.user?.id || null,
          email: normalizedEmail,
          orderId: created.id,
          amount: String(discountAmount.toFixed(2)),
        }});
      }
      return created;
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Create order failed' });
  }
};

exports.myOrders = async (req, res) => {
  const orders = await prisma.order.findMany({ where: { userId: req.user.id }, include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } });
  res.json(orders);
};
exports.adminList = async (_req, res) => {
  const orders = await prisma.order.findMany({ include: { items: { include: { product: true } }, user: true, discount: true }, orderBy: { createdAt: 'desc' } });
  res.json(orders);
};
exports.updateStatus = async (req, res) => {
  const order = await prisma.order.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status } });
  res.json(order);
};
