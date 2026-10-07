# Cohorte CIRFEC junio–septiembre 2026 — 2026-10-01

**GATE de universo: PASÓ.** Predicado parametrizado `surgery-date:2026-06-01..2026-09-30`, extremos inclusivos (equivalente a CIRFEC ≥ 2026-06-01 y < 2026-10-01). Resultado **581**, exactamente baseline del documento 35. El run fue `legacy-only`; ningún target OSSUM se consultó o creó. Fuente: `.tmp/consultar-plus-openai-audit/cohort-2/{records,aggregate}.json`, `reportHash` `a12f89b4c34a5e022edcd0c8232125e3c4d0ffe92563806fb2afaec83207facc`.

| Partición disjunta de Surgery | Filas |
|---|---:|
| Estructuralmente elegibles; `UNRESOLVED_NATIVE` | **553** |
| ERROR → REJECTED | **4** (todos `missing_patient`) |
| REVIEW, semántica TRA/SCO no resuelta | **24** (TRA 19, SCO 5) |
| Total | **581 = 553 + 4 + 24** |

Entre las **553 elegibles**, **167** tienen al menos un WARNING no bloqueante; los warnings de REVIEW/ERROR se reportan aparte y **no** se suman a esa subcategoría. Causas relevantes en 581: `missing_type` 190, `missing_doctor` 25, `missing_institution` 22; advertencias TRA 19 y SCO 5. Un registro puede tener múltiples causas. FIN 488 + REA 45 = **533 por estado actual**, no fecha probada de intervención. Distribución restante: CAN 17, SUS 4, SAU 2, AUT 1, SCO 5, TRA 19.

**857 códigos Contact distintos** en cinco campos quirúrgicos, 7 con roles múltiples dentro de la cohorte; todos quedan sin resolución nativa por ausencia de adapter DEV. No se reemplaza `CIRCLICOD` por pagador. Article requerido por Surgery = **0**. El catálogo Article independiente no se usó para rechazar una Surgery. No hay `wouldCreate=true`, `wouldReuse=true` ni numeración visible. De 7.514 filas físicas CIRUGIA se excluyeron 2 deleted en la fuente.

Control adicional no exigido por Gate: `npm run migration:dry-run -- --cohort surgery-date:2026-01-01..2026-12-31` produjo **1.193** casos, **1.086 FIN/REA**, **1.545 códigos Contact** y partición **1.157 elegibles / 7 ERROR / 29 REVIEW** (`cohort-full-2026`). Demuestra que el mismo predicado parametrizado no depende de junio–septiembre; no convierte en operativa la migración del resto.
