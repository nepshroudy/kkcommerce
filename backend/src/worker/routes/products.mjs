import { readJson, json, numberId } from "../utils/http.mjs";
import { requireAdmin } from "../utils/auth.mjs";
import { makeSlug, makeSkuPart } from "../utils/slug.mjs";

const productInclude = {
  category: true,
  images: true,
  variants: {
    orderBy: [{ colour: "asc" }, { size: "asc" }],
  },
};

const text = (value) =>
  value == null ? null : String(value).trim();

const money = (value) =>
  value === "" || value == null
    ? null
    : String(Number(value).toFixed(2));

function cleanProductInput(body, isUpdate = false) {
  const data = {};

  for (const key of ["name", "description", "sku", "imageUrl"]) {
    if (!isUpdate || body[key] !== undefined) {
      data[key] = text(body[key]) || null;
    }
  }

  if (!isUpdate || body.price !== undefined) {
    const price = Number(body.price || 0);
    if (!Number.isFinite(price) || price < 0) {
      throw Object.assign(new Error("Invalid product price"), { status: 400 });
    }
    data.price = String(price.toFixed(2));
  }

  if (!isUpdate || body.salePrice !== undefined) {
    data.salePrice = money(body.salePrice);
    if (
      data.salePrice != null &&
      (!Number.isFinite(Number(data.salePrice)) || Number(data.salePrice) < 0)
    ) {
      throw Object.assign(new Error("Invalid sale price"), { status: 400 });
    }
  }

  if (!isUpdate || body.categoryId !== undefined) {
    data.categoryId = body.categoryId ? Number(body.categoryId) : null;
    if (
      data.categoryId != null &&
      !Number.isInteger(data.categoryId)
    ) {
      throw Object.assign(new Error("Invalid category ID"), { status: 400 });
    }
  }

  if (!isUpdate || body.featured !== undefined) {
    data.featured = Boolean(body.featured);
  }

  if (!isUpdate || body.published !== undefined) {
    data.published = body.published !== false;
  }

  if (!isUpdate || body.stock !== undefined) {
    data.stock = Math.max(0, Number(body.stock) || 0);
  }

  return data;
}

