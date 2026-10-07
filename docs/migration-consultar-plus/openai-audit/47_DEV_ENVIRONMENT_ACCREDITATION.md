# Gate 2A — acreditación del entorno DEV (2026-10-01)

**Resultado: BLOCKED.** Se inspeccionaron únicamente configuración y documentación local, sin leer valores de secretos, sin abrir conexión, sin consultas SQL y sin ejecutar el SQL propuesto en `46_DEV_READ_ONLY_ROLE_PLAN.md`. No se implementó `DevReadOnlyResolver`. Gate 1B `PASS WITH FINDINGS` (`44`) permite **preparar** Gate 2, no autoriza conectarse a una DB no acreditada.

## Evidencia local clasificada

| Requisito | Evidencia local comprobada | Nivel | Resultado |
|---|---|---|---|
| A. Proyecto/base DEV descartable inequívoca | `knowledge/architecture/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md` registra proveedor Supabase y menciona históricamente `ossum-cor-dev`. `src/lib/prisma.ts:15–30` obtiene `DATABASE_URL` y construye `pg.Pool`/Prisma Client al importarse. `prisma.config.ts:1–12` importa dotenv y usa `DIRECT_URL` para CLI/migraciones. Se comprobó **solo la existencia**, no el contenido, de `.env`, `.env.local` y `.env.example`: `CONFIGURATION_PRESENT`. No hay `supabase/config.toml` en este worktree: `CONFIGURATION_MISSING`. Ningún project ref/host/base actual fue acreditado para esta sesión. | **PROBABLE** como antecedente; **UNKNOWN** para conexión actual | A **NO DEMOSTRADO** |
| B. Rol dedicado SELECT-only efectivo | Ningún rol del repo, `DATABASE_URL` o `DIRECT_URL` acredita privilegios efectivos. No se leyó credencial ni se hizo introspección DB. La existencia fuera del repo no puede descartarse. El plan de rol 46 es documental, **no evidencia de implementación**. | **UNKNOWN** | B **NO DEMOSTRADO** |
| C. PRINC → Company + Organization | El mapa privado `legacy-only:PRINC` es alias local, no `Company.id`. Ningún SELECT autorizado verificó `Company.organizationId`, identidad empresarial o separación de TEST. No elegir primera Company ni deducir IDs del seed. | **UNKNOWN** | C **NO DEMOSTRADO** |
| D. Producción excluida | Un nombre DEV, una variable presente o el `NODE_ENV` de la app no prueban el destino de una connection string. No hay contraste aprobado y actual de proveedor/proyecto/host/database y rol. No se accedió a producción ni puede declararse descartada con la evidencia disponible. | **UNKNOWN** | D **NO DEMOSTRADO** |

La aprobación histórica de una DB DEV descartable para otro paquete (por ejemplo Article) no confirma que **la conexión propuesta para Gate 2** sea esa misma DB ni que tenga rol SELECT-only. Hay cambios concurrentes ajenos en `prisma/schema.prisma` en el worktree; el schema de Git no certifica por sí solo el despliegue real de DEV. No leer secretos para intentar adivinar identidad.

## Acciones exigidas ANTES de cualquier conexión

1. Franco/DBA acredita por canal seguro el destino **actual** (proveedor, proyecto/ref, host, database y entorno), confirma formalmente que es DEV descartable y no producción, **sin pegar credenciales en documentos o conversación**.
2. DBA prepara rol dedicado según 46 en esa única DB DEV y entrega evidencia privada de permisos **efectivos**: CONNECT, USAGE y SELECT solamente en columnas allowlist; sin ownership/membresías peligrosas, BYPASSRLS, DML/DDL, secuencias actualizables ni EXECUTE peligroso heredado de PUBLIC. Resolver TEMPORARY de PUBLIC si está disponible. Una promesa de SELECT en el adapter, `BEGIN READ ONLY` o `DATABASE_URL` común **no bastan**.
3. Franco/DBA acredita por canal externo PRINC con `Company.id` y `Organization.id` verificables y distintivos de TEST, usando exclusivamente el entorno acreditado. **Nuestro proceso no se conecta ni siquiera para descubrir esos IDs** antes de que C esté CONFIRMED. Después de superar A+B+C+D, un SELECT read-only podrá contrastarlos, nunca seleccionar automáticamente la primera Company.
4. Solo cuando A+B+C+D tengan evidencia **CONFIRMED**, un adapter separado podrá iniciar `BEGIN READ ONLY`, consultar metadata mínima (`current_user`, `current_database()`, `current_schema()`, `transaction_read_only`, privilegios y tenant esperado) y abortar sin leer datos si cualquier punto diverge. No consultar datos para *descubrir* retroactivamente si el entorno era seguro.

