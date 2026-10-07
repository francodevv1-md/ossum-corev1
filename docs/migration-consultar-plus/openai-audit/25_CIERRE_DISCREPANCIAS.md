# Cierre de discrepancias del núcleo — 2026-10-01

**Decisión:** Contact, Article y Surgery pueden evaluarse mediante un dry-run de solo lectura **sin importar el circuito posterior**. Ninguno está habilitado para escrituras DEV. Este documento reemplaza las conclusiones provisionales de readiness de 19–24, sin alterar los informes independientes congelados 01–18. Evidencia: `core_closure.py` → `.tmp/consultar-plus-openai-audit/core_closure.json` (incluye SHA-256 de nueve DBF de origen), `metrics.py` → `metrics.json`, schema y servicios citados. “Codex” refiere solo a sus tres informes disponibles en `E:/OSSUM_COR_PROJECT/docs/migration-consultar-plus`; no se le atribuyen conclusiones ausentes.

## Universos temporales: predicados sobre CIRUGIA no borrada, no etiquetas

Fecha de referencia: corte del backup 2026-09-29; intervalo `[2026-01-01, 2027-01-01)` sobre *fechas civiles válidas*, independiente de la fecha de ejecución. `loaded_in_2026 := CIRFECCAR en intervalo` **2.539**; `surgery_date_in_2026 := CIRFEC en intervalo` **1.193**; intersección **1.155**. `loaded_before_but_surgery_in_2026 := CIRFECCAR < 2026-01-01 AND CIRFEC en intervalo` **38**. Unión **2.577 = 2.539 + 1.193 − 1.155**: es el número de MiniMax, NO el total cargado en 2026. `loaded_in_2026_but_future_surgery` exige definir el límite: posterior al año 2026 **1**; posterior al corte del backup **27** (incluye octubre programado). No confundir ambas cifras.

`not_performed` es **solo un proxy de estado actual** `CIRESTADO NOT IN (REA,FIN)` para la cohorte elegida: **1.421** entre las cargadas en 2026; no demuestra que el acto nunca haya ocurrido. `cancelled/suspended := CIRESTADO IN (CAN,SUS)` = **142** cargadas, **53** fechadas en 2026. `historical_completed := CIRFECCAR < 2026-01-01 AND CIRESTADO IN (FIN,REA)` = **2.228**; se desconoce la *fecha* de finalización. Entre las fechadas en 2026, **1.086** están actualmente FIN/REA. `loaded_in_2026 AND CIRFEC IS BLANK` = **1.378**. Cada run debe guardar el predicado; nunca informar “cirugías 2026” sin criterio.

## Matriz de evidencia de las tres auditorías

Confianza: CF = CONFIRMADO FUNCIONALMENTE (interfaz/operación confirmada por Franco); CD = CONFIRMADO POR DATOS; AC = ALTA CONFIANZA; P = PROBABLE; NR = NO RESUELTO; X = CONTRADICHO. C: Codex INVENTARIO_BACKUP/ANALISIS_2026/DICCIONARIO_DBF_RECONSTRUIDO; M: MiniMax 03/04/05/08/12; O: OpenAI 01–18 y `core_closure.json`. “—” indica ausencia de afirmación, no acuerdo.

| Tema | Codex | MiniMax | OpenAI | Evidencia / prueba | Conclusión final | Confianza |
|---|---|---|---|---|---|---|
| CIRUGIA | 7,514 physical; any date 2026 2,583 incl. deleted | 7,512 active; calls union 2,577 “2026” | 7,512 active; loaded 2,539; dated 1,193; union 2,577 | `core_closure.json.universe`, `ANALISIS_2026.md:21` | Keep three distinct populations; union is NOT loaded cohort | CD; M wording X |
| CLIENTE | 9,078 | universal multi-role | 9,078; repeated CLICOD 2268 twice | `core_closure.json.contact` | Repeated code requires review; global identity not per role | CD |
| ARTICULO | 5,902 | 5,902 | duplicate ARTCOD 1301-T1S with different descriptions | `core_closure.json.article` | Do not auto-MERGE that code | CD |
| CIRNOTAS | 6,365 with FPT | 6,365, notes 2025+ | 6,365 headers; FPT not decoded | `profiles.json.CIRNOTAS` | Notes are later, independent from core Surgery fields; preserve pending memo decode | CD count; NR text |
| CIRTIP | 75 | 75 catalogue | 75; many Surgery rows blank type | `profiles.json.CIRTIP`, `core_closure.json.cohorts` | Optional classification; never fabricate type | CD |
| VIAJANTE | — | 7 | 7 | `core_closure.json.other`, `VIACOD` field | Salesperson code candidate, NOT OSSUM User/Contact automatically | CD count; NR identity |
| STOCK/STOCK1 | 9,819 / 312,095 physical | 9,754 / 312,095; NR→RE mapping asserted | 9,754 / 311,852 active; matches and orphans | `metrics.json.stock`, deletion flags | Operational document semantics unresolved; outside core writer | CD counts; NR semantics |
| CUENTAS/CUENTASD | 22,055 / 56,021 physical | 99.5% linked interpreted as invoices | 22,029 / 56,019 active; 2,526/2,539 loaded surgeries have CUENTAS via VTACIRCOD | `metrics.json.joins` / `.surgeries` | Link does not prove issued or fiscal | CD link; NR issuance |
| Estado REA/FIN | — | says performed but 1,172 in 2026 | 1,086 current REA/FIN with 2026 CIRFEC | script + UI definitions | REA consumed; FIN performed and billed **by UI**; actual completion date unknown | CF meaning; CD count; X “1,172 performed” |
| Status SAU/AUT/PEN/TRA/CAN/SUS/SCO | — | nine observed | nine observed | `profiles.json.CIRUGIA.top_codes`, user's UI anchors | preserve raw code and map only safely; SCO/TRA lose meaning in cxStatus | CF names; NR destination gaps |
| Date fields | date table spans 2026 | loads sometimes conflated with date | three independent dates and counts | user anchors; `core_closure.json.universe` | Load/date/logistics stay separate | CF |
| FKs patient/doctor/institution/payer | dictionary inferred | 99.99% names | joins 7359/7360, 5900/5900, 4686/4687, 7512/7512 | `metrics.json.joins`, distinct code collision | strong structural FK, tenant & duplicates still validate | AC |
| Contact roles | universal CLIENTE | proposes multiple links per role | 40 codes seen in >1 surgery role; OSSUM unique contactId+companyId | `core_closure.json.contact`; `schema.prisma:307–335` | ONE link per company; roles[] / group memberships, not one link per role | CD; M proposed mapping X |
| Remito/consumo | equating CUENTAS with sales document is not a remito | maps NR/RE differently within same report | no artifact-level proof of remito/consumption | `05_FORENSICA_STOCK.md:9–40,175–188`; 09/10 | leave later, no synthetic Remito or Consumo | NR |
| Devolución | — | says no returns on CAN/SUS/SCO | CAN 1 and SCO 7 linked RE|STKDEV=S | `metrics.json.stock.linked_by_surgery_status` | Blanket absence refuted; exact material return still unresolved | X absence; NR semantics |
| Facturación | CUENTAS emits dates/CAE fields | 99.5% “with invoice” | 99.49% loaded cohort linked to CUENTAS, not necessarily issued | `metrics.py`, Invoice/FiscalDocument schema | Do not infer billed/fiscal from join; FIN by UI not CAE proof | CD link; NR fiscal |

Source read-only data is stronger than agent voting. Neither the unresolved post-core interpretations nor absent DEV matching invalidates a **local** read-only core candidate assessment.
