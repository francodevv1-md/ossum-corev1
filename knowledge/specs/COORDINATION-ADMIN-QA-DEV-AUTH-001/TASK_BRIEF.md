# Task Brief — Coordination Admin QA DEV Auth

- **Approval:** Franco explicitly approved creating one synthetic `admin` QA identity in Supabase DEV on 2026-08-16.
- **Objective:** validate the authorized Coordination management flow for durable shipping date and transport persistence.
- **Target:** confirmed DEV project `yywqcdromnmmelijvspi`, company `Districorr DEV`, exact email `coordination.admin.qa.dev@ossum.test`.
- **Allowed mutations:** create exactly one Supabase Auth identity, one internal active User, and one active `admin` company access; add ADMIN_QA credentials to ignored `.env.local`.
- **Validation:** fail closed on provenance or partial pre-existing state; verify exact Auth/User/access graph, ephemeral login, and environment presence without exposing secrets.
- **Credential handling:** generate in-process, never print, persist only in an ACL-protected file outside the repository and ignored `.env.local`.
- **Excluded:** Contacts, surgery assignments, role-policy changes, existing identity changes, schema, migrations, production, deploy, commit, push, and PR.
- **Commit amendment:** Franco explicitly requested the local Coordination commit on 2026-08-17; this authorizes versioning this execution record and read-only QA only. The one-off provisioning executable remains unversioned; no push, PR, deployment, or new runtime mutation is authorized.
