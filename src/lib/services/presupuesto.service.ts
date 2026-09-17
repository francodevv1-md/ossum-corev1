import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { createAuditEvent } from "../audit";
import { ApiError, badRequest, notFound } from "../api/errors";
import { requireCompanyId } from "../tenant";

export const PRESUPUESTO_STATES = [
  "Borrador",
  "Emitido",
  "Aprobado",
  "Rechazado",
  "Vencido",
  "Reemplazado",
  "Anulado",
] as const;
export type PresupuestoState = (typeof PRESUPUESTO_STATES)[number];
export type PresupuestoCommand = "approve" | "reject" | "expire" | "annul";

export const PRESUPUESTO_MUTATION_ROLES = ["admin", "coordinador", "vendedor"] as const;
export const PRESUPUESTO_READ_ROLES = [
  "admin",
  "coordinador",
  "logistica",
  "vendedor",
  "matrona",
  "instrumentador",
] as const;

export const DISTRICORR_ESTIMATIVE_LEGEND =
  "El presente presupuesto es estimativo y se emite para orientación inicial del paciente. Queda sujeto a confirmación de disponibilidad de implantes, definición final del acto quirúrgico, institución, fecha de cirugía, logística y validación operativa correspondiente.";

const MAX_TRANSACTION_RETRIES = 3;
const DEFAULT_LIST_TAKE = 50;

export class PresupuestoError extends ApiError {
  constructor(code: string, message: string, status = 409) {
    super(status, code, message);
    this.name = "PresupuestoError";
  }
}

export interface PresupuestoCommercialInput {
  pricingMode: "ESTIMATIVE" | "FIRM";
  firmPrice?: {
    coordinator: string;
    quotationContact: string;
    includedMaterials: string[];
    excludedMaterials: string[];
    availability: string;
    operationalClarifications: string;
    surgicalAssumptions: string;
  };
}

export interface PresupuestoItemInput {
  sku?: string;
  description: string;
  quantity: string | number | Prisma.Decimal;
  unit?: string;
  unitPrice: string | number | Prisma.Decimal;
  discountRate?: string | number | Prisma.Decimal;
  taxRate?: string | number | Prisma.Decimal;
  metadata?: Record<string, unknown>;
}

interface DraftFieldsInput {
  branchId: string;
  clientContactId: string;
  payerContactId: string;
  title?: string;
  currency?: string;
  documentDate: Date;
  paymentTerms: string;
  priceListCode: string;
  legend: string;
  notes?: string;
  validUntil: Date;
  generalDiscountRate?: string | number | Prisma.Decimal;
  commercial: PresupuestoCommercialInput;
  items: PresupuestoItemInput[];
}

export interface CreateFamilyDraftInput extends DraftFieldsInput {
  companyId: string;
  surgeryId?: string;
  actorUserId: string;
  prisma: PrismaClient;
}

export interface ReplaceDraftInput extends DraftFieldsInput {
  companyId: string;
  presupuestoId: string;
  expectedRevision: number;
  actorUserId: string;
  prisma: PrismaClient;
}

interface ExpectedRevisionInput {
  companyId: string;
  presupuestoId: string;
  expectedRevision: number;
  actorUserId: string;
  prisma: PrismaClient;
}

export interface ListPresupuestosInput {
  companyId: string;
  surgeryId?: string;
  state?: PresupuestoState;
  take?: number;
  skip?: number;
  prisma: PrismaClient;
}

export interface GetPresupuestoInput {
  companyId: string;
  presupuestoId: string;
  prisma: PrismaClient;
}

const presupuestoReadSelect = {
  id: true,
  visibleNumber: true,
  companyId: true,
  familyId: true,
  surgeryId: true,
  branchId: true,
  clientContactId: true,
  payerContactId: true,
  parentPresupuestoId: true,
  sourcePresupuestoId: true,
  versionNumber: true,
  slot: true,
  revision: true,
  state: true,
  title: true,
  currency: true,
  documentDate: true,
  paymentTerms: true,
  priceListCode: true,
  legend: true,
  notes: true,
  generalDiscountRate: true,
  commercialSnapshot: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  total: true,
  validUntil: true,
  issuedAt: true,
  approvedAt: true,
  rejectedAt: true,
  createdById: true,
  updatedById: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      position: true,
      sku: true,
      description: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      discountRate: true,
      discount: true,
      taxRate: true,
      tax: true,
      total: true,
      metadata: true,
    },
    orderBy: { position: "asc" as const },
  },
} satisfies Prisma.PresupuestoSelect;

