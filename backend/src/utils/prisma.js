const { AsyncLocalStorage } = require("node:async_hooks");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prismaStorage = new AsyncLocalStorage();
let localPrisma = null;

function createPrisma(connectionString) {
  if (!connectionString) {
    throw new Error("A PostgreSQL connection string is required.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrisma() {
  // Cloudflare Worker requests get their own Prisma client through
  // AsyncLocalStorage. This keeps concurrent Worker requests isolated.
  const requestPrisma = prismaStorage.getStore();
  if (requestPrisma) {
    return requestPrisma;
  }

  // Local Node development keeps one lazy singleton using DATABASE_URL
  // from backend/.env.
  if (!localPrisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not configured. Local Node uses backend/.env; Cloudflare Workers uses the HYPERDRIVE binding."
      );
    }

    localPrisma = createPrisma(process.env.DATABASE_URL);
  }

  return localPrisma;
}

function runWithPrisma(prisma, callback) {
  return prismaStorage.run(prisma, callback);
}

// Existing controllers can keep doing:
//   const prisma = require("../utils/prisma");
//   await prisma.product.findMany(...);
//
// The Proxy resolves those operations to the request-scoped Worker client,
// or to the local singleton when running with `npm start`.
const prismaProxy = new Proxy(
  {
    createPrisma,
    getPrisma,
    runWithPrisma,
  },
  {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) {
        return Reflect.get(target, property, receiver);
      }

      const client = getPrisma();
      const value = client[property];

      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

module.exports = prismaProxy;
