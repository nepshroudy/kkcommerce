import { httpServerHandler } from "cloudflare:node";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import prismaContext from "./utils/prisma.js";
import appModule from "./app.js";

const app = appModule?.default || appModule;
const { runWithPrisma } = prismaContext;

const PORT = 5000;

// Cloudflare's Node HTTP bridge supports Express listening at module scope.
// No database connection or Hyperdrive connection string is touched here.
app.listen(PORT);

const expressHandler = httpServerHandler({ port: PORT });

export default {
  async fetch(request, env, ctx) {
    // Hyperdrive must be accessed inside the request handler.
    // Creating the Prisma adapter/client here avoids Cloudflare error 10021:
    // "Disallowed operation called within global scope."
    const adapter = new PrismaPg({
      connectionString: env.HYPERDRIVE.connectionString,
    });

    const prisma = new PrismaClient({ adapter });

    try {
      return await runWithPrisma(prisma, () =>
        expressHandler.fetch(request, env, ctx)
      );
    } finally {
      // Hyperdrive owns the underlying pooled connections. Disconnect the
      // request-scoped Prisma client after the request finishes.
      ctx.waitUntil(
        prisma.$disconnect().catch((error) => {
          console.error("Prisma disconnect failed:", error);
        })
      );
    }
  },
};
