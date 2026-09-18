# Task Brief — Coordination Empty Operator DEV Auth

- **Approval:** Franco explicitly approved creating one synthetic empty Coordination account and correcting `.env.local` on 2026-08-16.
- **Objective:** provide the second authenticated identity required to prove the real empty personal-inbox state in Browser QA.
- **Target:** confirmed Supabase/PostgreSQL DEV project `yywqcdromnmmelijvspi`, company `Districorr DEV`, exact email `coordinacion.vacia.dev@ossum.test`.
- **Allowed mutations:** create exactly one Supabase Auth identity, one internal active User, one active `coordinator` company access, one active personal Contact, and one active `coordinator` ContactCompanyLink; add the two EMPTY_OPERATOR values to local `.env.local`.
- **Required invariant:** the new Contact has zero SurgeryContactAssignment rows and resolves uniquely as the authenticated personal coordinator.
- **Credential handling:** generate the password in-process, never print it, store it in an ACL-protected file outside the repository, and write it only to ignored `.env.local`.
- **Validation:** fail closed on provenance or any pre-existing partial state; verify exact DB graph, zero assignments, unique resolver result, ephemeral login, and environment presence without exposing values.
- **Excluded:** existing user/contact/access/assignment changes, surgery creation or assignment, role-policy changes, production, schema, migrations, deployment, commit, push, and PR.
- **Commit amendment:** Franco explicitly requested the local Coordination commit on 2026-08-17; this authorizes versioning this execution record and read-only QA only. The one-off provisioning executable remains unversioned; no push, PR, deployment, or new runtime mutation is authorized.
