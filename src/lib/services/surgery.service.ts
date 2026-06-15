// OSSUM COR — Surgery service
// Every operational query MUST filter by companyId.
// Contact references are global and MUST be validated through ContactCompanyLink.
// Services receive prisma as dependency injection.

import type { Prisma, PrismaClient, Surgery } from "@prisma/client";

import { assertContactsBelongToCompany } from "./contact.service";
import { createAuditEvent } from "../audit";
import { requireCompanyId } from "../tenant";
import {
  validateCreateSurgeryInput,
  validateCxStatusTransition,
  validateUpdateSurgeryCxStatusInput,
  validateUpdateSurgeryInput,
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
  cxStatus?: string;
  prepStatus?: string;
  payerContactId?: string;
  priority?: string;
  branchId?: string;
  patientId?: string;
  doctorId?: string;
  institutionId?: string;
  take?: number;
  skip?: number;
};

const surgeryReadSelect = {
  id: true,
  companyId: true,
  branchId: true,
  visibleNumber: true,
  patientId: true,
  doctorId: true,
  institutionId: true,
  payerContactId: true,
  classification: true,
  description: true,
  priority: true,
  cxStatus: true,
  prepStatus: true,
  probableDate: true,
  scheduledDate: true,
  surgeryDate: true,
  performedDate: true,
  cancelledDate: true,
  source: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      legalName: true,
    },
  },
  doctor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      legalName: true,
    },
  },
  institution: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      legalName: true,
    },
  },
  payer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      legalName: true,
    },
  },
} satisfies Prisma.SurgerySelect;

type SurgeryAuditShape = Pick<
  Surgery,
  | "id"
  | "companyId"
  | "branchId"
  | "visibleNumber"
  | "patientId"
  | "doctorId"
  | "institutionId"
  | "payerContactId"
  | "classification"
  | "description"
  | "priority"
  | "cxStatus"
  | "prepStatus"
  | "probableDate"
  | "scheduledDate"
  | "surgeryDate"
  | "performedDate"
  | "cancelledDate"
  | "source"
  | "notes"
  | "createdAt"
  | "updatedAt"
>;

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

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

