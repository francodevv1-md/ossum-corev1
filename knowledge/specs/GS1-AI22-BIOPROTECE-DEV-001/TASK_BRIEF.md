# Task Brief — GS1 AI (22) BIOPROTECE DEV

## Objective
Persist GS1 AI (22) as its own article identifier, retain the captured payload as evidence, and permit matching only for the approved BIOPROTECE manufacturer profile.

## Scope
- Add `GS1_AI_22` and nullable `sourcePayload` to ArticleIdentifier.
- Add a migration artifact only; do not apply it to a database.
- Require a BIOPROTECE manufacturer context when storing AI (22).
- Match AI (22) using its dedicated identifier type; AI (10), AI (21), and AI (17) remain traceability data.

## Exclusions
- No database migration application, production/staging, Auth, roles, or changes to Cirugías.

## Approval
Franco explicitly approved this business rule on 2026-08-24.
