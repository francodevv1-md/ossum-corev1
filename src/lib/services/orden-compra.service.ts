import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { createAuditEvent } from "../audit";
import { ApiError, badRequest, notFound } from "../api/errors";
import { requireCompanyId } from "../tenant";
import { createReceiptDraft, confirmReceiptInTransaction, notifyReceiptConfirmed, type FormattedReceipt } from "./receipt.service";
import { createStockPhysicalUnit } from "./stock-physical-unit.service";

export const ORDEN_COMPRA_STATES = ["Borrador", "Emitida", "Enviada", "Parcialmente_recibida", "Recibida", "Cancelada"] as const;
export type OrdenCompraState = (typeof ORDEN_COMPRA_STATES)[number];
export const ORDEN_COMPRA_MUTATION_ROLES = ["admin", "coordinador", "logistica"] as const;
export const ORDEN_COMPRA_STATE_API_LABEL: Record<OrdenCompraState, string> = { Borrador: "Borrador", Emitida: "Emitida", Enviada: "Enviada", Parcialmente_recibida: "Parcialmente recibida", Recibida: "Recibida", Cancelada: "Cancelada" };
export class OrdenCompraError extends ApiError { constructor(code: string, message: string, status = 409) { super(status, code, message); } }

type Item = { stockItemId: string; name: string; code: string; quantity: string | number | Prisma.Decimal; unitPrice: string | number | Prisma.Decimal; isArticuloZ?: boolean; descripcionLibre?: string | null };
type Base = { companyId: string; prisma: PrismaClient; updatedById?: string };
const select = { id: true, companyId: true, proveedorId: true, proveedorName: true, total: true, state: true, emitidaAt: true, enviadaAt: true, recibidaAt: true, canceladaAt: true, observaciones: true, necesidadCompraIds: true, createdAt: true, items: { select: { id: true, stockItemId: true, name: true, code: true, quantity: true, unitPrice: true, subtotal: true, received: true, isArticuloZ: true, descripcionLibre: true }, orderBy: { id: "asc" } } } satisfies Prisma.OrdenCompraSelect;
type Row = Prisma.OrdenCompraGetPayload<{ select: typeof select }>;
const decimal = (v: string | number | Prisma.Decimal) => (v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v)).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
const serialize = (row: Row) => ({ ...row, total: row.total.toString(), stateLabel: ORDEN_COMPRA_STATE_API_LABEL[row.state], emitidaAt: row.emitidaAt?.toISOString() ?? null, enviadaAt: row.enviadaAt?.toISOString() ?? null, recibidaAt: row.recibidaAt?.toISOString() ?? null, canceladaAt: row.canceladaAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), items: row.items.map((item) => ({ ...item, quantity: item.quantity.toString(), unitPrice: item.unitPrice.toString(), subtotal: item.subtotal.toString(), received: item.received.toString() })) });
export type OrdenCompraApi = ReturnType<typeof serialize>;
function items(values: Item[]) { if (!values?.length) throw badRequest("items must be a non-empty array", "orden_compra_empty_items"); return values.map((item, index) => { const quantity = decimal(item.quantity); const unitPrice = decimal(item.unitPrice); if (!item.stockItemId?.trim() || !item.name?.trim() || !item.code?.trim() || quantity.lte(0) || unitPrice.lt(0)) throw badRequest(`Invalid item ${index}`, "orden_compra_invalid_item"); return { stockItemId: item.stockItemId.trim(), name: item.name.trim(), code: item.code.trim(), quantity, unitPrice, subtotal: quantity.mul(unitPrice), received: new Prisma.Decimal(0), isArticuloZ: !!item.isArticuloZ, descripcionLibre: item.descripcionLibre?.trim() || null }; }); }
async function audit(prisma: PrismaClient | Prisma.TransactionClient, companyId: string, userId: string | undefined, id: string, action: string, oldValue: unknown, newValue: unknown) { if (userId) await createAuditEvent({ prisma: prisma as PrismaClient, companyId, userId, entityType: "OrdenCompra", entityId: id, action, module: "compras", oldValue, newValue }); }
async function current(tx: Prisma.TransactionClient, companyId: string, id: string) { await tx.$queryRaw`SELECT "id" FROM "OrdenCompra" WHERE "id" = ${id} AND "companyId" = ${companyId} FOR UPDATE`; const row = await tx.ordenCompra.findFirst({ where: { id, companyId }, select: { id: true, companyId: true, state: true, items: { select: { id: true, quantity: true, received: true } } } }); if (!row) throw notFound("OrdenCompra not found", "orden_compra_not_found"); return row; }
export async function listOrdenesCompra(input: Base & { state?: string; proveedorId?: string; take?: number; skip?: number }) { const companyId = requireCompanyId(input.companyId); if (input.state && !ORDEN_COMPRA_STATES.includes(input.state as OrdenCompraState)) throw badRequest("Invalid state", "orden_compra_invalid_state_filter"); return (await input.prisma.ordenCompra.findMany({ select, where: { companyId, ...(input.state ? { state: input.state as OrdenCompraState } : {}), ...(input.proveedorId ? { proveedorId: input.proveedorId } : {}) }, orderBy: { createdAt: "desc" }, take: input.take ?? 100, skip: input.skip ?? 0 })).map(serialize); }
export async function getOrdenCompra(input: Base & { ordenCompraId: string }) { const row = await input.prisma.ordenCompra.findFirst({ select, where: { id: input.ordenCompraId, companyId: requireCompanyId(input.companyId) } }); if (!row) throw notFound("OrdenCompra not found", "orden_compra_not_found"); return serialize(row); }
export async function createOrdenCompra(input: Base & { proveedorId: string; proveedorName: string; items: Item[]; observaciones?: string | null; necesidadCompraIds?: string[]; createdById?: string }) { const companyId = requireCompanyId(input.companyId); if (!input.proveedorId?.trim() || !input.proveedorName?.trim()) throw badRequest("Supplier is required", "orden_compra_invalid_supplier"); const normalized = items(input.items); const total = normalized.reduce((sum, item) => sum.plus(item.subtotal), new Prisma.Decimal(0)); const row = await input.prisma.ordenCompra.create({ select, data: { companyId, proveedorId: input.proveedorId.trim(), proveedorName: input.proveedorName.trim(), total, observaciones: input.observaciones?.trim() || null, necesidadCompraIds: input.necesidadCompraIds?.filter(Boolean) ?? [], items: { create: normalized } } }); await audit(input.prisma, companyId, input.createdById, row.id, "orden_compra_created", null, { state: row.state, total: row.total.toString() }); return serialize(row); }
export async function updateOrdenCompra(input: Base & { ordenCompraId: string; items?: Item[]; observaciones?: string | null; necesidadCompraIds?: string[] }) { const companyId = requireCompanyId(input.companyId); return input.prisma.$transaction(async (tx) => { const before = await current(tx, companyId, input.ordenCompraId); if (before.state !== "Borrador") throw new OrdenCompraError("orden_compra_not_editable", "Only draft purchase orders can be edited"); const normalized = input.items ? items(input.items) : undefined; const row = await tx.ordenCompra.update({ where: { id: before.id }, select, data: { ...(normalized ? { items: { deleteMany: {}, create: normalized }, total: normalized.reduce((sum, item) => sum.plus(item.subtotal), new Prisma.Decimal(0)) } : {}), ...(input.observaciones !== undefined ? { observaciones: input.observaciones?.trim() || null } : {}), ...(input.necesidadCompraIds ? { necesidadCompraIds: input.necesidadCompraIds.filter(Boolean) } : {}) } }); await audit(tx, companyId, input.updatedById, row.id, "orden_compra_updated", { state: before.state }, { state: row.state }); return serialize(row); }); }
async function transition(input: Base & { ordenCompraId: string }, from: OrdenCompraState, to: OrdenCompraState, action: string, stamp: "emitidaAt" | "enviadaAt") { const companyId = requireCompanyId(input.companyId); return input.prisma.$transaction(async (tx) => { const before = await current(tx, companyId, input.ordenCompraId); if (before.state !== from || (from === "Borrador" && !before.items.length)) throw new OrdenCompraError("orden_compra_invalid_transition", `Cannot transition from ${before.state}`); const row = await tx.ordenCompra.update({ where: { id: before.id }, select, data: { state: to, [stamp]: new Date() } }); await audit(tx, companyId, input.updatedById, row.id, action, { state: before.state }, { state: row.state }); return serialize(row); }); }
export const emitirOrdenCompra = (input: Base & { ordenCompraId: string }) => transition(input, "Borrador", "Emitida", "orden_compra_emitida", "emitidaAt");
export const enviarOrdenCompra = (input: Base & { ordenCompraId: string }) => transition(input, "Emitida", "Enviada", "orden_compra_enviada", "enviadaAt");
export type OrdenCompraReceiptAllocation = { quantity: string | number; lotCode?: string; serialNumber?: string; expirationDate?: string };
// Date-only UTC semantics: expired strictly before receivedOn; today is not warned.
export type OrdenCompraReceiptWarning = { code: "EXPIRED_RECEIPT_ACCEPTED"; itemId: string; articleId: string; lineNumber: number; expirationDate: string; receivedOn: string; lotCode?: string; serialNumber?: string };
export type OrdenCompraReceiptIntent = { location: string; operationKey: string; receivedByItem: { itemId: string; received: string | number; allocations?: OrdenCompraReceiptAllocation[] }[] };

