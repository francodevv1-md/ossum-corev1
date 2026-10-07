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

  console.log("Authenticating via login form...")
  const authContext = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const authPage = await authContext.newPage()
  await authPage.goto(`${BASE}/login`, { waitUntil: "networkidle" })
  
  await authPage.fill('input[type="email"]', "admin.dev@ossum.local")
  await authPage.fill('input[type="password"]', "@Districorr1251")
  await authPage.click('button[type="submit"]')
  await authPage.waitForTimeout(3000)
  
  const storageState = await authContext.storageState()
  await authContext.close()

  console.log("Opening /cirugias at 1366x768...")
  const ctx = await browser.newContext({
    storageState,
    viewport: { width: 1366, height: 768 },
  })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/cirugias`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1500)

  // Open Nueva Cirugia
  const btn = page.locator('button:has-text("Nueva cirugía")').first()
  await btn.click()
  await page.waitForTimeout(600)
  const opt = page.locator('text="Crear nueva cirugía"').first()
  await opt.click()
  await page.waitForTimeout(1500)

  // 1. Initial screenshot
  await page.screenshot({ path: `${SHOTS_DIR}/nueva-cirugia-refreshed-1366.png` })
  console.log("Saved initial screenshot")

  // 2. Click "Asistente IA"
  const aiBtn = page.locator('button:has-text("Asistente IA")').first()
  if (await aiBtn.count() > 0) {
    console.log("Clicking Asistente IA button...")
    await aiBtn.click()
    await page.waitForTimeout(1000)
    
    const aside = page.locator('aside[aria-label="Panel asistente de IA"]')
    console.log("Aside count:", await aside.count())
    if (await aside.count() > 0) {
      console.log("Aside box:", await aside.boundingBox())
      console.log("Aside class:", await aside.getAttribute("class"))
      const style = await aside.evaluate((el) => {
        const cs = window.getComputedStyle(el)
        return {
          width: cs.width,
          flex: cs.flex,
          flexShrink: cs.flexShrink,
          flexBasis: cs.flexBasis,
          position: cs.position,
        }
      })
      console.log("Aside computed:", style)
    }
    const formEl = page.locator('.flex-1.min-w-0.overflow-y-auto').first()
    if (await formEl.count() > 0) {
      console.log("Form box:", await formEl.boundingBox())
      console.log("Form class:", await formEl.getAttribute("class"))
    }

    await page.screenshot({ path: `${SHOTS_DIR}/nueva-cirugia-rail-open-1366.png` })
    console.log("Saved screenshot with rail open")
  }

  await ctx.close()
  await browser.close()
  console.log("Finished successfully!")
}

run().catch(console.error)
