# ADR-027H — Uso productivo de la consulta de CUIT (TusFacturasAPP) en Contactos

> **Fuente autoritativa única.** Cualquier copia en `docs/` es histórica y no se actualiza.

Estado: **aprobado por Franco (2026-10-07)**
Fecha: 2026-10-07
Proyecto: OSSUM COR
Depende de: `ADR-027G-FISCAL-CONSULTA-CUIT-VIA-TUSFACTURAS.md`, `FISCAL_BOUNDARY_TUSFACTURAS.md`, `ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md`, `CONTACTS_MASTER.md`, `AUDIT_EVENT_POLICY.md`, `MULTI_COMPANY_ACCESS.md`

---

## Contexto

ADR-027G dejó aprobado el MVP de la consulta de CUIT en Contactos contra TusFacturasAPP (ARCA), con mapeo estricto al subset persistible del modelo Contactos y driver DEV por defecto (stub determinístico). El MVP no ejerce contra la red: el plan DEV de TusFacturasAPP no habilita el endpoint `clientes/afip-info` porque requiere el CUIT propio enlazado a ARCA, situación que solo se da en una cuenta productiva.

Esta ADR es la que ata el uso operativo del lookup contra la cuenta productiva de TusFacturasAPP. **No autoriza ni habilita implementación**; su función es fijar:

1. quién puede invocar la consulta y con qué cadencia (autorización + rate limits);
2. qué se loguea y qué jamás se loguea (redacción);
3. qué se audita por cada lookup (política de `AuditEvent`);
4. cómo se mapea cada error del proveedor a la respuesta al cliente (matriz de errores);
5. qué techo de costo/presupuesto se tolera por empresa/día;
6. qué condiciones son obligatorias antes de habilitar el flujo en producción.

Sin esta ADR firme, **el driver `tusfacturas` no debe ejercitarse contra ARCA real** en ningún entorno.

## Decisión

### 1. Autorización y rate limits

La consulta queda habilitada solo para actores cuya membresía sobre la empresa objetivo (`requireCompanyReadAccess`) esté vigente. Esto ya se cumple en el MVP (ADR-027G §10).

Rate limits propuestos (números **DRAFT**, a ajustar tras la primera corrida de smoke productivo):

- **Por actor** (`actorUserId`): **X = 30 req/min** (ventana móvil). Si se excede, devolver `429 rate_limit_actor` (nuevo código propuesto; pendiente de aprobación).
- **Por empresa** (`companyId`): **Y = 600 req/hora** (ventana móvil). Si se excede, devolver `429 rate_limit_company`.
- **Por CUIT por proceso**: la deduplicación in-flight existente (ADR-027G §9) cubre concurrencia; el rate limit cubre cadencia.

Implementación esperada (no en alcance de esta ADR):

- La medición se hace en el wrapper del servicio (`lookupCuit`) **antes** de invocar al proveedor. No se delega al cliente TusFacturasAPP (no expone rate limit explícito).
- El backstop es local a la instancia del proceso. Si la aplicación corre detrás de un balanceador con varias réplicas, los topes son por réplica. Una futura iteración puede mover el backstop a Redis/Upstash; **fuera del alcance actual**.
- Los códigos `429` se devuelven como `ApiError(429, 'rate_limit_actor' | 'rate_limit_company', '<sanitized>')`.

> **Pendiente DRAFT**: confirmar X e Y con datos reales del primer smoke productivo (ver §6). Los valores de esta ADR son **piso**; pueden endurecerse, no relajarse, sin reabrir la ADR.

### 2. Redacción en logs de servidor

La credenciales de TusFacturasAPP (`apikey`, `apitoken`, `usertoken`) **jamás** se loguean. Los datos personales completos (dirección física detallada, teléfono, email) que pudieran venir en la constancia **jamás** se loguean. Solo se loguea:

- `provider`: literal `"tusfacturas"`.
- `cuit_business_id`: identificador de negocio (cuit normalizado enmascarado — ver §3, `maskedCuit`).
- `error_code`: código tipificado del wrapper (`cuit_provider_timeout`, `cuit_provider_conflict`, `cuit_no_iva_condition`, `cuit_dev_config_missing`, `rate_limit_actor`, `rate_limit_company`, `invalid_cuit_format`).
- `response_code`: código de respuesta del input de negocio del proveedor (`S`/`N` cuando aplique, o equivalente mapeado a enum cerrado).
- `request_id`: identificador sanitizado (opaco, sin colisión con el `request_id` interno de TusFacturasAPP; idealmente un UUID por request del wrapper). Se acepta loguear este ID porque no expone datos personales.

