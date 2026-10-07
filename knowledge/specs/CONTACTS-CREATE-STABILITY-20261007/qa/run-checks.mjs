import { spawnSync } from "node:child_process"

// Explicit console-only list: no Browser QA or opt-in database integration suites.
const files = [
  "unit/contacts-api-contract", "unit/contacts-create-route",
  "unit/contact-backend-authority-validator-adapter", "unit/contact-backend-authority-service",
  "unit/contact-adapter", "unit/contact-code", "unit/contactos-code-020",
  "unit/contactos-integration-020", "unit/contactos-store-020", "unit/useCirugiaActions-contact-payload",
  "components/ContactsBackendAuthorityUI", "components/ContactosCrud.backend",
  "components/ContactoFormDialog", "components/AuthProvider", "components/NewSurgeryDialog",
].map(file => `src/__tests__/${file}.test.${file.startsWith("components/") ? "tsx" : "ts"}`)
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", ...files], {
  stdio: "inherit", timeout: 120_000,
})
if (result.error) console.error(result.error.message)
process.exitCode = result.status ?? 1
