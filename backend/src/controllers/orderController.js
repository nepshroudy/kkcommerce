const prisma = require('../utils/prisma');
const { validateDiscount } = require('./discountController');
const { calculateOrderPricing } = require('../services/pricingService');

const orderInclude = {
  orderItems: { include: { product: true, variant: true } },
  discount: true,
};
const formatOrder = (order) => ({ ...order, items: order.orderItems || [] });

exports.create = async (req, res) => {
  try {
    const { customerName, customerEmail, shippingAddress, items, discountCode } = req.body;
    if (!customerName || !customerEmail || !shippingAddress || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Customer details and items are required' });
    }
    const pricing = await calculateOrderPricing({ items });
    let discountResult = null;
    if (discountCode && String(discountCode).trim()) {
      discountResult = await validateDiscount({ code: String(discountCode).trim(), subtotal: pricing.subtotal, userId: req.user?.id || null, email: customerEmail });
    }
    const finalPricing = await calculateOrderPricing({ items, discountAmount: discountResult?.discountAmount || 0 });
    const normalizedEmail = String(customerEmail).trim().toLowerCase();

    const order = await prisma.$transaction(async (tx) => {
      for (const item of finalPricing.items) {
        if (item.variantId) {
          const updated = await tx.productVariant.updateMany({
            where: { id: item.variantId, active: true, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count !== 1) throw Object.assign(new Error('Variant stock changed while placing the order. Please refresh your basket.'), { status: 409 });
          await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
        } else {
          const updated = await tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
          if (updated.count !== 1) throw Object.assign(new Error('Stock changed while placing the order. Please refresh your basket.'), { status: 409 });
        }
      }

      const created = await tx.order.create({
        data: {
          userId: req.user?.id || null,
          customerName, customerEmail: normalizedEmail, shippingAddress,
          subtotal: finalPricing.subtotal.toFixed(2), discountAmount: finalPricing.discount.toFixed(2),
          shippingAmount: finalPricing.shipping.toFixed(2), total: finalPricing.total.toFixed(2),
          discountCode: discountResult?.code || null, discountId: discountResult?.discount?.id || null,
          orderItems: { create: finalPricing.items.map((item) => ({
            productId: item.productId, variantId: item.variantId, quantity: item.quantity, price: item.price.toFixed(2),
            variantSize: item.variant?.size || null, variantColour: item.variant?.colour || null, variantSku: item.variant?.sku || null,
          })) },
        }, include: orderInclude,
      });

      if (discountResult?.discount?.id) {
        await tx.discount.update({ where: { id: discountResult.discount.id }, data: { usageCount: { increment: 1 } } });
        await tx.discountUsage.create({ data: { discountId: discountResult.discount.id, userId: req.user?.id || null, email: normalizedEmail, orderId: created.id, amount: finalPricing.discount.toFixed(2) } });
      }
      return created;
    });
    res.status(201).json(formatOrder(order));
  } catch (error) {
    console.error('create order error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Create order failed' });
  }
};

exports.myOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ where: { userId: req.user.id }, include: orderInclude, orderBy: { createdAt: 'desc' } });
    res.json(orders.map(formatOrder));
  } catch (error) { res.status(500).json({ message: 'Unable to load orders' }); }
};

exports.adminList = async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({ include: { ...orderInclude, user: true }, orderBy: { createdAt: 'desc' } });
    res.json(orders.map(formatOrder));
  } catch (error) { res.status(500).json({ message: 'Unable to load orders' }); }
};

exports.updateStatus = async (req, res) => {
  try { res.json(await prisma.order.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status } })); }
  catch (error) { res.status(500).json({ message: 'Unable to update order status' }); }
};
