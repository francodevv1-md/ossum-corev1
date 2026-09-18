---
name: caveman
description: Use for operational summaries, subagent handoffs, task closures, and token-compressed reports that must end in Done/Changed/Files/Validations/Risks/Next. Do NOT use for ADRs, critical domain rules, or deep canonical documentation.
---

# Caveman

Use Caveman when the goal is to compress operational output WITHOUT losing execution signal.

## Use when

- Summarizing subagent output.
- Writing handoff between agents.
- Closing a task with minimal tokens.
- Converting a long operational report into a short structured status.

## Do not use when

- Writing final ADRs.
- Defining critical domain rules.
- Writing deep canonical documentation.
- Explaining architecture decisions that still need nuance.

## Required format

Every Caveman output must use exactly these sections, in this order:

- Done
- Changed
- Files
- Validations
- Risks
- Next

## Writing rules

- Prefer bullets over prose.
- Use concrete nouns, paths, commands, and outcomes.
- Remove narrative filler, greetings, and repetition.
- Keep only what a next agent or reviewer needs to continue safely.
- If something was not done, say it directly.
- If validation was not run, state `not run` and why.

## Compression guidance

- Collapse repeated findings into one bullet.
- Replace explanation with evidence where possible.
- Prefer `status + scope + evidence` over storytelling.
- Keep risk bullets actionable.

## Output template

```text
Done:
- [completed outcome]

Changed:
- [what changed]

Files:
- path/to/file — [reason]

Validations:
- [command/check] — [result]

Risks:
- [open risk]

Next:
- [next action]
```

## Good fit examples

- End-of-task closure.
- Review-ready implementation handoff.
- Runtime validation summary.
- Short worklog-to-chat compression.

## Bad fit examples

- ADR with tradeoffs.
- Canonical workflow spec.
- Business rule definition for Cirugía/Expediente.