function serializeSurgeryForAudit(surgery: SurgeryAuditShape | null) {
  if (!surgery) {
    return null;
  }

  return {
    id: surgery.id,
    companyId: surgery.companyId,
    branchId: surgery.branchId,
    visibleNumber: surgery.visibleNumber,
    patientId: surgery.patientId,
    doctorId: surgery.doctorId,
    institutionId: surgery.institutionId,
    payerContactId: surgery.payerContactId,
    classification: surgery.classification,
    description: surgery.description,
    priority: surgery.priority,
    cxStatus: surgery.cxStatus,
    prepStatus: surgery.prepStatus,
    probableDate: serializeDate(surgery.probableDate),
    scheduledDate: serializeDate(surgery.scheduledDate),
    surgeryDate: serializeDate(surgery.surgeryDate),
    performedDate: serializeDate(surgery.performedDate),
    cancelledDate: serializeDate(surgery.cancelledDate),
    source: surgery.source,
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
    payerContactId?: string | null;
    branchId?: string | null;
  }
): Promise<void> {
  const contactIds = [
    data.patientId,
    data.doctorId,
    data.institutionId,
    data.payerContactId,
  ].filter((value): value is string => Boolean(value));

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
    select: surgeryReadSelect,
    where: {
      companyId: scopedCompanyId,
      cxStatus: options?.cxStatus ?? options?.status,
      prepStatus: options?.prepStatus,
      payerContactId: options?.payerContactId,
      priority: options?.priority,
      branchId: options?.branchId,
      patientId: options?.patientId,
      doctorId: options?.doctorId,
      institutionId: options?.institutionId,
    },
    orderBy: [{ surgeryDate: "desc" }, { createdAt: "desc" }],
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
    select: surgeryReadSelect,
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
    payerContactId: validatedData.payerContactId,
    branchId: validatedData.branchId,
  });

  return prisma.$transaction(async (tx) => {
    const surgery = await tx.surgery.create({
      data: {
        companyId: scopedCompanyId,
        branchId: validatedData.branchId ?? null,
        visibleNumber: validatedData.visibleNumber ?? null,
        patientId: validatedData.patientId,
        doctorId: validatedData.doctorId ?? null,
        institutionId: validatedData.institutionId ?? null,
        payerContactId: validatedData.payerContactId ?? null,
        classification: validatedData.classification ?? null,
        description: validatedData.description ?? null,
        priority: validatedData.priority ?? null,
        cxStatus: validatedData.cxStatus,
        prepStatus: validatedData.prepStatus ?? null,
        probableDate: validatedData.probableDate ?? null,
        scheduledDate: validatedData.scheduledDate ?? null,
        surgeryDate: validatedData.surgeryDate ?? null,
        performedDate: validatedData.performedDate ?? null,
        cancelledDate: validatedData.cancelledDate ?? null,
        source: validatedData.source ?? null,
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

  const currentSurgery = await prisma.surgery.findFirst({
    where: { id: surgeryId, companyId: scopedCompanyId },
  });

  if (!currentSurgery) {
    throw new Error(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`);
  }

  if (validatedData.cxStatus !== undefined) {
    validateCxStatusTransition(currentSurgery.cxStatus, validatedData.cxStatus);
  }

  await assertSurgeryReferencesBelongToCompany(prisma, scopedCompanyId, {
    patientId: validatedData.patientId,
    doctorId: validatedData.doctorId,
    institutionId: validatedData.institutionId,
    payerContactId: validatedData.payerContactId,
    branchId: validatedData.branchId,
  });

  return prisma.$transaction(async (tx) => {
    const result = await tx.surgery.updateMany({
      where: { id: surgeryId, companyId: scopedCompanyId },
      data: {
        branchId: validatedData.branchId,
        visibleNumber: validatedData.visibleNumber,
        patientId: validatedData.patientId,
        doctorId: validatedData.doctorId,
        institutionId: validatedData.institutionId,
        payerContactId: validatedData.payerContactId,
        classification: validatedData.classification,
        description: validatedData.description,
        priority: validatedData.priority,
        cxStatus: validatedData.cxStatus,
        prepStatus: validatedData.prepStatus,
        probableDate: validatedData.probableDate,
        scheduledDate: validatedData.scheduledDate,
        surgeryDate: validatedData.surgeryDate,
        performedDate: validatedData.performedDate,
        cancelledDate: validatedData.cancelledDate,
        source: validatedData.source,
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

/** Update only the CX status of a surgery after verifying tenant ownership. */
export async function updateSurgeryCxStatus(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string,
  cxStatus: string
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);
  const validatedData = validateUpdateSurgeryCxStatusInput({ cxStatus });

  const currentSurgery = await prisma.surgery.findFirst({
    where: { id: surgeryId, companyId: scopedCompanyId },
  });

  if (!currentSurgery) {
    throw new Error(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`);
  }

  validateCxStatusTransition(currentSurgery.cxStatus, validatedData.cxStatus);

  return prisma.$transaction(async (tx) => {
    const result = await tx.surgery.updateMany({
      where: { id: surgeryId, companyId: scopedCompanyId },
      data: { cxStatus: validatedData.cxStatus },
    });

    if (result.count !== 1) {
      throw new Error(
        `Failed to update surgery cxStatus for ${surgeryId} in company ${scopedCompanyId}`
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
      action: "surgery.cx_status_changed",
      module: scopedContext.module ?? "surgery",
      oldValue: { cxStatus: currentSurgery.cxStatus },
      newValue: { cxStatus: validatedData.cxStatus },
      metadata: auditMetadata(scopedContext),
    });

    return updatedSurgery;
  });
}

/** Compatibility wrapper for existing PATCH status route. */
export async function updateSurgeryStatus(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string,
  status: string
) {
  return updateSurgeryCxStatus(prisma, context, surgeryId, status);
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
