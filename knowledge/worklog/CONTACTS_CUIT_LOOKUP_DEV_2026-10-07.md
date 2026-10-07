# CONTACTS-CUIT-LOOKUP-DEV-20261007 — Worklog

## Goal

Add a "Buscar por CUIT" MVP lookup to the Contactos form. Strict mapeo a los campos existentes del modelo (`documentType`, `documentNumber`, `legalName`, `vatCondition`, `mainAddress`). DEV stub driver (no ejecución contra ARCA real). Preserva los packages aprobados anteriores.

Parent approval: Engram #9254. Diagnostic: `C:/Users/franc/.opencode/plan/contacts-cuit-lookup-diagnostic-20261007.md`.

## Implemented

### Servicio backend `src/lib/services/cuit-lookup.service.ts`

- `lookupCuit(rawCuit, opts?: { driver?: 'stub' | 'tusfacturas' })`:
  - Valida módulo 11 con `validateCuitFormat` (utilidad nueva). Vacío / inválido → `ApiError(400, 'invalid_cuit_format')`.
  - In-flight de-dup por proceso via `Map<string, Promise<CuitLookupResult>>`.
  - Driver default: `'stub'` cuando `OSSUM_CUIT_LOOKUP_DRIVER === 'stub'` o `NODE_ENV !== 'production'`. En producción, `'tusfacturas'`.
  - Driver `'stub'` determinista basado en `last-5-digits % 9`:
    - 0 → Monotributo
    - 1 → Responsable Inscripto (canónico canonical `30712293840` también mappea a "DISTRIBUIDORA ANTIGRAVITY SA")
    - 2 → Exento
    - 3 → `found: false`
    - 4 → `ApiError(422, 'cuit_provider_conflict')`
    - 5 → `ApiError(422, 'cuit_no_iva_condition')`
    - 6 → apoc existe (extra.apocExiste=true)
    - 7 → actividad[] + constanciaFullDatos completos (informativos)
    - 8 → Responsable Inscripto genérico
  - Driver `'tusfacturas'` (no se ejecuta en DEV por falta de cuenta productiva enlazada):
    - POST a `clientes/afip-info` con `apikey + apitoken + usertoken` desde `getTusFacturasDevConfig()`.
    - Sin config → `ApiError(422, 'cuit_dev_config_missing')`.
    - Red caída → `ApiError(502, 'cuit_provider_timeout')`.
    - `error:'S'` → `ApiError(422, 'cuit_provider_conflict' | 'cuit_no_iva_condition')` (mapeo por `errores[]` — contiene "iva"/"impuesto" → IVA; otro → conflict).
    - `razon_social` truncado a 240 chars.
    - `condicion_impositiva` → vatCondition canónica (RESPONSABLE INSCRIPTO/MONOTRIBUTO/EXENTO/CONSUMIDOR FINAL fallback).
    - `extra` lleva `apoc_existe` (boolean desde "SI"/"NO"), `apoc_info`, `actividad`, `constancia_full_datos`.
  - Helper `mergeVatConditionText(raw)` exportado para tests.
  - Test seams: `__tusFacturasLookupCuit`, `__lookupCuitWithDeps`, `__inFlightClearForTest`, `__setTestFetchOverride`.

### Util `src/lib/utils/cuit-validation.ts`

- `validateCuitFormat(cuit)`: algoritmo módulo 11 con multiplicadores [5,4,3,2,7,6,5,4,3,2]. Acepta formateado ("30-71229384-0"). Remitente único, sin estado.
- `normalizeCuit(cuit)`: devuelve los 11 dígitos.

### Validador `src/lib/validators/cuit-lookup.ts`

- `cuitLookupRequestSchema`: `{ cuit: string.regex(/^\d{11}$/) }` strict.
- `contactLookupResultSchema`: subset mapeado (source, found, legalName?, vatCondition?, mainAddress?, estado?, extra?) con `optionalText` max consistente con el resto del repo.
- `cuitLookupVatConditionSchema`: enum canónico.
- `cuitLookupExtraSchema`: extra opcional con `apocExiste?`, `apocInfo?`, `actividad?`, `constanciaFullDatos?` (z.unknown() para los payloads grandes).

### Ruta `src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts`

- POST autenticada por empresa via `getApiAuthContext + requireCompanyReadAccess` (search-like, read-only).
- Body `{ cuit }`. Schema rechaza longitudes malformadas → `ApiError(400, 'invalid_cuit_format')`.
- JSON malformado → `ApiError(400, 'invalid_json_body')`.
- Service corre await por request; dedupe in-flight dentro del service.
- Headers: `Cache-Control: no-store`.
- Errores via `errorResponse` (ApiError, ZodError, internalError fallback).

### Cliente `src/lib/api/contacts.ts`

