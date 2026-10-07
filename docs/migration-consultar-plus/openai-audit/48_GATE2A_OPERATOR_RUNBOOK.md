# Gate 2A — runbook humano para acceso PostgreSQL read-only en Supabase DEV

**Estado inicial: BLOCKED. Este documento NO acredita DEV ni autoriza conectarse.** Lo ejecuta exclusivamente Franco/DBA, después de verificar manualmente el proyecto DEV descartable; ningún bloque SQL fue ejecutado al escribir este runbook. El rol de lectura es para *matching*, no para importar. No modificar RLS, Auth, Prisma, datos ni producción. Basado en `46_DEV_READ_ONLY_ROLE_PLAN.md` y en el Gate bloqueado de `47_DEV_ENVIRONMENT_ACCREDITATION.md`; incorpora el hardening que faltaba sin reescribir esos documentos.

> **PROPUESTA — EJECUCIÓN HUMANA EXCLUSIVA EN DEV ACREDITADO.** Los ocho bloques SQL son plantillas para revisión, sustitución controlada de `__DEV_DB_IDENT__` (identificador SQL citado por DBA) y ejecución manual en orden. Nunca pegar contraseñas, URLs completas, tokens, project keys ni outputs con PII en Git, chats, tickets o Engram. No ejecutar el siguiente bloque si el anterior termina BLOCKED/UNKNOWN. El SQL de creación/revocación requiere autoridad de DBA **solo en DEV**; el preflight de lectura debe ejecutarse después con `ossum_gate2_reader`, nunca confiar en una sesión `postgres` para demostrar sus permisos.

## Paso A — acreditación manual **antes del primer SQL**

1. En la consola oficial de Supabase, elegir expresamente el proyecto OSSUM **DEV descartable**. Contrastar con un registro aprobado por Franco/DBA (no basta nombre con “dev”, `.env` presente, `DATABASE_URL`, `DIRECT_URL` ni una aprobación para otra tarea). Confirmar que la DB a la que apunta la herramienta SQL es la de ese mismo proyecto, no producción/staging.
2. Guardar en registro privado del operador: proveedor, nombre de proyecto, **project ref**, región, host **parcial** (identificador no resoluble como cadena de conexión), nombre de database, entorno DEV, evidencia y fecha de la comparación con producción; registrar aparte identificador inequívoco del proyecto de producción para demostrar que **no coincide**. No publicar refs completos, hosts completos ni credenciales.
3. Si cualquier identidad/contraste es UNKNOWN o ambiguo: **STOP; no ejecutar ni siquiera SELECT**. La autorización previa de una DB DEV para otra tarea no acredita esta conexión. DBA confirma también versión PostgreSQL y schema desplegado real; el schema del repo puede diferir.

## BLOCK 1 — inspección de schema, solo metadata (Paso B)

**PROPUESTA — EJECUCIÓN HUMANA EXCLUSIVA EN DEV ACREDITADO.** DBA ejecuta **SELECT de metadata** en el proyecto acreditado. Este bloque no selecciona filas de negocio. Cada fila debe ser `OK` y existir exactamente una relación física con el nombre y schema previstos. `table_name`/`column_name` son nombres de columna, no datos clínicos. Cualquier falta, view inesperada o tipo incompatible con el contrato Prisma: **STOP**; no editar ni asumir equivalencia por nombre parecido.

```sql
WITH expected(table_name, columns_expected) AS (
  VALUES
  ('Organization', ARRAY['id','name','slug','taxId','isActive']::text[]),
  ('Company', ARRAY['id','organizationId','name','taxId','isActive']::text[]),
  ('Contact', ARRAY['id','firstName','lastName','legalName','isCompany',
                    'documentType','documentNumber','isActive']::text[]),
  ('ContactCompanyLink', ARRAY['contactId','companyId','code','role','roles',
                               'isPayer','isActive']::text[]),
  ('article', ARRAY['id','organizationId','sku','description','manufacturer',
                    'articleType','isActive']::text[]),
  ('article_identifier', ARRAY['organizationId','articleId','type','normalizedValue',
                               'scopeKey','manufacturerContext','supplierId',
                               'companyId','isActive']::text[]),
  ('stock_article_eligibility', ARRAY['organizationId','companyId','articleId']::text[]),
  ('Surgery', ARRAY['id','companyId','patientId','doctorId','institutionId',
                     'payerContactId','surgeryDate','classification','cxStatus']::text[])
), required AS (
  SELECT e.table_name, pg_catalog.unnest(e.columns_expected) AS column_name FROM expected e
)
SELECT r.table_name, r.column_name,
  CASE WHEN c.oid IS NULL THEN 'TABLE_MISSING_OR_NOT_BASE_TABLE'
       WHEN a.attnum IS NULL THEN 'COLUMN_MISSING'
       ELSE 'OK' END AS result,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS observed_type
FROM required r
LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
  AND c.relname = r.table_name AND c.relkind IN ('r','p')
LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
  AND a.attname = r.column_name AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY r.table_name, r.column_name;
```

