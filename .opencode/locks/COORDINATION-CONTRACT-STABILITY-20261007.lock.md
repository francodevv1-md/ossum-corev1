# Coordination contract stabilization

- task: COORDINATION-CONTRACT-STABILITY-20261007
- role: orchestrator / sequential directed implementer
- selected model: openai/gpt-6-astra; implementation child host-selected
- status: reserved
- approval: user requested implementation and confirmed previous shared ownership released with `Liberado Continua`; prior lock records checkpoint 3A released and current 3B restricted to budgets.
- owner: directed coordination implementer (one writer for the complete UI/API/service chain); parent owns task documentation and validation harness only.
- owned scope: src/components/coordinadores/**; src/hooks/useCoordinationView.ts; src/hooks/useCoordinatorActions.tsx; src/hooks/useCoordinadoresFilters.ts; src/lib/api/backend-surgeries.ts; src/lib/api/coordination-view.ts; src/lib/api/surgery-adapter.ts (coordination contract only); src/lib/services/coordination-view.service.ts; src/lib/services/personal-coordinator-resolver.service.ts; src/lib/services/surgery-coordinator-read-model.ts; src/lib/services/surgery.service.ts and src/lib/validators/surgery.validator.ts (coordination only, preserve intake changes); src/app/api/companies/[companyId]/coordination/** and surgeries/[surgeryId]/** (coordination only); src/lib/permissions/coordination.ts (reuse existing policy, no role expansion); src/types/coordinadores.types.ts; focused coordination regression tests.
- exclusions: budgets, remitos business logic, auth, schema/migrations, store/base types unless separately reserved with evidence, dependencies, live DB writes until current disposable target confirmed, browser, external notifications/email, Git mutations, deploy.
- commands: read/search/diff; focused offline Vitest; parent TypeScript and isolated build.
- validation: reproduce defect before fix; focused regression and paired-view readback at each checkpoint; independent review; global TypeScript/build separately reported.
- stop: new ownership collision, ambiguous business rule, unconfirmed database target.
