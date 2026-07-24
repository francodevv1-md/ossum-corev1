import { createHash, randomUUID } from "node:crypto";

import { AvailabilityCommandType, Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { conflict, forbidden, notFound } from "../api/errors";
import {
  availabilitySourceEnabledForCompany,
  hasAvailabilityCapabilityForCompany,
} from "../permissions/availability-request.server";

const MAX_SERIALIZABLE_ATTEMPTS = 3;

export type MaterialAvailabilityActorContext = {
  actorUserId: string;
  companyId: string;
};

export type CorrectMaterialAvailabilityCommand = {
  surgeryId: string;
  date: string;
  expectedCurrentDate: string;
  reason: string;
  idempotencyKey: string;
  origin: "expediente";
};

export type MaterialAvailabilityView = {
  surgeryId: string;
  date: string | null;
  replayed?: boolean;
};

type MaterialAvailabilityEffectBase = {
  tx: Prisma.TransactionClient;
  companyId: string;
  surgeryId: string;
  actorUserId: string;
  correlationId: string;
};

export type MaterialAvailabilityEffects = {
  writeAudit(input: MaterialAvailabilityEffectBase & {
    action: "availability.corrected";
    oldDate: string;
    newDate: string;
    reason: string;
  }): Promise<{ id: string }>;
  writeTrace(input: MaterialAvailabilityEffectBase & {
    auditEventId: string;
    event: "corrected";
    content: string;
    oldDate: string;
    newDate: string;
  }): Promise<void>;
};

export type MaterialAvailabilityServiceDependencies = {
  prisma: PrismaClient;
  effects: MaterialAvailabilityEffects;
  createCorrelationId?: () => string;
};

function normalizeContext(
  context: MaterialAvailabilityActorContext
): MaterialAvailabilityActorContext {
  const actorUserId = context.actorUserId?.trim();
  const companyId = context.companyId?.trim();
  if (!actorUserId || !companyId) {
    throw forbidden("Material availability operation is not authorized", "availability_forbidden");
  }
  return { actorUserId, companyId };
}

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function serializeDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function formatDate(value: string): string {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

function hashPayload(payload: Record<string, string>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function requireActiveAccess(
  client: PrismaClient | Prisma.TransactionClient,
  context: MaterialAvailabilityActorContext,
  denial: "forbidden" | "not_found"
): Promise<void> {
  const access = await client.userCompanyAccess.findFirst({
    where: {
      userId: context.actorUserId,
      companyId: context.companyId,
      isActive: true,
      user: { isActive: true },
      company: { isActive: true },
    },
    select: { id: true },
  });
  if (access) return;
  if (denial === "not_found") {
    throw notFound("Surgery not found", "availability_surgery_not_found");
  }
  throw forbidden("Material availability operation is not authorized", "availability_forbidden");
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
          "Material availability operation lost a serialization race",
          "availability_serialization_conflict"
        );
      }
      throw error;
    }
  }
  throw conflict(
    "Material availability operation lost a serialization race",
    "availability_serialization_conflict"
  );
}

export async function getMaterialAvailability(
  dependencies: Pick<MaterialAvailabilityServiceDependencies, "prisma">,
  context: MaterialAvailabilityActorContext,
  surgeryId: string
): Promise<MaterialAvailabilityView> {
  const scopedContext = normalizeContext(context);
  if (!availabilitySourceEnabledForCompany(scopedContext.companyId)) {
    throw notFound("Surgery not found", "availability_surgery_not_found");
  }
  await requireActiveAccess(dependencies.prisma, scopedContext, "not_found");
  const surgery = await dependencies.prisma.surgery.findFirst({
    where: { id: surgeryId, companyId: scopedContext.companyId },
    select: { id: true, materialAvailabilityDate: true },
  });
  if (!surgery) {
    throw notFound("Surgery not found", "availability_surgery_not_found");
  }
  return {
    surgeryId: surgery.id,
    date: serializeDateOnly(surgery.materialAvailabilityDate),
  };
}

