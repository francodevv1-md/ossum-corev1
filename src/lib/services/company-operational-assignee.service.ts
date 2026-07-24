import { createHash, randomUUID } from "node:crypto";

import {
  AvailabilityCommandType,
  AvailabilityRecipientReason,
  AvailabilityRequestStatus,
  CompanyOperationalDesignation,
  Prisma,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { conflict, forbidden, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import { hasAvailabilityCapabilityForCompany } from "../permissions/availability-request.server";

const MAX_SERIALIZABLE_ATTEMPTS = 3;

export type OperationalAssigneeActorContext = {
  actorUserId: string;
  companyId: string;
};

export type ReassignPivotCommand = {
  userId: string;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
};

export type ReassignPivotResult = {
  userId: string;
  version: number;
  transferredRequestCount: number;
  replayed?: boolean;
};

type PivotTransferRequest = {
  requestId: string;
  surgeryId: string;
  recipientReasons: Array<"creator" | "pivot">;
};

type PivotEffectBase = {
  tx: Prisma.TransactionClient;
  companyId: string;
  actorUserId: string;
  correlationId: string;
};

export type CompanyOperationalAssigneeEffects = {
  emitTransferNotifications(input: PivotEffectBase & {
    formerPivotUserId: string;
    newPivotUserId: string;
    requests: PivotTransferRequest[];
  }): Promise<void>;
  writeCompanyAudit(input: PivotEffectBase & {
    action: "availability.pivot_reassigned";
    formerPivotUserId: string;
    newPivotUserId: string;
    oldVersion: number;
    newVersion: number;
    reason: string;
    affectedOpenRequestCount: number;
  }): Promise<{ id: string }>;
  writeRequestAudit(input: PivotEffectBase & {
    action: "availability.request_pivot_transferred";
    requestId: string;
    surgeryId: string;
    formerPivotUserId: string;
    newPivotUserId: string;
  }): Promise<{ id: string }>;
  writeRequestTrace(input: PivotEffectBase & {
    requestId: string;
    surgeryId: string;
    auditEventId: string;
    event: "pivot_transferred";
  }): Promise<void>;
};

export type CompanyOperationalAssigneeDependencies = {
  prisma: PrismaClient;
  effects: CompanyOperationalAssigneeEffects;
  createCorrelationId?: () => string;
};

function normalizeContext(
  context: OperationalAssigneeActorContext
): OperationalAssigneeActorContext {
  const actorUserId = context.actorUserId?.trim();
  const companyId = context.companyId?.trim();
  if (!actorUserId || !companyId) {
    throw forbidden("PÍVOT configuration is not authorized", "availability_forbidden");
  }
  return { actorUserId, companyId };
}

function hashPayload(payload: Record<string, string | number>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function requireActiveActor(
  tx: Prisma.TransactionClient,
  context: OperationalAssigneeActorContext
): Promise<void> {
  const access = await tx.userCompanyAccess.findFirst({
    where: {
      userId: context.actorUserId,
      companyId: context.companyId,
      isActive: true,
      user: { isActive: true },
      company: { isActive: true },
    },
    select: { id: true },
  });
  if (!access) {
    throw forbidden("PÍVOT configuration is not authorized", "availability_forbidden");
  }
}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" ||
      (error.code === "P2002" &&
        String(error.meta?.target ?? "").includes(
          "uq_availability_command_idempotency"
        )))
  );
}

async function runSerializable<T>(
  prisma: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isRetryable(error) && attempt < MAX_SERIALIZABLE_ATTEMPTS - 1) {
        continue;
      }
      if (isRetryable(error)) {
        throw conflict(
          "PÍVOT reassignment lost a serialization race",
          "availability_serialization_conflict"
        );
      }
      throw error;
    }
  }
  throw conflict(
    "PÍVOT reassignment lost a serialization race",
    "availability_serialization_conflict"
  );
}

function replayCount(resultCode: string | null): number {
  const match = /^availability_pivot_reassigned:(\d+)$/.exec(resultCode ?? "");
  if (!match) {
    throw conflict("Stored PÍVOT result is invalid", "availability_pivot_version_conflict");
  }
  return Number(match[1]);
}