Verificar tipos de IDs, fechas y `roles` contra las ocho definiciones actuales de `prisma/schema.prisma`; no ejecutar Prisma ni asumir que el archivo refleja la DB. Guardar solo resultado `OK/MISSING` y huella de revisión en el reporte público; detalle técnico únicamente en registro privado.

## BLOCK 2 — creación del rol (Paso C)

**PROPUESTA — EJECUCIÓN HUMANA EXCLUSIVA EN DEV ACREDITADO.** Solo después de los pasos A+B confirmados. DBA comprueba con la primera query que `ossum_gate2_reader` no exista previamente; si devuelve `true`, **STOP**, auditar identidad/ownership/memberships antes de cualquier ALTER. Sustituir `__DEV_DB_IDENT__` de forma segura por el nombre exacto de la base acreditada, como identificador SQL, no por una URL. `PASSWORD NULL` inicial: el DBA configura luego un secreto temporal **fuera del repo y de este documento**, sin publicarlo. No conceder memberships, ownership, `pg_read_all_data`, service_role ni BYPASSRLS.

```sql
SELECT pg_catalog.count(*) > 0 AS role_already_exists
FROM pg_catalog.pg_roles WHERE rolname='ossum_gate2_reader';
-- Solo si role_already_exists=false y BLOCK 1 pasó:
CREATE ROLE ossum_gate2_reader LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 PASSWORD NULL;
```

El atributo NOINHERIT por sí solo no elimina permisos de `PUBLIC` ni impide asumir otra identidad si alguien otorgara membresía con `SET`. La existencia de esa membresía hace fallar Gate 2A.

## BLOCK 3 — grants mínimos por columna (Paso D)

**PROPUESTA — EJECUCIÓN HUMANA EXCLUSIVA EN DEV ACREDITADO.** Tras BLOCK 2 y con el schema de BLOCK 1 verificado, DBA otorga solo CONNECT, USAGE y SELECT por columna. Tablas **fully-qualified**; NO `GRANT ALL`, `ALL TABLES`, `SELECT *`, secuencias, función, tabla futura, `WITH GRANT OPTION` ni otras tablas. `ContactGroupMembership` queda fuera hasta demostrar necesidad real.

```sql
GRANT CONNECT ON DATABASE __DEV_DB_IDENT__ TO ossum_gate2_reader;
GRANT USAGE ON SCHEMA public TO ossum_gate2_reader;
GRANT SELECT ("id","name","slug","taxId","isActive")
  ON TABLE public."Organization" TO ossum_gate2_reader;
GRANT SELECT ("id","organizationId","name","taxId","isActive")
  ON TABLE public."Company" TO ossum_gate2_reader;
GRANT SELECT ("id","firstName","lastName","legalName","isCompany",
              "documentType","documentNumber","isActive")
  ON TABLE public."Contact" TO ossum_gate2_reader;
GRANT SELECT ("contactId","companyId","code","role","roles","isPayer","isActive")
  ON TABLE public."ContactCompanyLink" TO ossum_gate2_reader;
GRANT SELECT ("id","organizationId","sku","description","manufacturer",
              "articleType","isActive")
  ON TABLE public."article" TO ossum_gate2_reader;
GRANT SELECT ("organizationId","articleId","type","normalizedValue","scopeKey",
              "manufacturerContext","supplierId","companyId","isActive")
  ON TABLE public."article_identifier" TO ossum_gate2_reader;
GRANT SELECT ("organizationId","companyId","articleId")
  ON TABLE public."stock_article_eligibility" TO ossum_gate2_reader;
GRANT SELECT ("id","companyId","patientId","doctorId","institutionId",
              "payerContactId","surgeryDate","classification","cxStatus")
  ON TABLE public."Surgery" TO ossum_gate2_reader;
```

