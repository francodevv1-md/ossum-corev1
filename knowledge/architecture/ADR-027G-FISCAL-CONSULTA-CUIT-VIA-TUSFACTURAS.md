# ADR-027G — Consulta de CUIT en Contactos vía TusFacturasAPP (ARCA)

> **Fuente autoritativa única.** Cualquier copia en `docs/` es histórica y no se actualiza.

Estado: aprobado por Franco (2026-10-07)
Fecha: 2026-10-07
Proyecto: OSSUM COR
Depende de: `FISCAL_BOUNDARY_TUSFACTURAS.md`, `ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md`, `CONTACTS_MASTER.md`

---

## Contexto

OSSUM COR debe completar datos de Contactos (`legalName`, `vatCondition`, `mainAddress`) cuando el usuario dispone solo de un CUIT. La fuente autorizada para esos datos en Argentina es ARCA (ex AFIP). OSSUM COR no tiene relación directa con ARCA: la integración fiscal se realiza a través de **TusFacturasAPP** como motor fiscal/comercial, según `FISCAL_BOUNDARY_TUSFACTURAS.md`.

TusFacturasAPP expone `POST /app/api/v2/clientes/afip-info` que consulta la constancia de inscripción de ARCA por CUIT y devuelve datos básicos (razón social, condición frente al IVA, dirección, localidad, código postal, provincia) y datos extendidos (`apoc_existe`, `actividad`, `constancia_full_datos`).

El workspace actual opera en plan API DEV; según la documentación oficial de TusFacturasAPP, este endpoint **no está disponible en el plan DEV** porque requiere que el CUIT propio esté enlazado con ARCA.

## Decisión

Se adopta la integración con TusFacturasAPP para la consulta de CUIT en Contactos, con el siguiente contrato operativo:

1. La consulta se realiza **siempre backend-only**. Ningún token (`apikey`, `usertoken`, `apitoken`) ni credencial fiscal es accesible al frontend.
2. Endpoint Único: `POST /api/companies/[companyId]/contacts/cuit-lookup` autenticado por la membresía de la empresa del actor.
3. El servicio reutiliza el cliente TusFacturasAPP ya presente en `src/lib/services/fiscal-tusfacturas.service.ts` y la config existente (`getTusFacturasDevConfig()`).
4. **Driver DEV**: en entorno no productivo el servicio resuelve por defecto con un stub determinístico basado en el CUIT, suficiente para tests y demos internas. Driver explícito mediante variable `OSSUM_CUIT_LOOKUP_DRIVER=stub|tusfacturas`.
6. **Mapeo estricto al modelo Contactos** (lo único que persiste el MVP):
   - `documentType` (CUIT).
   - `documentNumber` (CUIT normalizado, 11 dígitos).
   - `legalName` (proveniente de `razon_social`, trim ≤ 240 caracteres).
   - `vatCondition` (mapeo desde `condicion_impositiva`).
   - `mainAddress.street`, `mainAddress.city`, `mainAddress.state`, `mainAddress.zipCode`, `mainAddress.country`.
7. **No se mapea al modelo**:
   - `estado` ARCA → nunca se traduce a `linkIsActive`, `isActive` ni dispara bloqueo del contacto. Conceptos distintos: ARCA mide inscripción fiscal; `linkIsActive` mide el vínculo operativo del contacto en la empresa.
   - `apoc_existe`, `apoc_info`, `actividad`, `constancia_full_datos` → se devuelven como `extra` puramente informativo en la respuesta; la UI los presenta en una sección colapsable; **no se persisten**.
8. **Pre-validación local del CUIT** (módulo 11) antes de salir a la red. Formato inválido devuelve `400 invalid_cuit_format` sin invocar al proveedor.
9. **Deduplicación in-flight** por CUIT dentro de la misma instancia del proceso: el servicio mantiene un `Map<string, Promise<CuitLookupResult>>` que coalesce llamadas concurrentes para el mismo CUIT. **No se implementa cache persistente** en esta etapa (serverless rompe persistencia entre instancias).
10. **Errores tipados**:
    - `invalid_cuit_format` (cliente).
    - `cuit_provider_timeout` (red, 502).
    - `cuit_provider_conflict` (ARCA bloquea la constancia, 422).
    - `cuit_no_iva_condition` (sin impuestos registrados, 422).
    - `cuit_dev_config_missing` (config faltante, 422).
11. **Redacción de logs**: jamás loguear `constancia_full_datos` ni datos personales completos; solo `cuit`, `provider`, `error_code`.

## Capa UI

- En `ContactoFormDialog`, botón "Buscar por CUIT" junto al campo CUIT. Se habilita cuando el CUIT pasa la validación local (módulo 11).
- Resultado se vuelca a un **draft** con doble columna "actual vs propuesto" y tilde por campo. El usuario debe confirmar campo por campo; **nada se aplica automáticamente**.
- La sección colapsable con `apoc_existe`/`actividad`/`constancia_full_datos` se muestra solo si la respuesta trae datos; nunca se persiste.
- Concurrencia UI protegida con un `ref` local (`cuitLookupInFlightRef`) que evita disparos duplicados en la UI; el server-side sigue siendo el dueño del dedupe.

