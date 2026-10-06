import { defineConfig } from "@playwright/test"
import { randomUUID } from "node:crypto"
import path from "node:path"

// Synthetic HTML only: no app server, session, database or provider traffic.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "authorization-email-template.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  globalTimeout: 120_000,
  reporter: "list",
  outputDir: path.join("C:/Users/franc/AppData/Local/Temp/opencode", `mail-template-${randomUUID()}`),
  use: {
    browserName: "chromium",
    headless: true,
    serviceWorkers: "block",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
})
