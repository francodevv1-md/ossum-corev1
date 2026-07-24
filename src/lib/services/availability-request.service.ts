import { createHash, randomUUID } from "node:crypto";

import {
  AvailabilityCommandType,
  AvailabilityCreatorResolution,
  AvailabilityRecipientReason,
  AvailabilityRequestStatus,
  CompanyOperationalDesignation,
  Prisma,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { ApiError, conflict, forbidden, notFound } from "../api/errors";
import {
  availabilitySourceEnabledForCompany,
  hasAvailabilityCapabilityForCompany,
} from "../permissions/availability-request.server";

const MAX_SERIALIZABLE_ATTEMPTS = 3;

export type AvailabilityActorContext = {
  actorUserId: string;
  companyId: string;
};

export type AvailabilityRequestView = {
  id: string;
  companyId: string;
  surgery: { id: string; visibleNumber: string | null };
  status: "OPEN" | "COMPLETED";
  requestedAt: string;
  requester: { id: string; displayName: string };
  creatorResolution: "identified_eligible" | "not_identified_or_eligible";
  recipientReasonsForActor: Array<"creator" | "pivot">;
  canComplete: boolean;
  submittedDate: string | null;
  completedAt: string | null;
  completedBy: { id: string; displayName: string } | null;
};

type AvailabilityEffectBase = {
  tx: Prisma.TransactionClient;
  companyId: string;
  surgeryId: string;
  requestId: string;
  actorUserId: string;
  correlationId: string;
};

export type AvailabilityRequestEffects = {
  writeAudit(input: AvailabilityEffectBase & {
    action: "availability.requested" | "availability.completed";
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string }>;
  writeTrace(input: AvailabilityEffectBase & {
    auditEventId: string;
    event: "requested" | "completed";
    content: string;
    oldDate?: string | null;
    newDate?: string | null;
  }): Promise<void>;
  emitActionableNotifications(input: AvailabilityEffectBase & {
    recipientUserIds: string[];
    requesterDisplayName: string;
    surgeryVisibleNumber: string | null;
  }): Promise<void>;
  emitRequesterCompletionNotification(input: AvailabilityEffectBase & {
    requesterUserId: string;
    completerDisplayName: string;
    date: string;
  }): Promise<void>;
};

export type AvailabilityRequestServiceDependencies = {
  prisma: PrismaClient;
  effects: AvailabilityRequestEffects;
  createCorrelationId?: () => string;
};

export type CreateAvailabilityRequestCommand = {
  surgeryId: string;
  idempotencyKey: string;
};

export type CompleteAvailabilityRequestCommand = {
  requestId: string;
  date: string;
  idempotencyKey: string;
};

type ActorAccess = {
  userId: string;
  role: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
  };
};

type CreatorClassification = {
  resolution: AvailabilityCreatorResolution;
  creatorUserIdSnapshot: string | null;
  assignmentUserId: string | null;
};

type RequestForRead = Prisma.AvailabilityRequestGetPayload<{
  include: {
    surgery: { select: { id: true; visibleNumber: true } };
    requester: {
      select: { id: true; firstName: true; lastName: true; email: true };
    };
    completedBy: {
      select: { id: true; firstName: true; lastName: true; email: true };
    };
    assignments: {
      select: {
        userId: true;
        reason: true;
        revokedAt: true;
      };
    };
  };
}>;

const requestReadInclude = {
  surgery: { select: { id: true, visibleNumber: true } },
  requester: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  completedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  assignments: {
    select: { userId: true, reason: true, revokedAt: true },
  },
} satisfies Prisma.AvailabilityRequestInclude;

function displayName(user: {
  firstName: string;
  lastName: string;
  email: string;
}): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

function serializeDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function hashPayload(payload: Record<string, string>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function normalizedContext(context: AvailabilityActorContext): AvailabilityActorContext {
  const actorUserId = context.actorUserId?.trim();
  const companyId = context.companyId?.trim();
  if (!actorUserId || !companyId) {
    throw forbidden("Availability operation is not authorized", "availability_forbidden");
  }
  return { actorUserId, companyId };
}

async function requireActiveAccess(
  tx: Prisma.TransactionClient,
  context: AvailabilityActorContext,
  denial: "forbidden" | "not_found"
): Promise<ActorAccess> {
  const access = await tx.userCompanyAccess.findFirst({
    where: {
      userId: context.actorUserId,
      companyId: context.companyId,
      isActive: true,
      user: { isActive: true },
      company: { isActive: true },
    },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  if (!access) {
    if (denial === "not_found") {
      throw notFound("Availability request not found", "availability_request_not_found");
    }
    throw forbidden("Availability operation is not authorized", "availability_forbidden");
  }

  return access;
}

async function resolveCurrentPivot(
  tx: Prisma.TransactionClient,
  companyId: string
) {
  const mappings = await tx.companyOperationalAssignee.findMany({
    where: {
      companyId,
      designation: CompanyOperationalDesignation.PIVOT,
    },
    select: {
      userId: true,
      version: true,
      userAccess: {
        select: {
          companyId: true,
          role: true,
          isActive: true,
          user: { select: { isActive: true } },
          company: { select: { isActive: true } },
        },
      },
    },
  });

  if (
    mappings.length !== 1 ||
    mappings[0].userAccess.companyId !== companyId ||
    mappings[0].userAccess.role !== "operator" ||
    !mappings[0].userAccess.isActive ||
    !mappings[0].userAccess.user.isActive ||
    !mappings[0].userAccess.company.isActive
  ) {
    throw conflict(
      "A valid company PÍVOT is required",
      "availability_pivot_unavailable"
    );
  }

  return mappings[0];
}

async function classifyCreator(
  tx: Prisma.TransactionClient,
  companyId: string,
  createdById: string | null
): Promise<CreatorClassification> {
  if (!createdById) {
    return {
      resolution: AvailabilityCreatorResolution.NOT_IDENTIFIED,
      creatorUserIdSnapshot: null,
      assignmentUserId: null,
    };
  }

  const creator = await tx.user.findUnique({
    where: { id: createdById },
    select: {
      id: true,
      isActive: true,
      companyAccess: {
        where: { companyId },
        select: { companyId: true, isActive: true },
      },
    },
  });

  if (!creator) {
    return {
      resolution: AvailabilityCreatorResolution.NOT_IDENTIFIED,
      creatorUserIdSnapshot: null,
      assignmentUserId: null,
    };
  }

  if (!creator.isActive) {
    return {
      resolution: AvailabilityCreatorResolution.IDENTIFIED_INACTIVE,
      creatorUserIdSnapshot: creator.id,
      assignmentUserId: null,
    };
  }

  if (creator.companyAccess.length !== 1 || !creator.companyAccess[0].isActive) {
    return {
      resolution: AvailabilityCreatorResolution.IDENTIFIED_NO_COMPANY_ACCESS,
      creatorUserIdSnapshot: creator.id,
      assignmentUserId: null,
    };
  }

  return {
    resolution: AvailabilityCreatorResolution.IDENTIFIED_ELIGIBLE,
    creatorUserIdSnapshot: creator.id,
    assignmentUserId: creator.id,
  };
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code === "P2034") {
    return true;
  }
  if (error.code !== "P2002") {
    return false;
  }
  return String(error.meta?.target ?? "").includes(
    "uq_availability_command_idempotency"
  );
}

function translateUniqueConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.target ?? "").includes(
      "availability_request_one_open_per_surgery"
    )
  ) {
    throw conflict(
      "An availability request is already open",
      "availability_request_already_open"
    );
  }
  throw error;
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
          "Availability operation lost a serialization race",
          "availability_serialization_conflict"
        );
      }
      translateUniqueConflict(error);
    }
  }
  throw conflict(
    "Availability operation lost a serialization race",
    "availability_serialization_conflict"
  );
}

