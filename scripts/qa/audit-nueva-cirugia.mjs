import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const SHOTS = "scripts/qa/shots"
mkdirSync(SHOTS, { recursive: true })
const CHROMIUM = "C:/Users/franc/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
const BASE = "http://localhost:5000"
const VIEWPORTS = [
  [390, 844],
  [1366, 768],
  [1600, 900],
  [1920, 1080],
  [2560, 1440],
]

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

for (const [w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ storageState, viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/cirugias`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1200)
  await page.getByRole("button", { name: /Nueva cirugía/ }).first().click()
  await page.waitForTimeout(700)
  if (!(await page.locator('[role="dialog"]').count())) {
    await page.getByText("Crear nueva cirugía").first().click({ timeout: 3000 }).catch(() => {})
  } else if (await page.getByText("Crear nueva cirugía").count()) {
    await page.getByText("Crear nueva cirugía").first().click({ timeout: 3000 }).catch(() => {})
  }
  await page.waitForTimeout(1500)

  const m = await page.evaluate(() => {
    const scroller = document.querySelector(".overflow-y-auto.\\@container\\/form")
    const dlg = document.querySelector('[role="dialog"]')
    const inputs = [...document.querySelectorAll('[role="dialog"] input:not([type=file]):not([type=checkbox]), [role="dialog"] textarea')]
    const heights = inputs.filter(i => i.offsetParent).map(i => Math.round(i.getBoundingClientRect().height))
    const truncated = inputs
      .filter(i => i.offsetParent && i.placeholder && i.scrollWidth > i.clientWidth + 1)
      .map(i => i.placeholder)
    const smallText = [...document.querySelectorAll('[role="dialog"] *')]
      .filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11)
      .length
    return {
      scrollNeeded: scroller ? scroller.scrollHeight - scroller.clientHeight : null,
      docOverflowX: document.documentElement.scrollWidth - window.innerWidth,
      dlgOverflowX: dlg ? dlg.scrollWidth - dlg.clientWidth : null,
      inputHeights: [...new Set(heights)].sort((a, b) => a - b),
      truncatedPlaceholders: truncated,
      textUnder11px: smallText,
      aiRailOpenByDefault: !!document.querySelector('aside[aria-label="Panel asistente de IA"]'),
    }
  })
  console.log(`\n=== ${w}x${h} ===`)
  console.log(JSON.stringify(m, null, 2))
  await page.screenshot({ path: `${SHOTS}/audit-${w}x${h}.png` })
  await ctx.close()
}
await browser.close()
