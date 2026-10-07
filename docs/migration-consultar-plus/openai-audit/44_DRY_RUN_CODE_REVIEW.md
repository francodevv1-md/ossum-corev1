# Gate 1B — revisión adversarial independiente del código (2026-10-01)

**Veredicto: PASS WITH FINDINGS.** Se leyó `dry_run.py` y `test_dry_run.py` completos, además de `package.json` y `.gitignore`. El baseline se reprodujo desde los DBF necesarios, no desde los informes. **No quedan CRITICAL ni HIGH conocidos sin resolver dentro del alcance legacy-only.** Los reportHash de 39–41 son de la estrategia anterior, que procesaba ARTICULO aun cuando Surgery no lo requería; no representan la salida actual `core-v2-article-opt-in`. Los conteos quirúrgicos sí coinciden. Ningún DBF, FPT, schema ni DB fue modificado.

## Hallazgos demostrados y correcciones mínimas

| Severidad inicial → residual | Archivo/líneas actuales | Reproducción y riesgo | Corrección verificada |
|---|---|---|---|
| **HIGH → resuelto** | `test_dry_run.py:32–72` | El test anterior leía `fixture-3/4` y `cohort-2` ya guardados: **pasó** incluso parcheando `candidate_action` para devolver siempre `REJECTED` (`stale_test_passed_under_mutant=True`). No probaba el código corriente. | Ejecuta dos fixtures y una cohorte **nuevos**, compara JSON semántico completo; el mismo mutante ahora falla (`live_test_detected_mutant=True`). Incluye contraste de CIRUGIA con un segundo lector DBF independiente (`profile.py`) para 581 IDs, 533 FIN/REA y 857 contactos. |
| **HIGH → resuelto** | `dry_run.py:140–156,346–379,489–506` | En la versión revisada, un hash ARTICULO inválido bloqueaba `--sample-only` de Surgery. Contradecía la independencia del catálogo. El test sintético falló `source_hash_mismatch:ARTICULO`. | Artículo **opt-in** mediante `--include-article-catalog`; sin esa bandera no se abre ni se hashea ARTICULO y el informe dice `NOT_REQUESTED`. Con la bandera el hash inválido sigue bloqueando. `articlesRequiredBySurgery=0` no esconde una lectura obligatoria. |
| **HIGH → resuelto** | `dry_run.py:262–300,426–444` | Un CLICOD único con todos los campos de identidad vacíos se aceptaba como patient válido: test en memoria obtuvo `UNRESOLVED_NATIVE` en vez de `REJECTED`. | El resultado de ContactCandidate se aplica al resolver Surgery. Patient de fuente inválida → `patient_source_invalid`/REJECTED; referencia opcional inválida → WARNING/REVIEW. |
| **MEDIUM → resuelto** | `dry_run.py:381–400,483–510` | CIRFEC imposible en un cohort `surgery-date` se omitía sin registrar nada: test con `20260229` dio `KeyError: unclassifiableCohortDates`. | Se separan filas sin fecha clasificable en `unclassifiedSourceRecords` privado + conteo agregado, sin asignarlas falsamente al período. CIRFECCAR obligatorio vacío/inválido también se individualiza en `loaded`. El source actual no contiene esas anomalías; baseline no cambia. |
| **MEDIUM → resuelto** | `dry_run.py:349–363` | El control anterior resolvía tanto `PRIVATE_ROOT` como `out`; si `.tmp` fuese symlink externo, aceptaría escrituras fuera del Gitignore. Test controlado esperaba `private_audit_directory_invalid` pero obtuvo `private_out_parent_missing_or_existing`. | Se rechazan raíces `.tmp`/subcarpeta symlink o resueltas fuera del workspace antes de leer source; `out` sigue obligado a ser hijo directo privado. |
| **MEDIUM → resuelto** | `dry_run.py:379–388` | `sample-only` seleccionaba el **primer** CIRCOD coincidente; un segundo registro con igual CIRCOD no provocaba fallo, como demostró mutación en memoria. | El fixture falla cerrado con `fixture_source_ambiguous`; cohortes normales conservan ambas filas por ordinal y las ponen REVIEW como `duplicate_circod`. |
| **MEDIUM → resuelto** | `dry_run.py:70–130,245–258,448–478` | `SurgeryCandidate` contenía solo CIRCOD, cxStatus y nulos; la procedencia AUSRID/autorización/fechas dependía del objeto normalizado separado. | Candidate retiene en memoria companyCode, tres fechas civiles, estado raw, cinco referencias, tipo, VIACOD, AUSRID, autorización y puntero memo. En JSON se expone solo actorPresent/autorizaciónPresent para no volcar nombres/PII. |
| **LOW → residual documentado** | `dry_run.py:349–363,514–526` | Un proceso malicioso concurrente con permisos de escritura podría reemplazar el directorio de salida entre `mkdir` y `write_text` (TOCTOU); Gitignore no equivale a ACL. | No hay tal actor verificado en la corrida. Mantener la carpeta bajo control local y no alegar protección OS ni garantía ante adversario concurrente. Si se requiere aislarlo, usar descriptor/directorio protegido antes de procesar datos reales. |
| **LOW → residual documentado** | `test_dry_run.py:63–72`, `dry_run.py:5–15` | Bloquear `socket.socket` prueba la ruta ejercitada, no una garantía formal de que cualquier futura librería nativa/subproceso sea inofensivo. | Lista de imports acotada a stdlib; búsqueda estática sin `src`, pg/Prisma/Supabase, HTTP, subprocess ni sqlite. Repetir esta revisión si cambia el grafo de imports. |
| **INFO → intencional** | `dry_run.py:17–31,302–308` | Hashes fuente, namespace y lista de 50+10 CIRCOD son constantes deliberadas. | Se usan en preflight y selección del fixture, **no** en reglas de estado/contacto ni para inyectar outcomes; tests mutados aplican reglas generales. |