export async function designateInitialPivot(
  tx: Prisma.TransactionClient,
  input: { companyId: string; actorUserId: string; targetUserId: string; reason: string }
) {
  const context = normalizeContext(input);
  await requireActiveActor(tx, context);
  const target = await tx.userCompanyAccess.findFirst({
    where: {
      userId: input.targetUserId,
      companyId: context.companyId,
      role: "operator", isActive: true,
      user: { isActive: true }, company: { isActive: true },
    },
    select: { userId: true },
  });
  if (!target) {
    throw notFound("PÍVOT candidate not found", "availability_pivot_unavailable");
  }
  const current = await tx.companyOperationalAssignee.findFirst({
    where: { companyId: context.companyId, designation: CompanyOperationalDesignation.PIVOT },
    select: { id: true },
  });
  if (current) {
    throw conflict("PÍVOT is already designated", "availability_pivot_noop");
  }
  const mapping = await tx.companyOperationalAssignee.create({
    data: {
      companyId: context.companyId, userId: target.userId,
      designation: CompanyOperationalDesignation.PIVOT,
      version: 1, createdById: context.actorUserId, updatedById: context.actorUserId,
    },
  });
  await createAuditEvent({
    prisma: tx, companyId: context.companyId, userId: context.actorUserId,
    entityType: "Company", entityId: context.companyId,
    action: "availability.pivot_designated",
    module: "availability", oldValue: null,
    newValue: { pivotUserId: target.userId, version: 1 },
    metadata: { reason: input.reason },
  });
  return mapping;
}