async function findCommand(
  tx: Prisma.TransactionClient,
  context: AvailabilityActorContext,
  type: AvailabilityCommandType,
  idempotencyKey: string
) {
  return tx.availabilityCommand.findUnique({
    where: {
      companyId_actorUserId_type_idempotencyKey: {
        companyId: context.companyId,
        actorUserId: context.actorUserId,
        type,
        idempotencyKey,
      },
    },
  });
}

function assertCommandPayload(
  command: { payloadHash: string },
  payloadHash: string
): void {
  if (command.payloadHash !== payloadHash) {
    throw conflict(
      "Idempotency key was reused with different input",
      "idempotency_key_reused"
    );
  }
}

function recipientReasons(
  assignments: Array<{
    userId: string;
    reason: AvailabilityRecipientReason;
    revokedAt: Date | null;
  }>,
  actorUserId: string,
  includeRevoked: boolean
): Array<"creator" | "pivot"> {
  const reasons = new Set<"creator" | "pivot">();
  for (const assignment of assignments) {
    if (
      assignment.userId !== actorUserId ||
      (!includeRevoked && assignment.revokedAt !== null)
    ) {
      continue;
    }
    reasons.add(
      assignment.reason === AvailabilityRecipientReason.CREATOR
        ? "creator"
        : "pivot"
    );
  }
  return [...reasons];
}