## BLOCK 4 — hardening del rol (Paso C, continuación)

**PROPUESTA — EJECUCIÓN HUMANA EXCLUSIVA EN DEV ACREDITADO.** DBA aplica antes de emitir credenciales. El `search_path` **solo** contiene `pg_catalog`; toda tabla de negocio y catálogo de aplicación se referencia `public."Nombre"`. Configurar ambos defaults y no presentarlos como sustituto de permisos: un usuario puede cambiar defaults en su sesión. `pg_temp` puede tener precedencia implícita para relaciones si TEMPORARY sigue efectivo: todos los queries del adapter deben usar nombres fully-qualified y Gate 2A evalúa TEMP por separado.

```sql
ALTER ROLE ossum_gate2_reader SET default_transaction_read_only = on;
ALTER ROLE ossum_gate2_reader SET search_path = pg_catalog;
```

**STOP** si el usuario sigue pudiendo escribir, es owner, tiene membership/grants heredados o puede ejecutar funciones peligrosas por `PUBLIC`. PostgreSQL concede usualmente CONNECT/TEMPORARY en DB y EXECUTE en funciones a `PUBLIC`. Un `REVOKE` directo al rol NO neutraliza PUBLIC. Revocar `PUBLIC` globalmente altera a otros usuarios; requiere evaluación/GO de seguridad aparte en la DB DEV. No hacerlo como paso automático de este runbook. El DBA puede optar por aislar físicamente el entorno; en cualquier caso debe demostrar el control efectivo antes de READY.

## BLOCK 5 — verificación formal de privilegios (Paso E)

**PROPUESTA — EJECUCIÓN HUMANA EXCLUSIVA EN DEV ACREDITADO.** Antes de usar el rol sobre datos, DBA acredita externamente rol/proyecto/base. Luego inicia una **nueva sesión con `ossum_gate2_reader`**, ejecuta solo esta metadata bajo transacción read-only y cierra con ROLLBACK. `current_user` debe ser exactamente `ossum_gate2_reader`; `current_database()` debe coincidir con A y `transaction_read_only` debe ser `on`. El rol DBA/SQL Editor elevado NO sustituye esta verificación. Si no puede conectarse directamente con ese rol de forma segura: **BLOCKED**. Ningún DML para probar fallos.

