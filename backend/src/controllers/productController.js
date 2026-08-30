const prisma = require('../utils/prisma');
const slugify = require('slugify');

const productInclude = {
  category: true,
  images: true,
  variants: { orderBy: [{ colour: 'asc' }, { size: 'asc' }] },
};

const text = (value) => (value == null ? null : String(value).trim());
const money = (value) => (value === '' || value == null ? null : String(Number(value).toFixed(2)));

function cleanProductInput(body, isUpdate = false) {
  const data = {};
  for (const key of ['name', 'description', 'sku', 'imageUrl']) {
    if (!isUpdate || body[key] !== undefined) data[key] = text(body[key]) || null;
  }
  if (!isUpdate || body.price !== undefined) data.price = String(Number(body.price || 0).toFixed(2));
  if (!isUpdate || body.salePrice !== undefined) data.salePrice = money(body.salePrice);
  if (!isUpdate || body.categoryId !== undefined) data.categoryId = body.categoryId ? Number(body.categoryId) : null;
  if (!isUpdate || body.featured !== undefined) data.featured = Boolean(body.featured);
  if (!isUpdate || body.published !== undefined) data.published = body.published !== false;
  if (!isUpdate || body.stock !== undefined) data.stock = Math.max(0, Number(body.stock) || 0);
  return data;
}

function normalizeVariants(raw, productSku = 'KK') {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  return raw.map((variant, index) => {
    const size = text(variant.size);
    const colour = text(variant.colour);
    if (!size || !colour) throw Object.assign(new Error('Every variant needs a size and colour.'), { status: 400 });
    const combo = `${size.toLowerCase()}::${colour.toLowerCase()}`;
    if (seen.has(combo)) throw Object.assign(new Error(`Duplicate variant: ${colour} / ${size}`), { status: 400 });
    seen.add(combo);
    const safe = (v) => slugify(String(v), { upper: true, strict: true }).replace(/-/g, '');
    const sku = text(variant.sku) || `${safe(productSku || 'KK')}-${safe(colour)}-${safe(size)}-${index + 1}`;
    const useProductPricing = variant.useProductPricing !== false;
    const price = useProductPricing ? null : money(variant.price);
    const salePrice = useProductPricing ? null : money(variant.salePrice);
    if (!useProductPricing && (price == null || Number(price) < 0)) {
      throw Object.assign(new Error(`Custom price required for ${colour} / ${size}.`), { status: 400 });
    }
    if (salePrice != null && Number(salePrice) >= Number(price)) {
      throw Object.assign(new Error(`Sale price must be lower than regular price for ${colour} / ${size}.`), { status: 400 });
    }
    return {
      size,
      colour,
      sku,
      stock: Math.max(0, Number(variant.stock) || 0),
      useProductPricing,
      price,
      salePrice,
      active: variant.active !== false,
    };
  });
}

function withDerivedStock(data, variants) {
  if (variants) data.stock = variants.filter((v) => v.active).reduce((sum, v) => sum + v.stock, 0);
  return data;
}

exports.list = async (req, res) => {
  try {
    const { q, category, featured } = req.query;
    const products = await prisma.product.findMany({
      where: {
        published: true,
        ...(q ? { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ] } : {}),
        ...(category ? { category: { slug: category } } : {}),
        ...(featured === 'true' ? { featured: true } : {}),
      },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Could not load products', error: error.message });
  }
};

exports.get = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug }, include: productInclude });
    if (!product || !product.published) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Could not load product', error: error.message });
  }
};

exports.adminList = async (_req, res) => {
  try {
    res.json(await prisma.product.findMany({ include: productInclude, orderBy: { createdAt: 'desc' } }));
  } catch (error) {
    res.status(500).json({ message: 'Could not load admin products', error: error.message });
  }
};

exports.adminGet = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) }, include: productInclude });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Could not load product', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, price, images = [] } = req.body;
    if (!name?.trim() || !description?.trim() || price === undefined || Number(price) < 0) {
      return res.status(400).json({ message: 'Valid name, description and price are required' });
    }
    const variants = normalizeVariants(req.body.variants || [], req.body.sku || name);
    const data = withDerivedStock(cleanProductInput(req.body), variants);
    data.name = name.trim();
    data.description = description.trim();
    data.slug = `${slugify(name, { lower: true, strict: true })}-${Date.now()}`;

    const product = await prisma.product.create({
      data: {
        ...data,
        images: { create: images.filter(Boolean).map((url) => ({ url: String(url).trim() })) },
        ...(variants?.length ? { variants: { create: variants } } : {}),
      },
      include: productInclude,
    });
    res.status(201).json(product);
  } catch (error) {
    const status = error.status || (error.code === 'P2002' ? 409 : 500);
    res.status(status).json({ message: error.message || 'Create product failed' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid product ID' });
    const variants = req.body.variants !== undefined ? normalizeVariants(req.body.variants, req.body.sku || req.body.name || 'KK') : null;
    const data = withDerivedStock(cleanProductInput(req.body, true), variants);
    if (data.name === null) return res.status(400).json({ message: 'Product name cannot be empty' });
    if (data.description === null) return res.status(400).json({ message: 'Description cannot be empty' });
    if (req.body.name) data.slug = `${slugify(req.body.name, { lower: true, strict: true })}-${id}`;
    const images = Array.isArray(req.body.images) ? req.body.images.filter(Boolean) : null;

    const product = await prisma.$transaction(async (tx) => {
      if (images) await tx.productImage.deleteMany({ where: { productId: id } });
      if (variants) await tx.productVariant.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: {
          ...data,
          ...(images ? { images: { create: images.map((url) => ({ url: String(url).trim() })) } } : {}),
          ...(variants ? { variants: { create: variants } } : {}),
        },
        include: productInclude,
      });
    });
    res.json(product);
  } catch (error) {
    const status = error.status || (error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : 500);
    res.status(status).json({ message: error.message || 'Update product failed' });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    const status = error.code === 'P2025' ? 404 : error.code === 'P2003' ? 409 : 500;
    res.status(status).json({ message: status === 409 ? 'This product belongs to an order and cannot be deleted' : 'Delete product failed', error: error.message });
  }
};
