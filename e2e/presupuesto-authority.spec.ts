import { expect, test, type BrowserContext, type Page } from "@playwright/test"
import { loadEnvConfig } from "@next/env"
import { randomUUID } from "node:crypto"

import { DISTRICORR_ESTIMATIVE_LEGEND } from "../src/lib/api/presupuestos"

loadEnvConfig(process.cwd())

type MutationRecord = { channel: "localStorage" | "sessionStorage" | "zustand"; operation: string; target: string }
type Company = { id: string; name: string }
type Contact = { id: string; firstName: string | null; lastName: string | null }
type Branch = { id: string; name: string }
type Surgery = { id: string; visibleNumber: string | null }
type Presupuesto = {
  id: string
  familyId: string
  surgeryId: string | null
  visibleNumber: number | null
  state: string
  slot: string
  revision: number
  title: string | null
  total: string
}

const requiredEnvironment = [
  "OSSUM_COORDINATION_SERVER_ATTESTED",
  "OSSUM_COORDINATION_EXPECTED_PROJECT_REF",
  "OSSUM_PRESUPUESTO_ADMIN_EMAIL",
  "OSSUM_PRESUPUESTO_ADMIN_PASSWORD",
] as const

function requireQaEnvironment(): void {
  const missing = requiredEnvironment.filter((name) => !process.env[name]?.trim())
  if (missing.length > 0 || process.env.OSSUM_COORDINATION_SERVER_ATTESTED !== "true") {
    throw new Error("PRESUPUESTO_AUTHORITY_QA_ENVIRONMENT_REJECTED")
  }
}

async function installAuthorityMonitor(context: BrowserContext, records: MutationRecord[]): Promise<void> {
  await context.exposeBinding("__ossumRecordPresupuestoMutation", (_source, record: MutationRecord) => records.push(record))
  await context.addInitScript(() => {
    const target = window as typeof window & {
      __ossumPresupuestoMonitorArmed?: boolean
      __ossumRecordPresupuestoMutation?: (record: MutationRecord) => Promise<void>
    }
    const record = (channel: MutationRecord["channel"], operation: string, key: string) => {
      if (target.__ossumPresupuestoMonitorArmed) {
        void target.__ossumRecordPresupuestoMutation?.({ channel, operation, target: key })
      }
    }
    const storageChannel = (storage: Storage): MutationRecord["channel"] =>
      storage === window.localStorage ? "localStorage" : "sessionStorage"
    const originalSet = Storage.prototype.setItem
    const originalRemove = Storage.prototype.removeItem
    const originalClear = Storage.prototype.clear
    Storage.prototype.setItem = function (key, value) { record(storageChannel(this), "setItem", key); return originalSet.call(this, key, value) }
    Storage.prototype.removeItem = function (key) { record(storageChannel(this), "removeItem", key); return originalRemove.call(this, key) }
    Storage.prototype.clear = function () { record(storageChannel(this), "clear", "*"); return originalClear.call(this) }
    window.addEventListener("ossum:zustand-change", () => record("zustand", "change", "store"))
  })
}

