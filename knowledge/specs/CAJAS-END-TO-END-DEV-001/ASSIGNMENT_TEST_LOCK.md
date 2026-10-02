# Assignment QA ownership

- Task: CAJAS-END-TO-END-DEV-001 / bounded assignment-test QA.
- Agent role: QA / Testing; model: openai/gpt-6.1-sol; mode: QA / testing / docs.
- Owner: assignment-test-qa-gpt61-20261001T173208.
- Status: released.
- Sole writable source: src/__tests__/unit/cajas-slice3-assignment.test.ts.
- Fresh baseline SHA256: BD80B2A0FECA11A54310FAB2AB7A81CE5C1B7DACAD9E8C94C4AB891EC2FBCE44.
- Own artifacts: this lock and assignment-qa/HANDOFF.md in this package. Existing root HANDOFF.md belongs to the integration owner and is preserved.
- Scope: reproduce original assertions; only repair incomplete fixtures if a current failure proves it necessary. Preserve every test and assertion; real services remain real.
- Commands: four explicitly named unit suites and read-only source/hash inspection only.
- Forbidden: all other source/test writes, DB, unfiltered tests, typecheck/build/schema/Git/Auth/security/secrets/dependencies.
- Validation: assignment first, then formula/assignment/physical-unit/preparation-recovery suites.
- Stop: ownership overlap, non-reproducible failures, actual domain bug, scope expansion, or five-minute budget.
- Expected handoff: Done / Changed / Files / Validations / Risks / Next, before/after counts and precise remaining source bugs.
- Release: 2026-10-01, bounded QA stopped on observed concurrent test-file modification. No source edits made by this owner.
- Observed later SHA256: F415C91867C7E783C224B2AAA081B8F553942CEEFA8F130898E9553B46E5C2D2. External addition observed in double-active-assignment fixture: $queryRaw mock. Preserve this external work; coordinate ownership before further edits.
