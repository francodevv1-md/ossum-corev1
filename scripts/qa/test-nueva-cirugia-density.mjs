import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const SHOTS_DIR = "scripts/qa/shots"
mkdirSync(SHOTS_DIR, { recursive: true })

const CHROMIUM = "C:/Users/franc/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
const BASE = "http://localhost:5000"

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM,
  })

  // 1. Authenticate via standard form
  console.log("Authenticating via login form...")
  const authContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const authPage = await authContext.newPage()
  await authPage.goto(`${BASE}/login`, { waitUntil: "networkidle" })
  
  await authPage.fill('input[type="email"]', "admin.dev@ossum.local")
  await authPage.fill('input[type="password"]', "@Districorr1251")
  await authPage.click('button[type="submit"]')
  await authPage.waitForTimeout(3000)
  
  const storageState = await authContext.storageState()
  await authContext.close()

  // 2. Viewport 1366x768
  console.log("Testing 1366x768...")
  const ctx1366 = await browser.newContext({
    storageState,
    viewport: { width: 1366, height: 768 },
  })
  const page1366 = await ctx1366.newPage()
  await page1366.goto(`${BASE}/cirugias`, { waitUntil: "networkidle" })
  await page1366.waitForTimeout(1500)

  // Click Nueva Cirugia dropdown then option
  const btn1366 = page1366.locator('button:has-text("Nueva cirugía")').first()
  if (await btn1366.count() > 0) {
    await btn1366.click()
    await page1366.waitForTimeout(600)
    const opt = page1366.locator('text="Crear nueva cirugía"').first()
    await opt.click()
    await page1366.waitForTimeout(1500)
    await page1366.screenshot({ path: `${SHOTS_DIR}/nueva-cirugia-2col-1366x768.png` })
    console.log(`Saved screenshot: ${SHOTS_DIR}/nueva-cirugia-2col-1366x768.png`)
  }
  await ctx1366.close()

  // 3. Viewport 1920x1080
  console.log("Testing 1920x1080...")
  const ctx1080 = await browser.newContext({
    storageState,
    viewport: { width: 1920, height: 1080 },
  })
  const page1080 = await ctx1080.newPage()
  await page1080.goto(`${BASE}/cirugias`, { waitUntil: "networkidle" })
  await page1080.waitForTimeout(1500)

  const btn1080 = page1080.locator('button:has-text("Nueva cirugía")').first()
  if (await btn1080.count() > 0) {
    await btn1080.click()
    await page1080.waitForTimeout(600)
    const opt = page1080.locator('text="Crear nueva cirugía"').first()
    await opt.click()
    await page1080.waitForTimeout(1500)
    await page1080.screenshot({ path: `${SHOTS_DIR}/nueva-cirugia-2col-1920x1080.png` })
    console.log(`Saved screenshot: ${SHOTS_DIR}/nueva-cirugia-2col-1920x1080.png`)
  }
  await ctx1080.close()

  await browser.close()
  console.log("Finished QA screenshots successfully!")
}

run().catch(console.error)