## Límite del MVP

**En alcance MVP**:
- Servicio backend con doble driver (stub + TusFacturasAPP).
- Validador zod para request/response.
- Ruta autenticada `POST .../cuit-lookup`.
- Cliente `cuitLookupApi(companyId, cuit)`.
- UI mínima con doble-columna y dedupe in-flight.
- Tests unitarios (servicio, validador, ruta) y de componente (formulario).
- Documentación (TASK_BRIEF, HANDOFF, worklog).

**Fuera del alcance MVP** (enriquecimiento futuro, requiere autorización fiscal explícita):
- Validación real contra ARCA en entorno productivo (requiere `aprobación_arca_consulta` y ADR fiscal separada).
- Cache persistente distribuido.
- Persistir `apoc_existe`, `actividad`, `constancia_full_datos`.
- Bloqueo operativo del contacto en función del `estado` ARCA.
- Reintento exponencial, throttling distribuido, métricas de consumo de créditos.
- Integración con otro proveedor (ARCA directo, brokers HTTP).
- Smoke contra productivo enlazado a ARCA.

## Consecuencias

Positivas:
- Cumplimiento del límite `FISCAL_BOUNDARY_TUSFACTURAS.md`: integración backend-only, sin credenciales en frontend.
- No se requiere certificado digital de ARCA en OSSUM COR; la gestión queda en TusFacturasAPP.
- Se reduce el error humano al cargar Contactos jurídicos al sugerir datos oficiales de la constancia de inscripción.
- Dedupe in-flight protege contra duplicación accidental sin introducir complejidad de cache serverless.

Negativas / Riesgos:
- **No se puede validar el happy path real contra ARCA en DEV** (limitación documentada del proveedor). Validación real exige cuenta productiva enlazada y autorización fiscal explícita, fuera de esta ADR.
- TusFacturasAPP descuenta créditos por consulta. Sin cache persistente, cada lookup consume crédito; deduplicar en UI/in-flight solo cubre concurrencia, no global.
- ARCA puede bloquear la constancia por requerimientos pendientes; el wrapper ya tipifica `cuit_provider_conflict` pero requiere manejo de UX cuidadoso (no autoaplicar).
- Privacidad: aunque no persistimos `constancia_full_datos`, sigue llegando por la red y permanece en el proceso de la request; el wrapper no debe guardarla en logs ni en `Contactos`.
- Si se persiste `constancia_full_datos` o se mapea `estado ARCA → isActive` en una futura iteración, esta ADR queda invalidada y debe reabrirse.

## Reglas derivadas

- `prisma/schema.prisma` no se modifica; no se agrega columna para `apoc_existe`, `actividad` o `constancia_full_datos`.
- `src/lib/store.ts` no se modifica.
- Las rutas `/api/companies/[companyId]/contacts/cuit-lookup` no persisten nada por sí mismas; cualquier persistencia futura requiere ADR separada.
- Los archivos sensibles (`prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`) están excluidos del lock de esta ADR.

## Validación

- Tests: 23 suites / 259 tests PASS (incluye 65 nuevos del MVP). Ver `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/HANDOFF.md`.
- TypeScript del limpiador: 0 diagnostics.
- Lint: 0 errores.
- Revisión independiente: PASS, 0 defectos accionables, 3 nits no bloqueantes registrados.
- Sin browser QA explícito por decisión del usuario.
- Sin DB real (consulta queda en stub DEV).
- Sin commit/push/deploy en esta ronda.

## Próximos pasos

1. Si se requiere validación real contra ARCA, abrir ADR fiscal que autorice el uso de cuenta productiva y defina límites de uso, redacción y auditoría.
2. Implementar cache persistente distribuido solo después de ADR separada.
3. Evaluar métricas de uso (créditos consumidos) en plan productivo antes de habilitar el flujo en producción.
4. Si se requiere mapear el `estado` ARCA o alguno de los `extra` al modelo Contactos, reabrir esta ADR.

## Aprobación

- Autorización operativa del MVP (driver stub + UI mínima): Engram `#9254` (Franco, 2026-10-07).
- **Esta ADR queda aprobada el 2026-10-07 por Franco**. Habilita el flujo contra productivo en cuanto se configure la cuenta TusFacturasAPP enlazada a ARCA; sigue requiriendo ADR fiscal separada para definir límites de uso, redacción y auditoría de cada request productivo.
- Cualquier extensión fuera del MVP (persistencia de extras, mapeo `estado ARCA → isActive`, cache persistente, retry exponencial, throttling distribuido, integración con otro proveedor) reabre esta ADR.