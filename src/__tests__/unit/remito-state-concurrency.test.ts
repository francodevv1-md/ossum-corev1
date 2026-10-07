import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma, type PrismaClient } from "@prisma/client"
import { updateRemitoState, type RemitoState } from "@/lib/services/remito.service"
import { createSeguimientoEntry } from "@/lib/services/seguimiento.service"
import { PATCH } from "@/app/api/companies/[companyId]/remitos/[remitoId]/state/route"

const mocks = vi.hoisted(() => ({ audit: vi.fn(), notification: vi.fn(), auth: vi.fn() }))
vi.mock("@/lib/audit", () => ({ createAuditEvent: mocks.audit }))
vi.mock("@/lib/services/internal-notifications.service", () => ({ emitCrossDomainNotification: mocks.notification, emitSeguimientoMentionNotifications: vi.fn() }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/api/guards", () => ({ requireCompanyMutationAccess: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ default: {} }))

const stamp = new Date("2026-10-07T12:00:00Z")
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}
type Where = Record<string, unknown>
type Row = Record<string, unknown> & { id: string; companyId: string; surgeryId: string; state: RemitoState; updatedAt: Date; deliveredAt: Date | null; returnedAt: Date | null }
// Predicates/projections are honored. Atomic updates run synchronously before resolving.
// This is a deterministic stale-read replay, not a PostgreSQL isolation simulator.
function database(state: RemitoState = "Emitido") {
  const row: Row = { id: "remito", companyId: "company", surgeryId: "surgery", state, updatedAt: stamp,
    deliveredAt: null, returnedAt: null, issuedAt: stamp, visibleNumber: 123, items: [{ id: "item", quantity: "2", returnedQuantity: "0" }],
    metadata: { cajas: { assignmentId: "assignment" } }, cajasDispatches: [{ id: "dispatch" }] }
  let exists = true
  let afterRead: (() => Promise<void>) | undefined
  const matches = (where: Where) => exists && Object.entries(where).every(([key, value]) => value === undefined ||
    (value instanceof Date ? (row[key] as Date)?.getTime() === value.getTime() : row[key] === value))
  const project = (select?: Record<string, unknown>) => select ? Object.fromEntries(Object.keys(select).map(key => [key, row[key]])) : { ...row }
  const remito = {
    findFirst: vi.fn(async ({ where, select }: { where: Where; select?: Record<string, unknown> }) => {
      const snapshot = matches(where) ? project(select) : null
      const wait = afterRead; afterRead = undefined
      if (wait) await wait()
      return snapshot
    }),
    update: vi.fn(async ({ where, data, select }: { where: Where; data: Record<string, unknown>; select?: Record<string, unknown> }) => {
      if (!matches(where)) throw new Prisma.PrismaClientKnownRequestError("No matching record", { code: "P2025", clientVersion: "7" })
      Object.assign(row, data, { updatedAt: new Date(row.updatedAt.getTime() + 1) })
      return project(select)
    }),
  }
  const entryCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: "entry", createdAt: stamp, updatedAt: stamp, author: { firstName: "Test", lastName: "Actor" } }))
  const tx = { remito, seguimientoEntry: { create: entryCreate } }
  const db = { ...tx, $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) }
  return { row, remito, entryCreate, db, prisma: db as unknown as PrismaClient,
    pauseNextRead() { const seen = deferred(), resume = deferred(); afterRead = async () => { seen.resolve(); await resume.promise }; return { seen: seen.promise, resume: resume.resolve } },
    remove() { exists = false },
  }
}
const change = (prisma: PrismaClient, newState: string) => updateRemitoState({ companyId: "company", remitoId: "remito", newState, updatedById: "actor", prisma })
const delivery = (prisma: PrismaClient) => createSeguimientoEntry(prisma, { companyId: "company", surgeryId: "surgery", authorId: "tracking-actor",
  entryType: "logistics_delivery", content: "Delivery confirmation", evidenceRef: { remitoId: "remito", actualDate: "2026-10-07T13:00:00Z" } })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.audit.mockResolvedValue(undefined)
  mocks.notification.mockResolvedValue(undefined)
  mocks.auth.mockResolvedValue({ companyId: "company", actorUserId: "actor", role: "logistica" })
})

