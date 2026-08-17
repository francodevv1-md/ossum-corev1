# Task Brief — Coordination DEV Auth Password Rotation

- **Approval:** Franco explicitly approved rotating only the synthetic Ezequiel DEV and Nelson Gonzalez DEV passwords on 2026-08-16.
- **Objective:** restore controlled browser-QA access without requiring synthetic email inboxes.
- **Target:** confirmed Supabase DEV project only; exact users `ezequiel.dev@ossum.test` and `nelson.gonzalez.dev@ossum.test`.
- **Allowed mutation:** update only each matching Supabase Auth password.
- **Credential handling:** generate independent random passwords in-process, never print them, and write them only to ACL-protected files outside the repository.
- **Validation:** fail closed on project/account/internal-link mismatch; authenticate both users with ephemeral non-persistent clients after rotation.
- **Excluded:** user creation/deletion, email or metadata changes, internal User/role/access/contact/assignment changes, production, schema, database writes, deployment, commit, push, and PR.
- **DEV execution:** both exact passwords were rotated on 2026-08-16 after fail-closed provenance/account/link preflight; both ephemeral logins passed, credential ACLs were proven, no secret was emitted, and the one-off executable was deleted.
- **Commit amendment:** Franco explicitly requested the local Coordination commit on 2026-08-17; this authorizes versioning this execution record only, without restoring the deleted executable, push, PR, deployment, or runtime mutation.