async function authenticate(page: Page): Promise<string> {
  await page.goto("/login?next=/ventas/presupuestos")
  await page.getByLabel(/correo|email/i).fill(process.env.OSSUM_PRESUPUESTO_ADMIN_EMAIL!)
  await page.getByLabel(/contraseña|password/i).fill(process.env.OSSUM_PRESUPUESTO_ADMIN_PASSWORD!)
  await page.getByRole("button", { name: /ingresar|iniciar sesión|login/i }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/ventas/presupuestos")

  const expectedKey = `sb-${process.env.OSSUM_COORDINATION_EXPECTED_PROJECT_REF}-auth-token`
  expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual([expectedKey])
  return expectedKey
}

async function authenticatedApi<T>(
  page: Page,
  authStorageKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const result = await page.evaluate(async ({ authStorageKey, path, init }) => {
    const raw = window.localStorage.getItem(authStorageKey)
    if (!raw) throw new Error("AUTH_SESSION_REJECTED")
    let token: unknown
    try { token = (JSON.parse(raw) as { access_token?: unknown }).access_token } catch { throw new Error("AUTH_SESSION_REJECTED") }
    if (typeof token !== "string" || !token) throw new Error("AUTH_SESSION_REJECTED")

    const response = await window.fetch(path, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    const text = await response.text()
    let body: unknown = null
    if (text) {
      try { body = JSON.parse(text) } catch { body = null }
    }
    return { ok: response.ok, status: response.status, body }
  }, { authStorageKey, path, init })

  if (!result.ok) throw new Error(`AUTHENTICATED_API_REJECTED_${result.status}`)
  const envelope = result.body as { data?: T } | null
  return envelope && Object.prototype.hasOwnProperty.call(envelope, "data") ? envelope.data as T : result.body as T
}

function assertNoLocalPresupuestoAuthority(records: MutationRecord[], authStorageKey: string): void {
  expect(records.filter((record) =>
    record.channel === "zustand" ||
    (record.channel === "localStorage" && record.target !== authStorageKey),
  )).toEqual([])
}

test.describe.serial("PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001 S7.2", () => {
  test.setTimeout(120_000)
  test.beforeAll(() => requireQaEnvironment())

  test("persists one Surgery-linked family across Sales and Expediente without local authority", async ({ browser }) => {
    const records: MutationRecord[] = []
    const context = await browser.newContext({ storageState: undefined })
    await installAuthorityMonitor(context, records)
    const page = await context.newPage()

    try {
      const authStorageKey = await authenticate(page)
      const companies = await authenticatedApi<{ companies: Company[]; singleCompanyId: string | null }>(page, authStorageKey, "/api/me/companies")
      const company = companies.companies.find((candidate) => candidate.name === "Districorr DEV")
      if (!company) throw new Error("PRESUPUESTO_AUTHORITY_DEV_COMPANY_UNATTESTED")

      await page.evaluate((companyId) => window.sessionStorage.setItem("ossum.activeCompanyId", companyId), company.id)
      await page.reload()
      const me = await authenticatedApi<{ access: { role: string }; activeCompany: Company }>(page, authStorageKey, `/api/companies/${encodeURIComponent(company.id)}/me`)
      if (me.activeCompany.id !== company.id) throw new Error("PRESUPUESTO_AUTHORITY_COMPANY_CONTEXT_UNATTESTED")
      if (me.access.role !== "admin") throw new Error("PRESUPUESTO_AUTHORITY_OPERATOR_ROLE_UNATTESTED")

      const branches = await authenticatedApi<Branch[]>(page, authStorageKey, `/api/companies/${encodeURIComponent(company.id)}/branches`)
      const branch = branches[0]
      if (!branch) throw new Error("PRESUPUESTO_AUTHORITY_FIXTURE_SETUP_REJECTED")

      const runId = `S72-${Date.now()}-${randomUUID().slice(0, 8)}`
      const patientNames = [
        ["Valentina", "Ríos"],
        ["Martina", "Ferreyra"],
        ["Lucía", "Benítez"],
        ["Camila", "Sosa"],
        ["Julieta", "Pereyra"],
        ["Sofía", "Acosta"],
      ] as const
      const [firstName, lastName] = patientNames[Number.parseInt(runId.slice(-2), 16) % patientNames.length]
      const contact = await authenticatedApi<Contact>(page, authStorageKey, `/api/companies/${encodeURIComponent(company.id)}/contacts`, {
        method: "POST",
        body: { firstName, lastName, isCompany: false, contactType: "PERSON", role: "patient" },
      })
      const contactLabel = [contact.firstName, contact.lastName].filter(Boolean).join(" ")
      const surgery = await authenticatedApi<Surgery>(page, authStorageKey, `/api/companies/${encodeURIComponent(company.id)}/surgeries`, {
        method: "POST",
        body: {
          branchId: branch.id,
          patientId: contact.id,
          payerContactId: contact.id,
          description: "Artroplastia total de rodilla",
          priority: "normal",
          source: "PRESUPUESTO_AUTHORITY_S7_2",
          notes: runId,
        },
      })
      const title = "Prótesis total de rodilla"
      const draft = await authenticatedApi<Presupuesto>(page, authStorageKey, `/api/companies/${encodeURIComponent(company.id)}/presupuestos`, {
        method: "POST",
        body: {
          surgeryId: surgery.id,
          branchId: branch.id,
          clientContactId: contact.id,
          payerContactId: contact.id,
          title,
          currency: "ARS",
          documentDate: "2026-08-31",
          paymentTerms: "Contado",
          priceListCode: "Lista general",
          legend: DISTRICORR_ESTIMATIVE_LEGEND,
          notes: runId,
          validUntil: "2026-09-30T12:00:00.000Z",
          generalDiscountRate: "0",
          commercial: { pricingMode: "ESTIMATIVE" },
          items: [{ sku: "PRO-ROD-001", description: "Componente femoral para prótesis de rodilla", quantity: "2", unit: "unidad", unitPrice: "1234.56", discountRate: "0", taxRate: "21" }],
        },
      })
      expect(draft).toMatchObject({ surgeryId: surgery.id, state: "Borrador", slot: "DRAFT", title })

      await page.goto("/ventas/presupuestos")
      const search = page.getByPlaceholder("Número, cliente o pagador")
      await search.fill(draft.id)
      let row = page.locator("tbody tr")
      await expect(row).toHaveCount(1)
      await expect(row).toContainText(contactLabel)
      await expect(row).toContainText("Borrador")
      await expect(row).toContainText("v1")

      await page.reload()
      await page.getByPlaceholder("Número, cliente o pagador").fill(draft.id)
      row = page.locator("tbody tr")
      await expect(row).toHaveCount(1)
      await expect(row).toContainText("Borrador")
      expect(await authenticatedApi<Presupuesto>(page, authStorageKey, `/api/companies/${encodeURIComponent(company.id)}/presupuestos/${encodeURIComponent(draft.id)}`)).toMatchObject({ id: draft.id, surgeryId: surgery.id, title })

      await page.evaluate(() => { (window as typeof window & { __ossumPresupuestoMonitorArmed?: boolean }).__ossumPresupuestoMonitorArmed = true })
      records.length = 0
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/presupuestos/${draft.id}/emitir`) && response.request().method() === "POST" && response.ok()),
        row.getByRole("button", { name: "Emitir" }).click(),
      ])
      await expect(row).toContainText("Emitido")
      assertNoLocalPresupuestoAuthority(records, authStorageKey)

      records.length = 0
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/presupuestos/${draft.id}/state`) && response.request().method() === "PATCH" && response.ok()),
        row.getByRole("button", { name: "Aprobar" }).click(),
      ])
      await expect(row).toContainText("Aprobado")
      assertNoLocalPresupuestoAuthority(records, authStorageKey)

      records.length = 0
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/presupuestos/${draft.id}/versions`) && response.request().method() === "POST" && response.ok()),
        row.getByRole("button", { name: "Revisar" }).click(),
      ])
      const family = await authenticatedApi<Presupuesto[]>(page, authStorageKey, `/api/companies/${encodeURIComponent(company.id)}/presupuestos?surgeryId=${encodeURIComponent(surgery.id)}&take=100`)
      expect(family).toHaveLength(2)
      expect(new Set(family.map((item) => item.familyId)).size).toBe(1)
      expect(family.filter((item) => item.state === "Aprobado")).toHaveLength(1)
      expect(family.filter((item) => item.state === "Borrador")).toHaveLength(1)
      assertNoLocalPresupuestoAuthority(records, authStorageKey)

      const approved = family.find((item) => item.state === "Aprobado")!
      expect(approved.visibleNumber).not.toBeNull()
      await page.getByRole("button", { name: "Enviar existente" }).click()
      const emailDialog = page.getByRole("dialog", { name: "Enviar presupuesto existente" })
      await expect(emailDialog.getByText("Se adjuntará un PDF comercial no fiscal.", { exact: false })).toBeVisible()
      await emailDialog.getByRole("combobox", { name: "Documento backend" }).click()
      await expect(page.getByRole("option", { name: new RegExp(`^P-${String(approved.visibleNumber).padStart(4, "0")} · Aprobado`) })).toBeVisible()
      await expect(page.getByRole("option", { name: /Borrador/ })).toHaveCount(0)
      await page.keyboard.press("Escape")
      await expect(emailDialog.getByRole("button", { name: /^Enviar$/ })).toBeDisabled()
      expect(records.filter((record) => record.channel === "localStorage" && record.target !== authStorageKey)).toEqual([])

      await page.goto("/cirugias")
      const surgeryRow = page.locator("tbody tr").filter({ hasText: surgery.visibleNumber ?? surgery.id })
      await expect(surgeryRow).toHaveCount(1, { timeout: 30_000 })
      await surgeryRow.dblclick()
      await page.getByRole("tab", { name: "Comprobantes" }).click()
      const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Presupuesto", exact: true }) })
      await expect(panel).toContainText("Aprobado")
      await expect(panel).toContainText("Borrador")
      await expect(panel).toContainText(`P-${String(approved.visibleNumber).padStart(4, "0")}`)

      const finalFamily = await authenticatedApi<Presupuesto[]>(page, authStorageKey, `/api/companies/${encodeURIComponent(company.id)}/presupuestos?surgeryId=${encodeURIComponent(surgery.id)}&take=100`)
      expect(finalFamily).toHaveLength(2)
      expect(new Set(finalFamily.map((item) => item.familyId)).size).toBe(1)
    } finally {
      await page.close()
      await context.close()
    }
  })
})
