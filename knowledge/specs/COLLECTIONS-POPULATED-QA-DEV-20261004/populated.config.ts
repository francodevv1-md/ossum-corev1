import { defineConfig } from "@playwright/test"
import { randomUUID } from "node:crypto"
import path from "node:path"
import { pathToFileURL } from "node:url"

export const task = "COLLECTIONS-POPULATED-QA-DEV-20261004"
export const company = "codevdistricorr1000000000"
export const base = "http://127.0.0.1:5000"
export const discovery = process.argv.includes("--list")
export function gate(value: unknown): asserts value {
  if (!value) throw new Error("BLOCKED: collections QA prerequisites or invariant")
}

// Exact attestations are supplied by the coordinator AFTER independent review.
// No .env loading; --list needs neither attestations nor a session.
if (!discovery) {
  gate(process.env.COLLECTIONS_QA_APPROVAL === `${task}:${company}:four-synthetic-nonfiscal-cases`)
  gate(process.env.COLLECTIONS_QA_DEV_TARGET === `${company}:disposable-dev:${base}`)
  gate(process.env.COLLECTIONS_QA_SOURCE_REVIEW === `${task}:invoice-create-emit:payment-create:internal-notifications:no-business-outbound`)
  gate(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(process.env.COLLECTIONS_QA_RUN_ID || ""))
  gate(process.env.CORE_FLOW_COMPANY_ID === company && process.env.CORE_FLOW_BASE_URL === base)
  gate(process.env.CORE_FLOW_ARTIFACT_DIR && path.isAbsolute(process.env.CORE_FLOW_ARTIFACT_DIR))
  gate(!process.env.DEBUG && (!process.env.PWDEBUG || process.env.PWDEBUG === "0"))
}
const outputDir = discovery ? undefined : path.join(process.env.CORE_FLOW_ARTIFACT_DIR!, `collections-results-${randomUUID()}`)

export async function runtimePaths(beforeOutput = false) {
  gate(!discovery)
  const importJS = new Function("url", "return import(url)") as (url: string) => Promise<{
    registeredRoots: (directory: string) => string[]
    validateStatePath: (value: string | undefined, mode: string, roots: string[]) => string
  }>
  const helper = await importJS(pathToFileURL(path.resolve(__dirname, "../../../scripts/qa/dev-session.mjs")).href)
  const roots = helper.registeredRoots(path.resolve(__dirname, "../../.."))
  const validate = (value: string | undefined, mode: string) => helper.validateStatePath(value, mode, roots)
  const state = validate(process.env.CORE_FLOW_STORAGE_STATE, "preflight")
  const artifacts = process.env.CORE_FLOW_ARTIFACT_DIR!
  validate(path.join(artifacts, `.collections-path-${randomUUID()}`), "capture")
  const run = process.env.COLLECTIONS_QA_RUN_ID!
  const checkpoint = path.join(artifacts, `QA-CARTERA-${run}-checkpoint.json`)
  if (beforeOutput) validate(outputDir, "capture")
  return { state, run, checkpoint, validate }
}

const config = defineConfig({
  testDir: ".", testMatch: "populated.spec.ts", workers: 1, retries: 0,
  timeout: 600_000, globalTimeout: 600_000, reporter: "dot", outputDir,
  preserveOutput: "never",
  use: { baseURL: base, trace: "off", screenshot: "off", video: "off",
    serviceWorkers: "block", actionTimeout: 15_000, navigationTimeout: 60_000 },
})

// The installed loader awaits a promised default config. Validate canonical
// external paths BEFORE Playwright creates or clears any output directory.
export default (async () => {
  if (!discovery) {
    process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1"
    try { await runtimePaths(true) } catch { throw new Error("BLOCKED: external QA paths") }
  }
  return config
})()
