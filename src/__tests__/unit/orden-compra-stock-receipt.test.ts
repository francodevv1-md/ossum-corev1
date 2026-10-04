import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { recibirOrdenCompra, cancelarOrdenCompra, normalizeOrdenCompraReceipt } from "@/lib/services/orden-compra.service";
import { confirmReceipt, confirmReceiptInTransaction, notifyReceiptConfirmed, type FormattedReceipt } from "@/lib/services/receipt.service";
import { POST } from "@/app/api/companies/[companyId]/ordenes-compra/[ordenCompraId]/recibir/route";

const notification = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const routeDb = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: routeDb }));
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: vi.fn(async () => ({ companyId: "company", actorUserId: "actor", role: "admin", canonicalRole: "admin" })) }));
vi.mock("@/lib/services/internal-notifications.service", () => ({ emitCrossDomainNotification: notification }));

// In-memory transactional persistence, actual Receipt confirmation and shared ledger helper.
// This proves orchestration/rollback requests, not PostgreSQL locking or actual database atomicity.
function fixture() {
  const D = (value: string | number) => new Prisma.Decimal(value);
  let order: any = { id: "oc", companyId: "company", proveedorId: "supplier", proveedorName: "Supplier", total: D(4), state: "Enviada", createdAt: new Date(), emitidaAt: null, enviadaAt: null, recibidaAt: null, canceladaAt: null,
    items: [{ id: "item", stockItemId: "article", name: "Article", code: "SKU", quantity: D(4), received: D(0), unitPrice: D(1), subtotal: D(4), isArticuloZ: false }] };
  let receipts: any[] = [], movements: any[] = [], audits: any[] = [];
  let article: any = { id: "article", sku: "SKU", description: "Article", isActive: true, organizationId: "org", stockEligibilities: [{ companyId: "company" }], tracePolicies: [{ policy: "NONE" }] };
  let supplier: any = { companyId: "company", contactId: "supplier", isActive: true, roles: ["proveedor"], contact: { isActive: true } };
  let active = false;
  const company = { organizationId: "org", isActive: true, organization: { isActive: true } };
  const tx: any = {
    $queryRaw: vi.fn(async () => { expect(active).toBe(true); return [{ id: "oc" }]; }),
    company: { findUnique: vi.fn(async () => company) },
    article: { findFirst: vi.fn(async ({ where }: any) => article && article.isActive && article.organizationId === where.organizationId && article.stockEligibilities.some((e: any) => e.companyId === where.stockEligibilities.some.companyId) && (!where.id || where.id === article.id) ? article : null) },
    contactCompanyLink: { findFirst: vi.fn(async ({ where }: any) => supplier && supplier.companyId === where.companyId && supplier.contactId === where.contactId && supplier.isActive && (!where.contact || supplier.contact.isActive) && (!where.OR || supplier.roles.includes("proveedor")) ? supplier : null) },
    ordenCompra: { findFirst: vi.fn(async ({ where }: any) => where.id === order.id && where.companyId === order.companyId ? { ...order, items: order.items.map((i: any) => ({ ...i })) } : null), update: vi.fn(async ({ data }: any) => { Object.assign(order, data); return order; }) },
    ordenCompraItem: { update: vi.fn(async ({ where, data }: any) => { const item = order.items.find((i: any) => i.id === where.id); Object.assign(item, data); return item; }) },
    receipt: {
      findUnique: vi.fn(async ({ where }: any) => receipts.find(r => r.companyId === where.companyId_idempotencyKey.companyId && r.idempotencyKey === where.companyId_idempotencyKey.idempotencyKey) ?? null),
      findFirst: vi.fn(async ({ where }: any) => { expect(active).toBe(true); return receipts.find(r => r.companyId === where.companyId && (!where.id || r.id === where.id) && (!where.idempotencyKey || r.idempotencyKey === where.idempotencyKey)) ?? null; }),
      create: vi.fn(async ({ data }: any) => { const id = `receipt-${receipts.length + 1}`; const r = { ...data, id, createdAt: new Date(), updatedAt: new Date(), confirmedAt: null, scans: [], lines: data.lines.create.map((line: any, i: number) => ({ ...line, id: `${id}-line-${i}`, articleId: line.article?.connect.id ?? null, scans: [] })) }; receipts.push(r); return r; }),
      update: vi.fn(async ({ where, data }: any) => { const r = receipts.find(r => r.id === where.id); Object.assign(r, data); return r; }),
    },
    receiptLine: { update: vi.fn(async ({ where, data }: any) => { const line = receipts.flatMap(r => r.lines).find(l => l.id === where.id); Object.assign(line, data); return line; }) },
    stockMovement: { upsert: vi.fn(async ({ create }: any) => { const existing = movements.find(m => m.idempotencyKey === create.idempotencyKey); if (existing) return existing; const m = { ...create, id: `movement-${movements.length}` }; movements.push(m); return m; }) },
    auditEvent: { create: vi.fn(async ({ data }: any) => { audits.push(data); return data; }) },
  };
  const prisma: any = { ...tx, $transaction: vi.fn(async (fn: any) => {
    expect(active).toBe(false);
    const previous = { order: { ...order, items: order.items.map((i: any) => ({ ...i })) }, receipts: [...receipts], movements: [...movements], audits: [...audits] };
    active = true;
    try { return await fn(tx); } catch (error) { order = previous.order; receipts = previous.receipts; movements = previous.movements; audits = previous.audits; throw error; } finally { active = false; }
  }) };
  notification.mockReset().mockImplementation(async () => { expect(active).toBe(false); });
  const input = { prisma, companyId: "company", ordenCompraId: "oc", updatedById: "actor", location: "QA location", operationKey: "op-1", receivedByItem: [{ itemId: "item", received: "1" }] };
  return { tx, prisma, input, company, receive: (overrides = {}) => recibirOrdenCompra({ ...input, ...overrides }), get order() { return order; }, get receipts() { return receipts; }, get movements() { return movements; }, get audits() { return audits; }, get article() { return article; }, set article(value) { article = value; }, get supplier() { return supplier; }, set supplier(value) { supplier = value; } };
}

