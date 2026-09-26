# Design: Contact Address Geolocation — Institutions T3 DEV

## Technical Approach

Extend the existing company-scoped Contact create/update payload with `mainAddress.geo`. The existing service replaces the main address and its persisted geography transactionally. A small server-only Georef adapter resolves candidates using injected `fetch`; the institution form explicitly selects one and previews it in an isolated fixed MapLibre component. Logistics remains untouched.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Provider boundary | `georef-address.adapter.ts` accepts `fetchImpl` (default `fetch`) | Server-only access and deterministic tests without a live provider. |
| Resolution | Georef `/direcciones`, return at most 10 candidates, never select/persist automatically | Institutions need an address point; ambiguity requires human review. |
| Point meaning | Provider address = `ADDRESS`; explicit locality fallback = `CENTROID`; manual = `MANUAL` only | Never represent a centroid or manual point as an exact address. |
| Roles | `admin`/`operator` write pending states; only `admin` validates | Route plus service prevent UI/API bypass. |
| Audit | One `AuditEvent` for geo write/state transition; no lookup-read audit | Follows current Contacts audit convention. |

## Data Flow

```
Institution form -> POST contacts/georef/lookup -> adapter -> Georef
     | selected candidate
     +-> existing POST/PATCH contacts -> validator -> service -> ContactAddress + AuditEvent
```

Lookup sends only address context and returns normalized candidates, never a provider response passthrough. Mutation routes prove tenant membership, validate the actor policy, persist through the existing service, then audit a successful geographic change.

## Interfaces / Contracts

### Lookup

`POST /api/companies/{companyId}/contacts/georef/lookup` requires existing company mutation access (`admin`, `operator`).

```ts
type LookupRequest = { street: string; number?: string | null; city?: string | null; state?: string | null; country?: "AR" }
type GeoCandidate = {
  georefId: string | null; entityType: "ADDRESS" | "LOCALITY"; displayName: string;
  city: string | null; provinceGeorefId: string | null; provinceName: string | null;
  latitude: number; longitude: number; coordinateType: "ADDRESS" | "CENTROID";
  crs: "EPSG:4326"; source: "Georef Argentina"; sourceVersion: "v2.0"; retrievedAt: string;
}
type LookupResponse = { candidates: GeoCandidate[] }
```

The adapter URL-encodes populated fields into `https://apis.datos.gob.ar/georef/api/v2.0/direcciones?direccion=...&provincia=...&localidad=...&max=10`. It maps only finite WGS84 points; non-2xx/malformed replies become `georef_lookup_unavailable`. Tests inject `fetchImpl` directly.

### Existing Contact writes

Existing `POST /api/companies/{companyId}/contacts` and `PATCH /api/companies/{companyId}/contacts/{contactId}` accept this additive shape only when requested/persisted groups include `instituciones`:

```ts
mainAddress: { /* existing fields */, geo?: {
  georefId?: string | null; entityType?: "ADDRESS" | "LOCALITY" | null;
  provinceGeorefId?: string | null; provinceName?: string | null;
  latitude?: number | null; longitude?: number | null;
  coordinateType?: "ADDRESS" | "CENTROID" | "MANUAL" | null; crs?: "EPSG:4326" | null;
  source?: "Georef Argentina" | "Manual" | null; sourceVersion?: string | null; sourceRetrievedAt?: string | null;
  validationStatus?: "candidate" | "missing" | "conflict" | "verified" | "manual_verified" | "deprecated" | null;
  validationNotes?: string | null;
}}
```

Non-institutions reject geo. Coordinates must be paired, finite (`latitude [-90,90]`, `longitude [-180,180]`) and require `EPSG:4326`, source, type, status. `ADDRESS` requires Georef source; `CENTROID` requires locality `georefId`; `MANUAL` requires admin, `Manual`, and `manual_verified`. Selection starts `candidate`; only admin changes to `verified`/`manual_verified`. Text address fields never change automatically.

Audit after a successful changed geo write:

```ts
{ entityType: "ContactAddress", entityId: addressId, module: "contacts",
  action: "geography_candidate_saved" | "geography_status_changed",
  oldValue: { geo }, newValue: { geo },
  metadata: { contactId, coordinateType, validationStatus, crs: "EPSG:4326" } }
```

## Frontend Composition

`ContactoFormDialog` mounts `InstitutionGeographySection` only for `instituciones`. It looks up, shows explicit candidates/status, keeps the selection in local form state, and submits `mainAddress.geo`. `ContactAddressMapPreview` receives one valid point, has one non-draggable marker and a fixed initial view, and labels its type. It does not import `LogisticsMapCanvas`, `useLogisticsMap`, or Logistics endpoints.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/lib/georef/georef-address.adapter.ts` | Create | Injected-fetch lookup and candidate normalization. |
| `src/lib/validators/contact.ts` | Modify | Geo shape, institution gate, bounds, status policy. |
| `src/lib/services/contact.service.ts` | Modify | Main-address geographic replacement and policy defense. |
| `src/lib/api/contact-adapter.ts` | Modify | Geo form/API round trip. |
| `src/lib/api/contacts.ts` | Modify | Typed lookup client. |
| `src/app/api/companies/[companyId]/contacts/georef/lookup/route.ts` | Create | Authenticated lookup boundary. |
| `src/app/api/companies/[companyId]/contacts/route.ts` | Modify | Geo create/audit. |
| `src/app/api/companies/[companyId]/contacts/[contactId]/route.ts` | Modify | Geo update/audit. |
| `src/components/contactos/InstitutionGeographySection.tsx` | Create | Candidate selection and status controls. |
| `src/components/contactos/ContactAddressMapPreview.tsx` | Create | Fixed non-Logistics preview. |
| `src/components/contactos/ContactoFormDialog.tsx` | Modify | Institutions-only composition. |
| `src/__tests__/unit/georef-address.adapter.test.ts` | Create | Injected-fetch URL, mapping, error tests. |
| `src/__tests__/unit/contact-geography.test.ts` | Create | Validation, transitions, audit shape. |
| `src/__tests__/components/InstitutionGeographySection.test.tsx` | Create | Candidate and role-gated UI. |

## Testing Strategy

| Layer | Coverage |
|---|---|
| Unit | Adapter URL/mapping/failures; geo bounds, institution gate, status transitions, audit payload. |
| Component | Institution-only section, explicit selection, operator validation controls. |
| Integration | Tenant scope and admin/operator mutation outcomes with mocked provider. |

## Migration / Rollout

No migration required. No schema, fixtures, provider call, Logistics map, or automatic correction. Rollback is a code revert; existing data is untouched.

## Open Questions

None.
