// ponytail: Browser QA for the mobile listado + expediente mobile.
// Uses storageState from a single login to avoid re-driving the form.
import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const SHOTS_DIR = "scripts/qa/shots"
mkdirSync(SHOTS_DIR, { recursive: true })

const CHROMIUM =
  "C:/Users/franc/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"

const BASE = "http://localhost:5000"

const MOBILE_VIEWPORTS = [
  { name: "360x800-iPhoneSE", width: 360, height: 800 },
  { name: "393x873-Pixel8", width: 393, height: 873 },
  { name: "412x915-Pixel7", width: 412, height: 915 },
]
const DESKTOP_VIEWPORT = { name: "1440x900-desktop", width: 1440, height: 900 }

const log = (...args) => console.log("[qa-mobile-list]", ...args)

async function authenticateOnce(browser, email, password) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  // ponytail: drive signInWithPassword via the already-loaded supabase
  // bundle on the page. Supabase persists the session in localStorage as
  // 'sb-<project>-auth-token', which storageState captures for the next
  // context. This bypasses the form's React submit cycle.
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30000 })
  await page.waitForFunction(
    () => Boolean(window.supabase?.auth?.signInWithPassword),
    { timeout: 30000 },
  )
  const authResult = await page.evaluate(
    async ({ email, password }) => {
      const { error, data } = await window.supabase.auth.signInWithPassword({ email, password })
      return { ok: !error, error: error?.message, userId: data?.user?.id }
    },
    { email, password },
  )
  log("supabase signIn result:", JSON.stringify(authResult))
  await page.waitForTimeout(1000)
  const storage = await context.storageState()
  await context.close()
  return storage
}

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png`, fullPage: false })
  log("shot", name)
}

async function runForViewport(vp, storageState) {
  log(`\n=== ${vp.name} ===`)
  const isMobileVp = vp.width < 1024
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    userAgent: isMobileVp
      ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    storageState,
    hasTouch: isMobileVp,
  })
  const page = await context.newPage()
  page.on("pageerror", (err) => log("pageerror", err.message))

  try {
    await page.goto(`${BASE}/cirugias`, { waitUntil: "domcontentloaded", timeout: 30000 })
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1000)
    await shot(page, `${vp.name}-01-list`)

    if (isMobileVp) {
      // Open the actions bottom sheet for the first card.
      const actionBtn = page.locator('button[aria-label^="Acciones para"]').first()
      if ((await actionBtn.count()) > 0) {
        await actionBtn.click()
        await page.waitForTimeout(600)
        await shot(page, `${vp.name}-02-actions-sheet`)

        // Close the sheet, then test "Agregar nota al seguimiento".
        const agregarNota = page.locator('button:has-text("Agregar nota al seguimiento")').first()
        if ((await agregarNota.count()) > 0) {
          await agregarNota.click()
          await page.waitForTimeout(1500)
          await shot(page, `${vp.name}-03-after-AgregarNota`)

          // Verify we landed on /expediente or that the composer opened.
          const url = page.url()
          log("after AgregarNota url:", url)
          const composer = page.locator('textarea').first()
          const composerVisible = (await composer.count()) > 0
          log("composer visible:", composerVisible)
        }

        // Go back to the list and open a card to verify expediente + bottom nav.
        await page.goto(`${BASE}/cirugias`, { waitUntil: "domcontentloaded", timeout: 30000 })
        await page.waitForTimeout(800)
        const card = page.locator('button[aria-label^="Abrir cirug"]').first()
        if ((await card.count()) > 0) {
          await card.click()
          await page.waitForTimeout(1200)
          await shot(page, `${vp.name}-04-expediente`)

          const nav = page.locator('nav[aria-label="Secciones del expediente"]')
          const navVisible = await nav.isVisible().catch(() => false)
          log("bottom nav visible:", navVisible)
        }
      }
    } else {
      // Desktop: just snapshot the list to verify no regression.
      const grid = page.locator('table').first()
      if ((await grid.count()) > 0) {
        log("desktop grid present (no regression)")
      }
    }

    return { ok: true }
  } catch (err) {
    log(`viewport ${vp.name} failed:`, err.message)
    return { ok: false, error: err.message }
  } finally {
    await context.close()
  }
}

const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM })
try {
  const storageState = await authenticateOnce(
    browser,
    process.env.QA_EMAIL || "admin.dev@ossum.local",
    process.env.QA_PASSWORD || "@Districorr1251",
  )
  const report = {}
  for (const vp of MOBILE_VIEWPORTS) {
    report[vp.name] = await runForViewport(vp, storageState)
  }
  report[DESKTOP_VIEWPORT.name] = await runForViewport(DESKTOP_VIEWPORT, storageState)
  console.log("\n=== QA REPORT ===")
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}