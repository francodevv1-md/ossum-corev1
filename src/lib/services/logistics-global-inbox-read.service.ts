/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client"
import { badRequest } from "@/lib/api/errors"
import { CAJAS_DISPATCH_ACTION_ROLES, STOCK_OPERATION_ROLES } from "@/lib/permissions/stock-operations-policy"
import { reconciliationTotals } from "@/lib/services/phase-d-logistics.rules"

type Db = any
type Actor = Readonly<{ actorUserId: string; role: string }>
type Query = ReturnType<typeof import("@/lib/validators/logistics-global-inbox-read").validateLogisticsGlobalInboxQuery>
type CandidateRow = { id: string; lastNoveltyLabel?: string | null; lastNoveltyAt?: Date | string | null; lastNoveltyResponsible?: string | null }
type CountRow = { news: bigint | number; urgent: bigint | number; exceptions: bigint | number }
type InboxCursor = { id: string; exception: number; urgent: number; nextAction: number; eventAt: number; date: number }

const decimal = (value: unknown) => new Prisma.Decimal(value as string | number | Prisma.Decimal)
const sum = (rows: any[]) => rows.reduce((total, row) => total.plus(decimal(row.quantity ?? 0)), new Prisma.Decimal(0))
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : value == null ? null : String(value)
const name = (contact: any) => contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.legalName || contact.tradeName || null : null
const cursor = (row: InboxCursor) => Buffer.from(JSON.stringify(row)).toString("base64url")
const decodeCursor = (value?: string): InboxCursor | null => {
  if (!value) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString())
    return typeof parsed.id === "string" && ["exception", "urgent", "nextAction", "eventAt", "date"].every((key) => Number.isFinite(parsed[key])) ? parsed : null
  } catch { return null }
}
const activeCorrelation = (row: any) => row.followingCorrelations?.length === 0 && !["RELEASE", "CANCEL"].includes(row.stockReservationEvidence?.kind) && row.stockReservation?.projection?.status === "ACTIVE" && decimal(row.stockReservation.projection.activeQuantity ?? 0).gt(0)

