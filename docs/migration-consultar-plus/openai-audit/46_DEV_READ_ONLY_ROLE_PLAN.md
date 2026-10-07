# Gate 2 — plan de rol PostgreSQL de solo lectura (PROPUESTA, NO EJECUTADA)

**Decisión:** preparar una credencial PostgreSQL dedicada para una base DEV acreditada; **no usar** `DATABASE_URL`, `DIRECT_URL`, usuario `postgres`, `service_role` de Supabase ni permisos de aplicación. No se creó rol, no se ejecutó SQL, no se consultó DB y no se leyó ningún secreto. Este diseño **no acredita** que ya exista tal rol. SQL para revisión por Franco/DBA, nunca para ejecutar automáticamente. La identidad `__DEV_DB_IDENT__` debe sustituirse por un identificador PostgreSQL confirmado por el DBA, debidamente citado; no interpolar nombres no verificados.

## Alcance de lectura propuesto

La allowlist se deriva del `prisma/schema.prisma` **actual del repo**, pero debe contrastarse con el schema realmente desplegado en DEV antes de usarla. Tablas físicas: `public."Organization"`, `public."Company"`, `public."Contact"`, `public."ContactCompanyLink"`, `public."article"`, `public."article_identifier"`, `public."stock_article_eligibility"`, `public."Surgery"`. `ContactGroupMembership` se excluye hasta justificarla con una ambigüedad concreta. **Nunca** Invoice, Payment, FiscalDocument, Remito, Consumo, Devolucion, StockMovement, Auth, sesiones ni secretos. Usar concesiones **por columna**, más estrechas que `GRANT SELECT ON ALL TABLES`:

```sql
-- PROPUESTA DBA: ejecutar ÚNICAMENTE contra la DB DEV acreditada.
-- Contraseña NULL inicialmente; aprovisionarla fuera del repo por canal seguro.
CREATE ROLE ossum_gate2_reader LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
    NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 PASSWORD NULL;
GRANT CONNECT ON DATABASE __DEV_DB_IDENT__ TO ossum_gate2_reader;
GRANT USAGE ON SCHEMA public TO ossum_gate2_reader;

GRANT SELECT ("id", "name", "slug", "taxId", "isActive")
    ON TABLE public."Organization" TO ossum_gate2_reader;
GRANT SELECT ("id", "organizationId", "name", "taxId", "isActive")
    ON TABLE public."Company" TO ossum_gate2_reader;
GRANT SELECT ("id", "firstName", "lastName", "legalName", "isCompany",
              "documentType", "documentNumber", "isActive")
    ON TABLE public."Contact" TO ossum_gate2_reader;
GRANT SELECT ("contactId", "companyId", "code", "role", "roles", "isPayer", "isActive")
    ON TABLE public."ContactCompanyLink" TO ossum_gate2_reader;
GRANT SELECT ("id", "organizationId", "sku", "description", "manufacturer",
              "articleType", "isActive")
    ON TABLE public."article" TO ossum_gate2_reader;
GRANT SELECT ("organizationId", "articleId", "type", "normalizedValue",
              "scopeKey", "manufacturerContext", "supplierId", "companyId", "isActive")
    ON TABLE public."article_identifier" TO ossum_gate2_reader;
GRANT SELECT ("organizationId", "companyId", "articleId")
    ON TABLE public."stock_article_eligibility" TO ossum_gate2_reader;
GRANT SELECT ("id", "companyId", "patientId", "doctorId", "institutionId",
              "payerContactId", "surgeryDate", "classification", "cxStatus")
    ON TABLE public."Surgery" TO ossum_gate2_reader;
```

No `SELECT *`, no secuencias, no grants sobre futuras tablas, no membresías, no ownership ni `WITH GRANT OPTION`. Si una columna física difiere de Prisma, **detenerse y revisar**; no ampliar el GRANT automáticamente. El permiso `USAGE` en `public` permite resolver objetos del schema y **requiere auditoría de funciones accesibles** antes de declarar SELECT-only efectivo.

## Problema de privilegios indirectos: NO afirmar SELECT-only solo por CREATE ROLE

