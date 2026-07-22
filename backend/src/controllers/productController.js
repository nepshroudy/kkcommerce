const prisma = require("../utils/prisma");
const slugify = require("slugify");

const productInclude = { category: true, images: true };

function cleanProductInput(body, isUpdate = false) {
  const data = {};
  const textFields = ["name", "description", "sku", "imageUrl"];
  textFields.forEach((key) => {
    if (!isUpdate || body[key] !== undefined) data[key] = body[key]?.trim() || null;
  });

  if (!isUpdate || body.price !== undefined) data.price = String(body.price);
  if (!isUpdate || body.salePrice !== undefined) data.salePrice = body.salePrice ? String(body.salePrice) : null;
  if (!isUpdate || body.stock !== undefined) data.stock = Number(body.stock) || 0;
  if (!isUpdate || body.categoryId !== undefined) data.categoryId = body.categoryId ? Number(body.categoryId) : null;
  if (!isUpdate || body.featured !== undefined) data.featured = Boolean(body.featured);
  if (!isUpdate || body.published !== undefined) data.published = body.published !== false;
  return data;
}

exports.list = async (req, res) => {
  try {
    const { q, category, featured } = req.query;
    const products = await prisma.product.findMany({
      where: {
        published: true,
        ...(q ? { OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ] } : {}),
        ...(category ? { category: { slug: category } } : {}),
        ...(featured === "true" ? { featured: true } : {}),
      },
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Could not load products", error: error.message });
  }
};

exports.get = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: productInclude,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Could not load product", error: error.message });
  }
};

exports.adminList = async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Could not load admin products", error: error.message });
  }
};

exports.adminGet = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: productInclude,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Could not load product", error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, price, images = [] } = req.body;
    if (!name?.trim() || !description?.trim() || price === undefined || Number(price) < 0) {
      return res.status(400).json({ message: "Valid name, description and price are required" });
    }

    const data = cleanProductInput(req.body);
    data.name = name.trim();
    data.description = description.trim();
    data.slug = `${slugify(name, { lower: true, strict: true })}-${Date.now()}`;

    const product = await prisma.product.create({
      data: {
        ...data,
        images: { create: images.filter(Boolean).map((url) => ({ url: String(url).trim() })) },
      },
      include: productInclude,
    });
    res.status(201).json(product);
  } catch (error) {
    const status = error.code === "P2002" ? 409 : 500;
    res.status(status).json({ message: "Create product failed", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid product ID" });

    const data = cleanProductInput(req.body, true);
    if (data.name === null) return res.status(400).json({ message: "Product name cannot be empty" });
    if (data.description === null) return res.status(400).json({ message: "Description cannot be empty" });
    if (req.body.name) data.slug = `${slugify(req.body.name, { lower: true, strict: true })}-${id}`;

    const images = Array.isArray(req.body.images) ? req.body.images.filter(Boolean) : null;
    const product = await prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...data,
          ...(images ? { images: { create: images.map((url) => ({ url: String(url).trim() })) } } : {}),
        },
        include: productInclude,
      });
    });
    res.json(product);
  } catch (error) {
    const status = error.code === "P2025" ? 404 : error.code === "P2002" ? 409 : 500;
    res.status(status).json({ message: "Update product failed", error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Product deleted" });
  } catch (error) {
    const status = error.code === "P2025" ? 404 : error.code === "P2003" ? 409 : 500;
    res.status(status).json({
      message: status === 409 ? "This product belongs to an order and cannot be deleted" : "Delete product failed",
      error: error.message,
    });
  }
};
