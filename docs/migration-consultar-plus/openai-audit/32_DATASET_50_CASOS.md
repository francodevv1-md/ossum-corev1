# Frozen core Surgery controls — 2026-10-01

**Decision:** 50 *structurally acceptable* cases for a read-only candidate pipeline, NOT 50 approved for write; 48 `CIRFEC` 2026 with FIN/REA + 2 completed 2024 historical inactive-contact controls, both PRINC and with unique patient. The two older cases deliberately test portability and must not be silently included in the 2026 operational wave. Reproduce **without a new inventory** via `python -B scripts/legacy-openai-audit/core_closure.py`; machine-readable details including source SHA-256, per-case warnings and coverage are in `.tmp/consultar-plus-openai-audit/core_closure.json`. Freeze source: `CIRUGIA.DBF` SHA-256 `a19feb2cda3694905c4ffe280e201930ff4fb99adfab775f1a14d4c26dde4866`; another hash invalidates the manifest. IDs listed in deterministic selection order; no patient fields.

## 50 positive CIRCOD (immutable fixture list)

```
6411 6814 6958 6883 6832 6966 7004 7047 4660 4831
5437 5515 5517 4962 5052 5121 5122 5236 5486 5528
5693 5714 5843 6172 6276 6719 7486 5191 5291 5325
5357 5373 5431 5511 5592 5633 5751 6000 6188 6330
6461 6489 6597 6600 7477 5067 5215 5243 19 18
```

Coverage verified by script: 8 REA, 42 FIN; 2026 Jan–Sep all represented + two January 2024 controls; 36 payers, 48 doctors, 40 institutions and 32 nonempty types; both present/absent optional fields; inactive references in exactly two historical cases (`19` payer, `18` institution). Controls with blank optional type/doctor/institution remain WARNING, not automatically rejected. Date-only and company match still need future writer policy.

## 10 negative/edge CIRCOD (immutable fixture list)

| ID | Expected at least one outcome (from targeted script) |
|---:|---|
| 5402 | ERROR missing_patient |
| 6185 | ERROR patient_not_unique_or_missing (ambiguous CLICOD 2268) |
| 2 | ERROR non_principal_company + missing_patient; TEST tenant must never map to PRINC |
| 61 | ERROR unknown_status (legacy code blank) |
| 43 | WARNING unresolved_cirhoscod; optional FK, requires review |
| 5134 | WARNING missing_surgery_date; loaded cohort but not dated cohort |
| 178 | WARNING unresolved_tra_status; REVIEW antes de escribir; cirugía programada en 2026-10 |
| 5265 | WARNING unresolved_sco_status; REVIEW antes de escribir |
| 249 | WARNING missing_doctor/missing_institution; optional refs |
| 5083 | WARNING missing_type; CAN retains state, no invented procedure type |

```
5402 6185 2 61 43 5134 178 5265 249 5083
```

Estos diez casos son **controles de validación**, no todos rechazos. Mezclan 2026, casos históricos y TEST deliberadamente. El probe ahora informa warnings específicos de TRA/SCO, y el dry-run futuro debe categorizarlos REVIEW. El manifiesto contiene CIRCOD (identificador seudónimo sensible); no contiene nombres, documentos ni texto clínico. Mantener fuera de publicación externa.
