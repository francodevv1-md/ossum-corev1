import { Prisma } from "@prisma/client"
import { notFound } from "@/lib/api/errors"
import { CAJAS_CONTROL_ACTION_ROLES, CAJAS_DIFFERENCE_RESOLUTION_ACTION_ROLES, CAJAS_DISPATCH_ACTION_ROLES, STOCK_OPERATION_ROLES } from "@/lib/permissions/stock-operations-policy"
import { reconciliationTotals } from "@/lib/services/phase-d-logistics.rules"
import { normalizeLogisticsScanCode } from "@/lib/validators/logistics-operations-read"

type Db = any
type Actor = Readonly<{ actorUserId: string; role: string }>
const decimal = (value: unknown) => new Prisma.Decimal(value as string | number | Prisma.Decimal)
const total = (rows: readonly any[]) => rows.reduce((sum, row) => sum.plus(decimal(row.quantity ?? 0)), new Prisma.Decimal(0))
const text = (value: unknown) => value == null ? null : String(value)
const time = (value: unknown) => value instanceof Date ? value.toISOString() : value == null ? null : String(value)
const trace = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null

function capability(allowed: boolean, reason: string | null) { return { allowed, reason: allowed ? null : reason } }
const route = (companyId: string, surgeryId: string, suffix: string) => `/api/companies/${companyId}/surgeries/${surgeryId}${suffix}`
const idempotency = (checkpoint: string) => ({ required: true, field: "idempotencyKey", checkpoint })
const phaseDIdempotency = (checkpoint: string) => ({ required: true, field: "commandKey", checkpoint })
const phaseDConcurrency = (guard: string) => ({ guard, idempotency: "unique_company_command_key" })
function allocationCapabilities(actor: Actor, grants: Set<string>, state: { dispatched: boolean; pending: Prisma.Decimal; awaitingReceipt: boolean; closeEligible: boolean; reconciliationKind: string | null }) {
  const prepare = STOCK_OPERATION_ROLES.includes(actor.role as never) && !state.dispatched
  const control = CAJAS_CONTROL_ACTION_ROLES.includes(actor.role as never) && !state.dispatched
  const dispatch = CAJAS_DISPATCH_ACTION_ROLES.includes(actor.role as never) && !state.dispatched
  const consume = grants.has("CONSUME") && state.dispatched && state.pending.gt(0)
  const registerReturn = grants.has("REGISTER_RETURN") && state.dispatched && state.pending.gt(0)
  const registerUnidentifiedReturn = grants.has("REGISTER_RETURN") && state.dispatched
  const receive = grants.has("RECEIVE_CONTROL") && state.awaitingReceipt
  const close = grants.has("CLOSE_RECONCILIATION") && state.dispatched && state.closeEligible && state.reconciliationKind !== "CLOSED"
  const reopen = actor.role === "admin" && state.reconciliationKind === "CLOSED"
  return {
    prepare: capability(prepare, state.dispatched ? "Caja was already dispatched" : "Stock operation role is required"),
    control: capability(control, state.dispatched ? "Caja was already dispatched" : "Caja control role is required"),
    dispatch: capability(dispatch, state.dispatched ? "Caja was already dispatched" : "Caja dispatch role is required"),
    consume: capability(consume, !grants.has("CONSUME") ? "Explicit Phase D CONSUME grant is required" : "No pending dispatched quantity"),
    return: capability(registerReturn, !grants.has("REGISTER_RETURN") ? "Explicit Phase D REGISTER_RETURN grant is required" : "No pending dispatched quantity"),
    unidentifiedReturn: capability(registerUnidentifiedReturn, !grants.has("REGISTER_RETURN") ? "Explicit Phase D REGISTER_RETURN grant is required" : "No dispatched lineage is available"),
    receive: capability(receive, !grants.has("RECEIVE_CONTROL") ? "Explicit Phase D RECEIVE_CONTROL grant is required" : "No return awaits receipt control"),
    closeReconciliation: capability(close, !grants.has("CLOSE_RECONCILIATION") ? "Explicit Phase D CLOSE_RECONCILIATION grant is required" : state.reconciliationKind === "CLOSED" ? "Reconciliation is already closed" : "Reconciliation is not currently closeable"),
    reopenReconciliation: capability(reopen, actor.role !== "admin" ? "Admin role is required" : "Only a closed reconciliation can be reopened"),
  }
}

