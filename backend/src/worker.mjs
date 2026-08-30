import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { routeRequest } from "./worker/router.mjs";

export default {
  async fetch(request, env, ctx) {
    const adapter = new PrismaPg({
      connectionString: env.HYPERDRIVE.connectionString,
    });

    const prisma = new PrismaClient({ adapter });

    const requestContext = {
      env,
      ctx,
      prisma,
      runtime: "cloudflare-workers",
    };

    try {
      return await routeRequest(request, requestContext);
    } catch (error) {
      console.error("Unhandled Worker error:", error);

      return Response.json(
        {
          message: "Internal server error",
          ...(env.NODE_ENV !== "production"
            ? { error: error?.message || String(error) }
            : {}),
        },
        { status: 500 }
      );
    } finally {
      ctx.waitUntil(
        prisma.$disconnect().catch((error) => {
          console.error("Prisma disconnect failed:", error);
        })
      );
    }
  },
};