```sql
BEGIN READ ONLY;
SELECT current_user AS role_in_use,
       pg_catalog.current_database() AS database_in_use,
       pg_catalog.current_schema() AS schema_in_use,
       pg_catalog.current_setting('server_version_num') AS server_version_num;
SHOW transaction_read_only;
SHOW default_transaction_read_only;
SHOW search_path;

SELECT r.rolcanlogin,r.rolinherit,r.rolsuper,r.rolcreatedb,r.rolcreaterole,
       r.rolreplication,r.rolbypassrls,r.rolconnlimit
FROM pg_catalog.pg_roles r WHERE r.rolname = current_user;
SELECT pg_catalog.count(*) AS memberships
FROM pg_catalog.pg_auth_members m
JOIN pg_catalog.pg_roles r ON r.oid = m.member
WHERE r.rolname = current_user;

SELECT pg_catalog.has_database_privilege(current_user, pg_catalog.current_database(), 'CONNECT') AS can_connect,
       pg_catalog.has_database_privilege(current_user, pg_catalog.current_database(), 'CREATE') AS can_create,
       pg_catalog.has_database_privilege(current_user, pg_catalog.current_database(), 'TEMPORARY') AS can_temp;
SELECT n.nspname,
       pg_catalog.has_schema_privilege(current_user,n.oid,'USAGE') AS can_use,
       pg_catalog.has_schema_privilege(current_user,n.oid,'CREATE') AS can_create,
       n.nspowner = r.oid AS is_owner
FROM pg_catalog.pg_namespace n CROSS JOIN pg_catalog.pg_roles r
WHERE r.rolname = current_user
  AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%';
SELECT d.datdba = r.oid AS owns_database
FROM pg_catalog.pg_database d CROSS JOIN pg_catalog.pg_roles r
WHERE d.datname = pg_catalog.current_database() AND r.rolname = current_user;

SELECT n.nspname,c.relname,c.relkind,
       pg_catalog.has_table_privilege(current_user,c.oid,'INSERT') AS can_insert,
       pg_catalog.has_table_privilege(current_user,c.oid,'UPDATE') AS can_update,
       pg_catalog.has_table_privilege(current_user,c.oid,'DELETE') AS can_delete,
       pg_catalog.has_table_privilege(current_user,c.oid,'TRUNCATE') AS can_truncate,
       pg_catalog.has_table_privilege(current_user,c.oid,'REFERENCES') AS can_reference,
       pg_catalog.has_table_privilege(current_user,c.oid,'TRIGGER') AS can_trigger,
       pg_catalog.has_table_privilege(current_user,c.oid,'MAINTAIN') AS can_maintain,
       c.relowner = r.oid AS is_owner
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN pg_catalog.pg_roles r
WHERE r.rolname=current_user
  AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
  AND c.relkind IN ('r','p','v','m','f');

-- Comparar TODAS las columnas efectivamente legibles con la lista exacta de BLOCK 3.
SELECT n.nspname,c.relname,a.attname
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
  AND c.relkind IN ('r','p','v','m','f')
  AND a.attnum>0 AND NOT a.attisdropped
  AND pg_catalog.has_column_privilege(current_user,c.oid,a.attnum,'SELECT')
ORDER BY n.nspname,c.relname,a.attname;

SELECT n.nspname,c.relname,
       pg_catalog.has_sequence_privilege(current_user,c.oid,'SELECT') AS can_select,
       pg_catalog.has_sequence_privilege(current_user,c.oid,'USAGE') AS can_use,
       pg_catalog.has_sequence_privilege(current_user,c.oid,'UPDATE') AS can_update,
       c.relowner=r.oid AS is_owner
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN pg_catalog.pg_roles r
WHERE r.rolname=current_user AND c.relkind='S'
  AND n.nspname NOT IN ('pg_catalog','information_schema');

-- No concluir que toda función ejecutable es segura; revisar prosecure/SECURITY DEFINER.
SELECT n.nspname,p.proname,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS signature,
       p.prosecdef AS security_definer,
       pg_catalog.has_function_privilege(current_user,p.oid,'EXECUTE') AS can_execute,
       p.proowner=r.oid AS is_owner
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
CROSS JOIN pg_catalog.pg_roles r
WHERE r.rolname=current_user
  AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%';

-- ACL originadas en PUBLIC (grantee=0), contrastar con has_* efectivo anterior.
SELECT 'DATABASE' AS scope,a.privilege_type
FROM pg_catalog.pg_database d
CROSS JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(d.datacl,pg_catalog.acldefault('d',d.datdba))) AS a
WHERE d.datname=pg_catalog.current_database() AND a.grantee=0;
SELECT 'SCHEMA' AS scope,n.nspname,a.privilege_type
FROM pg_catalog.pg_namespace n
CROSS JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) AS a
WHERE n.nspname='public' AND a.grantee=0;
SELECT n.nspname,c.relname,a.privilege_type
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) AS a
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
  AND c.relkind IN ('r','p','v','m','f') AND a.grantee=0;
SELECT n.nspname,p.proname,a.privilege_type
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) AS a
WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='EXECUTE';
ROLLBACK;
```

PASS solo si rol exacto, `transaction_read_only=on`, **también** `default_transaction_read_only=on` (BEGIN READ ONLY por sí solo no prueba el default), search_path controlado, **sin** DML/CREATE/MAINTAIN/owner/membership/`BYPASSRLS` ni secuencias con SELECT/USAGE/UPDATE, SELECT efectivo **exactamente** en columnas permitidas y ninguna función peligrosa ejecutable (incluidas SECURITY DEFINER/PUBLIC). `can_temp=true` u otro schema de aplicación con USAGE no justificado requiere análisis/mitigación antes de READY. El DBA revisa también roles predefinidos, ACL en otros schemas y permisos indirectos no listados; no basar PASS en la ausencia de filas de una query que haya fallado. Si la versión real no reconoce alguno de estos privilegios en `has_table_privilege`, detener la verificación y adaptar el chequeo con DBA; no ignorar errores de sintaxis.

## BLOCK 6 — diagnóstico RLS sobre la allowlist (después del Paso E)