function normalizeVariants(raw, productSku = "KK") {
  if (!Array.isArray(raw)) return null;

  const seen = new Set();

  return raw.map((variant, index) => {
    const size = text(variant.size);
    const colour = text(variant.colour);

    if (!size || !colour) {
      throw Object.assign(
        new Error("Every variant needs a size and colour."),
        { status: 400 }
      );
    }

    const combo = `${size.toLowerCase()}::${colour.toLowerCase()}`;

    if (seen.has(combo)) {
      throw Object.assign(
        new Error(`Duplicate variant: ${colour} / ${size}`),
        { status: 400 }
      );
    }

    seen.add(combo);

    const sku =
      text(variant.sku) ||
      `${makeSkuPart(productSku || "KK")}-${makeSkuPart(colour)}-${makeSkuPart(
        size
      )}-${index + 1}`;

    const useProductPricing = variant.useProductPricing !== false;
    const price = useProductPricing ? null : money(variant.price);
    const salePrice = useProductPricing ? null : money(variant.salePrice);

    if (
      !useProductPricing &&
      (price == null ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0)
    ) {
      throw Object.assign(
        new Error(`Custom price required for ${colour} / ${size}.`),
        { status: 400 }
      );
    }

    if (
      salePrice != null &&
      (!Number.isFinite(Number(salePrice)) ||
        Number(salePrice) < 0 ||
        Number(salePrice) >= Number(price))
    ) {
      throw Object.assign(
        new Error(
          `Sale price must be lower than regular price for ${colour} / ${size}.`
        ),
        { status: 400 }
      );
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
  if (variants) {
    data.stock = variants
      .filter((variant) => variant.active)
      .reduce((sum, variant) => sum + variant.stock, 0);
  }

  return data;
}

export async function listProductsRoute(request, context) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const category = url.searchParams.get("category")?.trim() || "";
  const featured = url.searchParams.get("featured") === "true";

  try {
    const products = await context.prisma.product.findMany({
      where: {
        published: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                {
                  description: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        ...(category
          ? {
              category: {
                slug: category,
              },
            }
          : {}),
        ...(featured ? { featured: true } : {}),
      },
      include: productInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return json(products);
  } catch (error) {
    console.error("Could not load products:", error);
    return json({ message: "Could not load products" }, 500);
  }
}

export async function getProductRoute(_request, context, slug) {
  try {
    const product = await context.prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });

    if (!product || !product.published) {
      return json({ message: "Product not found" }, 404);
    }

    return json(product);
  } catch (error) {
    console.error("Could not load product:", error);
    return json({ message: "Could not load product" }, 500);
  }
}

export async function adminListProductsRoute(request, context) {
  try {
    await requireAdmin(request, context.env);

    const products = await context.prisma.product.findMany({
      include: productInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return json(products);
  } catch (error) {
    return json(
      { message: error?.message || "Could not load admin products" },
      error?.status || 500
    );
  }
}

export async function adminGetProductRoute(request, context, idValue) {
  try {
    await requireAdmin(request, context.env);

    const id = numberId(idValue);
    if (!id) return json({ message: "Invalid product ID" }, 400);

    const product = await context.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) {
      return json({ message: "Product not found" }, 404);
    }

    return json(product);
  } catch (error) {
    return json(
      { message: error?.message || "Could not load product" },
      error?.status || 500
    );
  }
}

export async function createProductRoute(request, context) {
  try {
    await requireAdmin(request, context.env);
    const body = await readJson(request);

    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price);

    if (!name || !description || !Number.isFinite(price) || price < 0) {
      return json(
        {
          message:
            "Valid name, description and price are required",
        },
        400
      );
    }

    const images = Array.isArray(body.images) ? body.images : [];
    const variants = normalizeVariants(
      body.variants || [],
      body.sku || name
    );

    const data = withDerivedStock(
      cleanProductInput(body),
      variants
    );

    data.name = name;
    data.description = description;
    data.slug = `${makeSlug(name)}-${Date.now()}`;

    if (
      data.salePrice != null &&
      Number(data.salePrice) >= Number(data.price)
    ) {
      return json(
        { message: "Sale price must be lower than regular price" },
        400
      );
    }

    const product = await context.prisma.product.create({
      data: {
        ...data,
        images: {
          create: images
            .filter(Boolean)
            .map((url) => ({
              url: String(url).trim(),
            })),
        },
        ...(variants?.length
          ? {
              variants: {
                create: variants,
              },
            }
          : {}),
      },
      include: productInclude,
    });

    return json(product, 201);
  } catch (error) {
    console.error("Create product failed:", error);

    const status =
      error?.status ||
      (error?.code === "P2002"
        ? 409
        : error?.code === "P2003"
        ? 400
        : 500);

    return json(
      { message: error?.message || "Create product failed" },
      status
    );
  }
}

export async function updateProductRoute(
  request,
  context,
  idValue
) {
  try {
    await requireAdmin(request, context.env);

    const id = numberId(idValue);
    if (!id) return json({ message: "Invalid product ID" }, 400);

    const body = await readJson(request);

    const variants =
      body.variants !== undefined
        ? normalizeVariants(
            body.variants,
            body.sku || body.name || "KK"
          )
        : null;

    const data = withDerivedStock(
      cleanProductInput(body, true),
      variants
    );

    if (data.name === null) {
      return json(
        { message: "Product name cannot be empty" },
        400
      );
    }

    if (data.description === null) {
      return json(
        { message: "Description cannot be empty" },
        400
      );
    }

    if (body.name) {
      data.slug = `${makeSlug(body.name)}-${id}`;
    }

    if (
      data.salePrice != null &&
      data.price != null &&
      Number(data.salePrice) >= Number(data.price)
    ) {
      return json(
        { message: "Sale price must be lower than regular price" },
        400
      );
    }

    const images = Array.isArray(body.images)
      ? body.images.filter(Boolean)
      : null;

    const product = await context.prisma.$transaction(
      async (tx) => {
        if (images) {
          await tx.productImage.deleteMany({
            where: { productId: id },
          });
        }

        if (variants) {
          await tx.productVariant.deleteMany({
            where: { productId: id },
          });
        }

        return tx.product.update({
          where: { id },
          data: {
            ...data,
            ...(images
              ? {
                  images: {
                    create: images.map((url) => ({
                      url: String(url).trim(),
                    })),
                  },
                }
              : {}),
            ...(variants
              ? {
                  variants: {
                    create: variants,
                  },
                }
              : {}),
          },
          include: productInclude,
        });
      }
    );

    return json(product);
  } catch (error) {
    console.error("Update product failed:", error);

    const status =
      error?.status ||
      (error?.code === "P2025"
        ? 404
        : error?.code === "P2002"
        ? 409
        : error?.code === "P2003"
        ? 400
        : 500);

    return json(
      { message: error?.message || "Update product failed" },
      status
    );
  }
}

export async function deleteProductRoute(
  request,
  context,
  idValue
) {
  try {
    await requireAdmin(request, context.env);

    const id = numberId(idValue);
    if (!id) return json({ message: "Invalid product ID" }, 400);

    await context.prisma.product.delete({
      where: { id },
    });

    return json({ message: "Product deleted" });
  } catch (error) {
    console.error("Delete product failed:", error);

    if (error?.code === "P2025") {
      return json({ message: "Product not found" }, 404);
    }

    if (error?.code === "P2003") {
      return json(
        {
          message:
            "This product belongs to an order and cannot be deleted",
        },
        409
      );
    }

    return json(
      { message: error?.message || "Delete product failed" },
      error?.status || 500
    );
  }
}
