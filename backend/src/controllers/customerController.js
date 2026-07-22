const prisma = require('../utils/prisma');

exports.listCustomers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        createdAt: true, updatedAt: true,
        _count: { select: { orders: true, wishlistItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('listCustomers error:', error);
    res.status(500).json({ message: 'Unable to load customers' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const { role } = req.body;
    const allowed = req.user.role === 'SUPERADMIN'
      ? ['SUPERADMIN', 'ADMIN', 'CUSTOMER']
      : ['CUSTOMER'];

    if (!allowed.includes(role)) {
      return res.status(403).json({ message: 'You cannot assign this role' });
    }
    if (targetId === req.user.id && role === 'CUSTOMER') {
      return res.status(400).json({ message: 'You cannot remove your own admin access' });
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'User not found' });
    console.error('updateUserRole error:', error);
    res.status(500).json({ message: 'Unable to update role' });
  }
};
