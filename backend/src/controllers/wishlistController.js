const prisma = require('../utils/prisma');

const include = { product: { include: { category: true, images: true } } };

exports.list = async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include,
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Could not load wishlist', error: error.message });
  }
};

exports.add = async (req, res) => {
  try {
    const productId = Number(req.body.productId);
    if (!Number.isInteger(productId)) return res.status(400).json({ message: 'Valid productId is required' });
    const product = await prisma.product.findFirst({ where: { id: productId, published: true } });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const item = await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user.id, productId } },
      update: {},
      create: { userId: req.user.id, productId },
      include,
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Could not add wishlist item', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user.id, productId: Number(req.params.productId) } });
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Could not remove wishlist item', error: error.message });
  }
};