**PROPUESTA — EJECUCIÓN HUMANA EXCLUSIVA EN DEV ACREDITADO.** Solo con BLOCK 5 aprobado. Consultar metadata RLS de **las ocho tablas exactas** y sus policies. Las expresiones `USING`/`WITH CHECK` pueden contener literales o lógica sensible: inspección privada del DBA, nunca copiar completas en docs/chat. No usar `BYPASSRLS`, no cambiar policies, no ejecutar `SET row_security=off` como solución. DBA revisa policies `ALL`/`SELECT` aplicables al rol o PUBLIC para diagnosticar el bloqueo. Como BLOCK 7 aún no confirmó PRINC, **este runbook no pretende demostrar cobertura leyendo datos**: ante RLS habilitado en cualquiera de las ocho tablas, registrar `RLS_BLOCKS_GATE2` y detenerse para una evaluación humana separada de la policy. Nunca asumir que una policy que existe garantiza que se ven todas las coincidencias.

```sql
BEGIN READ ONLY;
WITH allowed(relname) AS (VALUES
  ('Organization'),('Company'),('Contact'),('ContactCompanyLink'),
  ('article'),('article_identifier'),('stock_article_eligibility'),('Surgery'))
SELECT a.relname,c.relrowsecurity,c.relforcerowsecurity,
       c.relowner = (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname=current_user)
         AS reader_is_owner
FROM allowed a
LEFT JOIN pg_catalog.pg_namespace n ON n.nspname='public'
LEFT JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=a.relname
ORDER BY a.relname;

WITH allowed(relname) AS (VALUES
  ('Organization'),('Company'),('Contact'),('ContactCompanyLink'),
  ('article'),('article_identifier'),('stock_article_eligibility'),('Surgery'))
SELECT a.relname,p.policyname,p.permissive,p.roles,p.cmd,
       p.qual AS using_expression,p.with_check AS with_check_expression
FROM allowed a LEFT JOIN pg_catalog.pg_policies p
  ON p.schemaname='public' AND p.tablename=a.relname
ORDER BY a.relname,p.policyname;
SHOW row_security;
ROLLBACK;
```

**RLS_OK_FOR_GATE2**, bajo esta versión conservadora del runbook, exige las ocho tablas presentes, `relrowsecurity=false` y `relforcerowsecurity=false` en las ocho, `row_security=on` y lector sin ownership/BYPASSRLS. Incluso entonces filtrar `companyId`/`organizationId` en cada SELECT y confirmar TEST separado: RLS deshabilitado no implementa aislamiento por sí mismo. **RLS_BLOCKS_GATE2** ante cualquiera de esos flags habilitados, políticas opacas, visibilidad incierta o scope cross-tenant no demostrable. No modificar la policy ni otorgar BYPASSRLS para hacer pasar Gate 2; un caso RLS habilitado requiere nueva evaluación humana/criterio aprobado antes de otro runbook. `row_security=off` tampoco arregla matching.

## BLOCK 7 — identificación PRINC/TEST (solo tras privilegios y RLS)

**PROPUESTA — EJECUCIÓN HUMANA EXCLUSIVA EN DEV ACREDITADO.** Solo después de BLOCK 5 + `RLS_OK_FOR_GATE2`, con `ossum_gate2_reader`, `BEGIN READ ONLY`. Estos son los **primeros SELECT sobre datos**, limitados a Company y Organization. `legacy-only:PRINC` **no** es Company.id. No elegir la primera fila. El DBA/Franco coteja el nombre empresarial y la organización con documentación independiente y confirma que TEST es diferente o no está mapeado a PRINC. Primero mostrar candidatos con IDs parciales; cero Contact/pacientes.

```sql
BEGIN READ ONLY;
SELECT pg_catalog.left(c."id",4) || '…' || pg_catalog.right(c."id",4) AS company_hint,
       c."name" AS company_name,c."isActive" AS company_active,
       pg_catalog.left(o."id",4) || '…' || pg_catalog.right(o."id",4) AS organization_hint,
       o."name" AS organization_name,o."slug" AS organization_slug,o."isActive" AS organization_active
FROM public."Company" c
JOIN public."Organization" o ON o."id"=c."organizationId"
ORDER BY o."name",c."name";
ROLLBACK;
```

