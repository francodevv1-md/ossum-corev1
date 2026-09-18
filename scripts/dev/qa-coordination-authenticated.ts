import { chromium, type Page } from "@playwright/test"
import { config as loadEnv } from "dotenv"

loadEnv({ path: ".env.local", override: false, quiet: true })
loadEnv({ path: ".env", override: false, quiet: true })

const PROJECT_REF = "yywqcdromnmmelijvspi"
const ASSIGNED_EMAIL = "ezequiel.dev@ossum.test"
const EMPTY_EMAIL = "coordinacion.vacia.dev@ossum.test"

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`MISSING_${name}`)
  return value
}

async function login(page: Page, email: string, password: string): Promise<void> {
  let authStatus: number | null = null
  let authProjectRef: string | null = null
  page.on("response", (response) => {
    if (response.url().includes("/auth/v1/token")) {
      authStatus = response.status()
      authProjectRef = new URL(response.url()).hostname.split(".")[0] ?? null
    }
  })
  await page.goto("http://127.0.0.1:3001/login?next=/coordinadores/mi-bandeja")
  await page.getByLabel(/correo|email/i).fill(email)
  await page.getByLabel(/contraseña|password/i).fill(password)
  await page.getByRole("button", { name: /ingresar|iniciar sesión|login/i }).click()
  try {
    await page.waitForURL(/\/coordinadores\/mi-bandeja$/, { timeout: 30_000 })
  } catch {
    throw new Error(`LOGIN_NAVIGATION_TIMEOUT_AUTH_${authStatus ?? "NONE"}`)
  }
  if (authStatus === null || authStatus < 200 || authStatus >= 300) throw new Error("AUTH_TOKEN_REJECTED")
  if (authProjectRef !== PROJECT_REF) throw new Error("AUTH_PROJECT_REJECTED")
  await page.locator("main").waitFor({ state: "visible" })
}

async function runAccount(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  input: { label: string; email: string; password: string; empty: boolean; viewport: { width: number; height: number } },
): Promise<{ label: string; viewport: string; cards: number; empty: boolean; overflow: boolean }> {
  const context = await browser.newContext({ viewport: input.viewport, storageState: undefined })
  const page = await context.newPage()
  const failures: string[] = []
  page.on("pageerror", () => failures.push("PAGE_ERROR"))
  page.on("response", (response) => { if (response.status() >= 500) failures.push("HTTP_5XX") })
  try {
    await login(page, input.email, input.password)
    const cards = page.locator("[data-coordinator-case-card='compact-responsive']")
    if (input.empty) {
      await page.locator("p:not(.sr-only)", { hasText: "No tenés casos asignados en esta etapa." }).waitFor({ timeout: 30_000 })
      if (await cards.count() !== 0) throw new Error("EMPTY_ACCOUNT_HAS_CASES")
    } else {
      await cards.first().waitFor({ state: "visible", timeout: 30_000 })
      if (await cards.count() === 0) throw new Error("ASSIGNED_ACCOUNT_HAS_NO_CASES")
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    if (overflow) throw new Error("HORIZONTAL_OVERFLOW")
    if (failures.length > 0) throw new Error([...new Set(failures)].join("_"))
    return {
      label: input.label,
      viewport: `${input.viewport.width}x${input.viewport.height}`,
      cards: await cards.count(),
      empty: input.empty,
      overflow,
    }
  } catch (error) {
    throw new Error(`${input.label.toUpperCase()}_${input.viewport.width}x${input.viewport.height}_${error instanceof Error ? error.message : "UNKNOWN"}`)
  } finally {
    await context.close()
  }
}

async function main(): Promise<void> {
  if (required("OSSUM_COORDINATION_SERVER_ATTESTED") !== "true") throw new Error("SERVER_NOT_ATTESTED")
  if (required("OSSUM_COORDINATION_EXPECTED_PROJECT_REF") !== PROJECT_REF) throw new Error("PROJECT_REJECTED")
  const assigned = {
    email: required("OSSUM_COORDINATION_OPERATOR_EMAIL"),
    password: required("OSSUM_COORDINATION_OPERATOR_PASSWORD"),
  }
  const empty = {
    email: required("OSSUM_COORDINATION_EMPTY_OPERATOR_EMAIL"),
    password: required("OSSUM_COORDINATION_EMPTY_OPERATOR_PASSWORD"),
  }
  if (assigned.email.trim().toLowerCase() !== ASSIGNED_EMAIL || empty.email.trim().toLowerCase() !== EMPTY_EMAIL) {
    throw new Error("QA_IDENTITIES_REJECTED")
  }
  const browser = await chromium.launch({ headless: true })
  try {
    const results: Awaited<ReturnType<typeof runAccount>>[] = []
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      results.push(await runAccount(browser, { label: "assigned", ...assigned, empty: false, viewport }))
      results.push(await runAccount(browser, { label: "empty", ...empty, empty: true, viewport }))
    }
    console.log(JSON.stringify({ outcome: "PASS", results, secretOutput: false }))
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ outcome: "FAIL", statusCode: error instanceof Error ? error.message : "UNKNOWN", secretOutput: false }))
  process.exitCode = 1
})
