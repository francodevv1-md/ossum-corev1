import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma, type PrismaClient } from "@prisma/client"
import { registrarDevolucion, updateRemitoState } from "@/lib/services/remito.service"
import { confirmDevolucion, rejectDevolucion, updateDevolucionState } from "@/lib/services/devolucion.service"
import { registrarRemitoDevolucion } from "@/lib/api/remitos"
import { POST } from "@/app/api/companies/[companyId]/remitos/[remitoId]/devolucion/route"
import { devolucionItemCreateSchema } from "@/lib/validators/devolucion"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), prisma: {} }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: vi.fn().mockResolvedValue("token") }))
vi.mock("@/lib/prisma", () => ({ default: mocks.prisma }))

vi.mock("@/lib/services/internal-notifications.service", () => ({ emitCrossDomainNotification: vi.fn().mockResolvedValue(undefined) }))
const D = (value: string | number) => new Prisma.Decimal(value)
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
type RecordRow = Record<string, any>
// Read-committed staging and a per-parent lock; rollback drops staged writes.
// Deliberately not a PostgreSQL engine/SSI/deadlock simulator.
function database(quantity = "10") {
  let parent: RecordRow = { id: "remito", companyId: "company", surgeryId: "surgery", state: "Entregado", origin: "manual", updatedAt: new Date(), returnedAt: null }
  const items = new Map<string, RecordRow>([["item", { id: "item", companyId: "company", remitoId: "remito", description: "Implant", quantity: D(quantity), returnedQuantity: D(0) }]])
  const documents = new Map<string, RecordRow>()
  const audits: unknown[] = []
  const effects: RecordRow[] = []
  let sequence = 0, readers = 0
  const tails = new Map<string, Promise<void>>()
  const bothRead = deferred()
  let simultaneousRead = false, linked = false, failItem = false, failAccounting = false
  let pauseRead: { entered: ReturnType<typeof deferred>; resume: ReturnType<typeof deferred> } | undefined
  let pauseWrite: { entered: ReturnType<typeof deferred>; resume: ReturnType<typeof deferred> } | undefined
  const matches = (row: RecordRow, where: RecordRow = {}) => Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true
    if (key === "metadata") return value.path.reduce((current: any, part: string) => current?.[part], row.metadata) === value.equals
    if (value instanceof Date) return row[key]?.getTime() === value.getTime()
    return row[key] === value
  })
  function client(transaction = false) {
    let ownsLock = false
    const held = new Map<string, () => void>()
    let ownParent: RecordRow | undefined
    const ownItems = new Map<string, RecordRow>(), ownDocuments = new Map<string, RecordRow>(), ownAudits: unknown[] = []
    const ownEffects: RecordRow[] = []
    const effectCreate = (kind: string) => vi.fn(async ({ data }: { data: RecordRow }) => {
      const row = { ...data, id: data.id ?? `${kind}-${ownEffects.length}`, kindOfRecord: kind }; ownEffects.push(row); return row
    })
    const readParent = () => ownParent ?? parent
    const readItems = () => [...items].map(([id, row]) => ownItems.get(id) ?? row)
    const readDocument = (id: string) => ownDocuments.get(id) ?? documents.get(id)
    async function lock(resource = "remito") {
      if (held.has(resource)) return
      const prior = tails.get(resource) ?? Promise.resolve(), done = deferred(); tails.set(resource, done.promise)
      await prior; held.set(resource, done.resolve)
      if (resource === "remito") ownsLock = true
    }
    const db = {
      $queryRaw: vi.fn(async () => { await lock(); return [{ id: parent.id }] }),
      remito: {
        findFirst: vi.fn(async ({ where }: { where: RecordRow }) => {
          const row = readParent()
          if (!matches(row, where)) return null
          const snapshot = { ...row, items: readItems() }
          if (simultaneousRead && transaction && !ownsLock) { if (++readers === 2) bothRead.resolve(); await bothRead.promise }
          if (pauseRead && transaction && ownsLock) { const gate = pauseRead; pauseRead = undefined; gate.entered.resolve(); await gate.resume.promise }
          return snapshot
        }),
        update: vi.fn(async ({ where, data }: { where: RecordRow; data: RecordRow }) => {
          await lock()
          if (!matches(readParent(), where)) throw new Prisma.PrismaClientKnownRequestError("Stale", { code: "P2025", clientVersion: "7" })
          ownParent = { ...readParent(), ...data, updatedAt: new Date((readParent().updatedAt as Date).getTime() + 1) }
          if (pauseWrite) { const gate = pauseWrite; pauseWrite = undefined; gate.entered.resolve(); await gate.resume.promise }
          return { ...ownParent, items: readItems() }
        }),
      },
      remitoItem: {
        findMany: vi.fn(async () => readItems()),
        update: vi.fn(async ({ where, data }: { where: RecordRow; data: RecordRow }) => {
          if (failItem) throw new Error("injected return failure")
          ownItems.set(where.id, { ...items.get(where.id), ...ownItems.get(where.id), ...data }); return ownItems.get(where.id)
        }),
      },
      devolucion: {
        create: vi.fn(async ({ data }: { data: RecordRow }) => {
          const id = `return-${++sequence}`
          const row = { ...data, id, visibleNumber: null, createdAt: new Date(), updatedAt: new Date(), items: data.items.create.map((item: RecordRow, n: number) => ({ ...item, id: `${id}-item-${n}` })) }
          ownDocuments.set(id, row); return row
        }),
        findFirst: vi.fn(async ({ where }: { where: RecordRow }) => [...new Set([...documents.keys(), ...ownDocuments.keys()])].map(readDocument).find(row => row && matches(row, where)) ?? null),
        updateMany: vi.fn(async ({ where, data }: { where: RecordRow; data: RecordRow }) => {
          await lock(`return:${where.id}`)
          const row = readDocument(where.id)
          if (!row || !matches(row, where)) return { count: 0 }
          ownDocuments.set(row.id, { ...row, ...data }); return { count: 1 }
        }),
        update: vi.fn(async ({ where, data }: { where: RecordRow; data: RecordRow }) => {
          await lock(`return:${where.id}`)
          const current = readDocument(where.id)
          if (!current || !matches(current, where)) throw new Prisma.PrismaClientKnownRequestError("Stale return", { code: "P2025", clientVersion: "7" })
          const row = { ...current, ...data }; ownDocuments.set(where.id, row); return row
        }),
      },
      auditEvent: { create: vi.fn(async ({ data }: { data: unknown }) => { ownAudits.push(data); return { ...(data as RecordRow), id: "audit" } }) },
      cajasDispatch: { findFirst: vi.fn(async () => linked ? { id: "dispatch", remitoId: "remito", assignmentId: "assignment", accounting: { id: "accounting", version: 1 },
        lines: [{ id: "dispatch-line", remitoItemId: "item", unit: "unit", articleReferenceId: "reference", stockScopeReferenceId: "scope", articleReference: { sourceArticleId: "article" }, accounting: {}, traceabilitySnapshot: { reservationId: "reservation" } }] } : null) },
      cajasCommandAcceptance: { findUnique: vi.fn().mockResolvedValue(null), create: effectCreate("command") },
      cajasReturnConfirmation: { create: effectCreate("confirmation") },
      cajasDispatchLineAccounting: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      cajasReturnLine: { create: effectCreate("return-line") },
      stockMovement: { upsert: vi.fn(async ({ create }: { create: RecordRow }) => effectCreate("stock")({ data: create })) },
      cajasStockRecordReference: { create: vi.fn(async ({ data }: { data: RecordRow }) => {
        if (failAccounting) throw new Error("injected accounting failure")
        return effectCreate("stock-reference")({ data })
      }) },
      cajasDisposition: { create: effectCreate("disposition") },
      stockReservation: { findFirst: vi.fn().mockResolvedValue({ id: "reservation", dispatchedQuantity: D(quantity), remainingQuantity: D(0) }), update: effectCreate("reservation") },
      cajasCommandEffect: { create: effectCreate("effect") },
      cajasDispatchAccounting: { update: effectCreate("accounting") },
    }
    return { db, commit() { if (ownParent) parent = ownParent; for (const [id, row] of ownItems) items.set(id, row); for (const [id, row] of ownDocuments) documents.set(id, row); audits.push(...ownAudits); effects.push(...ownEffects) }, release() { for (const unlock of held.values()) unlock() } }
  }
  const root = client()
  const transactions: ReturnType<typeof client>[] = []
  const prisma = { ...root.db, $transaction: vi.fn(async (callback: (tx: ReturnType<typeof client>["db"]) => Promise<unknown>) => {
    const tx = client(true); transactions.push(tx)
    try { const result = await callback(tx.db); tx.commit(); return result } finally { tx.release() }
  }) } as unknown as PrismaClient
  return { prisma, documents, items, audits, effects, transactions, get parent() { return parent },
    link() { linked = true }, fail() { failItem = true }, failAccounting() { failAccounting = true }, race() { simultaneousRead = true }, pause() { pauseRead = { entered: deferred(), resume: deferred() }; return pauseRead },
    pauseWrite() { pauseWrite = { entered: deferred(), resume: deferred() }; return pauseWrite },
    pending(id: string, returnedQuantity: string) { documents.set(id, { id, companyId: "company", remitoId: "remito", state: "Pendiente", items: [{ id: `${id}-line`, remitoItemId: "item", returnedQuantity: D(returnedQuantity) }] }) },
  }
}
function returned(db: ReturnType<typeof database>, quantity: string, key?: string, actor = "actor") {
  return registrarDevolucion({ companyId: "company", remitoId: "remito", items: [{ itemId: "item", returnedQuantity: quantity }], updatedById: actor, idempotencyKey: key, prisma: db.prisma })
}
const confirmed = (db: ReturnType<typeof database>, id: string) => confirmDevolucion({ companyId: "company", devolucionId: id, updatedById: "actor", prisma: db.prisma })
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe("R7 atomic legacy return and durable command receipt", () => {
  it("rolls back created/pending document, quantities and audits on confirmation failure", async () => {
    const db = database(); db.fail()
    await expect(returned(db, "1", "failed-command")).rejects.toThrow("injected return failure")
    expect(db.documents.size).toBe(0)
    expect(db.items.get("item")!.returnedQuantity.eq(0)).toBe(true)
    expect(db.audits).toHaveLength(0)
  })
  it("composes the existing owners in exactly one root transaction", async () => {
    const db = database()
    await returned(db, "1", "command")
    expect(db.prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(db.documents.size).toBe(1)
    expect([...db.documents.values()][0].state).toBe("Confirmada")
  })
  it("replays a lost response without a second document, quantity or audit", async () => {
    const db = database()
    await returned(db, "1", "same-command")
    const audits = db.audits.length
    await returned(db, "1", "same-command")
    expect(db.documents.size).toBe(1)
    expect(db.items.get("item")!.returnedQuantity.eq(1)).toBe(true)
    expect(db.audits).toHaveLength(audits)
  })
  it("applies one command once when two identical requests overlap", async () => {
    const db = database()
    await Promise.all([returned(db, "1", "same"), returned(db, "1", "same")])
    expect(db.documents.size).toBe(1)
    expect(db.items.get("item")!.returnedQuantity.eq(1)).toBe(true)
  })
  it.each(["0.00001", "100000000000000", "1e-9000000000000001", "NaN", "0x10"])("rejects unrepresentable internal return %s before transaction", async (quantity) => {
    const db = database()
    await expect(returned(db, quantity, "bad")).rejects.toMatchObject({ code: "invalid_returned_quantity" })
    expect(db.prisma.$transaction).not.toHaveBeenCalled()
    expect(devolucionItemCreateSchema.safeParse({ description: "Implant", returnedQuantity: quantity }).success).toBe(false)
  })
  it("replays an accepted full return even after the Remito becomes terminal", async () => {
    const db = database("1")
    await returned(db, "1", "full-command")
    await expect(returned(db, "1", "full-command")).resolves.toMatchObject({ state: "Devuelto" })
    expect(db.documents.size).toBe(1)
  })
  it.each([["2", "actor"], ["1", "other-actor"]])("rejects reused key with changed quantity %s or actor %s", async (quantity, actor) => {
    const db = database(); await returned(db, "1", "command")
    await expect(returned(db, quantity, "command", actor)).rejects.toMatchObject({ status: 409, code: "remito_return_replay_conflict" })
    expect(db.items.get("item")!.returnedQuantity.eq(1)).toBe(true)
  })
  it("adds a legitimately new partial return under a different key", async () => {
    const db = database(); await returned(db, "1", "one"); await returned(db, "1", "two")
    expect(db.items.get("item")!.returnedQuantity.eq(2)).toBe(true)
    expect(db.documents.size).toBe(2)
  })
  it("does not trust a caller-supplied receipt snapshot over its actual document items", async () => {
    const db = database(); await returned(db, "1", "command")
    const receipt = [...db.documents.values()][0]
    receipt.items[0].returnedQuantity = D(2)
    await expect(returned(db, "1", "command")).rejects.toMatchObject({ code: "remito_return_replay_conflict" })
  })
  it("does not trust a caller-supplied receipt actor over the authenticated document creator", async () => {
    const db = database(); await returned(db, "1", "command")
    const receipt = [...db.documents.values()][0]
    receipt.createdById = "other-actor"
    await expect(returned(db, "1", "command")).rejects.toMatchObject({ code: "remito_return_replay_conflict" })
  })
  it("sums duplicate fractional return lines exactly", async () => {
    const db = database("0.3")
    await expect(registrarDevolucion({ companyId: "company", remitoId: "remito", updatedById: "actor", idempotencyKey: "fractions", prisma: db.prisma,
      items: [{ itemId: "item", returnedQuantity: "0.1" }, { itemId: "item", returnedQuantity: "0.2" }] })).resolves.toMatchObject({ state: "Devuelto" })
    expect(db.items.get("item")!.returnedQuantity.eq("0.3")).toBe(true)
  })
  it.each(["Borrador", "Emitido", "En_transito"])("rejects %s before creating any return document", async (state) => {
    const db = database(); db.parent.state = state
    await expect(returned(db, "1", "command")).rejects.toMatchObject({ status: 409, code: "remito_devolucion_not_allowed" })
    expect(db.documents.size).toBe(0)
    expect(db.audits).toHaveLength(0)
  })
  it("requires explicit Cajas accounting without creating an orphan pending document", async () => {
    const db = database(); db.link()
    await expect(returned(db, "1", "command")).rejects.toMatchObject({ code: "cajas_accounting_required" })
    expect(db.documents.size).toBe(0)
    expect(db.audits).toHaveLength(0)
  })
})

describe("R7 canonical shared-item serialization", () => {
  it("does not lose increments from two distinct concurrent confirmations", async () => {
    const db = database(); db.pending("a", "1"); db.pending("b", "2"); db.race()
    await Promise.all([confirmed(db, "a"), confirmed(db, "b")])
    expect(db.items.get("item")!.returnedQuantity.eq(3)).toBe(true)
  })
  it("does not accept concurrent returns exceeding the same remaining balance", async () => {
    const db = database(); db.pending("a", "6"); db.pending("b", "6"); db.race()
    const results = await Promise.allSettled([confirmed(db, "a"), confirmed(db, "b")])
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
    expect(db.items.get("item")!.returnedQuantity.eq(6)).toBe(true)
    expect([...db.documents.values()].filter(row => row.state === "Confirmada")).toHaveLength(1)
  })
  it("claims one canonical return exactly once across overlapping confirmations", async () => {
    const db = database(); db.pending("a", "1")
    await Promise.all([confirmed(db, "a"), confirmed(db, "a")])
    expect(db.items.get("item")!.returnedQuantity.eq(1)).toBe(true)
    expect(db.audits).toHaveLength(1)
  })
  it("locks the owning company/Remito before reading shared quantities", async () => {
    const db = database(); db.pending("a", "1")
    await confirmed(db, "a")
    const tx = db.transactions[0].db
    expect(tx.$queryRaw).toHaveBeenCalledWith(expect.any(Array), "remito", "company")
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.remito.findFirst.mock.invocationCallOrder[0])
  })
  it("never revives a cancelled Remito through canonical return", async () => {
    const db = database(); db.pending("a", "1"); db.parent.state = "Anulado"
    await expect(confirmed(db, "a")).rejects.toMatchObject({ status: 409, code: "remito_devolucion_not_allowed" })
    expect(db.parent.state).toBe("Anulado")
    expect(db.documents.get("a")!.state).toBe("Pendiente")
  })
  it("rejects stale cancellation while return holds the parent lock without discarding the return", async () => {
    const db = database(); db.pending("a", "1")
    const gate = db.pause(), returning = confirmed(db, "a")
    await gate.entered.promise
    const cancelling = updateRemitoState({ companyId: "company", remitoId: "remito", updatedById: "actor", newState: "Anulado", prisma: db.prisma })
    const result = expect(cancelling).rejects.toMatchObject({ status: 409, code: "remito_state_conflict" })
    gate.resume.resolve(); await returning; await result
    expect(db.parent.state).toBe("Parcialmente_devuelto")
    expect(db.items.get("item")!.returnedQuantity.eq(1)).toBe(true)
  })
  it("rejects return when cancellation wins the shared parent lock", async () => {
    const db = database(); db.pending("a", "1")
    const gate = db.pauseWrite()
    const cancelling = updateRemitoState({ companyId: "company", remitoId: "remito", updatedById: "actor", newState: "Anulado", prisma: db.prisma })
    await gate.entered.promise
    const returning = confirmed(db, "a")
    const result = expect(returning).rejects.toMatchObject({ status: 409, code: "remito_devolucion_not_allowed" })
    gate.resume.resolve(); await cancelling; await result
    expect(db.parent.state).toBe("Anulado")
    expect(db.documents.get("a")!.state).toBe("Pendiente")
    expect(db.items.get("item")!.returnedQuantity.eq(0)).toBe(true)
  })
  it.each(["reject", "annul"])("does not let stale %s erase an accepted canonical return", async (operation) => {
    const db = database(); db.pending("a", "1")
    const gate = db.pause(), returning = confirmed(db, "a")
    await gate.entered.promise
    const input = { companyId: "company", devolucionId: "a", updatedById: "actor", prisma: db.prisma }
    const competing = operation === "reject" ? rejectDevolucion(input) : updateDevolucionState({ ...input, newState: "Anulada" })
    const result = expect(competing).rejects.toMatchObject({ status: 409, code: "devolucion_state_conflict" })
    gate.resume.resolve(); await returning; await result
    expect(db.documents.get("a")!.state).toBe("Confirmada")
    expect(db.items.get("item")!.returnedQuantity.eq(1)).toBe(true)
  })
  it("preserves viable fresh cancellation after an accepted partial return", async () => {
    const db = database(); db.pending("a", "1")
    await confirmed(db, "a")
    await updateRemitoState({ companyId: "company", remitoId: "remito", updatedById: "actor", newState: "Anulado", prisma: db.prisma })
    expect(db.parent.state).toBe("Anulado")
  })
})

