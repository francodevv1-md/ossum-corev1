import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { conflict, forbidden, notFound } from "../api/errors";
import { canMutateDocumentation } from "../permissions/documentation";
import {
  DOCUMENTATION_STATES,
  DOCUMENTATION_TEMPLATE,
  DOCUMENTATION_TEMPLATE_VERSION,
  deriveDocumentationAggregate,
  isDocumentationTransitionAllowed,
  type DocumentationState,
  type DocumentationStatePatch,
} from "../validators/documentation.validator";

const MAX_INITIALIZE_ATTEMPTS = 3;
const INITIALIZE_UNIQUE_CONSTRAINTS = ["uq_sdc_company_surgery", "uq_sdi_checklist_type"] as const;
const INITIALIZE_UNIQUE_FIELD_TARGETS = [
  ["companyId", "surgeryId"],
  ["checklistId", "type"],
] as const;

export type SurgeryDocumentationContext = { companyId: string; actorUserId: string };

export type SurgeryDocumentationEffects = {
  writeAudit(input: {
    tx: Prisma.TransactionClient;
    companyId: string;
    actorUserId: string;
    entityType: "SurgeryDocumentChecklist" | "SurgeryDocumentItem";
    entityId: string;
    action: "documentation.checklist_initialized" | "documentation.item_state_changed";
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string }>;
};

export type SurgeryDocumentationServiceDependencies = {
  prisma: PrismaClient;
  effects: SurgeryDocumentationEffects;
};

type DocumentationItemRow = {
  id: string;
  type: string;
  label: string;
  required: boolean;
  sortOrder: number;
  state: string;
  observation: string | null;
  updatedAt: Date;
};

type DocumentationChecklistRow = {
  id: string;
  templateVersion: string;
  createdAt: Date;
  updatedAt: Date;
  items: DocumentationItemRow[];
};

export type SurgeryDocumentationView = {
  checklist: null | { id: string; templateVersion: string; createdAt: string; updatedAt: string };
  status: "not_required" | "observed" | "ready" | "incomplete";
  progress: { approved: number; total: number };
  items: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    sortOrder: number;
    state: string;
    observation: string | null;
    updatedAt: string;
  }>;
};

function normalizeContext(context: SurgeryDocumentationContext): SurgeryDocumentationContext {
  const companyId = context.companyId?.trim();
  const actorUserId = context.actorUserId?.trim();
  if (!companyId || !actorUserId) throw notFound("Documentation not found", "documentation_not_found");
  return { companyId, actorUserId };
}

async function requireActiveMembership(
  tx: Prisma.TransactionClient,
  context: SurgeryDocumentationContext,
  mutation: boolean
): Promise<{ role: string }> {
  const access = await tx.userCompanyAccess.findFirst({
    where: {
      companyId: context.companyId,
      userId: context.actorUserId,
      isActive: true,
      user: { isActive: true },
      company: { isActive: true },
    },
    select: { role: true },
  });
  if (!access) throw notFound("Documentation not found", "documentation_not_found");
  if (mutation && !canMutateDocumentation(access.role)) {
    throw forbidden("Company mutation access denied", "company_mutation_access_denied");
  }
  return access;
}

async function requireSurgery(tx: Prisma.TransactionClient, companyId: string, surgeryId: string): Promise<void> {
  const surgery = await tx.surgery.findFirst({ where: { companyId, id: surgeryId }, select: { id: true } });
  if (!surgery) throw notFound("Documentation not found", "documentation_not_found");
}