Quedan **prohibidos** explícitamente en logs:

- `apikey`, `apitoken`, `usertoken`.
- `constancia_full_datos` (ni siquiera su hash).
- `razon_social`, `direccion`, `localidad`, `provincia`, `codigo_postal` cuando aparezcan en la respuesta del proveedor.
- El cuerpo crudo de la request a `clientes/afip-info` y el cuerpo crudo de la respuesta.

### 3. Consumo de créditos

TusFacturasAPP descuenta créditos por cada consulta al endpoint `clientes/afip-info`. La trazabilidad del consumo se hace con dos mecanismos independientes:

- **Métrica de proceso**: el wrapper incrementa un contador en memoria `(companyId, actorUserId, día UTC)` por cada llamada que llegó al proveedor (es decir, post-dedupe y post-rate-limit; las llamadas bloqueadas por rate limit o coalesced por in-flight no consumen).
- **Auditoría**: el `AuditEvent` (§4) registra `provider`, `responseCode`, `errorCode`, lo que permite reconstruir el consumo a partir de la auditoría cuando la métrica de proceso se pierde (por ejemplo, restart del worker).

No se introduce un nuevo modelo `CreditLedger` en esta ADR. Se reutiliza la auditoría existente. La agregación para reporting queda como tarea operativa de un futuro dashboard.

### 4. Política de auditoría

Cada lookup que efectivamente llega al proveedor (incluye errores del proveedor y timeouts) **debe** emitir un `AuditEvent` reutilizando la tabla existente (ADR-027E + `AUDIT_EVENT_POLICY.md`). **No se agregan columnas** a `AuditEvent` en esta ADR.

Shape canónico:

| Campo          | Valor                                   |
| -------------- | --------------------------------------- |
| `entityType`   | `"ContactCuitLookup"`                   |
| `entityId`     | `maskedCuit` (ver abajo)                |
| `action`       | `"cuit_lookup"`                         |
| `module`       | `"contacts-fiscal"`                     |
| `companyId`    | `companyId` de la request               |
| `userId`       | `actorUserId` (mapeado vía `getApiAuthContext`) |
| `detail`       | `null` o mensaje sanitizado             |
| `oldValue`     | `null`                                  |
| `newValue`     | `null`                                  |
| `metadata`     | `Json` con `{ requestId, provider, responseCode, errorCode }` (sin PII, sin credenciales, sin `razon_social`) |
| `createdAt`    | `now()` (default)                       |

`maskedCuit`: primeros 4 dígitos + `********` + últimos 2 dígitos del CUIT normalizado de 11 dígitos. Ejemplo: `3071********40`. Se calcula siempre; nunca se persiste el CUIT completo en la auditoría. **No** se persiste el `cuit` como `entityId` plano: se persiste `maskedCuit` para evitar fuga de PII en vistas de auditoría.

Cuando el lookup falla por validación local (`invalid_cuit_format`) o por rate limit (`rate_limit_*`), el `AuditEvent` se omite: no hubo tráfico al proveedor, no se consumió crédito, no hay nada que auditar del lado fiscal. Se mantiene la trazabilidad vía logs estructurados (§2).

### 5. Matriz de errores del proveedor

| Código tipificado          | HTTP | Origen                                 | Mensaje al cliente (sanitizado) | Mensaje interno (logs)                                        |
| -------------------------- | ---- | -------------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| `invalid_cuit_format`      | 400  | validación local módulo 11             | `"El CUIT no cumple el algoritmo módulo 11."` | mismo                                                        |
| `rate_limit_actor`         | 429  | wrapper local                          | `"Demasiadas consultas. Intente en un minuto."` | `actor=<id> limit=<X> window=1m`                            |
| `rate_limit_company`       | 429  | wrapper local                          | `"La empresa alcanzó el límite horario."`      | `company=<id> limit=<Y> window=1h`                            |
| `cuit_provider_timeout`    | 502  | fetch abort / sin respuesta            | `"El proveedor fiscal no respondió."`          | `provider=tusfacturas code=cuit_provider_timeout requestId=<uuid>` |
| `cuit_provider_conflict`   | 422  | `error:'S'` no relacionado a IVA       | `"El proveedor fiscal rechazó la consulta."`   | `provider=tusfacturas code=cuit_provider_conflict errors=<masked>` |
| `cuit_no_iva_condition`    | 422  | `error:'S'` con `errores[]` mencionando IVA / impuestos | `"El CUIT no registra impuestos ante el proveedor fiscal."` | `provider=tusfacturas code=cuit_no_iva_condition requestId=<uuid>` |
| `cuit_dev_config_missing`  | 422  | `getTusFacturasDevConfig() === null`   | `"Configuración fiscal no disponible."`        | `provider=tusfacturas code=cuit_dev_config_missing` (sin nombres de env) |

