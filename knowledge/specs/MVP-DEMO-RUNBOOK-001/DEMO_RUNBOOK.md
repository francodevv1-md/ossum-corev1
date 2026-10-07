# DEMO RUNBOOK — OSSUM COR — revisión documental 2026-10-02

**Propósito:** Guion de 15–20 minutos para una demostración operativa controlada en DEV.
**Estado:** Preparación pendiente; manifiesto de registros sintéticos **UNVERIFIED**. No se declara la demo READY ni un circuito completo enlazado.
**Gobierno:** Esta corrección es documental. La evidencia existente se conserva sin repetir QA. El bloqueo DB de Cajas permanece absoluto.

## 1. Condiciones de presentación

1. Mostrar únicamente registros sintéticos confirmados en la empresa activa. No usar nombres, correos, IDs, importes o enlaces de ejemplo como si fueran datos existentes.
2. Distinguir número visible de cirugía e ID backend. Los enlaces comerciales y documentales deben corresponder al ID backend del registro seleccionado.
3. Abrir Ficha CX desde `/cirugias`, mediante la acción de apertura de la cirugía. La ficha se presenta dentro de esa pantalla; seleccionar una fila no equivale necesariamente a abrirla. No usar `/cirugias/[id]` ni construir URLs con un número CX.
4. Separar los bloques cuando no haya evidencia de relación entre sus registros. Compartir una cirugía no demuestra la continuidad Contactos → Presupuesto → Cajas → Consumo → Factura → Cobro.
5. Presentar facturación como operativa no fiscal. Pendientes de facturar crea un **Borrador**, no emite una factura ni asigna numeración fiscal. No prometer CAE, ARCA/AFIP o integración fiscal productiva.
6. Confirmar permisos existentes para cada acción; un rol genérico no garantiza todas las mutaciones. No modificar Auth o permisos para habilitar la demo.
7. Excluir mutaciones en vivo, conexiones/consultas DB y aceptación DB del paquete Cajas. La confirmación general de DEV descartable no levanta `DB_TESTS_BLOCKED.md`.

## 2. Evidencia por bloque y límites vigentes

La tabla resume evidencia registrada por los responsables. Esta tarea no la ejecutó nuevamente ni verificó hashes de aplicación; su validez corresponde al snapshot documentado, no a todo el árbol actual.

| Bloque | Evidencia conservada | Estado y límite de presentación |
| :--- | :--- | :--- |
| Contactos y Cirugías | El handoff de sesión remite a Contactos backend y a la cirugía usada en las aceptaciones de Presupuestos y Documentación. | La disponibilidad actual de contactos, sesión, empresa y cirugía para la demo sigue pendiente en el manifiesto. No declarar aceptación global de estos módulos. |
| Presupuestos → borrador de factura | `PRESUPUESTOS-CONNECTED-JOURNEY-FIXES-DEV-001/HANDOFF.md`: 96 pruebas focalizadas, suite PostgreSQL 11/11, UI real crear/editar/recargar/emitir/aprobar, creación de un Borrador y rechazo real 409 de fuente duplicada; revisión independiente y build aprobados. | READY del paquete delimitado y de su snapshot. `QA_STATUS.md` describe una suspensión anterior; el HANDOFF posterior registra su cierre. No extender el resultado a consumo, emisión de factura, cobro o todo el ERP. |
| Checklist documental | `DOCUMENTATION-CHECKLIST-BACKEND-UI-DEV-001/{HANDOFF,RUNTIME_ACCEPTANCE}.md`: 55 pruebas, persistencia real de estados/observación tras recarga, conflicto CAS 409 con conservación de borrador, cambio de cirugía, teclado y viewport móvil. | PARTIAL del paquete: aceptación viva con otra empresa/solo lectura y build exclusivo no constan completados en esos artefactos. Checklist de estados, no carga/solicitud/visualización de archivos. |
| Cajas: preparación y remito | `SOL1-BASELINE-PREPARATION-REMITO-20261002/UI_HANDOFF.md`: 153/153 pruebas offline, TypeScript/diff y revisión independiente reportados. Los subconjuntos 63/63 y 23/23 se superponen; no sumarlos. | PARTIAL. HTTP simulado no prueba ledger, reservas, trazas, concurrencia persistida ni browser real. Build diferido. `DB_TESTS_BLOCKED.md` sigue vigente; excluido del recorrido en vivo. |
| Coordinación, notificaciones y calendario personal | HANDOFF actual del propietario: migración aplicada, PostgreSQL 1/1, unitarias 37/37 y TypeScript reportados. Re-revisión independiente actual completada, sin ejecutar QA: `RESUME_REVIEW.md`. | **PARTIAL**: migración presente, pero persisten identidad por nombre/confusión usuario-contacto, filtro temporal incompleto, cierre prematuro de formularios, mutaciones de calendario sin guard de scope y rollback de notificaciones de scope anterior. READY del propietario no respaldado; browser y enlace de evidencia de ejecución pendientes. |
| Movimientos de Compras | `COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001/FINDINGS.md`, §11: cierre del contrato fuente, filtro proveedor antes de paginar, retirada de columna/enlace OC y rechazo explícito del filtro OC no soportado. Handoff de sesión: cinco hashes cotejados y 24/24 pruebas focalizadas. | Runtime PostgreSQL/browser pendiente en un contexto seguro confirmado por separado. No inferir enlace OC ↔ recepción ni aceptación DB a partir de mocks. |
| Consumo, devolución, comparativa, trazabilidad, emisión operativa y cobros | No consta en los handoffs leídos una aceptación que enlace todos estos bloques con los registros de esta demo. | Recorrido avanzado pendiente de evidencia y registros confirmados. No anunciar reingreso físico, liquidación habilitada, factura emitida o cobro imputado como resultado de este guion. |

