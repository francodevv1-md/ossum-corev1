# Preflight del dry-run local — 2026-10-01

**GO solo para una CLI Python de stdlib y lectura de DBF en `rb`.** No reutilizar servicios/API de altas OSSUM. `31_DRY_RUN_SPEC.md` se mantiene vigente, con dos precisiones: `.tmp/consultar-plus-openai-audit/` no estaba ignorado por Git y se añadió una regla específica; el mapa de compañías en modo legacy-only contiene códigos simbólicos, **no** Company.id reales ni una validación de identidad DEV.

| Componente real | Categoría | Evidencia y tratamiento |
|---|---|---|
| `prisma/schema.prisma` | SAFE ONLY AS PURE REFERENCE | `Contact`, `Article`, `Surgery` y FKs informan el contrato; no importar Prisma Client ni modificar schema. |
| `validators/contact.ts`, `validators/article.ts` | SAFE ONLY AS PURE FUNCTION | Sus esquemas/normalizadores son puros, pero importarlos desde Python es imposible y traerlos vía Node añade dependencias de la app; reexpresar **solo** las reglas necesarias en adaptadores Python verificados contra su contrato, sin asumir VAT/SKU. |
| `validators/surgery.validator.ts` | SAFE ONLY AS PURE FUNCTION | Catálogo de estados consultable; `validateCreateSurgeryInput` restringe alta inicial a `pending` (`:278–303`), por lo que no se ejecuta. |
| `src/lib/api/surgery-adapter.ts` | SAFE ONLY AS PURE FUNCTION | Mapeo para UI, no lector DBF; no reutilizar conversión de fechas `Date` para un día civil. |
| `contact.service.ts:404–459` | DO NOT CALL | `prisma.$transaction`, `contact.create`, link, numeración `C-####`, grupos/dirección; el endpoint `contacts/route.ts:35–80` además audita después de crear, fuera de esa transacción. `resolveCompanyContactReference` puede autocrear por snapshot. |
| `article.service.ts:62–143` y `articles/route.ts` | DO NOT CALL | Consulta DB y crea Article, identificadores, elegibilidad, política de trazabilidad y AuditEvent; SKU aleatorio si falta. |
| `surgery.service.ts:732–820`, `surgeries/route.ts:147–216` | DO NOT CALL | Control de acceso, creación transaccional, numeración CX, AuditEvent; API resuelve/puede autocrear contactos. No transicionar estados para simular historia; otras mutaciones notifican. |
| `src/lib/prisma.ts`, Auth/Supabase, helpers de Stock/Invoice/Remito | DO NOT CALL | Importación puede inicializar cliente o causar efectos; fuera del grafo de imports de la CLI. Ningún query/HTTP/TS runtime. |
| `scripts/legacy-openai-audit/profile.py`, `core_closure.py` | NEEDS NEW PURE ADAPTER | El primero tiene funciones lectoras pero también profiler global; el segundo ejecuta lecturas al importarse, incluye STOCK/STOCK1 y escribe informe. **No importarlos** en el comando. Lector DBF acotado, con hash/preflight/records y normalizadores propios. |

Límites verificables: CLI usa solo stdlib Python; ningún import `src/`, Prisma, Supabase, `pg`, `requests` ni socket; abre fuente únicamente `rb`; salida exclusivamente bajo `.tmp/consultar-plus-openai-audit/` y rechaza rutas anidadas en el backup; hash de tablas esperadas validado **antes de decodificar registros**, hash nuevamente al terminar; filas deleted solo se cuentan, nunca se seleccionan. El backup no está garantizado como filesystem ACL read-only: la garantía verificable de este proceso es **acceso de lectura exclusivamente**, no protección del directorio contra otros procesos. Por eso el resultado no atribuirá erróneamente read-only al sistema operativo.