PostgreSQL concede por defecto a `PUBLIC` **CONNECT y TEMPORARY** en la DB y **EXECUTE** sobre funciones/procedimientos; además puede haber grants históricos, ownership o membership. `REVOKE ... FROM ossum_gate2_reader` por sí solo **no cancela** un privilegio concedido a `PUBLIC`. Un rol `NOINHERIT` tampoco impide `SET ROLE` si después recibe una membresía con opción SET. Por tanto, el DBA debe comprobar permisos **efectivos**, no solo la declaración del rol. Si `TEMPORARY` o EXECUTE de alguna función peligrosa siguen disponibles, Gate 2A permanece **BLOCKED** hasta una mitigación aprobada. No proponer revocación global automática de `PUBLIC`: afectaría otros usuarios y es un cambio de seguridad que requiere evaluación y aprobación separadas. Alternativas para el DBA: revocar TEMPORARY de `PUBLIC` en la **DB DEV aislada** tras análisis de impacto y reotorgar a roles operativos que lo necesiten, y restringir EXECUTE de funciones peligrosas con la misma cautela; o proveer un entorno de lectura físicamente aislado con controles equivalentes. Ninguna de esas acciones se ejecuta aquí.

## Verificación conceptual antes de consultar datos (SOLO DBA / preflight futuro)

Primero se acreditan **por canal externo los cuatro requisitos A+B+C+D**, incluidos Company.id y Organization.id de PRINC; solo entonces conectar con la credencial dedicada, iniciar `BEGIN READ ONLY`, confirmar `current_user`, `current_database()`, `current_schema()`, `SHOW transaction_read_only`, versión servidor e identidad de host/proyecto comparados con la ficha aprobada. Un fallo implica `ROLLBACK` y desconexión sin SELECT sobre datos de negocio. `BEGIN READ ONLY` añade defensa, **no sustituye** la denegación DB. El DBA puede revisar esta SQL de metadata sin imprimir sus resultados sensibles:

```sql
-- Comprobar atributos del propio rol (metadata, no datos de negocio).
SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
       rolreplication, rolbypassrls
FROM pg_catalog.pg_roles WHERE rolname = current_user;

-- Rechazar membresías: NOINHERIT no descarta SET ROLE otorgado posteriormente.
SELECT count(*) AS membership_count
FROM pg_catalog.pg_auth_members
WHERE member = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user);

-- La DB debe conceder CONNECT, pero NO CREATE/TEMPORARY efectivos.
SELECT has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect,
       has_database_privilege(current_user, current_database(), 'CREATE') AS can_create,
       has_database_privilege(current_user, current_database(), 'TEMPORARY') AS can_temp;

-- El schema public debe conceder USAGE, pero NO CREATE; revisar también otros schemas.
SELECT n.nspname, has_schema_privilege(current_user, n.oid, 'USAGE') AS can_use,
       has_schema_privilege(current_user, n.oid, 'CREATE') AS can_create
FROM pg_catalog.pg_namespace n
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%';

-- Para TODAS las relaciones de schemas de aplicación: cualquier DML/DDL indirecto => BLOCKED.
SELECT n.nspname, c.relname,
       has_table_privilege(current_user, c.oid, 'INSERT') AS can_insert,
       has_table_privilege(current_user, c.oid, 'UPDATE') AS can_update,
       has_table_privilege(current_user, c.oid, 'DELETE') AS can_delete,
       has_table_privilege(current_user, c.oid, 'TRUNCATE') AS can_truncate,
       has_table_privilege(current_user, c.oid, 'REFERENCES') AS can_reference,
       has_table_privilege(current_user, c.oid, 'TRIGGER') AS can_trigger,
       (c.relowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user)) AS is_owner
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f');

-- Comprobar SELECT de cada columna autorizada mediante has_column_privilege(..., 'SELECT').
-- Incluir toda columna efectivamente legible: cualquier fila fuera de la allowlist => BLOCKED.
SELECT n.nspname, c.relname, a.attname
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND a.attnum > 0 AND NOT a.attisdropped
  AND has_column_privilege(current_user, c.oid, a.attnum, 'SELECT');

-- Uso/actualización de secuencias y propiedad de objetos de aplicación.
SELECT n.nspname, c.relname,
       has_sequence_privilege(current_user, c.oid, 'USAGE') AS can_use,
       has_sequence_privilege(current_user, c.oid, 'UPDATE') AS can_update,
       (c.relowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user)) AS is_owner
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'S' AND n.nspname NOT IN ('pg_catalog', 'information_schema');

-- Revisar EXECUTE efectivo en funciones de aplicación, incluso heredado de PUBLIC.
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS signature,
       has_function_privilege(current_user, p.oid, 'EXECUTE') AS can_execute,
       (p.proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user)) AS is_owner
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%';

-- DBA también comprueba pg_database.datdba / pg_namespace.nspowner y
-- que no existan grants indirectos, funciones SECURITY DEFINER peligrosas,
-- ni permisos sobre relaciones fuera de esta allowlist.
```

