# Revisión adversarial del dry-run local — 2026-10-01

**Gate 1 evaluado:** fixture y cohorte pasaron; controles read-only/determinismo pasaron según las pruebas descritas, con límites explícitos. `python -B -m unittest discover -s scripts/legacy-openai-audit -p test_dry_run.py -v`: **4/4**; uno ejecuta el proceso legacy-only con `socket.socket` bloqueado. `git check-ignore` confirma que `records.json` está ignorado. `source_files()` compara hash antes de decodificar; prueba que sustituye el hash esperado de CIRUGIA por ceros falla `source_hash_mismatch:CIRUGIA` antes de leer registros. Nunca se leyó un `.env` ni se importó código de `src/`.

| Intento de refutación | Evidencia / resultado |
|---|---|
| Fila faltante, repetida o deleted | `sourceRecordKey=tabla:ordinal` y unicidad verificada; 7.514 físicas / 7.512 activas, 2 excluidas; fixture 60 en orden exacto. |
| Empresa TEST mezclada | CIRCOD 2 queda REJECTED con `non_principal_company`, nunca normalizado a PRINC; company-map simbólico incluye ambos códigos pero autoriza solo PRINC en este corte. |
| Identidad truncada/número inventado | IDs lexicográficos `str` y sourceRow hash, `visibleNumber=null`; ninguna conversión a Int para identidad. |
| Fechas mutadas/zonas horarias | solo `date(...).isoformat()` civil; 20260229 se rechaza en test, sin `DateTime` de OSSUM ni hora ficticia. |
| Estado desconocido aceptado | CIRCOD 61 con estado vacío REJECTED; TRA/SCO se conservan como REVIEW con `cxStatus=null`, `prepStatus=null`. |
| Silenciar warnings | WARNING-only medido aparte; 167 elegibles con warnings en cohorte; los 10 negativos verifican causas esperadas. |
| Article exigido accidentalmente | `articleResolution.mode=NOT_REQUIRED` por cada Surgery; catálogo 5.902 procesado separadamente; no se lee STOCK1. |
| Side effects / DB / red | script Python stdlib sin import Prisma/pg/Supabase/HTTP; monkeypatch de socket pasó; sin credenciales ni endpoint DEV, `--match-mode dev-read-only` falla cerrado. Ninguna prueba puede garantizar el comportamiento de otros procesos simultáneos. |
| Datos sensibles | stdout/aggregate solo conteos, categoría y hashes. `records.json` contiene IDs legacy seudónimos sensibles, **gitignored**, no texto clínico/documentos/identificadores fiscales. |
| Backup distinto | hashes de 4 tablas congeladas comprobados al inicio y final; no se reacepta cambio silenciosamente. |

Riesgos que **no invalidan Gate 1**, pero prohíben write: marcadores ACL del sistema no certificados (garantía del proceso `rb`/mmap READ), memo FPT no decodificado ni incluido en hash por fila, asociaciones Contact/Article nativas DEV no medidas, resolución de TRA/SCO pendiente, campos fiscales/stock posteriores excluidos. El control de red prueba la ruta ejecutada; también se revisó el grafo de imports para evitar invocar servicios productivos. Esta auditoría no pretende demostrar permisología de PostgreSQL.