export async function correctMaterialAvailability(
  dependencies: MaterialAvailabilityServiceDependencies,
  context: MaterialAvailabilityActorContext,
  command: CorrectMaterialAvailabilityCommand
): Promise<MaterialAvailabilityView> {
  const scopedContext = normalizeContext(context);
  if (command.origin !== "expediente") {
    throw forbidden("Material availability correction is not authorized", "availability_forbidden");
  }

  const payloadHash = hashPayload({
    surgeryId: command.surgeryId,
    date: command.date,
    expectedCurrentDate: command.expectedCurrentDate,
    reason: command.reason,
  });
  const correlationId = dependencies.createCorrelationId?.() ?? randomUUID();

  return runSerializable(dependencies.prisma, async (tx) => {
    if (
      !(await hasAvailabilityCapabilityForCompany(
        tx,
        scopedContext.companyId,
        scopedContext.actorUserId,
        "availability.date.correct"
      ))
    ) {
      throw forbidden("Material availability correction is not authorized", "availability_forbidden");
    }
    await requireActiveAccess(tx, scopedContext, "forbidden");
    const existingCommand = await tx.availabilityCommand.findUnique({
      where: {
        companyId_actorUserId_type_idempotencyKey: {
          companyId: scopedContext.companyId,
          actorUserId: scopedContext.actorUserId,
          type: AvailabilityCommandType.CORRECT,
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
      if (existingCommand.completedAt && existingCommand.surgeryId) {
        return {
          surgeryId: existingCommand.surgeryId,
          date: command.date,
          replayed: true,
        };
      }
      throw conflict("Availability correction command is incomplete", "availability_expected_date_mismatch");
    }

    const surgery = await tx.surgery.findFirst({
      where: { id: command.surgeryId, companyId: scopedContext.companyId },
      select: {
        id: true,
        materialAvailabilityDate: true,
      },
    });
    if (!surgery) {
      throw notFound("Surgery not found", "availability_surgery_not_found");
    }
    const currentDate = serializeDateOnly(surgery.materialAvailabilityDate);
    if (!currentDate) {
      throw conflict(
        "Material availability date is missing",
        "availability_expected_date_mismatch"
      );
    }
    if (currentDate !== command.expectedCurrentDate) {
      throw conflict(
        "Material availability date changed",
        "availability_expected_date_mismatch"
      );
    }
    if (currentDate === command.date) {
      throw conflict(
        "Material availability date is unchanged",
        "availability_date_unchanged"
      );
    }

    const openRequest = await tx.availabilityRequest.findFirst({
      where: {
        companyId: scopedContext.companyId,
        surgeryId: surgery.id,
        status: "OPEN",
      },
      select: { id: true },
    });
    if (openRequest) {
      throw conflict(
        "An open request blocks direct material availability writes",
        "availability_request_open"
      );
    }

    const commandRow = await tx.availabilityCommand.create({
      data: {
        companyId: scopedContext.companyId,
        actorUserId: scopedContext.actorUserId,
        type: AvailabilityCommandType.CORRECT,
        idempotencyKey: command.idempotencyKey,
        payloadHash,
        surgeryId: surgery.id,
      },
    });
    const update = await tx.surgery.updateMany({
      where: {
        id: surgery.id,
        companyId: scopedContext.companyId,
        materialAvailabilityDate: toDateOnly(command.expectedCurrentDate),
      },
      data: { materialAvailabilityDate: toDateOnly(command.date) },
    });
    if (update.count !== 1) {
      throw conflict(
        "Material availability date changed",
        "availability_expected_date_mismatch"
      );
    }

    const effectBase = {
      tx,
      companyId: scopedContext.companyId,
      surgeryId: surgery.id,
      actorUserId: scopedContext.actorUserId,
      correlationId,
    };
    const audit = await dependencies.effects.writeAudit({
      ...effectBase,
      action: "availability.corrected",
      oldDate: currentDate,
      newDate: command.date,
      reason: command.reason,
    });
    await dependencies.effects.writeTrace({
      ...effectBase,
      auditEventId: audit.id,
      event: "corrected",
      content: `Se corrigió la disponibilidad del ${formatDate(currentDate)} al ${formatDate(command.date)}`,
      oldDate: currentDate,
      newDate: command.date,
    });
    await tx.availabilityCommand.update({
      where: { id: commandRow.id },
      data: {
        completedAt: new Date(),
        resultCode: "availability_date_corrected",
      },
    });

    return { surgeryId: surgery.id, date: command.date };
  });
}