type PresupuestoRecord = Prisma.PresupuestoGetPayload<{ select: typeof presupuestoReadSelect }>;

function decimal(value: string | number | Prisma.Decimal | undefined, fallback = 0) {
  try {
    const result = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value ?? fallback);
    if (!result.isFinite()) throw new Error("Non-finite decimal");
    return result;
  } catch {
    throw badRequest("Invalid decimal value", "invalid_presupuesto_decimal");
  }
}

const quantize = (value: Prisma.Decimal) => value.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

function percentage(value: string | number | Prisma.Decimal | undefined) {
  const result = decimal(value);
  if (result.lt(0) || result.gt(100)) {
    throw badRequest("Percentage must be between 0 and 100", "invalid_presupuesto_percentage");
  }
  return quantize(result);
}

export function recalculatePresupuestoTotals(
  items: PresupuestoItemInput[],
  generalDiscountRateInput: string | number | Prisma.Decimal = 0
) {
  if (!items.length) throw badRequest("items must not be empty", "presupuesto_empty_items");
  const generalDiscountRate = percentage(generalDiscountRateInput);
  const normalizedItems = items.map((item, position) => {
    const quantity = quantize(decimal(item.quantity));
    const unitPrice = quantize(decimal(item.unitPrice));
    const discountRate = percentage(item.discountRate);
    const taxRate = percentage(item.taxRate);
    if (quantity.lte(0) || unitPrice.lt(0) || !item.description.trim()) {
      throw badRequest(`Invalid item at position ${position}`, "invalid_presupuesto_item");
    }
    const gross = quantize(quantity.mul(unitPrice));
    const lineDiscount = quantize(gross.mul(discountRate).div(100));
    const generalDiscount = quantize(gross.minus(lineDiscount).mul(generalDiscountRate).div(100));
    const discount = quantize(lineDiscount.plus(generalDiscount));
    const taxable = quantize(gross.minus(discount));
    const tax = quantize(taxable.mul(taxRate).div(100));
    return {
      position,
      sku: item.sku ?? null,
      description: item.description.trim(),
      quantity,
      unit: item.unit ?? null,
      unitPrice,
      discountRate,
      discount,
      taxRate,
      tax,
      total: quantize(taxable.plus(tax)),
      metadata: (item.metadata ?? null) as Prisma.InputJsonValue,
    };
  });
  const sum = (field: "discount" | "tax" | "total") =>
    normalizedItems.reduce((total, item) => quantize(total.plus(item[field])), new Prisma.Decimal(0));
  return {
    items: normalizedItems,
    generalDiscountRate,
    subtotal: normalizedItems.reduce(
      (total, item) => quantize(total.plus(quantize(item.quantity.mul(item.unitPrice)))),
      new Prisma.Decimal(0)
    ),
    discountTotal: sum("discount"),
    taxTotal: sum("tax"),
    total: sum("total"),
  };
}

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

export function toPresupuestoDto(row: PresupuestoRecord) {
  const state = row.state as PresupuestoState;
  const actions = row.slot === "DRAFT"
    ? ["edit", "delete", "emit"]
    : row.slot === "HISTORY"
      ? []
      : [
          ...(state === "Emitido" ? ["approve", "reject", "expire", "annul"] : []),
          ...(state === "Aprobado" ? ["annul"] : []),
          ...(state !== "Anulado" ? ["revise"] : []),
        ];
  return {
    ...row,
    documentDate: iso(row.documentDate),
    validUntil: iso(row.validUntil),
    issuedAt: iso(row.issuedAt),
    approvedAt: iso(row.approvedAt),
    rejectedAt: iso(row.rejectedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    generalDiscountRate: row.generalDiscountRate.toString(),
    subtotal: row.subtotal.toString(),
    discountTotal: row.discountTotal.toString(),
    taxTotal: row.taxTotal.toString(),
    total: row.total.toString(),
    items: row.items.map((item) => ({
      ...item,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      discountRate: item.discountRate.toString(),
      discount: item.discount.toString(),
      taxRate: item.taxRate.toString(),
      tax: item.tax.toString(),
      total: item.total.toString(),
    })),
    actions,
  };
}

function conflict(message: string): never {
  throw new PresupuestoError("presupuesto_conflict", message);
}

function isRace(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2004", "P2034"].includes(error.code);
}

async function serializable<T>(prisma: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (isRace(error) && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < MAX_TRANSACTION_RETRIES - 1) continue;
      if (isRace(error)) conflict("Presupuesto changed concurrently");
      throw error;
    }
  }
  conflict("Presupuesto changed concurrently");
}

