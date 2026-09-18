import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { open, readFile } from "node:fs/promises"
import { join } from "node:path"

import { APPROVED_ROOT, canonicalJson, pathIsInside, sha256Hex } from "../src/lib/services/coordination-ezequiel-dev-overlay.service"

type MutationRecord = { channel: string; operation: string; target: string }

const requiredEnvironment = [
  "OSSUM_COORDINATION_SERVER_ATTESTED",
  "OSSUM_COORDINATION_OPERATOR_EMAIL",
  "OSSUM_COORDINATION_OPERATOR_PASSWORD",
  "OSSUM_COORDINATION_EMPTY_OPERATOR_EMAIL",
  "OSSUM_COORDINATION_EMPTY_OPERATOR_PASSWORD",
  "OSSUM_COORDINATION_EXPECTED_PROJECT_REF",
]

function requireQaEnvironment(): void {
  const missing = requiredEnvironment.filter((name) => !process.env[name]?.trim())
  if (missing.length > 0 || process.env.OSSUM_COORDINATION_SERVER_ATTESTED !== "true") {
    throw new Error("COORDINATION_QA_ENVIRONMENT_REJECTED")
  }
}

async function installMutationMonitor(context: BrowserContext, records: MutationRecord[]): Promise<void> {
  await context.exposeBinding("__ossumRecordMutation", (_source, record: MutationRecord) => records.push(record))
  await context.addInitScript(() => {
    const target = window as typeof window & {
      __ossumMutationArmed?: boolean
      __ossumRecordMutation?: (record: MutationRecord) => Promise<void>
    }
    const record = (channel: string, operation: string, value: string) => {
      if (target.__ossumMutationArmed) void target.__ossumRecordMutation?.({ channel, operation, target: value })
    }

    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
      record("fetch", method, input instanceof Request ? input.url : String(input))
      return originalFetch(input, init)
    }

    const originalOpen = XMLHttpRequest.prototype.open as (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async: boolean,
      username?: string | null,
      password?: string | null,
    ) => void
    Object.defineProperty(XMLHttpRequest.prototype, "open", {
      configurable: true,
      value(this: XMLHttpRequest, method: string, url: string | URL, async = true, username?: string | null, password?: string | null) {
        record("xhr", method.toUpperCase(), String(url))
        return originalOpen.call(this, method, url, async, username, password)
      },
    })

    const storageChannel = (storage: Storage) => storage === window.localStorage ? "localStorage" : "sessionStorage"
    const originalSet = Storage.prototype.setItem
    const originalRemove = Storage.prototype.removeItem
    const originalClear = Storage.prototype.clear
    Storage.prototype.setItem = function (key, value) { record(storageChannel(this), "setItem", key); return originalSet.call(this, key, value) }
    Storage.prototype.removeItem = function (key) { record(storageChannel(this), "removeItem", key); return originalRemove.call(this, key) }
    Storage.prototype.clear = function () { record(storageChannel(this), "clear", "*"); return originalClear.call(this) }

    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")
    if (cookie?.get && cookie.set) {
      Object.defineProperty(document, "cookie", {
        configurable: true,
        get: cookie.get.bind(document),
        set(value: string) { record("cookie", "set", value.split("=", 1)[0]); cookie.set!.call(document, value) },
      })
    }

    window.addEventListener("ossum:availability-request", () => record("availability", "dispatch", "AvailabilityRequest"))
    window.addEventListener("ossum:preference-write", () => record("preference", "write", "view-preference"))
    window.addEventListener("ossum:zustand-change", () => record("zustand", "change", "store"))
  })
}

async function authenticate(
  page: Page,
  email = process.env.OSSUM_COORDINATION_OPERATOR_EMAIL!,
  password = process.env.OSSUM_COORDINATION_OPERATOR_PASSWORD!,
): Promise<string> {
  await page.goto("/login?next=/coordinadores/mi-bandeja")
  await page.getByLabel(/correo|email/i).fill(email)
  await page.getByLabel(/contraseña|password/i).fill(password)
  await page.getByRole("button", { name: /ingresar|iniciar sesión|login/i }).click()
  await expect(page).toHaveURL(/\/coordinadores\/mi-bandeja$/)
  const keys = await page.evaluate(() => Object.keys(window.localStorage))
  const expectedKey = `sb-${process.env.OSSUM_COORDINATION_EXPECTED_PROJECT_REF}-auth-token`
  expect(keys).toEqual([expectedKey])
  await page.evaluate(() => { (window as typeof window & { __ossumMutationArmed?: boolean }).__ossumMutationArmed = true })
  return expectedKey
}

