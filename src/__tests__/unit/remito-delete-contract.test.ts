import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma, type PrismaClient } from "@prisma/client"
import { deleteRemito } from "@/lib/services/remito.service"
import { DELETE } from "@/app/api/companies/[companyId]/remitos/[remitoId]/route"
import { apiFetch, ApiClientError } from "@/lib/api/client"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), token: vi.fn(), prisma: {} }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: mocks.token }))
vi.mock("@/lib/prisma", () => ({ default: mocks.prisma }))
// Actual guards, service, audit helper, response and client are exercised.
const stamp = new Date("2026-10-07T12:00:00Z")
type Item = { id: string; companyId: string; remitoId: string; consumoItems: unknown[]; devolucionItems: unknown[]; cajasDispatchLines: unknown[] }
function db() {
  let parent: Record<string, unknown> | null = { id: "remito", companyId: "company", state: "Borrador", updatedAt: stamp, createdById: "creator", visibleNumber: null }
  let items: Item[] = ["one", "two"].map(id => ({ id, companyId: "company", remitoId: "remito", consumoItems: [], devolucionItems: [], cajasDispatchLines: [] }))
  items.push({ id: "foreign", companyId: "other", remitoId: "other-remito", consumoItems: [], devolucionItems: [], cajasDispatchLines: [] })
  let parentReference = false
  let audit: unknown[] = []
  const matches = (record: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && "none" in value) return Array.isArray(record[key]) && record[key].length === 0
    return value === undefined || (value instanceof Date ? (record[key] as Date)?.getTime() === value.getTime() : record[key] === value)
  })
  const known = (code: string) => new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: "7" })
  const remito = {
    findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => parent && matches(parent, where) ? { ...parent } : null),
    findUnique: vi.fn(async () => parent && { ...parent }),
    updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      if (!parent || !matches(parent, where)) return { count: 0 }
      Object.assign(parent, data, { updatedAt: new Date((parent.updatedAt as Date).getTime() + 1) })
      return { count: 1 }
    }),
    delete: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (!parent || !matches(parent, where)) throw known("P2025")
      if (parentReference || items.some(item => item.remitoId === parent!.id && item.companyId === parent!.companyId)) throw known("P2003")
      const result = parent; parent = null; return result
    }),
  }
  const remitoItem = { deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
    const selected = items.filter(item => matches(item, where))
    if (selected.some(item => item.cajasDispatchLines.length)) throw known("P2003")
    // Optional consumption/return FKs default to SetNull; removing these lines would lose evidence.
    items = items.filter(item => !selected.includes(item))
    return { count: selected.length }
  }) }
  const auditEvent = { create: vi.fn(async ({ data }: { data: unknown }) => { audit.push(data); return data }) }
  const tx = { remito, remitoItem, auditEvent }
  const prisma = { ...tx, $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
    const snapshot = { parent: parent && { ...parent }, items: [...items], audit: [...audit] }
    try { return await callback(tx) }
    catch (error) { parent = snapshot.parent; items = snapshot.items; audit = snapshot.audit; throw error }
  }) }
  return { prisma: prisma as unknown as PrismaClient, remito, remitoItem, auditEvent,
    get parent() { return parent }, get items() { return items }, get audit() { return audit },
    parentReference() { parentReference = true },
    erase() { parent = null },
  }
}
const remove = (database: ReturnType<typeof db>, extra: Record<string, unknown> = {}) => deleteRemito({ companyId: "company", remitoId: "remito", deletedById: "deleter", prisma: database.prisma, ...extra })
const http = (body?: string) => apiFetch<{ id: string; deleted: boolean }>("/api/companies/company/remitos/remito", { method: "DELETE", ...(body ? { body } : {}) })
function transport(database: ReturnType<typeof db>) {
  Object.assign(mocks.prisma, database.prisma)
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => DELETE(new Request(`http://localhost${String(url)}`, init),
    { params: Promise.resolve({ companyId: "company", remitoId: "remito" }) })))
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.token.mockResolvedValue("token")
  mocks.auth.mockResolvedValue({ companyId: "company", actorUserId: "deleter", role: "admin", canonicalRole: "admin" })
})
afterEach(() => vi.unstubAllGlobals())