describe("R5 generic state authority and stale reads", () => {
  it.each([["Entregado", "Anulado"], ["Anulado", "Entregado"], ["Entregado", "Entregado"], ["En_transito", "Entregado"]])("rejects stale %s after a competing %s commits", async (staleState, winnerState) => {
    const db = database(), paused = db.pauseNextRead()
    const stale = change(db.prisma, staleState)
    const rejected = expect(stale).rejects.toMatchObject({ status: 409, code: "remito_state_conflict" })
    await paused.seen
    await change(db.prisma, winnerState)
    paused.resume()
    await rejected
    expect(db.row.state).toBe(winnerState)
    expect(mocks.audit).toHaveBeenCalledTimes(1)
    expect(mocks.notification).toHaveBeenCalledTimes(1)
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ userId: "actor", oldValue: { state: "Emitido" }, newValue: { state: winnerState } }))
  })
  it("rejects a version change even if state stays the same", async () => {
    const db = database(), paused = db.pauseNextRead()
    const pending = change(db.prisma, "Anulado")
    const rejected = expect(pending).rejects.toMatchObject({ status: 409, code: "remito_state_conflict" })
    await paused.seen
    db.row.updatedAt = new Date(stamp.getTime() + 100)
    paused.resume(); await rejected
    expect(db.row.state).toBe("Emitido")
    expect(mocks.audit).not.toHaveBeenCalled()
  })
  it("maps disappearance between read and write to conflict, not internal error", async () => {
    const db = database(), paused = db.pauseNextRead()
    const pending = change(db.prisma, "Anulado")
    const rejected = expect(pending).rejects.toMatchObject({ status: 409, code: "remito_state_conflict" })
    await paused.seen; db.remove(); paused.resume(); await rejected
    expect(mocks.audit).not.toHaveBeenCalled()
  })
  it.each(["Borrador", "Emitido", "En_transito", "Entregado", "Parcialmente_devuelto"] as const)("preserves viable cancellation from %s even with Cajas linkage/evidence", async (state) => {
    const db = database(state), originalItems = db.row.items, originalMetadata = db.row.metadata
    const result = await change(db.prisma, "Anulado")
    expect(result).toMatchObject({ state: "Anulado", updatedById: "actor", items: originalItems })
    expect(db.row.items).toEqual(originalItems)
    expect(db.row.metadata).toEqual(originalMetadata)
    expect(db.remito.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "remito", companyId: "company", state, updatedAt: stamp } }))
  })
  it.each([["En_transito", "Parcialmente_devuelto"], ["Entregado", "Parcialmente_devuelto"], ["Entregado", "Devuelto"], ["Parcialmente_devuelto", "Devuelto"]] as const)("rejects generic %s → %s without confirmed return accounting", async (state, target) => {
    const db = database(state)
    await expect(change(db.prisma, target)).rejects.toMatchObject({ status: 409, code: "remito_return_requires_devolucion" })
    expect(db.row.state).toBe(state)
    expect(db.remito.update).not.toHaveBeenCalled()
    expect(mocks.audit).not.toHaveBeenCalled()
  })
  it.each(["Devuelto", "Anulado"] as const)("preserves terminal %s guard", async (state) => {
    const db = database(state)
    await expect(change(db.prisma, "Entregado")).rejects.toMatchObject({ status: 409, code: "invalid_remito_transition" })
    expect(db.remito.update).not.toHaveBeenCalled()
  })
  it("does not remap unexpected write errors or audit failures to state conflicts", async () => {
    const db = database()
    const error = new Error("write failed")
    db.remito.update.mockRejectedValueOnce(error)
    await expect(change(db.prisma, "Entregado")).rejects.toBe(error)
    expect(mocks.audit).not.toHaveBeenCalled()
    const auditError = new Prisma.PrismaClientKnownRequestError("Audit foreign key", { code: "P2025", clientVersion: "7" })
    mocks.audit.mockRejectedValueOnce(auditError)
    await expect(change(db.prisma, "Entregado")).rejects.toBe(auditError)
    // This double deliberately does not simulate rollback: real transaction rollback is not certified here.
  })
  it("serializes a confirmed stale state claim as HTTP409 with its domain code", async () => {
    const db = database(), paused = db.pauseNextRead()
    const realPrisma = (await import("@/lib/prisma")).default
    Object.assign(realPrisma, db.db)
    const response = PATCH(new Request("http://localhost/state", { method: "PATCH", body: JSON.stringify({ state: "Entregado" }) }),
      { params: Promise.resolve({ companyId: "company", remitoId: "remito" }) })
    await paused.seen
    await change(db.prisma, "Anulado")
    paused.resume()
    const result = await response
    expect(result.status).toBe(409)
    expect((await result.json()).error.code).toBe("remito_state_conflict")
  })
})

describe("R5 Seguimiento sibling delivery state writer", () => {
  it.each(["Anulado", "Devuelto", "Parcialmente_devuelto"] as const)("does not resurrect %s after observing an issued Remito", async (competingState) => {
    const db = database(), paused = db.pauseNextRead()
    const pending = delivery(db.prisma)
    const rejected = expect(pending).rejects.toMatchObject({ status: 409, code: "remito_state_conflict" })
    await paused.seen
    db.row.state = competingState; db.row.updatedAt = new Date(stamp.getTime() + 1)
    paused.resume(); await rejected
    expect(db.row.state).toBe(competingState)
    expect(db.entryCreate).not.toHaveBeenCalled()
    expect(mocks.audit).not.toHaveBeenCalled()
  })
  it("rejects duplicate concurrent delivery without duplicate entry/audit", async () => {
    const db = database(), paused = db.pauseNextRead()
    const pending = delivery(db.prisma)
    const rejected = expect(pending).rejects.toMatchObject({ status: 409, code: "remito_state_conflict" })
    await paused.seen
    await delivery(db.prisma)
    paused.resume(); await rejected
    expect(db.row.state).toBe("Entregado")
    expect(db.entryCreate).toHaveBeenCalledTimes(1)
    expect(mocks.audit).toHaveBeenCalledTimes(1)
  })
  it("scopes the accepted write to company/surgery/state/version and retains delivery evidence", async () => {
    const db = database("En_transito")
    const result = await delivery(db.prisma)
    expect(result.id).toBe("entry")
    expect(db.remito.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "remito", companyId: "company", surgeryId: "surgery", state: "En_transito", updatedAt: stamp } }))
    expect(db.row.deliveredAt).toEqual(new Date("2026-10-07T13:00:00Z"))
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ userId: "tracking-actor", oldValue: { state: "En_transito" } }))
  })
})
