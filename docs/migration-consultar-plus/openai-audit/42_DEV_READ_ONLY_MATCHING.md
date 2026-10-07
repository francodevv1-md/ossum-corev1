# Matching DEV de solo lectura — no ejecutado

**Estado: BLOQUEADO EN EL GATE DE CONEXIÓN, NO EN EL DRY-RUN LOCAL.** Gate 1 pasó en modo legacy-only (`39`–`41`). La CLI rechaza expresamente `--match-mode dev-read-only` antes de conectarse: no se presentó un endpoint inequívocamente DEV descartable **junto con un rol/credencial efectivamente SELECT-only**. No se leyó `.env`, no se intentó conectar, no hubo queries ni mutaciones. Afirmar porcentajes de REUSE/CREATE/REVIEW sin observar los targets sería falso.

| Dominio | Referencias/candidatos locales observados | EXACT_REUSE | POSSIBLE_REUSE | AMBIGUOUS | NO_MATCH | CONFLICT |
|---|---:|---|---|---|---|---|
| Contact, cohorte 581 | 857 CLICOD en cinco roles | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| Article, catálogo independiente | 5.902 filas fuente | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO | NO MEDIDO |
| Surgery, cohorte 581 | 581 CIRCOD | duplicados nativos NO MEDIDOS | — | — | — | — |

Preparación del adapter futuro (NO implementado): conexión explícita y exclusivamente DEV con credenciales temporales externas, política DB `SELECT` demostrable sin realizar escrituras, allowlist de tablas Contact/ContactCompanyLink/Article/ArticleIdentifier/Surgery/Company/Organization y scope tenant confirmado; cursor paginado, comparación local en memoria, resultados seudónimos solo en `.tmp` gitignored. Match Contact: documento válido y confiable **más** compatibilidad de tipo y vínculo empresa; nombre secundario. Article: organización + SKU o identificador confiable con fabricante/proveedor y elegibilidad de compañía; ARTCOD no es SKU automáticamente. Surgery: no deduplicar solo por fecha+paciente; ausencia de ledger implica REVIEW de coincidencias posibles. Clasificar EXACT_REUSE/POSSIBLE_REUSE/AMBIGUOUS/NO_MATCH/CONFLICT/UNMATCHABLE; **NO_MATCH no equivale a CREATE autorizado**.

Gate 2 queda pendiente. Un rol read-only real y confirmación de DB DEV son precondiciones; una URL presente por sí sola no demuestra ninguna de las dos. Ninguna pregunta a Andrés destraba este límite de permisos/entorno.
