// OSSUM COR — Surgery service
// Every operational query MUST filter by companyId.
// Contact references are global and MUST be validated through ContactCompanyLink.
// Services receive prisma as dependency injection.

import type { PrismaClient, Surgery } from "@prisma/client";

import { assertContactsBelongToCompany } from "./contact.service";
import { createAuditEvent } from "../audit";
import { requireCompanyId } from "../tenant";
import {
  validateCreateSurgeryInput,
  validateSurgeryStatusTransition,
  validateUpdateSurgeryInput,
  validateUpdateSurgeryStatusInput,
  type CreateSurgeryInput,
  type UpdateSurgeryInput,
} from "../validators/surgery.validator";

export type SurgeryActorContext = {
  actorUserId: string;
  companyId: string;
  source?: string;
  module?: "surgery";
};

const SURGERY_MUTATION_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
] as const;

type ListSurgeriesOptions = {
  status?: string;
  branchId?: string;
  patientId?: string;
  doctorId?: string;
  institutionId?: string;
  take?: number;
  skip?: number;
};

async function assertBranchBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  branchId: string
): Promise<void> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId },
    select: { id: true },
  });

  if (!branch) {
    throw new Error(`Branch ${branchId} not found in company ${companyId}`);
  }
}

function validateActorContext(context: SurgeryActorContext): SurgeryActorContext {
  if (
    typeof context.actorUserId !== "string" ||
    context.actorUserId.trim().length === 0
  ) {
    throw new Error("actorUserId is required for surgery mutations");
  }

  return {
    ...context,
    companyId: requireCompanyId(context.companyId),
    module: context.module ?? "surgery",
  };
}

async function assertActorCanMutateSurgery(
  prisma: PrismaClient,
  context: SurgeryActorContext
): Promise<SurgeryActorContext> {
  const scopedContext = validateActorContext(context);

  const access = await prisma.userCompanyAccess.findFirst({
    where: {
      userId: scopedContext.actorUserId,
      companyId: scopedContext.companyId,
      isActive: true,
      role: { in: [...SURGERY_MUTATION_ROLES] },
    },
    select: { id: true },
  });

  if (!access) {
    throw new Error(
      `User ${scopedContext.actorUserId} is not allowed to mutate surgeries in company ${scopedContext.companyId}`
    );
  }

  return scopedContext;
}

function serializeSurgeryForAudit(surgery: Surgery | null) {
  if (!surgery) {
    return null;
  }

  return {
    id: surgery.id,
    companyId: surgery.companyId,
    branchId: surgery.branchId,
    patientId: surgery.patientId,
    doctorId: surgery.doctorId,
    institutionId: surgery.institutionId,
    surgeryDate: surgery.surgeryDate.toISOString(),
    status: surgery.status,
    notes: surgery.notes,
    createdAt: surgery.createdAt.toISOString(),
    updatedAt: surgery.updatedAt.toISOString(),
  };
}

function auditMetadata(context: SurgeryActorContext) {
  return {
    source: context.source,
  };
}

async function assertSurgeryReferencesBelongToCompany(
  prisma: PrismaClient,
  companyId: string,
  data: {
    patientId?: string;
    doctorId?: string | null;
    institutionId?: string | null;
    branchId?: string | null;
  }
): Promise<void> {
  const contactIds = [data.patientId, data.doctorId, data.institutionId].filter(
    (value): value is string => Boolean(value)
  );

  await assertContactsBelongToCompany(prisma, companyId, contactIds);

  if (data.branchId) {
    await assertBranchBelongsToCompany(prisma, companyId, data.branchId);
  }
}

/** List surgeries for a company with optional scoped filters. */
export async function listSurgeriesByCompany(
  prisma: PrismaClient,
  companyId: string,
  options?: ListSurgeriesOptions
) {
  const scopedCompanyId = requireCompanyId(companyId);

  return prisma.surgery.findMany({
    where: {
      companyId: scopedCompanyId,
      status: options?.status,
      branchId: options?.branchId,
      patientId: options?.patientId,
      doctorId: options?.doctorId,
      institutionId: options?.institutionId,
    },
    orderBy: { surgeryDate: "desc" },
    take: options?.take ?? 50,
    skip: options?.skip,
  });
}

/** Get a single surgery by ID, scoped to a company. */
export async function getSurgeryById(
  prisma: PrismaClient,
  companyId: string,
  surgeryId: string
) {
  const scopedCompanyId = requireCompanyId(companyId);

  return prisma.surgery.findFirst({
    where: {
      id: surgeryId,
      companyId: scopedCompanyId,
    },
  });
}

