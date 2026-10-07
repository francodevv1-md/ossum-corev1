import { spawnSync } from "node:child_process"

// Own follow-up scope + the prior approved CUIT lookup package
// (CONTACTS-CUIT-LOOKUP-DEV-20261007) + the approved contact packages it
// preserved (CONTACTS-CORRELATIVE-DEV-20261007, CONTACTS-CREATE-STABILITY-
// 20261007, CONTACTS-FRAGILITY-FIXES-20261007).
// Foreign surgery/coordination tests are intentionally excluded (same
// reason as in the prior run-checks: pre-existing isolation failure on
// useCirugiaActions-change-date).
const files = [
  "unit/cuit-lookup.service",
  "unit/cuit-lookup-validator",
  "unit/cuit-lookup-route",
  "components/ContactoFormDialog-cuit-lookup",
  "unit/contact-coordinator-legacy",
  "unit/contact-update-audit-in-tx",
  "unit/useCirugiaActions-institution-helper",
  "components/ContactLookupField-stale-search",
  "components/ContactosCorrelativeBadge",
  "unit/contacts-create-route",
  "unit/contact-correlative",
  "unit/contacts-api-contract",
  "unit/contact-backend-authority-validator-adapter",
  "unit/contact-backend-authority-service",
  "unit/contact-adapter",
  "unit/contactos-code-020",
  "unit/contactos-integration-020",
  "unit/contactos-store-020",
  "unit/useCirugiaActions-create-backend-only",
  "unit/useCirugiaActions-contact-payload",
  "components/ContactsBackendAuthorityUI",
  "components/ContactosCrud.backend",
  "components/ContactoFormDialog",
].map(file => `src/__tests__/${file}.test.${file.startsWith("components/") ? "tsx" : "ts"}`)

const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", ...files], {
  stdio: "inherit",
  timeout: 180_000,
})
if (result.error) console.error(result.error.message)
process.exitCode = result.status ?? 1
