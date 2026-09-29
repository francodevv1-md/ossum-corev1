# TASK BRIEF — FISCAL-DEV-HARDENING-001

## Objective

Harden the TusFacturas DEV issuance and webhook boundary before any credential or provider configuration exists.

## Scope

- Fail closed unless `TUSFACTURAS_WEBHOOK_SECRET` is configured and the documented `TF-WebhookToken` header matches in constant time.
- Persist only a credential-free fiscal payload for snapshots, hashes, attempts, and webhook evidence.
- Keep existing fiscal snapshots immutable; retries use the persisted business snapshot and reject regenerated business payload drift.
- Deduplicate sequential webhook replays through the existing nullable `FiscalIssuanceAttempt.correlationId` column.
- No schema, migration, database, provider, Auth, or dependency changes.

## Diagnose

Reproduce: inspected the completed fiscal paths and ran focused regression tests.

Scope: webhook route plus fiscal client/issuance persistence boundary.

Evidence: the route conditioned authentication on a configured secret; issuance persisted a credential-bearing outbound payload and updated an existing snapshot; webhook handling always created the next attempt.

Hypothesis: the same mixed provider/request object was being used for transport and durable evidence, while webhook events had no durable replay correlation.

Minimal Fix: separate sanitized evidence from in-memory credentials, use the documented header only, preserve snapshots, and use a SHA-256 correlation key stored/queryable through the existing `correlationId` field.