/** Create a surgery after validating all tenant-scoped references. */
export async function createSurgery(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  data: CreateSurgeryInput
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);
  const validatedData = validateCreateSurgeryInput(data);

  await assertSurgeryReferencesBelongToCompany(prisma, scopedCompanyId, {
    patientId: validatedData.patientId,
    doctorId: validatedData.doctorId,
    institutionId: validatedData.institutionId,
    branchId: validatedData.branchId,
  });

  return prisma.$transaction(async (tx) => {
    const surgery = await tx.surgery.create({
      data: {
        companyId: scopedCompanyId,
        branchId: validatedData.branchId ?? null,
        patientId: validatedData.patientId,
        doctorId: validatedData.doctorId ?? null,
        institutionId: validatedData.institutionId ?? null,
        surgeryDate: validatedData.surgeryDate,
        status: validatedData.status,
        notes: validatedData.notes,
      },
    });

    await createAuditEvent({
      prisma: tx as unknown as PrismaClient,
      companyId: scopedCompanyId,
      userId: scopedContext.actorUserId,
      entityType: "Surgery",
      entityId: surgery.id,
      action: "surgery.created",
      module: scopedContext.module ?? "surgery",
      oldValue: null,
      newValue: serializeSurgeryForAudit(surgery),
      metadata: auditMetadata(scopedContext),
    });

    return surgery;
  });
}

/** Update a surgery after validating company ownership and changed references. */
export async function updateSurgery(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string,
  data: UpdateSurgeryInput
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);
  const validatedData = validateUpdateSurgeryInput(data);

  const currentSurgery = await getSurgeryById(prisma, scopedCompanyId, surgeryId);
  if (!currentSurgery) {
    throw new Error(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`);
  }

  if (validatedData.status !== undefined) {
    validateSurgeryStatusTransition(currentSurgery.status, validatedData.status);
  }

  await assertSurgeryReferencesBelongToCompany(prisma, scopedCompanyId, {
    patientId: validatedData.patientId,
    doctorId: validatedData.doctorId,
    institutionId: validatedData.institutionId,
    branchId: validatedData.branchId,
  });

  return prisma.$transaction(async (tx) => {
    const result = await tx.surgery.updateMany({
      where: { id: surgeryId, companyId: scopedCompanyId },
      data: {
        branchId: validatedData.branchId,
        patientId: validatedData.patientId,
        doctorId: validatedData.doctorId,
        institutionId: validatedData.institutionId,
        surgeryDate: validatedData.surgeryDate,
        status: validatedData.status,
        notes: validatedData.notes,
      },
    });

    if (result.count !== 1) {
      throw new Error(
        `Failed to update surgery ${surgeryId} in company ${scopedCompanyId}`
      );
    }

    const updatedSurgery = await tx.surgery.findFirst({
      where: { id: surgeryId, companyId: scopedCompanyId },
    });

    await createAuditEvent({
      prisma: tx as unknown as PrismaClient,
      companyId: scopedCompanyId,
      userId: scopedContext.actorUserId,
      entityType: "Surgery",
      entityId: surgeryId,
      action: "surgery.updated",
      module: scopedContext.module ?? "surgery",
      oldValue: serializeSurgeryForAudit(currentSurgery),
      newValue: serializeSurgeryForAudit(updatedSurgery),
      metadata: auditMetadata(scopedContext),
    });

    return updatedSurgery;
  });
}

/** Update only the status of a surgery after verifying tenant ownership. */
export async function updateSurgeryStatus(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string,
  status: string
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);
  const validatedData = validateUpdateSurgeryStatusInput({ status });

  const currentSurgery = await getSurgeryById(prisma, scopedCompanyId, surgeryId);
  if (!currentSurgery) {
    throw new Error(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`);
  }
  validateSurgeryStatusTransition(currentSurgery.status, validatedData.status);

  return prisma.$transaction(async (tx) => {
    const result = await tx.surgery.updateMany({
      where: { id: surgeryId, companyId: scopedCompanyId },
      data: { status: validatedData.status },
    });

    if (result.count !== 1) {
      throw new Error(
        `Failed to update surgery status for ${surgeryId} in company ${scopedCompanyId}`
      );
    }

    const updatedSurgery = await tx.surgery.findFirst({
      where: { id: surgeryId, companyId: scopedCompanyId },
    });

    await createAuditEvent({
      prisma: tx as unknown as PrismaClient,
      companyId: scopedCompanyId,
      userId: scopedContext.actorUserId,
      entityType: "Surgery",
      entityId: surgeryId,
      action: "surgery.status_changed",
      module: scopedContext.module ?? "surgery",
      oldValue: { status: currentSurgery.status },
      newValue: { status: validatedData.status },
      metadata: auditMetadata(scopedContext),
    });

    return updatedSurgery;
  });
}

/** Assert that a surgery belongs to a company. */
export async function assertSurgeryBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  surgeryId: string
): Promise<void> {
  const scopedCompanyId = requireCompanyId(companyId);

  const surgery = await prisma.surgery.findFirst({
    where: {
      id: surgeryId,
      companyId: scopedCompanyId,
    },
    select: { id: true },
  });

  if (!surgery) {
    throw new Error(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`);
  }
}
