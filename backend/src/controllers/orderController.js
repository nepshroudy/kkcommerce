const prisma = require("../utils/prisma");
const { validateDiscount } = require("./discountController");

const formatOrder = (order) => {
  if (!order) return order;

  const formattedOrder = {
    ...order,
    items: order.orderItems || [],
  };

  delete formattedOrder.orderItems;

  return formattedOrder;
};

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

    const productIds = [
      ...new Set(
        items
          .map((item) => Number(item.productId))
          .filter((productId) => Number.isInteger(productId) && productId > 0)
      ),
    ];

    if (productIds.length !== items.length) {
      return res.status(400).json({
        message: "One or more product IDs are invalid",
      });
    }

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        published: true,
      },
    });

    let subtotal = 0;

    const orderItems = items.map((item) => {
      const productId = Number(item.productId);
      const quantity = Math.max(1, Number(item.quantity) || 1);

      const product = products.find((entry) => entry.id === productId);

      if (!product) {
        const error = new Error("One or more products are unavailable");
        error.status = 400;
        throw error;
      }

      if (product.stock < quantity) {
        const error = new Error(`Not enough stock for ${product.name}`);
        error.status = 400;
        throw error;
      }

      const productPrice =
        product.salePrice !== null && product.salePrice !== undefined
          ? Number(product.salePrice)
          : Number(product.price);

      subtotal += productPrice * quantity;

      return {
        productId: product.id,
        quantity,
        price: productPrice.toFixed(2),
      };
    });

    subtotal = Number(subtotal.toFixed(2));

    const normalizedEmail = String(customerEmail).trim().toLowerCase();

    let discountResult = null;

    if (discountCode && String(discountCode).trim()) {
      discountResult = await validateDiscount({
        code: String(discountCode).trim(),
        subtotal,
        userId: req.user?.id || null,
        email: normalizedEmail,
      });
    }

    const discountAmount = Number(
      discountResult?.discountAmount || 0
    );

    const total = Number(
      discountResult?.total !== undefined
        ? discountResult.total
        : subtotal
    );

    const order = await prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        const stockUpdate = await tx.product.updateMany({
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

        if (stockUpdate.count !== 1) {
          const error = new Error(
            "Stock changed while placing the order. Please refresh your basket."
          );
          error.status = 409;
          throw error;
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          userId: req.user?.id || null,
          customerName: String(customerName).trim(),
          customerEmail: normalizedEmail,
          shippingAddress: String(shippingAddress).trim(),
          subtotal: subtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          discountCode: discountResult?.code || null,
          discountId: discountResult?.discount?.id || null,
          total: total.toFixed(2),

          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          discount: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

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
            orderId: createdOrder.id,
            amount: discountAmount.toFixed(2),
          },
        });
      }

      return createdOrder;
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
    const userId = Number(req.user?.id);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        userId,
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

    return res.status(200).json(orders.map(formatOrder));
  } catch (error) {
    console.error("myOrders error:", error);

    return res.status(500).json({
      message: "Unable to load your orders",
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        discount: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(orders.map(formatOrder));
  } catch (error) {
    console.error("adminList orders error:", error);

    return res.status(500).json({
      message: "Unable to load orders",
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    const allowedStatuses = [
      "PENDING",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    const order = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        discount: true,
      },
    });

    return res.status(200).json(formatOrder(order));
  } catch (error) {
    console.error("updateStatus error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.status(500).json({
      message: "Unable to update order status",
    });
  }
};