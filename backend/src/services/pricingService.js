const prisma = require("../utils/prisma");

const DEFAULT_SHIPPING = {
  standardRate: 3.99,
  freeShippingThreshold: 35.0,
};

async function getShippingSettings() {
  // Placeholder for future admin-configurable settings.
  return DEFAULT_SHIPPING;
}

async function calculateOrderPricing({
  items,
  discountAmount = 0,
  promotion = null,
}) {
  const productIds = [
    ...new Set(items.map((i) => Number(i.productId)).filter(Boolean)),
  ];

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      published: true,
    },
  });

  let subtotal = 0;
  const normalizedItems = [];

  for (const item of items) {
    const product = products.find((p) => p.id === Number(item.productId));

    if (!product) {
      const error = new Error(`Product ${item.productId} not found`);
      error.status = 400;
      throw error;
    }

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Number(product.salePrice ?? product.price);

    subtotal += unitPrice * quantity;

    normalizedItems.push({
      productId: product.id,
      quantity,
      price: unitPrice,
      product,
    });
  }

  subtotal = Number(subtotal.toFixed(2));

  let promotionDiscount = 0;

  if (promotion) {
    switch (promotion.type) {
      case "PERCENTAGE":
        promotionDiscount = subtotal * (Number(promotion.value) / 100);
        break;

      case "FIXED_AMOUNT":
        promotionDiscount = Number(promotion.value);
        break;

      case "BUY_X_GET_Y": {
        const quantities = normalizedItems
          .map((i) => i.quantity)
          .reduce((a, b) => a + b, 0);

        if (quantities >= Number(promotion.buyQuantity || 2)) {
          const cheapest = Math.min(...normalizedItems.map((i) => i.price));
          promotionDiscount = cheapest * Number(promotion.getQuantity || 1);
        }

        break;
      }

      default:
        promotionDiscount = 0;
    }
  }

  const totalDiscount = Number(
    (discountAmount + promotionDiscount).toFixed(2)
  );

  const afterDiscount = Math.max(0, subtotal - totalDiscount);

  const shippingSettings = await getShippingSettings();

  let shipping = shippingSettings.standardRate;

  if (afterDiscount >= shippingSettings.freeShippingThreshold) {
    shipping = 0;
  }

  if (promotion?.type === "FREE_SHIPPING") {
    shipping = 0;
  }

  const total = Number((afterDiscount + shipping).toFixed(2));

  return {
    items: normalizedItems,
    subtotal,
    discount: totalDiscount,
    shipping,
    total,
    freeShippingThreshold: shippingSettings.freeShippingThreshold,
    freeShippingUnlocked: shipping === 0,
    amountUntilFreeShipping: Math.max(
      0,
      Number((shippingSettings.freeShippingThreshold - afterDiscount).toFixed(2))
    ),
  };
}

module.exports = {
  calculateOrderPricing,
  getShippingSettings,
};