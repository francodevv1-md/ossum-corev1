---
name: diagnose
description: Use for debugging failed tests, broken builds, TypeScript errors, Prisma errors, UI loops, and storage.setItem is not a function. Follow Reproduce/Scope/Evidence/Hypothesis/Minimal Fix/Validate/Regression Check/Handoff. Do NOT apply blind fixes or change architecture without evidence.
---

# Diagnose

Use Diagnose for disciplined debugging. The goal is to prove the problem, constrain it, fix the smallest real cause, and verify no adjacent breakage was introduced.

## Mandatory cycle

Every Diagnose run must follow this exact sequence:

1. Reproduce
2. Scope
3. Evidence
4. Hypothesis
5. Minimal Fix
6. Validate
7. Regression Check
8. Handoff

Do not skip steps. Do not jump to a fix from intuition alone.

## Use when

- Tests are failing.
- The build is broken.
- `storage.setItem is not a function` appears.
- Prisma errors appear.
- TypeScript errors appear.
- UI loops or render loops appear.

## Do not use when

- The task is feature delivery without an active defect.
- There is no reproduction yet.
- The requested change is architectural and not evidence-driven.

## Step rules

### 1. Reproduce

- Capture the exact command, route, interaction, or condition.
- Record the real error text.
- If not reproducible, stop and say so.

### 2. Scope

- Identify affected layer: test, UI, state, TypeScript, Prisma, API, config.
- Bound the impact: one file, one module, one workflow, or systemic.

### 3. Evidence

- Gather stack traces, failing assertions, file references, config evidence, and recent diffs.
- Prefer direct logs and file paths over guesses.

### 4. Hypothesis

- State the most likely root cause.
- Mention why competing explanations are weaker.

### 5. Minimal Fix

- Change the smallest thing that resolves the proven cause.
- Do not refactor architecture unless evidence requires it.
- Do not stack speculative fixes.

### 6. Validate

- Re-run the narrowest relevant validation first.
- Then run the broader relevant validation if needed.

### 7. Regression Check

- Check adjacent flows touched by the fix.
- Confirm the fix did not only move the failure.

### 8. Handoff

- Summarize cause, fix, validations, remaining risk, and next step.
- Use Caveman format if the audience needs a compressed operational handoff.

## Required output template

```text
Reproduce:
- [exact command/flow]

Scope:
- [affected area and boundary]

Evidence:
- [logs, files, traces]

Hypothesis:
- [root cause]

Minimal Fix:
- [smallest justified change]

Validate:
- [targeted validation + result]

Regression Check:
- [adjacent checks + result]

Handoff:
- [what the next agent/user must know]
```

## Non-negotiable rules

- No blind fixes.
- No architecture changes without evidence.
- No claiming root cause without reproduction or trace support.
- No broad cleanup hidden inside a bugfix.
