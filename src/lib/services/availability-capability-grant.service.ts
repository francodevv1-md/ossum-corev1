import type { Prisma } from "@prisma/client";
import { forbidden, conflict } from "../api/errors";
import { createAuditEvent } from "../audit";
import {
  isAvailabilityCapability,
  type AvailabilityCapability,
} from "../permissions/availability-request";
type GrantInput = {
  companyId: string;
  actorUserId: string;
  targetUserId: string;
  capability: AvailabilityCapability;
};
type RevokeInput = GrantInput & { reason: string };
function deny(): never {
  throw forbidden("Availability capability operation is not authorized", "availability_forbidden");
}
async function requireActiveParticipants(
  tx: Prisma.TransactionClient,
  input: GrantInput
): Promise<void> {
  if (
    !input.companyId?.trim() ||
    !input.actorUserId?.trim() ||
    !input.targetUserId?.trim() ||
    !isAvailabilityCapability(input.capability)
  ) {
    deny();
  }
  const userIds = [...new Set([input.actorUserId, input.targetUserId])];
  const [company, accesses] = await Promise.all([
    tx.company.findFirst({
      where: { id: input.companyId, isActive: true },
      select: { id: true },
    }),
    tx.userCompanyAccess.findMany({
      where: {
        companyId: input.companyId,
        userId: { in: userIds },
        isActive: true,
        user: { isActive: true },
      },
      select: { userId: true },
    }),
  ]);
  if (!company || new Set(accesses.map(({ userId }) => userId)).size !== userIds.length) {
    deny();
  }
}
export async function grantAvailabilityCapability(
  tx: Prisma.TransactionClient,
  input: GrantInput
) {
  await requireActiveParticipants(tx, input);
  const scope = {
    companyId: input.companyId,
    userId: input.targetUserId,
    capability: input.capability,
  };
  const existing = await tx.availabilityCapabilityGrant.findUnique({
    where: { companyId_userId_capability: scope },
  });
  if (existing?.isActive) {
    throw conflict("Availability capability is already granted", "availability_capability_noop");
  }
  const grant = existing
    ? await tx.availabilityCapabilityGrant.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          grantedById: input.actorUserId,
          grantedAt: new Date(),
          revokedById: null,
          revokedAt: null,
          revokeReason: null,
        },
      })
    : await tx.availabilityCapabilityGrant.create({
        data: { ...scope, grantedById: input.actorUserId },
      });
  await createAuditEvent({
    prisma: tx,
    companyId: input.companyId,
    userId: input.actorUserId,
    entityType: "AvailabilityCapabilityGrant",
    entityId: grant.id,
    action: "availability.capability_granted",
    module: "availability",
    oldValue: existing ? { isActive: false } : null,
    newValue: { isActive: true },
    metadata: { capability: input.capability, targetUserId: input.targetUserId },
  });
  return grant;
}
export async function revokeAvailabilityCapability(
  tx: Prisma.TransactionClient,
  input: RevokeInput
) {
  const reason = input.reason?.trim();
  if (!reason) deny();
  await requireActiveParticipants(tx, input);
  const existing = await tx.availabilityCapabilityGrant.findUnique({
    where: {
      companyId_userId_capability: {
        companyId: input.companyId,
        userId: input.targetUserId,
        capability: input.capability,
      },
    },
  });
  if (!existing?.isActive) {
    throw conflict("Availability capability is not active", "availability_capability_noop");
  }
  const revokedAt = new Date();
  const grant = await tx.availabilityCapabilityGrant.update({
    where: { id: existing.id },
    data: {
      isActive: false,
      revokedById: input.actorUserId,
      revokedAt,
      revokeReason: reason,
    },
  });
  await createAuditEvent({
    prisma: tx,
    companyId: input.companyId,
    userId: input.actorUserId,
    entityType: "AvailabilityCapabilityGrant",
    entityId: grant.id,
    action: "availability.capability_revoked",
    module: "availability",
    oldValue: { isActive: true },
    newValue: { isActive: false },
    metadata: { capability: input.capability, targetUserId: input.targetUserId, reason },
  });
  return grant;
}