Si se encuentra un candidato **único** corroborado fuera de la DB, el DBA obtiene los IDs completos **solo en su registro privado** mediante SELECT parametrizado del cliente sobre `public."Company"` JOIN `public."Organization"` con predicados por nombre/slug verificados y, si hay homónimos, `taxId` corporativo en privado (no mostrar CUIT en evidencia pública). La query debe exigir **exactamente una fila**, sin `LIMIT 1` ni heurística de “primer match”; de otro modo REVIEW/BLOCKED. Conservar mapping exacto PRIVADO `PRINC → Company.id → Organization.id` y mapping explícito TEST `≠ PRINC` o `TEST no mapeado`. Compartir solo IDs parciales/seudónimos y confirmación humana, nunca datos personales. Una comprobación posterior read-only podrá contrastar mapping ya confirmado, pero no inventarlo automáticamente.

Consulta privada propuesta **únicamente en un cliente que admita bind parameters** (`$1` nombre empresarial confirmado; `$2` slug de la organización corroborada). Ejecutar **tres comandos en la misma sesión**: `BEGIN READ ONLY`, luego el SELECT de abajo **como un único statement preparado con dos valores vinculados**, finalmente `ROLLBACK`; no enviar los tres comandos juntos como una única consulta parametrizada (PostgreSQL no la aceptaría). No pegar nombres libres del DBF ni construir SQL concatenando strings; si el editor no soporta parámetros, usar cliente seguro aprobado por DBA o STOP. Si devuelve 0 o más de 1 fila, no elegir automáticamente; corroborar identidad por canal externo. Los IDs completos nunca salen del registro privado del operador.

```sql
WITH matches AS (
  SELECT c."id" AS company_id,o."id" AS organization_id,
         c."name" AS company_name,o."name" AS organization_name
  FROM public."Company" c
  JOIN public."Organization" o ON o."id"=c."organizationId"
  WHERE c."name"=$1 AND o."slug"=$2 AND c."isActive"=true AND o."isActive"=true
)
SELECT m.company_id,m.organization_id,m.company_name,m.organization_name,
       (SELECT pg_catalog.count(*) FROM matches) AS candidate_count
FROM matches m;
```

Solo después de confirmación humana, repetir el mismo control para TEST si corresponde (con parámetros distintos) y demostrar `TEST ≠ PRINC`; si TEST no existe en OSSUM, documentar exclusión explícita, nunca asignarlo a PRINC.

## BLOCK 8 — deshabilitar y revocar (rollback humano)

**PROPUESTA — EJECUCIÓN HUMANA EXCLUSIVA EN DEV ACREDITADO.** Si cualquier bloque falla **después** de crear el rol, retirar acceso en la misma DB DEV. Deshabilitar LOGIN y contraseña primero; DBA verifica que ninguna sesión del rol siga activa por sus procedimientos operativos. REVOKE directo por columna (inverso exacto de BLOCK 3), USAGE y CONNECT; no `DROP ROLE` automático. Privilegios `PUBLIC` siguen existiendo aunque se revoquen grants directos. Si fueron necesarias modificaciones globales a PUBLIC, su reversión exige plan humano separado y no está implícita aquí.

```sql
ALTER ROLE ossum_gate2_reader NOLOGIN PASSWORD NULL;
REVOKE SELECT ("id","name","slug","taxId","isActive")
  ON TABLE public."Organization" FROM ossum_gate2_reader;
REVOKE SELECT ("id","organizationId","name","taxId","isActive")
  ON TABLE public."Company" FROM ossum_gate2_reader;
REVOKE SELECT ("id","firstName","lastName","legalName","isCompany",
               "documentType","documentNumber","isActive")
  ON TABLE public."Contact" FROM ossum_gate2_reader;
REVOKE SELECT ("contactId","companyId","code","role","roles","isPayer","isActive")
  ON TABLE public."ContactCompanyLink" FROM ossum_gate2_reader;
REVOKE SELECT ("id","organizationId","sku","description","manufacturer",
               "articleType","isActive")
  ON TABLE public."article" FROM ossum_gate2_reader;
REVOKE SELECT ("organizationId","articleId","type","normalizedValue","scopeKey",
               "manufacturerContext","supplierId","companyId","isActive")
  ON TABLE public."article_identifier" FROM ossum_gate2_reader;
REVOKE SELECT ("organizationId","companyId","articleId")
  ON TABLE public."stock_article_eligibility" FROM ossum_gate2_reader;
REVOKE SELECT ("id","companyId","patientId","doctorId","institutionId",
               "payerContactId","surgeryDate","classification","cxStatus")
  ON TABLE public."Surgery" FROM ossum_gate2_reader;
REVOKE USAGE ON SCHEMA public FROM ossum_gate2_reader;
REVOKE CONNECT ON DATABASE __DEV_DB_IDENT__ FROM ossum_gate2_reader;
```