function candidateCte(companyId: string, query: Query) {
  const surgeryFilters = [Prisma.sql`s."companyId" = ${companyId}`, Prisma.sql`s."archivedAt" IS NULL`]
  if (query.branchId) surgeryFilters.push(Prisma.sql`s."branchId" = ${query.branchId}`)
  if (query.institutionId) surgeryFilters.push(Prisma.sql`s."institutionId" = ${query.institutionId}`)
  if (query.locality) surgeryFilters.push(Prisma.sql`EXISTS (SELECT 1 FROM "ContactAddress" institution_address WHERE institution_address."contactId" = s."institutionId" AND institution_address."isMain" = true AND LOWER(BTRIM(institution_address.city)) = ${query.locality})`)
  if (query.cxStatus) surgeryFilters.push(Prisma.sql`s."cxStatus" = ${query.cxStatus}`)
  if (query.prepStatus) surgeryFilters.push(Prisma.sql`s."prepStatus" = ${query.prepStatus}`)
  if (query.q) surgeryFilters.push(Prisma.sql`concat_ws(' ', s."visibleNumber", patient."firstName", patient."lastName", patient."legalName", doctor."firstName", doctor."lastName", payer."firstName", payer."lastName", payer."legalName", payer."tradeName", institution."legalName", institution."tradeName") ILIKE CONCAT('%', ${query.q}::text, '%')`)
  if (query.from) surgeryFilters.push(Prisma.sql`COALESCE(s."surgeryDate", s."scheduledDate") >= ${query.from}`)
  if (query.to) surgeryFilters.push(Prisma.sql`COALESCE(s."surgeryDate", s."scheduledDate") <= ${query.to}`)

  const candidateFilters: Prisma.Sql[] = []
  if (query.stage === "mixed") candidateFilters.push(Prisma.sql`f.stage_count > 1`)
  else if (query.stage === "unavailable") candidateFilters.push(Prisma.sql`f.stage_count = 0`)
  else if (query.stage === "prepare") candidateFilters.push(Prisma.sql`f.has_prepare = true`)
  else if (query.stage === "control") candidateFilters.push(Prisma.sql`f.has_control = true`)
  else if (query.stage === "dispatch") candidateFilters.push(Prisma.sql`f.has_dispatch = true`)
  else if (query.stage === "receive") candidateFilters.push(Prisma.sql`f.has_receive = true`)
  else if (query.stage === "return") candidateFilters.push(Prisma.sql`f.has_return = true`)
  else if (query.stage === "reconcile") candidateFilters.push(Prisma.sql`f.has_reconcile = true`)
  if (query.exception) candidateFilters.push(Prisma.sql`f.exception_highest = ${query.exception}`)
  if (query.priority) candidateFilters.push(Prisma.sql`f."priority" = ${query.priority}`)
  if (query.news !== undefined) candidateFilters.push(Prisma.sql`f.has_news = ${query.news}`)
  if (query.logisticsStatus === "unavailable") candidateFilters.push(Prisma.sql`f.remito_count = 0`)
  else if (query.logisticsStatus === "mixed") candidateFilters.push(Prisma.sql`f.remito_state_count > 1`)
  else if (query.logisticsStatus) candidateFilters.push(Prisma.sql`f.remito_state_count = 1 AND f.remito_state = ${query.logisticsStatus}`)
  if (query.hasBlockers !== undefined) candidateFilters.push(Prisma.sql`f.has_blockers = ${query.hasBlockers}`)

  return Prisma.sql`
    WITH news_events AS (
      SELECT ca.surgery_id, ae."createdAt" AS occurred_at, 0 AS source_priority, 'assignment:' || ca.id AS operation_key,
        'Preparación actualizada' AS label, NULLIF(concat_ws(' ', u."firstName", u."lastName"), '') AS responsible
      FROM "AuditEvent" ae JOIN cajas_assignment ca ON ca.company_id = ae."companyId" AND ca.id = ae."entityId"
      LEFT JOIN "User" u ON u.id = ae."userId"
      WHERE ae."companyId" = ${companyId} AND ae.action = 'assignment_preparation_accepted' AND ae.module = 'cajas'
      UNION ALL
      SELECT ca.surgery_id, ae."createdAt", 0, 'control:' || ae."entityId", 'Caja controlada', NULLIF(concat_ws(' ', u."firstName", u."lastName"), '')
      FROM "AuditEvent" ae JOIN cajas_assignment ca ON ca.company_id = ae."companyId" AND ca.id = (ae."newValue" ->> 'assignmentId')
      LEFT JOIN "User" u ON u.id = ae."userId"
      WHERE ae."companyId" = ${companyId} AND ae.action = 'cajas_control_accepted' AND ae.module = 'cajas'
      UNION ALL
      SELECT ca.surgery_id, ae."createdAt", 0, 'difference:' || ae."entityId", 'Diferencia actualizada', NULLIF(concat_ws(' ', u."firstName", u."lastName"), '')
      FROM "AuditEvent" ae JOIN cajas_assignment ca ON ca.company_id = ae."companyId" AND ca.id = (ae."newValue" ->> 'assignmentId')
      LEFT JOIN "User" u ON u.id = ae."userId"
      WHERE ae."companyId" = ${companyId} AND ae.action IN ('cajas_difference_resolved', 'physical_difference_acknowledged') AND ae.module = 'cajas'
      UNION ALL
      SELECT ca.surgery_id, ae."createdAt", 0, 'remito:' || cd.remito_id || ':Emitido', 'Despacho emitido', NULLIF(concat_ws(' ', u."firstName", u."lastName"), '')
      FROM "AuditEvent" ae JOIN cajas_dispatch cd ON cd.company_id = ae."companyId" AND cd.id = ae."entityId"
      JOIN cajas_assignment ca ON ca.company_id = cd.company_id AND ca.id = cd.assignment_id
      LEFT JOIN "User" u ON u.id = ae."userId"
       WHERE ae."companyId" = ${companyId} AND ae.action = 'C14_COMMAND_ACCEPTED' AND ae."entityType" = 'CAJAS_DISPATCH' AND ae.module = 'STOCK_CAJAS_C14'
      UNION ALL
      SELECT o.surgery_id, o.accepted_at, 0, 'phase-d:' || o.id,
        CASE WHEN o.kind = 'CONSUMPTION' THEN 'Material consumido' WHEN o.return_state = 'RECEIVED' THEN 'Material recibido' ELSE 'Devolución registrada' END,
        NULLIF(concat_ws(' ', u."firstName", u."lastName"), '')
      FROM cajas_phase_d_operation o LEFT JOIN "User" u ON u.id = o.accepted_by_id
      WHERE o.company_id = ${companyId} AND o.kind IN ('CONSUMPTION', 'RETURN')
      UNION ALL
      SELECT ca.surgery_id, e.accepted_at, 0, 'reconciliation:' || e.id,
        CASE WHEN e.kind = 'CLOSED' THEN 'Conciliación cerrada' ELSE 'Conciliación reabierta' END,
        NULLIF(concat_ws(' ', u."firstName", u."lastName"), '')
      FROM cajas_phase_d_reconciliation_event e JOIN cajas_dispatch_line dl ON dl.company_id = e.company_id AND dl.dispatch_id = e.dispatch_id
      JOIN cajas_assignment ca ON ca.company_id = dl.company_id AND ca.id = dl.assignment_id
      LEFT JOIN "User" u ON u.id = e.accepted_by_id
      WHERE e.company_id = ${companyId} AND e.kind IN ('CLOSED', 'REOPENED')
      UNION ALL
      SELECT r."surgeryId", r."updatedAt", 1, 'remito:' || r.id || ':' || r.state,
        CASE r.state WHEN 'Emitido' THEN 'Remito emitido' WHEN 'En_transito' THEN 'Remito en tránsito' WHEN 'Entregado' THEN 'Remito entregado' WHEN 'Anulado' THEN 'Remito anulado' END,
        NULLIF(concat_ws(' ', u."firstName", u."lastName"), '')
      FROM "Remito" r LEFT JOIN "User" u ON u.id = r."updatedById"
      WHERE r."companyId" = ${companyId} AND r."surgeryId" IS NOT NULL AND r."salidaReason" = 'cirugia' AND r.state IN ('Emitido', 'En_transito', 'Entregado', 'Anulado')
    ), deduped_news AS (
      SELECT DISTINCT ON (surgery_id, operation_key) surgery_id, occurred_at, source_priority, label, responsible
      FROM news_events ORDER BY surgery_id, operation_key, source_priority ASC, occurred_at DESC
    ), latest_news AS (
      SELECT DISTINCT ON (surgery_id) surgery_id, occurred_at, label, responsible
      FROM deduped_news ORDER BY surgery_id, occurred_at DESC, source_priority ASC
    ), facts AS (
      SELECT s."id", s."priority",
        (CASE WHEN remitos.remito_count = 0 THEN 1 ELSE 0 END + assignments.missing_trace_count + differences.open_count + phase_d.pending_identification_count) AS exception_count,
         CASE WHEN remitos.remito_count = 0 OR assignments.missing_trace_count > 0 THEN 'blocker'
             WHEN differences.open_count > 0 THEN 'difference'
             WHEN phase_d.pending_identification_count > 0 THEN 'pending_identification'
              ELSE NULL END AS exception_highest,
        remitos.remito_count,
        remitos.state_count AS remito_state_count,
        remitos.state AS remito_state,
        (remitos.remito_count = 0 OR assignments.missing_trace_count > 0) AS has_blockers,
        assignments.assignment_count > 0 AS has_prepare,
        differences.open_count > 0 AS has_control,
        dispatches.dispatch_count > 0 AS has_dispatch,
        phase_d.return_count > 0 AS has_receive,
        phase_d.return_count > 0 AS has_return,
        reconciliations.reconciliation_count > 0 AS has_reconcile,
        ((assignments.assignment_count > 0)::int + (differences.open_count > 0)::int + (dispatches.dispatch_count > 0)::int + 2 * (phase_d.return_count > 0)::int + (reconciliations.reconciliation_count > 0)::int) AS stage_count,
        latest_news.surgery_id IS NOT NULL AS has_news,
        latest_news.label AS last_novelty_label,
        latest_news.occurred_at AS last_novelty_at,
        latest_news.responsible AS last_novelty_responsible,
        0 AS next_action_rank,
        EXTRACT(EPOCH FROM GREATEST(COALESCE(remitos.event_at, 'epoch'::timestamptz), COALESCE(phase_d.event_at, 'epoch'::timestamptz), COALESCE(reconciliations.event_at, 'epoch'::timestamptz)))::bigint AS event_at_key,
        EXTRACT(EPOCH FROM COALESCE(s."surgeryDate", s."scheduledDate", 'epoch'::timestamptz))::bigint AS date_key
      FROM "Surgery" s
      LEFT JOIN "Contact" patient ON patient."id" = s."patientId"
      LEFT JOIN "Contact" doctor ON doctor."id" = s."doctorId"
      LEFT JOIN "Contact" payer ON payer."id" = s."payerContactId"
      LEFT JOIN "Contact" institution ON institution."id" = s."institutionId"
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS remito_count, count(DISTINCT r.state)::int AS state_count, min(r.state) AS state, max(r."updatedAt") AS event_at
        FROM "Remito" r
        WHERE r."companyId" = s."companyId" AND r."surgeryId" = s."id" AND r."salidaReason" = 'cirugia'
      ) remitos ON true
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS assignment_count,
          count(*) FILTER (WHERE siucc.id IS NULL OR siucc."internalCode" = '')::int AS missing_trace_count
        FROM cajas_assignment ca
        LEFT JOIN "StockIdentifiedUnitCurrentConfiguration" siucc ON siucc."companyId" = ca.company_id AND siucc."identifiedUnitId" = ca.box_identified_unit_id
        WHERE ca.company_id = s."companyId" AND ca.surgery_id = s."id" AND ca.active_slot = 1 AND ca.ended_at IS NULL
      ) assignments ON true
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS open_count
        FROM cajas_difference cd
        JOIN cajas_assignment ca ON ca.id = cd.assignment_id AND ca.company_id = cd.company_id
        WHERE cd.company_id = s."companyId" AND ca.surgery_id = s."id" AND NOT COALESCE((
          SELECT cdr.closes_difference FROM cajas_difference_resolution cdr
          WHERE cdr.difference_id = cd.id AND cdr.company_id = cd.company_id
          ORDER BY cdr.sequence DESC LIMIT 1
        ), false)
      ) differences ON true
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS dispatch_count
        FROM cajas_dispatch_line cdl
        JOIN cajas_assignment ca ON ca.id = cdl.assignment_id AND ca.company_id = cdl.company_id
        WHERE cdl.company_id = s."companyId" AND ca.surgery_id = s."id"
      ) dispatches ON true
      LEFT JOIN LATERAL (
        SELECT count(*) FILTER (WHERE cpo.kind = 'RETURN')::int AS return_count,
          count(*) FILTER (WHERE cpo.return_state = 'PENDING_IDENTIFICATION')::int AS pending_identification_count,
          max(cpo.accepted_at) AS event_at
        FROM cajas_phase_d_operation cpo
        WHERE cpo.company_id = s."companyId" AND cpo.surgery_id = s."id"
      ) phase_d ON true
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS reconciliation_count, max(cpre.accepted_at) AS event_at
        FROM cajas_phase_d_reconciliation_event cpre
        JOIN cajas_dispatch_line cdl ON cdl.dispatch_id = cpre.dispatch_id AND cdl.company_id = cpre.company_id
        JOIN cajas_assignment ca ON ca.id = cdl.assignment_id AND ca.company_id = cdl.company_id
        WHERE cpre.company_id = s."companyId" AND ca.surgery_id = s."id"
      ) reconciliations ON true
      LEFT JOIN latest_news ON latest_news.surgery_id = s."id"
      WHERE ${Prisma.join(surgeryFilters, " AND ")}
    ), candidate AS (
      SELECT * FROM facts f
      ${candidateFilters.length ? Prisma.sql`WHERE ${Prisma.join(candidateFilters, " AND ")}` : Prisma.empty}
    )`
}

