import { readJson, json, numberId } from "../utils/http.mjs";
import { requireAdmin } from "../utils/auth.mjs";
import { makeSlug } from "../utils/slug.mjs";

export async function listCategoriesRoute(_request, context) {
  try {
    const categories = await context.prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return json(categories);
  } catch (error) {
    console.error("Could not load categories:", error);
    return json({ message: "Could not load categories" }, 500);
  }
}

export async function createCategoryRoute(request, context) {
  try {
    await requireAdmin(request, context.env);
    const body = await readJson(request);

    const name = String(body.name || "").trim();
    const imageUrl = String(body.imageUrl || "").trim() || null;

    if (!name) {
      return json({ message: "Category name is required" }, 400);
    }

    const slug = makeSlug(name);

    if (!slug) {
      return json({ message: "Category name is invalid" }, 400);
    }

    const category = await context.prisma.category.create({
      data: {
        name,
        slug,
        imageUrl,
      },
    });

    return json(category, 201);
  } catch (error) {
    console.error("Create category failed:", error);

    if (error?.code === "P2002") {
      return json(
        { message: "A category with this name already exists" },
        409
      );
    }

    return json(
      { message: error?.message || "Create category failed" },
      error?.status || 500
    );
  }
}

export async function updateCategoryRoute(request, context, idValue) {
  try {
    await requireAdmin(request, context.env);

    const id = numberId(idValue);
    if (!id) return json({ message: "Invalid category ID" }, 400);

    const body = await readJson(request);
    const name = String(body.name || "").trim();
    const imageUrl = String(body.imageUrl || "").trim() || null;

    if (!name) {
      return json({ message: "Category name is required" }, 400);
    }

    const category = await context.prisma.category.update({
      where: { id },
      data: {
        name,
        slug: makeSlug(name),
        imageUrl,
      },
    });

    return json(category);
  } catch (error) {
    console.error("Update category failed:", error);

    if (error?.code === "P2025") {
      return json({ message: "Category not found" }, 404);
    }

    if (error?.code === "P2002") {
      return json(
        { message: "A category with this name already exists" },
        409
      );
    }

    return json(
      { message: error?.message || "Update category failed" },
      error?.status || 500
    );
  }
}

export async function deleteCategoryRoute(request, context, idValue) {
  try {
    await requireAdmin(request, context.env);

    const id = numberId(idValue);
    if (!id) return json({ message: "Invalid category ID" }, 400);

    const products = await context.prisma.product.count({
      where: { categoryId: id },
    });

    if (products > 0) {
      return json(
        { message: "Move or delete products in this category first" },
        409
      );
    }

    await context.prisma.category.delete({
      where: { id },
    });

    return json({ message: "Category deleted" });
  } catch (error) {
    console.error("Delete category failed:", error);

    if (error?.code === "P2025") {
      return json({ message: "Category not found" }, 404);
    }

    return json(
      { message: error?.message || "Delete category failed" },
      error?.status || 500
    );
  }
}
