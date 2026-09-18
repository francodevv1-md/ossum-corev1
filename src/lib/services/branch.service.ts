// OSSUM COR — Branch service
// Every operational query MUST filter by companyId.
// Services receive prisma as dependency injection.

import type { PrismaClient } from "@prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────

/** List active branches for a company. */
export async function listBranchesByCompany(
  prisma: PrismaClient,
  companyId: string
) {
  return prisma.branch.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });
}

/** Get a single branch by ID. Returns null if not found or inactive. */
export async function getBranchById(
  prisma: PrismaClient,
  companyId: string,
  id: string
) {
  return prisma.branch.findFirst({
    where: { id, companyId, isActive: true },
  });
}

// ─── Create ───────────────────────────────────────────────────────────

export async function createBranch(
  prisma: PrismaClient,
  companyId: string,
  data: { name: string; address?: string; phone?: string }
) {
  return prisma.branch.create({
    data: {
      companyId,
      name: data.name,
      address: data.address,
      phone: data.phone,
    },
  });
}

// ─── Update ────────────────────────────────────────────────────────────

export async function updateBranch(
  prisma: PrismaClient,
  companyId: string,
  id: string,
  data: { name?: string; address?: string | null; phone?: string | null }
) {
  // Verify branch belongs to company before updating
  const branch = await prisma.branch.findFirst({
    where: { id, companyId },
  });
  if (!branch) {
    throw new Error(`Branch ${id} not found in company ${companyId}`);
  }
  return prisma.branch.update({
    where: { id },
    data,
  });
}

// ─── Soft delete ──────────────────────────────────────────────────────

export async function deactivateBranch(
  prisma: PrismaClient,
  companyId: string,
  id: string
) {
  // Verify branch belongs to company before deactivating
  const branch = await prisma.branch.findFirst({
    where: { id, companyId },
  });
  if (!branch) {
    throw new Error(`Branch ${id} not found in company ${companyId}`);
  }
  return prisma.branch.update({
    where: { id },
    data: { isActive: false },
  });
}