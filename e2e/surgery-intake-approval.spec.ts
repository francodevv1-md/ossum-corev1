import { test, expect, type Response } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { mockClassifications } from "../src/data/mock-classifications"

const company = "codevdistricorr1000000000"
const prefix = `/api/companies/${company}`
const surgeries = `${prefix}/surgeries`
const exceptionSentence = "confirma que no tiene una imagen de autorización"
type Fixture = { id: string; code: string; email: string; name: string; roles: string[]; linkRole: string; groups: string[] }
type Fixtures = Record<"patient" | "doctor" | "institution" | "payer", Fixture>
type Entry = { id: string; surgeryId: string; companyId: string; entryType: string; content: string; authorId: string; authorName: string; evidenceRef: unknown }
type Surgery = { id: string; companyId: string; visibleNumber: string; cxStatus: string; patientId: string; doctorId: string; institutionId: string; payerContactId: string; classification: string; notes: string; coordinatorAssignments: unknown[]; coordinatorAssignment: { status: string } }

function requireCondition(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}
const sameSet = (left: unknown, right: string[]) => Array.isArray(left)
  && left.every(item => typeof item === "string")
  && JSON.stringify([...left].sort()) === JSON.stringify([...right].sort())

// Required runtime contract (never loaded from .env files):
// CORE_FLOW_BASE_URL, CORE_FLOW_STORAGE_STATE, CORE_FLOW_ARTIFACT_DIR;
// CORE_FLOW_COMPANY_ID must equal the fixed approved target;
// CORE_FLOW_APPROVED_SYNTHETIC_MUTATION = <target>:one-intake-authorization;
// CORE_FLOW_SERVER_EFFECTS_ATTESTED = <target>:read-only-explorer:no-outbound:no-recipients;
// CORE_FLOW_BASELINE_ATTESTED = <target>:synthetic-baseline-only;
// CORE_FLOW_INTAKE_FIXTURES = JSON {patient,doctor,institution,payer}, each
// {id,code,email,name,roles,linkRole,groups}, exact independently verified baseline.
// CORE_FLOW_CLASSIFICATION_ID and CORE_FLOW_CLASSIFICATION_NAME select the
// existing local catalog. Surgery's backend contract persists the name, NOT ID.
async function prerequisites() {
  requireCondition(process.env.CORE_FLOW_COMPANY_ID === company
    && process.env.CORE_FLOW_APPROVED_SYNTHETIC_MUTATION === `${company}:one-intake-authorization`,
  "BLOCKED: exact-target single synthetic journey approval required")
  requireCondition(process.env.CORE_FLOW_SERVER_EFFECTS_ATTESTED === `${company}:read-only-explorer:no-outbound:no-recipients`,
    "BLOCKED: independent server side-effect attestation required")
  requireCondition(process.env.CORE_FLOW_BASELINE_ATTESTED === `${company}:synthetic-baseline-only`,
    "BLOCKED: independently verified synthetic baseline required")
  let fixtures: Fixtures
  try { fixtures = JSON.parse(process.env.CORE_FLOW_INTAKE_FIXTURES || "") } catch { throw new Error("BLOCKED: exact synthetic fixture configuration required") }
  const groups = { patient: ["pacientes"], doctor: ["medicos"], institution: ["instituciones"], payer: ["obras_sociales", "art", "particulares", "prepagas", "instituciones"] }
  const baseline = {
    patient: ["ctdevpatient1000000000000", "DEV-PATIENT", "juan.perez.dev@ossum.local"],
    doctor: ["ctdevdoctor10000000000000", "DEV-DOCTOR", "dra.garcia.dev@ossum.local"],
    institution: ["ctdevinstitution100000000", "DEV-INSTITUTION", "hospital.dev@ossum.local"],
    payer: ["ctdevpayer100000000000000", "DEV-PAYER", "obra.social.dev@ossum.local"],
  }
  for (const key of Object.keys(groups) as (keyof Fixtures)[]) {
    const f = fixtures?.[key]
    requireCondition(f && f.id === baseline[key][0] && f.code === baseline[key][1] && f.email === baseline[key][2]
      && typeof f.name === "string" && f.name.trim()
      && Array.isArray(f.roles) && f.roles.every(role => typeof role === "string") && f.roles.includes("cliente")
      && typeof f.linkRole === "string" && f.linkRole.trim()
      && Array.isArray(f.groups) && f.groups.every(group => typeof group === "string") && groups[key].some(group => f.groups.includes(group)),
    "BLOCKED: only exact compatible synthetic baseline fixtures permitted")
  }
  const classification = mockClassifications.find(c => c.id === process.env.CORE_FLOW_CLASSIFICATION_ID
    && c.name === process.env.CORE_FLOW_CLASSIFICATION_NAME && c.active)
  requireCondition(classification, "BLOCKED: exact existing classification catalog entry required")
  // Native JS import avoids the TS runner transforming existing .mjs helpers.
  const importJS = new Function("url", "return import(url)") as (url: string) => Promise<{
    registeredRoots: (directory: string) => string[]
    validateStatePath: (value: string | undefined, mode: string, roots: string[]) => string
  }>
  const helper = await importJS(pathToFileURL(path.resolve(__dirname, "../scripts/qa/dev-session.mjs")).href)
  const roots = helper.registeredRoots(process.cwd())
  const state = helper.validateStatePath(process.env.CORE_FLOW_STORAGE_STATE, "preflight", roots)
  const artifacts = process.env.CORE_FLOW_ARTIFACT_DIR!
  helper.validateStatePath(path.join(artifacts, `.intake-path-check-${randomUUID()}`), "capture", roots)
  let resume: { createdId: string; visibleNumber: string; marker: string } | undefined
  if (process.env.CORE_FLOW_RESUME_RECEIPT) {
    const receiptPath = helper.validateStatePath(process.env.CORE_FLOW_RESUME_RECEIPT, "preflight", roots)
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"))
    requireCondition(receipt.companyId === company && receipt.nativeCreationObserved === true
      && /^c[a-z0-9]{24}$/.test(receipt.createdId) && /^CX-\d+$/.test(receipt.visibleNumber)
      && /^QA-INTAKE-[0-9a-f-]{36}$/.test(receipt.marker), "BLOCKED: exact owned pending-case receipt required")
    resume = receipt
  }
  return { fixtures, classification, state, artifacts, resume }
}