## Adapter futuro: contrato, NO implementación

`DevReadOnlyResolver`: `verify_environment()`, `resolve_company()`, `resolve_organization()`, `match_contacts()`, `match_articles()`, `find_potential_surgery_duplicates()`. Conexión PostgreSQL dedicada y aislada de `src/lib/prisma.ts`, Prisma services, Supabase `service_role`, APIs productivas y `DIRECT_URL` de migraciones. Credencial DB-enforced SELECT-only + `BEGIN READ ONLY`; allowlist **solo** Company, Organization, Contact, ContactCompanyLink, article, article_identifier, stock_article_eligibility y Surgery, con proyección de columnas indicada en 46. `ContactGroupMembership` fuera hasta justificar necesidad. Nunca SELECT de Invoice, Payment, FiscalDocument, Remito, Consumo, Devolucion, StockMovement, Auth, tokens ni sessions.

Contact: futuro ledger exacto si existe; si no, documento **validado** (CUIT con dígito verificador/colisiones y DNI con formato/placeholder), tipo persona/empresa, link de la Company PRINC y nombre solo como evidencia secundaria. Sin matching por email/nombre/teléfono solo; reportar rolesExisting/rolesMissing/linkStatus sin mutar. Article: organización y SKU/identificador confiable + fabricante/proveedor cuando aplique, descripción secundaria; `ARTCOD ≠ SKU`. Surgery: paciente, fecha civil, médico, institución, pagador, clasificación y empresa solo para **detectar posibles duplicados**, nunca identidad automática por paciente+fecha sin ledger. Categorías EXACT_REUSE/POSSIBLE_REUSE/AMBIGUOUS/NO_MATCH/CONFLICT/UNMATCHABLE; NO_MATCH es como máximo POTENTIAL_CREATE futuro, no alta autorizada. Comparación de PII en memoria y outputs privados seudonimizados en `.tmp/consultar-plus-openai-audit/dev-match-*`; docs únicamente agregados, sin valores de PII ni connection strings.

## Resultado operacional

- **Gate 2A: BLOCKED.** Ni conexión/preflight SQL ni queries de Company/Contact/Article/Surgery se ejecutaron. Ninguna query fuera de allowlist; **0 escrituras**. Identidad y permisos efectivos permanecen sin verificar, no afirmamos que el rol no exista.
- **Gate 2B: NO EVALUABLE.** Fixture/857 Contact codes/Article/Surgery: EXACT_REUSE, POSSIBLE_REUSE, AMBIGUOUS, NO_MATCH, CONFLICT, POTENTIAL_CREATE y colisiones cross-tenant = **NO MEDIDOS**. No crear `48`, `49` ni `50` como falsos resultados. FPT sigue diferido.
- **Gate 3: fuera de alcance** incluso si Gate 2A/2B pasasen. Sin modelos Prisma, writer, Auth/roles productivos, emisión fiscal ni stock.

**Siguiente paso técnico exacto:** obtener por canal seguro las cuatro acreditaciones A+B+C+D; DBA revisa el SQL **propuesto, no ejecutado** en 46 y verifica incompatibilidades por `PUBLIC`/funciones/TEMP. Reabrir Gate 2A con esa evidencia; recién con READY podrá implementarse el adapter SELECT-only y consultarse primero únicamente el fixture. No degradar este bloqueo.
