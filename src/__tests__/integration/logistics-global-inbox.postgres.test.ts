import type { Prisma, PrismaClient } from "@prisma/client"
import { config as loadEnv } from "dotenv"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createRemitoTokenKeyring } from "@/lib/remito-verification/token"
import { authorize, WCB06_CONTRACT_IDS } from "@/lib/permissions/c14/authorize-insert-writer"
import { assignAndPrepareCajas } from "@/lib/services/cajas-assignment-preparation.service"
import { acceptCajasControl } from "@/lib/services/cajas-control.service"
import { getLogisticsGlobalInbox } from "@/lib/services/logistics-global-inbox-read.service"
import { createRemito, emitirRemito } from "@/lib/services/remito.service"
import { validateLogisticsGlobalInboxQuery } from "@/lib/validators/logistics-global-inbox-read"

const RUN_FLAG = "OSSUM_RUN_LOGISTICS_GLOBAL_INBOX_DEV_INTEGRATION"
const DEV_PROJECT_REF = "yywqcdromnmmelijvspi"
if (process.env[RUN_FLAG] === "true") {
  loadEnv({ path: ".env.local", override: false })
  loadEnv({ path: ".env", override: false })
}

const integrationDescribe = process.env[RUN_FLAG] === "true" ? describe : describe.skip
let prisma: PrismaClient | undefined
let ids: { organizationId: string; companyId: string; otherCompanyId: string; userId: string; contactIds: string[]; surgeryIds: string[]; remitoIds: string[] } | undefined

const query = (value = "") => validateLogisticsGlobalInboxQuery(new URL(`http://test?${value}`).searchParams)
const actor = () => ({ actorUserId: ids!.userId, role: "viewer" })
const rollbackSentinel = "global-inbox-test-rollback"

async function rollbackOnly(run: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await prisma!.$transaction(async (tx) => {
      await run(tx)
      throw new Error(rollbackSentinel)
    }, { timeout: 30_000 })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== rollbackSentinel) throw error
  }
}

function assertDisposableDevTarget() {
  if (process.env.OSSUM_DEPLOYMENT_TIER !== "development" || process.env.NODE_ENV === "production") throw new Error("Global inbox integration refused: explicit DEV gate is not satisfied")
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("Global inbox integration refused: DATABASE_URL is missing")
  const database = new URL(databaseUrl)
  if (!database.hostname.includes(DEV_PROJECT_REF) && !database.username.includes(DEV_PROJECT_REF)) throw new Error("Global inbox integration refused: database is not the approved DEV project")
}

