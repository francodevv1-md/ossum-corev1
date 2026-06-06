// OSSUM COR — Prisma Client runtime singleton
// Uses DATABASE_URL (transaction pooler) for app runtime.
// NOT for seed — seed uses DIRECT_URL via adapter directly.
// Coexists with src/lib/db.ts (legacy) until migration complete.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;