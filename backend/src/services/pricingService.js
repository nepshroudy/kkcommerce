const prisma = require('../utils/prisma');
const { getShippingMethodForOrder } = require('./shippingService');

async function calculateOrderPricing({ items, discountAmount = 0, promotion = null, shippingMethodId = null }) {
  const productIds = [...new Set(items.map((i) => Number(i.productId)).filter(Boolean))];
  const variantIds = [...new Set(items.map((i) => Number(i.variantId)).filter(Boolean))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, published: true } });
  const variants = variantIds.length ? await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, active: true }, include: { product: true },
  }) : [];

  let subtotal = 0;
  const normalizedItems = [];
  for (const item of items) {
    const product = products.find((p) => p.id === Number(item.productId));
    if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });
    const quantity = Math.max(1, Number(item.quantity) || 1);
    let variant = null;
    let unitPrice = Number(product.salePrice ?? product.price);
    let availableStock = product.stock;

    if (item.variantId) {
      variant = variants.find((v) => v.id === Number(item.variantId) && v.productId === product.id);
      if (!variant) throw Object.assign(new Error(`Selected variant is no longer available for ${product.name}`), { status: 409 });
      availableStock = variant.stock;
      if (!variant.useProductPricing) unitPrice = Number(variant.salePrice ?? variant.price);
    } else {
      const variantCount = await prisma.productVariant.count({ where: { productId: product.id, active: true } });
      if (variantCount > 0) throw Object.assign(new Error(`Please choose a size and colour for ${product.name}`), { status: 400 });
    }

    if (quantity > availableStock) throw Object.assign(new Error(`Only ${availableStock} available for ${product.name}${variant ? ` (${variant.colour} / ${variant.size})` : ''}`), { status: 409 });
    subtotal += unitPrice * quantity;
    normalizedItems.push({ productId: product.id, variantId: variant?.id || null, quantity, price: unitPrice, product, variant });
  }

  subtotal = Number(subtotal.toFixed(2));
  let promotionDiscount = 0;
  if (promotion) {
    if (promotion.type === 'PERCENTAGE') promotionDiscount = subtotal * (Number(promotion.value) / 100);
    else if (promotion.type === 'FIXED_AMOUNT') promotionDiscount = Number(promotion.value);
    else if (promotion.type === 'BUY_X_GET_Y') {
      const quantities = normalizedItems.reduce((sum, i) => sum + i.quantity, 0);
      if (quantities >= Number(promotion.buyQuantity || 2)) promotionDiscount = Math.min(...normalizedItems.map((i) => i.price)) * Number(promotion.getQuantity || 1);
    }
  }
  const totalDiscount = Number((discountAmount + promotionDiscount).toFixed(2));
  const afterDiscount = Math.max(0, subtotal - totalDiscount);
  const shippingMethod = await getShippingMethodForOrder(shippingMethodId, afterDiscount);
  let shipping = shippingMethod.effectivePrice;
  if (promotion?.type === 'FREE_SHIPPING') shipping = 0;
  const total = Number((afterDiscount + shipping).toFixed(2));
  return {
    items: normalizedItems,
    subtotal,
    discount: totalDiscount,
    shipping,
    total,
    shippingMethod,
    freeShippingThreshold: shippingMethod.freeOver,
    freeShippingUnlocked: shipping === 0,
    amountUntilFreeShipping: shippingMethod.freeOver === null
      ? null
      : Math.max(0, Number((shippingMethod.freeOver - afterDiscount).toFixed(2))),
  };
}

module.exports = { calculateOrderPricing };