function receiptText(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max || value.includes("\0"))
    throw badRequest("Invalid bounded receipt text", "orden_compra_invalid_receipt");
  const text = value.trim();
  try { encodeURIComponent(text); } catch { throw badRequest("Receipt text must contain well-formed Unicode", "orden_compra_invalid_receipt"); }
  return text;
}
function receiptQuantity(value: unknown, positive = false) {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).length > 64)
    throw badRequest("Invalid receipt quantity representation", "orden_compra_invalid_receipt");
  let quantity: Prisma.Decimal;
  try { quantity = new Prisma.Decimal(String(value).trim()); }
  catch { throw badRequest("Invalid receipt quantity", "orden_compra_invalid_receipt"); }
  if (!quantity.isFinite() || quantity.lt(0) || (positive && quantity.isZero()) || quantity.decimalPlaces() > 4 || quantity.gt("99999999999999.9999"))
    throw badRequest("Receipt quantities must fit Decimal(18,4) without rounding", "orden_compra_invalid_receipt");
  return quantity;
}
function receiptDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-"))
    throw badRequest("Expiration must be a real YYYY-MM-DD calendar date", "orden_compra_invalid_receipt");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw badRequest("Expiration must be a real YYYY-MM-DD calendar date", "orden_compra_invalid_receipt");
  return value;
}
function receiptFields(value: unknown, allowed: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key)))
    throw badRequest("Unexpected receipt fields", "orden_compra_invalid_receipt");
}

