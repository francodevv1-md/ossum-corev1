import { defineConfig } from "@playwright/test"
import { lstatSync, realpathSync, existsSync } from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

// Discovery intentionally needs no environment, session, server or browser.
const discovery = process.argv.includes("--list")
let baseURL: string | undefined
let outputDir = "C:/Users/franc/AppData/Local/Temp/opencode/intake-discovery"
if (!discovery) {
  process.env.DEBUG = ""
  process.env.PWDEBUG = "0"
  try {
    const url = new URL(process.env.CORE_FLOW_BASE_URL || "")
    if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error()
    baseURL = url.origin
    const directory = process.env.CORE_FLOW_ARTIFACT_DIR || ""
    if (!path.isAbsolute(directory) || !lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) throw new Error()
    outputDir = realpathSync(directory)
    for (let ancestor = outputDir; ; ancestor = path.dirname(ancestor)) {
      if (existsSync(path.join(ancestor, ".git"))) throw new Error()
      if (path.dirname(ancestor) === ancestor) break
    }
  } catch {
    throw new Error("BLOCKED: explicit loopback origin and existing external temporary artifact directory required")
  }
}
const runId = discovery ? "discovery" : randomUUID()

export default defineConfig({
  testDir: "./e2e",
  testMatch: "surgery-intake-approval.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  retries: 0,
  timeout: 4 * 60_000,
  globalTimeout: 6 * 60_000,
  expect: { timeout: 10_000 },
  // Unique paths avoid Playwright clearing a previous run's output directory.
  outputDir: path.join(outputDir, `intake-results-${runId}`),
  reporter: discovery ? "list" : [["json", { outputFile: path.join(outputDir, `intake-report-${runId}.json`) }]],
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    serviceWorkers: "block",
    // Authenticated traffic can contain secrets and unrelated identities.
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  // Deliberately no webServer: only the explicitly preexisting server is used.
})
