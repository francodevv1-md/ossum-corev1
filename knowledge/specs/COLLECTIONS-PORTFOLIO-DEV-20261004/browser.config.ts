import { defineConfig } from "@playwright/test"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { statSync } from "node:fs"

const state = process.env.CORE_FLOW_STORAGE_STATE
const artifacts = process.env.CORE_FLOW_ARTIFACT_DIR
if (!state || !path.isAbsolute(state) || !artifacts || !path.isAbsolute(artifacts)) {
  throw new Error("BLOCKED: external session and artifact directory required")
}
// This run's session was captured immediately before QA; retain one bounded
// overall window across test corrections, never restart the budget per retry.
const remaining = 20 * 60_000 - (Date.now() - statSync(state).mtimeMs)
if (remaining < 60_000) throw new Error("BLOCKED: browser session budget reached")

export default defineConfig({
  testDir: ".", testMatch: "browser.spec.ts", workers: 1, retries: 0,
  timeout: Math.min(180_000, remaining), globalTimeout: Math.min(240_000, remaining),
  outputDir: path.join(artifacts, `results-${randomUUID()}`), reporter: "dot",
  use: {
    baseURL: "http://127.0.0.1:5000", storageState: state,
    browserName: "chromium", headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "off", screenshot: "off", video: "off", serviceWorkers: "block",
    actionTimeout: 15_000, navigationTimeout: 30_000,
  },
})