export function normalizeOrdenCompraReceipt(input: OrdenCompraReceiptIntent) {
  if (!Array.isArray(input.receivedByItem) || !input.receivedByItem.length || input.receivedByItem.length > 1000)
    throw badRequest("Destination, operationKey and receipt quantities are required", "orden_compra_invalid_receipt");
  const location = receiptText(input.location, 200), operationKey = receiptText(input.operationKey, 128);
  if (operationKey.length > 128 || location.length > 200)
    throw badRequest("Operation key must not exceed 128 characters and destination must not exceed 200 characters", "orden_compra_invalid_receipt");
  try { encodeURIComponent(operationKey); encodeURIComponent(location); }
  catch { throw badRequest("Operation key and destination must contain well-formed Unicode", "orden_compra_invalid_receipt"); }
  const ids = new Set<string>();
  let allocationCount = 0;
  const receivedByItem = input.receivedByItem.map(line => {
    receiptFields(line, ["itemId", "received", "allocations"]);
    const itemId = receiptText(line.itemId, 128);
    if (!itemId || ids.has(itemId)) throw badRequest("Receipt item IDs must be unique", "orden_compra_invalid_receipt");
    ids.add(itemId);
    const quantity = receiptQuantity(line.received);
    if (line.allocations === undefined) return { itemId, received: quantity.toString() };
    if (!Array.isArray(line.allocations) || !line.allocations.length || (allocationCount += line.allocations.length) > 1000)
      throw badRequest("Allocations must be nonempty and at most 1000 per operation", "orden_compra_invalid_receipt");
    const allocations = line.allocations.map(allocation => {
      receiptFields(allocation, ["quantity", "lotCode", "serialNumber", "expirationDate"]);
      return { quantity: receiptQuantity(allocation.quantity, true).toString(),
        ...(allocation.lotCode !== undefined ? { lotCode: receiptText(allocation.lotCode, 120) } : {}),
        ...(allocation.serialNumber !== undefined ? { serialNumber: receiptText(allocation.serialNumber, 120) } : {}),
        ...(allocation.expirationDate !== undefined ? { expirationDate: receiptDate(allocation.expirationDate) } : {}) };
    }).sort((a, b) => { const left = JSON.stringify(a), right = JSON.stringify(b); return left < right ? -1 : left > right ? 1 : 0; });
    if (!allocations.reduce((sum, allocation) => sum.plus(allocation.quantity), new Prisma.Decimal(0)).eq(quantity))
      throw badRequest("Allocation sum must equal the positive received total exactly", "orden_compra_invalid_receipt");
    return { itemId, received: quantity.toString(), allocations };
  }).sort((a, b) => a.itemId.localeCompare(b.itemId));
  if (!receivedByItem.some(line => new Prisma.Decimal(line.received).gt(0)))
    throw badRequest("At least one positive receipt quantity is required", "orden_compra_invalid_receipt");
  return { location, operationKey, receivedByItem };
}