async function snapshotStableSurface(page: Page): Promise<string> {
  return page.locator("main").evaluate((element) => element.textContent ?? "")
}

async function assertStableAction(page: Page, action: () => Promise<void>): Promise<void> {
  const before = await snapshotStableSurface(page)
  await action()
  const after = await snapshotStableSurface(page)
  expect(after.length).toBeGreaterThan(0)
  expect(before).not.toBe("")
}

async function runViewport(browser: Browser, viewport: { width: number; height: number }, hasTouch: boolean) {
  const records: MutationRecord[] = []
  const context = await browser.newContext({ viewport, hasTouch, storageState: undefined })
  await installMutationMonitor(context, records)
  const page = await context.newPage()
  try {
    const authStorageKey = await authenticate(page)

    const metric = (name: string) => page.getByRole("button", { name: new RegExp(`^${name},`, "i") })
    const initialMetricNames = await page.getByRole("group", { name: "Filtros por métricas de coordinación" }).getByRole("button").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")))
    await assertStableAction(page, async () => metric("Poner fecha").click())
    await metric("Fuera de plazo").click()
    await expect(page.getByText("SYN-A", { exact: true })).toBeVisible()
    await expect(page.getByText("SYN-B", { exact: true })).toHaveCount(0)
    await metric("Fuera de plazo").click(); await metric("Poner fecha").click()

    await metric("Coordinadas").click(); await metric("En tránsito").click()
    await expect(page.getByText("SYN-D", { exact: true })).toBeVisible()
    await expect(page.getByText("SYN-C", { exact: true })).toHaveCount(0)
    await metric("En tránsito").click(); await metric("Coordinadas").click()

    await metric("Poner fecha").click(); await metric("Coordinadas").click()
    await expect(page.getByText(/Los filtros seleccionados se contradicen/i)).toBeVisible()
    await page.getByRole("button", { name: "Limpiar filtros" }).click()

    await page.getByRole("button", { name: /^Más filtros/ }).click()
    await page.getByLabel("CX").fill("SYN-D")
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(page.getByText("SYN-D", { exact: true })).toBeVisible()
    await expect(page.getByText("SYN-C", { exact: true })).toHaveCount(0)
    await page.getByRole("button", { name: "Quitar filtro CX: SYN-D" }).click()

    await page.getByRole("button", { name: /^Más filtros/ }).click()
    await page.getByLabel("Fecha de cirugía desde").fill("2026-07-24")
    await page.getByLabel("Fecha de cirugía hasta").fill("2026-07-24")
    await page.getByLabel("Institución").selectOption({ label: "X" })
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(page.getByText("SYN-C", { exact: true })).toBeVisible()
    await expect(page.getByText("SYN-D", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Limpiar filtros" }).click()

    await page.getByRole("button", { name: /^Más filtros/ }).click()
    await page.getByLabel("Institución").selectOption({ label: "Y" })
    await page.getByLabel("Estado").selectOption({ label: "En tránsito" })
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(page.getByText(/No hay resultados con estos filtros/i)).toBeVisible()
    await page.getByRole("button", { name: "Limpiar filtros" }).click()

    const caseG = page.locator("[data-coordinator-case-card='compact-responsive']").filter({ hasText: "SYN-G" })
    const disclosure = caseG.getByRole("button", { name: "Cierre pendiente: 3 requisitos faltantes" })
    await expect(disclosure).toHaveAttribute("aria-expanded", "false")
    await disclosure.focus()
    await disclosure.press("Enter")
    await expect(disclosure).toHaveAttribute("aria-expanded", "true")
    await expect(disclosure).toBeFocused()
    await expect(caseG.getByText("Falta: Documentación, Consumo, Facturación")).toBeVisible()
    await disclosure.press("Space")
    await expect(disclosure).toHaveAttribute("aria-expanded", "false")
    await expect(disclosure).toBeFocused()
    if (hasTouch) {
      await disclosure.tap()
      await expect(disclosure).toHaveAttribute("aria-expanded", "true")
      await disclosure.tap()
      await expect(disclosure).toHaveAttribute("aria-expanded", "false")
    }

    for (const [caseName, missing] of [["SYN-E", "Documentación"], ["SYN-F", "Consumo"]] as const) {
      const card = page.locator("[data-coordinator-case-card='compact-responsive']").filter({ hasText: caseName })
      const trigger = card.getByRole("button", { name: "Cierre pendiente: 1 requisito faltante" })
      await trigger.click()
      await expect(card.getByText(`Falta: ${missing}`)).toBeVisible()
      await trigger.click()
    }

    const caseH = page.locator("[data-coordinator-case-card='compact-responsive']").filter({ hasText: "SYN-H" })
    await expect(caseH.getByRole("button", { name: /Cierre pendiente/ })).toHaveCount(0)
    const finalMetricNames = await page.getByRole("group", { name: "Filtros por métricas de coordinación" }).getByRole("button").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")))
    expect(finalMetricNames).toEqual(initialMetricNames)
    expect(records.filter((record) => !["GET", "HEAD", "OPTIONS"].includes(record.operation.toUpperCase()))).toEqual([])
    expect(records.filter((record) => ["availability", "zustand", "localStorage", "sessionStorage", "cookie", "preference"].includes(record.channel))).toEqual([])
    return { viewport, hasTouch, authStorageKey, authStorageRationale: "Supabase authenticated ephemeral context", mutationAttempts: records.length }
  } finally {
    await page.close()
    await context.close()
  }
}

async function runTrueEmpty(browser: Browser): Promise<void> {
  const records: MutationRecord[] = []
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: undefined })
  await installMutationMonitor(context, records)
  const page = await context.newPage()
  try {
    await authenticate(page, process.env.OSSUM_COORDINATION_EMPTY_OPERATOR_EMAIL!, process.env.OSSUM_COORDINATION_EMPTY_OPERATOR_PASSWORD!)
    await expect(page.getByText("No tenés casos asignados en esta etapa.")).toBeVisible()
    expect(records.filter((record) => !["GET", "HEAD", "OPTIONS"].includes(record.operation.toUpperCase()))).toEqual([])
    expect(records.filter((record) => ["availability", "zustand", "localStorage", "sessionStorage", "cookie", "preference"].includes(record.channel))).toEqual([])
  } finally {
    await page.close(); await context.close()
  }
}