describe("R7 unchanged canonical Cajas accounting participates in the same transaction", () => {
  const accounting = { dispatchId: "dispatch", idempotencyKey: "accounting-command", lines: [{ dispatchLineId: "dispatch-line", sourceItemId: "a-line", quantity: 1, kind: "unchanged" }] }
  it("records one return/ledger/disposition and does not repeat effects on confirmed retry", async () => {
    const db = database(); db.pending("a", "1"); db.link()
    await confirmDevolucion({ companyId: "company", devolucionId: "a", updatedById: "actor", cajasAccounting: accounting, prisma: db.prisma })
    expect(db.effects.filter(row => row.kindOfRecord === "stock")).toEqual([expect.objectContaining({ movementType: "RETURN_IN", devolucionId: "a", quantity: D(1) })])
    expect(db.effects.filter(row => row.kindOfRecord === "disposition")).toHaveLength(1)
    const count = db.effects.length
    await confirmDevolucion({ companyId: "company", devolucionId: "a", updatedById: "actor", cajasAccounting: accounting, prisma: db.prisma })
    expect(db.effects).toHaveLength(count)
    expect(db.items.get("item")!.returnedQuantity.eq(1)).toBe(true)
  })
  it("rolls back the document, quantity, audit and staged ledger on late accounting failure", async () => {
    const db = database(); db.pending("a", "1"); db.link(); db.failAccounting()
    await expect(confirmDevolucion({ companyId: "company", devolucionId: "a", updatedById: "actor", cajasAccounting: accounting, prisma: db.prisma })).rejects.toThrow("injected accounting failure")
    expect(db.documents.get("a")!.state).toBe("Pendiente")
    expect(db.parent.state).toBe("Entregado")
    expect(db.items.get("item")!.returnedQuantity.eq(0)).toBe(true)
    expect(db.effects).toHaveLength(0); expect(db.audits).toHaveLength(0)
  })
})

