# Proposal: Contact Address Geolocation — Institutions T3 DEV

**Change:** `CONTACT-ADDRESS-GEOLOCATION-INSTITUTIONS-T3-DEV-001`  
**Delivery:** Internal auto-chain; no commit and no PR.

## Intent

Allow approved Contacts in the `instituciones` group to capture, review, and validate the geographic metadata already present on `ContactAddress`, without changing persistence structure or the Logistics map.

## Scope

### In Scope
- Extend ContactAddress payload validation, adapter mapping, service replacement, and Contacts API read/write handling for existing geographic fields.
- Add a server-side Georef lookup and a fixed MapLibre preview to the institutional contact flow.
- Permit `admin` and `operator` to save candidate or pending geographic values; restrict `verified` and `manual_verified` validation to `admin`.
- Emit audit events for geographic candidate/pending writes and admin validation actions.

### Out of Scope
- Schema, migration, Prisma inspection, fixture data, imports, legacy-address correction, or automatic correction.
- Logistics map changes, GPS, vehicles, tracking, Auth-policy changes, deployment, commits, and PRs.

## Capabilities

### New Capabilities
- `contact-address-geolocation`: Institutional ContactAddress geographic entry, server-side Georef lookup, role-gated validation, preview, and audit trail.

### Modified Capabilities
- None. No baseline OpenSpec capability exists for Contacts geography.

## Approach

Reuse the existing Contacts mutation path and geographic columns. Keep Georef calls server-side, return lookup candidates to the form, render a non-Logistics fixed MapLibre preview, and centralize status-role enforcement before service persistence and audit emission.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `src/components/contactos/ContactoFormDialog.tsx` | Modified | Institutions-only geography input, lookup candidates, and fixed preview. |
| `src/lib/validators/contact.ts` | Modified | Geographic payload and status-role validation. |
| `src/lib/api/contact-adapter.ts` | Modified | ContactAddress geographic mapping. |
| `src/lib/services/contact.service.ts` | Modified | Scoped replacement and audit emission. |
| `src/app/api/companies/[companyId]/contacts/*` | Modified | Tenant-scoped geographic read/write contract. |
| `src/app/api/*georef*` | New/Modified | Server-side lookup boundary only. |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Operator bypasses validation authority | Medium | Enforce status transitions server-side and test both roles. |
| Georef response is unavailable or ambiguous | Medium | Show candidate/pending state; require explicit user selection. |
| Geography leaks across tenants | Low | Reuse company-scoped Contacts authorization and audit each write. |

## Rollback Plan

Revert the Contacts UI/API/service/validator changes. No schema or data migration requires rollback; existing address fields remain unchanged.

## Dependencies

- Existing Contacts authorization, audit infrastructure, ContactAddress geographic columns, Georef service, and MapLibre integration.

## Success Criteria

- [ ] Only `instituciones` contacts expose and persist the approved geographic flow.
- [ ] `admin`/`operator` can save candidate or pending values; only `admin` can set verified statuses.
- [ ] Lookup is server-side, preview is fixed, and qualifying writes create audit events.