export async function reassignPivot(
  dependencies: CompanyOperationalAssigneeDependencies,
  context: OperationalAssigneeActorContext,
  command: ReassignPivotCommand
): Promise<ReassignPivotResult> {
  const scopedContext = normalizeContext(context);
  const payloadHash = hashPayload({
    userId: command.userId,
    expectedVersion: command.expectedVersion,
    reason: command.reason,
  });
  const correlationId = dependencies.createCorrelationId?.() ?? randomUUID();

  return runSerializable(dependencies.prisma, async (tx) => {
    if (
      !(await hasAvailabilityCapabilityForCompany(
        tx,
        scopedContext.companyId,
        scopedContext.actorUserId,
        "availability.pivot.configure"
      ))
    ) {
      throw forbidden("PÍVOT configuration is not authorized", "availability_forbidden");
    }
    await requireActiveActor(tx, scopedContext);
    const existingCommand = await tx.availabilityCommand.findUnique({
      where: {
        companyId_actorUserId_type_idempotencyKey: {
          companyId: scopedContext.companyId,
          actorUserId: scopedContext.actorUserId,
          type: AvailabilityCommandType.REASSIGN_PIVOT,
          idempotencyKey: command.idempotencyKey,
        },
      },
    });
    if (existingCommand) {
      if (existingCommand.payloadHash !== payloadHash) {
        throw conflict(
          "Idempotency key was reused with different input",
          "idempotency_key_reused"
        );
      }
      if (existingCommand.completedAt) {
        return {
          userId: command.userId,
          version: command.expectedVersion + 1,
          transferredRequestCount: replayCount(existingCommand.resultCode),
          replayed: true,
        };
      }
      throw conflict("PÍVOT reassignment command is incomplete", "availability_pivot_version_conflict");
    }

    const current = await tx.companyOperationalAssignee.findFirst({
      where: {
        companyId: scopedContext.companyId,
        designation: CompanyOperationalDesignation.PIVOT,
      },
      select: { id: true, userId: true, version: true },
    });
    if (!current) {
      throw conflict(
        "Initial PÍVOT designation is required",
        "availability_pivot_unavailable"
      );
    }
    if (current.version !== command.expectedVersion) {
      throw conflict(
        "PÍVOT mapping version changed",
        "availability_pivot_version_conflict"
      );
    }
    if (current.userId === command.userId) {
      throw conflict("PÍVOT is already assigned", "availability_pivot_noop");
    }

    const target = await tx.userCompanyAccess.findFirst({
      where: {
        userId: command.userId,
        companyId: scopedContext.companyId,
        role: "operator",
        isActive: true,
        user: { isActive: true },
        company: { isActive: true },
      },
      select: { userId: true },
    });
    if (!target) {
      throw notFound("PÍVOT candidate not found", "availability_pivot_unavailable");
    }

    const commandRow = await tx.availabilityCommand.create({
      data: {
        companyId: scopedContext.companyId,
        actorUserId: scopedContext.actorUserId,
        type: AvailabilityCommandType.REASSIGN_PIVOT,
        idempotencyKey: command.idempotencyKey,
        payloadHash,
      },
    });
    const mappingUpdate = await tx.companyOperationalAssignee.updateMany({
      where: {
        id: current.id,
        companyId: scopedContext.companyId,
        designation: CompanyOperationalDesignation.PIVOT,
        version: command.expectedVersion,
        userId: current.userId,
      },
      data: {
        userId: target.userId,
        version: { increment: 1 },
        updatedById: scopedContext.actorUserId,
      },
    });
    if (mappingUpdate.count !== 1) {
      throw conflict(
        "PÍVOT mapping version changed",
        "availability_pivot_version_conflict"
      );
    }

    const openRequests = await tx.availabilityRequest.findMany({
      where: {
        companyId: scopedContext.companyId,
        status: AvailabilityRequestStatus.OPEN,
      },
      select: {
        id: true,
        surgeryId: true,
        assignments: {
          where: { userId: target.userId, revokedAt: null },
          select: { reason: true },
        },
      },
    });
    const transferredAt = new Date();
    const revoked = await tx.availabilityRequestRecipientAssignment.updateMany({
      where: {
        companyId: scopedContext.companyId,
        reason: AvailabilityRecipientReason.PIVOT,
        revokedAt: null,
        userId: current.userId,
        request: { status: AvailabilityRequestStatus.OPEN },
      },
      data: {
        revokedAt: transferredAt,
        revokedByUserId: scopedContext.actorUserId,
        revokeReason: command.reason,
      },
    });
    if (revoked.count !== openRequests.length) {
      throw conflict(
        "Not every open request could transfer PÍVOT authority",
        "availability_pivot_transfer_incomplete"
      );
    }

    if (openRequests.length > 0) {
      const inserted = await tx.availabilityRequestRecipientAssignment.createMany({
        data: openRequests.map((request) => ({
          availabilityRequestId: request.id,
          companyId: scopedContext.companyId,
          userId: target.userId,
          reason: AvailabilityRecipientReason.PIVOT,
          assignedByUserId: scopedContext.actorUserId,
          correlationId,
        })),
      });
      if (inserted.count !== openRequests.length) {
        throw conflict(
          "Not every open request could transfer PÍVOT authority",
          "availability_pivot_transfer_incomplete"
        );
      }
    }

    const effectBase = {
      tx,
      companyId: scopedContext.companyId,
      actorUserId: scopedContext.actorUserId,
      correlationId,
    };
    const requests: PivotTransferRequest[] = openRequests.map((request) => {
      const reasons = new Set<"creator" | "pivot">(["pivot"]);
      if (
        request.assignments.some(
          (assignment) => assignment.reason === AvailabilityRecipientReason.CREATOR
        )
      ) {
        reasons.add("creator");
      }
      return {
        requestId: request.id,
        surgeryId: request.surgeryId,
        recipientReasons: [...reasons],
      };
    });
    await dependencies.effects.emitTransferNotifications({
      ...effectBase,
      formerPivotUserId: current.userId,
      newPivotUserId: target.userId,
      requests,
    });
    await dependencies.effects.writeCompanyAudit({
      ...effectBase,
      action: "availability.pivot_reassigned",
      formerPivotUserId: current.userId,
      newPivotUserId: target.userId,
      oldVersion: current.version,
      newVersion: current.version + 1,
      reason: command.reason,
      affectedOpenRequestCount: openRequests.length,
    });
    for (const request of openRequests) {
      const audit = await dependencies.effects.writeRequestAudit({
        ...effectBase,
        action: "availability.request_pivot_transferred",
        requestId: request.id,
        surgeryId: request.surgeryId,
        formerPivotUserId: current.userId,
        newPivotUserId: target.userId,
      });
      await dependencies.effects.writeRequestTrace({
        ...effectBase,
        requestId: request.id,
        surgeryId: request.surgeryId,
        auditEventId: audit.id,
        event: "pivot_transferred",
      });
    }
    await tx.availabilityCommand.update({
      where: { id: commandRow.id },
      data: {
        completedAt: new Date(),
        resultCode: `availability_pivot_reassigned:${openRequests.length}`,
      },
    });

    return {
      userId: target.userId,
      version: current.version + 1,
      transferredRequestCount: openRequests.length,
    };
  });
}