async function seed() {
  const token = `inbox-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const organization = await prisma!.organization.create({ data: { name: token, slug: token } })
  const [company, otherCompany] = await Promise.all([
    prisma!.company.create({ data: { organizationId: organization.id, name: `${token}-a`, taxId: "30-12345678-9" } }),
    prisma!.company.create({ data: { organizationId: organization.id, name: `${token}-b` } }),
  ])
  const user = await prisma!.user.create({ data: { email: `${token}@example.test`, firstName: "Runtime", lastName: "Operator" } })
  const contacts = await prisma!.contact.createManyAndReturn({ data: [
    { firstName: `${token} Urgent` }, { firstName: `${token} Normal` }, { firstName: `${token} Empty` }, { firstName: `${token} Other` },
  ] })
  const at = (seconds: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, seconds))
  const surgeries = await Promise.all([
    prisma!.surgery.create({ data: { companyId: company.id, patientId: contacts[0].id, visibleNumber: `${token}-urgent`, cxStatus: "scheduled", prepStatus: "ready", priority: "urgent", surgeryDate: at(1) } }),
    prisma!.surgery.create({ data: { companyId: company.id, patientId: contacts[1].id, visibleNumber: `${token}-normal`, cxStatus: "pending", prepStatus: "draft", surgeryDate: at(2) } }),
    prisma!.surgery.create({ data: { companyId: company.id, patientId: contacts[2].id, visibleNumber: `${token}-empty`, cxStatus: "scheduled", prepStatus: "ready", surgeryDate: at(3) } }),
    prisma!.surgery.create({ data: { companyId: otherCompany.id, patientId: contacts[3].id, visibleNumber: `${token}-other`, cxStatus: "scheduled", prepStatus: "ready", priority: "urgent", surgeryDate: at(4) } }),
  ])
  const remitos = await Promise.all([
    prisma!.remito.create({ data: { companyId: company.id, surgeryId: surgeries[0].id, origin: "manual", salidaReason: "cirugia", state: "Emitido", updatedById: user.id, updatedAt: at(10) } }),
    prisma!.remito.create({ data: { companyId: company.id, surgeryId: surgeries[0].id, origin: "manual", salidaReason: "cirugia", state: "En_transito", updatedById: user.id, updatedAt: at(11) } }),
    prisma!.remito.create({ data: { companyId: company.id, surgeryId: surgeries[1].id, origin: "manual", salidaReason: "cirugia", state: "Entregado", updatedById: user.id, updatedAt: at(20) } }),
    prisma!.remito.create({ data: { companyId: otherCompany.id, surgeryId: surgeries[3].id, origin: "manual", salidaReason: "cirugia", state: "Emitido", updatedById: user.id, updatedAt: at(30) } }),
  ])
  return { organizationId: organization.id, companyId: company.id, otherCompanyId: otherCompany.id, userId: user.id, contactIds: contacts.map(({ id }) => id), surgeryIds: surgeries.map(({ id }) => id), remitoIds: remitos.map(({ id }) => id) }
}

async function cleanup() {
  if (!ids || !prisma) return
  await prisma.remito.deleteMany({ where: { id: { in: ids.remitoIds } } })
  await prisma.surgery.deleteMany({ where: { id: { in: ids.surgeryIds } } })
  await prisma.contact.deleteMany({ where: { id: { in: ids.contactIds } } })
  await prisma.user.delete({ where: { id: ids.userId } })
  await prisma.company.deleteMany({ where: { id: { in: [ids.companyId, ids.otherCompanyId] } } })
  await prisma.organization.delete({ where: { id: ids.organizationId } })
}

integrationDescribe("Global logistics inbox PostgreSQL CTE", () => {
  beforeAll(async () => {
    assertDisposableDevTarget()
    prisma = (await import("@/lib/prisma")).default
    ids = await seed()
  })

  afterAll(async () => {
    await cleanup()
    await prisma?.$disconnect()
  })

  it("keeps tenants isolated, parameterizes hostile search text, and has no write effect while reading", async () => {
    const before = await Promise.all([prisma!.surgery.count({ where: { id: { in: ids!.surgeryIds } } }), prisma!.remito.count({ where: { id: { in: ids!.remitoIds } } })])
    const result = await getLogisticsGlobalInbox(prisma, ids!.companyId, actor(), query(`q=${encodeURIComponent("%' OR 1=1 --")}`))
    const after = await Promise.all([prisma!.surgery.count({ where: { id: { in: ids!.surgeryIds } } }), prisma!.remito.count({ where: { id: { in: ids!.remitoIds } } })])
    expect(result.items).toEqual([])
    expect(after).toEqual(before)
  })

  it("uses the shared CTE for news filters/counts, priority ordering and stable keyset pages", async () => {
    const all = await getLogisticsGlobalInbox(prisma, ids!.companyId, actor(), query())
    expect(all.items.map((item) => item.surgery.reference)).toEqual([expect.stringContaining("empty"), expect.stringContaining("urgent"), expect.stringContaining("normal")])
    expect(all.counts).toMatchObject({ news: 2, urgent: 1 })
    const priority = await getLogisticsGlobalInbox(prisma, ids!.companyId, actor(), query("priority=urgent"))
    expect(priority.items.map((item) => item.surgery.reference)).toEqual([expect.stringContaining("urgent")])
    const news = await getLogisticsGlobalInbox(prisma, ids!.companyId, actor(), query("news=true&limit=1"))
    expect(news.counts.news).toBe(2)
    expect(news.items).toHaveLength(1)
    expect(news.page).toMatchObject({ hasMore: true, nextCursor: expect.any(String) })
    const second = await getLogisticsGlobalInbox(prisma, ids!.companyId, actor(), query(`news=true&limit=1&cursor=${news.page.nextCursor}`))
    expect(second.items).toHaveLength(1)
    expect(second.items[0].surgery.reference).not.toBe(news.items[0].surgery.reference)
  })

  it("projects separate surgery/preparation/remito states and latest closed novelty semantics", async () => {
    const result = await getLogisticsGlobalInbox(prisma, ids!.companyId, actor(), query())
    const urgent = result.items.find((item) => item.surgery.reference?.includes("urgent"))!
    const normal = result.items.find((item) => item.surgery.reference?.includes("normal"))!
    const empty = result.items.find((item) => item.surgery.reference?.includes("empty"))!
    expect(urgent.surgery).toMatchObject({ surgeryStatus: "scheduled", preparationStatus: "ready", logisticsStatus: "mixed" })
    expect(normal.surgery.logisticsStatus).toBe("Entregado")
    expect(empty.surgery.logisticsStatus).toBe("unavailable")
    expect(empty.logistics.lastNovelty).toBeNull()
    expect(urgent.logistics.lastNovelty).toEqual({ label: "Remito en tránsito", at: "2026-01-01T00:00:11.000Z", responsible: "Runtime Operator" })
    expect(Object.keys(urgent.logistics.lastNovelty!)).toEqual(["label", "at", "responsible"])
  })

  it("uses rollback-only B/C facts for timestamp ordering and duplicate-operation suppression", async () => {
    await rollbackOnly(async (tx) => {
      const token = `inbox-bcd-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const at = (seconds: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, seconds))
      const article = await tx.article.create({ data: { organizationId: ids!.organizationId, sku: token, description: token } })
      await tx.stockArticleEligibility.create({ data: { companyId: ids!.companyId, organizationId: ids!.organizationId, articleId: article.id, version: 1 } })
      const units = await Promise.all([tx.stockIdentifiedUnit.create({ data: { companyId: ids!.companyId, articleId: article.id } }), tx.stockIdentifiedUnit.create({ data: { companyId: ids!.companyId, articleId: article.id } })])
      const assignments = await Promise.all(units.map(async (unit, index) => {
        const audit = await tx.auditEvent.create({ data: { companyId: ids!.companyId, userId: ids!.userId, entityType: "test", action: `${token}-${index}`, module: "test" } })
        const acceptance = await tx.operationalCommandAcceptance.create({ data: { companyId: ids!.companyId, domain: "test", sourceOperationId: `${token}-${index}`, checkpoint: "test", scopeKey: `${token}-${index}`, intentHash: token, acceptedAt: at(index), acceptedById: ids!.userId, resultEntityType: "test", resultEntityId: audit.id, auditEventId: audit.id } })
        return tx.cajasAssignment.create({ data: { companyId: ids!.companyId, surgeryId: ids!.surgeryIds[index], boxArticleId: article.id, boxIdentifiedUnitId: unit.id, activeSlot: 1, assignedAt: at(index), assignedById: ids!.userId, startCommandAcceptanceId: acceptance.id } })
      }))
      await tx.auditEvent.createMany({ data: [
        { companyId: ids!.companyId, userId: ids!.userId, entityType: "CajasAssignment", entityId: assignments[0].id, action: "assignment_preparation_accepted", module: "cajas", createdAt: at(11) },
        { companyId: ids!.companyId, userId: ids!.userId, entityType: "CajasAssignment", entityId: assignments[0].id, action: "assignment_preparation_accepted", module: "cajas", createdAt: at(12) },
        { companyId: ids!.companyId, userId: ids!.userId, entityType: "CajasAssignment", entityId: assignments[1].id, action: "assignment_preparation_accepted", module: "cajas", createdAt: at(20) },
      ] })

      const result = await getLogisticsGlobalInbox(tx as never, ids!.companyId, actor(), query())
      const urgent = result.items.find((item) => item.surgery.reference?.includes("urgent"))!
      const normal = result.items.find((item) => item.surgery.reference?.includes("normal"))!
      expect(urgent.logistics.lastNovelty).toEqual({ label: "Preparación actualizada", at: "2026-01-01T00:00:12.000Z", responsible: "Runtime Operator" })
      expect(normal.logistics.lastNovelty).toEqual({ label: "Preparación actualizada", at: "2026-01-01T00:00:20.000Z", responsible: "Runtime Operator" })
      expect(result.counts.news).toBe(2)
    })
  })

  it("uses the C14/remito writers to suppress the duplicate operation and prefer C14", async () => {
    let stage = "setup"
    try {
      await rollbackOnly(async (tx) => {
      const token = `inbox-c14-${Date.now()}-${Math.random().toString(36).slice(2)}`
      let savepoint = 0
      const db = Object.assign(Object.create(tx), { $transaction: async <T>(run: (client: Prisma.TransactionClient) => Promise<T>) => {
        const name = `inbox_fixture_${++savepoint}`
        await tx.$executeRawUnsafe(`SAVEPOINT ${name}`)
        try {
          const result = await run(tx)
          await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`)
          return result
        } catch (error) {
          await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`)
          throw error
        }
      } }) as PrismaClient
      const accept = async (kind: string, resultEntityId: string) => {
        const audit = await tx.auditEvent.create({ data: { companyId: ids!.companyId, userId: ids!.userId, entityType: "fixture", entityId: resultEntityId, action: `${token}-${kind}`, module: "test" } })
        return tx.operationalCommandAcceptance.create({ data: { companyId: ids!.companyId, domain: "test", sourceOperationId: `${token}-${kind}`, checkpoint: "fixture", scopeKey: kind, intentHash: token, acceptedAt: new Date(), acceptedById: ids!.userId, resultEntityType: "fixture", resultEntityId, auditEventId: audit.id } })
      }
      const branch = await tx.branch.create({ data: { companyId: ids!.companyId, name: token } })
      const surgery = await tx.surgery.create({ data: { companyId: ids!.companyId, branchId: branch.id, patientId: ids!.contactIds[0], visibleNumber: `${token}-dispatch`, cxStatus: "scheduled", prepStatus: "ready" } })
      const [boxArticle, componentArticle] = await Promise.all([
        tx.article.create({ data: { organizationId: ids!.organizationId, sku: `${token}-box`, description: token, articleType: "Caja" } }),
        tx.article.create({ data: { organizationId: ids!.organizationId, sku: `${token}-component`, description: token } }),
      ])
      const [boxEligibility, componentEligibility] = await Promise.all([
        tx.stockArticleEligibility.create({ data: { companyId: ids!.companyId, organizationId: ids!.organizationId, articleId: boxArticle.id, version: 1 } }),
        tx.stockArticleEligibility.create({ data: { companyId: ids!.companyId, organizationId: ids!.organizationId, articleId: componentArticle.id, version: 1 } }),
      ])
      stage = "policies"
      const policies = await Promise.all([boxEligibility, componentEligibility].map(async (eligibility, index) => {
        const command = await accept(`policy-${index}`, eligibility.id)
        const policy = await tx.stockArticlePolicyVersion.create({ data: { companyId: ids!.companyId, eligibilityId: eligibility.id, versionNumber: 1, eligible: true, stockUnit: "UNIT", quantityScale: 0, traceMode: index === 0 ? "IDENTIFIED_UNIT" : "NONE", effectiveAt: new Date(), acceptedAt: new Date(), acceptedById: ids!.userId, commandAcceptanceId: command.id } })
        await tx.stockArticleEligibility.update({ where: { id: eligibility.id }, data: { currentPolicyVersionId: policy.id } })
        return policy
      }))
      stage = "positions"
      const context = await tx.stockContext.create({ data: { companyId: ids!.companyId, kind: "EXTERNAL_CUSTODY", labelSnapshot: token } })
      const boxUnit = await tx.stockIdentifiedUnit.create({ data: { companyId: ids!.companyId, articleId: boxArticle.id } })
      const configurationCommand = await accept("box-configuration", boxUnit.id)
      const configuration = await tx.stockIdentifiedUnitConfigurationVersion.create({ data: { companyId: ids!.companyId, identifiedUnitId: boxUnit.id, articleId: boxArticle.id, eligibilityId: boxEligibility.id, policyVersionId: policies[0].id, versionNumber: 1, internalCode: `${token}-unit`, effectiveAt: new Date(), acceptedAt: new Date(), acceptedById: ids!.userId, commandAcceptanceId: configurationCommand.id, auditEventId: configurationCommand.auditEventId } })
      await tx.stockIdentifiedUnitCurrentConfiguration.create({ data: { companyId: ids!.companyId, identifiedUnitId: boxUnit.id, configurationVersionId: configuration.id, internalCode: configuration.internalCode, version: 1 } })
      const createPosition = async (articleId: string, eligibilityId: string, policyVersionId: string, scope: string, traceMode: "NONE" | "IDENTIFIED_UNIT", identifiedUnitId?: string) => {
        const position = await tx.stockPosition.create({ data: { companyId: ids!.companyId, articleId, eligibilityId, policyVersionId, contextId: context.id, traceMode, identifiedUnitId, stockUnit: "UNIT", quantityScale: 0, scopeKey: `${token}-${scope}` } })
        await tx.stockPositionProjection.create({ data: { companyId: ids!.companyId, positionId: position.id, physicalQuantity: 1, reservedQuantity: 0, availableQuantity: 1, underReviewQuantity: 0, finalDispositionQuantity: 0, version: 1, evidenceWatermark: token } })
        return position
      }
      await createPosition(boxArticle.id, boxEligibility.id, policies[0].id, "box", "IDENTIFIED_UNIT", boxUnit.id)
      const componentPosition = await createPosition(componentArticle.id, componentEligibility.id, policies[1].id, "component", "NONE")
      const stockCommand = await accept("component-stock", componentPosition.id)
      const stockEvidence = await tx.stockEvidence.create({ data: { companyId: ids!.companyId, kind: "RECEIPT", recordKind: "ORIGINAL", sourceDomain: "test", sourceEntityType: "fixture", sourceEntityId: componentPosition.id, sourceCheckpoint: "fixture", acceptedAt: new Date(Date.now() - 60_000), acceptedById: ids!.userId, commandAcceptanceId: stockCommand.id, auditEventId: stockCommand.auditEventId } })
      await tx.stockEvidenceLine.create({ data: { companyId: ids!.companyId, evidenceId: stockEvidence.id, lineNumber: 1, articleId: componentArticle.id, toPositionId: componentPosition.id, quantity: 1, stockUnit: "UNIT", scaleSnapshot: 0, sourceLineId: componentPosition.id } })
      await tx.stockPositionProjection.update({ where: { companyId_positionId: { companyId: ids!.companyId, positionId: componentPosition.id } }, data: { evidenceWatermark: stockEvidence.id } })
      stage = "formula"
      const formulaCommand = await accept("formula", boxArticle.id)
      const formula = await tx.cajasBoxFormula.create({ data: { companyId: ids!.companyId, boxArticleId: boxArticle.id, nextVersionNumber: 1, version: 1 } })
      const formulaVersion = await tx.cajasFormulaVersion.create({ data: { companyId: ids!.companyId, formulaId: formula.id, boxArticleId: boxArticle.id, versionNumber: 1, acceptedAt: new Date(), acceptedById: ids!.userId, commandAcceptanceId: formulaCommand.id } })
      await tx.cajasBoxFormula.update({ where: { id: formula.id }, data: { currentVersionId: formulaVersion.id, nextVersionNumber: 2, version: 2 } })
      await tx.cajasFormulaLine.create({ data: { companyId: ids!.companyId, formulaVersionId: formulaVersion.id, lineNumber: 1, articleId: componentArticle.id, expectedQuantity: 1, stockUnit: "UNIT", scaleSnapshot: 0, skuSnapshot: componentArticle.sku, descriptionSnapshot: componentArticle.description } })
      await tx.userCompanyAccess.create({ data: { companyId: ids!.companyId, userId: ids!.userId, role: "admin", isActive: true } })

      stage = "assign"
      const assignment = await assignAndPrepareCajas(db, ids!.companyId, surgery.id, ids!.userId, { unitId: boxUnit.id, idempotencyKey: `${token}-assignment` })
      const line = await tx.cajasPreparationLine.findFirstOrThrow({ where: { companyId: ids!.companyId, preparation: { assignmentId: assignment.assignment.id } } })
      stage = "allocate"
      const allocationCommand = await accept("allocation", line.id)
      stage = "reservation"
      const reservation = await tx.stockReservation.create({ data: { companyId: ids!.companyId, sourceDomain: "cajas", sourceEntityType: "CajasPreparation", sourceEntityId: line.preparationId, sourceLineId: line.id, sourceScopeKind: "LINE", sourceScopeKey: `L:${line.id}`, positionId: componentPosition.id } })
      stage = "reservation-evidence"
      const reservationEvidence = await tx.stockReservationEvidence.create({ data: { companyId: ids!.companyId, reservationId: reservation.id, sequence: 1, kind: "RESERVE", quantity: 1, stockUnit: "UNIT", scaleSnapshot: 0, acceptedAt: new Date(), acceptedById: ids!.userId, commandAcceptanceId: allocationCommand.id, auditEventId: allocationCommand.auditEventId } })
      stage = "reservation-projection"
      await tx.stockReservationProjection.create({ data: { companyId: ids!.companyId, reservationId: reservation.id, activeQuantity: 1, appliedQuantity: 0, status: "ACTIVE", version: 1, evidenceWatermark: allocationCommand.id } })
      stage = "position-projection"
      await tx.stockPositionProjection.update({ where: { companyId_positionId: { companyId: ids!.companyId, positionId: componentPosition.id } }, data: { availableQuantity: 0, reservedQuantity: 1, version: 2, evidenceWatermark: allocationCommand.id } })
      stage = "correlation"
      await tx.cajasReservationCorrelation.create({ data: { companyId: ids!.companyId, assignmentId: assignment.assignment.id, preparationId: line.preparationId, preparationLineId: line.id, stockPositionId: componentPosition.id, stockReservationId: reservation.id, stockReservationEvidenceId: reservationEvidence.id, sourceCheckpoint: "cajas-physical-preparation", semanticKey: `${token}-allocation`, quantity: 1, stockUnit: "UNIT", scaleSnapshot: 0, allocationTraceSnapshot: { articleId: componentArticle.id, stockPositionId: componentPosition.id, stockUnit: "UNIT", traceMode: "NONE", lotCode: null, expirationDate: null, identifiedUnitId: null, identifiedCode: null, serialNumber: null, quantity: "1", capturedAt: new Date().toISOString() } } })
      stage = "control"
      await acceptCajasControl(db, ids!.companyId, surgery.id, assignment.assignment.id, ids!.userId, { idempotencyKey: `${token}-control` })
      stage = "create-remito"
      const remito = await createRemito({ companyId: ids!.companyId, branchId: branch.id, surgeryId: surgery.id, origin: "box", salidaReason: "cirugia", items: [{ sku: componentArticle.sku, description: componentArticle.description, quantity: 1, unit: "UNIT" }], createdById: ids!.userId, prisma: db })
      const proof = await authorize(db as never, { actorId: ids!.userId, companyId: ids!.companyId, bundleId: "WCB-06", contractIds: WCB06_CONTRACT_IDS })
      const prior = process.env.OSSUM_C14_WCB06_ENABLED
      process.env.OSSUM_C14_WCB06_ENABLED = "true"
      try {
        stage = "emit"
        await emitirRemito({ companyId: ids!.companyId, remitoId: remito.id, updatedById: ids!.userId, prisma: db, idempotencyKey: `${token}-dispatch`, authorizationProof: proof, issuanceDependencies: { keyring: createRemitoTokenKeyring({ activeTokenKeyVersion: 1, keys: { "1": Buffer.alloc(32, 7).toString("base64url") } }), randomBytes: (size) => Buffer.alloc(size, 9) } })
      } catch (error) {
        const cause = error && typeof error === "object" && "cause" in error ? error.cause : null
        throw new Error(`C14 issuance fixture failed: ${error instanceof Error ? error.message : String(error)} ${JSON.stringify(cause)}`)
      } finally {
        process.env.OSSUM_C14_WCB06_ENABLED = prior
      }

      const [dispatch, issued] = await Promise.all([
        tx.cajasDispatch.findFirstOrThrow({ where: { companyId: ids!.companyId, remitoId: remito.id } }),
        tx.remito.findFirstOrThrow({ where: { companyId: ids!.companyId, id: remito.id } }),
      ])
      const dispatchAudit = await tx.auditEvent.findFirstOrThrow({ where: { companyId: ids!.companyId, entityType: "CAJAS_DISPATCH", entityId: dispatch.id, action: "C14_COMMAND_ACCEPTED", module: "STOCK_CAJAS_C14" } })
      const result = await getLogisticsGlobalInbox(tx as never, ids!.companyId, actor(), query("news=true"))
      const item = result.items.find((candidate) => candidate.surgery.reference === surgery.visibleNumber)
      expect(issued.state).toBe("Emitido")
      expect(issued.updatedAt.getTime()).toBeGreaterThanOrEqual(dispatchAudit.createdAt.getTime())
      expect(item?.logistics.lastNovelty).toEqual({ label: "Despacho emitido", at: dispatchAudit.createdAt.toISOString(), responsible: "Runtime Operator" })
      expect(result.items.filter((candidate) => candidate.surgery.reference === surgery.visibleNumber)).toHaveLength(1)
      })
    } catch (error) {
      throw new Error(`C14 fixture failed at ${stage}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, 30_000)
})