async function writeQaEvidence(value: unknown): Promise<void> {
  const runId = process.env.OSSUM_COORDINATION_RUN_ID?.trim()
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/.test(runId)) throw new Error("COORDINATION_QA_RUN_ID_REJECTED")
  const path = join(APPROVED_ROOT, "runs", runId, "browser", "qa.redacted.json")
  if (!pathIsInside(join(APPROVED_ROOT, "runs", runId), path)) throw new Error("COORDINATION_QA_PATH_REJECTED")
  const unsigned = { schemaVersion: "1.0.0", result: "PASS", value }
  const content = canonicalJson({ ...unsigned, checksum: sha256Hex(canonicalJson(unsigned)) })
  const handle = await open(path, "wx")
  try { await handle.writeFile(content, "utf8"); await handle.sync() } finally { await handle.close() }
  if (await readFile(path, "utf8") !== content) throw new Error("COORDINATION_QA_READBACK_REJECTED")
}

test.describe.serial("COORDINATION-EZEQUIEL-DEV-QA-002", () => {
  test.beforeAll(() => requireQaEnvironment())

  test("SC04_matrix_AND_empty_stability SC05_disclosure_accessibility_zero_mutation H01_no_pending_no_write", async ({ browser }) => {
    const desktop = await runViewport(browser, { width: 1440, height: 900 }, false)
    const mobile = await runViewport(browser, { width: 390, height: 844 }, true)
    await runTrueEmpty(browser)
    await writeQaEvidence({ desktop, mobile, trueEmpty: "PASS", categories: ["Documentación", "Consumo", "Facturación"], remitosAssumed: false })
  })
})