function pageStatement(companyId: string, query: Query, after: InboxCursor | null) {
  const cursorFilter = after ? Prisma.sql`WHERE (
    c.exception_count < ${after.exception} OR
    (c.exception_count = ${after.exception} AND COALESCE((c."priority" = 'urgent')::int, 0) < ${after.urgent}) OR
    (c.exception_count = ${after.exception} AND COALESCE((c."priority" = 'urgent')::int, 0) = ${after.urgent} AND c.next_action_rank > ${after.nextAction}) OR
    (c.exception_count = ${after.exception} AND COALESCE((c."priority" = 'urgent')::int, 0) = ${after.urgent} AND c.next_action_rank = ${after.nextAction} AND c.event_at_key < ${after.eventAt}) OR
    (c.exception_count = ${after.exception} AND COALESCE((c."priority" = 'urgent')::int, 0) = ${after.urgent} AND c.next_action_rank = ${after.nextAction} AND c.event_at_key = ${after.eventAt} AND c.date_key < ${after.date}) OR
    (c.exception_count = ${after.exception} AND COALESCE((c."priority" = 'urgent')::int, 0) = ${after.urgent} AND c.next_action_rank = ${after.nextAction} AND c.event_at_key = ${after.eventAt} AND c.date_key = ${after.date} AND c.id > ${after.id})
  )` : Prisma.empty
  return Prisma.sql`${candidateCte(companyId, query)}
    SELECT c.id, c.exception_count AS "exception", COALESCE((c."priority" = 'urgent')::int, 0) AS urgent, c.next_action_rank AS "nextAction", c.event_at_key AS "eventAt", c.date_key AS date,
      c.last_novelty_label AS "lastNoveltyLabel", c.last_novelty_at AS "lastNoveltyAt", c.last_novelty_responsible AS "lastNoveltyResponsible"
    FROM candidate c ${cursorFilter}
    ORDER BY c.exception_count DESC, COALESCE((c."priority" = 'urgent')::int, 0) DESC, c.next_action_rank ASC, c.event_at_key DESC, c.date_key DESC, c.id ASC
    LIMIT ${query.limit + 1}`
}

