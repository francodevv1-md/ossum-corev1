# FORECAST-COMPAT-001 ownership

- Task: minimal generalized reservation purchasing read-projection compatibility fix; user-approved scope.
- Agent role / owner: Backend compatibility / forecast-compat-gpt61 (sole writer).
- Selected model: openai/gpt-6.1-sol.
- Mode: implementation / testing / docs; status: released.
- Owned files: src/lib/services/compras-forecast.service.ts; src/__tests__/unit/compras-reposicion.test.ts; knowledge/specs/CAJAS-END-TO-END-DEV-001/FORECAST_COMPAT_LOCK.md; knowledge/specs/CAJAS-END-TO-END-DEV-001/FORECAST_COMPAT_HANDOFF.md.
- Baseline blobs: service 7ddad4968bcbf4450c1fda0e078283e8c282f607; test 53d71af81bbeecc3086ca1690b03ffda6cb65740.
- Ownership evidence: preparation central lock excludes forecast; schema lock released; foreign Compras lock covers schema/OrdenCompra/FacturaCompra. Prior completed minStock handoff supplied by user, implementation confirmed on disk and Engram #8052. Preserve all existing edits.
- Allowed commands: read-only inspection and filtered Vitest runs of compras-reposicion/article-company-commercial-profile.
- Forbidden: all other writes, central LOCK edits, schema, preparation, validators, UI, remito/accounting, DB writes, Git mutations, Auth/security/secrets/dependencies.
- Validation: reproduce focused quantity/no-double-count failure, then both requested suites; Caveman handoff.
- Stop: evidence of another forecast writer, scope expansion, or five-minute budget exceeded.
- Release evidence: focused regression reproduced reservedStock 2 instead of 3.5; both requested suites passed 23/23 after minimal fix. No ownership overlap observed; service baseline rechecked immediately before edit.