function toView(
  request: RequestForRead,
  actorUserId: string,
  reasons: Array<"creator" | "pivot">,
  canComplete: boolean
): AvailabilityRequestView {
  return {
    id: request.id,
    companyId: request.companyId,
    surgery: {
      id: request.surgery.id,
      visibleNumber: request.surgery.visibleNumber,
    },
    status: request.status,
    requestedAt: request.requestedAt.toISOString(),
    requester: {
      id: request.requester.id,
      displayName: displayName(request.requester),
    },
    creatorResolution:
      request.creatorResolution ===
      AvailabilityCreatorResolution.IDENTIFIED_ELIGIBLE
        ? "identified_eligible"
        : "not_identified_or_eligible",
    recipientReasonsForActor:
      actorUserId === request.requesterUserId && reasons.length === 0
        ? []
        : reasons,
    canComplete,
    submittedDate: serializeDateOnly(request.submittedDate),
    completedAt: request.completedAt?.toISOString() ?? null,
    completedBy: request.completedBy
      ? {
          id: request.completedBy.id,
          displayName: displayName(request.completedBy),
        }
      : null,
  };
}

async function loadRequest(
  tx: Prisma.TransactionClient,
  companyId: string,
  requestId: string
): Promise<RequestForRead | null> {
  return tx.availabilityRequest.findFirst({
    where: { id: requestId, companyId },
    include: requestReadInclude,
  });
}

async function currentEligibleReasons(
  tx: Prisma.TransactionClient,
  request: RequestForRead,
  actorUserId: string
): Promise<Array<"creator" | "pivot">> {
  const activeReasons = recipientReasons(
    request.assignments,
    actorUserId,
    false
  );
  const eligible = new Set(activeReasons);
  if (eligible.has("pivot")) {
    try {
      const pivot = await resolveCurrentPivot(tx, request.companyId);
      if (pivot.userId !== actorUserId) {
        eligible.delete("pivot");
      }
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "availability_pivot_unavailable"
      ) {
        eligible.delete("pivot");
      } else {
        throw error;
      }
    }
  }
  return [...eligible];
}

