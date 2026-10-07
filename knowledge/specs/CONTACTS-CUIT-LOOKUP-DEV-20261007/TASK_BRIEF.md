# CONTACTS-CUIT-LOOKUP-DEV-20261007 — Task Brief

## Goal

Implement MVP "Buscar por CUIT" lookup in the Contactos form, with strict mapeo a los campos existentes del modelo Contactos (`documentType`, `documentNumber`, `legalName`, `vatCondition`, `mainAddress`). Driver DEV (stub) por defecto; el driver `tusfacturas` queda implementado pero no se ejecuta contra ARCA real (no hay cuenta productiva enlazada en DEV).

Preserva todos los packages aprobados anteriores (`CONTACTS-CREATE-STABILITY-20261007`, `CONTACTS-CORRELATIVE-DEV-20261007`, `CONTACTS-FRAGILITY-FIXES-20261007`). Archivos extranjeros sucios (Surgery, Remitos, lookup field) son intocables.

## Scope (finite)

1. Servicio backend `src/lib/services/cuit-lookup.service.ts` con `lookupCuit(rawCuit, opts?)`.
   - `source: 'stub' | 'tusfacturas'`, `found: boolean`, `legalName?`, `vatCondition?` (canónica: `Responsable Inscripto` | `Monotributo` | `Exento` | `Consumidor Final`), `mainAddress?` (`street`/`city`/`state`/`zipCode`/`country`), `estado?`, `extra?` (`apocExiste?`, `apocInfo?`, `actividad?`, `constanciaFullDatos?`).
   - Driver default: `'stub'` cuando `OSSUM_CUIT_LOOKUP_DRIVER==='stub'` o en DEV (`NODE_ENV!=='production'`). Driver `'tusfacturas'` solo si está configurado productivamente.
   - Pre-validación módulo 11 en proceso: CUIT vacío o inválido lanza `ApiError(400, 'invalid_cuit_format')`.
   - In-flight de-dup por proceso (`Map<string, Promise<CuitLookupResult>>`).
   - Stub determinista: basado en módulo del último dígito → mapea a monotributo/responsable inscripto/exento, con variantes `cuit_not_found`, `cuit_provider_conflict`, `cuit_no_iva_condition`, y apoc exists sí/no. Usa `fetchFn` seam para inyectar fetch async en tests.
   - TusFacturas driver: arma POST a `clientes/afip-info` con `apikey+usertoken+apitoken` desde `getTusFacturasDevConfig()`. Errores:
     - Sin config → `ApiError(422, 'cuit_dev_config_missing')`.
     - Red caída → `ApiError(502, 'cuit_provider_timeout')`.
     - `error:'S'` → `ApiError(422, 'cuit_provider_conflict' | 'cuit_no_iva_condition')` (mapeo por `errors[]`).
     - Mapeo `condicion_impositiva` → `vatCondition` canónica: `RESPONSABLE INSCRIPTO → 'Responsable Inscripto'`, `MONOTRIBUTO → 'Monotributo'`, `EXENTO → 'Exento'`, `CONSUMIDOR FINAL → 'Consumidor Final'`.
     - `razon_social` se trunca a 240 chars.
   - `extra` se devuelve tal cual; la ruta NO lo persiste.

2. Validador `src/lib/validators/cuit-lookup.ts`: zod schemas `cuitLookupRequestSchema` (`{ cuit: string.regex(/^\d{11}$/) }`), `contactLookupResultSchema` (subset mapeado + `extra` opcional). Usa `optionalText` compartido.

3. Util `src/lib/utils/cuit-validation.ts`: `validateCuitFormat(cuit)` con algoritmo módulo 11, retorna `boolean`.

4. Ruta `src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts`: POST autenticada por empresa con `requireCompanyReadAccess` (search-like, read-only). Body `{cuit}`. Devuelve `ok(result)`, `Cache-Control: no-store`. Errores vía `errorResponse` (ApiError, ZodError). Service corre síncrono por request; dedupe en service.

5. Cliente `src/lib/api/contacts.ts`: export `cuitLookupApi(companyId, cuit)` usando `apiFetch` + `parseResponse` contra `contactLookupResultSchema`.

6. UI en `src/components/contactos/ContactoFormDialog.tsx` (extensión mínima):
   - Estado local: `cuitResult`, `cuitSuggestion` (per-field ticked set), `cuitPreviewApocOpen`.
   - Pre-check módulo 11 local (`validateCuitFormat`) habilitando el botón "Buscar por CUIT" adyacente al CUIT Field.
   - Doble columna diff para `legalName`, `vatCondition`, `mainAddress` (street/city/state/zipCode) con checkboxes por campo.
   - Acciones: "Aplicar seleccionados" (sólo ticked → llama `setX` actuales), "No aplicar", "Cerrar".
   - Previsualización informativa (NO persistente) de `extra` (apoc/actividad/constancia) si hay datos; colapsable.
   - Errores vía path existente de display de error; no auto-aplican.
   - Ref guard (`cuitLookupInFlightRef`) para que doble click sólo dispare una llamada UI; backend hace dedupe in-flight por CUIT.

## Out of scope (enriquecimiento diferido)

- Persistent cache (TTL) de respuestas ARCA.
- Persistir `apoc_existe`, `actividad`, `constancia_full_datos`.
- Mapear `estado` ARCA → `linkIsActive` / `isActive`.
- Reintento exponencial, throttling distribuido, métricas de créditos.
- Otros proveedores (ARCA directo, brokers).

## Allowed files

- `src/lib/services/cuit-lookup.service.ts` (new)
- `src/lib/utils/cuit-validation.ts` (new)
- `src/lib/validators/cuit-lookup.ts` (new)
- `src/lib/api/contacts.ts` (additive export)
- `src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts` (new)
- `src/components/contactos/ContactoFormDialog.tsx` (additive minimal)
- New test files under `src/__tests__/`
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/`
- `knowledge/worklog/CONTACTS_CUIT_LOOKUP_DEV_2026-10-07.md`

## Forbidden

- `prisma/schema.prisma`, migrations
- `src/lib/db.ts`, `src/lib/store.ts`
- Auth, roles, permissions
- Editing foreign files in prior contact packages
- Foreign surgery/remito/lookup field
- New npm dependencies
- `git commit`, `git push`, `git reset --hard`, `git checkout --` on foreign files
- Browser QA / Playwright
- Real DB writes
- Persistent cache TTL
- ARCA `estado` → `linkIsActive` mapping
- Persist `apoc_existe` / `actividad` / `constancia_full_datos`
- Exponential retry / distributed throttling
- Other providers

## Constraints

- Preservar los 19 suites / 194 tests previos del paquete CONTACTS-FRAGILITY-FIXES-20261007.
- Preservar los tests previos de correlativo, create-stability y round-trip adapter.
- `ContactoFormDialog` cambia es aditiva: el save flow previo queda intacto. El botón "Buscar por CUIT" se añade al lado del campo CUIT; los seteos de campo (`setNombre`, `setCondicionIva`, etc.) se siguen usando.
- Validación módulo 11 también se usa en cliente para habilitar/deshabilitar el botón.
- TusFacturas driver queda cableado y testeado con `fetchFn` mock; no se ejecuta contra la red.

## Validation gates

- `node knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/run-checks.mjs` (suite previa + nuevas).
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/typecheck.mjs`.
- ESLint sobre archivos propios.
- `git diff --check` sobre archivos propios.
- Independent sibling review o focused self-review (depth limit fallback).

## Handoff

Caveman `Done / Changed / Files / Validations / Risks / Next` con conteos exactos de tests y evidencia.