## 3. Manifiesto de registros sintéticos — UNVERIFIED

Este manifiesto debe completarse con registros efectivamente confirmados antes de la presentación. La corrección documental no consulta DB, crea fixtures ni verifica su disponibilidad actual. No contiene identidades o importes inventados.

| Registro o contexto requerido | Dato por confirmar | Estado |
| :--- | :--- | :--- |
| Empresa activa DEV | Identificador real y confirmación del contexto autorizado | UNVERIFIED / pendiente |
| Sesión del presentador | Usuario autorizado y permisos por bloque; sin guardar correo, tokens o credenciales aquí | UNVERIFIED / pendiente |
| Contactos sintéticos | IDs backend, roles y relación con la cirugía que se mostrará | UNVERIFIED / pendiente |
| Cirugía sintética | Número visible, ID backend y pertenencia a la empresa activa | UNVERIFIED / pendiente |
| Presupuesto | ID, cirugía enlazada, estado, revisión y cantidades/importes actuales | UNVERIFIED / pendiente |
| Checklist documental | Cirugía enlazada, existencia, estados, observación y agregado requerido actuales | UNVERIFIED / pendiente |
| Borrador de factura | ID, fuente real, estado e importes actuales; no confundirlo con una factura emitida | UNVERIFIED / pendiente |
| Factura emitida y recibo, si se incluyen | IDs reales, vínculo, estado, imputaciones y saldo actual respaldados por evidencia propia | UNVERIFIED / pendiente |
| Recorrido avanzado | Enlaces reales preparación/remito/consumo/devolución/comparativa; fuera de demo mientras rija el bloqueo Cajas | UNVERIFIED / excluido en vivo |

Los IDs técnicos registrados en los handoffs de runtime son evidencia histórica, no una reserva de fixtures ni confirmación de su estado presente. Los casos de Presupuestos y Documentación documentan una cirugía sintética compartida; eso no acredita el circuito completo. Si falta un registro confirmado, omitir el bloque y explicar el límite, sin sustituirlo por un registro independiente como si fuera continuidad.

## 4. Guion base condicionado al manifiesto (15–20 minutos)

El guion prioriza lectura de registros existentes. Las transiciones descritas se explican con evidencia conservada; esta tarea no autoriza ni ejecuta una nueva aceptación o mutación.

### A1. Contexto y Contactos (2 minutos)

- **Ruta:** `/contactos`.
- **Acción:** Identificar la empresa activa y abrir un contacto sintético confirmado. Mostrar únicamente roles/perfiles que efectivamente tenga.
- **Resultado a mostrar:** Identidad backend y relación confirmada con la cirugía seleccionada. No exigir un médico, institución o matrícula predeterminados.
- **Si falta el contacto:** Omitir su vínculo en la narración. No improvisar altas para completar el manifiesto.

