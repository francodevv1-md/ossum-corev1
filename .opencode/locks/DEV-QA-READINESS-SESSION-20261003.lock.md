# DEV-QA-READINESS-SESSION-20261003

- task: DEV-QA-READINESS-SESSION-20261003
- agent role: Orchestrator + delegated QA tooling owner
- selected model: openai/gpt-6.1-sol; delegated host-selected model
- status: reserved
- owned files: scripts/qa/dev-readiness.mjs, scripts/qa/dev-session.mjs, scripts/qa/dev-readiness.test.mjs; knowledge/specs/DEV-QA-READINESS-SESSION-20261003/*; this lock
- excluded: existing scripts/qa files, package/config files, app/source/Auth/schema/Compras, actual env/session contents in output, database mutations, deployment, Git writes
- approval: Franco said “dale continua” after checkpoint explicitly identified redacted local environment handling and DEV session preparation as next step.
- validation: seven synthetic node tests and syntax checks PASS; independent bounded review cool-beige-dingo PASS. Real required env presence/format PASS, Chromium provisioning/local-HTML smoke PASS. File-symlink assertion NOT RUN (Windows privilege).
- runtime resources: localhost:5000, shared .next for local Next DEV, Next-generated next-env.d.ts only (no hand edits), uniquely named temporary server/session artifacts outside Git. No build/typegen concurrently.
- runtime approval: Franco explicitly answered “si confirmo toma esa reserva” on 2026-10-03 to takeover of Cloudflare's .next/DEV5000 reservation. Cloudflare's source/config ownership remains unchanged. Existing next-env.d.ts hash before startup: a419cbe4e3a5e8d4b481b851dbf4ac767de069e6.
- runtime limits: launch local app, manual DEV login capture, exact configured-company read-only membership preflight; no business mutations, arbitrary navigation, automated credentials or Auth changes. Browser closes at 20-minute cap.
- runtime evidence: local login HTTP200; server launcher12552/listener21948 on127.0.0.1:5000; headed capture20184 completed, saved state outside Git and closed its browser; subsequent preflight PASS authenticated/200 JSON exact-company membership with the same state and no overwrite. next-env.d.ts hash unchanged. File edits finished; DEV5000/.next reservation remains while server runs. No concurrent build/typegen.

## Runtime transfer — 2026-10-06

Franco explicitly answered “Autorizo” to transferring DEV5000 runtime ownership to complete the controlled authorization-email test. A read-only preflight found no current listener on port 5000; no foreign process was stopped.

- Current runtime owner: `MAIL-AUTHORIZATION-LIVE-20261006`, GPT-6.1 Sol (`openrouter/openai/gpt-6.1-sol`). DEV5000 / shared `.next` ownership is transferred, not concurrently reserved by this readiness task.
- The script/source ownership and historical evidence above are unchanged; this is not permission to edit Auth or readiness scripts.
- No build/typegen or unrelated server restart may overlap the new runtime owner. The current live-test lock records scope and release/retention of the server resource.
