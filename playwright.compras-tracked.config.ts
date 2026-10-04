import { defineConfig } from "@playwright/test"
import { randomUUID } from "node:crypto"
import path from "node:path"
import stockConfig from "./playwright.compras-stock.config"

// Reuse private artifact gates and offline discovery behavior. No webServer.
const discovery = process.argv.includes("--list")
const root = path.dirname(stockConfig.outputDir!)
const run = randomUUID()
export default defineConfig({
  ...stockConfig,
  testMatch: "compras-oc-tracked-receipt.spec.ts",
  timeout: 17 * 60_000, globalTimeout: 18 * 60_000,
  outputDir: path.join(root, `compras-tracked-results-${run}`),
  reporter: discovery ? "list" : [["json", { outputFile: path.join(root, `compras-tracked-report-${run}.json`) }]],
})
