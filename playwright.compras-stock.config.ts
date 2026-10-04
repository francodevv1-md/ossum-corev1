import { defineConfig } from "@playwright/test"
import { randomUUID } from "node:crypto"
import path from "node:path"
import { lstatSync, realpathSync, existsSync } from "node:fs"

const discovery = process.argv.includes("--list")
let root = "C:/Users/franc/AppData/Local/Temp/opencode"
if (!discovery) {
  process.env.DEBUG = ""; process.env.PWDEBUG = "0"
  try {
    const directory = process.env.CORE_FLOW_ARTIFACT_DIR || ""
    if (!path.isAbsolute(directory) || !lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) throw new Error()
    root = realpathSync(directory)
    for (let ancestor = root; ; ancestor = path.dirname(ancestor)) {
      if (existsSync(path.join(ancestor, ".git"))) throw new Error()
      if (path.dirname(ancestor) === ancestor) break
    }
  } catch { throw new Error("BLOCKED: external private artifacts required") }
}
const run = randomUUID()
export default defineConfig({
  testDir: "./e2e", testMatch: "compras-oc-stock-receipt.spec.ts",
  fullyParallel: false, forbidOnly: true, workers: 1, retries: 0,
  timeout: 9 * 60_000, globalTimeout: 10 * 60_000, expect: { timeout: 10_000 },
  outputDir: path.join(root, `compras-stock-results-${run}`),
  reporter: discovery ? "list" : [["json", { outputFile: path.join(root, `compras-stock-report-${run}.json`) }]],
  use: { browserName: "chromium", headless: true, actionTimeout: 15_000, navigationTimeout: 30_000,
    serviceWorkers: "block", trace: "off", screenshot: "off", video: "off" },
  // No webServer: an independently reviewed existing DEV server is mandatory.
})
