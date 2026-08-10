const prisma = require("../utils/prisma");
const { validateDiscount } = require("./discountController");
const { calculateOrderPricing } = require("../services/pricingService");

const formatOrder = (order) => ({
  ...order,
  items: order.orderItems || [],
});

exports.create = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      shippingAddress,
      items,
      discountCode,
    } = req.body;

    if (
      !customerName ||
      !customerEmail ||
      !shippingAddress ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Customer details and items are required",
      });
    }

    // Step 1: Calculate pricing
    const pricing = await calculateOrderPricing({ items });

    // Step 2: Validate discount code
    let discountResult = null;

    if (discountCode && String(discountCode).trim()) {
      discountResult = await validateDiscount({
        code: String(discountCode).trim(),
        subtotal: pricing.subtotal,
        userId: req.user?.id || null,
        email: customerEmail,
      });
    }

    // Step 3: Recalculate with discount
    const finalPricing = await calculateOrderPricing({
      items,
      discountAmount: discountResult?.discountAmount || 0,
    });

    const normalizedEmail = String(customerEmail).trim().toLowerCase();

    const order = await prisma.$transaction(async (tx) => {
      // Reduce stock safely
      for (const item of finalPricing.items) {
        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (updated.count !== 1) {
          const error = new Error(
            "Stock changed while placing the order. Please refresh your basket."
          );
          error.status = 409;
          throw error;
        }
      }

      // Create order
      const created = await tx.order.create({
        data: {
          userId: req.user?.id || null,
          customerName,
          customerEmail: normalizedEmail,
          shippingAddress,

          subtotal: finalPricing.subtotal.toFixed(2),
          discountAmount: finalPricing.discount.toFixed(2),
          shippingAmount: finalPricing.shipping.toFixed(2),
          total: finalPricing.total.toFixed(2),

          discountCode: discountResult?.code || null,
          discountId: discountResult?.discount?.id || null,

          orderItems: {
            create: finalPricing.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price.toFixed(2),
            })),
          },
        },

        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          discount: true,
        },
      });

      // Track discount usage
      if (discountResult?.discount?.id) {
        await tx.discount.update({
          where: {
            id: discountResult.discount.id,
          },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        });

        await tx.discountUsage.create({
          data: {
            discountId: discountResult.discount.id,
            userId: req.user?.id || null,
            email: normalizedEmail,
            orderId: created.id,
            amount: finalPricing.discount.toFixed(2),
          },
        });
      }

      return created;
    });

    return res.status(201).json(formatOrder(order));
  } catch (error) {
    console.error("create order error:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Create order failed",
    });
  }
};

exports.myOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.user.id,
      },

      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        discount: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(orders.map(formatOrder));
  } catch (error) {
    console.error("myOrders error:", error);

    res.status(500).json({
      message: "Unable to load orders",
    });
  }
};

exports.adminList = async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
        discount: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(orders.map(formatOrder));
  } catch (error) {
    console.error("adminList error:", error);

    res.status(500).json({
      message: "Unable to load orders",
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: {
        id: Number(req.params.id),
      },

      data: {
        status: req.body.status,
      },
    });

    res.json(order);
  } catch (error) {
    console.error("updateStatus error:", error);

    res.status(500).json({
      message: "Unable to update order status",
    });
  }
};