async function findChecklist(
  tx: Prisma.TransactionClient,
  companyId: string,
  surgeryId: string
): Promise<DocumentationChecklistRow | null> {
  return tx.surgeryDocumentChecklist.findFirst({
    where: { companyId, surgeryId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  }) as Promise<DocumentationChecklistRow | null>;
}

function toDocumentation(checklist: DocumentationChecklistRow | null): SurgeryDocumentationView {
  if (!checklist) {
    return { checklist: null, status: "not_required", progress: { approved: 0, total: 0 }, items: [] };
  }
  const aggregate = deriveDocumentationAggregate(checklist.items);
  return {
    checklist: {
      id: checklist.id,
      templateVersion: checklist.templateVersion,
      createdAt: checklist.createdAt.toISOString(),
      updatedAt: checklist.updatedAt.toISOString(),
    },
    status: aggregate.status,
    progress: { approved: aggregate.approved, total: aggregate.total },
    items: checklist.items.map((item) => ({
      id: item.id,
      type: item.type,
      label: item.label,
      required: item.required,
      sortOrder: item.sortOrder,
      state: item.state,
      observation: item.observation,
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

function isKnownError(error: unknown, code: string): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function isInitializeRetryable(error: unknown): boolean {
  if (isKnownError(error, "P2034")) return true;
  if (!isKnownError(error, "P2002")) return false;
  const target = error.meta?.target;
  if (typeof target === "string") {
    return INITIALIZE_UNIQUE_CONSTRAINTS.some((constraint) => target === constraint);
  }
  if (!Array.isArray(target) || !target.every((field) => typeof field === "string")) {
    return false;
  }
  return INITIALIZE_UNIQUE_FIELD_TARGETS.some(
    (fields) => fields.length === target.length && fields.every((field, index) => field === target[index])
  );
}

function writeConflict(): never {
  throw conflict("Documentation changed; refresh and retry", "documentation_write_conflict");
}

export async function getSurgeryDocumentation(
  dependencies: Pick<SurgeryDocumentationServiceDependencies, "prisma">,
  context: SurgeryDocumentationContext,
  surgeryId: string
): Promise<SurgeryDocumentationView> {
  const scoped = normalizeContext(context);
  return dependencies.prisma.$transaction(async (tx) => {
    await requireActiveMembership(tx, scoped, false);
    await requireSurgery(tx, scoped.companyId, surgeryId);
    return toDocumentation(await findChecklist(tx, scoped.companyId, surgeryId));
  });
}

export async function initializeSurgeryDocumentation(
  dependencies: SurgeryDocumentationServiceDependencies,
  context: SurgeryDocumentationContext,
  surgeryId: string
): Promise<{ documentation: SurgeryDocumentationView; createdChecklist: boolean; insertedTypes: string[] }> {
  const scoped = normalizeContext(context);
  for (let attempt = 0; attempt < MAX_INITIALIZE_ATTEMPTS; attempt += 1) {
    try {
      return await dependencies.prisma.$transaction(async (tx) => {
        await requireActiveMembership(tx, scoped, true);
        await requireSurgery(tx, scoped.companyId, surgeryId);
        let checklist = await findChecklist(tx, scoped.companyId, surgeryId);
        const createdChecklist = checklist === null;
        const previousSnapshot = checklist
          ? {
              templateVersion: checklist.templateVersion,
              itemTypes: checklist.items.map((entry) => entry.type).sort(),
            }
          : null;
        if (!checklist) {
          checklist = await tx.surgeryDocumentChecklist.create({
            data: {
              companyId: scoped.companyId,
              surgeryId,
              templateVersion: DOCUMENTATION_TEMPLATE_VERSION,
              createdById: scoped.actorUserId,
              updatedById: scoped.actorUserId,
            },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          }) as DocumentationChecklistRow;
        }

        const existingTypes = new Set(checklist.items.map((entry) => entry.type));
        const missing = DOCUMENTATION_TEMPLATE.filter((entry) => !existingTypes.has(entry.type));
        const insertedTypes = missing.map((entry) => entry.type);
        const resultingItemTypes = [...existingTypes, ...insertedTypes].sort();
        if (missing.length > 0) {
          await tx.surgeryDocumentItem.createMany({
            data: missing.map((entry) => ({
              companyId: scoped.companyId,
              checklistId: checklist!.id,
              ...entry,
              state: "pending",
              observation: null,
              createdById: scoped.actorUserId,
              updatedById: scoped.actorUserId,
            })),
          });
        }

        const changed = createdChecklist || insertedTypes.length > 0;
        if (changed) {
          await tx.surgeryDocumentChecklist.update({
            where: { id: checklist.id },
            data: { updatedById: scoped.actorUserId },
          });
          await dependencies.effects.writeAudit({
            tx,
            companyId: scoped.companyId,
            actorUserId: scoped.actorUserId,
            entityType: "SurgeryDocumentChecklist",
            entityId: checklist.id,
            action: "documentation.checklist_initialized",
            oldValue: previousSnapshot,
            newValue: {
              templateVersion: checklist.templateVersion,
              itemTypes: resultingItemTypes,
            },
            metadata: {
              companyId: scoped.companyId,
              surgeryId,
              checklistId: checklist.id,
              templateVersion: checklist.templateVersion,
              createdChecklist,
              insertedTypes,
            },
          });
          checklist = (await findChecklist(tx, scoped.companyId, surgeryId))!;
        }
        return { documentation: toDocumentation(checklist), createdChecklist, insertedTypes: [...insertedTypes] };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (isInitializeRetryable(error) && attempt < MAX_INITIALIZE_ATTEMPTS - 1) continue;
      if (isInitializeRetryable(error)) writeConflict();
      throw error;
    }
  }
  return writeConflict();
}

export type TransitionDocumentationItemCommand = DocumentationStatePatch & { surgeryId: string; itemId: string };

export async function transitionSurgeryDocumentationItem(
  dependencies: SurgeryDocumentationServiceDependencies,
  context: SurgeryDocumentationContext,
  command: TransitionDocumentationItemCommand
): Promise<{ documentation: SurgeryDocumentationView }> {
  const scoped = normalizeContext(context);
  try {
    return await dependencies.prisma.$transaction(async (tx) => {
      await requireActiveMembership(tx, scoped, true);
      const current = await tx.surgeryDocumentItem.findFirst({
        where: {
          companyId: scoped.companyId,
          id: command.itemId,
          checklist: { companyId: scoped.companyId, surgeryId: command.surgeryId },
        },
        include: { checklist: { select: { surgeryId: true, templateVersion: true } } },
      });
      if (!current || !DOCUMENTATION_STATES.includes(current.state as DocumentationState)) {
        throw notFound("Documentation not found", "documentation_not_found");
      }
      const oldState = current.state as DocumentationState;
      if (!isDocumentationTransitionAllowed(oldState, command.state)) {
        throw conflict("Documentation state transition is forbidden", "documentation_transition_forbidden");
      }
      const observation = command.state === "observed" ? command.observation! : null;
      const expectedUpdatedAt = new Date(command.expectedUpdatedAt);
      const updated = await tx.surgeryDocumentItem.updateMany({
        where: {
          companyId: scoped.companyId,
          id: current.id,
          state: oldState,
          updatedAt: expectedUpdatedAt,
        },
        data: { state: command.state, observation, updatedById: scoped.actorUserId },
      });
      if (updated.count !== 1) writeConflict();

      const checklistUpdate = await tx.surgeryDocumentChecklist.updateMany({
        where: { id: current.checklistId, companyId: scoped.companyId },
        data: { updatedById: scoped.actorUserId },
      });
      if (checklistUpdate.count !== 1) writeConflict();
      await dependencies.effects.writeAudit({
        tx,
        companyId: scoped.companyId,
        actorUserId: scoped.actorUserId,
        entityType: "SurgeryDocumentItem",
        entityId: current.id,
        action: "documentation.item_state_changed",
        oldValue: { state: oldState, observation: current.observation },
        newValue: { state: command.state, observation },
        metadata: {
          companyId: scoped.companyId,
          surgeryId: command.surgeryId,
          checklistId: current.checklistId,
          itemId: current.id,
          type: current.type,
          templateVersion: current.checklist.templateVersion,
        },
      });
      const checklist = await findChecklist(tx, scoped.companyId, command.surgeryId);
      if (!checklist) throw notFound("Documentation not found", "documentation_not_found");
      return { documentation: toDocumentation(checklist) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (isKnownError(error, "P2034") || isKnownError(error, "P2002")) writeConflict();
    throw error;
  }
}
