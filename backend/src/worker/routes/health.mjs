export async function healthRoute(_request, context) {
  const { env, prisma } = context;

  let database = "unknown";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch (error) {
    console.error("Health database check failed:", error);
    database = "error";
  }

  return Response.json(
    {
      status: database === "connected" ? "ok" : "degraded",
      service: "kkcommerce-backend",
      runtime: "cloudflare-workers",
      environment: env.NODE_ENV || "production",
      paymentsEnabled:
        String(env.PAYMENTS_ENABLED || "false").toLowerCase() === "true",
      database: {
        provider: "neon-via-hyperdrive",
        status: database,
      },
      bindings: {
        hyperdrive: Boolean(env.HYPERDRIVE),
        productImages: Boolean(env.PRODUCT_IMAGES),
      },
    },
    { status: database === "connected" ? 200 : 503 }
  );
}
