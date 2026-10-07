# Resultados del fixture congelado 50 + 10 — 2026-10-01

**GATE fixture: PASÓ.** Dos ejecuciones independientes en carpetas privadas `fixture-3` y `fixture-4`, con idénticos registros, acciones, warnings, errores y `reportHash` SHA-256 `1098e49cded60036bd1fadf1d03e0851e56548dbd385a56d89973721b271258a`. `test_dry_run.py` comparó JSON completo, no solo totales. No se aplicó filtro de fechas al fixture; 48 controles positivos tienen CIRFEC 2026 y dos son controles 2024 con referencias inactivas.

| Control | Esperado | Observado |
|---|---:|---:|
| Positivos seleccionados, orden congelado | 50 | 50, cada CIRCOD exactamente una vez, **0 ERROR** |
| Negativos/edge, orden congelado | 10 | 10, cada uno con al menos WARNING o ERROR correspondiente |
| Total seleccionados | 60 | 60 = 53 elegibles + 4 rechazados + 3 REVIEW |
| `wouldCreate`, `wouldReuse`, `existingTargetId` | null en legacy-only | null para 60 |
| `visibleNumber`, `performedDate`, `cancelledDate`, `prepStatus` | null | null |
| Tablas Surgery deleted | excluidas | 2 físicas excluidas; 7.512 activas |
| Article obligatorio por Surgery | 0 | 0; catálogo independiente 5.902 |

Controles negativos: 5402 → `missing_patient`; 6185 → `patient_not_unique_or_missing` (CLICOD 2268); 2 → `non_principal_company` y `missing_patient` (TEST nunca PRINC); 61 → `unknown_status`; 43 → `unresolved_cirhoscod`/REVIEW; 5134 → `missing_surgery_date`; 178 → `unresolved_tra_status`/REVIEW; 5265 → `unresolved_sco_status`/REVIEW; 249 → `missing_doctor`; 5083 → `missing_type`. No se hardcodearon comportamientos por ID en validación; solo la *selección* del fixture está congelada. Positivos admiten warnings (por ejemplo, contactos históricos inactivos) sin transformarlos en errores.

Referencias Contact de los 60 casos: **215 códigos distintos** entre cinco roles; 4 códigos aparecen en más de un rol. En el catálogo Contact independiente hay 9.078 filas, 153 REVIEW (colisiones documentales/CLICOD) y 8.925 estructuralmente evaluables, todos con matching nativo pendiente. Catálogo Article: 5.902 filas, 4 REJECTED (1 código inválido, 3 descripciones vacías), 38 REVIEW y 5.860 candidatos sin matching DEV. Son categorías *legacy-only*, NO propuestas de alta.

Hash CIRUGIA.DBF antes/después: `a19feb2cda3694905c4ffe280e201930ff4fb99adfab775f1a14d4c26dde4866`; manifest privado contiene los cuatro hashes verificados. Evidencia privada: `.tmp/consultar-plus-openai-audit/fixture-{3,4}/{records,aggregate}.json`. No hay PHI en este documento.
