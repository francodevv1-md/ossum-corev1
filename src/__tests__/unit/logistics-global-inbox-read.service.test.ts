/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"
import { getLogisticsGlobalInbox } from "@/lib/services/logistics-global-inbox-read.service"
import { validateLogisticsGlobalInboxQuery } from "@/lib/validators/logistics-global-inbox-read"

const D = (value: string | number) => new Prisma.Decimal(value)
const query = (value = "") => validateLogisticsGlobalInboxQuery(new URL(`http://test?${value}`).searchParams)
const sqlText = (statement: Prisma.Sql) => statement.strings.join("?")
function db(page: any[] = [{ id: "s1", exception: 1, urgent: 1, nextAction: 0, eventAt: 2, date: 1 }, { id: "s2", exception: 0, urgent: 0, nextAction: 0, eventAt: 1, date: 1 }]) {
  let rawCall = 0
  return {
    $queryRaw: vi.fn(async () => ++rawCall % 2 ? page : [{ news: 0, urgent: 1, exceptions: 2 }]),
    surgery: { findMany: vi.fn(async ({ where }: any) => where.companyId === "c1" ? [{ id: "s1", visibleNumber: "CX-1", cxStatus: "scheduled", prepStatus: "ready", priority: "urgent", surgeryDate: new Date("2026-02-02"), patient: { firstName: "Ana" }, doctor: null, payer: null, institution: { id: "institution-1", legalName: "Hospital", addresses: [{ city: "Rosario" }] } }, { id: "s2", visibleNumber: "CX-2", cxStatus: "pending", prepStatus: "draft", priority: null, surgeryDate: new Date("2026-02-01"), patient: { firstName: "Beto" }, doctor: null, payer: null, institution: null }].filter((surgery) => where.id.in.includes(surgery.id)) : []) },
    remito: { findMany: vi.fn(async () => [{ surgeryId: "s1", state: "En_transito", updatedAt: new Date("2026-02-03") }, { surgeryId: "s1", state: "Entregado", updatedAt: new Date("2026-02-04") }]) },
    cajasAssignment: { findMany: vi.fn(async () => [{ id: "a1", surgeryId: "s1", boxIdentifiedUnit: { currentConfiguration: { internalCode: "CAJA-1" } }, preparations: [{ lines: [{ role: "EXPECTED", quantity: D(2) }] }] }]) },
    cajasReservationCorrelation: { findMany: vi.fn(async () => [{ assignmentId: "a1", quantity: D(2), followingCorrelations: [], stockReservationEvidence: { kind: "RESERVE" }, stockReservation: { projection: { status: "ACTIVE", activeQuantity: D(2) } } }]) },
    cajasDispatchLine: { findMany: vi.fn(async () => [{ id: "d1", dispatchId: "dispatch-1", assignmentId: "a1", quantity: D(2) }]) },
    cajasPhaseDOperation: { findMany: vi.fn(async () => [{ surgeryId: "s1", dispatchId: "dispatch-1", dispatchLineId: "d1", kind: "CONSUMPTION", quantity: D(1), acceptedAt: new Date("2026-02-05") }]) },
    cajasDifference: { findMany: vi.fn(async () => [{ assignmentId: "a1", resolutions: [] }]) },
    cajasPhaseDActionGrant: { findMany: vi.fn(async () => [{ action: "REGISTER_RETURN" }]) },
    cajasPhaseDReconciliationEvent: { findMany: vi.fn(async () => []) },
  }
}

