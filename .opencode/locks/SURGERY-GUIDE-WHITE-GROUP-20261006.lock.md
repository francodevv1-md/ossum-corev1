# Bounded task brief and ownership — white guide group

- task: SURGERY-GUIDE-WHITE-GROUP-20261006
- agent role / model: parent Frontend/UI owner / GPT-6.1 Sol (`openai/gpt-6.1-sol`)
- mode / status: implementation / released
- approval: Franco requested grouping the guide's Sin fecha explanation with Sin autorizar; presentation only.
- objective: one white guide entry, `Sin autorizar / Sin fecha`; preserve all stored states, transitions, colors and selectors.
- owned files: `src/components/cirugias/view-customization/ColorReferenceDialog.tsx`; `src/__tests__/components/SurgeryPalette.test.tsx`; this lock.
- preflight: previous palette writer/reviewer completed and palette recovery lock released; existing modified guide belongs to the approved recovery and must be preserved.
- allowed commands: targeted read/patch, read-only Git checks, explicit offline palette tests.
- forbidden: other source/config edits, backend/DB/schema/state/permission changes, dependencies, build/runtime restart, commit/push/deploy.
- validation: rendered guide has one combined white entry and no separate Sin fecha entry; existing palette/date/authorization rendering checks remain green.
- handoff: Done/Changed/Files/Validations/Risks/Next; close this lock with validation evidence.
- stop: overlapping writer, business-state change required, unrelated failure or scope expansion.

## Handoff
- Done: guide combines the two white explanations into one entry.
- Changed: label `Sin autorizar / Sin fecha`, shared explanation and focused rendered-guide assertions only.
- Files: guide, existing palette regression test and this combined task brief/lock/handoff.
- Validations: four-file offline replay 51/51 PASS; scoped `git diff --check` PASS. Existing stored-state list and date-aware palette checks retained.
- Risks: full live guide inspection awaits the owner's application rebuild; no runtime restart performed.
- Next: view the combined guide entry after rebuild. No commit/push/deploy.