async function lockFamily(tx: Prisma.TransactionClient, companyId: string, familyId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "presupuesto_family"
    WHERE "id" = ${familyId} AND "companyId" = ${companyId}
    FOR UPDATE
  `;
  if (rows.length !== 1) throw notFound("Presupuesto family not found", "presupuesto_not_found");
}

async function audit(
  tx: Prisma.TransactionClient,
  input: { companyId: string; actorUserId: string; entityId: string; action: string; oldValue: unknown; newValue: unknown }
) {
  await createAuditEvent({
    prisma: tx as unknown as PrismaClient,
    companyId: input.companyId,
    userId: input.actorUserId,
    entityType: "Presupuesto",
    entityId: input.entityId,
    action: input.action,
    module: "presupuesto",
    oldValue: input.oldValue as Prisma.InputJsonValue | null,
    newValue: input.newValue as Prisma.InputJsonValue | null,
  });
}

async function recordConflict(input: ExpectedRevisionInput, command: string) {
  await createAuditEvent({
    prisma: input.prisma,
    companyId: input.companyId,
    userId: input.actorUserId,
    entityType: "Presupuesto",
    entityId: input.presupuestoId,
    action: "presupuesto_conflict",
    module: "presupuesto",
    metadata: { command, expectedRevision: input.expectedRevision },
  });
}

async function withConflictAudit<T>(input: ExpectedRevisionInput, command: string, work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PresupuestoError && error.code === "presupuesto_conflict") {
      await recordConflict(input, command);
    }
    throw error;
  }
}

async function commercialSnapshot(tx: Prisma.TransactionClient, input: CreateFamilyDraftInput | ReplaceDraftInput) {
  if (input.commercial.pricingMode === "ESTIMATIVE" && input.legend !== DISTRICORR_ESTIMATIVE_LEGEND) {
    throw badRequest("Estimative budgets require the canonical legend", "invalid_presupuesto_legend");
  }
  if (input.commercial.pricingMode === "FIRM" && !input.commercial.firmPrice) {
    throw badRequest("Firm-price details are required", "invalid_presupuesto_firm_price");
  }
  const [company, branch, clientLink, payerLink, responsible] = await Promise.all([
    tx.company.findUnique({ where: { id: input.companyId }, select: { id: true, name: true } }),
    tx.branch.findFirst({ where: { id: input.branchId, companyId: input.companyId }, select: { id: true, name: true } }),
    tx.contactCompanyLink.findUnique({
      where: { contactId_companyId: { contactId: input.clientContactId, companyId: input.companyId } },
      select: { isActive: true, contact: { select: { id: true, firstName: true, lastName: true, legalName: true, documentType: true, documentNumber: true } } },
    }),
    tx.contactCompanyLink.findUnique({
      where: { contactId_companyId: { contactId: input.payerContactId, companyId: input.companyId } },
      select: { isActive: true, contact: { select: { id: true, firstName: true, lastName: true, legalName: true, documentType: true, documentNumber: true } } },
    }),
    tx.user.findUnique({ where: { id: input.actorUserId }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  if (!company || !branch || !clientLink?.isActive || !payerLink?.isActive || !responsible) {
    throw badRequest("Invalid company commercial references", "invalid_presupuesto_commercial_references");
  }
  return {
    company,
    branch,
    client: clientLink.contact,
    payer: payerLink.contact,
    responsible,
    ...input.commercial,
  } as Prisma.InputJsonValue;
}

function draftData(input: DraftFieldsInput, snapshot: Prisma.InputJsonValue) {
  const totals = recalculatePresupuestoTotals(input.items, input.generalDiscountRate);
  return {
    header: {
      branchId: input.branchId,
      clientContactId: input.clientContactId,
      payerContactId: input.payerContactId,
      title: input.title ?? null,
      currency: input.currency ?? "ARS",
      documentDate: input.documentDate,
      paymentTerms: input.paymentTerms,
      priceListCode: input.priceListCode,
      legend: input.legend,
      notes: input.notes ?? null,
      validUntil: input.validUntil,
      generalDiscountRate: totals.generalDiscountRate,
      commercialSnapshot: snapshot,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
    },
    items: totals.items,
  };
}

async function getRecord(tx: Prisma.TransactionClient, companyId: string, presupuestoId: string) {
  const row = await tx.presupuesto.findFirst({ where: { id: presupuestoId, companyId }, select: presupuestoReadSelect });
  if (!row) throw notFound("Presupuesto not found", "presupuesto_not_found");
  return row;
}

export async function createFamilyDraft(input: CreateFamilyDraftInput) {
  const companyId = requireCompanyId(input.companyId);
  try {
    return await serializable(input.prisma, async (tx) => {
      if (input.surgeryId) {
        const surgery = await tx.surgery.findFirst({ where: { id: input.surgeryId, companyId }, select: { id: true } });
        if (!surgery) throw notFound("Surgery not found", "surgery_not_found");
      }
      const snapshot = await commercialSnapshot(tx, input);
      const data = draftData(input, snapshot);
      const family = await tx.presupuestoFamily.create({ data: { companyId, surgeryId: input.surgeryId ?? null } });
      const created = await tx.presupuesto.create({
        data: {
          companyId,
          familyId: family.id,
          surgeryId: input.surgeryId ?? null,
          versionNumber: 1,
          slot: "DRAFT",
          revision: 1,
          state: "Borrador",
          ...data.header,
          createdById: input.actorUserId,
          updatedById: input.actorUserId,
          items: { create: data.items },
        },
        select: presupuestoReadSelect,
      });
      const dto = toPresupuestoDto(created);
      await audit(tx, { companyId, actorUserId: input.actorUserId, entityId: created.id, action: "presupuesto_draft_created", oldValue: null, newValue: dto });
      return dto;
    });
  } catch (error) {
    if (error instanceof PresupuestoError && error.code === "presupuesto_conflict" && input.surgeryId) {
      await createAuditEvent({
        prisma: input.prisma,
        companyId,
        userId: input.actorUserId,
        entityType: "Presupuesto",
        entityId: input.surgeryId,
        action: "presupuesto_conflict",
        module: "presupuesto",
        metadata: { command: "createFamilyDraft", surgeryId: input.surgeryId },
      });
    }
    throw error;
  }
}

export async function replaceDraft(input: ReplaceDraftInput) {
  const companyId = requireCompanyId(input.companyId);
  return withConflictAudit(input, "replaceDraft", () => serializable(input.prisma, async (tx) => {
    const current = await getRecord(tx, companyId, input.presupuestoId);
    await lockFamily(tx, companyId, current.familyId);
    if (current.slot !== "DRAFT" || current.state !== "Borrador" || current.revision !== input.expectedRevision) conflict("Draft revision is stale");
    const snapshot = await commercialSnapshot(tx, input);
    const data = draftData(input, snapshot);
    const claimed = await tx.presupuesto.updateMany({
      where: { id: current.id, companyId, slot: "DRAFT", state: "Borrador", revision: input.expectedRevision },
      data: { ...data.header, revision: { increment: 1 }, updatedById: input.actorUserId },
    });
    if (claimed.count !== 1) conflict("Draft revision is stale");
    await tx.presupuestoItem.deleteMany({ where: { presupuestoId: current.id } });
    await tx.presupuestoItem.createMany({ data: data.items.map((item) => ({ ...item, presupuestoId: current.id })) });
    const updated = await getRecord(tx, companyId, current.id);
    const dto = toPresupuestoDto(updated);
    await audit(tx, { companyId, actorUserId: input.actorUserId, entityId: current.id, action: "presupuesto_draft_replaced", oldValue: toPresupuestoDto(current), newValue: dto });
    return dto;
  }));
}

export async function deleteDraft(input: ExpectedRevisionInput) {
  const companyId = requireCompanyId(input.companyId);
  return withConflictAudit(input, "deleteDraft", () => serializable(input.prisma, async (tx) => {
    const current = await getRecord(tx, companyId, input.presupuestoId);
    await lockFamily(tx, companyId, current.familyId);
    if (current.slot !== "DRAFT" || current.state !== "Borrador" || current.revision !== input.expectedRevision) conflict("Draft revision is stale");
    const deleted = await tx.presupuesto.deleteMany({ where: { id: current.id, companyId, revision: input.expectedRevision, slot: "DRAFT" } });
    if (deleted.count !== 1) conflict("Draft revision is stale");
    await audit(tx, { companyId, actorUserId: input.actorUserId, entityId: current.id, action: "presupuesto_draft_deleted", oldValue: toPresupuestoDto(current), newValue: null });
    const remaining = await tx.presupuesto.count({ where: { familyId: current.familyId } });
    if (remaining === 0) await tx.presupuestoFamily.delete({ where: { id: current.familyId } });
    return { id: current.id, deleted: true };
  }));
}

export async function createRevisionDraft(input: ExpectedRevisionInput) {
  const companyId = requireCompanyId(input.companyId);
  return withConflictAudit(input, "createRevisionDraft", () => serializable(input.prisma, async (tx) => {
    const source = await getRecord(tx, companyId, input.presupuestoId);
    await lockFamily(tx, companyId, source.familyId);
    if (source.slot !== "CURRENT" || source.state === "Anulado" || source.revision !== input.expectedRevision) conflict("Current version cannot be revised or is stale");
    const max = await tx.presupuesto.aggregate({ where: { familyId: source.familyId }, _max: { versionNumber: true } });
    const created = await tx.presupuesto.create({
      data: {
        companyId,
        familyId: source.familyId,
        surgeryId: source.surgeryId,
        branchId: source.branchId,
        clientContactId: source.clientContactId,
        payerContactId: source.payerContactId,
        parentPresupuestoId: source.parentPresupuestoId ?? source.id,
        sourcePresupuestoId: source.id,
        versionNumber: (max._max.versionNumber ?? source.versionNumber) + 1,
        slot: "DRAFT",
        revision: 1,
        state: "Borrador",
        title: source.title,
        currency: source.currency,
        documentDate: source.documentDate,
        paymentTerms: source.paymentTerms,
        priceListCode: source.priceListCode,
        legend: source.legend,
        notes: source.notes,
        generalDiscountRate: source.generalDiscountRate,
        commercialSnapshot: source.commercialSnapshot as Prisma.InputJsonValue,
        subtotal: source.subtotal,
        discountTotal: source.discountTotal,
        taxTotal: source.taxTotal,
        total: source.total,
        validUntil: source.validUntil,
        createdById: input.actorUserId,
        updatedById: input.actorUserId,
        items: { create: source.items.map((item) => ({
          position: item.position,
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discountRate: item.discountRate,
          discount: item.discount,
          taxRate: item.taxRate,
          tax: item.tax,
          total: item.total,
          metadata: item.metadata as Prisma.InputJsonValue,
        })) },
      },
      select: presupuestoReadSelect,
    });
    const dto = toPresupuestoDto(created);
    await audit(tx, { companyId, actorUserId: input.actorUserId, entityId: created.id, action: "presupuesto_revision_draft_created", oldValue: toPresupuestoDto(source), newValue: dto });
    return dto;
  }));
}

async function nextVisibleNumber(tx: Prisma.TransactionClient, companyId: string) {
  await tx.$executeRaw`LOCK TABLE "presupuesto" IN SHARE ROW EXCLUSIVE MODE`;
  const rows = await tx.$queryRaw<Array<{ next: bigint }>>`
    SELECT COALESCE(MAX("visibleNumber"), 0) + 1 AS "next" FROM "presupuesto" WHERE "companyId" = ${companyId}
  `;
  return Number(rows[0]?.next ?? 1);
}

export async function emitDraft(input: ExpectedRevisionInput) {
  const companyId = requireCompanyId(input.companyId);
  return withConflictAudit(input, "emitDraft", () => serializable(input.prisma, async (tx) => {
    const draft = await getRecord(tx, companyId, input.presupuestoId);
    await lockFamily(tx, companyId, draft.familyId);
    if (draft.slot !== "DRAFT" || draft.state !== "Borrador" || draft.revision !== input.expectedRevision) conflict("Draft revision is stale");
    const current = await tx.presupuesto.findFirst({ where: { familyId: draft.familyId, slot: "CURRENT" }, select: presupuestoReadSelect });
    const replaced = current
      ? await tx.presupuesto.update({ where: { id: current.id }, data: { state: "Reemplazado", slot: "HISTORY", revision: { increment: 1 }, updatedById: input.actorUserId }, select: presupuestoReadSelect })
      : null;
    const visibleNumber = draft.visibleNumber ?? await nextVisibleNumber(tx, companyId);
    const claimed = await tx.presupuesto.updateMany({
      where: { id: draft.id, companyId, revision: input.expectedRevision, slot: "DRAFT", state: "Borrador" },
      data: { state: "Emitido", slot: "CURRENT", visibleNumber, issuedAt: new Date(), revision: { increment: 1 }, updatedById: input.actorUserId },
    });
    if (claimed.count !== 1) conflict("Draft revision is stale");
    const emitted = await getRecord(tx, companyId, draft.id);
    const dto = toPresupuestoDto(emitted);
    await audit(tx, {
      companyId,
      actorUserId: input.actorUserId,
      entityId: emitted.id,
      action: "presupuesto_emitted",
      oldValue: { draft: toPresupuestoDto(draft), priorCurrent: current ? toPresupuestoDto(current) : null },
      newValue: { emitted: dto, priorCurrent: replaced ? toPresupuestoDto(replaced) : null, replacedPresupuestoId: replaced?.id ?? null },
    });
    return dto;
  }));
}

const commandRules: Record<PresupuestoCommand, { from: PresupuestoState[]; to: PresupuestoState }> = {
  approve: { from: ["Emitido"], to: "Aprobado" },
  reject: { from: ["Emitido"], to: "Rechazado" },
  expire: { from: ["Emitido"], to: "Vencido" },
  annul: { from: ["Emitido", "Aprobado"], to: "Anulado" },
};

export async function applyStateCommand(input: ExpectedRevisionInput & { command: PresupuestoCommand }) {
  const companyId = requireCompanyId(input.companyId);
  return withConflictAudit(input, input.command, () => serializable(input.prisma, async (tx) => {
    const current = await getRecord(tx, companyId, input.presupuestoId);
    await lockFamily(tx, companyId, current.familyId);
    const rule = commandRules[input.command];
    if (current.slot !== "CURRENT" || current.revision !== input.expectedRevision || !rule.from.includes(current.state as PresupuestoState)) {
      conflict("State command is invalid or stale");
    }
    const claimed = await tx.presupuesto.updateMany({
      where: { id: current.id, companyId, slot: "CURRENT", revision: input.expectedRevision, state: current.state },
      data: {
        state: rule.to,
        revision: { increment: 1 },
        updatedById: input.actorUserId,
        ...(rule.to === "Aprobado" ? { approvedAt: new Date() } : {}),
        ...(rule.to === "Rechazado" ? { rejectedAt: new Date() } : {}),
      },
    });
    if (claimed.count !== 1) conflict("State command is stale");
    const updated = await getRecord(tx, companyId, current.id);
    const dto = toPresupuestoDto(updated);
    await audit(tx, { companyId, actorUserId: input.actorUserId, entityId: current.id, action: `presupuesto_${input.command}`, oldValue: toPresupuestoDto(current), newValue: dto });
    return dto;
  }));
}

export const approve = (input: ExpectedRevisionInput) => applyStateCommand({ ...input, command: "approve" });
export const reject = (input: ExpectedRevisionInput) => applyStateCommand({ ...input, command: "reject" });
export const expire = (input: ExpectedRevisionInput) => applyStateCommand({ ...input, command: "expire" });
export const annul = (input: ExpectedRevisionInput) => applyStateCommand({ ...input, command: "annul" });

export async function listPresupuestos(input: ListPresupuestosInput) {
  const companyId = requireCompanyId(input.companyId);
  const rows = await input.prisma.presupuesto.findMany({
    where: { companyId, ...(input.surgeryId ? { surgeryId: input.surgeryId } : {}), ...(input.state ? { state: input.state } : {}) },
    select: presupuestoReadSelect,
    orderBy: [{ familyId: "asc" }, { slot: "desc" }, { versionNumber: "desc" }],
    take: input.take ?? DEFAULT_LIST_TAKE,
    skip: input.skip ?? 0,
  });
  const order = { CURRENT: 0, DRAFT: 1, HISTORY: 2 } as const;
  return rows.map(toPresupuestoDto).sort((a, b) => order[a.slot as keyof typeof order] - order[b.slot as keyof typeof order] || b.versionNumber - a.versionNumber);
}

export async function getPresupuesto(input: GetPresupuestoInput) {
  const companyId = requireCompanyId(input.companyId);
  const row = await input.prisma.presupuesto.findFirst({ where: { id: input.presupuestoId, companyId }, select: presupuestoReadSelect });
  if (!row) throw notFound("Presupuesto not found", "presupuesto_not_found");
  return toPresupuestoDto(row);
}