export async function createAvailabilityRequest(
  dependencies: AvailabilityRequestServiceDependencies,
  context: AvailabilityActorContext,
  command: CreateAvailabilityRequestCommand
): Promise<AvailabilityRequestView> {
  const scopedContext = normalizedContext(context);
  const payloadHash = hashPayload({ surgeryId: command.surgeryId });
  const correlationId =
    dependencies.createCorrelationId?.() ?? randomUUID();

  return runSerializable(dependencies.prisma, async (tx) => {
    if (
      !(await hasAvailabilityCapabilityForCompany(
        tx,
        scopedContext.companyId,
        scopedContext.actorUserId,
        "availability.request.create"
      ))
    ) {
      throw forbidden("Availability request creation is not authorized", "availability_forbidden");
    }
    const actorAccess = await requireActiveAccess(tx, scopedContext, "forbidden");
    const existingCommand = await findCommand(
      tx,
      scopedContext,
      AvailabilityCommandType.REQUEST,
      command.idempotencyKey
    );

    if (existingCommand) {
      assertCommandPayload(existingCommand, payloadHash);
      if (existingCommand.completedAt && existingCommand.requestId) {
        const replay = await loadRequest(
          tx,
          scopedContext.companyId,
          existingCommand.requestId
        );
        if (!replay) {
          throw conflict("Stored availability result is missing", "availability_request_not_open");
        }
        const reasons = recipientReasons(
          replay.assignments,
          scopedContext.actorUserId,
          false
        );
        return toView(
          replay,
          scopedContext.actorUserId,
          reasons,
          replay.status === AvailabilityRequestStatus.OPEN && reasons.length > 0
        );
      }
      throw conflict("Availability command is incomplete", "availability_request_not_open");
    }

    const surgery = await tx.surgery.findFirst({
      where: { id: command.surgeryId, companyId: scopedContext.companyId },
      select: {
        id: true,
        companyId: true,
        visibleNumber: true,
        cxStatus: true,
        archivedAt: true,
        materialAvailabilityDate: true,
        createdById: true,
      },
    });
    if (!surgery) {
      throw notFound("Surgery not found", "availability_surgery_not_found");
    }
    if (
      surgery.archivedAt ||
      surgery.cxStatus === "cancelled" ||
      surgery.cxStatus === "finalized"
    ) {
      throw conflict("Surgery is not eligible", "availability_surgery_ineligible");
    }
    if (surgery.materialAvailabilityDate) {
      throw conflict(
        "Material availability date is already set",
        "availability_date_already_set"
      );
    }

    const openRequest = await tx.availabilityRequest.findFirst({
      where: {
        companyId: scopedContext.companyId,
        surgeryId: surgery.id,
        status: AvailabilityRequestStatus.OPEN,
      },
      select: { id: true },
    });
    if (openRequest) {
      throw conflict(
        "An availability request is already open",
        "availability_request_already_open"
      );
    }

    const pivot = await resolveCurrentPivot(tx, scopedContext.companyId);
    const creator = await classifyCreator(
      tx,
      scopedContext.companyId,
      surgery.createdById
    );
    const commandRow = await tx.availabilityCommand.create({
      data: {
        companyId: scopedContext.companyId,
        actorUserId: scopedContext.actorUserId,
        type: AvailabilityCommandType.REQUEST,
        idempotencyKey: command.idempotencyKey,
        payloadHash,
        surgeryId: surgery.id,
      },
    });
    const request = await tx.availabilityRequest.create({
      data: {
        companyId: scopedContext.companyId,
        surgeryId: surgery.id,
        requesterUserId: scopedContext.actorUserId,
        creatorResolution: creator.resolution,
        creatorUserIdSnapshot: creator.creatorUserIdSnapshot,
        creatorAuditEventId: null,
        pivotUserIdAtCreation: pivot.userId,
        pivotMappingVersion: pivot.version,
        correlationId,
      },
    });

    const assignments = [
      {
        availabilityRequestId: request.id,
        companyId: scopedContext.companyId,
        userId: pivot.userId,
        reason: AvailabilityRecipientReason.PIVOT,
        assignedByUserId: scopedContext.actorUserId,
        correlationId,
      },
      ...(creator.assignmentUserId
        ? [
            {
              availabilityRequestId: request.id,
              companyId: scopedContext.companyId,
              userId: creator.assignmentUserId,
              reason: AvailabilityRecipientReason.CREATOR,
              assignedByUserId: scopedContext.actorUserId,
              correlationId,
            },
          ]
        : []),
    ];
    await tx.availabilityRequestRecipientAssignment.createMany({
      data: assignments,
    });

    const recipientUserIds = [...new Set(assignments.map((entry) => entry.userId))];
    const effectBase = {
      tx,
      companyId: scopedContext.companyId,
      surgeryId: surgery.id,
      requestId: request.id,
      actorUserId: scopedContext.actorUserId,
      correlationId,
    };
    await dependencies.effects.emitActionableNotifications({
      ...effectBase,
      recipientUserIds,
      requesterDisplayName: displayName(actorAccess.user),
      surgeryVisibleNumber: surgery.visibleNumber,
    });
    const audit = await dependencies.effects.writeAudit({
      ...effectBase,
      action: "availability.requested",
      oldValue: null,
      newValue: { status: "OPEN" },
      metadata: {
        creatorResolution: creator.resolution,
        creatorUserIdSnapshot: creator.creatorUserIdSnapshot,
        pivotUserIdAtCreation: pivot.userId,
        pivotMappingVersion: pivot.version,
        recipientReasons: assignments.map((entry) => ({
          userId: entry.userId,
          reason: entry.reason,
        })),
      },
    });
    await dependencies.effects.writeTrace({
      ...effectBase,
      auditEventId: audit.id,
      event: "requested",
      content: "Se solicitó fecha de disponibilidad del material",
    });
    await tx.availabilityCommand.update({
      where: { id: commandRow.id },
      data: {
        requestId: request.id,
        surgeryId: surgery.id,
        completedAt: new Date(),
        resultCode: "availability_request_created",
      },
    });

    const actorReasons = assignments
      .filter((entry) => entry.userId === scopedContext.actorUserId)
      .map((entry) =>
        entry.reason === AvailabilityRecipientReason.CREATOR
          ? ("creator" as const)
          : ("pivot" as const)
      );
    return {
      id: request.id,
      companyId: request.companyId,
      surgery: { id: surgery.id, visibleNumber: surgery.visibleNumber },
      status: "OPEN",
      requestedAt: request.requestedAt.toISOString(),
      requester: {
        id: scopedContext.actorUserId,
        displayName: displayName(actorAccess.user),
      },
      creatorResolution:
        creator.resolution === AvailabilityCreatorResolution.IDENTIFIED_ELIGIBLE
          ? "identified_eligible"
          : "not_identified_or_eligible",
      recipientReasonsForActor: actorReasons,
      canComplete: actorReasons.length > 0,
      submittedDate: null,
      completedAt: null,
      completedBy: null,
    };
  });
}

