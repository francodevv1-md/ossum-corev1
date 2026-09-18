# Task Brief — Coordination and Tracking UI

- **Scope:** presentation-only Coordination/Tracking redesign, advisory labels, focused tests, and alignment of Seguimiento mutation controls with the existing API permission.
- **Approval:** Franco approved the UI package previously and explicitly replied `apruebo` on 2026-08-14 to the minimal shared frontend/backend permission rule and direct-action guard.
- **Excluded:** persisted workflow changes, new domain states, schema, migrations, providers, production data, deployment, push, and PR.
- **Permission policy:** the existing server policy remains unchanged: Seguimiento event mutations require `admin`; the UI now consumes the same declaration and the API remains authoritative.