describe("R6 atomic draft deletion contract", () => {
  it("deletes owned lines before the Restrict parent, keeps foreign rows and audits actual deleter", async () => {
    const database = db()
    await expect(remove(database)).resolves.toEqual({ id: "remito", deleted: true })
    expect(database.parent).toBeNull()
    expect(database.items.map(item => item.id)).toEqual(["foreign"])
    expect(database.audit).toEqual([expect.objectContaining({ userId: "deleter", action: "remito.deleted", oldValue: { id: "remito", state: "Borrador" }, newValue: undefined })])
    expect(database.remito.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "remito", companyId: "company", state: "Borrador", updatedAt: stamp } }))
  })
  it("audits deleting actor even when the original creator is absent", async () => {
    const database = db(); database.parent!.createdById = null
    await remove(database)
    expect(database.audit).toEqual([expect.objectContaining({ userId: "deleter" })])
  })
  it.each([undefined, "", " "])("rejects missing deleting actor %j before any write", async (deletedById) => {
    const database = db()
    await expect(remove(database, { deletedById })).rejects.toMatchObject({ status: 400, code: "remito_delete_actor_required" })
    expect(database.remito.delete).not.toHaveBeenCalled()
    expect(database.remitoItem.deleteMany).not.toHaveBeenCalled()
  })
  it.each(["Emitido", "En_transito", "Entregado", "Parcialmente_devuelto", "Devuelto", "Anulado"])("never deletes %s", async (state) => {
    const database = db(); database.parent!.state = state
    await expect(remove(database)).rejects.toMatchObject({ status: 409, code: "remito_not_deletable" })
    expect(database.remitoItem.deleteMany).not.toHaveBeenCalled()
  })
  it.each(["Emitido", "Anulado", "Borrador", "deleted"])("protects children when %s wins after pre-read", async (winner) => {
    const database = db(), snapshot = { ...database.parent }
    database.remito.findFirst.mockImplementationOnce(async () => {
      if (winner === "deleted") database.erase()
      else Object.assign(database.parent!, { state: winner, updatedAt: new Date(stamp.getTime() + 10) })
      return snapshot
    })
    await expect(remove(database)).rejects.toMatchObject({ status: 409, code: "remito_delete_conflict" })
    expect(database.remitoItem.deleteMany).not.toHaveBeenCalled()
    expect(database.remito.delete).not.toHaveBeenCalled()
    expect(database.audit).toHaveLength(0)
    expect(database.parent?.state).toBe(winner === "deleted" ? undefined : winner)
  })
  it.each(["consumoItems", "devolucionItems", "cajasDispatchLines"] as const)("preserves item %s reference instead of detaching it", async (reference) => {
    const database = db(); database.items[0][reference].push({ id: "reference" })
    const original = [...database.items]
    await expect(remove(database)).rejects.toMatchObject({ status: 409, code: "remito_delete_dependencies" })
    expect(database.items).toEqual(original)
    expect(database.parent?.state).toBe("Borrador")
    expect(database.audit).toHaveLength(0)
  })
  it("rolls back line deletion and claim when the parent has a Restrict document reference", async () => {
    const database = db(); database.parentReference()
    const original = [...database.items]
    await expect(remove(database)).rejects.toMatchObject({ status: 409, code: "remito_delete_dependencies" })
    expect(database.items).toEqual(original)
    expect(database.parent?.updatedAt).toEqual(stamp)
    expect(database.audit).toHaveLength(0)
  })
  it("rolls back both deletions on audit failure without misclassifying it as dependencies", async () => {
    const database = db(), failure = new Prisma.PrismaClientKnownRequestError("Audit failed", { code: "P2003", clientVersion: "7" })
    database.auditEvent.create.mockRejectedValueOnce(failure)
    await expect(remove(database)).rejects.toBe(failure)
    expect(database.parent?.state).toBe("Borrador")
    expect(database.items).toHaveLength(3)
    expect(database.audit).toHaveLength(0)
  })
  it("keeps tenant mismatch as404 without touching foreign children", async () => {
    const database = db()
    await expect(remove(database, { companyId: "other" })).rejects.toMatchObject({ status: 404, code: "remito_not_found" })
    expect(database.remitoItem.deleteMany).not.toHaveBeenCalled()
  })
})

describe("R6 real client → DELETE route/guard → service/audit transaction", () => {
  it("returns explicit JSON200 confirmation with authenticated actor, ignoring spoofed body", async () => {
    const database = db(); transport(database)
    await expect(http(JSON.stringify({ deletedById: "attacker", companyId: "other" }))).resolves.toEqual({ id: "remito", deleted: true })
    expect(database.audit).toEqual([expect.objectContaining({ userId: "deleter", companyId: "company" })])
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer token")
  })
  it("rejects unauthorized canonical role before service mutation", async () => {
    const database = db(); transport(database)
    mocks.auth.mockResolvedValueOnce({ companyId: "company", actorUserId: "viewer", role: "viewer", canonicalRole: "viewer" })
    await expect(http()).rejects.toMatchObject({ status: 403, code: "company_mutation_access_denied" })
    expect(database.remito.findFirst).not.toHaveBeenCalled()
  })
  it("preserves dependency conflict status/code through API client", async () => {
    const database = db(); database.parentReference(); transport(database)
    await expect(http()).rejects.toBeInstanceOf(ApiClientError)
    await expect(http()).rejects.toMatchObject({ status: 409, code: "remito_delete_dependencies" })
    expect(database.items).toHaveLength(3)
  })
  it("reports already-deleted draft as404 without a second audit", async () => {
    const database = db(); transport(database)
    await http()
    await expect(http()).rejects.toMatchObject({ status: 404, code: "remito_not_found" })
    expect(database.audit).toHaveLength(1)
  })
})
