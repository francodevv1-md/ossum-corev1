# Synthetic fixture evidence

## Done
Real authenticated read-only preflight confirmed exact company `codevdistricorr1000000000` using the previously captured state on http://127.0.0.1:5000. All four source-defined DEV contacts passed ID/code/type/active/company-link/cliente-role checks.

## Changed
Added only the native wizard's canonical business context groups through existing audited Contact PATCH. Preserved the union of all prior groups; no roles, permissions, identity, contact-name or activation changes. No contacts created or removed. All four fresh GET group checks subsequently passed.

## Files
Runtime fixture helper remains outside Git under approved Temp/opencode. No session/token/credential contents recorded.

| Field | Exact ID | Exact code | Required existing group |
| --- | --- | --- | --- |
| Patient | ctdevpatient1000000000000 | DEV-PATIENT | pacientes |
| Doctor | ctdevdoctor10000000000000 | DEV-DOCTOR | medicos |
| Institution | ctdevinstitution100000000 | DEV-INSTITUTION | instituciones |
| Payer | ctdevpayer100000000000000 | DEV-PAYER | obras_sociales |

## Validations
- Real membership and all four contact GET checks: PASS before writes.
- Existing audited native group PATCH: 4 successful additive fixture preparations.
- Fresh complete read-only preflight including each required group: PASS.
- Source outbound review: minimal no-coordinator/no-mentions/no-PR/no-upload/no-OCR create/note/authorize chain contains no mail/ntfy/GPS/webhook dispatch. Authorization's explicit empty coordinator recipients prevent internal recipient/broadcast writes.
- Server evidence gate: real owned-case test verified409 `surgery_authorization_evidence_required`, still-pending status and no entries before the explicit exception; no status-write bypass.
- UI default catalog includes `CLA-0009` / `Otro`; runtime selection must verify visible choice rather than assume the baseline seed's absent classification.

## Risks
Imported supplied-source cases/contacts are excluded. No real coordinator/recipients. No blanket environment or DB-trigger certification from source inspection. No cleanup/reset/rollback to remove test evidence.

## Next
Exactly one uniquely marked native wizard case, CX-0010, was created with a backend CUID. After correcting a test ID-format assertion, resumed that same owned case without duplicate creation; verified contacts/classification/no assignment, rejection before exception, actor-attributed exception, authorized status and reload. Saved spec fails closed on target/fixture mismatch.
