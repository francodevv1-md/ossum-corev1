// OSSUM COR — Prisma Client runtime singleton
// Uses DATABASE_URL (transaction pooler) for app runtime.
// NOT for seed — seed uses DIRECT_URL via adapter directly.
// Coexists with src/lib/db.ts (legacy) until migration complete.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for Prisma runtime");
}

export const prismaPool =
  globalForPrisma.prismaPool ??
  new Pool({ connectionString });

const adapter = new PrismaPg(prismaPool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = prismaPool;
}

export default prisma;