describe("OC → Receipt → shared physical ledger (MOCKED persistence, no DB/network)", () => {
  it.each(["1.00000", "1.00000e0", "0.00001e5"])("replays equivalent NONE Decimal spelling %s without effects", async received => {
    const f = fixture(); const first = await f.receive(); const audits = f.audits.length;
    expect(normalizeOrdenCompraReceipt({ ...f.input, receivedByItem: [{ itemId: "item", received }] })).toEqual(normalizeOrdenCompraReceipt(f.input));
    expect(await f.receive({ receivedByItem: [{ itemId: "item", received }] })).toEqual(first);
    routeDb.$transaction.mockImplementation(f.prisma.$transaction);
    const response = await POST(new Request("http://mock.invalid/recibir", { method: "POST", body: JSON.stringify({ location: f.input.location, operationKey: f.input.operationKey, receivedByItem: [{ itemId: "item", received }] }) }), { params: Promise.resolve({ companyId: "company", ordenCompraId: "oc" }) });
    expect(response.status).toBe(200);
    expect(f.receipts).toHaveLength(1); expect(f.movements).toHaveLength(1); expect(f.audits).toHaveLength(audits);
    expect(f.tx.ordenCompraItem.update).toHaveBeenCalledTimes(1); expect(notification).toHaveBeenCalledTimes(1);
  });
  it("credits delta 1 + 3, correlates actor/location/origin and replays after final state without effects", async () => {
    const f = fixture();
    expect((await f.receive()).state).toBe("Parcialmente_recibida");
    const second = { operationKey: "op-2", receivedByItem: [{ itemId: "item", received: "3" }] };
    expect((await f.receive(second)).state).toBe("Recibida");
    const auditCount = f.audits.length;
    expect((await f.receive(second)).state).toBe("Recibida");
    expect((await f.receive({ receivedByItem: [{ itemId: "item", received: "1.0000" }], location: " QA location " })).state).toBe("Recibida");
    expect(f.receipts).toHaveLength(2);
    expect(f.movements.map(m => m.quantity.toString())).toEqual(["1", "3"]);
    expect(f.order.items[0].received.toString()).toBe("4");
    expect(f.audits).toHaveLength(auditCount);
    expect(notification).toHaveBeenCalledTimes(2);
    expect(f.movements[0]).toMatchObject({ movementType: "RECEIPT_IN", location: "QA location", createdById: "actor", receiptId: f.receipts[0].id, receiptLineId: f.receipts[0].lines[0].id, metadata: { source: "OrdenCompra", ordenCompraId: "oc", ordenCompraItemId: "item", operationKey: "op-1", policy: "NONE" } });
    expect(f.movements[0].idempotencyKey).toBe(`receipt:${f.receipts[0].id}:line:${f.receipts[0].lines[0].id}`);
    expect(f.receipts[0].metadata).toMatchObject({ ordenCompraId: "oc", operationKey: "op-1", location: "QA location", policy: "NONE" });
    expect(f.tx.receipt.findUnique).toHaveBeenCalledWith({ where: { companyId_idempotencyKey: { companyId: "company", idempotencyKey: "oc:oc:operation:op-1" } } });
    expect(f.audits.map(a => a.action)).toEqual(["created", "confirmed", "orden_compra_recibida", "created", "confirmed", "orden_compra_recibida"]);
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(4);
  });
  it.each([{ location: "other" }, { receivedByItem: [{ itemId: "item", received: "2" }] }])("conflicts on changed payload using accepted key %j", async overrides => {
    const f = fixture(); await f.receive();
    await expect(f.receive(overrides)).rejects.toMatchObject({ code: "orden_compra_receipt_conflict" });
    expect(f.movements).toHaveLength(1); expect(f.audits).toHaveLength(3);
  });
  it.each([
    [], [{ itemId: "item", received: "0" }], [{ itemId: "item", received: "5" }], [{ itemId: "foreign-item", received: "1" }],
    [{ itemId: "item", received: "1" }, { itemId: "item", received: "1" }],
    ...["NaN", "Infinity", "-1", "0.00001", "", "99999999999999999999999"].map(received => [{ itemId: "item", received }]),
  ])("rejects invalid quantities/items before any effects %j", async receivedByItem => {
    const f = fixture();
    await expect(f.receive({ receivedByItem })).rejects.toMatchObject({ code: "orden_compra_invalid_receipt" });
    expect(f.tx.receipt.create).not.toHaveBeenCalled(); expect(f.movements).toHaveLength(0); expect(f.audits).toHaveLength(0); expect(f.tx.ordenCompraItem.update).not.toHaveBeenCalled();
  });
  it.each(["location", "operationKey", "updatedById"])("requires explicit %s", async field => {
    const f = fixture(); await expect(f.receive({ [field]: " " })).rejects.toMatchObject({ code: "orden_compra_invalid_receipt" });
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each([
    { operationKey: "k".repeat(129) }, { location: "l".repeat(201) },
    { operationKey: "bad\uD800" }, { operationKey: "bad\uDC00" },
    { location: "bad\uD800" }, { location: "bad\uDC00" },
  ])("rejects invalid bounded Unicode intent before URI construction/transaction %j", async overrides => {
    const f = fixture();
    expect(() => normalizeOrdenCompraReceipt({ ...f.input, ...overrides })).toThrow(expect.objectContaining({ status: 400, code: "orden_compra_invalid_receipt" }));
    await expect(f.receive(overrides)).rejects.toMatchObject({ status: 400, code: "orden_compra_invalid_receipt" });
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
    expect(f.tx.receipt.create).not.toHaveBeenCalled();
  });
  it("accepts trimmed exact bounds and valid surrogate pairs without changing decimal normalization/replay", async () => {
    const f = fixture();
    const operationKey = "k".repeat(126) + "😀", location = "l".repeat(198) + "😀";
    const intent = { operationKey: ` ${operationKey} `, location: ` ${location} `, receivedByItem: [{ itemId: " item ", received: "1.0000" }] };
    expect(normalizeOrdenCompraReceipt(intent)).toEqual({ operationKey, location, receivedByItem: [{ itemId: "item", received: "1" }] });
    await f.receive(intent); await f.receive(intent);
    expect(f.receipts).toHaveLength(1); expect(f.movements).toHaveLength(1);
  });
  it.each(["LOT", "LOT_EXPIRY", "SERIAL", "SERIAL_EXPIRY", "LOT_SERIAL_EXPIRY", undefined])("rejects unsupported or missing current trace policy %s before effects", async policy => {
    const f = fixture(); f.article.tracePolicies = policy ? [{ policy }] : [];
    await expect(f.receive()).rejects.toMatchObject({ code: "orden_compra_trace_policy_unsupported" });
    expect(f.tx.receipt.create).not.toHaveBeenCalled(); expect(f.audits).toHaveLength(0);
  });
  it.each(["inactive", "cross-organization", "cross-company", "missing-eligibility"])("rejects %s article before effects", async kind => {
    const f = fixture();
    if (kind === "inactive") f.article.isActive = false;
    if (kind === "cross-organization") f.article.organizationId = "other";
    if (kind === "cross-company") f.article.stockEligibilities = [{ companyId: "other" }];
    if (kind === "missing-eligibility") f.article.stockEligibilities = [];
    await expect(f.receive()).rejects.toMatchObject({ code: "orden_compra_article_ineligible" });
    expect(f.tx.receipt.create).not.toHaveBeenCalled();
  });
  it.each(["company", "organization"])("rejects inactive %s before effects", async kind => {
    const f = fixture();
    if (kind === "company") f.company.isActive = false; else f.company.organization.isActive = false;
    await expect(f.receive()).rejects.toMatchObject({ code: "orden_compra_company_inactive" });
    expect(f.tx.receipt.create).not.toHaveBeenCalled();
  });
  it.each(["inactive-link", "inactive-contact", "cross-company", "non-supplier"])("rejects %s supplier before effects", async kind => {
    const f = fixture();
    if (kind === "inactive-link") f.supplier.isActive = false;
    if (kind === "inactive-contact") f.supplier.contact.isActive = false;
    if (kind === "cross-company") f.supplier.companyId = "other";
    if (kind === "non-supplier") f.supplier.roles = [];
    await expect(f.receive()).rejects.toMatchObject({ code: "orden_compra_invalid_supplier" }); expect(f.tx.receipt.create).not.toHaveBeenCalled();
  });
  it("validates later positive lines before any draft/stock/OC effects", async () => {
    const f = fixture(); f.order.items.push({ ...f.order.items[0], id: "item-2", stockItemId: "foreign" });
    await expect(f.receive({ receivedByItem: [{ itemId: "item", received: "1" }, { itemId: "item-2", received: "1" }] })).rejects.toMatchObject({ code: "orden_compra_article_ineligible" });
    expect(f.tx.receipt.create).not.toHaveBeenCalled(); expect(f.tx.ordenCompraItem.update).not.toHaveBeenCalled();
  });
  it("skips zero owned lines while retaining normalized replay identity", async () => {
    const f = fixture(); f.order.items.push({ ...f.order.items[0], id: "zero", stockItemId: "foreign" });
    await f.receive({ receivedByItem: [{ itemId: "zero", received: "0" }, { itemId: "item", received: "1" }] });
    expect(f.receipts[0].lines).toHaveLength(1); expect(f.movements).toHaveLength(1);
  });
  it("checks exact decimal ceiling without rounding before effects", async () => {
    const f = fixture(); f.order.items[0].received = new Prisma.Decimal("3.9999");
    await expect(f.receive({ receivedByItem: [{ itemId: "item", received: "0.0002" }] })).rejects.toMatchObject({ code: "orden_compra_invalid_receipt" });
    expect(f.tx.receipt.create).not.toHaveBeenCalled();
    await f.receive({ receivedByItem: [{ itemId: "item", received: "0.0001" }] }); expect(f.order.state).toBe("Recibida");
  });
  it.each(["stock", "audit"])("rolls the entire mocked transaction back on %s failure", async kind => {
    const f = fixture();
    if (kind === "stock") f.tx.stockMovement.upsert.mockRejectedValueOnce(new Error("stock failure"));
    else f.tx.auditEvent.create.mockImplementationOnce(async ({ data }: any) => data).mockRejectedValueOnce(new Error("audit failure"));
    await expect(f.receive()).rejects.toThrow(`${kind} failure`);
    expect(f.receipts).toHaveLength(0); expect(f.movements).toHaveLength(0); expect(f.audits).toHaveLength(0);
    expect(f.order.state).toBe("Enviada"); expect(f.order.items[0].received.toString()).toBe("0"); expect(notification).not.toHaveBeenCalled();
  });
  it("optional notification failure happens after commit and cannot roll it back", async () => {
    const f = fixture(); notification.mockRejectedValueOnce(new Error("notification failure"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    await f.receive(); expect(f.movements).toHaveLength(1); expect(f.order.state).toBe("Parcialmente_recibida"); warning.mockRestore();
  });
  it("partial cancellation does not reverse already received physical stock", async () => {
    const f = fixture(); await f.receive(); await cancelarOrdenCompra(f.input);
    expect(f.order.state).toBe("Cancelada"); expect(f.movements).toHaveLength(1); expect(f.order.items[0].received.toString()).toBe("1");
    expect((await f.receive()).state).toBe("Cancelada");
  });
  it("shared standalone confirmation locks/reads inside tx and preserves scan keys/default location", async () => {
    const f = fixture(); await f.receive(); const r = f.receipts[0];
    r.status = "IN_CONTROL"; r.lines[0].scans = [{ id: "scan", articleId: "article", quantity: new Prisma.Decimal(1), resolutionStatus: "RESOLVED", lotCode: "lot", serialNumber: null, expirationDate: null, rawValue: "SKU" }];
    r.scans = r.lines[0].scans;
    await confirmReceipt(f.prisma, "company", r.id, undefined, "actor");
    expect(f.movements[1]).toMatchObject({ idempotencyKey: `receipt:${r.id}:scan:scan`, location: null, lotCode: "lot" });
    const count = f.movements.length;
    await f.prisma.$transaction((tx: any) => confirmReceiptInTransaction(tx, "company", r.id));
    expect(f.movements).toHaveLength(count);
    const notifications = notification.mock.calls.length;
    await confirmReceipt(f.prisma, "company", r.id);
    expect(notification).toHaveBeenCalledTimes(notifications);
  });
  it.each(["pending", "empty", "cancelled", "missing-article"])("shared confirmation rejects %s before movement/audit writes", async kind => {
    const f = fixture(); await f.receive(); const r = f.receipts[0]; r.status = "IN_CONTROL";
    const codes = { pending: "receipt_has_pending_scans", empty: "receipt_empty", cancelled: "receipt_cancelled", "missing-article": "receipt_line_missing_article" };
    if (kind === "pending") r.scans = [{ resolutionStatus: "PENDING" }];
    if (kind === "empty") r.lines[0].receivedQuantity = new Prisma.Decimal(0);
    if (kind === "cancelled") r.status = "CANCELLED";
    if (kind === "missing-article") r.lines[0].articleId = null;
    const audits = f.audits.length;
    await expect(confirmReceipt(f.prisma, "company", r.id)).rejects.toMatchObject({ code: codes[kind as keyof typeof codes] });
    expect(f.movements).toHaveLength(1); expect(f.audits).toHaveLength(audits);
  });
});

describe("actual post-commit receipt notice helper (MOCKED emitter)", () => {
  const receipt = { id: "receipt", companyId: "company", documentReference: "oc", lines: [] } as unknown as FormattedReceipt;
  it("emits expiry advisory with bounded identifiers/dates through the existing in-app emitter", async () => {
    notification.mockReset().mockResolvedValue(undefined);
    const db = {} as never;
    await notifyReceiptConfirmed(db, receipt, "actor", [{ code: "EXPIRED_RECEIPT_ACCEPTED", itemId: "i".repeat(129), articleId: "a".repeat(129), expirationDate: "2026-10-03-extra", receivedOn: "2026-10-04-extra", lotCode: "l".repeat(121), serialNumber: "s".repeat(121) }]);
    expect(notification).toHaveBeenCalledExactlyOnceWith(db, {
      companyId: "company", actorUserId: "actor", type: "stock_receipt_confirmed", domain: "STOCK", severity: "WARNING",
      title: "Recepción confirmada: oc", body: expect.stringMatching(/vencid/i), sourceEntityId: "receipt", linkHref: "/stock",
      metadata: { receiptId: "receipt", documentReference: "oc", expiredReceiptAccepted: true, receiptWarnings: [{ code: "EXPIRED_RECEIPT_ACCEPTED", itemId: "i".repeat(128), articleId: "a".repeat(128), expirationDate: "2026-10-03", receivedOn: "2026-10-04", lotCode: "l".repeat(120), serialNumber: "s".repeat(120) }] },
    });
  });
  it("preserves standalone and explicit no-warning success content", async () => {
    notification.mockReset().mockResolvedValue(undefined);
    const db = {} as never;
    await notifyReceiptConfirmed(db, receipt);
    await notifyReceiptConfirmed(db, receipt, undefined, []);
    expect(notification).toHaveBeenCalledTimes(2);
    for (const [, notice] of notification.mock.calls) expect(notice).toEqual({ companyId: "company", actorUserId: "system", type: "stock_receipt_confirmed", domain: "STOCK", severity: "SUCCESS", title: "Recepción confirmada: oc", body: "Ingreso de mercadería registrado con éxito (0 líneas).", sourceEntityId: "receipt", linkHref: "/stock", metadata: { receiptId: "receipt", documentReference: "oc" } });
  });
});
