import assert from "node:assert/strict"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { mkdir, writeFile } from "node:fs/promises"
import { createServer, build } from "vite"
import { chromium } from "@playwright/test"

const root = path.dirname(fileURLToPath(import.meta.url))
const configFile = path.join(root, "vite.config.mjs")
const output = path.join(process.env.LOCALAPPDATA, "Temp/opencode/authorized-color-qa")
await mkdir(output, { recursive: true })
await build({ configFile })
const server = await createServer({ configFile })
await server.listen()
let browser
const results = []
try {
  browser = await chromium.launch({ headless: true })
  for (const [width, height] of [[1366, 768], [1920, 1080], [390, 844]]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height } })
      const errors = []
      page.on("pageerror", error => errors.push(error.message))
      await page.addInitScript(value => document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.classList.toggle("dark", value)
      }), dark)
      await page.goto("http://127.0.0.1:5197", { waitUntil: "networkidle", timeout: 30000 })
      const authorized = page.locator('[data-case="palette-2"]').filter({ visible: true })
      const pending = page.locator('[data-case="palette-1"]').filter({ visible: true })
      await authorized.waitFor()
      assert.equal(await authorized.locator(".bg-emerald-500").count(), width < 640 ? 1 : 6)
      assert.equal(await pending.locator(".bg-yellow-400").count(), width < 640 ? 1 : 6)
      const authorizedColor = await authorized.locator(".bg-emerald-500").first().evaluate(el => getComputedStyle(el).backgroundColor)
      const pendingColor = await pending.locator(".bg-yellow-400").first().evaluate(el => getComputedStyle(el).backgroundColor)
      assert.notEqual(authorizedColor, pendingColor)
      const contrast = await authorized.locator(".bg-emerald-500").first().evaluate(el => {
        const canvas = document.createElement("canvas")
        canvas.width = canvas.height = 1
        const ctx = canvas.getContext("2d")
        const luminance = color => {
          ctx.fillStyle = color
          ctx.fillRect(0, 0, 1, 1)
          const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
            const channel = value / 255
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
          })
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
        }
        const style = getComputedStyle(el)
        const a = luminance(style.backgroundColor), b = luminance(style.color)
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      })
      assert.ok(contrast >= 4.5, `Authorized label contrast: ${contrast}`)
      assert.equal(await page.locator('[data-case="palette-2-undated"]').filter({ visible: true })
        .locator(width < 640 ? "span.bg-white" : ".bg-white").count(), width < 640 ? 1 : 6)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      assert.deepEqual(errors, [])
      const screenshot = `${width}-${height}-${dark ? "dark" : "light"}.png`
      await page.screenshot({ path: path.join(output, screenshot), fullPage: true })
      results.push({ width, height, dark, authorizedColor, pendingColor, contrast, screenshot, errors })
      await page.close()
    }
  }
  await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2))
  console.log(`PASS: ${results.length} synthetic browser cases. Evidence: ${output}`)
} finally {
  await browser?.close()
  await server.close()
}
