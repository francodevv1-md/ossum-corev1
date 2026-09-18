// OSSUM COR — AuditEvent service
// Minimal CRUD for audit events.
// Every query filters by companyId (tenant safety).

import type { PrismaClient } from "@prisma/client";
import { createAuditEvent, type AuditEventInput } from "../audit";

// ─── Create ──────────────────────────────────────────────────────────

export { createAuditEvent, type AuditEventInput };

// ─── Read ─────────────────────────────────────────────────────────────

/**
 * List audit events for a specific entity within a company.
 * Uses the composite index on (entityType, entityId) and (companyId, createdAt).
 */
export async function listAuditEventsByEntity(
  prisma: PrismaClient,
  companyId: string,
  entityType: string,
  entityId: string,
  options?: { take?: number }
) {
  return prisma.auditEvent.findMany({
    where: {
      companyId,
      entityType,
      entityId,
    },
    orderBy: { createdAt: "desc" },
    take: options?.take ?? 50,
  });
}

/**
 * List audit events for a company, optionally filtered by module or date range.
 * Uses the composite index on (companyId, createdAt).
 */
export async function listAuditEventsByCompany(
  prisma: PrismaClient,
  companyId: string,
  options?: {
    module?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    take?: number;
  }
) {
  return prisma.auditEvent.findMany({
    where: {
      companyId,
      ...(options?.module ? { module: options.module } : {}),
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.from || options?.to
        ? {
            createdAt: {
              ...(options?.from ? { gte: options.from } : {}),
              ...(options?.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.take ?? 50,
  });
}