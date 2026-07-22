const prisma = require('../utils/prisma');

const allowedStatuses = [
  'PENDING', 'PAID', 'PROCESSING', 'SHIPPED',
  'DELIVERED', 'CANCELLED', 'REFUNDED',
];

exports.listOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        discount: true,
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Keep "items" in the API response so the existing frontend still works.
    const formattedOrders = orders.map((order) => ({
      ...order,
      items: order.orderItems,
    }));

    return res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("listOrders error:", error);

    return res.status(500).json({
      message: "Unable to load orders",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('getOrder error:', error);
    res.status(500).json({ message: 'Unable to load order' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status },
      include: { items: { include: { product: true } } },
    });
    res.json(order);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Order not found' });
    console.error('updateOrderStatus error:', error);
    res.status(500).json({ message: 'Unable to update order' });
  }
};
