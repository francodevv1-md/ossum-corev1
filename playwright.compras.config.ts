import { defineConfig } from "@playwright/test"
import { randomUUID } from "node:crypto"
import path from "node:path"
import { lstatSync, realpathSync, existsSync } from "node:fs"

const discovery = process.argv.includes("--list")
let baseURL: string | undefined
let root = "C:/Users/franc/AppData/Local/Temp/opencode"
// Full approval/session/fixture gates run in the saved spec before browser launch.
// Config stays synchronous and avoids Playwright transforming existing .mjs.
if (!discovery) {
  process.env.DEBUG = ""; process.env.PWDEBUG = "0"
  try {
    const url = new URL(process.env.CORE_FLOW_BASE_URL || "")
    if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || url.port !== "5000" || url.username || url.password || url.pathname !== "/" || url.search || url.hash
      || process.env.CORE_FLOW_COMPANY_ID !== "codevdistricorr1000000000") throw new Error()
    baseURL = url.origin
    const directory = process.env.CORE_FLOW_ARTIFACT_DIR || ""
    if (!path.isAbsolute(directory) || !lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) throw new Error()
    root = realpathSync(directory)
    for (let ancestor = root; ; ancestor = path.dirname(ancestor)) {
      if (existsSync(path.join(ancestor, ".git"))) throw new Error()
      if (path.dirname(ancestor) === ancestor) break
    }
  } catch { throw new Error("BLOCKED: exact loopback DEV5000 company and external artifacts required") }
}
const run = randomUUID()

export default defineConfig({
  testDir: "./e2e",
  testMatch: "compras-oc-receipt.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  retries: 0,
  timeout: 7 * 60_000,
  globalTimeout: 8 * 60_000,
  expect: { timeout: 10_000 },
  outputDir: path.join(root, `compras-results-${run}`),
  reporter: discovery ? "list" : [["json", { outputFile: path.join(root, `compras-report-${run}.json`) }]],
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    serviceWorkers: "block",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  // Existing server only: never start/build the application.
})