Reglas:

- El cliente (UI, integrador externo) **nunca** recibe el string crudo `errores[]` de TusFacturasAPP. Solo el código tipificado y un mensaje genérico.
- Los strings originales del proveedor se loguean a nivel `WARN` con redacción (§2) y **no** se persisten en `AuditEvent.metadata`.
- `requestId` es el del wrapper, no el de TusFacturasAPP. Esto evita correlación cruzada accidental.

### 6. Techo de costo y presupuesto

Tope diario propuesto por empresa (`companyId`):

- **T_DRAFT = 2 000 lookups/día** (ventana UTC de 24 h, móvil).
- Por encima del 80% del tope, el wrapper emite un `AuditEvent` adicional con `action="cuit_lookup_budget_warning"` para que el dashboard de operación lo levante.
- Por encima del 100%, las requests se rechazan con `429 rate_limit_company_budget` y **no** se reintentan automáticamente.

> **Pendiente DRAFT**: T debe validarse contra el plan contratado de TusFacturasAPP y el consumo real observado en el primer smoke productivo. El valor puede **endurecerse** post-smoke sin reabrir la ADR; relajarlo requiere reabrirla.

El conteo se hace contra la métrica de proceso (§3) y se reconcilia con la auditoría.

### 7. Smoke productivo controlado — gate de habilitación

Antes de habilitar el flujo contra productivo, **obligatorio**:

1. Un **PROD smoke** ejecutado por Franco (o por quien él designe) que:
   - use **únicamente CUITs sintéticos** acordados con TusFacturasAPP (no clientes reales);
   - ejercite los 4 códigos tipificados (`cuit_provider_timeout`, `cuit_provider_conflict`, `cuit_no_iva_condition`, `cuit_dev_config_missing`) y el happy path;
   - valide que `AuditEvent` se emite con la shape §4;
   - valide que ningún log contiene `apikey`/`apitoken`/`usertoken`/`razon_social`/`direccion` crudos;
   - mida consumo de créditos real y lo contraste con T_DRAFT.
2. **Aprobación explícita posterior** de Franco basada en la evidencia del smoke. Esta aprobación es la que efectivamente habilita la consulta contra la cuenta productiva.

Sin esos dos pasos, esta ADR **no se considera aprobada** y la consulta queda limitada al driver stub.

## Capa UI

Sin cambios respecto a ADR-027G §"Capa UI". El doble-columna diff y la confirmación campo-por-campo siguen siendo el contrato visible para el usuario. La UI no muestra códigos `429` nuevos sin texto explicativo; se mantienen los paths de error existentes.

## Límite del MVP (reafirmación)

Esta ADR no introduce cambios funcionales visibles. Se limita a:

- Fijar los topes X, Y, T (DRAFT).
- Fijar la redacción obligatoria de logs.
- Fijar la shape del `AuditEvent` (sin nuevas columnas).
- Fijar la matriz de errores y qué se devuelve al cliente.
- Fijar el gate obligatorio de smoke + aprobación de Franco.

Fuera del alcance, **reafirmado** desde ADR-027G:

- **Cache persistente** distribuida (deferido).
- **Persistencia** de `apoc_existe`, `actividad`, `constancia_full_datos` (deferido).
- **Mapeo `estado ARCA` → `isActive`/`linkIsActive`** (deferido; jamás automático).
- **Otros proveedores** (ARCA directo, brokers HTTP) (deferido).
- **Smoke contra ARCA real fuera del smoke controlado** (prohibido).

## Consecuencias

Positivas:

- El uso productivo queda sujeto a un gate humano (Franco) que no se puede saltar accidentalmente.
- La auditoría cubre cada crédito consumido sin agregar columna, manteniendo la regla de no tocar `prisma/schema.prisma` en paquetes no autorizados.
- La redacción evita filtrar PII ni credenciales aunque un día se persistan logs en un sistema externo.
- Los topes X/Y/T protegen contra consumo accidental por actor o empresa sin necesidad de negociar previamente con TusFacturasAPP.

