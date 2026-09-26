import { Prisma } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"
import { getSurgeryLogisticsOperations, resolveSurgeryLogisticsCode } from "@/lib/services/logistics-operations-read.service"

const D = (value: string | number) => new Prisma.Decimal(value)
function db({ code = "UNIT-1", second = false, dispatched = true, allDispatched = false, snapshot = true, controlled = false, staleControl = false, reservationActive = true, assignmentActive = true, company = "company-1" }: { code?: string; second?: boolean; dispatched?: boolean; allDispatched?: boolean; snapshot?: boolean; controlled?: boolean; staleControl?: boolean; reservationActive?: boolean; assignmentActive?: boolean; company?: string } = {}) {
  const assignments = [{ id: "assignment-1", activeSlot: assignmentActive ? 1 : 0, endedAt: assignmentActive ? null : new Date("2026-01-01"), boxArticleId: "box-1", boxIdentifiedUnitId: "box-unit-1", assignedById: "actor-1", assignedAt: new Date("2026-01-01"), startCommandAcceptanceId: "acceptance-1", boxIdentifiedUnit: { currentConfiguration: { internalCode: "BOX-1" } }, preparations: [{ id: "prep-1", version: 1, requiresRecontrol: false, latestControlId: controlled ? "control-1" : null, latestControl: controlled ? { id: "control-1", result: "CLEAN", sourcePreparationVersion: staleControl ? 0 : 1 } : null, lines: [{ id: "line-1", role: "EXPECTED", quantity: D(2), stockUnit: "UNIT" }] }] }]
  const correlations = ["allocation-1", ...(second ? ["allocation-2"] : [])].map((id, index) => ({ id, assignmentId: "assignment-1", preparationId: "prep-1", preparationLineId: "line-1", stockPositionId: `position-${index + 1}`, stockReservationId: `reservation-${index + 1}`, stockReservationEvidenceId: `evidence-${index + 1}`, stockUnit: "UNIT", quantity: D(1), sourceCheckpoint: "cajas-physical-preparation", followingCorrelations: [], stockReservationEvidence: { kind: "RESERVE" }, stockReservation: { projection: { status: reservationActive ? "ACTIVE" : "RELEASED", activeQuantity: D(reservationActive ? 1 : 0) } }, allocationTraceSnapshot: snapshot ? { articleId: "article-1", stockPositionId: `position-${index + 1}`, stockUnit: "UNIT", traceMode: "NONE", lotCode: "LOT-1", expirationDate: null, identifiedUnitId: null, identifiedCode: code, serialNumber: code, quantity: "1", capturedAt: "2026-01-01T00:00:00.000Z" } : null }))
  const client: any = {
    $transaction: vi.fn(),
    surgery: { findFirst: vi.fn(async ({ where }: any) => where.companyId === company && where.id === "surgery-1" ? { id: "surgery-1" } : null) },
    remito: { findMany: vi.fn(async () => [{ id: "remito-draft-1" }]), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cajasAssignment: { findMany: vi.fn(async ({ where }: any) => where.companyId === company && where.surgeryId === "surgery-1" && where.activeSlot === 1 && where.endedAt === null && assignmentActive ? assignments : []), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cajasReservationCorrelation: { findMany: vi.fn(async ({ where }: any = {}) => !where?.assignmentId || where.assignmentId.in.length ? correlations : []), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cajasDispatchLine: { findMany: vi.fn(async () => dispatched ? ["position-1", ...(allDispatched && second ? ["position-2"] : [])].map((stockPositionId, index) => ({ id: `dispatch-line-${index + 1}`, dispatchId: `dispatch-${index + 1}`, assignmentId: "assignment-1", sourcePreparationLineId: "line-1", sourceControlLineId: "control-line-1", stockPositionId, quantity: D(1), remitoId: "remito-1", stockEvidenceLineId: `stock-evidence-line-${index + 1}`, dispatch: { acceptedAt: new Date("2026-01-02") } })) : []), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cajasPhaseDOperation: { findMany: vi.fn(async () => [{ id: "consume-1", surgeryId: "surgery-1", dispatchLineId: "dispatch-line-1", kind: "CONSUMPTION", quantity: D(0.5), acceptedAt: new Date("2026-01-03") }, { id: "return-1", surgeryId: "surgery-1", dispatchLineId: "dispatch-line-1", kind: "RETURN", returnState: "PENDING_IDENTIFICATION", quantity: D(0.25), acceptedAt: new Date("2026-01-04") }]), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cajasDifference: { findMany: vi.fn(async () => [{ id: "difference-1", controlLineId: "control-line-1", kind: "PREPARATION_DIFFERENCE", openedAt: new Date("2026-01-02"), resolutions: [] }]), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cajasPhaseDActionGrant: { findMany: vi.fn(async () => [{ action: "CONSUME" }, { action: "REGISTER_RETURN" }]), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cajasPhaseDReconciliationEvent: { findMany: vi.fn(async () => [{ id: "reconciliation-1", dispatchId: "dispatch-1", kind: "CLOSED", acceptedById: "actor-1", acceptedAt: new Date("2026-01-05"), commandAcceptanceId: "acceptance-close", auditEventId: "audit-close" }]), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  }
  return client
}

describe("logistics operations read projection", () => {
  it("maps physical lineage, decimal totals, receipt state, and unavailable source facts without writes", async () => {
    const client = db({ second: true })
    const projection = await getSurgeryLogisticsOperations(client, "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(projection.summary).toMatchObject({ expected: "2", assigned: "2", dispatched: "1", consumed: "0.5", returned: "0.25", pending: "0.25", quarantine: "0.25", differences: "1" })
    expect(projection.allocations[0]).toMatchObject({ id: "allocation-1", positionId: "position-1", lot: "LOT-1", serial: "UNIT-1", identifiedCode: "UNIT-1", remito: { id: "remito-1" }, lineage: { dispatchId: "dispatch-1", stockEvidenceLineId: "stock-evidence-line-1" }, reconciliation: { id: "reconciliation-1" } })
    expect(projection.allocations[1]).toMatchObject({ id: "allocation-2", availability: { phaseD: "unavailable" }, dispatched: { quantity: "0" } })
    expect(client.$transaction).not.toHaveBeenCalled()
    for (const repository of [client.cajasAssignment, client.cajasReservationCorrelation, client.cajasDispatchLine, client.cajasPhaseDOperation, client.cajasDifference, client.cajasPhaseDActionGrant, client.cajasPhaseDReconciliationEvent]) for (const method of ["create", "update", "delete"]) expect(repository[method]).not.toHaveBeenCalled()
  })

  it("keeps capabilities server-derived and requires explicit Phase D grants", async () => {
    const projection = await getSurgeryLogisticsOperations(db(), "company-1", "surgery-1", { actorUserId: "actor-1", role: "viewer" })
    expect(projection.allocations[0].capabilities).toMatchObject({ prepare: { allowed: false }, consume: { allowed: true }, receive: { allowed: false }, reopenReconciliation: { allowed: false } })
  })

  it("reports a missing immutable allocation source as a blocker rather than a successful trace", async () => {
    const projection = await getSurgeryLogisticsOperations(db({ snapshot: false }), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(projection.allocations[0]).toMatchObject({ snapshots: null, blockers: expect.arrayContaining(["allocation_snapshot_unavailable"]) })
  })

  it("matches the admin-only Phase D reopen policy without inventing a close grant requirement", async () => {
    const projection = await getSurgeryLogisticsOperations(db(), "company-1", "surgery-1", { actorUserId: "actor-1", role: "admin" })
    expect(projection.allocations[0].capabilities.reopenReconciliation).toEqual({ allowed: true, reason: null })
  })

  it("emits only available server-targeted Phase B/C descriptors and no secret material", async () => {
    const projection = await getSurgeryLogisticsOperations(db({ dispatched: false, second: true }), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(projection.allocations[0].actions).toEqual([expect.objectContaining({ type: "RELEASE_ALLOCATION", method: "DELETE", targets: expect.objectContaining({ surgeryId: "surgery-1", assignmentId: "assignment-1", correlationId: "allocation-1", reservationId: "reservation-1" }), permitted: { quantity: "1", unit: "UNIT" }, requiredInputs: ["reason"], idempotency: expect.objectContaining({ required: true }) })])
    expect(projection.assignments[0].actions).toEqual([expect.objectContaining({ type: "ACCEPT_CONTROL", targets: expect.objectContaining({ preparationId: "prep-1", preparationVersion: 1 }) })])
    expect(JSON.stringify(projection)).not.toMatch(/secret|token|authorizationProof/i)
  })

  it("hides descriptors when capability or state preconditions are absent", async () => {
    const viewer = await getSurgeryLogisticsOperations(db({ dispatched: false }), "company-1", "surgery-1", { actorUserId: "actor-1", role: "viewer" })
    expect(viewer.allocations[0].actions).toEqual([])
    expect(viewer.assignments[0].actions).toEqual([])
    const dispatched = await getSurgeryLogisticsOperations(db(), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(dispatched.allocations[0].actions).toEqual(expect.arrayContaining([expect.objectContaining({ type: "RECORD_CONSUMPTION" }), expect.objectContaining({ type: "REGISTER_RETURN" })]))
    expect(dispatched.assignments[0].actions).toEqual([])
  })

  it("does not emit a release descriptor for an inactive reservation or an inactive assignment", async () => {
    const released = await getSurgeryLogisticsOperations(db({ dispatched: false, reservationActive: false }), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(released.allocations).toEqual([])
    const ended = await getSurgeryLogisticsOperations(db({ dispatched: false, assignmentActive: false }), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(ended.assignments).toEqual([])
    expect(ended.allocations).toEqual([])
  })

  it("does not emit control or release descriptors when a present trace is structurally incomplete", async () => {
    const client = db({ dispatched: false, second: true })
    const correlations = await client.cajasReservationCorrelation.findMany()
    correlations[0].allocationTraceSnapshot = { capturedAt: "2026-01-01T00:00:00.000Z" }
    const projection = await getSurgeryLogisticsOperations(client, "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(projection.allocations[0]).toMatchObject({ blockers: expect.arrayContaining(["allocation_snapshot_unavailable"]), actions: [] })
    expect(projection.assignments[0].actions).toEqual([])
  })

  it("describes the existing dispatch and difference-resolution commands only when their authoritative state is current", async () => {
    const projection = await getSurgeryLogisticsOperations(db({ dispatched: false, second: true, controlled: true }), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(projection.assignments[0].actions).toContainEqual(expect.objectContaining({ type: "EMIT_REMITO_DISPATCH", route: "/api/companies/company-1/remitos/remito-draft-1/emitir", targets: expect.objectContaining({ remitoId: "remito-draft-1", preparationVersion: 1 }), concurrency: { guard: "serializable_remito_lock" } }))
    expect(projection.allocations[0].differences[0].actions).toEqual([expect.objectContaining({ type: "RESOLVE_DIFFERENCE", requiredInputs: ["decision", "reason", "evidenceReference"], targets: expect.objectContaining({ differenceId: "difference-1" }) })])
  })

  it("omits dispatch when the accepted control does not match the current preparation version", async () => {
    const projection = await getSurgeryLogisticsOperations(db({ dispatched: false, second: true, controlled: true, staleControl: true }), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(projection.assignments[0].actions).not.toContainEqual(expect.objectContaining({ type: "EMIT_REMITO_DISPATCH" }))
  })

  it("describes every available Phase D command from immutable read facts and omits denied commands", async () => {
    const commands = new Set<string>()
    const collect = (projection: any) => projection.allocations.flatMap((allocation: any) => [...allocation.actions, ...allocation.returns.flatMap((item: any) => item.actions)]).forEach((action: any) => commands.add(action.type))
    const client = db()
    client.cajasPhaseDActionGrant.findMany.mockResolvedValue([{ action: "CONSUME" }, { action: "REGISTER_RETURN" }])
    collect(await getSurgeryLogisticsOperations(client, "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" }))
    expect(commands).toEqual(new Set(["RECORD_CONSUMPTION", "REGISTER_RETURN", "REGISTER_UNIDENTIFIED_RETURN"]))
    const receiving = db()
    receiving.cajasPhaseDActionGrant.findMany.mockResolvedValue([{ action: "RECEIVE_CONTROL" }])
    collect(await getSurgeryLogisticsOperations(receiving, "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" }))
    expect(commands).toEqual(new Set(["RECORD_CONSUMPTION", "REGISTER_RETURN", "REGISTER_UNIDENTIFIED_RETURN", "RECEIVE_RETURN", "RESOLVE_UNIDENTIFIED_RETURN"]))
    const closeable = db()
    closeable.cajasPhaseDActionGrant.findMany.mockResolvedValue([{ action: "CLOSE_RECONCILIATION" }])
    closeable.cajasPhaseDOperation.findMany.mockResolvedValue([{ id: "consume-final", dispatchId: "dispatch-1", dispatchLineId: "dispatch-line-1", kind: "CONSUMPTION", quantity: D(1), acceptedAt: new Date("2026-01-03") }])
    closeable.cajasPhaseDReconciliationEvent.findMany.mockResolvedValue([])
    collect(await getSurgeryLogisticsOperations(closeable, "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" }))
    const admin = db()
    admin.cajasPhaseDActionGrant.findMany.mockResolvedValue([])
    admin.cajasPhaseDOperation.findMany.mockResolvedValue([{ id: "consume-final", dispatchId: "dispatch-1", dispatchLineId: "dispatch-line-1", kind: "CONSUMPTION", quantity: D(1), acceptedAt: new Date("2026-01-03") }])
    collect(await getSurgeryLogisticsOperations(admin, "company-1", "surgery-1", { actorUserId: "actor-1", role: "admin" }))
    expect(commands).toEqual(new Set(["RECORD_CONSUMPTION", "REGISTER_RETURN", "REGISTER_UNIDENTIFIED_RETURN", "RECEIVE_RETURN", "RESOLVE_UNIDENTIFIED_RETURN", "CLOSE_RECONCILIATION", "REOPEN_RECONCILIATION"]))
    const descriptor = (await getSurgeryLogisticsOperations(client, "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })).allocations[0].actions.find((item: any) => item.type === "RECORD_CONSUMPTION")
    expect(descriptor).toMatchObject({ command: "consume", method: "POST", route: "/api/companies/company-1/surgeries/surgery-1/logistics/phase-d", targets: { dispatchId: "dispatch-1", dispatchLineId: "dispatch-line-1" }, permitted: { quantity: "0.25", unit: "UNIT" }, requiredInputs: ["quantity"], idempotency: { field: "commandKey" }, concurrency: { guard: "dispatch_line_for_update" } })
    expect(JSON.stringify([...commands, descriptor])).not.toMatch(/secret|token|authorizationProof/i)
  })

  it("keeps unidentified returns independent from physical pending quantities and closes only a fully reconciled dispatch", async () => {
    const unidentified = db()
    unidentified.cajasPhaseDActionGrant.findMany.mockResolvedValue([{ action: "REGISTER_RETURN" }])
    unidentified.cajasPhaseDOperation.findMany.mockResolvedValue([{ id: "consume-final", dispatchId: "dispatch-1", dispatchLineId: "dispatch-line-1", kind: "CONSUMPTION", quantity: D(1), acceptedAt: new Date("2026-01-03") }])
    const settled = await getSurgeryLogisticsOperations(unidentified, "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(settled.allocations[0].actions).toContainEqual(expect.objectContaining({ type: "REGISTER_UNIDENTIFIED_RETURN", permitted: { quantity: { minExclusive: "0", max: null, decimalPlaces: 4 }, unit: null } }))

    const close = db({ second: true, allDispatched: true })
    close.cajasPhaseDActionGrant.findMany.mockResolvedValue([{ action: "CLOSE_RECONCILIATION" }])
    close.cajasDispatchLine.findMany.mockResolvedValue([
      { id: "dispatch-line-1", dispatchId: "dispatch-1", assignmentId: "assignment-1", sourcePreparationLineId: "line-1", sourceControlLineId: "control-line-1", stockPositionId: "position-1", quantity: D(1), remitoId: "remito-1", stockEvidenceLineId: "stock-evidence-line-1", dispatch: { acceptedAt: new Date("2026-01-02") } },
      { id: "dispatch-line-2", dispatchId: "dispatch-1", assignmentId: "assignment-1", sourcePreparationLineId: "line-1", sourceControlLineId: "control-line-1", stockPositionId: "position-2", quantity: D(1), remitoId: "remito-1", stockEvidenceLineId: "stock-evidence-line-2", dispatch: { acceptedAt: new Date("2026-01-02") } },
    ])
    close.cajasPhaseDOperation.findMany.mockResolvedValue([{ id: "consume-final", dispatchId: "dispatch-1", dispatchLineId: "dispatch-line-1", kind: "CONSUMPTION", quantity: D(1), acceptedAt: new Date("2026-01-03") }])
    close.cajasPhaseDReconciliationEvent.findMany.mockResolvedValue([])
    const incomplete = await getSurgeryLogisticsOperations(close, "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(incomplete.allocations.flatMap((allocation: any) => allocation.actions)).not.toContainEqual(expect.objectContaining({ type: "CLOSE_RECONCILIATION" }))
  })

  it("returns none, exact, and ambiguous scan outcomes without choosing a candidate", async () => {
    await expect(resolveSurgeryLogisticsCode(db(), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" }, " missing ")).resolves.toEqual({ kind: "none", code: "MISSING" })
    await expect(resolveSurgeryLogisticsCode(db(), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" }, "unit-1")).resolves.toMatchObject({ kind: "exact", code: "UNIT-1", allocation: { id: "allocation-1" } })
    await expect(resolveSurgeryLogisticsCode(db(), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" }, "box-1")).resolves.toMatchObject({ kind: "exact", allocation: { cajaCode: "BOX-1" } })
    await expect(resolveSurgeryLogisticsCode(db({ second: true, allDispatched: true }), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" }, "unit-1")).resolves.toMatchObject({ kind: "ambiguous", candidates: [{ id: "allocation-1" }, { id: "allocation-2" }] })
  })

  it("never resolves a pre-dispatch allocation merely because the actor has a generic Caja role", async () => {
    await expect(resolveSurgeryLogisticsCode(db({ code: "PRE-1", dispatched: false }), "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" }, "pre-1")).resolves.toEqual({ kind: "none", code: "PRE-1" })
  })

  it("derives every source read with the authoritative company and Surgery scope", async () => {
    const client = db(); await getSurgeryLogisticsOperations(client, "company-1", "surgery-1", { actorUserId: "actor-1", role: "operator" })
    expect(client.surgery.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-1", id: "surgery-1" } }))
    expect(client.cajasAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company-1", surgeryId: "surgery-1" }) }))
    for (const repository of [client.cajasReservationCorrelation, client.cajasDispatchLine, client.cajasPhaseDOperation, client.cajasDifference, client.cajasPhaseDActionGrant]) expect(repository.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company-1" }) }))
  })

  it("does not disclose a Surgery outside the authoritative company scope", async () => {
    await expect(getSurgeryLogisticsOperations(db(), "company-2", "surgery-1", { actorUserId: "actor-1", role: "operator" })).rejects.toMatchObject({ code: "surgery_not_found" })
  })
})
