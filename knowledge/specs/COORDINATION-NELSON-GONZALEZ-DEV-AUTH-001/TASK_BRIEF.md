# Task Brief — Nelson Gonzalez DEV coordinator identity

## Approval

Franco explicitly approved on 2026-08-14 creating the DEV coordinator account `Nelson Gonzalez` and replacing the existing `Nelson DEV` identity while preserving its assignments.

Franco explicitly authorized the local commit `fix(coordination): align Nelson DEV identity compatibility` on 2026-08-14 after focused validation passed.

## Scope

- DEV only: canonical Supabase DEV project and active `Districorr DEV` company.
- Rename the existing active personal coordinator contact from `Nelson DEV` to `Nelson Gonzalez`.
- Preserve the exact eight existing `SurgeryContactAssignment` rows.
- Create one synthetic Supabase Auth identity, one active internal User, and one active `coordinator` company access.
- Store the temporary credential only in a hardened local file outside the repository.
- Align DEV bootstrap contact creation with `Nelson Gonzalez` while preserving the immutable overlay authority symbol `Nelson DEV` through an explicit compatibility lookup to the renamed contact.

## Excluded

- Production or staging.
- Schema, migration, provider, permission-policy, or dependency changes.
- New surgery assignments or changes to Ezequiel DEV.
- Push, PR, deployment, or publication.

## Validation

- Exact DEV provenance and company context.
- Auth/User/access/contact resolve uniquely.
- Exact assignment count remains eight.
- Provisioning rerun is a no-op and does not rotate the credential.
- Authenticated browser login reaches personal `Mi bandeja`.
- Existing focused resolver, provisioning, bootstrap, overlay, adapter, preview, and view tests pass.
