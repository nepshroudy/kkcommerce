const prisma = require('../utils/prisma');

exports.getSummary = async (_req, res) => {
  try {
    const [products, categories, customers, orders, revenue] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
        _sum: { total: true },
      }),
    ]);

    res.json({
      products,
      categories,
      customers,
      orders,
      revenue: Number(revenue._sum.total || 0),
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Unable to load dashboard summary' });
  }
};