export async function recibirOrdenCompra(input: Base & { ordenCompraId: string } & OrdenCompraReceiptIntent) {
  const companyId = requireCompanyId(input.companyId);
  const intent = normalizeOrdenCompraReceipt(input);
  if (!input.updatedById?.trim()) throw badRequest("Receipt actor is required", "orden_compra_invalid_receipt");
  const idempotencyKey = `oc:${encodeURIComponent(input.ordenCompraId)}:operation:${encodeURIComponent(intent.operationKey)}`;
  let confirmed: FormattedReceipt | undefined;
  let confirmedWarnings: OrdenCompraReceiptWarning[] = [];
  let registeringUnit = false;
  const result = await input.prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "OrdenCompra" WHERE "id" = ${input.ordenCompraId} AND "companyId" = ${companyId} FOR UPDATE`;
    const before = await tx.ordenCompra.findFirst({ where: { id: input.ordenCompraId, companyId }, select });
    if (!before) throw notFound("OrdenCompra not found", "orden_compra_not_found");
    const accepted = await tx.receipt.findUnique({ where: { companyId_idempotencyKey: { companyId, idempotencyKey } } });
    const intentKey = JSON.stringify(intent);
    if (accepted) {
      const metadata = accepted.metadata as { intentKey?: string; ordenCompraId?: string; receiptWarnings?: OrdenCompraReceiptWarning[] } | null;
      if (accepted.status !== "CONFIRMED" || metadata?.ordenCompraId !== before.id || metadata?.intentKey !== intentKey)
        throw new OrdenCompraError("orden_compra_receipt_conflict", "Operation key already used with a different receipt intent");
      return { ...serialize(before), ...(metadata.receiptWarnings?.length ? { receiptWarnings: metadata.receiptWarnings } : {}) };
    }
    if (!["Enviada", "Parcialmente_recibida"].includes(before.state))
      throw new OrdenCompraError("orden_compra_not_receivable", "Purchase order is not receivable");
    const company = await tx.company.findUnique({ where: { id: companyId }, select: { organizationId: true, isActive: true, organization: { select: { isActive: true } } } });
    if (!company) throw notFound("Company not found", "company_not_found");
    if (!company.isActive || !company.organization.isActive) throw badRequest("Company and organization must be active", "orden_compra_company_inactive");
    const supplier = await tx.contactCompanyLink.findFirst({ where: {
      companyId, contactId: before.proveedorId, isActive: true,
      contact: { isActive: true },
      OR: [{ roles: { has: "proveedor" } }, { role: "proveedor" }],
    } });
    if (!supplier) throw badRequest("Supplier must be active and linked to the company", "orden_compra_invalid_supplier");
    // Lock distinct shared Articles in a fixed order under the existing OC lock.
    // Article has @@map("article"); organizationId is not column-mapped.
    const articleIds = [...new Set(intent.receivedByItem.filter(row => new Prisma.Decimal(row.received).gt(0)).map(row => before.items.find(item => item.id === row.itemId)?.stockItemId).filter((id): id is string => !!id))].sort();
    for (const articleId of articleIds)
      await tx.$queryRaw`SELECT "id" FROM "article" WHERE "id" = ${articleId} AND "organizationId" = ${company.organizationId} FOR UPDATE`;
    const lines: Array<{ item: Row["items"][number]; article: { id: string; sku: string; description: string }; quantity: Prisma.Decimal; policy: string; lotCode?: string; serialNumber?: string; expirationDate?: string; physicalUnitId?: string; unitCode?: string }> = [];
    const totals = new Map<string, Prisma.Decimal>();
    const serials = new Set<string>();
    const lotExpiries = new Map<string, Map<string, string | null>>();
    for (const update of intent.receivedByItem) {
      const item = before.items.find(item => item.id === update.itemId);
      const quantity = new Prisma.Decimal(update.received);
      if (!item || item.received.plus(quantity).gt(item.quantity))
        throw new OrdenCompraError("orden_compra_invalid_receipt", "Receipt item or quantity exceeds the pending balance");
      if (quantity.isZero()) continue;
      const article = await tx.article.findFirst({ where: {
        id: item.stockItemId, organizationId: company.organizationId, isActive: true,
        stockEligibilities: { some: { companyId } },
      }, include: { tracePolicies: { orderBy: { effectiveAt: "desc" }, take: 1 } } });
      if (!article) throw badRequest("Article is not active or eligible for this company", "orden_compra_article_ineligible");
      const policy = article.tracePolicies[0]?.policy;
      if (!policy || !["NONE", "LOT", "LOT_EXPIRY", "SERIAL", "SERIAL_EXPIRY", "LOT_SERIAL_EXPIRY"].includes(policy))
        throw badRequest("Article requires an explicit supported traceability policy", "orden_compra_trace_policy_unsupported");
      totals.set(item.id, quantity);
      if (policy === "NONE") {
        if (update.allocations !== undefined) throw badRequest("NONE receiving must not include trace allocations", "orden_compra_invalid_receipt");
        lines.push({ item, article, quantity, policy });
        continue;
      }
      if (!update.allocations?.length) throw badRequest("Tracked receiving requires allocations", "orden_compra_trace_policy_unsupported");
      const lotRequired = policy.includes("LOT"), serialRequired = policy.includes("SERIAL"), expiryRequired = policy.includes("EXPIRY");
      for (const allocation of update.allocations) {
        if (!!allocation.lotCode !== lotRequired || !!allocation.serialNumber !== serialRequired || !!allocation.expirationDate !== expiryRequired || (serialRequired && allocation.quantity !== "1"))
          throw badRequest("Allocation trace fields and quantity must match current article policy", "orden_compra_invalid_receipt");
        if (allocation.serialNumber) {
          if (serials.has(allocation.serialNumber)) throw new OrdenCompraError("orden_compra_serial_conflict", "Serial already occurs in this receipt");
          serials.add(allocation.serialNumber);
        }
        if (allocation.lotCode) {
          const lots = lotExpiries.get(article.id) ?? new Map<string, string | null>();
          const expiry = allocation.expirationDate ?? null;
          if (lots.has(allocation.lotCode) && lots.get(allocation.lotCode) !== expiry)
            throw new OrdenCompraError("orden_compra_lot_expiry_conflict", "Equivalent lot has conflicting expiration");
          lots.set(allocation.lotCode, expiry);
          lotExpiries.set(article.id, lots);
        }
        lines.push({ item, article, policy, ...allocation, quantity: new Prisma.Decimal(allocation.quantity) });
      }
    }
    for (const [articleId, lots] of lotExpiries) {
      // Scope exactly company/Article. Existing helpers normalize lot codes by trim only.
      const movements = await tx.stockMovement.findMany({ where: { companyId, articleId, lotCode: { not: null } }, select: { lotCode: true, expirationDate: true } });
      for (const movement of movements) {
        const lot = movement.lotCode?.trim();
        if (lot && lots.has(lot) && lots.get(lot) !== (movement.expirationDate?.toISOString().slice(0, 10) ?? null))
          throw new OrdenCompraError("orden_compra_lot_expiry_conflict", "Equivalent lot has conflicting expiration");
      }
    }
    if (serials.size && await tx.stockPhysicalUnit.findFirst({ where: { companyId, serialNumber: { in: [...serials] } }, select: { id: true } }))
      throw new OrdenCompraError("orden_compra_serial_conflict", "Serial already registered in this company, including retired units");
    // All lines are validated before draft, audit, stock or OC writes.
    const tracked = lines.some(line => line.policy !== "NONE");
    const receivedOn = new Date().toISOString().slice(0, 10);
    const receiptWarnings: OrdenCompraReceiptWarning[] = lines.flatMap((line, index) => line.expirationDate && line.expirationDate < receivedOn ? [{ code: "EXPIRED_RECEIPT_ACCEPTED" as const, itemId: line.item.id, articleId: line.article.id, lineNumber: index + 1, expirationDate: line.expirationDate, receivedOn,
      ...(line.lotCode ? { lotCode: line.lotCode } : {}), ...(line.serialNumber ? { serialNumber: line.serialNumber } : {}) }] : []);
    for (const line of lines) {
      if (!line.serialNumber) continue;
      registeringUnit = true;
      const unit = await createStockPhysicalUnit(tx, companyId, { articleId: line.article.id, unitCode: `OC-${randomUUID()}`, serialNumber: line.serialNumber, location: intent.location }, input.updatedById!);
      registeringUnit = false;
      line.physicalUnitId = unit.id;
      line.unitCode = unit.unitCode;
    }
    const metadata = { source: "OrdenCompra", ordenCompraId: before.id, operationKey: intent.operationKey, ...(tracked ? {} : { policy: "NONE" }), location: intent.location, intentKey,
      items: [...totals].map(([id, quantity]) => ({ ordenCompraItemId: id, articleId: before.items.find(item => item.id === id)!.stockItemId, received: quantity.toString() })),
      ...(tracked ? { allocations: lines.map((line, index) => ({ lineNumber: index + 1, ordenCompraItemId: line.item.id, articleId: line.article.id, policy: line.policy, quantity: line.quantity.toString(),
        ...(line.lotCode ? { lotCode: line.lotCode } : {}), ...(line.serialNumber ? { serialNumber: line.serialNumber } : {}), ...(line.expirationDate ? { expirationDate: line.expirationDate } : {}),
        ...(line.physicalUnitId ? { physicalUnitId: line.physicalUnitId, unitCode: line.unitCode! } : {}) })) } : {}),
      ...(receiptWarnings.length ? { receiptWarnings } : {}) };
    const receipt = await createReceiptDraft(tx, companyId, {
      documentReference: before.id, supplierId: before.proveedorId, idempotencyKey, metadata,
      expectedLines: lines.map(({ article, quantity, lotCode, serialNumber, expirationDate }) => ({ code: article.sku, description: article.description, expectedQuantity: quantity.toString(), ...(lotCode ? { lotCode } : {}), ...(serialNumber ? { serialNumber } : {}), ...(expirationDate ? { expirationDate } : {}) })),
    }, input.updatedById!);
    const itemsByLine: Record<string, string> = {};
    const lineMetadata: Record<string, Prisma.InputJsonObject> = {};
    for (const line of receipt.lines) {
      const source = lines[line.lineNumber - 1];
      if (!source) throw new OrdenCompraError("orden_compra_invalid_receipt", "Unexpected receipt line number");
      itemsByLine[line.id] = source.item.id;
      if (tracked) lineMetadata[line.id] = { policy: source.policy, ...(source.physicalUnitId ? { physicalUnitId: source.physicalUnitId, unitCode: source.unitCode! } : {}) };
      await tx.receiptLine.update({ where: { id: line.id }, data: { articleId: source.article.id, receivedQuantity: source.quantity } });
    }
    confirmed = (await confirmReceiptInTransaction(tx, companyId, receipt.id, undefined, input.updatedById, { location: intent.location, metadata: { source: "OrdenCompra", ordenCompraId: before.id, operationKey: intent.operationKey, ...(tracked ? {} : { policy: "NONE" }) }, itemsByLine, ...(tracked ? { lineMetadata } : {}) })).receipt;
    confirmedWarnings = receiptWarnings;
    for (const [itemId, quantity] of totals) await tx.ordenCompraItem.update({ where: { id: itemId }, data: { received: before.items.find(item => item.id === itemId)!.received.plus(quantity) } });
    const done = before.items.every(item => item.received.plus(totals.get(item.id) ?? 0).gte(item.quantity));
    const row = await tx.ordenCompra.update({ where: { id: before.id }, select, data: { state: done ? "Recibida" : "Parcialmente_recibida", recibidaAt: done ? new Date() : null } });
    await audit(tx, companyId, input.updatedById, row.id, "orden_compra_recibida", { state: before.state }, { state: row.state, receiptId: receipt.id, ...metadata });
    return { ...serialize(row), ...(receiptWarnings.length ? { receiptWarnings } : {}) };
  }).catch(error => {
    // PostgreSQL has already aborted/rolled back. Never catch-and-continue inside tx.
    if (registeringUnit && error && typeof error === "object" && error.code === "P2002")
      throw new OrdenCompraError("orden_compra_serial_conflict", "Physical identity was concurrently registered");
    throw error;
  });
  if (confirmed) {
    if (confirmedWarnings.length) await notifyReceiptConfirmed(input.prisma, confirmed, input.updatedById, confirmedWarnings);
    else await notifyReceiptConfirmed(input.prisma, confirmed, input.updatedById);
  }
  return result;
}
export async function cancelarOrdenCompra(input: Base & { ordenCompraId: string; motivo?: string }) { const companyId = requireCompanyId(input.companyId); return input.prisma.$transaction(async (tx) => { const before = await current(tx, companyId, input.ordenCompraId); if (["Recibida", "Cancelada"].includes(before.state)) throw new OrdenCompraError("orden_compra_invalid_cancel_transition", "Purchase order cannot be cancelled"); const row = await tx.ordenCompra.update({ where: { id: before.id }, select, data: { state: "Cancelada", canceladaAt: new Date() } }); await audit(tx, companyId, input.updatedById, row.id, "orden_compra_cancelada", { state: before.state }, { state: row.state, motivo: input.motivo ?? null }); return serialize(row); }); }
export async function deleteOrdenCompra(input: Base & { ordenCompraId: string; deletedById?: string }) { const companyId = requireCompanyId(input.companyId); return input.prisma.$transaction(async (tx) => { const before = await current(tx, companyId, input.ordenCompraId); if (before.state !== "Borrador") throw new OrdenCompraError("orden_compra_not_deletable", "Only drafts can be deleted"); await tx.ordenCompra.delete({ where: { id: before.id } }); await audit(tx, companyId, input.deletedById, before.id, "orden_compra_deleted", { state: before.state }, null); return { id: before.id, deleted: true as const }; }); }
