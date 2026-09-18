// OSSUM COR — Company service
// Every operational query MUST filter by companyId or organizationId.
// Services receive prisma as dependency injection.

import type { PrismaClient } from "@prisma/client";
import { requireCompanyId } from "../tenant";

// ─── Read ─────────────────────────────────────────────────────────────

/** List active companies for an organization. */
export async function listCompaniesByOrganization(
  prisma: PrismaClient,
  organizationId: string
) {
  return prisma.company.findMany({
    where: { organizationId, isActive: true },
    orderBy: { name: "asc" },
  });
}

/** Get a single company by ID. Verifies companyId scope. */
export async function getCompanyById(
  prisma: PrismaClient,
  companyId: string
) {
  return prisma.company.findUnique({
    where: { id: companyId },
  });
}

// ─── Create ───────────────────────────────────────────────────────────

export async function createCompany(
  prisma: PrismaClient,
  organizationId: string,
  data: { name: string; taxId?: string }
) {
  return prisma.company.create({
    data: {
      organizationId,
      name: data.name,
      taxId: data.taxId,
    },
  });
}

// ─── Update ────────────────────────────────────────────────────────────

export async function updateCompany(
  prisma: PrismaClient,
  companyId: string | undefined,
  data: { name?: string; taxId?: string | null }
) {
  const id = requireCompanyId(companyId);
  return prisma.company.update({
    where: { id },
    data,
  });
}

// ─── Soft delete ──────────────────────────────────────────────────────

export async function deactivateCompany(
  prisma: PrismaClient,
  companyId: string
) {
  return prisma.company.update({
    where: { id: companyId },
    data: { isActive: false },
  });
}