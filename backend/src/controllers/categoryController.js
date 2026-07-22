const prisma = require("../utils/prisma");
const slugify = require("slugify");

function makeSlug(name) {
  return slugify(name, { lower: true, strict: true, trim: true });
}

exports.list = async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Could not load categories", error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, imageUrl } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: makeSlug(name),
        imageUrl: imageUrl?.trim() || null,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    const status = error.code === "P2002" ? 409 : 500;
    res.status(status).json({
      message: status === 409 ? "A category with this name already exists" : "Create category failed",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, imageUrl } = req.body;
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid category ID" });
    if (!name || !name.trim()) return res.status(400).json({ message: "Category name is required" });

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug: makeSlug(name),
        imageUrl: imageUrl?.trim() || null,
      },
    });
    res.json(category);
  } catch (error) {
    const status = error.code === "P2025" ? 404 : error.code === "P2002" ? 409 : 500;
    res.status(status).json({ message: "Update category failed", error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid category ID" });

    const products = await prisma.product.count({ where: { categoryId: id } });
    if (products > 0) {
      return res.status(409).json({ message: "Move or delete products in this category first" });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ message: "Category deleted" });
  } catch (error) {
    const status = error.code === "P2025" ? 404 : 500;
    res.status(status).json({ message: "Delete category failed", error: error.message });
  }
};
