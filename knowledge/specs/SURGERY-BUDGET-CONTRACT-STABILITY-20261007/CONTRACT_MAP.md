# Critical-flow contract map

## Nueva Cirugía
`NewSurgeryDialog` -> `useCirugiaActions.handleNewSurgery` -> company surgeries POST -> route contact resolution -> `validateCreateSurgeryInput` -> `createSurgery` transaction -> `listSurgeriesByCompany` -> `surgery-adapter` -> UI store read projection.

| Field/result | Baseline finding | Required invariant |
|---|---|---|
| Surgery identity | POST returns DB id + visibleNumber; UI adapter separates id/backendId | API relations always use DB id |
| Patient/doctor/institution/payer | Route resolves references; service checks company links | Do not substitute a local ID or silently create a replacement from display text |
| Date/time | Intake sends date alone; time omitted; adapter reads Argentina calendar and explicit time precision | Preserve selected calendar day, optional time and precision |
| Shipping date | Present in wizard/schema/update contract, omitted on create | Persist using existing Date column |
| Notes | POST persists notes; adapter currently omits notes from UI mapping | New fetch must reproduce saved notes |
| Coordinator/seller/instrumentator | Wizard fields and assignment model exist; create path omits assignments | Explicit real IDs or visible unsupported-field error; never local success |
| Legend/administrative references | UI fields have no structured create persistence contract | No silent discard; do not invent a schema-free metadata envelope |
| Attachment | Separate POST can fail after surgery commit | Report partial success and preserve recovery context |
| Refresh | Can fail after successful write | Retain DB identity; no fallback local surgery |

## Presupuestos
`PresupuestoFormDialog` / intake -> shared payload builder -> company presupuestos POST/PATCH -> Zod validator -> `createPresupuesto` / `updatePresupuestoDraft` -> Prisma transaction and audit -> serializer -> shared edit/legacy projection.

| Field/result | Baseline finding | Required invariant |
|---|---|---|
| Surgery relation | Standalone dialog resolves backendId; intake used local creation | Same shared API and backend identity |
| Commercial IDs | Persisted in existing metadata | Supplied IDs must refer to active-company backend entities |
| General discount | Metadata persisted but total calculation ignores it | UI calculation and authoritative write/read amount agree |
| Optional clearing | Empty values become undefined and disappear in JSON | Explicit clearing survives PATCH and readback |
| VAT treatment | NO_GRAVADO becomes exento during hydration | Preserve distinct treatment even when both rates are zero |
| Revision | Draft update checks expectedRevision under row lock | Preserve conflict behavior and edited input on 409 |
| Unknown write outcome | POST can commit while response fails | Empty subsequent read alone does not prove rollback |

No adjacent Stock, Remitos, Facturación, Auth or provider contracts are implementation targets.
