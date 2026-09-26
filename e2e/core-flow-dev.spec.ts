import { expect, test, type Page } from "@playwright/test"
import { loadEnvConfig } from "@next/env"
import { randomUUID } from "node:crypto"

import { DISTRICORR_ESTIMATIVE_LEGEND } from "../src/lib/api/presupuestos"
import { formatDecimalCurrency } from "../src/lib/decimal-money"

loadEnvConfig(process.cwd())

type Company = { id: string; name: string }
type Branch = { id: string; name: string }
type Contact = { id: string; code: string; firstName: string | null; lastName: string | null }
type Surgery = { id: string; visibleNumber: string | null; prepStatus: string }
type Presupuesto = { id: string; revision: number; state: string; surgeryId: string | null; items: Array<{ id: string }> }
type Remito = { id: string; state: string; items: Array<{ id: string }> }
type Consumo = { id: string; state: string; items: Array<{ id: string }> }
type Devolucion = { id: string; state: string }
type Invoice = { id: string; visibleNumber: number | null; state: string; total: string; balance: string }
type Payment = { id: string; visibleNumber: number; state: string; amount: string }
type Receipt = { id: string }
type ReceiptScan = { event: { id: string }; status: string }
type Article = { id: string }
type BoxFormula = { boxEligibility: { article: Article } }
type Preparation = { id: string; lines: Array<{ id: string; articleId: string }> }
type CajaPreparationLine = { id: string; articleId: string; sku: string | null; description: string | null; quantity: string; stockUnit: string }
type CajaAssignment = { id: string; preparation: { id: string; lines: CajaPreparationLine[] } }
type CajasIndex = { candidates: Array<{ unitId: string; serialNumber: string | null; availability: { available: boolean } }> }

const requiredEnvironment = [
  "OSSUM_COORDINATION_SERVER_ATTESTED",
  "OSSUM_COORDINATION_EXPECTED_PROJECT_REF",
  "CORE_FLOW_STORAGE_STATE",
] as const

if (process.env.CORE_FLOW_STORAGE_STATE) test.use({ storageState: process.env.CORE_FLOW_STORAGE_STATE })

function requireQaEnvironment(): void {
  const missing = requiredEnvironment.filter((name) => !process.env[name]?.trim())
  if (missing.length > 0 || process.env.OSSUM_COORDINATION_SERVER_ATTESTED !== "true") {
    throw new Error(`CORE_FLOW_QA_ENVIRONMENT_REJECTED:${missing.join(",")}`)
  }
}

async function useAuthenticatedSession(page: Page): Promise<string> {
  await page.goto("/contactos")
  if (new URL(page.url()).pathname === "/login") throw new Error("CORE_FLOW_AUTH_SESSION_REQUIRED")
  const key = `sb-${process.env.OSSUM_COORDINATION_EXPECTED_PROJECT_REF}-auth-token`
  expect(await page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key)).toBeTruthy()
  return key
}