Los chequeos de ownership/funciones exigen revisión del DBA con el inventario real de extensiones y ACL (incluido `PUBLIC`); estas queries no sustituyen su juicio. No ejecutar `INSERT/UPDATE/DELETE` siquiera como prueba. Revisar si RLS filtra resultados; un `NO_MATCH` por permisos insuficientes no es evidencia de ausencia en DEV. Toda comprobación o dump de ACL se mantiene privada, sin usuarios, hosts ni credenciales completos en docs/logs.

## Revocación propuesta si se retira Gate 2 (SOLO DBA)

```sql
-- PROPUESTA, no ejecutada. No afecta grants a otros roles.
ALTER ROLE ossum_gate2_reader NOLOGIN PASSWORD NULL;
-- Las concesiones SELECT por columna requieren revocación por columna.
REVOKE SELECT ("id", "name", "slug", "taxId", "isActive")
    ON TABLE public."Organization" FROM ossum_gate2_reader;
REVOKE SELECT ("id", "organizationId", "name", "taxId", "isActive")
    ON TABLE public."Company" FROM ossum_gate2_reader;
REVOKE SELECT ("id", "firstName", "lastName", "legalName", "isCompany",
               "documentType", "documentNumber", "isActive")
    ON TABLE public."Contact" FROM ossum_gate2_reader;
REVOKE SELECT ("contactId", "companyId", "code", "role", "roles", "isPayer", "isActive")
    ON TABLE public."ContactCompanyLink" FROM ossum_gate2_reader;
REVOKE SELECT ("id", "organizationId", "sku", "description", "manufacturer",
               "articleType", "isActive")
    ON TABLE public."article" FROM ossum_gate2_reader;
REVOKE SELECT ("organizationId", "articleId", "type", "normalizedValue",
               "scopeKey", "manufacturerContext", "supplierId", "companyId", "isActive")
    ON TABLE public."article_identifier" FROM ossum_gate2_reader;
REVOKE SELECT ("organizationId", "companyId", "articleId")
    ON TABLE public."stock_article_eligibility" FROM ossum_gate2_reader;
REVOKE SELECT ("id", "companyId", "patientId", "doctorId", "institutionId",
               "payerContactId", "surgeryDate", "classification", "cxStatus")
    ON TABLE public."Surgery" FROM ossum_gate2_reader;
REVOKE ALL PRIVILEGES ON TABLE public."Organization", public."Company",
    public."Contact", public."ContactCompanyLink", public."article",
    public."article_identifier", public."stock_article_eligibility",
    public."Surgery" FROM ossum_gate2_reader;
REVOKE USAGE ON SCHEMA public FROM ossum_gate2_reader;
REVOKE CONNECT ON DATABASE __DEV_DB_IDENT__ FROM ossum_gate2_reader;
-- DBA revisa dependencias/ACL residuales antes de un DROP ROLE separado.
```

`REVOKE CONNECT` directo no elimina el CONNECT concedido a `PUBLIC`; `NOLOGIN PASSWORD NULL` deshabilita la credencial mientras el DBA revisa dependencias antes de un eventual `DROP ROLE`. Referencias oficiales consultadas: [PostgreSQL 18 — CREATE ROLE](https://www.postgresql.org/docs/18/sql-createrole.html), [Privileges/PUBLIC](https://www.postgresql.org/docs/18/ddl-priv.html), [GRANT por columna](https://www.postgresql.org/docs/18/sql-grant.html), [Role membership](https://www.postgresql.org/docs/18/role-membership.html), [Privilege inquiry](https://www.postgresql.org/docs/18/functions-info.html). La versión real del servidor deberá comprobarse antes de ejecutar SQL dependiente de versión.
