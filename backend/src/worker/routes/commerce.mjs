import bcrypt from "bcryptjs";
import { json, readJson, numberId } from "../utils/http.mjs";
import {
  getAuthenticatedUser,
  requireAdmin,
  requireProductOrderStaff,
} from "../utils/auth.mjs";
import { verifyJwt } from "../utils/jwt.mjs";

const ORDER_STATUSES = new Set([
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

const DISCOUNT_TYPES = new Set([
  "PERCENTAGE",
  "FIXED",
]);

function asMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function decimalString(value) {
  return Number(value || 0).toFixed(2);
}

function serializeShippingMethod(method, subtotal = 0) {
  const price = Number(method.price);
  const freeOver =
    method.freeOver === null ? null : Number(method.freeOver);

  const effectivePrice =
    freeOver !== null && Number(subtotal) >= freeOver
      ? 0
      : price;

  const estimate =
    method.estimatedDaysMin && method.estimatedDaysMax
      ? `${method.estimatedDaysMin}-${method.estimatedDaysMax} working days`
      : method.estimatedDaysMin
      ? `${method.estimatedDaysMin}+ working days`
      : null;

  return {
    ...method,
    price,
    freeOver,
    effectivePrice,
    estimate,
  };
}

function serializeDiscount(discount) {
  return {
    ...discount,
    value: Number(discount.value),
    minimumOrder:
      discount.minimumOrder === null
        ? null
        : Number(discount.minimumOrder),
    maximumDiscount:
      discount.maximumDiscount === null
        ? null
        : Number(discount.maximumDiscount),
  };
}

async function optionalUser(request, env) {
  const header =
    request.headers.get("authorization") || "";

  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  try {
    return await verifyJwt(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function activeShippingMethod(
  prisma,
  shippingMethodId,
  subtotal
) {
  let method = null;

  if (shippingMethodId) {
    method = await prisma.shippingMethod.findFirst({
      where: {
        id: Number(shippingMethodId),
        active: true,
      },
    });
  } else {
    method = await prisma.shippingMethod.findFirst({
      where: {
        active: true,
        isDefault: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    if (!method) {
      method = await prisma.shippingMethod.findFirst({
        where: { active: true },
        orderBy: [
          { sortOrder: "asc" },
          { price: "asc" },
        ],
      });
    }
  }

  if (!method) {
    throw Object.assign(
      new Error(
        "No delivery method is currently available."
      ),
      { status: 400 }
    );
  }

  return serializeShippingMethod(method, subtotal);
}

async function validateDiscount(
  prisma,
  {
    code,
    subtotal,
    userId = null,
    email = null,
  }
) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();

  if (!normalized) {
    throw Object.assign(
      new Error("Enter a discount code"),
      { status: 400 }
    );
  }

  const discount = await prisma.discount.findUnique({
    where: { code: normalized },
  });

  if (!discount || !discount.active) {
    throw Object.assign(
      new Error("Discount code is not valid"),
      { status: 400 }
    );
  }

  const now = new Date();

  if (discount.startsAt && discount.startsAt > now) {
    throw Object.assign(
      new Error("Discount code is not active yet"),
      { status: 400 }
    );
  }

  if (discount.expiresAt && discount.expiresAt < now) {
    throw Object.assign(
      new Error("Discount code has expired"),
      { status: 400 }
    );
  }

  if (
    discount.usageLimit !== null &&
    discount.usageCount >= discount.usageLimit
  ) {
    throw Object.assign(
      new Error(
        "Discount code usage limit has been reached"
      ),
      { status: 400 }
    );
  }

  const orderSubtotal = Number(subtotal);

  if (
    !Number.isFinite(orderSubtotal) ||
    orderSubtotal <= 0
  ) {
    throw Object.assign(
      new Error(
        "A valid basket subtotal is required"
      ),
      { status: 400 }
    );
  }

  if (
    discount.minimumOrder !== null &&
    orderSubtotal < Number(discount.minimumOrder)
  ) {
    throw Object.assign(
      new Error(
        `Minimum order is £${Number(
          discount.minimumOrder
        ).toFixed(2)}`
      ),
      { status: 400 }
    );
  }

  if (
    discount.perCustomerLimit !== null &&
    email
  ) {
    const conditions = [
      {
        email: String(email)
          .trim()
          .toLowerCase(),
      },
    ];

    if (userId) {
      conditions.unshift({
        userId: Number(userId),
      });
    }

    const count =
      await prisma.discountUsage.count({
        where: {
          discountId: discount.id,
          OR: conditions,
        },
      });

    if (
      count >= discount.perCustomerLimit
    ) {
      throw Object.assign(
        new Error(
          "You have already used this discount code"
        ),
        { status: 400 }
      );
    }
  }

  let discountAmount =
    discount.type === "PERCENTAGE"
      ? orderSubtotal *
        (Number(discount.value) / 100)
      : Number(discount.value);

  if (discount.maximumDiscount !== null) {
    discountAmount = Math.min(
      discountAmount,
      Number(discount.maximumDiscount)
    );
  }

  discountAmount = Math.min(
    discountAmount,
    orderSubtotal
  );

  discountAmount = asMoney(discountAmount);

  return {
    discount,
    code: discount.code,
    subtotal: asMoney(orderSubtotal),
    discountAmount,
    total: asMoney(
      orderSubtotal - discountAmount
    ),
  };
}

async function priceItems(prisma, items) {
  const productIds = [
    ...new Set(
      items
        .map((item) => Number(item.productId))
        .filter(Number.isInteger)
    ),
  ];

  const variantIds = [
    ...new Set(
      items
        .map((item) => Number(item.variantId))
        .filter(Number.isInteger)
    ),
  ];

  const products =
    await prisma.product.findMany({
      where: {
        id: { in: productIds },
        published: true,
      },
    });

  const variants = variantIds.length
    ? await prisma.productVariant.findMany({
        where: {
          id: { in: variantIds },
          active: true,
        },
      })
    : [];

  let subtotal = 0;
  const normalized = [];

  for (const raw of items) {
    const productId = Number(raw.productId);
    const quantity = Math.max(
      1,
      Number(raw.quantity) || 1
    );

    const product = products.find(
      (p) => p.id === productId
    );

    if (!product) {
      throw Object.assign(
        new Error(
          `Product ${raw.productId} not found`
        ),
        { status: 400 }
      );
    }

    let variant = null;
    let unitPrice = Number(
      product.salePrice ?? product.price
    );
    let availableStock = product.stock;

    if (raw.variantId) {
      variant = variants.find(
        (v) =>
          v.id === Number(raw.variantId) &&
          v.productId === product.id
      );

      if (!variant) {
        throw Object.assign(
          new Error(
            `Selected variant is no longer available for ${product.name}`
          ),
          { status: 409 }
        );
      }

      availableStock = variant.stock;

      if (!variant.useProductPricing) {
        unitPrice = Number(
          variant.salePrice ?? variant.price
        );
      }
    } else {
      const variantCount =
        await prisma.productVariant.count({
          where: {
            productId: product.id,
            active: true,
          },
        });

      if (variantCount > 0) {
        throw Object.assign(
          new Error(
            `Please choose a size and colour for ${product.name}`
          ),
          { status: 400 }
        );
      }
    }

    if (quantity > availableStock) {
      throw Object.assign(
        new Error(
          `Only ${availableStock} available for ${
            product.name
          }${
            variant
              ? ` (${variant.colour} / ${variant.size})`
              : ""
          }`
        ),
        { status: 409 }
      );
    }

    subtotal += unitPrice * quantity;

    normalized.push({
      product,
      productId: product.id,
      variant,
      variantId: variant?.id || null,
      quantity,
      price: asMoney(unitPrice),
    });
  }

  return {
    items: normalized,
    subtotal: asMoney(subtotal),
  };
}

const orderInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  discount: true,
  shippingMethod: true,
  orderItems: {
    include: {
      product: true,
      variant: true,
    },
  },
};

function formatOrder(order) {
  return {
    ...order,
    items: order.orderItems || [],
  };
}

async function routeAccount(
  request,
  context,
  method,
  pathname
) {
  if (!pathname.startsWith("/api/account")) {
    return null;
  }

  try {
    const userToken =
      await getAuthenticatedUser(
        request,
        context.env
      );

    if (
      method === "GET" &&
      pathname === "/api/account/profile"
    ) {
      const user =
        await context.prisma.user.findUnique({
          where: { id: userToken.id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });

      return user
        ? json(user)
        : json(
            { message: "Account not found" },
            404
          );
    }

    if (
      method === "PUT" &&
      pathname === "/api/account/profile"
    ) {
      const body = await readJson(request);
      const name = String(
        body.name || ""
      ).trim();

      if (!name) {
        return json(
          { message: "Name is required" },
          400
        );
      }

      return json(
        await context.prisma.user.update({
          where: { id: userToken.id },
          data: { name },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })
      );
    }

    if (
      method === "PUT" &&
      pathname === "/api/account/password"
    ) {
      const body = await readJson(request);
      const {
        currentPassword,
        newPassword,
      } = body;

      if (
        !currentPassword ||
        !newPassword ||
        String(newPassword).length < 8
      ) {
        return json(
          {
            message:
              "Current password and a new password of at least 8 characters are required",
          },
          400
        );
      }

      const user =
        await context.prisma.user.findUnique({
          where: { id: userToken.id },
        });

      const valid =
        user &&
        (await bcrypt.compare(
          currentPassword,
          user.password
        ));

      if (!valid) {
        return json(
          {
            message:
              "Current password is incorrect",
          },
          401
        );
      }

      await context.prisma.user.update({
        where: { id: user.id },
        data: {
          password: await bcrypt.hash(
            newPassword,
            10
          ),
        },
      });

      return json({
        message:
          "Password changed successfully",
      });
    }

    return null;
  } catch (error) {
    return json(
      {
        message:
          error?.message ||
          "Account request failed",
      },
      error?.status || 500
    );
  }
}

async function routeWishlist(
  request,
  context,
  method,
  pathname
) {
  if (!pathname.startsWith("/api/wishlist")) {
    return null;
  }

  try {
    const user =
      await getAuthenticatedUser(
        request,
        context.env
      );

    const include = {
      product: {
        include: {
          category: true,
          images: true,
          variants: {
            where: { active: true },
            orderBy: [
              { colour: "asc" },
              { size: "asc" },
            ],
          },
        },
      },
    };

    if (
      method === "GET" &&
      pathname === "/api/wishlist"
    ) {
      return json(
        await context.prisma.wishlistItem.findMany(
          {
            where: { userId: user.id },
            include,
            orderBy: {
              createdAt: "desc",
            },
          }
        )
      );
    }

    if (
      method === "POST" &&
      pathname === "/api/wishlist"
    ) {
      const body = await readJson(request);
      const productId = numberId(
        body.productId
      );

      if (!productId) {
        return json(
          {
            message:
              "Valid productId is required",
          },
          400
        );
      }

      const product =
        await context.prisma.product.findFirst({
          where: {
            id: productId,
            published: true,
          },
        });

      if (!product) {
        return json(
          { message: "Product not found" },
          404
        );
      }

      const item =
        await context.prisma.wishlistItem.upsert(
          {
            where: {
              userId_productId: {
                userId: user.id,
                productId,
              },
            },
            update: {},
            create: {
              userId: user.id,
              productId,
            },
            include,
          }
        );

      return json(item, 201);
    }

    if (
      method === "DELETE" &&
      pathname.startsWith(
        "/api/wishlist/"
      )
    ) {
      const productId = numberId(
        pathname.split("/").pop()
      );

      if (!productId) {
        return json(
          {
            message:
              "Valid productId is required",
          },
          400
        );
      }

      await context.prisma.wishlistItem.deleteMany(
        {
          where: {
            userId: user.id,
            productId,
          },
        }
      );

      return json({
        message:
          "Removed from wishlist",
      });
    }

    return null;
  } catch (error) {
    return json(
      {
        message:
          error?.message ||
          "Wishlist request failed",
      },
      error?.status || 500
    );
  }
}

async function routeCustomers(
  request,
  context,
  method,
  pathname
) {
  if (
    !pathname.startsWith(
      "/api/admin/customers"
    )
  ) {
    return null;
  }

  try {
    const admin = await requireAdmin(
      request,
      context.env
    );

    if (
      method === "GET" &&
      pathname === "/api/admin/customers"
    ) {
      const users =
        await context.prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                orders: true,
                wishlistItems: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      return json(users);
    }

    const match = pathname.match(
      /^\/api\/admin\/customers\/(\d+)\/role$/
    );

    if (method === "PATCH" && match) {
      const targetId = numberId(match[1]);
      const body = await readJson(request);
      const role = String(
        body.role || ""
      ).toUpperCase();

      const allowed =
        admin.role === "SUPERADMIN"
          ? [
              "SUPERADMIN",
              "ADMIN",
              "CUSTOMER",
            ]
          : ["CUSTOMER"];

      if (!allowed.includes(role)) {
        return json(
          {
            message:
              "You cannot assign this role",
          },
          403
        );
      }

      if (
        targetId === admin.id &&
        role === "CUSTOMER"
      ) {
        return json(
          {
            message:
              "You cannot remove your own admin access",
          },
          400
        );
      }

      try {
        const user =
          await context.prisma.user.update({
            where: { id: targetId },
            data: { role },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          });

        return json(user);
      } catch (error) {
        if (error?.code === "P2025") {
          return json(
            { message: "User not found" },
            404
          );
        }
        throw error;
      }
    }

    return null;
  } catch (error) {
    return json(
      {
        message:
          error?.message ||
          "Customer request failed",
      },
      error?.status || 500
    );
  }
}

async function routeDashboard(
  request,
  context,
  method,
  pathname
) {
  if (
    method !== "GET" ||
    pathname !== "/api/dashboard/summary"
  ) {
    return null;
  }

  try {
    await requireAdmin(request, context.env);

    const [
      products,
      categories,
      customers,
      orders,
      revenue,
    ] = await Promise.all([
      context.prisma.product.count(),
      context.prisma.category.count(),
      context.prisma.user.count({
        where: { role: "CUSTOMER" },
      }),
      context.prisma.order.count(),
      context.prisma.order.aggregate({
        where: {
          status: {
            in: [
              "PAID",
              "PROCESSING",
              "SHIPPED",
              "DELIVERED",
            ],
          },
        },
        _sum: { total: true },
      }),
    ]);

    return json({
      products,
      categories,
      customers,
      orders,
      revenue: Number(
        revenue._sum.total || 0
      ),
    });
  } catch (error) {
    return json(
      {
        message:
          error?.message ||
          "Unable to load dashboard summary",
      },
      error?.status || 500
    );
  }
}

async function routeShipping(
  request,
  context,
  method,
  pathname
) {
  if (!pathname.startsWith("/api/shipping")) {
    return null;
  }

  try {
    const url = new URL(request.url);

    if (
      method === "GET" &&
      pathname === "/api/shipping/methods"
    ) {
      const subtotal = Number(
        url.searchParams.get("subtotal") || 0
      );

      const methods =
        await context.prisma.shippingMethod.findMany(
          {
            where: { active: true },
            orderBy: [
              { sortOrder: "asc" },
              { price: "asc" },
            ],
          }
        );

      return json(
        methods.map((method) =>
          serializeShippingMethod(
            method,
            subtotal
          )
        )
      );
    }

    await requireAdmin(request, context.env);

    if (
      method === "GET" &&
      pathname === "/api/shipping/admin"
    ) {
      const methods =
        await context.prisma.shippingMethod.findMany(
          {
            orderBy: [
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
          }
        );

      return json(
        methods.map((method) =>
          serializeShippingMethod(method, 0)
        )
      );
    }

    if (
      method === "POST" &&
      pathname === "/api/shipping/admin"
    ) {
      const body = await readJson(request);

      if (
        !String(body.name || "").trim() ||
        !String(body.code || "").trim() ||
        Number(body.price) < 0
      ) {
        return json(
          {
            message:
              "Name, code and a valid price are required",
          },
          400
        );
      }

      const data = {
        name: String(body.name).trim(),
        code: String(body.code)
          .trim()
          .toUpperCase()
          .replace(
            /[^A-Z0-9_-]/g,
            "_"
          ),
        description:
          String(
            body.description || ""
          ).trim() || null,
        price: decimalString(body.price),
        freeOver:
          body.freeOver === "" ||
          body.freeOver === null ||
          body.freeOver === undefined
            ? null
            : decimalString(body.freeOver),
        estimatedDaysMin:
          body.estimatedDaysMin === ""
            ? null
            : Number(
                body.estimatedDaysMin
              ) || null,
        estimatedDaysMax:
          body.estimatedDaysMax === ""
            ? null
            : Number(
                body.estimatedDaysMax
              ) || null,
        active: body.active !== false,
        isDefault: Boolean(
          body.isDefault
        ),
        sortOrder:
          Number(body.sortOrder) || 0,
      };

      try {
        const methodRecord =
          await context.prisma.$transaction(
            async (tx) => {
              if (data.isDefault) {
                await tx.shippingMethod.updateMany(
                  {
                    data: {
                      isDefault: false,
                    },
                  }
                );
              }

              return tx.shippingMethod.create({
                data,
              });
            }
          );

        return json(
          serializeShippingMethod(
            methodRecord,
            0
          ),
          201
        );
      } catch (error) {
        if (error?.code === "P2002") {
          return json(
            {
              message:
                "That delivery code already exists",
            },
            409
          );
        }
        throw error;
      }
    }

    const match = pathname.match(
      /^\/api\/shipping\/admin\/(\d+)$/
    );

    if (match && method === "PATCH") {
      const id = numberId(match[1]);
      const existing =
        await context.prisma.shippingMethod.findUnique(
          { where: { id } }
        );

      if (!existing) {
        return json(
          {
            message:
              "Delivery method not found",
          },
          404
        );
      }

      const body = await readJson(request);
      const data = {};

      if (body.name !== undefined) {
        data.name = String(
          body.name
        ).trim();
      }

      if (body.code !== undefined) {
        data.code = String(body.code)
          .trim()
          .toUpperCase()
          .replace(
            /[^A-Z0-9_-]/g,
            "_"
          );
      }

      if (body.description !== undefined) {
        data.description =
          String(
            body.description || ""
          ).trim() || null;
      }

      if (body.price !== undefined) {
        data.price =
          decimalString(body.price);
      }

      if (body.freeOver !== undefined) {
        data.freeOver =
          body.freeOver === "" ||
          body.freeOver === null
            ? null
            : decimalString(
                body.freeOver
              );
      }

      if (
        body.estimatedDaysMin !==
        undefined
      ) {
        data.estimatedDaysMin =
          body.estimatedDaysMin === ""
            ? null
            : Number(
                body.estimatedDaysMin
              ) || null;
      }

      if (
        body.estimatedDaysMax !==
        undefined
      ) {
        data.estimatedDaysMax =
          body.estimatedDaysMax === ""
            ? null
            : Number(
                body.estimatedDaysMax
              ) || null;
      }

      if (body.active !== undefined) {
        data.active = Boolean(
          body.active
        );
      }

      if (
        body.isDefault !== undefined
      ) {
        data.isDefault = Boolean(
          body.isDefault
        );
      }

      if (
        body.sortOrder !== undefined
      ) {
        data.sortOrder =
          Number(body.sortOrder) || 0;
      }

      const methodRecord =
        await context.prisma.$transaction(
          async (tx) => {
            if (data.isDefault) {
              await tx.shippingMethod.updateMany(
                {
                  where: {
                    id: { not: id },
                  },
                  data: {
                    isDefault: false,
                  },
                }
              );
            }

            return tx.shippingMethod.update({
              where: { id },
              data,
            });
          }
        );

      return json(
        serializeShippingMethod(
          methodRecord,
          0
        )
      );
    }

    if (match && method === "DELETE") {
      const id = numberId(match[1]);
      const orderCount =
        await context.prisma.order.count({
          where: {
            shippingMethodId: id,
          },
        });

      if (orderCount > 0) {
        const record =
          await context.prisma.shippingMethod.update(
            {
              where: { id },
              data: {
                active: false,
                isDefault: false,
              },
            }
          );

        return json({
          message:
            "Delivery method deactivated because it has order history.",
          method:
            serializeShippingMethod(
              record,
              0
            ),
        });
      }

      try {
        await context.prisma.shippingMethod.delete(
          {
            where: { id },
          }
        );

        return json({
          message:
            "Delivery method deleted",
        });
      } catch (error) {
        if (error?.code === "P2025") {
          return json(
            {
              message:
                "Delivery method not found",
            },
            404
          );
        }
        throw error;
      }
    }

    return null;
  } catch (error) {
    return json(
      {
        message:
          error?.message ||
          "Shipping request failed",
      },
      error?.status || 500
    );
  }
}

async function routeDiscounts(
  request,
  context,
  method,
  pathname
) {
  if (!pathname.startsWith("/api/discounts")) {
    return null;
  }

  try {
    if (
      method === "POST" &&
      pathname === "/api/discounts/validate"
    ) {
      const body = await readJson(request);
      const user = await optionalUser(
        request,
        context.env
      );

      const result =
        await validateDiscount(
          context.prisma,
          {
            code: body.code,
            subtotal: body.subtotal,
            userId: user?.id || null,
            email: body.email,
          }
        );

      return json({
        code: result.code,
        subtotal: result.subtotal,
        discountAmount:
          result.discountAmount,
        total: result.total,
        description:
          result.discount.description,
      });
    }

    await requireAdmin(request, context.env);

    if (
      method === "GET" &&
      pathname === "/api/discounts"
    ) {
      const discounts =
        await context.prisma.discount.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });

      return json(
        discounts.map(
          serializeDiscount
        )
      );
    }

    if (
      method === "POST" &&
      pathname === "/api/discounts"
    ) {
      const body = await readJson(request);

      const code = String(
        body.code || ""
      )
        .trim()
        .toUpperCase();

      const type = String(
        body.type || ""
      ).toUpperCase();

      const value = Number(body.value);

      if (
        !code ||
        !DISCOUNT_TYPES.has(type) ||
        !Number.isFinite(value) ||
        value <= 0
      ) {
        return json(
          {
            message:
              "Code, type and a positive value are required",
          },
          400
        );
      }

      if (
        type === "PERCENTAGE" &&
        value > 100
      ) {
        return json(
          {
            message:
              "Percentage discount cannot exceed 100%",
          },
          400
        );
      }

      const data = {
        code,
        description:
          String(
            body.description || ""
          ).trim() || null,
        type,
        value: decimalString(value),
        minimumOrder:
          body.minimumOrder === "" ||
          body.minimumOrder === null ||
          body.minimumOrder === undefined
            ? null
            : decimalString(
                body.minimumOrder
              ),
        maximumDiscount:
          body.maximumDiscount === "" ||
          body.maximumDiscount === null ||
          body.maximumDiscount ===
            undefined
            ? null
            : decimalString(
                body.maximumDiscount
              ),
        usageLimit:
          body.usageLimit === "" ||
          body.usageLimit === null ||
          body.usageLimit === undefined
            ? null
            : Number(body.usageLimit),
        perCustomerLimit:
          body.perCustomerLimit === "" ||
          body.perCustomerLimit === null ||
          body.perCustomerLimit ===
            undefined
            ? null
            : Number(
                body.perCustomerLimit
              ),
        startsAt: body.startsAt
          ? new Date(body.startsAt)
          : null,
        expiresAt: body.expiresAt
          ? new Date(body.expiresAt)
          : null,
        active: body.active !== false,
      };

      try {
        const discount =
          await context.prisma.discount.create(
            {
              data,
            }
          );

        return json(
          serializeDiscount(
            discount
          ),
          201
        );
      } catch (error) {
        if (error?.code === "P2002") {
          return json(
            {
              message:
                "A discount with this code already exists",
            },
            409
          );
        }
        throw error;
      }
    }

    const match = pathname.match(
      /^\/api\/discounts\/(\d+)$/
    );

    if (match && method === "PATCH") {
      const id = numberId(match[1]);
      const existing =
        await context.prisma.discount.findUnique(
          {
            where: { id },
          }
        );

      if (!existing) {
        return json(
          {
            message:
              "Discount not found",
          },
          404
        );
      }

      const body = await readJson(request);
      const data = {};

      if (body.code !== undefined) {
        data.code = String(body.code)
          .trim()
          .toUpperCase();
      }

      if (
        body.description !== undefined
      ) {
        data.description =
          String(
            body.description || ""
          ).trim() || null;
      }

      if (body.type !== undefined) {
        const nextType = String(
          body.type
        ).toUpperCase();

        if (
          !DISCOUNT_TYPES.has(
            nextType
          )
        ) {
          return json(
            {
              message:
                "Invalid discount type",
            },
            400
          );
        }

        data.type = nextType;
      }

      const effectiveType =
        data.type || existing.type;

      if (body.value !== undefined) {
        const value = Number(
          body.value
        );

        if (
          !Number.isFinite(value) ||
          value <= 0 ||
          (effectiveType ===
            "PERCENTAGE" &&
            value > 100)
        ) {
          return json(
            {
              message:
                "Invalid discount value",
            },
            400
          );
        }

        data.value =
          decimalString(value);
      }

      for (const key of [
        "minimumOrder",
        "maximumDiscount",
      ]) {
        if (body[key] !== undefined) {
          data[key] =
            body[key] === "" ||
            body[key] === null
              ? null
              : decimalString(
                  body[key]
                );
        }
      }

      for (const key of [
        "usageLimit",
        "perCustomerLimit",
      ]) {
        if (body[key] !== undefined) {
          data[key] =
            body[key] === "" ||
            body[key] === null
              ? null
              : Number(body[key]);
        }
      }

      if (
        body.startsAt !== undefined
      ) {
        data.startsAt = body.startsAt
          ? new Date(body.startsAt)
          : null;
      }

      if (
        body.expiresAt !== undefined
      ) {
        data.expiresAt =
          body.expiresAt
            ? new Date(
                body.expiresAt
              )
            : null;
      }

      if (
        body.active !== undefined
      ) {
        data.active = Boolean(
          body.active
        );
      }

      try {
        const discount =
          await context.prisma.discount.update(
            {
              where: { id },
              data,
            }
          );

        return json(
          serializeDiscount(
            discount
          )
        );
      } catch (error) {
        if (error?.code === "P2002") {
          return json(
            {
              message:
                "A discount with this code already exists",
            },
            409
          );
        }
        throw error;
      }
    }

    if (match && method === "DELETE") {
      const id = numberId(match[1]);

      const usageCount =
        await context.prisma.discountUsage.count(
          {
            where: {
              discountId: id,
            },
          }
        );

      if (usageCount > 0) {
        const discount =
          await context.prisma.discount.update(
            {
              where: { id },
              data: {
                active: false,
              },
            }
          );

        return json({
          message:
            "Discount has order history, so it was deactivated instead of deleted",
          discount:
            serializeDiscount(
              discount
            ),
        });
      }

      try {
        await context.prisma.discount.delete(
          {
            where: { id },
          }
        );

        return json({
          message: "Discount deleted",
        });
      } catch (error) {
        if (error?.code === "P2025") {
          return json(
            {
              message:
                "Discount not found",
            },
            404
          );
        }
        throw error;
      }
    }

    return null;
  } catch (error) {
    return json(
      {
        message:
          error?.message ||
          "Discount request failed",
      },
      error?.status || 500
    );
  }
}

async function routeOrders(
  request,
  context,
  method,
  pathname
) {
  if (
    !pathname.startsWith("/api/orders") &&
    !pathname.startsWith(
      "/api/admin/orders"
    )
  ) {
    return null;
  }

  try {
    // Existing customer/guest create route.
    if (
      method === "POST" &&
      pathname === "/api/orders"
    ) {
      const body = await readJson(request);
      const user = await optionalUser(
        request,
        context.env
      );

      const customerName = String(
        body.customerName || ""
      ).trim();

      const customerEmail = String(
        body.customerEmail || ""
      )
        .trim()
        .toLowerCase();

      const shippingAddress = String(
        body.shippingAddress || ""
      ).trim();

      const items = body.items;

      if (
        !customerName ||
        !customerEmail ||
        !shippingAddress ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return json(
          {
            message:
              "Customer details and items are required",
          },
          400
        );
      }

      const priced = await priceItems(
        context.prisma,
        items
      );

      let discountResult = null;

      if (
        body.discountCode &&
        String(
          body.discountCode
        ).trim()
      ) {
        discountResult =
          await validateDiscount(
            context.prisma,
            {
              code: body.discountCode,
              subtotal:
                priced.subtotal,
              userId:
                user?.id || null,
              email:
                customerEmail,
            }
          );
      }

      const afterDiscount =
        asMoney(
          priced.subtotal -
            (discountResult?.discountAmount ||
              0)
        );

      const shippingMethod =
        await activeShippingMethod(
          context.prisma,
          body.shippingMethodId,
          afterDiscount
        );

      const shipping =
        shippingMethod.effectivePrice;

      const total = asMoney(
        afterDiscount + shipping
      );

      const order =
        await context.prisma.$transaction(
          async (tx) => {
            for (const item of priced.items) {
              if (item.variantId) {
                const updated =
                  await tx.productVariant.updateMany(
                    {
                      where: {
                        id: item.variantId,
                        active: true,
                        stock: {
                          gte:
                            item.quantity,
                        },
                      },
                      data: {
                        stock: {
                          decrement:
                            item.quantity,
                        },
                      },
                    }
                  );

                if (updated.count !== 1) {
                  throw Object.assign(
                    new Error(
                      "Variant stock changed while placing the order. Please refresh your basket."
                    ),
                    { status: 409 }
                  );
                }

                await tx.product.update({
                  where: {
                    id: item.productId,
                  },
                  data: {
                    stock: {
                      decrement:
                        item.quantity,
                    },
                  },
                });
              } else {
                const updated =
                  await tx.product.updateMany(
                    {
                      where: {
                        id: item.productId,
                        stock: {
                          gte:
                            item.quantity,
                        },
                      },
                      data: {
                        stock: {
                          decrement:
                            item.quantity,
                        },
                      },
                    }
                  );

                if (updated.count !== 1) {
                  throw Object.assign(
                    new Error(
                      "Stock changed while placing the order. Please refresh your basket."
                    ),
                    { status: 409 }
                  );
                }
              }
            }

            const created =
              await tx.order.create({
                data: {
                  userId:
                    user?.id || null,
                  customerName,
                  customerEmail,
                  shippingAddress,
                  subtotal:
                    decimalString(
                      priced.subtotal
                    ),
                  discountAmount:
                    decimalString(
                      discountResult?.discountAmount ||
                        0
                    ),
                  shippingAmount:
                    decimalString(
                      shipping
                    ),
                  total:
                    decimalString(total),
                  discountCode:
                    discountResult?.code ||
                    null,
                  discountId:
                    discountResult?.discount
                      ?.id || null,
                  shippingMethodId:
                    shippingMethod.id,
                  shippingMethodName:
                    shippingMethod.name,
                  shippingEstimate:
                    shippingMethod.estimate,
                  orderItems: {
                    create:
                      priced.items.map(
                        (item) => ({
                          productId:
                            item.productId,
                          variantId:
                            item.variantId,
                          quantity:
                            item.quantity,
                          price:
                            decimalString(
                              item.price
                            ),
                          variantSize:
                            item.variant
                              ?.size ||
                            null,
                          variantColour:
                            item.variant
                              ?.colour ||
                            null,
                          variantSku:
                            item.variant
                              ?.sku ||
                            null,
                        })
                      ),
                  },
                },
                include:
                  orderInclude,
              });

            if (
              discountResult?.discount
                ?.id
            ) {
              await tx.discount.update({
                where: {
                  id: discountResult
                    .discount.id,
                },
                data: {
                  usageCount: {
                    increment: 1,
                  },
                },
              });

              await tx.discountUsage.create({
                data: {
                  discountId:
                    discountResult
                      .discount.id,
                  userId:
                    user?.id || null,
                  email:
                    customerEmail,
                  orderId: created.id,
                  amount:
                    decimalString(
                      discountResult.discountAmount
                    ),
                },
              });
            }

            return created;
          }
        );

      return json(
        formatOrder(order),
        201
      );
    }

    if (
      method === "GET" &&
      pathname === "/api/orders/mine"
    ) {
      const user =
        await getAuthenticatedUser(
          request,
          context.env
        );

      const orders =
        await context.prisma.order.findMany({
          where: {
            userId: user.id,
          },
          include: orderInclude,
          orderBy: {
            createdAt: "desc",
          },
        });

      return json(
        orders.map(formatOrder)
      );
    }

    // Existing /api/orders/admin/all route.
    if (
      method === "GET" &&
      pathname === "/api/orders/admin/all"
    ) {
      await requireProductOrderStaff(
  request,
  context.env
);

      const orders =
        await context.prisma.order.findMany({
          include: orderInclude,
          orderBy: {
            createdAt: "desc",
          },
        });

      return json(
        orders.map(formatOrder)
      );
    }

    const legacyStatusMatch =
      pathname.match(
        /^\/api\/orders\/(\d+)\/status$/
      );

    if (
      method === "PATCH" &&
      legacyStatusMatch
    ) {
      await requireProductOrderStaff(
  request,
  context.env
);

      const body = await readJson(request);
      const status = String(
        body.status || ""
      ).toUpperCase();

      if (
        !ORDER_STATUSES.has(status)
      ) {
        return json(
          {
            message:
              "Invalid order status",
          },
          400
        );
      }

      try {
        return json(
          await context.prisma.order.update(
            {
              where: {
                id: Number(
                  legacyStatusMatch[1]
                ),
              },
              data: { status },
            }
          )
        );
      } catch (error) {
        if (error?.code === "P2025") {
          return json(
            {
              message:
                "Order not found",
            },
            404
          );
        }
        throw error;
      }
    }

    // Admin UI route group.
    if (
      method === "GET" &&
      pathname === "/api/admin/orders"
    ) {
     await requireProductOrderStaff(
  request,
  context.env
);

      const orders =
        await context.prisma.order.findMany({
          include: orderInclude,
          orderBy: {
            createdAt: "desc",
          },
        });

      return json(
        orders.map(formatOrder)
      );
    }

    const adminOrderMatch =
      pathname.match(
        /^\/api\/admin\/orders\/(\d+)$/
      );

    if (
      method === "GET" &&
      adminOrderMatch
    ) {
await requireProductOrderStaff(
  request,
  context.env
);

      const order =
        await context.prisma.order.findUnique({
          where: {
            id: Number(
              adminOrderMatch[1]
            ),
          },
          include: orderInclude,
        });

      return order
        ? json(formatOrder(order))
        : json(
            {
              message:
                "Order not found",
            },
            404
          );
    }

    const adminStatusMatch =
      pathname.match(
        /^\/api\/admin\/orders\/(\d+)\/status$/
      );

    if (
      method === "PATCH" &&
      adminStatusMatch
    ) {
await requireProductOrderStaff(
  request,
  context.env
);

      const body = await readJson(request);
      const status = String(
        body.status || ""
      ).toUpperCase();

      if (
        !ORDER_STATUSES.has(status)
      ) {
        return json(
          {
            message:
              "Invalid order status",
          },
          400
        );
      }

      try {
        const order =
          await context.prisma.order.update({
            where: {
              id: Number(
                adminStatusMatch[1]
              ),
            },
            data: { status },
            include: orderInclude,
          });

        return json(
          formatOrder(order)
        );
      } catch (error) {
        if (error?.code === "P2025") {
          return json(
            {
              message:
                "Order not found",
            },
            404
          );
        }
        throw error;
      }
    }

    return null;
  } catch (error) {
    console.error(
      "Order request failed:",
      error
    );

    return json(
      {
        message:
          error?.message ||
          "Order request failed",
      },
      error?.status || 500
    );
  }
}

export async function handleCommerceRoutes(
  request,
  context
) {
  const url = new URL(request.url);
  const pathname =
    url.pathname.replace(/\/+$/, "") ||
    "/";
  const method =
    request.method.toUpperCase();

 const handlers = [
  routeAccount,
  routeWishlist,
  routeDashboard,
  routeShipping,
  routeDiscounts,
  routeOrders,
];

  for (const handler of handlers) {
    const response = await handler(
      request,
      context,
      method,
      pathname
    );

    if (response) return response;
  }

  return null;
}
