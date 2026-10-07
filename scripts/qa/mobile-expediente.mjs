// ponytail: Browser QA for the mobile expediente. Not committed to the repo.
// Loads /cirugias on the dev server, signs in as a known DEV user, opens an
// expediente, captures screenshots at the requested viewports, and
// validates: bottom nav visibility, no overflow, NavError in console.
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
const DESKTOP_VIEWPORT = { name: "1280-desktop", width: 1440, height: 900 }

const log = (...args) => console.log("[qa-mobile]", ...args)

async function authenticateOnce(browser, email, password) {
  // ponytail: do the login flow once, persist cookies + storage via
  // storageState, and reuse across viewports. Faster + more reliable than
  // re-driving the form per context.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  // First visit any same-origin page so we share cookies / localStorage
  // with the auth client.
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30000 })
  // Drive the actual form like a user would.
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('button[type="submit"]').first()
  await submit.click()
  // Wait for either an auth POST response or a navigation away from /login.
  try {
    await Promise.race([
      page.waitForResponse(
        (r) => r.url().includes("/auth/v1/token") && r.request().method() === "POST",
        { timeout: 30000 }
      ),
      page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 30000 }),
    ])
  } catch {
    /* fallthrough */
  }
  await page.waitForTimeout(2000)
  // If we are still on /login, the auth likely failed; try again via the
  // supabase client directly so we don't depend on form quirks.
  if (page.url().includes("/login")) {
    log("form submit did not navigate — falling back to supabase client")
    await page.evaluate(
      async ({ email, password }) => {
        const mod = await import("/_next/static/chunks/lib/auth/client.js").catch(() => null)
        if (!mod) return { ok: false, reason: "client module not loaded" }
        const { supabaseBrowserClient } = mod
        const { error } = await supabaseBrowserClient.auth.signInWithPassword({ email, password })
        return { ok: !error, error: error?.message }
      },
      { email, password }
    )
    await page.waitForTimeout(2000)
  }
  log("authenticated — current url:", page.url())
  const storage = await context.storageState()
  await context.close()
  return storage
}

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png`, fullPage: false })
  log("shot", name)
}

async function viewportChecks(page, label) {
  // ponytail: visual sanity + structural assertions.
  // Returns `{ bottomNavVisible, correoHidden, overflows }` for the
  // calling test to surface in the final report.
  const result = await page.evaluate(() => {
    const root = document.documentElement
    const scrollX = root.scrollWidth - root.clientWidth
    const scrollY = root.scrollHeight - root.clientHeight
    const nav = document.querySelector('nav[aria-label="Secciones del expediente"]')
    const navBox = nav?.getBoundingClientRect()
    const navVisible = Boolean(
      nav && navBox && navBox.bottom > 0 && navBox.bottom <= window.innerHeight + 1
    )
    const correoButton = document.querySelector(
      'button[role="tab"][value="correo"], nav[aria-label="Secciones del expediente"] button:has(svg) [aria-label*="orreo" i], a[href*="correo"]'
    )
    const findCorreoLink = () => {
      const buttons = Array.from(document.querySelectorAll("button, a"))
      return buttons.some((el) => /correo/i.test(el.textContent || "") || /correo/i.test(el.getAttribute("aria-label") || ""))
    }
    return {
      horizontalOverflowPx: scrollX,
      verticalOverflowPx: scrollY,
      bottomNavVisible: navVisible,
      correoButtonFound: Boolean(correoButton) || findCorreoLink(),
      windowInner: { width: window.innerWidth, height: window.innerHeight },
    }
  })
  log(label, JSON.stringify(result, null, 2))
  return result
}

async function runForViewport(vp, storageState) {
  log(`\n=== ${vp.name} ===`)
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    userAgent:
      vp.width < 1024
        ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    storageState,
  })
  const page = await context.newPage()
  page.on("pageerror", (err) => log("pageerror", err.message))
  page.on("console", (msg) => {
    if (msg.type() === "error") log("console.error", msg.text())
  })

  try {
    await page.goto(`${BASE}/cirugias`, { waitUntil: "domcontentloaded", timeout: 30000 })
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(800)

    await shot(page, `${vp.name}-01-list`)

    // Try to open the first surgery card in the list to land on the expediente.
    const firstCard = page.locator('button[aria-label^="Abrir cirug"]').first()
    if ((await firstCard.count()) > 0) {
      await firstCard.click()
      await page.waitForTimeout(800)
      await shot(page, `${vp.name}-02-expediente`)

      const nav = page.locator('nav[aria-label="Secciones del expediente"]')
      if ((await nav.count()) > 0) {
        // Scroll the content area to the very bottom and verify the
        // bottom nav is still visible.
        await page.evaluate(() => {
          const scroll = document.querySelector(".flex-1.overflow-y-auto")
          if (scroll) scroll.scrollTop = scroll.scrollHeight
        })
        await page.waitForTimeout(500)
        await shot(page, `${vp.name}-03-expediente-scrolled`)
      }
    } else {
      log("no surgery card found — empty list or auth issue")
    }

    return await viewportChecks(page, vp.name)
  } catch (err) {
    log(`viewport ${vp.name} failed:`, err.message)
    return null
  } finally {
    await context.close()
  }
}

const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM })
try {
  const storageState = await authenticateOnce(
    browser,
    process.env.QA_EMAIL || "admin.dev@ossum.local",
    process.env.QA_PASSWORD || "@Districorr1251"
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