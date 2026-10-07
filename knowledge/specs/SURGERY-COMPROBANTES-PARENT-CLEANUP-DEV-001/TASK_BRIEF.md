# SURGERY-COMPROBANTES-PARENT-CLEANUP-DEV-001
- Objective: remove Client / Base budget / Outstanding balance legacy summary cards surrounding the validated backend panel, without replacements or redesign.
- Owner / role / effective model: Sol / frontend implementation / openai/gpt-6.1-sol.
- Mode: implementation; user explicitly authorized exact parent cleanup.
- Scope / allowed files: exact files in LOCK.md; preserve all parent props (including Antigravity's existing `onAutorizar`) and existing ComprobantesAsociados integration.
- Forbidden files/actions: validated child/hook/test, other application files, APIs/states/store/types/schema/Auth/permissions/Cajas/DB/fiscalization/dependencies, servers/browser, Git mutation/commit/push/deploy.
- Allowed commands: read-only Git; exact new parent test allowlist; TypeScript without emit or incremental outputs; focused diff.
- Validation: parent test isolates child with a prop-recording stub, passes contradictory legacy values, proves no legacy cards or values render and child receives original props. Do not rerun prior 11 HTTP tests if their hashes remain unchanged.
- Coordination: MiniMax's existing QA ownership is application read-only, currently browser excluded; publish parent reservation and released snapshot here, do not touch its reports or browser context. Any observed active freeze causes stop.
- Output / handoff: Done / Changed / Files / Validations / Risks / Next, released lock and final parent hash.
