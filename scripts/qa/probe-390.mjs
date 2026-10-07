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
const ctx = await browser.newContext({ storageState, viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/cirugias`, { waitUntil: "networkidle" })
await page.waitForTimeout(1500)
await page.screenshot({ path: "scripts/qa/shots/audit-390-list.png" })
const btns = await page.evaluate(() =>
  [...document.querySelectorAll("button")].filter(b => b.offsetParent).map(b => (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 40)).filter(Boolean)
)
console.log(JSON.stringify(btns))
await browser.close()