function activeCorrelation(row: any) {
  return row.followingCorrelations?.length === 0 && !["RELEASE", "CANCEL"].includes(row.stockReservationEvidence?.kind) && row.stockReservation?.projection?.status === "ACTIVE" && decimal(row.stockReservation.projection.activeQuantity ?? 0).gt(0)
}

function hasCompleteAllocationTrace(row: any) {
  const snapshot = trace(row.allocationTraceSnapshot)
  const required = ["articleId", "stockPositionId", "stockUnit", "traceMode", "lotCode", "expirationDate", "identifiedUnitId", "identifiedCode", "serialNumber", "quantity", "capturedAt"]
  return !!snapshot && required.every((key) => Object.hasOwn(snapshot, key)) && snapshot.stockPositionId === row.stockPositionId && snapshot.stockUnit === row.stockUnit && snapshot.quantity === row.quantity?.toString() && typeof snapshot.capturedAt === "string"
}

export async function getSurgeryLogisticsOperations(db: Db, companyId: string, surgeryId: string, actor: Actor) {
  const surgery = await db.surgery.findFirst({ where: { companyId, id: surgeryId }, select: { id: true } })
  if (!surgery) throw notFound("Surgery not found", "surgery_not_found")

  const assignments = await db.cajasAssignment.findMany({
    where: { companyId, surgeryId, activeSlot: 1, endedAt: null },
    include: { boxIdentifiedUnit: { include: { currentConfiguration: true } }, preparations: { include: { lines: true, latestControl: true }, orderBy: { version: "desc" } } },
    orderBy: { assignedAt: "asc" },
  })
  const assignmentIds = assignments.map((row: any) => row.id)
  const [correlations, dispatchLines, operations, differences, grants, remitos] = await Promise.all([
    db.cajasReservationCorrelation.findMany({ where: { companyId, assignmentId: { in: assignmentIds } }, include: { followingCorrelations: { select: { id: true } }, stockReservationEvidence: true, stockReservation: { include: { projection: true } } } }),
    db.cajasDispatchLine.findMany({ where: { companyId, assignmentId: { in: assignmentIds } }, include: { dispatch: true } }),
    db.cajasPhaseDOperation.findMany({ where: { companyId, surgeryId }, orderBy: { acceptedAt: "asc" } }),
    db.cajasDifference.findMany({ where: { companyId, assignmentId: { in: assignmentIds } }, include: { resolutions: { orderBy: { sequence: "desc" }, take: 1 } } }),
    db.cajasPhaseDActionGrant.findMany({ where: { companyId, userId: actor.actorUserId }, select: { action: true } }),
    db.remito.findMany({ where: { companyId, surgeryId, state: "Borrador" }, select: { id: true } }),
  ])
  const grantSet = new Set<string>(grants.map((row: any) => String(row.action)))
  const dispatchIds: string[] = [...new Set<string>(dispatchLines.map((row: any) => row.dispatchId))]
   const [reconciliations, reconciliationLines, reconciliationOperations] = dispatchIds.length ? await Promise.all([
     db.cajasPhaseDReconciliationEvent.findMany({ where: { companyId, dispatchId: { in: dispatchIds } }, orderBy: { acceptedAt: "asc" } }),
     db.cajasDispatchLine.findMany({ where: { companyId, dispatchId: { in: dispatchIds } }, select: { id: true, dispatchId: true, quantity: true } }),
     db.cajasPhaseDOperation.findMany({ where: { companyId, dispatchId: { in: dispatchIds } }, select: { id: true, dispatchId: true, dispatchLineId: true, quantity: true, returnState: true, sourceOperationId: true } }),
   ]) : [[], [], []]
   const reconciliationByDispatch = new Map(dispatchIds.map((dispatchId: string) => [dispatchId, reconciliationTotals(reconciliationLines.filter((line: any) => line.dispatchId === dispatchId), reconciliationOperations.filter((operation: any) => operation.dispatchId === dispatchId))]))
  const currentCorrelations = correlations.filter(activeCorrelation)
  const allocations = currentCorrelations.map((row: any) => {
    const assignment = assignments.find((candidate: any) => candidate.id === row.assignmentId)
    const expected = assignments.flatMap((assignment: any) => assignment.preparations.flatMap((preparation: any) => preparation.lines)).find((line: any) => line.id === row.preparationLineId)
    const dispatchLine = dispatchLines.find((line: any) => line.sourcePreparationLineId === row.preparationLineId && line.stockPositionId === row.stockPositionId && decimal(line.quantity).equals(row.quantity ?? 0)) ?? null
    const lineOperations = dispatchLine ? operations.filter((operation: any) => operation.dispatchLineId === dispatchLine.id) : []
    const consumed = total(lineOperations.filter((operation: any) => operation.kind === "CONSUMPTION"))
    const returns = total(lineOperations.filter((operation: any) => operation.kind === "RETURN" && operation.quantity.gt?.(0)))
    const dispatched = dispatchLine ? decimal(dispatchLine.quantity) : new Prisma.Decimal(0)
    const unsettled = dispatched.minus(consumed).minus(returns)
    const pending = unsettled.isNegative() ? new Prisma.Decimal(0) : unsettled
    const returnOperations = lineOperations.filter((operation: any) => operation.kind === "RETURN" && operation.quantity.gt?.(0))
    const receipts = lineOperations.filter((operation: any) => operation.sourceOperationId && returnOperations.some((source: any) => source.id === operation.sourceOperationId && operation.returnState === "RECEIVED"))
    const quarantine = total(returnOperations.filter((operation: any) => operation.returnState === "PENDING_IDENTIFICATION" || receipts.some((receipt: any) => receipt.sourceOperationId === operation.id && receipt.receiptOutcome !== "FIT")))
    const allocationDifferences = differences.filter((difference: any) => difference.controlLineId === dispatchLine?.sourceControlLineId || difference.dispatchLineId === dispatchLine?.id)
    const allocationTrace = trace(row.allocationTraceSnapshot)
    const lastReconciliation = dispatchLine ? reconciliations.filter((event: any) => event.dispatchId === dispatchLine.dispatchId).at(-1) : null
    const capabilities = allocationCapabilities(actor, grantSet, { dispatched: !!dispatchLine, pending, awaitingReceipt: returnOperations.some((operation: any) => operation.returnState !== "RECEIVED"), closeEligible: reconciliationByDispatch.get(dispatchLine?.dispatchId)?.closeEligible ?? false, reconciliationKind: lastReconciliation?.kind ?? null })
    const blockers = [!expected && "expected_line_unavailable", !hasCompleteAllocationTrace(row) && "allocation_snapshot_unavailable", dispatchLine && !dispatchLine.remitoId && "remito_lineage_unavailable"].filter(Boolean)
    return {
      id: row.id, assignmentId: row.assignmentId, preparationLineId: row.preparationLineId, dispatchLineId: dispatchLine?.id ?? null,
      remito: dispatchLine?.remitoId ? { id: dispatchLine.remitoId, sourceKind: "REMITO" } : null,
      expected: { quantity: expected?.quantity?.toString() ?? null, unit: expected?.stockUnit ?? row.stockUnit }, assigned: { quantity: row.quantity?.toString() ?? null, unit: row.stockUnit },
      dispatched: { quantity: dispatched.toString(), unit: row.stockUnit }, consumed: { quantity: consumed.toString(), unit: row.stockUnit }, returned: { quantity: returns.toString(), unit: row.stockUnit }, pending: { quantity: pending.toString(), unit: row.stockUnit }, quarantine: { quantity: quarantine.toString(), unit: row.stockUnit },
      positionId: row.stockPositionId, lot: text(allocationTrace?.lotCode), serial: text(allocationTrace?.serialNumber), identifiedCode: text(allocationTrace?.identifiedCode), cajaCode: text(assignment?.boxIdentifiedUnit?.currentConfiguration?.internalCode), unit: row.stockUnit,
       snapshots: allocationTrace, differences: allocationDifferences.map((difference: any) => {
         const closed = difference.resolutions[0]?.closesDifference ?? false
         const resolvable = CAJAS_DIFFERENCE_RESOLUTION_ACTION_ROLES.includes(actor.role as never) && !closed && !dispatchLine
         return {
           id: difference.id, kind: difference.kind, openedAt: time(difference.openedAt), resolutionId: difference.resolutions[0]?.id ?? null, closed,
           actions: resolvable ? [{
             type: "RESOLVE_DIFFERENCE", method: "POST", route: route(companyId, surgeryId, `/cajas/preparation/${row.assignmentId}/differences/${difference.id}/resolve`),
             targets: { surgeryId, assignmentId: row.assignmentId, preparationLineId: row.preparationLineId, correlationId: row.id, differenceId: difference.id },
             permitted: { quantity: null, unit: row.stockUnit }, requiredInputs: ["decision", "reason", "evidenceReference"], preconditions: [], blockers: [], idempotency: idempotency("cajas-difference-resolution"), concurrency: null,
           }] : [],
         }
       }),
       receipt: receipts.at(-1) ? { id: receipts.at(-1).id, outcome: receipts.at(-1).receiptOutcome, actorId: receipts.at(-1).receivedById, at: time(receipts.at(-1).receivedAt) } : null,
       returns: returnOperations.map((operation: any) => {
         const pendingIdentification = operation.returnState === "PENDING_IDENTIFICATION"
         const receivable = capabilities.receive.allowed && operation.returnState !== "RECEIVED"
         const targets = { surgeryId, assignmentId: row.assignmentId, correlationId: row.id, dispatchId: dispatchLine?.dispatchId ?? null, dispatchLineId: dispatchLine?.id ?? null, returnOperationId: operation.id }
         return {
           id: operation.id, state: operation.returnState, quantity: operation.quantity.toString(), unit: operation.stockUnit ?? row.stockUnit,
           actions: [
             ...(receivable ? [{ type: "RECEIVE_RETURN", command: "receive_return", method: "POST", route: route(companyId, surgeryId, "/logistics/phase-d"), targets, permitted: { quantity: operation.quantity.toString(), unit: operation.stockUnit ?? row.stockUnit, receiptOutcomes: pendingIdentification ? ["UNIDENTIFIABLE"] : ["FIT", "OBSERVED", "DAMAGED", "NOT_FIT", "UNIDENTIFIABLE"] }, requiredInputs: ["receiptOutcome"], preconditions: ["return_awaiting_receipt"], blockers: [], idempotency: phaseDIdempotency("phase-d-receipt-control"), concurrency: phaseDConcurrency("unique_company_command_key") }] : []),
             ...(pendingIdentification && capabilities.receive.allowed ? [{ type: "RESOLVE_UNIDENTIFIED_RETURN", command: "resolve_unidentified_return", method: "POST", route: route(companyId, surgeryId, "/logistics/phase-d"), targets, permitted: { quantity: operation.quantity.toString(), unit: operation.stockUnit ?? row.stockUnit, receiptOutcomes: ["OBSERVED", "DAMAGED", "NOT_FIT"] }, requiredInputs: ["receiptOutcome"], preconditions: ["return_pending_identification"], blockers: [], idempotency: phaseDIdempotency("phase-d-unidentified-resolution"), concurrency: phaseDConcurrency("unique_company_command_key") }] : []),
           ],
         }
       }),
      reconciliation: lastReconciliation ? { id: lastReconciliation.id, kind: lastReconciliation.kind, actorId: lastReconciliation.acceptedById, at: time(lastReconciliation.acceptedAt), commandAcceptanceId: lastReconciliation.commandAcceptanceId, auditEventId: lastReconciliation.auditEventId } : null,
      lineage: { correlationId: row.id, reservationId: row.stockReservationId, reservationEvidenceId: row.stockReservationEvidenceId, dispatchId: dispatchLine?.dispatchId ?? null, stockEvidenceLineId: dispatchLine?.stockEvidenceLineId ?? null, sourceCheckpoint: row.sourceCheckpoint ?? null },
       blockers, availability: { phaseD: dispatchLine ? "available" : "unavailable" }, capabilities,
        actions: [
          ...(capabilities.prepare.allowed && !blockers.length ? [{
          type: "RELEASE_ALLOCATION", method: "DELETE", route: route(companyId, surgeryId, `/cajas/preparation/${row.assignmentId}/lines/${row.preparationLineId}/allocations/${row.id}`),
          targets: { surgeryId, assignmentId: row.assignmentId, cajaId: assignment?.boxIdentifiedUnitId ?? null, preparationLineId: row.preparationLineId, correlationId: row.id, reservationId: row.stockReservationId, reservationEvidenceId: row.stockReservationEvidenceId },
          permitted: { quantity: row.quantity?.toString() ?? null, unit: row.stockUnit }, requiredInputs: ["reason"], preconditions: ["active_allocation"], blockers: [], idempotency: idempotency("cajas-physical-preparation"), concurrency: null,
          }] : []),
          ...(capabilities.consume.allowed ? [{ type: "RECORD_CONSUMPTION", command: "consume", method: "POST", route: route(companyId, surgeryId, "/logistics/phase-d"), targets: { surgeryId, assignmentId: row.assignmentId, correlationId: row.id, dispatchId: dispatchLine?.dispatchId ?? null, dispatchLineId: dispatchLine?.id ?? null }, permitted: { quantity: pending.toString(), unit: row.stockUnit }, requiredInputs: ["quantity"], preconditions: ["dispatched_quantity_pending"], blockers: [], idempotency: phaseDIdempotency("phase-d-consumption"), concurrency: phaseDConcurrency("dispatch_line_for_update") }] : []),
          ...(capabilities.return.allowed ? [{ type: "REGISTER_RETURN", command: "return", method: "POST", route: route(companyId, surgeryId, "/logistics/phase-d"), targets: { surgeryId, assignmentId: row.assignmentId, correlationId: row.id, dispatchId: dispatchLine?.dispatchId ?? null, dispatchLineId: dispatchLine?.id ?? null }, permitted: { quantity: pending.toString(), unit: row.stockUnit }, requiredInputs: ["quantity"], preconditions: ["dispatched_quantity_pending"], blockers: [], idempotency: phaseDIdempotency("phase-d-return-registration"), concurrency: phaseDConcurrency("dispatch_line_for_update") }] : []),
          ...(capabilities.unidentifiedReturn.allowed ? [{ type: "REGISTER_UNIDENTIFIED_RETURN", command: "return_unidentified", method: "POST", route: route(companyId, surgeryId, "/logistics/phase-d"), targets: { surgeryId, assignmentId: row.assignmentId, correlationId: row.id, dispatchId: dispatchLine?.dispatchId ?? null, dispatchLineId: null }, permitted: { quantity: { minExclusive: "0", max: null, decimalPlaces: 4 }, unit: null }, requiredInputs: ["quantity"], preconditions: ["dispatched_lineage"], blockers: [], idempotency: phaseDIdempotency("phase-d-unidentified-return-registration"), concurrency: phaseDConcurrency("unique_company_command_key") }] : []),
          ...(capabilities.closeReconciliation.allowed ? [{ type: "CLOSE_RECONCILIATION", command: "close_reconciliation", method: "POST", route: route(companyId, surgeryId, "/logistics/phase-d"), targets: { surgeryId, assignmentId: row.assignmentId, dispatchId: dispatchLine?.dispatchId ?? null }, permitted: { quantity: "0", unit: row.stockUnit }, requiredInputs: [], preconditions: ["reconciliation_close_eligible"], blockers: [], idempotency: phaseDIdempotency("phase-d-reconciliation-close"), concurrency: phaseDConcurrency("unique_company_command_key") }] : []),
          ...(capabilities.reopenReconciliation.allowed ? [{ type: "REOPEN_RECONCILIATION", command: "reopen_reconciliation", method: "POST", route: route(companyId, surgeryId, "/logistics/phase-d"), targets: { surgeryId, assignmentId: row.assignmentId, dispatchId: dispatchLine?.dispatchId ?? null, reconciliationEventId: lastReconciliation?.id ?? null }, permitted: { quantity: "0", unit: row.stockUnit }, requiredInputs: ["reason"], preconditions: ["reconciliation_closed", "admin_role"], blockers: [], idempotency: phaseDIdempotency("phase-d-reconciliation-reopen"), concurrency: phaseDConcurrency("unique_company_command_key") }] : []),
        ],
    }
  })
  const summaryValue = (key: "expected" | "assigned" | "dispatched" | "consumed" | "returned" | "pending" | "quarantine") => key === "expected"
    ? assignments.flatMap((assignment: any) => (assignment.preparations[0]?.lines ?? []).filter((line: any) => line.role === "EXPECTED")).reduce((sum: Prisma.Decimal, line: any) => sum.plus(line.quantity), new Prisma.Decimal(0)).toString()
    : allocations.reduce((sum: Prisma.Decimal, allocation: any) => sum.plus(allocation[key].quantity ?? 0), new Prisma.Decimal(0)).toString()
  return {
    companyId, surgeryId, generatedAt: new Date().toISOString(),
    summary: { expected: summaryValue("expected"), assigned: summaryValue("assigned"), dispatched: summaryValue("dispatched"), consumed: summaryValue("consumed"), returned: summaryValue("returned"), pending: summaryValue("pending"), quarantine: summaryValue("quarantine"), blockers: String(allocations.reduce((count: number, allocation: any) => count + allocation.blockers.length, 0)), differences: String(new Set(allocations.flatMap((allocation: any) => allocation.differences.map((difference: any) => difference.id))).size) },
     assignments: assignments.map((assignment: any) => {
       const preparation = assignment.preparations[0]
       const assignmentAllocations = allocations.filter((allocation: any) => allocation.assignmentId === assignment.id)
       const expected = total(preparation?.lines.filter((line: any) => line.role === "EXPECTED") ?? [])
       const assigned = total(currentCorrelations.filter((row: any) => row.preparationId === preparation?.id))
       const controlBlockers = [!preparation && "preparation_unavailable", assigned.lt(expected) && "preparation_incomplete", assignmentAllocations.some((allocation: any) => allocation.blockers.includes("allocation_snapshot_unavailable")) && "allocation_snapshot_unavailable"].filter(Boolean)
       const currentDispatches = dispatchLines.filter((line: any) => line.assignmentId === assignment.id)
       const controlReady = CAJAS_CONTROL_ACTION_ROLES.includes(actor.role as never) && !currentDispatches.length && !controlBlockers.length
        const control = preparation?.latestControl
        const controlCurrent = !!control && ["CLEAN", "WITH_DIFFERENCES"].includes(control.result) && control.sourcePreparationVersion === preparation.version
        const dispatchBlockers = [!CAJAS_DISPATCH_ACTION_ROLES.includes(actor.role as never) && "caja_dispatch_role_required", !remitos.length && "draft_remito_unavailable", !currentDispatches.length && (preparation?.requiresRecontrol || !controlCurrent) && "control_stale", differences.some((difference: any) => difference.assignmentId === assignment.id && !difference.resolutions[0]?.closesDifference) && "difference_open", ...controlBlockers].filter(Boolean)
       const dispatchReady = !currentDispatches.length && !dispatchBlockers.length
       return {
         id: assignment.id, caja: { articleId: assignment.boxArticleId, identifiedUnitId: assignment.boxIdentifiedUnitId, code: assignment.boxIdentifiedUnit?.currentConfiguration?.internalCode ?? null }, assigned: { actorId: assignment.assignedById, at: time(assignment.assignedAt), commandAcceptanceId: assignment.startCommandAcceptanceId },
         preparations: assignment.preparations.map((item: any) => ({ id: item.id, version: item.version, requiresRecontrol: item.requiresRecontrol, expected: { quantity: total(item.lines.filter((line: any) => line.role === "EXPECTED")).toString() }, assigned: { quantity: total(currentCorrelations.filter((row: any) => row.preparationId === item.id)).toString() }, status: item.requiresRecontrol ? "DRAFT" : "COMPLETE" })),
         dispatches: currentDispatches.map((line: any) => ({ id: line.dispatchId, lineId: line.id, remitoId: line.remitoId, acceptedAt: time(line.dispatch?.acceptedAt) })),
         actions: [
           ...(controlReady ? [{ type: "ACCEPT_CONTROL", method: "POST", route: route(companyId, surgeryId, `/cajas/preparation/${assignment.id}/control`), targets: { surgeryId, assignmentId: assignment.id, cajaId: assignment.boxIdentifiedUnitId, preparationId: preparation.id, preparationVersion: preparation.version }, permitted: { quantity: expected.toString(), unit: null }, requiredInputs: [], preconditions: ["complete_preparation", "complete_allocation_trace"], blockers: [], idempotency: idempotency("cajas-control"), concurrency: null }] : []),
           ...(dispatchReady ? remitos.map((remito: any) => ({ type: "EMIT_REMITO_DISPATCH", method: "POST", route: `/api/companies/${companyId}/remitos/${remito.id}/emitir`, targets: { surgeryId, assignmentId: assignment.id, cajaId: assignment.boxIdentifiedUnitId, preparationId: preparation.id, preparationVersion: preparation.version, remitoId: remito.id }, permitted: { quantity: assigned.toString(), unit: null }, requiredInputs: [], preconditions: ["current_control", "complete_preparation", "no_open_difference"], blockers: [], idempotency: { required: false, field: "idempotencyKey", checkpoint: "remito-issuance" }, concurrency: { guard: "serializable_remito_lock" } })) : []),
         ],
       }
     }),
    allocations,
  }
}

export async function resolveSurgeryLogisticsCode(db: Db, companyId: string, surgeryId: string, actor: Actor, rawCode: unknown) {
  const code = normalizeLogisticsScanCode(rawCode)
  const projection = await getSurgeryLogisticsOperations(db, companyId, surgeryId, actor)
  const candidates = projection.allocations.filter((allocation: any) => [allocation.identifiedCode, allocation.serial, allocation.cajaCode].filter(Boolean).some((value: string) => normalizeLogisticsScanCode(value) === code) && [allocation.capabilities.consume, allocation.capabilities.return, allocation.capabilities.receive].some((item: any) => item.allowed)).map((allocation: any) => ({ id: allocation.id, assignmentId: allocation.assignmentId, preparationLineId: allocation.preparationLineId, dispatchLineId: allocation.dispatchLineId, identifiedCode: allocation.identifiedCode, serial: allocation.serial, cajaCode: allocation.cajaCode, positionId: allocation.positionId, unit: allocation.unit }))
  if (!candidates.length) return { kind: "none" as const, code }
  if (candidates.length === 1) return { kind: "exact" as const, code, allocation: candidates[0] }
  return { kind: "ambiguous" as const, code, candidates }
}