### A2. Cirugía y Ficha CX (3 minutos)

- **Ruta:** `/cirugias` → acción de apertura de la cirugía confirmada → Ficha CX integrada.
- **Acción:** Cargar el listado backend, identificar el número visible y abrir la ficha. Volver al listado con la navegación de la ficha si se necesita cambiar de cirugía.
- **Resultado a mostrar:** La cirugía persistida seleccionada y las superficies disponibles. No prometer redirección a una ruta de detalle ni persistencia de todas las preferencias de vista.
- **Si falla la apertura:** Volver al listado o pasar a la evidencia documental del bloque; no construir una URL alternativa ni usar pantallas legacy como sustitución autoritativa.

### A3. Presupuesto y fuente comercial (4–5 minutos)

- **Ruta:** `/ventas/presupuestos`. Cargar antes `/cirugias` para disponer de proyecciones backend, tal como registra la aceptación conectada.
- **Acción:** Abrir el presupuesto confirmado; mostrar campos, ítems, estado y revisión persistidos. Explicar la secuencia validada Borrador → Emitido → Aprobado y la conservación de datos ante conflicto.
- **Resultado a mostrar:** Enlace a la cirugía backend y valores reales del presupuesto. No fijar cantidad de ítems, IVA o totales de ejemplo.
- **Evidencia:** HANDOFF conectado, validación PostgreSQL y aceptación UI ya registradas. No provocar un conflicto artificial en vivo ni repetir la prueba de concurrencia.
- **Si no hay presupuesto confirmado:** Mostrar el límite y omitir el enlace a Pendientes; no usar otro presupuesto como continuación del caso.

### A4. Checklist documental (3–4 minutos)

- **Ruta:** Ficha CX abierta desde `/cirugias` → sección de Documentación (`documentacion`).
- **Acción:** Leer el checklist y explicar sus estados distintos: Pendiente, Recibido, Observado y Aprobado. Mostrar la observación persistida y el agregado de ítems requeridos que realmente devuelve el backend.
- **Resultado a mostrar:** Estado documental actual. Recibido no equivale a Aprobado; no anunciar completitud si el agregado no la acredita.
- **Límite funcional:** Solicitud, carga y visualización de archivos no están disponibles en este checklist. No subir un PDF ni prometer URL de almacenamiento. No confundir adjuntos de Seguimiento con este contrato.
- **Si el checklist está ausente:** Mostrar ausencia. La inicialización es explícita y requiere permiso; abrir la ficha no lo crea automáticamente.
- **Evidencia:** `RUNTIME_ACCEPTANCE.md` documenta persistencia, recarga, conflicto y recuperación. No repetir esos ensayos durante esta corrección.

### A5. Facturación operativa delimitada (3–4 minutos)

- **Rutas:** `/ventas/pendientes-facturar` y `/ventas/facturacion`.
- **Acción:** Mostrar la fuente backend elegible o el Borrador existente confirmado y explicar su relación con el presupuesto. Una fuente ya facturada puede no aparecer entre pendientes.
- **Resultado validado en el paquete conectado:** Creación de **Borrador** operativo y rechazo de fuente duplicada. La bandeja de pendientes no emite comprobantes ni asigna números fiscales; no usar el antiguo paso `FacturarDialogNuevo` como descripción de esta ruta.
- **Límite:** No afirmar transferencia automática desde un consumo no confirmado. No ejecutar excepciones de comparativa, emisión, fiscalización o cobros para completar una narración sin evidencia.
- **Cobros opcionales:** `/ventas/cobros` y `/ventas/recibos` existen como superficies. Incluirlos solo si el manifiesto confirma una factura emitida y su recibo/imputación con evidencia propia. Mostrar saldo real, sin cantidades inventadas ni promesa de actualización ya validada en este recorrido.

## 5. Bloques pendientes y exclusiones

### Cajas y operación avanzada