## Checklist de evidencia para acreditar Gate 2A

Inicialmente **UNKNOWN** en todas las filas de este runbook. Cada ítem requiere evidencia privada con fecha/operador, sin secretos; si falta, marcar BLOCKED/UNKNOWN y **no** conectar el adapter ni ejecutar matching. `READY` requiere los **nueve CONFIRMED**; no convertir una afirmación administrativa en prueba técnica de privilegios efectivos.

| Control | Evidencia mínima a conservar en registro privado | Estado inicial |
|---|---|---|
| A. DEV inequívoco | Identidad oficial proyecto/ref, host parcial, database, región y comparación con registro aprobado | UNKNOWN |
| B. No producción | Identificador del entorno productivo distinto; aprobación de Franco/DBA para este DEV descartable | UNKNOWN |
| C. SELECT-only efectivo | BLOCK 5 como lector, rol/ACL, ownership, secuencias, funciones y PUBLIC analizados; defaults read-only | UNKNOWN |
| D. RLS compatible | BLOCK 6, flags/policies SELECT/ALL aplicables y cobertura de PRINC demostrada sin bypass | UNKNOWN |
| E. Company PRINC | Candidato único corroborado por Franco/DBA, ID exacto custodiado solo privadamente | UNKNOWN |
| F. Organization | Organization.id asociada y corroborada | UNKNOWN |
| G. TEST separado | Mapeo distinto o exclusión explícita; ninguna selección TEST→PRINC | UNKNOWN |
| H. Allowlist exacta | BLOCK 1 y BLOCK 5: ocho tablas, columnas y ninguna lectura efectiva adicional | UNKNOWN |
| I. Sin privilegios indirectos peligrosos | membership=0, sin owner/BYPASSRLS/CREATE/DML, TEMP y PUBLIC/EXECUTE revisados | UNKNOWN |

**PASS/FAIL objetivo:** si A o B falla, STOP antes de BLOCK 1. Si BLOCK 1 no es íntegramente OK, STOP antes de CREATE ROLE. Si BLOCK 5 indica privilegios extra o función peligrosa, **BLOCKED**, no consultar datos. Si `RLS_BLOCKS_GATE2`, STOP sin BYPASSRLS. Si hay múltiples Company/Organization, **REVIEW/BLOCKED**. Registrar BLOCKED y deshabilitar el rol por BLOCK 8 si fue creado; no ejecutar `SELECT` de Contact/Article/Surgery. Solo con checklist A–I CONFIRMED puede declararse Gate 2A **READY** y plantearse implementación futura del adapter aislado; no se implementa aquí.

### Qué devolver para evaluación sin filtrar secretos

Compartir únicamente estado CONFIRMED/BLOCKED/UNKNOWN de A–I, operador/fecha, identidad del proyecto en forma **parcial/seudónima**, versión PostgreSQL, resultado OK/MISSING del schema, nombre del rol dedicado (sin contraseña), resumen booleano de privilegios/RLS, y IDs parciales de Company/Organization y separación TEST. Conservar íntegros project ref, host, grants/policies detalladas y IDs completos en evidencia privada controlada; **no compartir** password, connection string, claves Supabase, JWT, tokens, CUIT/DNI, nombres de pacientes, datos clínicos ni `records.json` por canales públicos. Si una prueba no puede hacerse sin revelar secretos o sin modificar seguridad global, marcarla BLOCKED y pedir intervención del DBA.

Fuentes técnicas consultadas, sujetas a la versión real de DEV: [PostgreSQL 18 — `pg_policies`](https://www.postgresql.org/docs/18/view-pg-policies.html), [Row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html), [CREATE POLICY](https://www.postgresql.org/docs/18/sql-createpolicy.html), [Role attributes](https://www.postgresql.org/docs/18/role-attributes.html), [Search path](https://www.postgresql.org/docs/18/runtime-config-client.html), [Privileges/PUBLIC](https://www.postgresql.org/docs/18/ddl-priv.html). Este documento entrega SQL **solo como propuesta**, no afirma que sea aplicable sin validar schema, versión, ACL y funciones reales.
