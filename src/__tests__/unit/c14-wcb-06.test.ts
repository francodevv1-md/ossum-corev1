import { describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { C14RuntimeError, type Wcb06Command } from "@/lib/services/c14/bundles/private-writer-runtime"
import { execute } from "@/lib/services/c14/bundles/wcb-06"
import { computeCompletePayloadSha256, validate } from "@/lib/validators/c14/bundles/wcb-06"
import { authorize, WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer"

const now = new Date("2026-08-13T12:00:00.000Z")
const command = () => { const input = ({
  companyId: "co1", commandId: "cmd1", actorId: "u1", resultEntityId: "dispatch1", completePayloadSha256: "a".repeat(64),
  authorizationProof: { bundleId: "WCB-06", companyId: "co1", actorId: "u1", contractIds: ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"], authorizationProofSha256: "b".repeat(64) }, anchorIdentifiedUnitIds: ["unit1"],
  stockEvidenceHeader: { id: "stock1", kind: "DISPATCH", recordKind: "ORIGINAL", sourceDomain: "CAJAS", sourceEntityType: "CAJAS_DISPATCH", sourceEntityId: "dispatch1", sourceCheckpoint: "DISPATCH", activationBoundaryId: null, correctsEvidenceId: null, reversesEvidenceId: null, cause: null },
  stockEvidenceLines: [{ id: "stock-line1", evidenceId: "stock1", lineNumber: 1, articleId: "article1", fromPositionId: "position1", toPositionId: null, reservationId: "reservation1", quantity: "2.0000", stockUnit: "UNIT", scaleSnapshot: 0, lotCodeSnapshot: null, expirationDateSnapshot: null, serialNumberSnapshot: null, identifiedCodeSnapshot: null, sourceLineId: "item1", traceSnapshot: { schemaVersion: "C14-TRACE-SNAPSHOT-V1", mode: "NONE" } }],
  reservationEvidence: { id: "reservation-event1", reservationId: "reservation1", sequence: 2, kind: "APPLY_TO_DISPATCH", quantity: "2.0000", stockUnit: "UNIT", scaleSnapshot: 0, replacesEvidenceId: null, cause: null },
  dispatchHeader: { id: "dispatch1", assignmentId: "assignment1", remitoId: "remito1", sourceControlId: "control1", sequence: 1, recordKind: "ORIGINAL", correctsDispatchId: null, cause: null },
  dispatchLines: [{ id: "dispatch-line1", dispatchId: "dispatch1", assignmentId: "assignment1", remitoId: "remito1", lineNumber: 1, recordKind: "ORIGINAL", accountingSign: 1, neutralizesDispatchLineId: null, remitoItemId: "item1", sourceControlLineId: "control-line1", sourcePreparationId: "prep1", sourcePreparationLineId: "prep-line1", articleId: "article1", stockPositionId: "position1", quantity: "2.0000", stockUnit: "UNIT", scaleSnapshot: 0, skuSnapshot: null, descriptionSnapshot: null, lotCodeSnapshot: null, expirationDateSnapshot: null, serialNumberSnapshot: null, identifiedCodeSnapshot: null, traceabilitySnapshot: { schemaVersion: "C14-TRACE-SNAPSHOT-V1", mode: "NONE" }, stockEvidenceLineId: "stock-line1" }], reservationEffect: { id: "effect1", stockReservationEvidenceId: "reservation-event1" }, stockEffect: { id: "effect2", stockEvidenceId: "stock1" },
}) as Wcb06Command; input.completePayloadSha256 = computeCompletePayloadSha256(input); return input }
const rehash = (input: Wcb06Command) => { input.completePayloadSha256 = computeCompletePayloadSha256(input); return input }
const approved = async () => { const value = command(); value.authorizationProof = await authorize({ userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "m1", role: "admin", userId: "u1", companyId: "co1", isActive: true }) } } as never, { actorId: "u1", companyId: "co1", bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS }); return rehash(value) }
const attempt = () => Object.freeze({ attemptId: crypto.randomUUID(), semanticKeySha256: "c".repeat(64) })
const expectNoWriters = (tx: ReturnType<typeof mockTx>["tx"]) => {
  for (const writer of [tx.auditEvent.create, tx.operationalCommandAcceptance.create, tx.stockEvidence.create, tx.stockEvidenceLine.create, tx.stockReservationEvidence.create, tx.cajasDispatch.create, tx.cajasDispatchLine.create, tx.operationalCommandEffect.create]) expect(writer).not.toHaveBeenCalled()
}
function mockTx() { const order: string[] = [], create = (name: string) => vi.fn(async ({ data }) => { order.push(name); return data }), input = command(), acceptance: any = { id: "accepted1", auditEventId: "audit1", intentHash: "intent1", acceptedAt: now }, audit: any = { id: acceptance.auditEventId, companyId: "co1", userId: "u1", entityType: "CAJAS_DISPATCH", entityId: "dispatch1", action: "C14_COMMAND_ACCEPTED", detail: null, oldValue: null, newValue: {}, module: "STOCK_CAJAS_C14", metadata: { authorizationProofSha256: "b".repeat(64) }, createdAt: now }, evidence: any = { ...input.stockEvidenceHeader, companyId: "co1", acceptedAt: now, acceptedById: "u1", commandAcceptanceId: acceptance.id, auditEventId: acceptance.auditEventId, createdAt: now, lines: input.stockEvidenceLines.map(({ traceSnapshot: _, ...line }) => ({ ...line, companyId: "co1", createdAt: now })) }, reservation: any = { ...input.reservationEvidence, companyId: "co1", acceptedAt: now, acceptedById: "u1", commandAcceptanceId: acceptance.id, auditEventId: acceptance.auditEventId, createdAt: now }, dispatch: any = { ...input.dispatchHeader, companyId: "co1", acceptedAt: now, acceptedById: "u1", commandAcceptanceId: acceptance.id, createdAt: now, lines: input.dispatchLines.map(line => ({ ...line, companyId: "co1", createdAt: now })) }
  const tx: any = { $queryRawUnsafe: vi.fn(async (sql: string) => sql.includes("transaction_timestamp") ? [{ now }] : sql.includes("UserCompanyAccess") ? [{ id: "m1", role: "admin", userId: "u1", companyId: "co1", isActive: true }] : [{ id: "anchor" }]), $executeRawUnsafe: vi.fn(async () => { order.push("deferred") }), auditEvent: { create: vi.fn(async ({ data }) => { order.push("audit"); Object.assign(audit, data, { oldValue: null }); return data }), findUnique: vi.fn(async () => audit) }, operationalCommandAcceptance: { findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValue(acceptance), create: vi.fn(async ({ data }) => { order.push("acceptance"); Object.assign(acceptance, data); return data }) }, stockEvidence: { create: create("stock-header"), findUnique: vi.fn(async () => ({ ...evidence, commandAcceptanceId: acceptance.id, auditEventId: acceptance.auditEventId })) }, stockEvidenceLine: { create: create("stock-line") }, stockReservationEvidence: { create: create("reservation"), findUnique: vi.fn(async () => ({ ...reservation, commandAcceptanceId: acceptance.id, auditEventId: acceptance.auditEventId })) }, cajasDispatch: { create: create("dispatch"), findUnique: vi.fn(async () => ({ ...dispatch, commandAcceptanceId: acceptance.id })) }, cajasDispatchLine: { create: create("dispatch-line") }, operationalCommandEffect: { create: create("effect"), findMany: vi.fn(async () => [{ id: "effect1", companyId: "co1", commandAcceptanceId: acceptance.id, effectKey: "reservation-application", effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_RESERVATION_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: "dispatch1", stockEvidenceId: null, stockReservationEvidenceId: "reservation-event1", createdAt: now }, { id: "effect2", companyId: "co1", commandAcceptanceId: acceptance.id, effectKey: "dispatch-stock", effectType: "APPLY_TO_DISPATCH", targetKind: "STOCK_EVIDENCE", resultEntityType: "CAJAS_DISPATCH", resultEntityId: "dispatch1", stockEvidenceId: "stock1", stockReservationEvidenceId: null, createdAt: now }]) } }; return { tx, order } }