async function api<T>(page: Page, authStorageKey: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const result = await page.evaluate(async ({ authStorageKey, path, init }) => {
    const raw = window.localStorage.getItem(authStorageKey)
    const token = raw ? (JSON.parse(raw) as { access_token?: string }).access_token : undefined
    if (!token) throw new Error("AUTH_SESSION_REJECTED")
    const response = await window.fetch(path, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, ...(init.body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    const text = await response.text()
    let body: unknown = text
    try { body = text ? JSON.parse(text) : null } catch { /* retain text */ }
    return { ok: response.ok, status: response.status, body }
  }, { authStorageKey, path, init })
  if (!result.ok) throw new Error(`CORE_FLOW_API_REJECTED:${init.method ?? "GET"}:${path}:${result.status}:${JSON.stringify(result.body)}`)
  const envelope = result.body as { data?: T } | null
  return envelope && Object.prototype.hasOwnProperty.call(envelope, "data") ? envelope.data as T : result.body as T
}

async function stockPositions(companyId: string, articleIds: string[]): Promise<Map<string, string>> {
  const { prisma } = await import("../src/lib/prisma")
  const positions = await prisma.stockPosition.findMany({
    where: { companyId, articleId: { in: articleIds }, positionProjection: { availableQuantity: { gt: 0 } } },
    select: { id: true, articleId: true },
  })
  return new Map(positions.map((position) => [position.articleId, position.id]))
}

async function completeCajaControlFixture(companyId: string, assignmentId: string, surgeryPreparationId: string, runId: string): Promise<CajaPreparationLine[]> {
  const { prisma } = await import("../src/lib/prisma")
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.cajasAssignment.findFirstOrThrow({
      where: { companyId, id: assignmentId },
      include: { preparations: { include: { lines: { include: { expectedFormulaLine: true } } }, take: 1 } },
    })
    const cajaPreparation = assignment.preparations[0]
    const surgeryPreparation = await tx.surgeryPreparation.findFirstOrThrow({
      where: { companyId, id: surgeryPreparationId },
      include: { lines: { include: { reservations: { include: { evidences: { orderBy: { sequence: "desc" }, take: 1 }, position: true } } } } },
    })
    if (!cajaPreparation || cajaPreparation.lines.length !== surgeryPreparation.lines.length) throw new Error("CORE_FLOW_CAJA_PREPARATION_MISMATCH")

    const controlId = randomUUID()
    const audit = await tx.auditEvent.create({ data: { companyId, userId: assignment.assignedById, entityType: "CajasControl", entityId: controlId, action: "control_accepted", module: "cajas", newValue: { runId } } })
    const command = await tx.operationalCommandAcceptance.create({ data: { companyId, domain: "cajas", sourceOperationId: `${runId}:control`, checkpoint: "control-accept", scopeKey: assignmentId, intentHash: runId, acceptedAt: new Date(), acceptedById: assignment.assignedById, resultEntityType: "CajasControl", resultEntityId: controlId, auditEventId: audit.id } })
    await tx.cajasControl.create({ data: { id: controlId, companyId, assignmentId, boxArticleId: assignment.boxArticleId, formulaVersionId: cajaPreparation.formulaVersionId, kind: "CONTROL", sequence: 1, sourcePreparationVersion: cajaPreparation.version, result: "CLEAN", acceptedAt: new Date(), acceptedById: assignment.assignedById, commandAcceptanceId: command.id } })

    for (let index = 0; index < cajaPreparation.lines.length; index += 1) {
      const line = cajaPreparation.lines[index]
      const stockLine = surgeryPreparation.lines.find((candidate) => candidate.articleId === line.articleId)
      const reservation = stockLine?.reservations[0]
      const evidence = reservation?.evidences[0]
      if (!stockLine || !reservation || !evidence) throw new Error(`CORE_FLOW_RESERVATION_MISSING:${line.articleId}`)
      const scaleSnapshot = reservation.position.quantityScale
      await tx.cajasPreparationLine.update({ where: { id: line.id }, data: { stockPositionId: reservation.positionId, scaleSnapshot } })
      await tx.cajasReservationCorrelation.create({ data: { companyId, assignmentId, preparationId: cajaPreparation.id, preparationLineId: line.id, stockPositionId: reservation.positionId, stockReservationId: reservation.id, stockReservationEvidenceId: evidence.id, sourceCheckpoint: "CORE_FLOW_E2E_FIXTURE", semanticKey: `${runId}:${line.id}`, quantity: line.quantity, stockUnit: line.stockUnit, scaleSnapshot } })
      await tx.cajasControlLine.create({ data: { companyId, assignmentId, controlId, lineNumber: index + 1, sourcePreparationId: cajaPreparation.id, sourcePreparationLineId: line.id, expectedFormulaLineId: line.expectedFormulaLineId, role: line.role, articleId: line.articleId, stockPositionId: reservation.positionId, quantity: line.quantity, stockUnit: line.stockUnit, scaleSnapshot, skuSnapshot: line.expectedFormulaLine?.skuSnapshot, descriptionSnapshot: line.expectedFormulaLine?.descriptionSnapshot, differenceAcknowledged: line.differenceAcknowledged } })
    }
    await tx.cajasPreparation.update({ where: { id: cajaPreparation.id }, data: { latestControlId: controlId } })
    return cajaPreparation.lines.map((line) => ({ id: line.id, articleId: line.articleId, sku: line.expectedFormulaLine?.skuSnapshot ?? null, description: line.expectedFormulaLine?.descriptionSnapshot ?? null, quantity: line.quantity.toString(), stockUnit: line.stockUnit }))
  })
}

