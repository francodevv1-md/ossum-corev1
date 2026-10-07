import { chromium } from "../../../../node_modules/playwright/index.mjs"
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import path from "node:path"

const output = path.join(process.env.LOCALAPPDATA, "Temp/opencode/comprobantes-visual-20261006")
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("http://127.0.0.1:5187/", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Abrir PR 71" }).waitFor()
  const settleRows = () => page.waitForFunction(() => [...document.querySelectorAll("tbody tr")].every(row => Number(getComputedStyle(row).opacity) >= 0.999))
  await settleRows()
  await page.screenshot({ path: path.join(output, "desktop.png"), fullPage: true })
  await page.getByRole("button", { name: "Abrir PR 71" }).click()
  await page.getByRole("dialog").getByText("Prótesis de rodilla").waitFor()
  await page.getByRole("dialog").evaluate(element => Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))))
  await page.screenshot({ path: path.join(output, "detail.png"), fullPage: true })
  await page.getByRole("button", { name: "Close", exact: true }).click()
  await page.getByRole("button", { name: "Acciones FV 82" }).click()
  for (const name of ["Descargar PDF · No disponible", "Imprimir · No disponible", "Modificar · No disponible"]) {
    assert.equal(await page.getByRole("menuitem", { name }).getAttribute("aria-disabled"), "true")
  }
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Remitos 1" }).click()
  assert.equal(await page.locator("tbody tr").count(), 1)
  await page.getByRole("button", { name: "Todos 4" }).click()
  await settleRows()
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Page overflow at ${width}px`)
    await page.screenshot({ path: path.join(output, `mobile-${width}.png`), fullPage: true })
    await page.getByRole("button", { name: "Abrir FV 82" }).click()
    assert.equal(await page.getByRole("dialog").isVisible(), true)
    await page.getByRole("button", { name: "Close", exact: true }).click()
  }
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.reload({ waitUntil: "networkidle" })
  assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true)
  const transforms = await page.locator("tbody tr").evaluateAll(rows => rows.map(row => getComputedStyle(row).transform))
  assert.equal(transforms.every(value => value === "none" || value === "matrix(1, 0, 0, 1, 0, 0)"), true)
  await page.evaluate(() => document.documentElement.classList.add("dark"))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: path.join(output, "dark.png"), fullPage: true })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ result: "PASS", checks: ["desktop", "record details", "disabled actions", "type filter", "390px", "320px", "reduced motion", "dark mode", "no page errors"], screenshots: output }))
} finally {
  await browser.close()
}