## Cobertura efectiva de tests (no confundir con garantías absolutas)

| Test | Sí detecta | No demuestra |
|---|---|---|
| `test_dates_and_cohort_parser_are_civil` | día válido, 20260229 inválido, nulo y rango invertido | semántica temporal del negocio ni timezone de escritura futura |
| `test_fixture_and_cohort_reconcile` | ejecución **actual** por duplicado, fixture exacto 50+10, errores por control, 581/533/857, 553/4/24, objetos completos, Article no requerido | que el mismo algoritmo runtime de selección esté libre de bugs desconocidos |
| `test_cohort_against_independent_existing_dbf_reader` | segundo decoder reproduce conjunto completo de IDs, 581/533/857 | que ambos lectores compartan error de interpretación DBF de un campo ajeno a estos predicados |
| `test_preflight_rejects_changed_source_before_read` | hash esperado adulterado rechaza lectura; modo DEV no implementado falla cerrado | efecto de un swap atómico del source bajo atacante concurrente |
| `test_legacy_only_does_not_use_network` | ejecución actual con socket denegado | futuros imports, red vía código nativo o credenciales de una DB DEV |
| `test_unclassifiable_cohort_date_is_reported`, `test_private_report_root_must_remain_inside_workspace` | mutaciones sintéticas invalidan fecha/raíz privada | ACL del directorio en Windows |
| `test_required_patient_with_no_usable_identity_is_rejected`, `test_sample_duplicate_source_id_fails_closed`, `test_article_source_is_not_required_for_surgery` | tres bugs anteriores; escenarios sin modificar el backup | equivalencia con contactos/artículos nativos DEV |
| `test_mutated_source_rows_are_classified_by_general_rules` | patient inexistente/ambiguo, estado desconocido, TRA/SCO, TEST, fechas, CIRFEC vacío, contacto opcional, CLICOD/ARTCOD duplicado | asignación humana de semántica TRA/SCO |
| `test_deleted_marker_in_minimal_private_dbf_and_cli_guards` | DBF sintético con registro borrado, source incompleto, `--out` en backup y sample+cohort incompatibles | filesystem read-only impuesto a otros programas |

## Reproducción Gate 1B desde código y source

`python -B -m unittest discover -s scripts/legacy-openai-audit -p test_dry_run.py -v`: **12/12**. Fixture `gate1b-fixture-a` (entrada npm) y `gate1b-fixture-b` (Python) tienen JSON completo y hash idéntico `d45d52f07d94b3db1182034c4e9292c365adc19ac7f0ddba1a8f288a65369ffd`. Selección 60: 50 positivos sin ERROR + 10 negativos con outcome esperado; partición **53 elegibles + 4 rechazados + 3 REVIEW**. Cohorte `gate1b-cohort`: **581 = 553 + 4 + 24** con 24 REVIEW = 19 TRA + 5 SCO; **167** WARNING-only entre los 553, **533 FIN/REA**, **857** códigos Contact; hash `d61c07607b4c40898f7b65d6b5c711f54fe273780caa4d95010b730d07c3f7bc`. Full-year `gate1b-full-2026`: **1.193 = 1.157 + 7 + 29**, **1.086 FIN/REA**, **1.545** Contact. `gate1b-article-optin` demuestra catálogo opcional (5.902) sin convertirlo en dependencia de Surgery.

Las cuatro tablas originales **ya no son obligatorias simultáneamente**: sample/cohort core pre/post valida solo CIRUGIA/CLIENTE/CIRTIP; ARTICULO se comprueba exclusivamente con `--include-article-catalog`. CIRUGIA SHA-256 permanece `a19feb2cda3694905c4ffe280e201930ff4fb99adfab775f1a14d4c26dde4866`. DBF se abre `rb` y mmap `ACCESS_READ`; únicos writes `records.json`/`aggregate.json` bajo carpeta privada `.tmp/consultar-plus-openai-audit/` (verificado `git check-ignore -v` en un archivo real). No se leyó `.env`, no se conectó a DEV, no se usó Prisma. `records.json` contiene identificadores seudónimos, no texto clínico ni documentos; stdout/aggregate contiene conteos y hashes. **Los tres hashes de tablas compartidas permanecen iguales**; el conjunto de tablas incluidas en el manifest y el reportHash post-fix difieren de 39–41 por cambio explícito de scope, no por mutación del backup.

## Gate 1B por propiedad

| Propiedad | Veredicto |
|---|---|
| Correctness | PASS WITH FINDINGS: tres bugs HIGH corregidos, riesgos futuros de FPT/DEV fuera de alcance |
| Read-only | PASS WITH FINDINGS: source `rb` y no DB/network en ruta probada; ACL/concurrencia del filesystem no demostrados |
| Determinism | PASS: JSON completos y hashes de dos corridas nuevas idénticos |
| Fixture | PASS: 50+10 y outcomes individuales probados desde código actual |
| Cohort | PASS: cardinalidad/IDs reconciliados contra decoder independiente |
| Privacy | PASS WITH FINDINGS: salida privada gitignored; su ACL real no verificado |
| Source integrity | PASS WITH FINDINGS: hashes pre/post de tablas usadas; FPT no leído/hasheado porque está fuera del scope |

**Conclusión:** ningún CRITICAL/HIGH sin resolver, se puede **preparar** Gate 2. NO se autoriza conexión DEV ni escritura por este veredicto.