describe("R7 authenticated client → actual route/guard/service return receipt", () => {
  function transport(db: ReturnType<typeof database>) {
    Object.assign(mocks.prisma, db.prisma)
    mocks.auth.mockResolvedValue({ companyId: "company", actorUserId: "actor", canonicalRole: "admin", role: "admin" })
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => POST(new Request(`http://localhost${String(input)}`, init), { params: Promise.resolve({ companyId: "company", remitoId: "remito" }) })))
  }
  it("preserves exact quantity and same key through wire/replay and reports changed content409", async () => {
    const db = database("0.3"); transport(db)
    await registrarRemitoDevolucion("company", "remito", [{ itemId: "item", returnedQuantity: "0.1" }], "wire-key")
    await registrarRemitoDevolucion("company", "remito", [{ itemId: "item", returnedQuantity: "0.1" }], "wire-key")
    expect(db.documents.size).toBe(1)
    expect(db.items.get("item")!.returnedQuantity.eq("0.1")).toBe(true)
    await expect(registrarRemitoDevolucion("company", "remito", [{ itemId: "item", returnedQuantity: "0.2" }], "wire-key")).rejects.toMatchObject({ status: 409, code: "remito_return_replay_conflict" })
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]!.headers).get("Authorization")).toBe("Bearer token")
  })
  it.each(["", "x".repeat(129)])("rejects malformed command key before any transaction", async (key) => {
    const db = database(); transport(db)
    await expect(registrarRemitoDevolucion("company", "remito", [{ itemId: "item", returnedQuantity: "1" }], key)).rejects.toMatchObject({ status: 400, code: "invalid_remito_devolucion_body" })
    expect(db.prisma.$transaction).not.toHaveBeenCalled()
  })
  it("keeps actual role guard denial before return mutation", async () => {
    const db = database(); transport(db)
    mocks.auth.mockResolvedValueOnce({ companyId: "company", actorUserId: "viewer", canonicalRole: "viewer", role: "viewer" })
    await expect(registrarRemitoDevolucion("company", "remito", [{ itemId: "item", returnedQuantity: "1" }], "key")).rejects.toMatchObject({ status: 403 })
    expect(db.prisma.$transaction).not.toHaveBeenCalled()
  })
})
