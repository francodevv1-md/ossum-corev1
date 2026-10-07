import { chromium } from "playwright"
import { writeFileSync, unlinkSync } from "node:fs"

const SHOTS_DIR = "scripts/qa/shots"
const CHROMIUM = "C:/Users/franc/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
const BASE = "http://localhost:5000"

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM,
  })

  const authContext = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const authPage = await authContext.newPage()
  await authPage.goto(`${BASE}/login`, { waitUntil: "networkidle" })
  await authPage.fill('input[type="email"]', "admin.dev@ossum.local")
  await authPage.fill('input[type="password"]', "@Districorr1251")
  await authPage.click('button[type="submit"]')
  await authPage.waitForTimeout(3000)
  
  const storageState = await authContext.storageState()
  await authContext.close()

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

  // Create temporary mock authorization image
  const tempFile = "scripts/qa/test-auth-order.png"
  const dummyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  )
  writeFileSync(tempFile, dummyPng)

  // Set file on the file input
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(tempFile)
  console.log("File set on input, waiting for AI processing...")
  await page.waitForTimeout(4000)

  await page.screenshot({ path: `${SHOTS_DIR}/nueva-cirugia-after-upload-1366.png` })
  console.log("Saved after upload screenshot")

  // Click Asistente IA button to see rail with uploaded file
  const aiBtn = page.locator('button:has-text("Asistente IA")').first()
  if (await aiBtn.count() > 0) {
    await aiBtn.click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${SHOTS_DIR}/nueva-cirugia-rail-with-file-1366.png` })
    console.log("Saved rail with file screenshot")
  }

  try { unlinkSync(tempFile) } catch {}
  await ctx.close()
  await browser.close()
}

run().catch(console.error)