export async function getAvailabilityRequestDetail(
  dependencies: Pick<AvailabilityRequestServiceDependencies, "prisma">,
  context: AvailabilityActorContext,
  requestId: string
): Promise<AvailabilityRequestView> {
  const scopedContext = normalizedContext(context);

  return dependencies.prisma.$transaction(async (tx) => {
    if (!availabilitySourceEnabledForCompany(scopedContext.companyId)) {
      throw notFound("Availability request not found", "availability_request_not_found");
    }
    await requireActiveAccess(tx, scopedContext, "not_found");
    const request = await loadRequest(tx, scopedContext.companyId, requestId);
    if (!request) {
      throw notFound("Availability request not found", "availability_request_not_found");
    }

    if (request.status === AvailabilityRequestStatus.OPEN) {
      const reasons = await currentEligibleReasons(
        tx,
        request,
        scopedContext.actorUserId
      );
      const requesterWithCapability =
        request.requesterUserId === scopedContext.actorUserId &&
        (await hasAvailabilityCapabilityForCompany(
          tx,
          scopedContext.companyId,
          scopedContext.actorUserId,
          "availability.request.read"
        ));
      if (reasons.length === 0 && !requesterWithCapability) {
        throw notFound("Availability request not found", "availability_request_not_found");
      }
      return toView(
        request,
        scopedContext.actorUserId,
        reasons,
        reasons.length > 0
      );
    }

    const historicalReasons = recipientReasons(
      request.assignments,
      scopedContext.actorUserId,
      true
    );
    const requesterWithCapability =
      request.requesterUserId === scopedContext.actorUserId &&
      (await hasAvailabilityCapabilityForCompany(
        tx,
        scopedContext.companyId,
        scopedContext.actorUserId,
        "availability.request.read"
      ));
    if (historicalReasons.length === 0 && !requesterWithCapability) {
      throw notFound("Availability request not found", "availability_request_not_found");
    }
    return toView(
      request,
      scopedContext.actorUserId,
      historicalReasons,
      false
    );
  });
}