- La navegación inspeccionada sitúa remitos/preparación en Logística (`logistica`) y Consumo en `consumo` dentro de Ficha CX. No inventar pestañas independientes de Remito, Devoluciones o Comparativa ni usar una ruta alternativa no acreditada.
- Esta ubicación de código no habilita el bloque en vivo. Preparar, reservar, controlar/recontrolar, resolver diferencias, despachar o emitir remito quedan excluidos mientras rija el bloqueo del paquete Cajas. Tampoco ejecutar consumo/devolución u otras acciones que impliquen mutaciones de Cajas.
- No ejecutar tests DB, seed, cleanup, consultas, búsquedas del incidente ni aceptación DB de Cajas. La evidencia offline 153/153 se conserva con su límite; la ausencia de browser y persistencia real no se presenta como aprobación.
- La aceptación requiere una autorización posterior explícitamente delimitada y sus prerrequisitos. Este runbook no levanta el bloqueo.

### Coordinación, notificaciones y calendario

- Conservar la declaración actual del propietario y la evidencia reportada de migración/PG/unitarias, sin reemplazarla por el estado de la revisión antigua.
- La re-revisión terminó: persisten bloqueos fuente y evidencia pendiente, detallados en `RESUME_REVIEW.md`. Antigravity conserva ownership de las correcciones. No incorporar el bloque como cerrado ni inventar destinatarios, identidad de coordinador o fixtures.

### Movimientos

- `/compras/movimientos` queda fuera del guion base hasta la aceptación runtime pendiente en un contexto seguro confirmado por separado.
- Su cierre de contrato fuente y QA focalizado se conservan. No repetir QA válido ni incluir tests bloqueados de Cajas en el smoke de Movimientos.

## 6. Fuentes y prerrequisitos restantes

**Fuentes leídas para esta revisión:**

- `knowledge/worklog/SESSION_HANDOFF_MVP_DEMO_2026-10-02.md` — punto de reanudación; sus estados anteriores se matizan con handoffs posteriores.
- `knowledge/specs/SOL1-BASELINE-PREPARATION-REMITO-20261002/{UI_HANDOFF,DB_TESTS_BLOCKED}.md`.
- `knowledge/specs/PRESUPUESTOS-CONNECTED-JOURNEY-FIXES-DEV-001/{HANDOFF,QA_STATUS}.md` — HANDOFF contiene el cierre runtime posterior a la suspensión.
- `knowledge/specs/DOCUMENTATION-CHECKLIST-BACKEND-UI-DEV-001/{HANDOFF,RUNTIME_ACCEPTANCE}.md`.
- `knowledge/specs/COORDINATION-NOTIFICATIONS-CALENDAR-DEMO-DEV-001/HANDOFF.md` — evidencia de ejecución declarada por el propietario; `RESUME_REVIEW.md` — re-revisión actual, PARTIAL y browser pendiente.
- `knowledge/specs/COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001/FINDINGS.md`, §11, y closeout del handoff de sesión.
- Lectura puntual de `src/app/cirugias/page.tsx`, `src/hooks/useCirugiaSelection.ts`, `src/components/expediente/ExpedienteFullView.tsx`, `DocumentacionPanel.tsx` y `src/app/ventas/pendientes-facturar/page.tsx`; existencia de páginas comerciales inspeccionada sin ejecutarlas.

**Antes de una presentación:** Confirmar registros sintéticos y enlaces del manifiesto, sesión/empresa/permisos vigentes y contexto autorizado. Coordinar por separado los gates aún abiertos de cada paquete y la ventana exclusiva de build/ensayo pendiente. No repetir aceptaciones válidas salvo cambios relevantes o evidencia invalidada. El bloqueo Cajas requiere su propia autorización; no se hereda de estas condiciones generales.

## 7. Ownership documental

- **Task:** `RESUME-MVP-RUNBOOK-CORRECTION-20261002`.
- **Rol / modelo / modo:** docs maintainer / `openai/gpt-6.1-sol` (runtime actual) / docs.
- **Archivos propios:** solo `knowledge/specs/MVP-DEMO-RUNBOOK-001/DEMO_RUNBOOK.md` y `RESUME_HANDOFF.md`.
- **Estado:** released al cierre documental. Ownership previo figuraba released; no conflicto observado en los artefactos leídos.
- **Validación de esta tarea:** cotejo documental y navegación fuente en lectura; comprobación de whitespace delimitada a los archivos propios. Sin nueva certificación runtime.
