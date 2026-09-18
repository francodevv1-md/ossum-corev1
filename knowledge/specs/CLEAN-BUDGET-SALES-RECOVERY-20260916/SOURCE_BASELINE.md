# Original filesystem provenance

Read-only root `E:/OSSUM_COR_PROJECT`; HEAD `dd35d40f65e094789639f12dbb450269b939e9ad`. Pins refer to actual dirty/untracked filesystem bytes, NOT HEAD restoration. Captured before edits; no env inspection.

| Path | SHA-256 |
| --- | --- |
| src/lib/api/presupuestos.ts | 4b46d73e3fdca37be0ef4ccbd232ecce6fb0ceb271a6b0d58b1a726d2d0b0a2d |
| src/hooks/usePresupuestos.ts | d8c9925cc6d6f232e4055d74345f2faa503bd1ced71c0450d7103927c7b4f2db |
| src/app/ventas/presupuestos/page.tsx | b5168714a9ed850154a4f9b5b68fce02a210eec5230b622af2bf4c96ca36e3d0 |
| src/components/presupuestos/PresupuestoFormDialog.tsx | ad787af24c6ff8ecf24333229e3c40bfcd16cb34aed170ca527809f13213806a |
| src/components/presupuestos/PresupuestoCommercialIdentityFields.tsx | 4710f2decb7ec6bd00704273037ad0e4f7b7923858bdd70f108889008f873440 |
| src/app/api/companies/[companyId]/branches/route.ts | 0d6675c0f3a720bbcb9c4b4de3b7f8dc7f2cdae56bab5a849a77d0f93453cfcd |
| src/__tests__/unit/presupuesto-authority-sales.test.tsx | b5cb77deed2871c2f32b7ffff95354b2265c14cb781fb4727576ce97386b4467 |
| src/lib/services/branch.service.ts | a9ae647728a648386c1cc2b7f369d53f71998e773887cbde7a2b877f77bc463c |
| knowledge/specs/PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001/SPEC.md | d7cb32ada8a44e0da56fd410fc6a638ca2fc9380af93fbef027e74c8e33a765c |
| knowledge/specs/PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001/DESIGN.md | 82f4393946aaa828b22616aa1e2a934d97f4b26db03e8acd5dbfd9466a962e5e |

Source page/shared form are tracked dirty; branch service tracked unchanged; all other pinned files untracked. Adapter/hook/page/tests are recovered with scoped adaptations, not represented as byte-identical. Shared form/identity fields are reference-only. Branch GET preserves source behavior. Caller trace: target adapter used only by pending-invoice hook/tests; target shared form used by Cirugias dialog and Expediente, so must remain untouched. No existing target usePresupuestos hook.

## Closing verification
- Recomputed all ten hashes above and original HEAD: all unchanged.
- Recovered branch GET SHA equals original exactly (`0d6675...53cfcd`).
- Existing target branch service SHA is `70c4ee0d669e98b0ced3d1f42e3a81789bc4d551c6f90e5a45fe31b917c92654`; `git diff --no-index --ignore-space-at-eol` against source returns no differences. Newline bytes differ; behavior/text identical. Service NOT modified.
- Destination pre-existing changes retained. Compared closing status against preflight: only assigned Sales production files, three new tests and this new docs directory added to baseline. Shared legacy form/hook, store, base types, Cirugias and Expediente show no diff.
