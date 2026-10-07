import { chromium } from "playwright"
const CHROMIUM = "C:/Users/franc/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
const BASE = "http://localhost:5000"
const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM })
const auth = await browser.newContext({ viewport: { width: 1366, height: 768 } })
const ap = await auth.newPage()
await ap.goto(`${BASE}/login`, { waitUntil: "networkidle" })
await ap.fill('input[type="email"]', "admin.dev@ossum.local")
await ap.fill('input[type="password"]', "@Districorr1251")
await ap.click('button[type="submit"]')
await ap.waitForTimeout(3000)
const storageState = await auth.storageState()
await auth.close()
const ctx = await browser.newContext({ storageState, viewport: { width: 2560, height: 1440 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/cirugias`, { waitUntil: "networkidle" })
await page.waitForTimeout(1200)
await page.getByRole("button", { name: /Nueva cirugía/ }).first().click()
await page.waitForTimeout(700)
await page.getByText("Crear nueva cirugía").first().click({ timeout: 3000 }).catch(() => {})
await page.waitForTimeout(1500)
const r = await page.evaluate(() => {
  const el = document.querySelector('[class*="max-w-[1540px]"]')
  if (!el) return { found: false }
  const cs = getComputedStyle(el)
  return { found: true, width: Math.round(el.getBoundingClientRect().width), maxWidth: cs.maxWidth, marginLeft: cs.marginLeft }
})
console.log(JSON.stringify(r))
await browser.close()
