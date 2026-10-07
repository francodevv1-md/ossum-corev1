# Surgery palette recovery — bounded DEV brief

## Task / approval / owner

- Task: SURGERY-PALETTE-RECOVERY-20261006, risk T3 (sensitive surgery presentation files).
- Approval: parent conveys Franco's explicit implementation and secondary-agent authorization; AGENTS section 8.2 covers this finite DEV restoration, not expanded functionality.
- Role: directed Frontend/UI implementation owner, sole source writer.
- Actual model: GPT-6.1 Sol (`openai/gpt-6.1-sol`), mode implementation/offline testing.
- Ownership: exact source/artifact allowlist in `.opencode/locks/SURGERY-PALETTE-RECOVERY-20261006.lock.md`; parent owns final HANDOFF.md/review/browser.

## Scope / exclusions

Restore the previously reviewed eight-color surgery palette, existing order, readable solid labels, date-aware presentation helpers, date-context wiring in allowed callers, and honest Spanish guide copy. Labels, stored states, state transitions, permissions, authorization/evidence checks and rescheduling/search remain unchanged. White surfaces have visible borders and matching subtle row tints preserve the existing design. Explicit null/empty/whitespace dates make Pendiente/Autorizada white; undefined date retains selector/static colors. Unknown states retain the existing fallback.

Exclude all other source/config/docs/tests, satellite Calendario/Coordinadores changes, schema/store/types/hooks/API/services/security, DB/Prisma/dependencies, real mail/data/provider calls, build/server/restart/.next takeover, staging/commit/push/deploy, broad historical snapshots, canonical docs and foreign work.

## Diagnose evidence / hypothesis

- Reproduce: `node node_modules/vitest/vitest.mjs run src/__tests__/components/SurgeryPalette.test.tsx` before edits: exit 1, 6 failures / 1 pass.
- Evidence: old `bg-slate-500 text-white` instead of white; `getCxStateColorKey is not a function`; hardcoded white solid labels; missing guide caveat; non-date-aware dialog/header palettes.
- Scope: presentation constants and their exact allowed render callers only. Full callers traced; static outside-scope consumers inherit shared palette, no satellite rewiring.
- Root cause: current source lacks reviewed maps/helpers/presentation wiring, while the retained Oct 5 foreign regression test still encodes the corrected contract. Actor/operation causing disappearance is unknown; no attribution claimed.
- Baseline five-file offline run: 54 tests, 46 pass / 8 fail, including 2 pre-existing unrelated ChangeStateDialogEvidence failures (persisted-evidence behavior and old exception label). Do not repair or weaken those.
- Minimal fix: restore shared palette and small presentation-only helpers; connect date props where already available; update only superseded palette assertions in existing separation test. Retained foreign SurgeryPalette test remains byte-identical.

## Commands / checks / stop conditions

Allowed: read/glob/grep, focused patch, read-only Git status/diff/hash, `git diff --check`, installed `node node_modules/vitest/vitest.mjs run` with explicit files only. Inspected Vitest config/setup and test imports: jsdom, in-memory local storage/mock fixtures, pure validators/model/business predicates; no DB/external operations in these checks.

First rerun narrow SurgeryPalette test, then exact regression allowlist:

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/components/SurgeryPalette.test.tsx src/__tests__/unit/cirugias-estado-prep-separation.test.ts src/__tests__/components/ChangeStateDialogEvidence.test.tsx src/__tests__/components/ChangeStateDialog.test.tsx src/__tests__/components/ExpedienteHeader.test.tsx
```

Parent decides bounded TypeScript/browser checks; no full build here. Stop/report on active overlapping writer, excluded changes needed, scope expansion, foreign-hash drift, or unauthorized external action. Handoff: Done/Changed/Files/Validations/Risks/Next; finish lock in review with frozen source.

## Preservation baseline

- HEAD: `3db3c6ee2967e33f5ad84b36014ed5bfd766eef8`.
- Foreign tracked `AGENTS.md` SHA256: `B59110B1BC179405AC27F9CD47A904A1E8B9842AF823BE8E8911D9F99A5C6A3D`.
- Foreign tracked `next-env.d.ts` SHA256: `1B59D4C6B83807DB275D43F3CF2CC8E9323F465FAB764EEA091CC5BECD5BAD37`.
- Retained foreign untracked SurgeryPalette test SHA256: `257A35D58E0C7BA35EDF1325F42C027663C42753BF149A17E4FAA6601BBFBDBE`, matches historical reviewed test hash.
- Extensive unrelated untracked work is read-only and preserved. Local installed Next CSS guide read; no framework API/config change.

## Validation / regression result

- Narrow retained `SurgeryPalette.test.tsx`: PASS 7/7, exit 0, 1.72 s (2026-10-06 21:31 local).
- Exact five-file command above: 52/54 pass, 2 fail, exit 1, 2.14 s. SurgeryPalette 7/7, separation 37/37, ChangeStateDialog 4/4, ExpedienteHeader 3/3, ChangeStateDialogEvidence 1/3. The two failures were present before edits: explicit persisted-evidence flag does not enable confirm; old `No posee autorizado` label is absent. Authorization code and foreign test unchanged; no unrelated fix attempted.
- Baseline/final logs: `C:/Users/franc/AppData/Local/Temp/opencode/palette-recovery-baseline.log`, `C:/Users/franc/AppData/Local/Temp/opencode/palette-recovery-final.log` (offline synthetic diagnostics only).
- `git diff --check`: PASS. Owned tracked diff: 11 source/test files, presentation-only; foreign AGENTS/next-env/test hashes retained. Parent independently verifies final hashes/diff before releasing review lock.
- Source frozen under review lock; TypeScript/browser/independent review remain parent-owned. Build, runtime restart, DB/Prisma, real send, staging/commit/push/deploy: NOT RUN.