function countStatement(companyId: string, query: Query) {
  return Prisma.sql`${candidateCte(companyId, query)}
    SELECT count(*) FILTER (WHERE has_news) AS news,
      count(*) FILTER (WHERE "priority" = 'urgent') AS urgent,
      count(*) FILTER (WHERE exception_count > 0) AS exceptions
    FROM candidate`
}

export async function getLogisticsGlobalInbox(db: Db, companyId: string, actor: Actor, query: Query) {
  const after = decodeCursor(query.cursor)
  if (query.cursor && !after) throw badRequest("cursor is invalid", "logistics_inbox_query_invalid")
  const [pageCandidates, countRows] = await Promise.all([
    db.$queryRaw(pageStatement(companyId, query, after)) as Promise<CandidateRow[]>,
    db.$queryRaw(countStatement(companyId, query)) as Promise<CountRow[]>,
  ])
  const pageRows = pageCandidates.slice(0, query.limit)
  const surgeryIds = pageRows.map((row) => row.id)
  if (!surgeryIds.length) return { generatedAt: new Date().toISOString(), counts: { news: Number(countRows[0]?.news ?? 0), urgent: Number(countRows[0]?.urgent ?? 0), overdue: null, exceptions: Number(countRows[0]?.exceptions ?? 0) }, availability: { overdue: "unavailable" as const }, items: [], page: { nextCursor: null, hasMore: false } }

  const [surgeries, remitos, assignments, operations, grants] = await Promise.all([
    db.surgery.findMany({ where: { companyId, id: { in: surgeryIds }, archivedAt: null }, include: { patient: true, doctor: true, payer: true, institution: { include: { addresses: { where: { isMain: true }, take: 1 } } } } }),
    db.remito.findMany({ where: { companyId, surgeryId: { in: surgeryIds }, salidaReason: "cirugia" } }),
    db.cajasAssignment.findMany({ where: { companyId, surgeryId: { in: surgeryIds }, activeSlot: 1, endedAt: null }, include: { boxIdentifiedUnit: { include: { currentConfiguration: true } }, preparations: { include: { lines: true, latestControl: true }, orderBy: { version: "desc" } } } }),
    db.cajasPhaseDOperation.findMany({ where: { companyId, surgeryId: { in: surgeryIds } } }),
    db.cajasPhaseDActionGrant.findMany({ where: { companyId, userId: actor.actorUserId }, select: { action: true } }),
  ])
  const assignmentIds = assignments.map((assignment: any) => assignment.id)
  const [correlations, dispatchLines, differences] = await Promise.all([
    db.cajasReservationCorrelation.findMany({ where: { companyId, assignmentId: { in: assignmentIds } }, include: { followingCorrelations: { select: { id: true } }, stockReservationEvidence: true, stockReservation: { include: { projection: true } } } }),
    db.cajasDispatchLine.findMany({ where: { companyId, assignmentId: { in: assignmentIds } } }),
    db.cajasDifference.findMany({ where: { companyId, assignmentId: { in: assignmentIds } }, include: { resolutions: { orderBy: { sequence: "desc" }, take: 1 } } }),
  ])
  const dispatchIds = [...new Set<string>(dispatchLines.map((line: any) => line.dispatchId).filter((id: unknown): id is string => typeof id === "string"))]
  const [reconciliations, reconciliationLines, reconciliationOperations] = dispatchIds.length ? await Promise.all([
    db.cajasPhaseDReconciliationEvent.findMany({ where: { companyId, dispatchId: { in: dispatchIds } }, orderBy: { acceptedAt: "asc" } }),
    db.cajasDispatchLine.findMany({ where: { companyId, dispatchId: { in: dispatchIds } }, select: { id: true, dispatchId: true, quantity: true } }),
    db.cajasPhaseDOperation.findMany({ where: { companyId, dispatchId: { in: dispatchIds } }, select: { id: true, dispatchId: true, dispatchLineId: true, quantity: true, returnState: true, sourceOperationId: true } }),
  ]) : [[], [], []]
  const reconciliationByDispatch = new Map(dispatchIds.map((dispatchId) => [dispatchId, reconciliationTotals(reconciliationLines.filter((line: any) => line.dispatchId === dispatchId), reconciliationOperations.filter((operation: any) => operation.dispatchId === dispatchId))]))
  const grantsSet = new Set(grants.map((grant: any) => String(grant.action)))
  const surgeryById = new Map(surgeries.map((surgery: any) => [surgery.id, surgery]))
  const candidateById = new Map(pageRows.map((row) => [row.id, row]))
  const items = surgeryIds.flatMap((surgeryId) => {
    const surgery: any = surgeryById.get(surgeryId)
    if (!surgery) return []
    const surgeryAssignments = assignments.filter((assignment: any) => assignment.surgeryId === surgery.id)
    const ids = new Set(surgeryAssignments.map((assignment: any) => assignment.id))
    const activeCorrelations = correlations.filter((correlation: any) => ids.has(correlation.assignmentId) && activeCorrelation(correlation))
    const surgeryRemitos = remitos.filter((remito: any) => remito.surgeryId === surgery.id)
    const remitoStates = [...new Set(surgeryRemitos.map((remito: any) => remito.state))]
    const logisticsStatus = !surgeryRemitos.length ? "unavailable" : remitoStates.length === 1 ? remitoStates[0] : "mixed"
    const lines = dispatchLines.filter((line: any) => ids.has(line.assignmentId))
    const dispatchLineIds = new Set(lines.map((line: any) => line.id))
    const surgeryOperations = operations.filter((operation: any) => dispatchLineIds.has(operation.dispatchLineId) || operation.surgeryId === surgery.id)
    const surgeryDifferences = differences.filter((difference: any) => ids.has(difference.assignmentId))
    const openDifferences = surgeryDifferences.filter((difference: any) => !difference.resolutions?.[0]?.closesDifference)
    const expected = sum(surgeryAssignments.flatMap((assignment: any) => assignment.preparations?.[0]?.lines?.filter((line: any) => line.role === "EXPECTED") ?? []))
    const assigned = sum(activeCorrelations); const dispatched = sum(lines)
    const consumed = sum(surgeryOperations.filter((operation: any) => operation.kind === "CONSUMPTION"))
    const returned = sum(surgeryOperations.filter((operation: any) => operation.kind === "RETURN" && decimal(operation.quantity).gt(0)))
    const pending = Prisma.Decimal.max(dispatched.minus(consumed).minus(returned), new Prisma.Decimal(0))
    const quarantine = sum(surgeryOperations.filter((operation: any) => operation.returnState === "PENDING_IDENTIFICATION"))
    const blockers = [!surgeryRemitos.length && "missing_remito_lineage", ...surgeryAssignments.filter((assignment: any) => !assignment.boxIdentifiedUnit?.currentConfiguration?.internalCode).map(() => "missing_trace")].filter(Boolean) as string[]
    const hasReturns = surgeryOperations.some((operation: any) => operation.kind === "RETURN")
    const surgeryDispatchIds = new Set<string>(lines.map((line: any) => String(line.dispatchId)))
    const surgeryReconciliations = reconciliations.filter((event: any) => surgeryDispatchIds.has(event.dispatchId))
    const stages = [surgeryAssignments.length && "prepare", openDifferences.length && "control", lines.length && "dispatch", hasReturns && "receive", hasReturns && "return", surgeryReconciliations.length && "reconcile"].filter(Boolean) as string[]
    const availability = blockers.length ? "partial" : surgeryAssignments.length || surgeryRemitos.length ? "available" : "unavailable"
    const highest = blockers.length ? "blocker" : openDifferences.length ? "difference" : quarantine.gt(0) ? "pending_identification" : availability === "partial" ? "partial" : null
    const actionableAssignments = surgeryAssignments.filter((assignment: any) => !lines.some((line: any) => line.assignmentId === assignment.id))
    const hasDispatch = lines.length > 0
    const awaitingReceipt = surgeryOperations.some((operation: any) => operation.kind === "RETURN" && operation.returnState !== "RECEIVED")
    const reconcileReady = [...surgeryDispatchIds].some((dispatchId) => reconciliationByDispatch.get(dispatchId)?.closeEligible && surgeryReconciliations.filter((event: any) => event.dispatchId === dispatchId).at(-1)?.kind !== "CLOSED")
    const capabilities = { prepare: STOCK_OPERATION_ROLES.includes(actor.role as never) && actionableAssignments.length > 0 ? "available" : "unavailable", dispatch: CAJAS_DISPATCH_ACTION_ROLES.includes(actor.role as never) && actionableAssignments.length > 0 ? "available" : "unavailable", receive: grantsSet.has("RECEIVE_CONTROL") && awaitingReceipt ? "available" : "unavailable", return: grantsSet.has("REGISTER_RETURN") && hasDispatch && pending.gt(0) ? "available" : "unavailable", reconcile: grantsSet.has("CLOSE_RECONCILIATION") && reconcileReady ? "available" : "unavailable" } as const
    const novelty = candidateById.get(surgery.id)
    return [{ surgery: { reference: surgery.visibleNumber ?? null, date: iso(surgery.surgeryDate ?? surgery.scheduledDate), patient: name(surgery.patient), doctor: name(surgery.doctor), client: name(surgery.payer), institution: name(surgery.institution), institutionId: surgery.institution?.id ?? null, locality: surgery.institution?.addresses?.[0]?.city ?? null, surgeryStatus: surgery.cxStatus ?? null, preparationStatus: surgery.prepStatus ?? null, logisticsStatus, priority: surgery.priority ?? null }, logistics: { stages: stages.length ? stages : availability === "unavailable" ? "unavailable" : "mixed", cajas: surgeryAssignments.length ? surgeryAssignments.map((assignment: any) => ({ reference: assignment.boxIdentifiedUnit?.currentConfiguration?.internalCode ?? "unavailable" })) : "unavailable", materials: { count: lines.length, availability: availability === "available" ? "available" : availability }, quantities: { expected: expected.toString(), assigned: assigned.toString(), dispatched: dispatched.toString(), consumed: consumed.toString(), returned: returned.toString(), pending: pending.toString(), quarantine: quarantine.toString() }, availability, blockers: { count: blockers.length, highest: blockers[0] ?? null }, differences: { open: openDifferences.length, closed: surgeryDifferences.length - openDifferences.length }, alerts: { count: quarantine.gt(0) ? 1 : 0, highest: quarantine.gt(0) ? "pending_identification" : null }, exceptions: { count: blockers.length + openDifferences.length + (quarantine.gt(0) ? 1 : 0), highest }, lastNovelty: novelty?.lastNoveltyLabel && novelty.lastNoveltyAt ? { label: novelty.lastNoveltyLabel, at: iso(novelty.lastNoveltyAt)!, responsible: novelty.lastNoveltyResponsible || null } : null, nextAction: null, indicators: { prepare: surgeryAssignments.length ? "ready" : "unavailable", dispatch: surgeryRemitos.length ? "ready" : "pending", receive: hasReturns ? "pending" : "unavailable", return: hasDispatch && pending.gt(0) ? "pending" : "unavailable", reconcile: hasDispatch ? "pending" : "unavailable" }, capabilities }, transition: null }]
  })
  const hydratedSurgeryIds = surgeryIds.filter((surgeryId) => surgeryById.has(surgeryId))
  const navigableItems = items.map((item, index) => ({ ...item, surgery: { ...item.surgery, id: hydratedSurgeryIds[index] } }))
  const hasMore = pageCandidates.length > query.limit
  const last = pageRows.at(-1) as (CandidateRow & Omit<InboxCursor, "id">) | undefined
  return { generatedAt: new Date().toISOString(), counts: { news: Number(countRows[0]?.news ?? 0), urgent: Number(countRows[0]?.urgent ?? 0), overdue: null, exceptions: Number(countRows[0]?.exceptions ?? 0) }, availability: { overdue: "unavailable" as const }, items: navigableItems, page: { nextCursor: hasMore && last ? cursor({ id: last.id, exception: Number(last.exception), urgent: Number(last.urgent), nextAction: Number(last.nextAction), eventAt: Number(last.eventAt), date: Number(last.date) }) : null, hasMore } }
}