Negativas / Riesgos:

- Los valores X, Y, T son DRAFT. Si el primer smoke productivo muestra que son demasiado permisivos, la auditoría habrá registrado el consumo sin freno. Mitigación: topes pueden endurecerse post-smoke sin reabrir la ADR.
- El backstop de rate limit es por instancia de proceso. Con N workers se obtiene N×Y lookups/hora. Mitigación documentada: ADR futura si esto se vuelve un problema.
- `maskedCuit` como `entityId` significa que la auditoría no es 1:1 con la operación del usuario (un usuario podría hacer 3 lookups del mismo CUIT y la auditoría tendría 3 `entityId` idénticos pero `requestId` distintos). Esto es aceptable porque la PII queda fuera; el `requestId` en `metadata` permite correlación exacta.
- Si la cuenta productiva de TusFacturasAPP no se enlaza a ARCA, el `cuit_dev_config_missing` aparece en cada request y el wrapper no puede avanzar; el cliente verá el mensaje genérico y deberá escalar a Franco.

## Reglas derivadas

- `prisma/schema.prisma` **no** se modifica.
- `src/lib/db.ts` y `src/lib/store.ts` **no** se modifican.
- No se introducen nuevas dependencias npm.
- No se introduce un nuevo modelo para créditos; la agregación se hace por reporting sobre `AuditEvent`.
- No se introducen middlewares que intercepten el `fetch` global; la instrumentación se concentra en el wrapper del servicio.
- La instrumentación de rate limit, redacción, budget y auditoría se ubica **en el wrapper del servicio** (`cuit-lookup.service` + un nuevo módulo de instrumentación que se introducirá solo cuando se implemente esta ADR), no en la ruta. La ruta no cambia.

## Validación

- `node knowledge/specs/CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007/run-checks.mjs`: **23 suites / 259 tests PASS** (los mismos del MVP más el archivo de test de servicio con imports actualizados; el test del componente con `act` envuelto silencia los warnings de React).
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007/typecheck.mjs`: **0 diagnostics** sobre los archivos propios del paquete (incluye el nuevo `cuit-lookup.service.internal.ts`).
- ESLint focal sobre archivos propios: **0 errores**.
- `git diff --check` sobre archivos propios: PASS.
- Esta ADR está **aprobada por Franco el 2026-10-07**. La habilitación efectiva contra la cuenta productiva de TusFacturasAPP requiere además el smoke controlado y la aprobación explícita posterior de Franco basada en la evidencia del smoke (ver §6).

## Próximos pasos

1. Cuando Franco lo solicite, abrir spec de implementación para el wrapper instrumentado (rate limit, redacción, budget, `AuditEvent`) — fuera del alcance de esta ADR.
2. Negociar con TusFacturasAPP un set de CUITs sintéticos para el smoke controlado.
3. Ejecutar el smoke controlado y recolectar evidencia: consumo, latencia, forma de los `AuditEvent`, redacción de logs.
4. Ajustar X, Y, T en función de la evidencia y reabrir esta ADR **solo** si el ajuste los relaja; si los endurece, basta con un addendum fechado.
5. Si se requiere mapear `estado` ARCA o persistir `apoc/actividad/constancia_full_datos`, reabrir ADR-027G y esta ADR-027H en conjunto.

## Aprobación

- ADR-027G (MVP, stub + UI mínima, no productivo): aprobada por Franco el 2026-10-07 (Engram #9254).
- **Esta ADR-027H es DRAFT**. No se considera habilitante del uso productivo de la consulta.
- Aprobación efectiva del uso productivo: queda condicionada al smoke controlado con CUITs sintéticos (§7) y a la respuesta explícita de Franco en una pregunta precisa del tipo `¿Aprobás el uso productivo del lookup con los topes X=<n> req/min, Y=<m> req/hora, T=<k> lookups/día y la evidencia del smoke controlado?`. Esa aprobación se registra en una addendum fechado de esta misma ADR.
- Cualquier extensión fuera del alcance (cache persistente, mapeo `estado ARCA → isActive`, persistencia de `apoc/actividad/constancia_full_datos`, otros proveedores, relajamiento de X/Y/T) reabre esta ADR.