test.describe.serial("CORE-FLOW-E2E-DEV-001", () => {
  test.setTimeout(180_000)
  test.beforeAll(requireQaEnvironment)

  test("persists the canonical operational chain", async ({ page }) => {
    const authKey = await useAuthenticatedSession(page)
    const companies = await api<{ companies: Company[] }>(page, authKey, "/api/me/companies")
    const company = companies.companies.find((candidate) => candidate.name === "Districorr DEV")
    if (!company) throw new Error("CORE_FLOW_DEV_COMPANY_UNATTESTED")
    await page.evaluate((companyId) => window.sessionStorage.setItem("ossum.activeCompanyId", companyId), company.id)
    await page.reload()
    const branch = (await api<Branch[]>(page, authKey, `/api/companies/${company.id}/branches`))[0]
    if (!branch) throw new Error("CORE_FLOW_BRANCH_FIXTURE_MISSING")

    const runId = `CORE-E2E-${Date.now()}-${randomUUID().slice(0, 8)}`
    const contact = await api<Contact>(page, authKey, `/api/companies/${company.id}/contacts`, {
      method: "POST",
      body: { firstName: "Paciente", lastName: runId, isCompany: false, roles: ["cliente"], groupSlugs: ["pacientes"], notes: runId },
    })
    expect(contact.code).toMatch(/^C-\d{4,}$/)

    const surgery = await api<Surgery>(page, authKey, `/api/companies/${company.id}/surgeries`, {
      method: "POST",
      body: { branchId: branch.id, patientId: contact.id, payerContactId: contact.id, description: `Artroplastia ${runId}`, priority: "normal", source: "CORE_FLOW_E2E", notes: runId },
    })
    expect(surgery.visibleNumber).toBeTruthy()

    const presupuesto = await api<Presupuesto>(page, authKey, `/api/companies/${company.id}/presupuestos`, {
      method: "POST",
      body: {
        surgeryId: surgery.id,
        branchId: branch.id,
        clientContactId: contact.id,
        payerContactId: contact.id,
        title: `Presupuesto ${runId}`,
        currency: "ARS",
        documentDate: new Date().toISOString().slice(0, 10),
        paymentTerms: "Contado",
        priceListCode: "Lista general",
        legend: DISTRICORR_ESTIMATIVE_LEGEND,
        notes: runId,
        validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        generalDiscountRate: "0",
        commercial: { pricingMode: "ESTIMATIVE" },
        items: [{ sku: `SKU-${runId}`, description: "Implante E2E", quantity: "2", unit: "unidad", unitPrice: "1000", discountRate: "0", taxRate: "21" }],
      },
    })
    const emittedPresupuesto = await api<Presupuesto>(page, authKey, `/api/companies/${company.id}/presupuestos/${presupuesto.id}/emitir`, { method: "POST", body: { expectedRevision: presupuesto.revision } })
    const approved = await api<Presupuesto>(page, authKey, `/api/companies/${company.id}/presupuestos/${presupuesto.id}/state`, { method: "PATCH", body: { command: "approve", expectedRevision: emittedPresupuesto.revision } })
    expect(approved.state).toBe("Aprobado")

    const preparation = await api<Surgery>(page, authKey, `/api/companies/${company.id}/surgeries/${surgery.id}/preparation`, { method: "PATCH", body: { prepStatus: "preparing", source: "CORE_FLOW_E2E" } })
    expect(preparation.prepStatus).toBe("preparing")

    const componentCode = `COMP-${runId}`
    const boxCode = `BOX-${runId}`
    const boxSerial = `SERIAL-${runId}`.toUpperCase()
    const component = await api<Article>(page, authKey, `/api/companies/${company.id}/articles`, { method: "POST", body: { sku: componentCode, description: "Implante E2E", articleType: "Implante", unit: "u", traceabilityRequirement: "NONE", expirationRequired: false, identifiers: [{ type: "ALTERNATIVE_CODE", value: componentCode }], supplierMappings: [] } })
    const boxFormula = await api<BoxFormula>(page, authKey, `/api/companies/${company.id}/cajas`, { method: "POST", body: { sku: boxCode, description: "Caja E2E", lines: [{ articleId: component.id, expectedQuantity: 1, stockUnit: "u" }] } })
    const boxArticle = boxFormula.boxEligibility.article
    await api(page, authKey, `/api/companies/${company.id}/articles/${boxArticle.id}`, { method: "PATCH", body: { traceabilityRequirement: "SERIAL", expirationRequired: false, identifiers: [{ type: "ALTERNATIVE_CODE", value: boxCode }] } })

    const receipt = await api<Receipt>(page, authKey, `/api/companies/${company.id}/receipts`, { method: "POST", body: { documentReference: runId, idempotencyKey: `${runId}:receipt` } })
    const componentScan = await api<ReceiptScan>(page, authKey, `/api/companies/${company.id}/receipts/${receipt.id}/scan`, { method: "POST", body: { rawValue: componentCode } })
    expect(componentScan.status).toBe("RESOLVED")
    const boxScan = await api<ReceiptScan>(page, authKey, `/api/companies/${company.id}/receipts/${receipt.id}/scan`, { method: "POST", body: { rawValue: boxCode } })
    await api(page, authKey, `/api/companies/${company.id}/receipts/${receipt.id}/scans/${boxScan.event.id}/capture`, { method: "POST", body: { rawValue: boxSerial } })
    await api(page, authKey, `/api/companies/${company.id}/receipts/${receipt.id}`, { method: "POST", body: { action: "confirm", idempotencyKey: `${runId}:receipt-confirm` } })

    const cajas = await api<CajasIndex>(page, authKey, `/api/companies/${company.id}/surgeries/${surgery.id}/cajas`)
    const caja = cajas.candidates.find((candidate) => candidate.serialNumber === boxSerial && candidate.availability.available)
    if (!caja) throw new Error("CORE_FLOW_CAJA_FIXTURE_MISSING")
    const assignedCaja = await api<{ assignment: CajaAssignment }>(page, authKey, `/api/companies/${company.id}/surgeries/${surgery.id}/cajas`, { method: "POST", body: { unitId: caja.unitId, idempotencyKey: `${runId}:caja` } })

    const cajaLines = assignedCaja.assignment.preparation.lines
    const positions = await stockPositions(company.id, cajaLines.map((line) => line.articleId))
    const stockPreparation = await api<Preparation>(page, authKey, `/api/companies/${company.id}/surgeries/${surgery.id}/preparation`, { method: "POST", body: { idempotencyKey: `${runId}:preparation`, cajasAssignmentId: assignedCaja.assignment.id, lines: cajaLines.map((line) => ({ articleId: line.articleId, requestedQuantity: line.quantity, stockUnit: line.stockUnit })) } })
    for (const line of stockPreparation.lines) {
      const positionId = positions.get(line.articleId)
      const cajaLine = cajaLines.find((candidate) => candidate.articleId === line.articleId)
      if (!positionId || !cajaLine) throw new Error(`CORE_FLOW_STOCK_POSITION_MISSING:${line.articleId}`)
      await api(page, authKey, `/api/companies/${company.id}/surgeries/${surgery.id}/preparation/reserve`, { method: "POST", body: { preparationId: stockPreparation.id, lineId: line.id, positionId, quantity: cajaLine.quantity, idempotencyKey: `${runId}:reserve:${line.id}` } })
    }
    const dispatchLines = await completeCajaControlFixture(company.id, assignedCaja.assignment.id, stockPreparation.id, runId)

    const remito = await api<Remito>(page, authKey, `/api/companies/${company.id}/remitos`, {
      method: "POST",
      body: {
        branchId: branch.id,
        surgeryId: surgery.id,
        presupuestoId: presupuesto.id,
        destinatarioContactId: contact.id,
        origin: "manual",
        salidaReason: "cirugia",
        destinatarioSnapshot: { nombre: `${contact.firstName} ${contact.lastName}` },
        items: dispatchLines.map((line) => ({ sku: line.sku ?? undefined, description: line.description ?? line.articleId, quantity: Number(line.quantity), unit: line.stockUnit })),
        metadata: { runId },
      },
    })
    expect(remito.state).toBe("Borrador")

    // Downstream transitions intentionally use their public contracts. If the
    // surgical dispatch gate needs stock preparation, the failure identifies
    // the exact missing operational bridge rather than bypassing it.
    const emittedRemito = await api<Remito>(page, authKey, `/api/companies/${company.id}/remitos/${remito.id}/emitir`, { method: "POST", body: { idempotencyKey: runId } })
    expect(emittedRemito.state).toBe("Emitido")
    await api(page, authKey, `/api/companies/${company.id}/remitos/${remito.id}/state`, { method: "PATCH", body: { state: "Entregado" } })

    const consumo = await api<Consumo>(page, authKey, `/api/companies/${company.id}/consumos`, {
      method: "POST",
      body: { surgeryId: surgery.id, remitoId: remito.id, items: [{ remitoItemId: remito.items[0]?.id, sku: `SKU-${runId}`, description: "Implante E2E", requestedQuantity: 2, consumedQuantity: 1, unit: "unidad" }], metadata: { runId } },
    })
    await api(page, authKey, `/api/companies/${company.id}/consumos/${consumo.id}/emitir`, { method: "POST" })
    const validatedConsumo = await api<Consumo>(page, authKey, `/api/companies/${company.id}/consumos/${consumo.id}/validate`, { method: "POST" })
    expect(validatedConsumo.state).toBe("Validado")

    const devolucion = await api<Devolucion>(page, authKey, `/api/companies/${company.id}/devoluciones`, {
      method: "POST",
      body: { surgeryId: surgery.id, remitoId: remito.id, consumoId: consumo.id, reason: runId, items: [{ remitoItemId: remito.items[0]?.id, consumoItemId: consumo.items[0]?.id, sku: `SKU-${runId}`, description: "Implante E2E", returnedQuantity: 1, unit: "unidad" }] },
    })
    await api(page, authKey, `/api/companies/${company.id}/devoluciones/${devolucion.id}/state`, { method: "PATCH", body: { newState: "Pendiente" } })
    const confirmedDevolucion = await api<Devolucion>(page, authKey, `/api/companies/${company.id}/devoluciones/${devolucion.id}/confirm`, { method: "POST" })
    expect(confirmedDevolucion.state).toBe("Confirmada")

    const invoice = await api<Invoice>(page, authKey, `/api/companies/${company.id}/invoices`, {
      method: "POST",
      body: { surgeryId: surgery.id, base: "manual", type: "FV", currency: "ARS", items: [{ sku: `SKU-${runId}`, description: "Factura E2E", quantity: 1, unit: "unidad", unitPrice: 1000, tax: 210 }], metadata: { runId } },
    })
    const emittedInvoice = await api<Invoice>(page, authKey, `/api/companies/${company.id}/invoices/${invoice.id}/emitir`, { method: "POST" })
    expect(emittedInvoice.state).toBe("Emitida")
    const payment = await api<Payment>(page, authKey, `/api/companies/${company.id}/payments`, {
      method: "POST",
      body: { surgeryId: surgery.id, method: "transfer", currency: "ARS", amount: Number(emittedInvoice.balance), imputations: [{ invoiceId: invoice.id, amount: Number(emittedInvoice.balance) }], metadata: { reference: runId, notes: `${surgery.visibleNumber} · ${contact.code}` } },
    })
    expect(payment.state).toBe("Registrado")

    await page.goto("/cirugias")
    await page.getByRole("search", { name: "Buscar cirugías" }).getByRole("textbox").fill(surgery.visibleNumber ?? surgery.id)
    await page.getByRole("button", { name: "Ejecutar búsqueda" }).click()
    await expect(page.getByText(surgery.visibleNumber ?? surgery.id, { exact: false }).first()).toBeVisible({ timeout: 30_000 })
    await page.goto("/ventas/cobros")
    await page.getByRole("tab", { name: /Historial de cobros/ }).click()
    const paymentRow = page.getByRole("row").filter({ hasText: runId })
    await expect(paymentRow).toHaveCount(1)
    await expect(paymentRow).toContainText(`Cobro ${payment.visibleNumber}`)
    await expect(paymentRow).toContainText(emittedInvoice.visibleNumber == null ? invoice.id : `FV ${emittedInvoice.visibleNumber}`)
    await expect(paymentRow).toContainText(surgery.visibleNumber ?? surgery.id)
    await expect(paymentRow).toContainText(contact.code)
    await expect(paymentRow).toContainText(formatDecimalCurrency(payment.amount))
  })
})
