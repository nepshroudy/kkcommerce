const Stripe = require("stripe");
const prisma = require("../utils/prisma");
const { validateDiscount } = require("./discountController");
const { calculateOrderPricing } = require("../services/pricingService");

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("STRIPE_SECRET_KEY is not configured.");
    error.status = 500;
    throw error;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const orderInclude = {
  orderItems: { include: { product: true, variant: true } },
  shippingMethod: true,
  discount: true,
};

async function reserveStock(tx, items) {
  for (const item of items) {
    if (item.variantId) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, active: true, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) {
        throw Object.assign(new Error("Stock changed while starting payment. Please refresh your basket."), { status: 409 });
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    } else {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) {
        throw Object.assign(new Error("Stock changed while starting payment. Please refresh your basket."), { status: 409 });
      }
    }
  }
}

async function restoreReservedStock(tx, order) {
  if (!order.stockReservedAt || order.stockReleasedAt || order.paymentStatus === "PAID") return;

  for (const item of order.orderItems) {
    if (item.variantId) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      }).catch(() => null);
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    } else {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }

  await tx.order.update({
    where: { id: order.id },
    data: {
      stockReleasedAt: new Date(),
      paymentStatus: "FAILED",
      status: "CANCELLED",
    },
  });

  if (order.discountId) {
    const usage = await tx.discountUsage.findUnique({ where: { orderId: order.id } });
    if (usage) {
      await tx.discountUsage.delete({ where: { orderId: order.id } });
      await tx.discount.update({
        where: { id: order.discountId },
        data: { usageCount: { decrement: 1 } },
      });
    }
  }
}

async function markPaid(orderId, session) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id: Number(orderId) } });
    if (!existing || existing.paymentStatus === "PAID") return existing;

    return tx.order.update({
      where: { id: existing.id },
      data: {
        paymentStatus: "PAID",
        status: "PAID",
        paymentCompletedAt: new Date(),
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      },
    });
  });
}

async function releaseOrder(orderId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: Number(orderId) },
      include: { orderItems: true },
    });
    if (!order) return null;
    await restoreReservedStock(tx, order);
    return order;
  });
}

exports.createCheckoutSession = async (req, res) => {
  if (String(process.env.PAYMENTS_ENABLED || "false").toLowerCase() !== "true") {
    return res.status(503).json({
      message:
        "Online payments are temporarily disabled while the store is being prepared for launch.",
      code: "PAYMENTS_DISABLED",
    });
  }
  let createdOrderId = null;
  try {
    const { customerName, customerEmail, shippingAddress, items, discountCode, shippingMethodId } = req.body;

    if (!customerName?.trim() || !customerEmail?.trim() || !shippingAddress?.trim() || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Customer details and basket items are required." });
    }

    const initial = await calculateOrderPricing({ items, shippingMethodId });
    let discountResult = null;

    if (discountCode && String(discountCode).trim()) {
      discountResult = await validateDiscount({
        code: String(discountCode).trim(),
        subtotal: initial.subtotal,
        userId: req.user?.id || null,
        email: customerEmail,
      });
    }

    const pricing = await calculateOrderPricing({
      items,
      shippingMethodId,
      discountAmount: discountResult?.discountAmount || 0,
    });

    const normalizedEmail = String(customerEmail).trim().toLowerCase();

    const order = await prisma.$transaction(async (tx) => {
      await reserveStock(tx, pricing.items);

      const created = await tx.order.create({
        data: {
          userId: req.user?.id || null,
          customerName: customerName.trim(),
          customerEmail: normalizedEmail,
          shippingAddress: shippingAddress.trim(),
          subtotal: pricing.subtotal.toFixed(2),
          discountAmount: pricing.discount.toFixed(2),
          shippingAmount: pricing.shipping.toFixed(2),
          total: pricing.total.toFixed(2),
          discountCode: discountResult?.code || null,
          discountId: discountResult?.discount?.id || null,
          shippingMethodId: pricing.shippingMethod.id,
          shippingMethodName: pricing.shippingMethod.name,
          shippingEstimate: pricing.shippingMethod.estimate,
          stockReservedAt: new Date(),
          orderItems: {
            create: pricing.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price.toFixed(2),
              variantSize: item.variant?.size || null,
              variantColour: item.variant?.colour || null,
              variantSku: item.variant?.sku || null,
            })),
          },
        },
      });

      if (discountResult?.discount?.id) {
        await tx.discount.update({
          where: { id: discountResult.discount.id },
          data: { usageCount: { increment: 1 } },
        });
        await tx.discountUsage.create({
          data: {
            discountId: discountResult.discount.id,
            userId: req.user?.id || null,
            email: normalizedEmail,
            orderId: created.id,
            amount: pricing.discount.toFixed(2),
          },
        });
      }

      return created;
    });

    createdOrderId = order.id;

    const stripe = getStripe();
    const frontend = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
    const summary = pricing.items
      .map((item) => `${item.product.name}${item.variant ? ` (${item.variant.colour}/${item.variant.size})` : ""} × ${item.quantity}`)
      .join(", ")
      .slice(0, 450);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${frontend}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontend}/checkout?payment=cancelled`,
      customer_email: normalizedEmail,
      client_reference_id: String(order.id),
      metadata: { orderId: String(order.id) },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(pricing.total * 100),
          product_data: {
            name: `KK Closet Order #${order.id}`,
            description: summary || "Fashion order",
          },
        },
      }],
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    res.status(201).json({
      orderId: order.id,
      sessionId: session.id,
      url: session.url,
      total: pricing.total,
    });
  } catch (error) {
    console.error("createCheckoutSession error:", error);
    if (createdOrderId) {
      await releaseOrder(createdOrderId).catch((releaseError) => console.error("Failed to release checkout reservation:", releaseError));
    }
    res.status(error.status || 500).json({ message: error.message || "Unable to start secure payment." });
  }
};

exports.webhook = async (req, res) => {
  if (String(process.env.PAYMENTS_ENABLED || "false").toLowerCase() !== "true") {
    return res.status(200).json({ received: true, paymentsEnabled: false });
  }
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).send("STRIPE_WEBHOOK_SECRET is not configured.");
    }

    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const session = event.data.object;
    const orderId = session.metadata?.orderId || session.client_reference_id;

    if (orderId) {
      if (
        (event.type === "checkout.session.completed" && session.payment_status === "paid") ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        await markPaid(orderId, session);
      }

      if (
        event.type === "checkout.session.expired" ||
        event.type === "checkout.session.async_payment_failed"
      ) {
        await releaseOrder(orderId);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

exports.getSessionStatus = async (req, res) => {
  if (String(process.env.PAYMENTS_ENABLED || "false").toLowerCase() !== "true") {
    return res.status(503).json({
      message: "Online payments are currently disabled.",
      code: "PAYMENTS_DISABLED",
    });
  }
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const orderId = session.metadata?.orderId || session.client_reference_id;

    if (orderId && session.payment_status === "paid") {
      await markPaid(orderId, session);
    }

    const order = orderId
      ? await prisma.order.findUnique({ where: { id: Number(orderId) }, include: orderInclude })
      : null;

    res.json({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      status: session.status,
      order,
    });
  } catch (_error) {
    res.status(500).json({ message: "Unable to confirm payment status." });
  }
};
