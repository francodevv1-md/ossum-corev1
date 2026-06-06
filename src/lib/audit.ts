// OSSUM COR — Audit helper
// Thin wrapper around prisma.auditEvent.create().
// Services call this after critical write operations.
// Does NOT audit reads in V1.

import type { PrismaClient } from "@prisma/client";

export interface AuditEventInput {
  prisma: PrismaClient;
  companyId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  module: string;
  detail?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}

/**
 * Create an audit event record.
 * Services pass their prisma instance — no global import needed.
 * oldValue/newValue/metadata are stored as Json if provided.
 */
export async function createAuditEvent(input: AuditEventInput) {
  return input.prisma.auditEvent.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      module: input.module,
      detail: input.detail,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      metadata: input.metadata ?? undefined,
    },
  });
}