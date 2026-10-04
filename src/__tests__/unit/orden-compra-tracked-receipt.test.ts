import { afterEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { normalizeOrdenCompraReceipt, recibirOrdenCompra, type OrdenCompraReceiptAllocation } from "@/lib/services/orden-compra.service";

const notification = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/internal-notifications.service", () => ({ emitCrossDomainNotification: notification }));
afterEach(() => vi.useRealTimers());

// Actual OC, Receipt, physical-unit registration and ledger helpers; MOCKED persistence only.
// Snapshot rollback and SQL assertions are orchestration evidence, not a PostgreSQL concurrency test.
function fixture(policy = "LOT_EXPIRY") {
  const D = (value: string | number) => new Prisma.Decimal(value);
  const item = (id: string, articleId: string) => ({ id, stockItemId: articleId, name: articleId, code: articleId, quantity: D(10), received: D(0), unitPrice: D(1), subtotal: D(10), isArticuloZ: false });
  const order = (id: string, articleId: string) => ({ id, companyId: "company", proveedorId: "supplier", proveedorName: "Supplier", total: D(10), state: "Enviada", createdAt: new Date(), emitidaAt: null, enviadaAt: null, recibidaAt: null, canceladaAt: null, items: [item(`${id}-item`, articleId)] });
  let orders: any[] = [order("oc", "article")];
  const articles: any[] = [{ id: "article", sku: "SKU", description: "Article", organizationId: "org", isActive: true, tracePolicies: [{ policy }], stockEligibilities: [{ companyId: "company" }] }];
  let receipts: any[] = [], movements: any[] = [], units: any[] = [], audits: any[] = [];
  let active = false;
  const tx: any = {
    $queryRaw: vi.fn(async () => { expect(active).toBe(true); return []; }),
    company: { findUnique: vi.fn(async () => ({ organizationId: "org", isActive: true, organization: { isActive: true } })) },
    contactCompanyLink: { findFirst: vi.fn(async () => ({ id: "supplier", isActive: true })) },
    article: { findFirst: vi.fn(async ({ where }: any) => articles.find(a => a.isActive && a.organizationId === where.organizationId && a.stockEligibilities.some((e: any) => e.companyId === where.stockEligibilities.some.companyId) && (where.id ? a.id === where.id : a.sku === where.OR[0].sku.equals)) ?? null) },
    ordenCompra: { findFirst: vi.fn(async ({ where }: any) => { const o = orders.find(o => o.id === where.id && o.companyId === where.companyId); return o ? { ...o, items: o.items.map((i: any) => ({ ...i })) } : null; }), update: vi.fn(async ({ where, data }: any) => { const o = orders.find(o => o.id === where.id); Object.assign(o, data); return o; }) },
    ordenCompraItem: { update: vi.fn(async ({ where, data }: any) => { expect(active).toBe(true); const i = orders.flatMap(o => o.items).find(i => i.id === where.id); Object.assign(i, data); return i; }) },
    receipt: {
      findUnique: vi.fn(async ({ where }: any) => receipts.find(r => r.companyId === where.companyId_idempotencyKey.companyId && r.idempotencyKey === where.companyId_idempotencyKey.idempotencyKey) ?? null),
      findFirst: vi.fn(async ({ where }: any) => receipts.find(r => r.companyId === where.companyId && (!where.id || r.id === where.id) && (!where.idempotencyKey || r.idempotencyKey === where.idempotencyKey)) ?? null),
      create: vi.fn(async ({ data }: any) => { expect(active).toBe(true); const id = `r-${receipts.length}`; const r = { ...data, id, createdAt: new Date(), updatedAt: new Date(), confirmedAt: null, scans: [], lines: data.lines.create.map((l: any) => ({ ...l, id: `${id}-line-${l.lineNumber}`, articleId: l.article?.connect.id ?? null, scans: [] })) }; receipts.push(r); return r; }),
      update: vi.fn(async ({ where, data }: any) => { expect(active).toBe(true); const r = receipts.find(r => r.id === where.id); Object.assign(r, data); return r; }),
    },
    receiptLine: { update: vi.fn(async ({ where, data }: any) => { const l = receipts.flatMap(r => r.lines).find(l => l.id === where.id); Object.assign(l, data); return l; }) },
    stockPhysicalUnit: {
      findFirst: vi.fn(async ({ where }: any) => units.find(u => u.companyId === where.companyId && where.serialNumber.in.includes(u.serialNumber)) ?? null),
      create: vi.fn(async ({ data }: any) => { expect(active).toBe(true); const u = { ...data, id: `unit-${units.length}`, status: "ACTIVE" }; units.push(u); return u; }),
    },
    stockMovement: {
      findMany: vi.fn(async ({ where }: any) => movements.filter(m => m.companyId === where.companyId && m.articleId === where.articleId && m.lotCode != null)),
      upsert: vi.fn(async ({ create }: any) => { expect(active).toBe(true); const m = { ...create, id: `movement-${movements.length}` }; movements.push(m); return m; }),
    },
    auditEvent: { create: vi.fn(async ({ data }: any) => { expect(active).toBe(true); audits.push(data); return data; }) },
  };
  const prisma: any = { ...tx, $transaction: vi.fn(async (fn: any) => {
    expect(active).toBe(false);
    const previous = { orders: orders.map(o => ({ ...o, items: o.items.map((i: any) => ({ ...i })) })), receipts: [...receipts], movements: [...movements], units: [...units], audits: [...audits] };
    active = true;
    try { return await fn(tx); } catch (error) { ({ orders, receipts, movements, units, audits } = previous); throw error; } finally { active = false; }
  }) };
  notification.mockReset().mockImplementation(async () => { expect(active).toBe(false); });
  const input = { prisma, companyId: "company", ordenCompraId: "oc", updatedById: "actor", location: "Destination", operationKey: "op", receivedByItem: [{ itemId: "oc-item", received: "2", allocations: [{ quantity: "2", lotCode: "LOT", expirationDate: "2099-01-01" }] }] };
  return { tx, prisma, input, articles, item, addOrder: (id: string, articleId = "article") => orders.push(order(id, articleId)), receive: (overrides: any = {}) => recibirOrdenCompra({ ...input, ...overrides }), get active() { return active; }, get orders() { return orders; }, get receipts() { return receipts; }, get movements() { return movements; }, get units() { return units; }, get audits() { return audits; } };
}
const payload = (allocations: OrdenCompraReceiptAllocation[], received: string | number = "2", itemId = "oc-item") => [{ itemId, received, allocations }];
function noEffects(f: ReturnType<typeof fixture>) {
  expect(f.tx.receipt.create).not.toHaveBeenCalled(); expect(f.tx.stockPhysicalUnit.create).not.toHaveBeenCalled(); expect(f.tx.stockMovement.upsert).not.toHaveBeenCalled(); expect(f.tx.ordenCompraItem.update).not.toHaveBeenCalled(); expect(f.audits).toHaveLength(0);
}

describe("tracked OC ingress (MOCKED; no DB/network)", () => {
  it.each([
    ["NONE", undefined],
    ["LOT", [{ quantity: "0.25", lotCode: " A " }, { quantity: "1.75", lotCode: "B" }]],
    ["LOT_EXPIRY", [{ quantity: "1", lotCode: "A", expirationDate: "2099-01-01" }, { quantity: "1", lotCode: "B", expirationDate: "2099-02-01" }]],
    ["SERIAL", [{ quantity: "1", serialNumber: " S1 " }, { quantity: "1", serialNumber: "S2" }]],
    ["SERIAL_EXPIRY", [{ quantity: "1", serialNumber: "S1", expirationDate: "2099-01-01" }, { quantity: "1", serialNumber: "S2", expirationDate: "2099-01-01" }]],
    ["LOT_SERIAL_EXPIRY", [{ quantity: "1", lotCode: "A", serialNumber: "S1", expirationDate: "2099-01-01" }, { quantity: "1", lotCode: "A", serialNumber: "S2", expirationDate: "2099-01-01" }]],
  ] as const)("receives %s with flattened trace and ONE OC aggregate update", async (policy, allocations) => {
    const f = fixture(policy);
    const receivedByItem = allocations ? payload([...allocations]) : [{ itemId: "oc-item", received: "2" }];
    const result = await f.receive({ receivedByItem });
    expect(result).not.toHaveProperty("receiptWarnings");
    expect(f.orders[0].items[0].received.toString()).toBe("2");
    expect(f.tx.ordenCompraItem.update).toHaveBeenCalledTimes(1);
    expect(f.movements).toHaveLength(allocations?.length ?? 1);
    expect(f.movements.reduce((sum, m) => sum.plus(m.quantity), new Prisma.Decimal(0)).toString()).toBe("2");
    for (const m of f.movements) expect(m).toMatchObject({ location: "Destination", createdById: "actor", metadata: { policy, ordenCompraItemId: "oc-item" } });
    if (policy.includes("SERIAL")) {
      expect(f.units).toHaveLength(2);
      expect(new Set(f.units.map(u => u.unitCode)).size).toBe(2);
      for (const u of f.units) {
        expect(u.unitCode).toMatch(/^OC-[0-9a-f-]{36}$/); expect(u.unitCode).not.toBe(u.serialNumber);
        expect(f.movements.find(m => m.serialNumber === u.serialNumber).metadata).toMatchObject({ physicalUnitId: u.id, unitCode: u.unitCode });
      }
      expect(f.audits.filter(a => a.entityType === "StockPhysicalUnit")).toHaveLength(2);
    } else expect(f.units).toHaveLength(0);
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["NONE", [{ quantity: "2", lotCode: "A" }]], ["NONE", [{ quantity: "2" }]],
    ["LOT", [{ quantity: "2" }]], ["LOT", [{ quantity: "2", lotCode: "A", serialNumber: "S" }]],
    ["LOT", [{ quantity: "2", lotCode: "A", expirationDate: "2099-01-01" }]],
    ["LOT_EXPIRY", [{ quantity: "2", lotCode: "A" }]], ["LOT_EXPIRY", [{ quantity: "2", expirationDate: "2099-01-01" }]],
    ["SERIAL", [{ quantity: "2", serialNumber: "S" }]], ["SERIAL", [{ quantity: "2" }]],
    ["SERIAL_EXPIRY", [{ quantity: "1", serialNumber: "S" }]],
    ["LOT_SERIAL_EXPIRY", [{ quantity: "1", serialNumber: "S", expirationDate: "2099-01-01" }]],
    ["LOT_SERIAL_EXPIRY", [{ quantity: "1", lotCode: "A", expirationDate: "2099-01-01" }]],
  ] as const)("rejects invalid %s policy fields before effects %j", async (policy, allocations) => {
    const f = fixture(policy); await expect(f.receive({ receivedByItem: payload([...allocations], allocations[0].quantity) })).rejects.toMatchObject({ status: 400 }); noEffects(f);
  });
  it.each(["LOT", "LOT_EXPIRY", "SERIAL", "SERIAL_EXPIRY", "LOT_SERIAL_EXPIRY"])("requires allocations for current %s", async policy => {
    const f = fixture(policy); await expect(f.receive({ receivedByItem: [{ itemId: "oc-item", received: "2" }] })).rejects.toMatchObject({ code: "orden_compra_trace_policy_unsupported" }); noEffects(f);
  });
  it.each(["2025-02-29", "2024-02-30", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "2026-1-01", "2026-01-01T00:00:00Z", "0000-01-01", " 2026-01-01 "])("rejects malformed calendar %s", async expirationDate => {
    const f = fixture(); await expect(f.receive({ receivedByItem: payload([{ quantity: 2, lotCode: "A", expirationDate }]) })).rejects.toMatchObject({ status: 400 }); noEffects(f);
  });
  it("accepts leap day and exact decimal splits without rounding", async () => {
    const f = fixture(); await f.receive({ receivedByItem: payload([{ quantity: "0.0001", lotCode: "A", expirationDate: "2024-02-29" }, { quantity: "1.9999", lotCode: "B", expirationDate: "2099-01-01" }]) });
    expect(f.movements.map(m => m.quantity.toString())).toEqual(["0.0001", "1.9999"]);
    expect(f.receipts[0].lines[0].expirationDate.toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });
  it.each(["0", "-1", "NaN", "Infinity", "0.00001", "1.00001", "999999999999999", "1".repeat(65)])("rejects invalid allocation quantity %s", async quantity => {
    const f = fixture("LOT"); await expect(f.receive({ receivedByItem: payload([{ quantity, lotCode: "A" }], quantity) })).rejects.toMatchObject({ status: 400 }); noEffects(f);
  });
  it("rejects unequal exact sum", async () => {
    const f = fixture("LOT"); await expect(f.receive({ receivedByItem: payload([{ quantity: "0.1", lotCode: "A" }, { quantity: "0.2", lotCode: "B" }], "0.3001") })).rejects.toMatchObject({ status: 400 }); noEffects(f);
  });
  it.each(["1.00000", "1.00000e0", "0.00001e5"])("replays equivalent tracked Decimal spelling %s without effects", async quantity => {
    const f = fixture("SERIAL");
    const first = await f.receive({ receivedByItem: payload([{ quantity: "1", serialNumber: "S" }], "1") });
    const audits = f.audits.length;
    expect(await f.receive({ receivedByItem: payload([{ quantity, serialNumber: "S" }], quantity) })).toEqual(first);
    expect(f.receipts[0].metadata.intentKey).toContain('"quantity":"1"');
    expect(f.receipts).toHaveLength(1); expect(f.units).toHaveLength(1); expect(f.movements).toHaveLength(1);
    expect(f.audits).toHaveLength(audits); expect(f.tx.ordenCompraItem.update).toHaveBeenCalledTimes(1); expect(notification).toHaveBeenCalledTimes(1);
  });
  it.each(["", " ", "L".repeat(121), "bad\uD800", "bad\0"])("rejects bounded trace %j", async lotCode => {
    const f = fixture("LOT"); await expect(f.receive({ receivedByItem: payload([{ quantity: 2, lotCode }]) })).rejects.toMatchObject({ status: 400 }); noEffects(f);
  });
  it("rejects unknown nested fields, duplicate items, empty/oversized allocations and trace on zero", async () => {
    const f = fixture();
    for (const receivedByItem of [
      [{ itemId: "oc-item", received: 2, allocations: [{ quantity: 2, lotCode: "A", unknown: true }] }],
      [{ itemId: "oc-item", received: 2, policy: "NONE" }],
      [f.input.receivedByItem[0], f.input.receivedByItem[0]],
      payload([]), payload(Array.from({ length: 1001 }, () => ({ quantity: 1, lotCode: "A" })), 1001),
      [...f.input.receivedByItem, { itemId: "zero", received: 0, allocations: [{ quantity: 1, lotCode: "A" }] }],
    ]) await expect(f.receive({ receivedByItem })).rejects.toMatchObject({ status: 400 });
    noEffects(f);
  });
  it("accepts expired ingress and replays the SAME persisted warning after state/policy changes", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T15:00:00Z"));
    const f = fixture(); const receivedByItem = payload([{ quantity: 2, lotCode: "A", expirationDate: "2026-10-03" }]);
    const first = await f.receive({ receivedByItem });
    const expected = [{ code: "EXPIRED_RECEIPT_ACCEPTED", itemId: "oc-item", articleId: "article", lineNumber: 1, expirationDate: "2026-10-03", receivedOn: "2026-10-04", lotCode: "A" }];
    expect(first.receiptWarnings).toEqual(expected); expect(f.receipts[0].metadata.receiptWarnings).toEqual(expected);
    expect(f.audits.find(a => a.action === "orden_compra_recibida").newValue.receiptWarnings).toEqual(expected);
    expect(notification).toHaveBeenCalledWith(f.prisma, expect.objectContaining({
      type: "stock_receipt_confirmed", domain: "STOCK", severity: "WARNING",
      body: expect.stringMatching(/vencid/i),
      metadata: { receiptId: f.receipts[0].id, documentReference: "oc", expiredReceiptAccepted: true, receiptWarnings: expected.map(({ lineNumber, ...warning }) => warning) },
    }));
    const notice = notification.mock.calls[0][1];
    f.orders[0].state = "Cancelada"; f.articles[0].tracePolicies = []; f.articles[0].isActive = false;
    vi.setSystemTime(new Date("2026-10-06T01:00:00Z"));
    expect((await f.receive({ receivedByItem })).receiptWarnings).toEqual(expected);
    expect(f.movements).toHaveLength(1); expect(notification).toHaveBeenCalledTimes(1);
    expect(notification.mock.calls[0][1]).toEqual(notice);
    expect(f.tx.article.findFirst).toHaveBeenCalledTimes(2); // policy lookup + draft code resolution, no replay validation
  });
  it.each(["2026-10-04", "2026-10-05"])("does not warn expiration today/future %s", async expirationDate => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-04T23:59:59Z"));
    const f = fixture(); const result = await f.receive({ receivedByItem: payload([{ quantity: 2, lotCode: "A", expirationDate }]) });
    expect(result).not.toHaveProperty("receiptWarnings"); expect(f.receipts[0].metadata).not.toHaveProperty("receiptWarnings");
  });
  it("normalizes reordered allocations, trimmed serials/lot and numeric quantities for replay", async () => {
    const f = fixture("LOT_SERIAL_EXPIRY"); const allocations = [{ quantity: 1, lotCode: " A ", serialNumber: " S2 ", expirationDate: "2099-01-01" }, { quantity: "1.0000", lotCode: "A", serialNumber: "S1", expirationDate: "2099-01-01" }];
    await f.receive({ receivedByItem: payload(allocations) });
    f.articles[0].tracePolicies = [{ policy: "NONE" }]; f.orders[0].state = "Recibida";
    await f.receive({ receivedByItem: payload([...allocations].reverse(), "2.0000") });
    expect(f.units).toHaveLength(2); expect(f.movements).toHaveLength(2); expect(notification).toHaveBeenCalledTimes(1);
  });
  it.each(["lotCode", "serialNumber", "expirationDate"])("conflicts accepted same-key changed %s BEFORE current policy validation", async field => {
    const f = fixture("LOT_SERIAL_EXPIRY"); const allocation = { quantity: 1, lotCode: "A", serialNumber: "S", expirationDate: "2099-01-01" };
    await f.receive({ receivedByItem: payload([allocation], 1) }); f.articles[0].tracePolicies = [];
    await expect(f.receive({ receivedByItem: payload([{ ...allocation, [field]: field === "expirationDate" ? "2099-02-01" : "other" }], 1) })).rejects.toMatchObject({ status: 409, code: "orden_compra_receipt_conflict" });
    expect(f.movements).toHaveLength(1); expect(f.units).toHaveLength(1);
  });
  it("rejects duplicate serial across items/articles within an operation before writes", async () => {
    const f = fixture("SERIAL"); f.articles.push({ ...f.articles[0], id: "other", sku: "OTHER" }); f.orders[0].items.push(f.item("second", "other"));
    await expect(f.receive({ receivedByItem: [...payload([{ quantity: 1, serialNumber: "S" }], 1), ...payload([{ quantity: 1, serialNumber: " S " }], 1, "second")] })).rejects.toMatchObject({ code: "orden_compra_serial_conflict", status: 409 }); noEffects(f);
  });
  it.each(["ACTIVE", "RETIRED"])("rejects serial registered by previous OC across articles/status %s", async status => {
    const f = fixture("SERIAL"); await f.receive({ receivedByItem: payload([{ quantity: 1, serialNumber: "S" }], 1) }); f.units[0].status = status;
    f.articles.push({ ...f.articles[0], id: "other", sku: "OTHER" }); f.addOrder("oc2", "other");
    await expect(f.receive({ ordenCompraId: "oc2", receivedByItem: payload([{ quantity: 1, serialNumber: "S" }], 1, "oc2-item") })).rejects.toMatchObject({ code: "orden_compra_serial_conflict", status: 409 });
    expect(f.units).toHaveLength(1); expect(f.movements).toHaveLength(1); expect(f.orders[1].items[0].received.toString()).toBe("0");
    expect(f.tx.stockPhysicalUnit.findFirst).toHaveBeenLastCalledWith({ where: { companyId: "company", serialNumber: { in: ["S"] } }, select: { id: true } });
  });
  it("preserves trim-only case-sensitive manufacturer serial semantics and company scope", async () => {
    const f = fixture("SERIAL"); f.units.push({ id: "foreign", companyId: "other-company", serialNumber: "S" });
    await f.receive({ receivedByItem: payload([{ quantity: 1, serialNumber: "S" }, { quantity: 1, serialNumber: "s" }]) }); expect(f.units).toHaveLength(3);
  });
  it("rejects lot expiry mismatch within request (also across OC items)", async () => {
    const f = fixture(); f.orders[0].items.push(f.item("second", "article"));
    await expect(f.receive({ receivedByItem: [...payload([{ quantity: 1, lotCode: " A ", expirationDate: "2099-01-01" }], 1), ...payload([{ quantity: 1, lotCode: "A", expirationDate: "2099-02-01" }], 1, "second")] })).rejects.toMatchObject({ code: "orden_compra_lot_expiry_conflict", status: 409 }); noEffects(f);
  });
  it.each([null, new Date("2099-02-01")])("rejects existing normalized lot expiry mismatch %s under Article lock", async expirationDate => {
    const f = fixture(); f.movements.push({ companyId: "company", articleId: "article", lotCode: " LOT ", expirationDate });
    await expect(f.receive()).rejects.toMatchObject({ code: "orden_compra_lot_expiry_conflict", status: 409 }); noEffects(f);
    expect(f.tx.stockMovement.findMany).toHaveBeenCalledWith({ where: { companyId: "company", articleId: "article", lotCode: { not: null } }, select: { lotCode: true, expirationDate: true } });
  });
  it("equivalent lot across OCs accepts same date, rejects changed date; other company/Article is separate", async () => {
    const f = fixture(); f.movements.push({ companyId: "foreign", articleId: "article", lotCode: "LOT", expirationDate: new Date("2080-01-01") }, { companyId: "company", articleId: "other", lotCode: "LOT", expirationDate: new Date("2080-01-01") });
    await f.receive(); f.addOrder("oc2"); await f.receive({ ordenCompraId: "oc2", receivedByItem: payload([{ quantity: 1, lotCode: "LOT", expirationDate: "2099-01-01" }], 1, "oc2-item") });
    f.addOrder("oc3"); await expect(f.receive({ ordenCompraId: "oc3", receivedByItem: payload([{ quantity: 1, lotCode: "LOT", expirationDate: "2099-02-01" }], 1, "oc3-item") })).rejects.toMatchObject({ status: 409 });
    expect(f.receipts).toHaveLength(2);
  });
  it("locks distinct Articles sorted before policy/lot checks; maps receipt lines by lineNumber", async () => {
    const f = fixture(); f.articles.push({ ...f.articles[0], id: "a", sku: "A" }); f.orders[0].items.push(f.item("second", "a"), f.item("third", "article"));
    const create = f.tx.receipt.create.getMockImplementation(); f.tx.receipt.create.mockImplementation(async (args: any) => { const r = await create(args); return { ...r, lines: [...r.lines].reverse() }; });
    await f.receive({ receivedByItem: [...f.input.receivedByItem, ...payload([{ quantity: 1, lotCode: "A", expirationDate: "2099-01-01" }], 1, "second"), ...payload([{ quantity: 1, lotCode: "LOT", expirationDate: "2099-01-01" }], 1, "third")] });
    const locks = f.tx.$queryRaw.mock.calls.filter((c: any) => c[0].join("").includes('FROM "article"'));
    expect(locks.map((c: any) => c[1])).toEqual(["a", "article"]);
    expect(locks.every((c: any) => c[0].join("").includes('"organizationId" = ') && c[0].join("").includes("FOR UPDATE") && c[2] === "org")).toBe(true);
    expect(f.tx.$queryRaw.mock.invocationCallOrder[2]).toBeLessThan(f.tx.article.findFirst.mock.invocationCallOrder[0]);
    expect(f.movements.map(m => m.metadata.ordenCompraItemId)).toEqual(["oc-item", "second", "third"]);
    expect(f.tx.ordenCompraItem.update).toHaveBeenCalledTimes(3);
  });
  it.each(["unit", "ledger", "OC-audit"])("rolls back units/audits/receipt/movements/OC after late %s failure", async kind => {
    const f = fixture("SERIAL");
    const method = kind === "unit" ? f.tx.stockPhysicalUnit.create : kind === "ledger" ? f.tx.stockMovement.upsert : f.tx.auditEvent.create;
    const original = method.getMockImplementation(); let count = 0;
    method.mockImplementation(async (args: any) => { count++; if ((kind !== "OC-audit" && count === 2) || (kind === "OC-audit" && args.data.action === "orden_compra_recibida")) throw new Error(`${kind} failure`); return original(args); });
    await expect(f.receive({ receivedByItem: payload([{ quantity: 1, serialNumber: "S1" }, { quantity: 1, serialNumber: "S2" }]) })).rejects.toThrow(`${kind} failure`);
    expect(f.units).toHaveLength(0); expect(f.movements).toHaveLength(0); expect(f.audits).toHaveLength(0); expect(f.receipts).toHaveLength(0); expect(f.orders[0].items[0].received.toString()).toBe("0"); expect(f.orders[0].state).toBe("Enviada"); expect(notification).not.toHaveBeenCalled();
  });
  it("maps concurrent unit P2002 to 409 ONLY after transaction rollback, without continuation", async () => {
    const f = fixture("SERIAL"); const original = f.tx.stockPhysicalUnit.create.getMockImplementation(); let count = 0;
    f.tx.stockPhysicalUnit.create.mockImplementation(async (args: any) => { if (++count === 2) throw new Prisma.PrismaClientKnownRequestError("serial unique", { code: "P2002", clientVersion: "7.8.0", meta: { modelName: "StockPhysicalUnit", target: ["company_id", "serial_number"] } }); return original(args); });
    await expect(f.receive({ receivedByItem: payload([{ quantity: 1, serialNumber: "S1" }, { quantity: 1, serialNumber: "S2" }]) })).rejects.toMatchObject({ code: "orden_compra_serial_conflict", status: 409 });
    expect(f.active).toBe(false); expect(f.units).toHaveLength(0); expect(f.audits).toHaveLength(0); expect(f.tx.receipt.create).not.toHaveBeenCalled(); expect(f.tx.stockPhysicalUnit.create).toHaveBeenCalledTimes(2); expect(notification).not.toHaveBeenCalled();
  });
  it("legacy NONE intent remains exact old JSON, metadata, replay and zero-row behavior", async () => {
    const f = fixture("NONE"); f.orders[0].items.push(f.item("zero", "foreign"));
    const receivedByItem = [{ itemId: "zero", received: 0 }, { itemId: " oc-item ", received: "2.0000" }];
    const intentKey = '{"location":"Destination","operationKey":"op","receivedByItem":[{"itemId":"oc-item","received":"2"},{"itemId":"zero","received":"0"}]}';
    expect(JSON.stringify(normalizeOrdenCompraReceipt({ ...f.input, receivedByItem }))).toBe(intentKey);
    const first = await f.receive({ receivedByItem });
    expect(f.receipts[0].metadata).toEqual({ source: "OrdenCompra", ordenCompraId: "oc", operationKey: "op", policy: "NONE", location: "Destination", intentKey, items: [{ ordenCompraItemId: "oc-item", articleId: "article", received: "2" }] });
    expect(f.movements[0].metadata).toEqual({ source: "OrdenCompra", ordenCompraId: "oc", operationKey: "op", policy: "NONE", ordenCompraItemId: "oc-item" });
    expect(await f.receive({ receivedByItem: [...receivedByItem].reverse() })).toEqual(first);
    expect(f.units).toHaveLength(0); expect(f.tx.stockMovement.findMany).not.toHaveBeenCalled(); expect(f.tx.stockPhysicalUnit.findFirst).not.toHaveBeenCalled(); expect(notification).toHaveBeenCalledTimes(1);
  });
});