- Aditivo: `cuitLookupApi(companyId, cuit)` usando `apiFetch` + `parseResponse` contra `contactLookupResultSchema`.

### UI `src/components/contactos/ContactoFormDialog.tsx`

- Aditivo (no cambia el save flow). Estado nuevo: `cuitResult`, `cuitLookupError`, `cuitLookupLoading`, `cuitSuggestion` (per-field ticked set), `cuitPreviewApocOpen`, `cuitLookupInFlightRef`.
- Botón "Buscar por CUIT" adyacente al campo CUIT. Deshabilitado cuando el CUIT no es módulo 11 válido o ya hay un lookup en curso (ref guard para double click).
- Click llama `cuitLookupApi(activeCompany.id, cleanedCuit)`.
- Panel doble-columna diff (`contact-cuit-lookup-diff`) con checkboxes por campo (`legalName`, `vatCondition`, `street`, `city`, `state`, `zipCode`). Ticked default si difieren del valor actual.
- Acciones: `Aplicar seleccionados` (setNombre/setCondicionIva/setDomicilio/etc.), `No aplicar`/`Cerrar` (descartan).
- Mapping localizado: `Monotributo` (canonical) → `Responsable Monotributo` (form's enum).
- Previsualización informativa (no persista) de `extra` (apoc/actividad/constancia) si hay datos, colapsable, vía `Ver datos informativos (no se aplican)`.
- Errores via display path existente; nunca autoapply.

### Tests

Nuevos:
- `src/__tests__/unit/cuit-lookup.service.test.ts` (29 tests) — mergeVatConditionText (9), stub driver (10), TusFacturas driver (10).
- `src/__tests__/unit/cuit-lookup-validator.test.ts` (20 tests) — request schema (3), vatCondition (5), result schema (3), validateCuitFormat (9).
- `src/__tests__/unit/cuit-lookup-route.test.ts` (8 tests) — happy 200, 401, 403, malformed JSON 400, missing body 400, wrong-digits 400 invalid_cuit_format, conflict 422, no-iva 422.
- `src/__tests__/components/ContactoFormDialog-cuit-lookup.test.tsx` (8 tests) — button disabled when empty, enabled when valid, click triggers one call, double-click de-dup, diff renders current vs proposed, apply calls setters, close discards, error surface.

## Validations

- `node knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/run-checks.mjs`: **23 suites / 259 tests PASS** (suites previos del paquete CONTACTS-FRAGILITY-FIXES-20261007 + 4 suites nuevos del MVP).
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/typecheck.mjs`: **15 entries / 535 resolved files / 0 diagnostics**.
- ESLint focal sobre archivos propios: **0 errors / 9 preexisting warnings** (imports no usados en ContactoFormDialog.tsx, todos preexistentes per fragility-fixes handoff).
- Scoped `git diff --check` sobre archivos propios: PASS (solo warnings LF/CRLF platform line-ending).

## Riesgos

- No browser/Playwright (per parent instruction). No production build claim.
- Stub determinista no se valida contra ARCA real (no hay cuenta productiva enlazada en DEV). Validación real requiere ADR fiscal + aprobación de Franco per AGENTS.md §11 y `FISCAL_BOUNDARY_TUSFACTURAS.md`.
- TusFacturas driver implementado pero NO ejercitado contra la API real. Cubre happy path / errores / config missing / network fail con `fetchFn` mock.
- Persistent cache TTL fuera del scope (firma URAA-2026 + Serverless no garantiza persistencia entre instancias).
- Mapeo ARCA `estado` → `linkIsActive` / `isActive` NO se hace (decisión diagnóstica explícita). El `estado` se devuelve tal cual en el response y la UI lo muestra sólo si el usuario abre el preview.
- Apoc / actividad / constancia NO se persisten (decisión diagnóstica explícita). Se devuelven en `extra` y la UI los muestra sólo si el usuario abre el collapsible preview.
- Cache persistente, retry exponencial, throttling distribuido, otros proveedores: out of scope (enriquecimiento diferido).
- `Contacto` field `condicionIva` usa el enum del form (incluye "Responsable Monotributo") que NO coincide 1:1 con el enum canónico del lookup. Mapping localizado `Monotributo → Responsable Monotributo` aplicado en `applyCuitSuggestion`.
- Mapeo `applyCuitSuggestion` aplica `setNombre`/`setCondicionIva`/etc. existentes — no invoca `createContactApi`. La persistencia ocurre vía el save flow que ya estaba intacto.

## Próximos pasos

- Validar contra DB DEV explícitamente descartable cuando Franco lo autorice (no se hizo en este paquete).
- Resolver cuitrador `useCirugiaActions-change-date` foreign test isolation en su propio paquete.
- Commit / publicación requiere solicitud explícita.