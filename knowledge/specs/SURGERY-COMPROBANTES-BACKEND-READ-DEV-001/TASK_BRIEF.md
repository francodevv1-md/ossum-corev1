# SURGERY-COMPROBANTES-BACKEND-READ-DEV-001

- Objective: read existing surgery-linked budgets and operational invoices from existing backend clients in Ficha CX Comprobantes. No mutations.
- Owner: Sol, frontend implementation; effective model `openai/gpt-6.1-sol`.
- Mode: implementation. User request authorizes this bounded DEV panel replacement; parent prop contract retained.
- Why panel edit: existing panel treats legacy budgets as debt and offers nonfunctional actions. Replace authority only in the requested panel, not intake or core surgery flow.
- Allowed writes: exact files in LOCK.md; task artifacts in this directory.
- Forbidden writes: all other files, especially parents/shared components, API clients/routes/services, intake forms/hooks/states/notifications, schema/Auth/permissions/secrets.
- Allowed commands: read-only Git, exact-path HTTP-mocked Vitest allowlist, TypeScript without emit/incremental output, focused static review.
- Forbidden commands: global/integration tests, DB commands/scripts, build in shared output without exclusive window, dependency installs, commit/push/deploy. DB_TESTS_BLOCKED remains intact.
- Validation: mocked fetch with real clients; linkage/filter/pagination, errors with no fallback, scope races, distinct states. TypeScript and independent read-only review.
- Browser: only existing authorized context; otherwise explicitly deferred without real-persistence claims.
- Handoff: Done / Changed / Files / Validations / Risks / Next, including how to open the delivered panel.
- Stop: ownership overlap, excluded prerequisite, unclear business rule, or same blocker after two minimal Diagnose cycles.
