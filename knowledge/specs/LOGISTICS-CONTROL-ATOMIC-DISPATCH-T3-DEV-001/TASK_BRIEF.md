# Task Brief — Logistics Control and Atomic Dispatch (DEV-only)

## Approval and scope

Franco explicitly approved Phase C DEV implementation: `operator` and `admin` may accept preparation control and resolve each difference; every resolution records actor, authoritative time, reason, and evidence; rejected differences remain open and block dispatch. Dispatch is one Caja / one surgical Remito, supports multiple active reservations, consolidates commercial Remito lines by Article, and preserves allocation lineage.

## Boundaries

- No schema or migration unless current persisted models cannot retain deterministic dispatch-line → evidence-line → reservation → correlation lineage. Current schema inspection has not shown that gap.
- No Auth/RLS architecture, UI, consumption, returns, replenishment, purchases, billing/fiscal work, multiple Cajas, deployment, or Git operations.
- Routes authorize and validate transport only; the Phase-C service owns state validation and transactions.

## Delivery strategy

Working-tree DEV package, no PR. The existing dirty Phase-C source is the preserved approved baseline, not a competing owner. Changes must remain minimal and compatible; unrelated dirty deltas must not be discarded.
