# Two user-confirmed institution markers — DEV

- Task: DISTRICORR-TWO-INSTITUTION-MAP-DEV-001; model openai/gpt-6.1-sol; role orchestrator/backend integration; riskT3 for existing schema alignment if required.
- Approval: Franco asked to load prior institutional geography with imported cases and supplied exactly two hospital/case links. Use existing confirmed disposable Districorr DEV target only.
- Domain scope: link only supplied source cases7715/7713 to their user-named hospitals. Other eight cases remain institution-null. Preserve source data/staff roles/Admin DEV; no Cajas or ledger effects.
- Public research scope: institution names/cities only. Never send patient/case identifiers, source authorization references or private record bodies to external services.
- Geography: reuse existing ContactAddress geography/provenance and eligibility contracts from main worktree. Preserve uncertainty/reference-point vs entrance semantics; no city-centroid/name-only substitute or invented coordinates.
- Read-only metadata preflight: inspect only ContactAddress column/enum/index metadata to distinguish missing client schema from unapplied DB geography. Verify existing approved company/Auth/Admin linkage.
- Candidate source ownership: exact prisma/schema.prisma geography declarations only if existing DB alignment or additive geography fields required; new scoped institution bootstrap script/test; this task directory. No existing login/logo/Auth/permissions/store/surgery flow/other-owner documents or shared server/output takeover.
- Schema rules: no blind full-worktree schema copy, provider change, destructive operation, enum removal, new tenancy/permission/RLS policy or unrelated migration. Declare exact diff/artifact after metadata; only additive geography needed for this result on confirmed DEV may execute. Escalate actual security/ownership conflict.
- Data rules: create scoped institution Contacts/links/main addresses with verified public provenance; update two exact existing surgery institution foreign keys; audit real actor Admin DEV. Never overwrite unrelated validated geography or create Remito/stock/GPS data.
- Validation: focused pure mapping tests; Prisma format/generate if schema touched; actual seeded readback/map projection; browser max20minutes if UI acceptance performed. Reuse valid previous QA, no Cajas or broad tests/build.
- Handoff: Done / Changed / Files / Validations / Risks / Next; no patient values, credentials or arbitrary database output.