export async function completeAvailabilityRequest(
  dependencies: AvailabilityRequestServiceDependencies,
  context: AvailabilityActorContext,
  command: CompleteAvailabilityRequestCommand
): Promise<AvailabilityRequestView> {
  const scopedContext = normalizedContext(context);
  const payloadHash = hashPayload({
    requestId: command.requestId,
    date: command.date,
  });

  return runSerializable(dependencies.prisma, async (tx) => {
    if (!availabilitySourceEnabledForCompany(scopedContext.companyId)) {
      throw notFound("Availability request not found", "availability_request_not_found");
    }
    const actorAccess = await requireActiveAccess(tx, scopedContext, "not_found");
    const existingCommand = await findCommand(
      tx,
      scopedContext,
      AvailabilityCommandType.COMPLETE,
      command.idempotencyKey
    );
    if (existingCommand) {
      assertCommandPayload(existingCommand, payloadHash);
      if (existingCommand.completedAt && existingCommand.requestId) {
        const replay = await loadRequest(
          tx,
          scopedContext.companyId,
          existingCommand.requestId
        );
        if (!replay) {
          throw notFound("Availability request not found", "availability_request_not_found");
        }
        const reasons = recipientReasons(
          replay.assignments,
          scopedContext.actorUserId,
          true
        );
        return toView(replay, scopedContext.actorUserId, reasons, false);
      }
      throw conflict("Availability command is incomplete", "availability_request_not_open");
    }

    const request = await loadRequest(
      tx,
      scopedContext.companyId,
      command.requestId
    );
    if (!request) {
      throw notFound("Availability request not found", "availability_request_not_found");
    }
    if (request.status !== AvailabilityRequestStatus.OPEN) {
      throw conflict(
        "Availability request is already completed",
        "availability_request_completed"
      );
    }

    const reasons = await currentEligibleReasons(
      tx,
      request,
      scopedContext.actorUserId
    );
    if (reasons.length === 0) {
      throw notFound("Availability request not found", "availability_request_not_found");
    }

    const commandRow = await tx.availabilityCommand.create({
      data: {
        companyId: scopedContext.companyId,
        actorUserId: scopedContext.actorUserId,
        type: AvailabilityCommandType.COMPLETE,
        idempotencyKey: command.idempotencyKey,
        payloadHash,
        requestId: request.id,
        surgeryId: request.surgeryId,
      },
    });
    const submittedDate = toDateOnly(command.date);
    const surgeryUpdate = await tx.surgery.updateMany({
      where: {
        id: request.surgeryId,
        companyId: scopedContext.companyId,
        archivedAt: null,
        cxStatus: { notIn: ["cancelled", "finalized"] },
        materialAvailabilityDate: null,
      },
      data: { materialAvailabilityDate: submittedDate },
    });
    if (surgeryUpdate.count !== 1) {
      throw conflict("Surgery is not eligible", "availability_surgery_ineligible");
    }

    const completedAt = new Date();
    const requestUpdate = await tx.availabilityRequest.updateMany({
      where: {
        id: request.id,
        companyId: scopedContext.companyId,
        status: AvailabilityRequestStatus.OPEN,
      },
      data: {
        status: AvailabilityRequestStatus.COMPLETED,
        submittedDate,
        completedAt,
        completedByUserId: scopedContext.actorUserId,
        completionCommandId: commandRow.id,
      },
    });
    if (requestUpdate.count !== 1) {
      throw conflict(
        "Availability request is already completed",
        "availability_request_completed"
      );
    }

    const effectBase = {
      tx,
      companyId: scopedContext.companyId,
      surgeryId: request.surgeryId,
      requestId: request.id,
      actorUserId: scopedContext.actorUserId,
      correlationId: request.correlationId,
    };
    const audit = await dependencies.effects.writeAudit({
      ...effectBase,
      action: "availability.completed",
      oldValue: { date: null, status: "OPEN" },
      newValue: { date: command.date, status: "COMPLETED" },
      metadata: { actorReasons: reasons },
    });
    await dependencies.effects.writeTrace({
      ...effectBase,
      auditEventId: audit.id,
      event: "completed",
      content: `${displayName(actorAccess.user)} estableció disponibilidad para el ${command.date.slice(8, 10)}/${command.date.slice(5, 7)}/${command.date.slice(0, 4)}`,
      oldDate: null,
      newDate: command.date,
    });
    await dependencies.effects.emitRequesterCompletionNotification({
      ...effectBase,
      requesterUserId: request.requesterUserId,
      completerDisplayName: displayName(actorAccess.user),
      date: command.date,
    });
    await tx.availabilityCommand.update({
      where: { id: commandRow.id },
      data: {
        completedAt,
        resultCode: "availability_request_completed",
      },
    });

    return {
      ...toView(request, scopedContext.actorUserId, reasons, false),
      status: "COMPLETED",
      submittedDate: command.date,
      completedAt: completedAt.toISOString(),
      completedBy: {
        id: scopedContext.actorUserId,
        displayName: displayName(actorAccess.user),
      },
      canComplete: false,
    };
  });
}
