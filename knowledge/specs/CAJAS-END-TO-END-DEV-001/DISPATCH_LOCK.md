# Dispatch ownership
- Task: CAJAS-END-TO-END-DEV-001 DISPATCH/REMITO ONLY; T3 approved bounded user dispatch.
- Owner: dispatch-owner-gpt61; role Backend/domain integration; model openai/gpt-6.1-sol.
- Status: released
- Exact owned sources and fresh blobs: src/lib/services/cajas-dispatch.service.ts f06eb424d0e6662721914de5b301f428ac9bdbe3; src/lib/services/remito.service.ts 7f01f477a5e1f814876abc430e46e1e1ad80252e; src/lib/validators/remito.ts e9042aa69540985fc33150f6c276120184564cbf; src/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route.ts b9f3f22aa497fa9ade08563f29293b6013888116; src/lib/api/remitos.ts 3bb1320ed041175d1ac6b132d008808964c7276f.
- New owned files: src/__tests__/unit/cajas-dispatch-owner.test.ts; DISPATCH_LOCK.md; DISPATCH_HANDOFF.md.
- Preparation LOCK released; stable helper sources read-only. Schema released b3b0fcf8472078aed254b3ffe4423643653f8a28.
- Allowed commands: focused remito-service/remito-route/new owner Vitest only; read-only source hashes. No DB/Git mutation/deps/schema/generate/accounting/preparation/Auth/core UI edits.
- Validation: real emitirRemito/helper service chain via transaction doubles; PostgreSQL proof deferred. Output/handoff Caveman. Stop on source freshness/ownership conflict or bounded deadline.
- Release: 2026-10-01; focused tests 42/42 passed. Final source/test hashes in DISPATCH_HANDOFF.md. Preparation six hashes match released PREPARATION_HANDOFF; schema hash unchanged. No unexpected source change detected between baseline read and edit; foreign scopes remain untouched.