describe("WCB-06 CX08 CCT1 runtime", () => {
  it("rejects malformed payload shapes before property access or DML", async () => {
    for (const input of [null, {}, { authorizationProof: null }, { ...command(), stockEvidenceLines: null }, { ...command(), reservationEvidences: {} }]) {
      expect(() => validate(input)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" }))
    }
    const { tx } = mockTx()
    await expect(execute(tx, { ...command(), stockEvidenceLines: null } as never, attempt())).rejects.toMatchObject({ code: "C14_CX08_PAYLOAD_INVALID" })
    expectNoWriters(tx)
  })
  it("rejects closed input before DML", () => { const input = command(); Object.assign(input.stockEvidenceHeader, { acceptedAt: now }); expect(() => validate(input)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" })) })
  it("rejects duplicate reservation IDs before DML", async () => {
    const input: Wcb06Command = await approved(), duplicate = { ...input.reservationEvidence, id: "reservation-event2" }
    input.reservationEvidences = [input.reservationEvidence, duplicate]
    input.reservationEffects = [input.reservationEffect, { id: "effect3", stockReservationEvidenceId: duplicate.id }]
    const { tx } = mockTx()
    await expect(execute(tx, input, attempt())).rejects.toMatchObject({ code: "C14_CX08_PAYLOAD_INVALID" })
    expectNoWriters(tx)
  })
  it("rejects disallowed payload fields and invalid fixed-scale decimals", () => {
    const extra = command(); Object.assign(extra.stockEvidenceHeader, { injected: true })
    expect(() => validate(extra)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" }))
    for (const quantity of ["2.00001", "900719925474.0992"]) {
      const input = command(); input.stockEvidenceLines[0].quantity = quantity; input.dispatchLines[0].quantity = quantity; input.reservationEvidence.quantity = quantity
      expect(() => validate(input)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" }))
    }
    const scaleMismatch = command(); scaleMismatch.reservationEvidence.scaleSnapshot = 1
    expect(() => validate(scaleMismatch)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" }))
    for (const mutate of [
      (input: ReturnType<typeof command>) => { input.reservationEvidence.stockUnit = "BOX" },
      (input: ReturnType<typeof command>) => { input.stockEvidenceLines[0].scaleSnapshot = 1; input.dispatchLines[0].scaleSnapshot = 1 },
    ]) { const input = command(); mutate(input); expect(() => validate(input)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" })) }
  })
  it("rejects a supplied hash mismatch, unsafe snapshots, invalid evidence source, and foreign dispatch lineage", () => {
    const mismatch = command(); mismatch.completePayloadSha256 = "0".repeat(64)
    expect(() => validate(mismatch)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" }))
    const cyclic = command(); (cyclic.dispatchLines[0].traceabilitySnapshot as Record<string, unknown>).self = cyclic.dispatchLines[0].traceabilitySnapshot
    expect(() => validate(cyclic)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" }))
    const source = command(); source.stockEvidenceHeader.sourceEntityId = "foreign-dispatch"; rehash(source)
    expect(() => validate(source)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" }))
    const lineage = command(); lineage.dispatchLines[0].remitoId = "foreign-remito"; rehash(lineage)
    expect(() => validate(lineage)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" }))
  })
  it("requires the explicit C14 trace snapshot schema before hashing or persistence", () => {
    for (const snapshot of [{ mode: "NONE" }, { schemaVersion: "C14-TRACE-SNAPSHOT-V2", mode: "NONE" }, { schemaVersion: "C14-TRACE-SNAPSHOT-V1", mode: "SERIAL" }, { schemaVersion: "C14-TRACE-SNAPSHOT-V1", mode: "NONE", injected: true }]) {
      const input = command(); input.stockEvidenceLines[0].traceSnapshot = snapshot; input.dispatchLines[0].traceabilitySnapshot = structuredClone(snapshot); rehash(input)
      expect(() => validate(input)).toThrowError(expect.objectContaining({ code: "C14_CX08_PAYLOAD_INVALID" }))
    }
  })
  it("persists the independently frozen validated command", async () => {
    const original = await approved(), frozen = validate(original), { tx } = mockTx()
    original.stockEvidenceLines[0].quantity = "9.0000"; original.dispatchLines[0].quantity = "9.0000"; original.reservationEvidence.quantity = "9.0000"
    await execute(tx, frozen, attempt())
    expect(tx.stockEvidenceLine.create.mock.calls[0][0].data.quantity).toBe("2.0000")
    expect(Object.isFrozen(frozen.stockEvidenceLines[0])).toBe(true)
  })
  it("retains only the exact approved authorization-proof identity", async () => {
    const input = await approved(), proof = input.authorizationProof
    const validated = validate(input)
    expect(validated.authorizationProof).toBe(proof)
    const forged = command()
    forged.authorizationProof = structuredClone(proof)
    rehash(forged)
    await expect(execute(mockTx().tx, forged, attempt())).rejects.toMatchObject({ code: "C14_COMPANY_DENIED" })
  })
  it("rechecks active exact company membership and role at execution time", async () => {
    for (const membership of [null, { id: "m1", role: "admin", userId: "u1", companyId: "co2", isActive: true }, { id: "m1", role: "viewer", userId: "u1", companyId: "co1", isActive: true }]) {
      const { tx, order } = mockTx(); tx.$queryRawUnsafe.mockImplementationOnce(async () => membership ? [membership] : [])
      await expect(execute(tx, await approved(), attempt())).rejects.toMatchObject({ code: "C14_COMPANY_DENIED", httpStatus: 403 })
      expect(order).toEqual([])
    }
  })
  it("uses the transaction membership lock and deterministic anchor lock order", async () => { const { tx, order } = mockTx(), result = await execute(tx, await approved(), attempt()); expect(result.replayed).toBe(false); expect((tx.$queryRawUnsafe.mock.calls as unknown[][]).find(call => String(call[0]).includes('"UserCompanyAccess"') && String(call[0]).includes("FOR UPDATE"))).toBeTruthy(); expect((tx.$queryRawUnsafe.mock.calls as unknown[][]).filter(call => String(call[0]).includes("FOR UPDATE NOWAIT")).map(call => call[2])).toEqual(["unit1", "position1", "reservation1", "assignment1", "remito1"]); expect(order).toEqual(["audit", "acceptance", "stock-header", "stock-line", "reservation", "dispatch", "dispatch-line", "effect", "effect", "deferred", "deferred"]) })
  it("rejects missing or unrelated identified-unit anchors before DML", async () => {
    for (const anchorIdentifiedUnitIds of [[], ["foreign-unit"]]) {
      const input = await approved(); input.anchorIdentifiedUnitIds = anchorIdentifiedUnitIds; rehash(input)
      const { tx } = mockTx(); tx.$queryRawUnsafe.mockImplementation(async (sql: string) => sql.includes("box_identified_unit_id") ? [{ identifiedUnitId: "unit1" }] : sql.includes("UserCompanyAccess") ? [{ id: "m1", role: "admin", userId: "u1", companyId: "co1", isActive: true }] : [{ id: "anchor" }])
      await expect(execute(tx, input, attempt())).rejects.toMatchObject({ code: "C14_CX08_ANCHOR_INVALID" }); expectNoWriters(tx)
    }
  })
  it("accepts Prisma Decimal values returned by final-state reads without numeric coercion", async () => {
    const { tx } = mockTx()
    for (const reader of [tx.stockEvidence.findUnique, tx.stockReservationEvidence.findUnique, tx.cajasDispatch.findUnique, tx.operationalCommandEffect.findMany]) {
      const original = reader.getMockImplementation()!
      reader.mockImplementation(async (...args: unknown[]) => {
        const result = await original(...args)
        if (Array.isArray(result)) return result.map(row => ({ ...row, quantity: row.quantity === undefined ? undefined : new Prisma.Decimal(String(row.quantity)) }))
        if (!result) return result
        return {
          ...result,
          quantity: result.quantity === undefined ? undefined : new Prisma.Decimal(String(result.quantity)),
          lines: result.lines?.map((row: Record<string, unknown>) => ({ ...row, quantity: new Prisma.Decimal(String(row.quantity)) })),
        }
      })
    }
    await expect(execute(tx, await approved(), attempt())).resolves.toMatchObject({ replayed: false })
  })
  it("keeps the capability private", async () => { const runtimeSource = await import("node:fs/promises").then(fs => fs.readFile("src/lib/services/c14/bundles/wcb-06.ts", "utf8")); expect(runtimeSource).toContain("new WeakMap<object, CapabilityBinding>()"); await expect(execute(mockTx().tx, await approved(), { attemptId: "", semanticKeySha256: "forged" })).rejects.toBeInstanceOf(C14RuntimeError) })
})