test("synthetic native intake → UI evidence gate → one attributed exception → persisted authorization", async ({ playwright, baseURL }, testInfo) => {
  // No browser is created until all external-path and approval gates pass.
  const setup = await prerequisites().catch(() => {
    throw new Error("BLOCKED: approval, exact synthetic baseline, catalog, session path or external artifacts configuration required")
  })
  let browser: Awaited<ReturnType<typeof playwright.chromium.launch>> | undefined
  let phase = "preflight"
  let createdId = ""
  let visibleNumber = ""
  const marker = setup.resume?.marker || `QA-INTAKE-${randomUUID()}`
  const writes = { create: 0, note: 0, status: 0 }
  let violation = false
  let allowCreate = false
  let allowAuthorization = false
  let explicitException = false
  let bearer = ""
  try {
    requireCondition(baseURL, "BLOCKED: explicit loopback origin required")
    browser = await playwright.chromium.launch({ timeout: 30_000 })
    const context = await browser.newContext({ storageState: setup.state, baseURL, viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" })
    const page = await context.newPage()
    page.setDefaultTimeout(15_000)
    page.setDefaultNavigationTimeout(30_000)
    // Abort guards are safety tripwires, never fulfilled/mock successes. Server
    // effects need the separate independent attestation above.
    await context.route("**/*", async route => {
      const request = route.request()
      const url = new URL(request.url())
      const method = request.method()
      let allowed = url.origin === baseURL
      if (url.pathname.startsWith("/api/companies/") && !url.pathname.startsWith(`${prefix}/`)) allowed = false
      if (/\/(?:mail|ai|ocr|upload|documents|stock|cajas|invoices|payments|availability)(?:\/|$)/i.test(url.pathname)) allowed = false
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        allowed = false
        try {
          const body = request.postDataJSON()
          if (url.origin === baseURL && !url.search && allowCreate && method === "POST" && url.pathname === surgeries && writes.create === 0) {
            const f = setup.fixtures
            allowed = body.patientId === f.patient.id && body.patientContact?.id === f.patient.id
              && body.doctorId === f.doctor.id && body.doctorContact?.id === f.doctor.id
              && body.institutionId === f.institution.id && body.institutionContact?.id === f.institution.id
              && body.payerContactId === f.payer.id && body.payerContact?.id === f.payer.id
              && body.coordinatorContactId === null && body.coordinatorContact === null
              && body.classification === setup.classification.name && body.notes === marker
              && !body.surgeryDate && !body.probableDate && !body.scheduledDate
              && (!body.cxStatus || body.cxStatus === "pending")
              && body.source === "cirugias-ui:new-surgery-dialog"
            if (allowed) { writes.create++; allowCreate = false }
          } else if (url.origin === baseURL && !url.search && allowAuthorization && explicitException && createdId) {
            if (method === "POST" && url.pathname === `${surgeries}/${createdId}/seguimiento` && writes.note === 0) {
              allowed = body.entryType === "note" && /^El usuario .+: confirma que no tiene una imagen de autorización$/.test(body.content)
                && Object.keys(body).every(key => ["entryType", "content"].includes(key))
              if (allowed) writes.note++
            } else if (method === "PATCH" && url.pathname === `${surgeries}/${createdId}/status` && writes.note === 1 && writes.status === 0) {
              allowed = body.status === "Autorizada" && body.source === "cirugias-ui:change-state"
                && Object.keys(body).every(key => ["status", "source"].includes(key))
              if (allowed) writes.status++
            }
          }
        } catch { allowed = false }
      }
      if (!allowed) { violation = true; await route.abort("blockedbyclient"); return }
      await route.continue()
    })
    await context.routeWebSocket("**/*", socket => {
      // Next DEV needs its exact local HMR socket to finish client bootstrap.
      const expected = new URL(baseURL)
      expected.protocol = "ws:"
      const url = new URL(socket.url())
      if (url.origin === expected.origin && ["/_next/hmr", "/_next/webpack-hmr"].includes(url.pathname)) socket.connectToServer()
      else { violation = true; socket.close() }
    })
    phase = "session-navigation"
    const [membership] = await Promise.all([
      page.waitForResponse(r => r.url() === `${baseURL}${prefix}/me` && r.request().method() === "GET", { timeout: 30_000 }),
      page.goto("/cirugias", { waitUntil: "domcontentloaded" }),
    ])
    phase = "session-verification"
    bearer = await membership.request().headerValue("authorization") || ""
    requireCondition(/^Bearer \S+$/.test(bearer), "BLOCKED: existing bearer-authenticated session required")
    const readResponse = async (response: Response) => {
      if (response.status() === 401) throw new Error("E2E blocked by expired authentication state")
      requireCondition(response.ok(), "FAIL: native response rejected")
      return (await response.json()).data
    }
    const me = await readResponse(membership)
    requireCondition(membership.status() === 200 && me?.activeCompany?.id === company && me?.access?.role === "admin"
      && typeof me?.user?.id === "string" && me.user.id, "BLOCKED: exact-company existing admin membership required")
    const actorId = me.user.id
    const actorName = me.user.displayName
    const get = async (pathname: string) => {
      const response = await context.request.get(`${baseURL}${pathname}`, { headers: { Authorization: bearer }, maxRedirects: 0, timeout: 15_000 })
      if (response.status() === 401) throw new Error("E2E blocked by expired authentication state")
      requireCondition(response.status() === 200, "FAIL: authenticated readback rejected")
      return (await response.json()).data
    }
    const verifyFixture = (records: any[], f: Fixture) => {
      requireCondition(Array.isArray(records), "BLOCKED: fixture read contract mismatch")
      const exact = records.filter(c => c.id === f.id && c.code === f.code)
      const c = exact[0]
      const name = c && ((c.firstName && c.lastName) ? `${c.firstName.trim()} ${c.lastName.trim()}` : c.legalName?.trim() || [c.firstName, c.lastName].filter(Boolean).join(" ").trim())
      requireCondition(exact.length === 1 && records.filter(c => c.code === f.code).length === 1
        && c.linkIsActive === true && c.isActive === true && name === f.name && c.email === f.email
        && c.linkRole === f.linkRole && sameSet(c.roles, f.roles) && sameSet(c.groupSlugs, f.groups)
        && !/DISTRICORR-STAFF-TEN-CASE/i.test(c.notes || ""),
      "BLOCKED: exact active synthetic fixture identity, code or roles mismatch")
    }
    phase = "fixture-verification"
    for (const f of Object.values(setup.fixtures)) verifyFixture(await get(`${prefix}/contacts?search=${encodeURIComponent(f.code)}&take=20`), f)
    requireCondition(!violation, "BLOCKED: unexpected traffic before mutation")

    phase = "native-intake"
    if (setup.resume) {
      createdId = setup.resume.createdId
      visibleNumber = setup.resume.visibleNumber
    } else {
    await page.getByRole("button", { name: "Nueva cirugía", exact: true }).click()
    await page.getByRole("menuitem", { name: "Crear nueva cirugía", exact: true }).click()
    const wizard = page.getByRole("dialog", { name: "Nueva Cirugía", exact: true })
    for (const [field, label, key] of [["client", "Cliente / Pagador *", "payer"], ["patient", "Paciente *", "patient"], ["surgeon", "Médico *", "doctor"], ["institution", "Institución *", "institution"]] as const) {
      const f = setup.fixtures[key]
      const input = wizard.getByLabel(label, { exact: true })
      const lookup = page.waitForResponse(r => new URL(r.url()).pathname === `${prefix}/contacts`
        && new URL(r.url()).searchParams.get("search") === f.code && r.request().method() === "GET")
      await input.fill(f.code)
      await input.press("Enter")
      verifyFixture(await readResponse(await lookup), f)
      await expect(wizard.locator(`[data-step0-field="${field}"]`).getByText(f.name, { exact: true })).toBeVisible()
    }
    // Read the actual persisted catalog, if present; default is the inspected
    // source catalog. This is not a nonexistent backend classification-ID API.
    const catalogMatches = await page.evaluate(({ id, name }) => {
      const stored = localStorage.getItem("ortotrack-v2-storage")
      if (!stored) return true
      const catalog = JSON.parse(stored)?.state?.classifications
      return catalog === undefined || (Array.isArray(catalog)
        && catalog.filter(c => c.id === id && c.name === name && c.active === true).length === 1)
    }, { id: setup.classification.id, name: setup.classification.name })
    requireCondition(catalogMatches, "BLOCKED: active local classification catalog mismatch")
    await wizard.locator('[data-step0-field="classification"]').getByRole("button").click()
    const selector = page.getByRole("dialog", { name: "Seleccionar clasificación", exact: true })
    await selector.getByPlaceholder("Buscar clasificación...").fill(setup.classification.name)
    await selector.getByRole("button").filter({ has: page.getByText(setup.classification.name, { exact: true }) }).click()
    await wizard.getByPlaceholder("Notas internas...", { exact: true }).fill(marker)
    await wizard.getByTestId("wizard-next-btn").click()
    await wizard.getByTestId("toggle-no-pr").click()
    await wizard.getByTestId("wizard-next-btn").click()
    requireCondition(!violation, "BLOCKED: unexpected traffic before native creation")
    allowCreate = true
    const creation = page.waitForResponse(r => r.url() === `${baseURL}${surgeries}` && r.request().method() === "POST")
    await wizard.getByTestId("wizard-confirm-btn").click()
    const record = await readResponse(await creation)
    createdId = typeof record?.id === "string" ? record.id : ""
    visibleNumber = typeof record?.visibleNumber === "string" ? record.visibleNumber : ""
    // Preserve only owned synthetic identity if a later assertion fails. Never
    // delete or retry creation automatically; the coordinator can inspect it.
    await writeFile(path.join(setup.artifacts, `${marker}-created.json`), JSON.stringify({
      result: "CREATED_NOT_YET_VALIDATED", companyId: company, marker, createdId, visibleNumber, nativeCreationObserved: true,
    }, null, 2), { flag: "wx" })
    requireCondition(/^c[a-z0-9]{24}$/.test(createdId) && /^CX-\d+$/.test(visibleNumber), "FAIL: native backend CUID identity missing")
    }
    const assertSurgery = (s: Surgery, status: string) => requireCondition(s?.id === createdId && s.companyId === company
      && s.visibleNumber === visibleNumber && s.cxStatus === status && s.notes === marker
      && s.patientId === setup.fixtures.patient.id && s.doctorId === setup.fixtures.doctor.id
      && s.institutionId === setup.fixtures.institution.id && s.payerContactId === setup.fixtures.payer.id
      && s.classification === setup.classification.name && s.coordinatorAssignments?.length === 0
      && s.coordinatorAssignment?.status === "none", "FAIL: persisted surgery contract mismatch")
    assertSurgery(await get(`${surgeries}/${createdId}`), "pending")
    const entries = async (): Promise<Entry[]> => {
      const data = await get(`${surgeries}/${createdId}/seguimiento?take=100`)
      requireCondition(Array.isArray(data?.entries) && data?.meta?.hasMore === false
        && data.meta.total === data.entries.length, "FAIL: complete tracking readback required")
      return data.entries
    }
    const before = await entries()
    requireCondition(before.length === 0, "FAIL: new synthetic case unexpectedly has evidence or notes")
    if (!setup.resume) await page.getByRole("dialog", { name: "Cirugía creada", exact: true }).getByRole("button", { name: "Cerrar", exact: true }).click()
    const row = () => page.getByRole("row").filter({ has: page.getByText(visibleNumber, { exact: true }) })
    await expect(row()).toHaveCount(1)
    await row().locator('button[aria-haspopup="menu"]').click()
    await page.getByRole("menuitem", { name: "Cambiar estado", exact: true }).click()
    const dialog = page.getByRole("dialog", { name: "Cambiar Estado de Cirugía", exact: true })
    await dialog.getByRole("combobox").click()
    await page.getByRole("option", { name: "Autorizada", exact: true }).click()
    phase = "ui-evidence-gate"
    const confirm = dialog.getByRole("button", { name: "Confirmar cambio", exact: true })
    await expect(dialog.getByRole("checkbox", { name: "No posee autorizado", exact: true })).not.toBeChecked()
    await expect(confirm).toBeDisabled()
    requireCondition(writes.note === 0 && writes.status === 0, "FAIL: disabled UI attempted authorization")
    requireCondition((await entries()).length === 0, "FAIL: negative UI check created tracking evidence")
    assertSurgery(await get(`${surgeries}/${createdId}`), "pending")
    phase = "server-evidence-gate"
    const denied = await context.request.patch(`${baseURL}${surgeries}/${createdId}/status`, {
      headers: { Authorization: bearer }, data: { status: "authorized" }, maxRedirects: 0, timeout: 15_000,
    })
    if (denied.status() === 401) throw new Error("E2E blocked by expired authentication state")
    requireCondition(denied.status() === 409 && (await denied.json())?.error?.code === "surgery_authorization_evidence_required",
      "FAIL: server must reject authorization without evidence")
    assertSurgery(await get(`${surgeries}/${createdId}`), "pending")
    requireCondition((await entries()).length === 0, "FAIL: rejected authorization must not create evidence")
    phase = "explicit-exception"
    await dialog.getByRole("checkbox", { name: "No posee autorizado", exact: true }).check()
    explicitException = true
    await dialog.getByLabel("Observación adicional (opcional)", { exact: true }).fill(marker)
    // Native action currently does not persist this optional observation. The
    // unique marker lives on Surgery; note linkage + server authorId attribute it.
    await expect(confirm).toBeEnabled()
    requireCondition(!violation, "BLOCKED: unexpected traffic before authorization")
    allowAuthorization = true
    const noteResponse = page.waitForResponse(r => r.url() === `${baseURL}${surgeries}/${createdId}/seguimiento` && r.request().method() === "POST")
    const statusResponse = page.waitForResponse(r => r.url() === `${baseURL}${surgeries}/${createdId}/status` && r.request().method() === "PATCH")
    await confirm.click()
    const [note] = await Promise.all([noteResponse.then(readResponse), statusResponse.then(readResponse)])
    allowAuthorization = false
    await expect(dialog).toBeHidden()
    const assertAuthorization = async () => {
      assertSurgery(await get(`${surgeries}/${createdId}`), "authorized")
      const persisted = await entries()
      requireCondition(persisted.length === 1 && persisted[0].id === note.id
        && persisted[0].surgeryId === createdId && persisted[0].companyId === company
        && persisted[0].entryType === "note" && persisted[0].authorId === actorId
        && typeof persisted[0].authorName === "string" && persisted[0].authorName.trim()
        && persisted[0].content === `El usuario ${actorName}: ${exceptionSentence}`
        && persisted[0].evidenceRef === null, "FAIL: exactly one server-attributed native exception required")
    }
    await assertAuthorization()
    phase = "reload-persistence"
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(row()).toHaveCount(1)
    await expect(row().getByText("Autorizada", { exact: true })).toBeVisible()
    await assertAuthorization()
    requireCondition(!violation && Object.entries(writes).every(([kind, count]) => count === (kind === "create" && setup.resume ? 0 : 1)),
      "FAIL: unexpected or repeated mutation detected")
    await writeFile(path.join(setup.artifacts, `${marker}.json`), JSON.stringify({
      result: "PASS", marker, createdId, visibleNumber,
      contacts: Object.fromEntries(Object.entries(setup.fixtures).map(([key, f]) => [key, { id: f.id, code: f.code }])),
      classification: { catalogId: setup.classification.id, persistedLabel: setup.classification.name },
      canonicalStatus: "authorized", exceptionCount: 1, actorAttributionVerified: true,
      uiGateVerified: true, serverGateVerified: true, rejectedAuthorizationRequests: 1, reloadVerified: true, resumedOwnedNativeCreation: Boolean(setup.resume), writes,
    }, null, 2), { flag: "wx" })
  } catch (error) {
    // No identities, tokens, environment values or raw response errors in reports.
    testInfo.annotations.push({ type: "process", description: `Stopped at ${phase}; native case retained if created; no cleanup` })
    testInfo.annotations.push({ type: "mutation-counts", description: `create=${writes.create},note=${writes.note},status=${writes.status},tripwire=${violation}` })
    if (error instanceof Error) testInfo.annotations.push({ type: "diagnose", description: /^(?:BLOCKED|FAIL):/.test(error.message) ? error.message : `Error class: ${error.name.replace(/[^a-zA-Z]/g, "")}` })
    if (error instanceof Error && error.message === "E2E blocked by expired authentication state") throw new Error(error.message)
    throw new Error(phase === "preflight" ? "BLOCKED: authenticated session, exact fixtures or traffic prerequisites" : `FAIL: guarded synthetic journey at ${phase}; inspect locally`)
  } finally {
    bearer = ""
    await browser?.close()
  }
})
