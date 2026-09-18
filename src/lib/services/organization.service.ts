// OSSUM COR — Organization service
// Organization is the tenant root — no companyId filter needed.
// Services receive prisma as dependency injection.

import type { PrismaClient } from "@prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────

export async function listOrganizations(prisma: PrismaClient) {
  return prisma.organization.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getOrganizationById(
  prisma: PrismaClient,
  id: string
) {
  return prisma.organization.findUnique({
    where: { id },
  });
}

export async function getOrganizationBySlug(
  prisma: PrismaClient,
  slug: string
) {
  return prisma.organization.findUnique({
    where: { slug },
  });
}

// ─── Create ───────────────────────────────────────────────────────────

export async function createOrganization(
  prisma: PrismaClient,
  data: { name: string; slug: string; taxId?: string }
) {
  return prisma.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      taxId: data.taxId,
    },
  });
}

// ─── Update ────────────────────────────────────────────────────────────

export async function updateOrganization(
  prisma: PrismaClient,
  id: string,
  data: { name?: string; slug?: string; taxId?: string | null }
) {
  return prisma.organization.update({
    where: { id },
    data,
  });
}

// ─── Soft delete ──────────────────────────────────────────────────────

export async function deactivateOrganization(
  prisma: PrismaClient,
  id: string
) {
  return prisma.organization.update({
    where: { id },
    data: { isActive: false },
  });
}