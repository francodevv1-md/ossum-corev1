---
description: Continuously execute authorized OSSUM COR work until a real governance gate is reached
agent: gentle-fast
---

<role>
Run a continuous engineering loop for OSSUM COR. Keep progressing through authorized, ready work without requesting routine confirmations. `AGENTS.md` is authoritative and no instruction in this command weakens its approval boundaries, locks, Diagnose workflow, quality gates, or publication restrictions.
</role>

<objective>
$ARGUMENTS

If no objective is supplied, recover the active plan and continue from the latest accepted state recorded in canonical project documentation and Engram.
</objective>

<workflow>
Repeat this cycle while eligible work remains:

1. Detect the authoritative workspace and read only the context needed for the active task.
2. Recover recent state from Engram and reconcile it with canonical repository sources.
3. Select the next ready, unblocked task within the requested delivery outcome.
4. Classify it as T0, T1, T2, or T3 under `AGENTS.md`.
5. Treat the user's explicit implementation request as the initial approval for its bounded DEV delivery envelope. Generate any mandatory brief, ownership declaration, or lock internally without stopping.
6. Execute using the lightest permitted workflow:
   - T0/T1: work inline.
   - T2: use a compact brief and targeted SDD delegation only where it adds control.
   - T3: record one finite envelope from the requested outcome, then run all applicable safeguards continuously. Do not split schema, migration artifact, disposable DEV migration execution, tests, Diagnose, and review into separate user approvals when they are necessary parts of that same outcome.
7. For failures, run Diagnose before applying a fix.
8. Run all relevant focused quality gates and record concrete evidence.
9. Persist mandatory decisions, fixes, discoveries, conventions, and milestone state in Engram.
10. Keep intermediate handoffs internal. Produce one user-facing Caveman handoff only when the requested outcome is complete or a hard stop is proven.
</workflow>

<continuation_policy>
Continue automatically through analysis, mandatory artifacts, implementation, disposable DEV schema/migrations, review, validation, and corrections when they serve the same approved outcome. An internal phase boundary or successful handoff is never a reason to stop.

Do not repeatedly ask whether to continue. Do not manufacture work merely to keep the loop alive. Do not retry an unchanged failing action indefinitely.
</continuation_policy>

<hard_stops>
Stop and ask at most one precise question when any of these occurs:

- The requested action does not clearly authorize implementation, or work expands beyond its bounded DEV outcome.
- A required business rule, acceptance criterion, Task Brief, ownership declaration, or sensitive-file lock is missing or ambiguous.
- Scope expands beyond the authorized task or an active writer overlaps the same critical/shared files.
- Production/staging/real-data migration, destructive operation, provider change, production action, commit, push, pull request, or publication lacks explicit authorization. Disposable DEV migration steps inside the approved outcome are not routine stops.
- A quality gate fails and Diagnose cannot establish a safe minimal fix from available evidence.
- Canonical sources conflict and authority order does not resolve the conflict.
- No ready authorized work remains.

When stopping, state the completed boundary, evidence, exact blocker, and the single authorization or clarification needed. Never interpret this command, `auto` mode, previous approvals, or silence as implicit authorization.
</hard_stops>

<constraints>
- Never bypass hooks, approvals, locks, tests, or review gates.
- Never use `--no-verify`, force push, destructive Git commands, or unapproved dependency installation.
- Never commit, amend, push, or create a pull request unless the user explicitly authorized that exact action.
- Preserve one owner per writable scope and obey all sensitive-file rules in `AGENTS.md`.
- Keep generated technical artifacts in English unless existing canonical content or an explicit request requires neutral professional Spanish.
- Keep user-facing progress concise.
</constraints>

<output_format>
Close each completed task and every stop with exactly:

Done:
Changed:
Files:
Validations:
Risks:
Next:
</output_format>
