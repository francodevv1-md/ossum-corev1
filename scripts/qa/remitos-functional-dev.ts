// Bounded, opt-in acceptance. Creates identifiable synthetic records; never cleans up.
import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import path from "node:path"
import { loadEnvConfig } from "@next/env"
import type { RemitoApiRow } from "../../src/lib/api/remitos"

async function main() {
  assert(![process.env.NODE_ENV, process.env.APP_ENV, process.env.VERCEL_ENV].some((v) => v === "production" || v === "staging"), "DEV only")
  const loaded = loadEnvConfig(process.cwd(), true, { info() {}, error() {} })
  const runtime = new URL(loaded.combinedEnv.DATABASE_URL ?? "")
  const publicProject = new URL(loaded.combinedEnv.NEXT_PUBLIC_SUPABASE_URL ?? "")
  const reference = publicProject.hostname.split(".")[0]
  assert(runtime.hostname === `db.${publicProject.hostname}` || runtime.username.split(".").pop() === reference, "Runtime project mismatch")
  const fingerprint = createHash("sha256").update([runtime.hostname, runtime.port || "5432", runtime.pathname, runtime.username].join("|")).digest("hex").slice(0, 20)
  const args = process.argv.slice(2)
  const execute = args[0] === "--execute"
  assert(args.length === (execute ? 2 : 1) && (execute || args[0] === "--preflight"), "Use --preflight or --execute <approved-target-fingerprint>")
  if (execute) {
    assert.equal(path.resolve(process.cwd()).toLowerCase(), "e:\\ossum_cor_antigravity\\ux-ui", "Approved worktree required")
    assert.equal(args[1], fingerprint, "Approved target fingerprint required")
    assert.equal(process.env.OSSUM_REMITOS_DEV_ACCEPTANCE, "approved-disposable-dev", "Explicit DEV acceptance opt-in required")
  }
  const { Pool } = await import("pg")
  const preflight = new Pool({ connectionString: runtime.href, max: 1, connectionTimeoutMillis: 10_000, statement_timeout: 10_000 })
  try {
    const required = ["Remito", "RemitoItem", "Surgery", "cajas_assignment", "cajas_dispatch", "stock_movement"]
    const result = await preflight.query("SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = ANY($2::text[])", ["public", required])
    assert.equal(result.rows.length, required.length, "Required backend tables missing")
    console.log(JSON.stringify({ check: "effective-target-and-schema", status: "PASS", fingerprint, envFiles: loaded.loadedEnvFiles.map((f) => f.path) }))
  } finally { await preflight.end() }
  if (!execute) return

  // Import the real runtime and handlers only after the target and opt-in gates.
  const { default: db, prismaPool } = await import("../../src/lib/prisma")
  const collection = await import("../../src/app/api/companies/[companyId]/remitos/route")
  const detail = await import("../../src/app/api/companies/[companyId]/remitos/[remitoId]/route")
  const emission = await import("../../src/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route")
  const state = await import("../../src/app/api/companies/[companyId]/remitos/[remitoId]/state/route")
  const prefix = `qa-remitos-cx-${Date.now()}-${randomUUID().slice(0, 8)}`
  const ids = { organizationId: `${prefix}-org`, companyId: `${prefix}-company`, foreignCompanyId: `${prefix}-foreign`, branchId: `${prefix}-branch`, userId: `${prefix}-actor`, viewerId: `${prefix}-viewer`, patientId: `${prefix}-patient`, surgeryId: `${prefix}-surgery`, foreignSurgeryId: `${prefix}-foreign-surgery` }
  const pass = (check: string) => console.log(JSON.stringify({ check, status: "PASS" }))
  console.log(JSON.stringify({ syntheticFixtures: ids, cleanup: "NOT AUTHORIZED; records retained" }))

  type Handler = (request: Request, context: { params: Promise<any> }) => Promise<Response>
  const call = async <T = RemitoApiRow>(handler: Handler, method: string, companyId: string, suffix = "", body?: unknown, actor: string | null = ids.userId, expected = 200) => {
    const headers = new Headers()
    if (actor) headers.set("x-ossum-actor-user-id", actor)
    if (body !== undefined) headers.set("Content-Type", "application/json")
    const request = new Request(`http://localhost/api/companies/${companyId}/remitos${suffix}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
    const response = await handler(request, { params: Promise.resolve({ companyId, remitoId: suffix.split(/[/?]/)[1] }) })
    const parsed = await response.json() as { data: T; error?: { code?: string } }
    assert.equal(response.status, expected, `API ${method} ${suffix || "/"}: ${parsed.error?.code ?? "unexpected status"}`)
    return parsed
  }
  const draftPayload = { branchId: ids.branchId, surgeryId: ids.surgeryId, origin: "manual", salidaReason: "cirugia", destinatarioSnapshot: { nombre: "Synthetic Remitos QA recipient" }, items: [{ sku: `${prefix}-manual`, description: "Synthetic manual line", quantity: "1.2500", unit: "u" }] }
  try {
    await db.$transaction(async (tx) => {
      await tx.organization.create({ data: { id: ids.organizationId, name: "Synthetic Remitos QA", slug: prefix } })
      await tx.company.createMany({ data: [ids.companyId, ids.foreignCompanyId].map((id) => ({ id, organizationId: ids.organizationId, name: id })) })
      await tx.branch.create({ data: { id: ids.branchId, companyId: ids.companyId, name: "Synthetic Remitos QA branch" } })
      await tx.user.createMany({ data: [ids.userId, ids.viewerId].map((id) => ({ id, email: `${id}@ossum.test`, firstName: "Synthetic", lastName: "Remitos QA", supabaseAuthId: `${id}-local-only` })) })
      await tx.userCompanyAccess.createMany({ data: [{ userId: ids.userId, companyId: ids.companyId, role: "admin" }, { userId: ids.userId, companyId: ids.foreignCompanyId, role: "admin" }, { userId: ids.viewerId, companyId: ids.companyId, role: "viewer" }] })
      await tx.contact.create({ data: { id: ids.patientId, firstName: "Synthetic Remitos QA patient" } })
      await tx.contactCompanyLink.create({ data: { contactId: ids.patientId, companyId: ids.companyId, role: "patient" } })
      await tx.surgery.createMany({ data: [{ id: ids.surgeryId, companyId: ids.companyId, branchId: ids.branchId, patientId: ids.patientId, visibleNumber: `${prefix}-CX`, cxStatus: "pending" }, { id: ids.foreignSurgeryId, companyId: ids.foreignCompanyId, patientId: ids.patientId, visibleNumber: `${prefix}-FOREIGN-CX`, cxStatus: "pending" }] })
    }, { maxWait: 15_000, timeout: 30_000 })
    pass("synthetic-fixtures-created")
    await call(collection.GET, "GET", ids.companyId, "", undefined, null, 401)
    await call(collection.POST, "POST", ids.companyId, "", draftPayload, ids.viewerId, 403)
    await call(collection.POST, "POST", ids.companyId, "", { ...draftPayload, items: [{ description: "Invalid quantity", quantity: 0 }] }, ids.userId, 400)
    await call(collection.POST, "POST", ids.companyId, "", { ...draftPayload, surgeryId: ids.foreignSurgeryId }, ids.userId, 404)
    assert.equal(await db.remito.count({ where: { companyId: ids.companyId } }), 0)
    pass("real-auth-permissions-validation-and-foreign-surgery-denied")

    const { data: draft } = await call(collection.POST, "POST", ids.companyId, "", draftPayload, ids.userId, 201)
    assert.equal(draft.state, "Borrador")
    assert.equal(draft.visibleNumber, null)
    assert.equal(draft.surgeryId, ids.surgeryId)
    console.log(JSON.stringify({ manualRemitoId: draft.id }))
    const { data: current } = await call(detail.GET, "GET", ids.companyId, `/${draft.id}`)
    assert.equal(current.items[0].quantity, "1.25")
    const { data: edited } = await call(detail.PATCH, "PATCH", ids.companyId, `/${draft.id}`, { expectedUpdatedAt: current.updatedAt, metadata: { syntheticAcceptance: prefix } })
    await call(detail.PATCH, "PATCH", ids.companyId, `/${draft.id}`, { expectedUpdatedAt: current.updatedAt, metadata: { stale: true } }, ids.userId, 409)
    assert.equal(edited.state, "Borrador")
    await call(state.PATCH, "PATCH", ids.companyId, `/${draft.id}/state`, { state: "Emitido" }, ids.userId, 409)
    pass("draft-persistence-edit-and-stale-write-protection")

    const { data: emitted } = await call(emission.POST, "POST", ids.companyId, `/${draft.id}/emitir`)
    assert.equal(emitted.state, "Emitido")
    assert.equal(emitted.visibleNumber, 1)
    assert(emitted.issuedAt)
    await call(emission.POST, "POST", ids.companyId, `/${draft.id}/emitir`, undefined, ids.userId, 409)
    await call(detail.PATCH, "PATCH", ids.companyId, `/${draft.id}`, { metadata: { forbidden: true } }, ids.userId, 409)
    const { data: reloaded } = await call(detail.GET, "GET", ids.companyId, `/${draft.id}`)
    assert.equal(reloaded.visibleNumber, emitted.visibleNumber)
    assert.equal(reloaded.issuedAt, emitted.issuedAt)
    assert.deepEqual(reloaded.destinatarioSnapshot, draftPayload.destinatarioSnapshot)
    const { data: second } = await call(collection.POST, "POST", ids.companyId, "", draftPayload, ids.userId, 201)
    const { data: secondEmitted } = await call(emission.POST, "POST", ids.companyId, `/${second.id}/emitir`)
    assert.equal(secondEmitted.visibleNumber, 2)
    const { data: linked } = await call<RemitoApiRow[]>(collection.GET, "GET", ids.companyId, `?surgeryId=${ids.surgeryId}`)
    assert.equal(linked.length, 2)
    assert(linked.every((r) => r.surgeryId === ids.surgeryId && r.companyId === ids.companyId))
    assert.equal((await call<RemitoApiRow[]>(collection.GET, "GET", ids.companyId, `?surgeryId=${prefix}-CX`)).data.length, 0)
    await call(detail.GET, "GET", ids.foreignCompanyId, `/${draft.id}`, undefined, ids.userId, 404)
    assert.equal((await call<RemitoApiRow[]>(collection.GET, "GET", ids.foreignCompanyId, `?surgeryId=${ids.surgeryId}`)).data.length, 0)
    assert.equal(await db.stockMovement.count({ where: { companyId: ids.companyId } }), 0)
    const actions = (await db.auditEvent.findMany({ where: { companyId: ids.companyId, entityId: draft.id }, select: { action: true } })).map((a) => a.action)
    for (const action of ["remito.created", "remito.draft_updated", "remito.issued"]) assert(actions.includes(action))
    pass("numbering-issued-snapshots-reload-multiple-remitos-tenant-isolation-audit")
    pass("manual-issuance-does-not-invent-stock-dispatch")

    const formula = await import("../../src/lib/services/cajas-formula.service")
    const physical = await import("../../src/lib/services/stock-physical-unit.service")
    const assignment = await import("../../src/lib/services/cajas-assignment.service")
    const selection = await import("../../src/lib/services/cajas-component-selection.service")
    const reservation = await import("../../src/lib/services/stock-reservation.service")
    const controlService = await import("../../src/lib/services/cajas-control.service")
    const ledger = await import("../../src/lib/services/stock-ledger.service")
    const validators = await import("../../src/lib/validators/cajas-assignment")
    const formulaValidator = await import("../../src/lib/validators/cajas-formula")
    const unitValidator = await import("../../src/lib/validators/stock-physical-unit")
    const box = await db.article.create({ data: { organizationId: ids.organizationId, sku: `${prefix}-box`, description: "Synthetic Remitos QA box", articleType: "Caja" } })
    const component = await db.article.create({ data: { organizationId: ids.organizationId, sku: `${prefix}-component`, description: "Synthetic Remitos QA component" } })
    await db.stockArticleEligibility.createMany({ data: [box, component].map((a) => ({ companyId: ids.companyId, organizationId: ids.organizationId, articleId: a.id, version: 1 })) })
    await formula.createBoxFormula(db, ids.companyId, formulaValidator.cajasFormulaCreateSchema.parse({ articleId: box.id, lines: [{ articleId: component.id, expectedQuantity: 1, unit: "u" }], cause: "Synthetic Remitos QA" }), ids.userId)
    const movement = await ledger.recordStockMovement(db, { companyId: ids.companyId, articleId: component.id, movementType: "RECEIPT_IN", quantity: 1, location: "synthetic-remitos-qa-shelf", idempotencyKey: `${prefix}-receipt`, createdById: ids.userId })
    const unit = await physical.createStockPhysicalUnit(db, ids.companyId, unitValidator.stockPhysicalUnitCreateSchema.parse({ articleId: box.id, unitCode: `${prefix}-unit` }), ids.userId)
    const assigned = await assignment.assignBoxToSurgery(db, ids.companyId, ids.surgeryId, validators.cajasAssignmentCreateSchema.parse({ physicalUnitId: unit.id, idempotencyKey: `${prefix}-assign` }), ids.userId)
    assert(assigned.preparation)
    const preparationLineId = assigned.preparation.lines[0].id
    await selection.selectCajasComponent(db, ids.companyId, preparationLineId, validators.cajasComponentSelectionSchema.parse({ sourceMovementId: movement.id, quantity: 1, expectedVersion: assigned.preparation.version, idempotencyKey: `${prefix}-select`, cause: "Synthetic Remitos QA" }), ids.userId)
    const selected = await assignment.getBoxAssignment(db, ids.companyId, assigned.id)
    assert(selected.preparation)
    const version = selected.preparation.version
    await reservation.reserveAssignedBox(db, ids.companyId, assigned.id, ids.userId, validators.cajasReservationSchema.parse({ expectedVersion: version, idempotencyKey: `${prefix}-reserve`, cause: "Synthetic Remitos QA" }))
    const { data: dispatchDraft } = await call(collection.POST, "POST", ids.companyId, "", { ...draftPayload, origin: "box", metadata: { cajas: { assignmentId: assigned.id } }, items: [{ itemId: component.id, description: component.description, quantity: "0.5", unit: "u" }] }, ids.userId, 201)
    console.log(JSON.stringify({ cajasRemitoId: dispatchDraft.id, assignmentId: assigned.id, preparationLineId }))
    const intent = { cajasDispatch: { assignmentId: assigned.id, expectedVersion: version, idempotencyKey: `${prefix}-dispatch`, lines: [{ preparationLineId, remitoItemId: dispatchDraft.items[0].id, quantity: 0.5 }] } }
    await call(emission.POST, "POST", ids.companyId, `/${dispatchDraft.id}/emitir`, undefined, ids.userId, 400)
    await call(emission.POST, "POST", ids.companyId, `/${dispatchDraft.id}/emitir`, intent, ids.userId, 409)
    assert.equal((await db.remito.findUniqueOrThrow({ where: { id: dispatchDraft.id } })).visibleNumber, null)
    assert.equal(await db.stockMovement.count({ where: { companyId: ids.companyId, movementType: "DISPATCH_OUT" } }), 0)
    pass("missing-intent-and-uncontrolled-cajas-emission-roll-back")
    const controlled = await controlService.confirmCajasControl(db, ids.companyId, assigned.id, "Synthetic Remitos QA control", ids.userId)
    assert.equal(controlled.result, "clean")
    const { data: dispatched } = await call(emission.POST, "POST", ids.companyId, `/${dispatchDraft.id}/emitir`, intent)
    assert.equal(dispatched.visibleNumber, 3)
    const stockWhere = { companyId: ids.companyId, remitoId: dispatchDraft.id, movementType: "DISPATCH_OUT" as const }
    const effects = await db.stockMovement.findMany({ where: stockWhere })
    assert.equal(effects.length, 1)
    assert.equal(effects[0].quantity.toString(), "0.5")
    assert.equal(effects[0].location, "synthetic-remitos-qa-shelf")
    assert.equal(effects[0].surgeryId, ids.surgeryId)
    assert.equal(effects[0].remitoItemId, dispatchDraft.items[0].id)
    const reserved = await db.stockReservation.findFirstOrThrow({ where: { companyId: ids.companyId, preparationLineId } })
    assert.equal(reserved.remainingQuantity.toString(), "0.5")
    const accounting = await db.cajasDispatchLineAccounting.findFirstOrThrow({ where: { companyId: ids.companyId } })
    assert.equal(accounting.pendingQuantity.toString(), "0.5")
    const replay = await call(emission.POST, "POST", ids.companyId, `/${dispatchDraft.id}/emitir`, intent)
    assert.equal(replay.data.visibleNumber, dispatched.visibleNumber)
    assert.equal(replay.data.issuedAt, dispatched.issuedAt)
    assert.equal(await db.stockMovement.count({ where: stockWhere }), 1)
    assert.equal(await db.cajasDispatch.count({ where: { companyId: ids.companyId, remitoId: dispatchDraft.id } }), 1)
    assert.equal((await db.stockReservation.findUniqueOrThrow({ where: { id: reserved.id } })).remainingQuantity.toString(), "0.5")
    await call(emission.POST, "POST", ids.companyId, `/${dispatchDraft.id}/emitir`, { cajasDispatch: { ...intent.cajasDispatch, lines: [{ ...intent.cajasDispatch.lines[0], quantity: 0.25 }] } }, ids.userId, 409)
    pass("cajas-persistent-stock-linkage-partial-balance-and-exact-replay")
    console.log(JSON.stringify({ status: "PASS", fixturePrefix: prefix, remitoIds: [draft.id, second.id, dispatchDraft.id], transport: "real Request/Response handlers with existing DEV identity resolver; no Auth mocks", browser: "NOT RUN", cleanup: "NOT RUN" }))
  } finally {
    await db.$disconnect()
    await prismaPool.end()
  }
}

main().catch((error) => {
  // Never print driver errors, connection strings, environment values or stack traces.
  console.error(JSON.stringify({ status: "FAIL", code: error?.code ?? "acceptance_failed", assertion: error?.code === "ERR_ASSERTION" ? error.message : undefined }))
  process.exitCode = 1
})