describe("global logistics inbox raw CTE projection", () => {
  it("uses only parameterized queryRaw CTEs, repeats tenant scope for page/count, and hydrates bounded IDs", async () => {
    const client: any = db()
    const result = await getLogisticsGlobalInbox(client, "c1", { actorUserId: "u1", role: "operator" }, query("stage=dispatch&priority=urgent&q=Ana"))
    expect(client.$queryRaw).toHaveBeenCalledTimes(2)
    const [pageSql, countSql] = client.$queryRaw.mock.calls.map(([statement]: [Prisma.Sql]) => sqlText(statement))
    for (const text of [pageSql, countSql]) {
      expect(text).toContain('s."companyId" = ?')
      expect(text).toContain("facts AS")
      expect(text).toContain("candidate AS")
      expect(text).toContain("has_dispatch = true")
      expect(text).toContain('f."priority" = ?')
    }
    expect(pageSql).toContain("LIMIT ?")
    expect(countSql).not.toContain("LIMIT ?")
    expect(client.surgery.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "c1", id: { in: ["s1", "s2"] }, archivedAt: null } }))
    expect(result.items[0]).toMatchObject({ surgery: { id: "s1", institutionId: "institution-1", surgeryStatus: "scheduled", preparationStatus: "ready", logisticsStatus: "mixed", locality: "Rosario" }, logistics: { quantities: { dispatched: "2", consumed: "1", pending: "1" } } })
    expect(result.items[1].surgery).toMatchObject({ institutionId: null, logisticsStatus: "unavailable" })
    expect(result.counts).toEqual({ news: 0, urgent: 1, overdue: null, exceptions: 2 })
    for (const repository of Object.values(client) as any[]) for (const method of ["create", "update", "delete", "$executeRaw", "$queryRawUnsafe", "$executeRawUnsafe", "$transaction"]) expect(repository[method]).toBeUndefined()
  })

  it("applies cursor keyset ordering in PostgreSQL and returns a stable next cursor", async () => {
    const client: any = db([{ id: "s1", exception: 1, urgent: 1, nextAction: 0, eventAt: 2, date: 1 }, { id: "s2", exception: 0, urgent: 0, nextAction: 0, eventAt: 1, date: 1 }])
    const first = await getLogisticsGlobalInbox(client, "c1", { actorUserId: "u1", role: "viewer" }, query("limit=1"))
    expect(first.page).toMatchObject({ hasMore: true, nextCursor: expect.any(String) })
    const secondClient: any = db([{ id: "s2", exception: 0, urgent: 0, nextAction: 0, eventAt: 1, date: 1 }])
    await getLogisticsGlobalInbox(secondClient, "c1", { actorUserId: "u1", role: "viewer" }, query(`limit=1&cursor=${first.page.nextCursor}`))
    const pageSql = sqlText(secondClient.$queryRaw.mock.calls[0][0])
    expect(pageSql).toContain("c.exception_count < ?")
    expect(pageSql).toContain("c.id > ?")
    expect(() => query("overdue=true")).toThrow(/overdue/i)
    expect(() => query("stage=bad")).toThrow(/stage/i)
  })

  it("keeps no-remito rows and separate status dimensions without a novelty or next actions", async () => {
    const client: any = db()
    const result = await getLogisticsGlobalInbox(client, "c1", { actorUserId: "u1", role: "viewer" }, query("news=false"))
    expect(result.items[0].logistics).toMatchObject({ lastNovelty: null, nextAction: null })
    expect(result.items[1].surgery).toMatchObject({ surgeryStatus: "pending", preparationStatus: "draft", logisticsStatus: "unavailable" })
    const pageSql = sqlText(client.$queryRaw.mock.calls[0][0])
    expect(pageSql).toContain("f.has_news = ?")
  })

  it("keeps the navigation ID aligned when a candidate surgery is no longer hydrated", async () => {
    const client: any = db()
    client.surgery.findMany.mockResolvedValueOnce([{ id: "s2", visibleNumber: "CX-2", cxStatus: "pending", prepStatus: "draft", priority: null, surgeryDate: new Date("2026-02-01"), patient: { firstName: "Beto" }, doctor: null, payer: null, institution: null }])
    const result = await getLogisticsGlobalInbox(client, "c1", { actorUserId: "u1", role: "viewer" }, query())
    expect(result.items).toHaveLength(1)
    expect(result.items[0].surgery.id).toBe("s2")
  })

  it("projects the latest allowed novelty and its closed translation without leaking event data", async () => {
    const client: any = db([{ id: "s1", exception: 1, urgent: 1, nextAction: 0, eventAt: 20, date: 1, lastNoveltyLabel: "Material recibido", lastNoveltyAt: new Date("2026-02-06T10:00:00.000Z"), lastNoveltyResponsible: "Ana Operadora" }])
    const result = await getLogisticsGlobalInbox(client, "c1", { actorUserId: "u1", role: "viewer" }, query())
    expect(result.items[0].logistics.lastNovelty).toEqual({ label: "Material recibido", at: "2026-02-06T10:00:00.000Z", responsible: "Ana Operadora" })
    expect(Object.keys(result.items[0].logistics.lastNovelty!)).toEqual(["label", "at", "responsible"])
  })

  it("keeps temporal ordering, B/C/D tie priority, duplicate-operation dedupe, and news filter/count in the shared CTE", async () => {
    const client: any = db()
    await getLogisticsGlobalInbox(client, "c1", { actorUserId: "u1", role: "viewer" }, query("news=true"))
    const [pageSql, countSql] = client.$queryRaw.mock.calls.map(([statement]: [Prisma.Sql]) => sqlText(statement))
    for (const text of [pageSql, countSql]) {
      expect(text).toContain("WITH news_events AS")
      expect(text).toContain("DISTINCT ON (surgery_id, operation_key)")
      expect(text).toContain("ORDER BY surgery_id, operation_key, source_priority ASC, occurred_at DESC")
      expect(text).toContain("ORDER BY surgery_id, occurred_at DESC, source_priority ASC")
      expect(text).toContain("'Remito en tránsito'")
      expect(text).toContain("'Preparación actualizada'")
      expect(text).toContain("'Caja controlada'")
      expect(text).toContain("'Despacho emitido'")
      expect(text).toContain("'Material recibido'")
      expect(text).toContain("'Conciliación cerrada'")
      expect(text).toContain("f.has_news = ?")
    }
    expect(countSql).toContain("count(*) FILTER (WHERE has_news) AS news")
  })

  it("validates normalized institution, locality, logistics status, and blocker filters in the shared tenant-scoped candidate CTE", async () => {
    expect(query("institutionId= institution-1 &locality=%20ROSARIO%20&logisticsStatus=unavailable&hasBlockers=true")).toMatchObject({ institutionId: "institution-1", locality: "rosario", logisticsStatus: "unavailable", hasBlockers: true })
    expect(query("logisticsStatus=mixed&hasBlockers=false")).toMatchObject({ logisticsStatus: "mixed", hasBlockers: false })
    expect(() => query("logisticsStatus=scheduled")).toThrow(/logisticsStatus/i)
    expect(() => query("hasBlockers=yes")).toThrow(/hasBlockers/i)

    for (const [filter, predicate] of [
      ["institutionId=institution-1", 's."institutionId" = ?'],
      ["locality=Rosario", 'LOWER(BTRIM(institution_address.city)) = ?'],
      ["logisticsStatus=unavailable", "f.remito_count = 0"],
      ["logisticsStatus=mixed", "f.remito_state_count > 1"],
      ["logisticsStatus=Entregado", "f.remito_state_count = 1 AND f.remito_state = ?"],
      ["hasBlockers=true", "f.has_blockers = ?"],
    ]) {
      const client: any = db()
      await getLogisticsGlobalInbox(client, "c1", { actorUserId: "u1", role: "viewer" }, query(filter))
      for (const [statement] of client.$queryRaw.mock.calls) {
        expect(sqlText(statement)).toContain(predicate)
        if (filter.startsWith("institutionId=")) expect(statement.values).toContain("institution-1")
      }
    }

    const client: any = db()
    const filters = "institutionId=institution-1&locality=Rosario&logisticsStatus=mixed&hasBlockers=true&limit=1"
    const first = await getLogisticsGlobalInbox(client, "c1", { actorUserId: "u1", role: "viewer" }, query(filters))
    const [pageSql, countSql] = client.$queryRaw.mock.calls.map(([statement]: [Prisma.Sql]) => sqlText(statement))
    for (const text of [pageSql, countSql]) {
      expect(text).toContain('s."companyId" = ?')
      expect(text).toContain('s."institutionId" = ?')
      expect(text).toContain('LOWER(BTRIM(institution_address.city)) = ?')
      expect(text).toContain("f.remito_state_count > 1")
      expect(text).toContain("f.has_blockers = ?")
    }
    expect(first.counts).toEqual({ news: 0, urgent: 1, overdue: null, exceptions: 2 })

    const nextClient: any = db([{ id: "s2", exception: 0, urgent: 0, nextAction: 0, eventAt: 1, date: 1 }])
    await getLogisticsGlobalInbox(nextClient, "c1", { actorUserId: "u1", role: "viewer" }, query(`${filters}&cursor=${first.page.nextCursor}`))
    const nextSql = sqlText(nextClient.$queryRaw.mock.calls[0][0])
    expect(nextSql).toContain("c.exception_count < ?")
    expect(nextSql).toContain("f.remito_state_count > 1")
  })

  it("keeps institution-ID filtering and relation hydration in the authenticated company scope", async () => {
    const client: any = db()
    const result = await getLogisticsGlobalInbox(client, "c2", { actorUserId: "u1", role: "viewer" }, query("institutionId=institution-1"))
    expect(result.items).toEqual([])
    expect(client.surgery.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "c2", id: { in: ["s1", "s2"] }, archivedAt: null } }))
    for (const [statement] of client.$queryRaw.mock.calls) {
      expect(sqlText(statement)).toContain('s."companyId" = ?')
      expect(sqlText(statement)).toContain('s."institutionId" = ?')
      expect(statement.values).toEqual(expect.arrayContaining(["c2", "institution-1"]))
    }
  })
})
