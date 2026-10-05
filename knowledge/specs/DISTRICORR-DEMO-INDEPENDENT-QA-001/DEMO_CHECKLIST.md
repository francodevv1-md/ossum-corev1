# DEMO_CHECKLIST — DISTRICORR-DEMO-INDEPENDENT-QA-001

**Estado**:
- **Sol** (Comprobantes backend) — implementación **validada** por
  Sol + self-review `characteristic-purple-nightingale`. Aceptación
  **browser pendiente** (no rerunada por mí). Apto para exhibir el
  **panel interior** en la demo.
- **Antigravity** (Ingreso→Autorización→Coordinador) — sin HANDOFF.
  **No** mostré esta entrega.

Marca cada registro como **CONFIRMADO** o **PENDIENTE**; nunca inventar.

**Workspace**: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`.
**Effective model**: minimax/MiniMax-M3.
**Fecha**: 2026-10-02.

---

## Reglas del checklist

- **Mostrar únicamente lo funcional**: si un paso no tiene evidencia
  certificada, se sustituye por el **Qué NO mostrar** correspondiente.
- **Sin fixtures ni totales inventados**: `RESUME_REVIEW.md`/`RESUME_HANDOFF.md`
  ya quitaron números y personas sin acreditar del runbook previo.
- **Movimientos/Cajas runtime queda fuera**: `DB_TESTS_BLOCKED.md` intacto.
- **No ejecutar Auth, secretos, fiscalización**: ninguna demo de demo
  toca esos caminos.

---

## 1. Comprobantes backend de la cirugía (Sol)

### Estado de aceptación

| Dimensión | Estado | Fuente |
| --- | --- | --- |
| LOCK | `released` | `SURGERY-COMPROBANTES-BACKEND-READ-DEV-001/LOCK.md` |
| HANDOFF | publicado | `HANDOFF.md` (33 líneas) |
| Self-review `characteristic-purple-nightingale` | sin bloqueantes | `REVIEW.md` |
| Implementación (Vitest 11/11 + TypeScript) | **validada** | `VALIDATION.md:3-5` (Sol, no rerunada por mí) |
| Hashes final vs baseline | coinciden | `OWNERSHIP.md` (este paquete) |
| Aceptación **browser** sobre runtime persistido | **PENDIENTE** | `HANDOFF.md:22` + `VALIDATION.md:6` (no corrido por nadie en esta sesión) |
| Walk-through CHECKS H/I/J/K | sin bloqueos nuevos propios | `REVIEW.md` (este paquete) |

**Qué muestra la demo**: el **panel interior `Comprobantes asociados`**
(`ComprobantesAsociados.tsx` + `useSurgeryComprobantes.ts`).

**Snapshot integrado usado para el ensayo (posterior al release de
Sol, fuera del paquete)**:

- `ComercialTabContent.tsx` (working tree, dirty): ahora monta
  `PresupuestoPanel` con `onAutorizar` y `ComprobantesAsociados` dentro
  de un `SectionCard` titulado "Comprobantes asociados". **Las tarjetas
  legacy de resumen base/balance del padre fueron retiradas** (HANDOFF
  §Risks de Sol ya no aplica como exclusión).
- `PresupuestoPanel.tsx` (dirty): tiene botón **Autorizar CX** en
  `PresupuestoPanel.tsx:312–317` que aparece sólo si presupuesto
  aprobado Y cirugía no autorizada Y se recibe `onAutorizar`.
- `ExpedienteFullView.tsx` (dirty): propaga `onAutorizar` →
  `ComercialTabContent` → `PresupuestoPanel`.
- `ExpedienteHeader.tsx` (dirty): abre `setChangeStateDialogOpen(true)`
  (botón legacy de cambio de estado, **distinto** del "Autorizar CX").
- **Hashes de Sol working tree siguen siendo los reportados en
  `VALIDATION.md:36-38`**: sin drift.

**Ruta "Autorizar CX" trazada en código** (conexiones, no runtime):

1. `/cirugias` → seleccionar cirugía → `selection.openExpediente(s.id)`.
2. `ExpedienteFullView` se monta (`cirugias/page.tsx:434`).
3. `onAutorizar={actions.handleAutorizar}` (`cirugias/page.tsx:464`).
4. `actions.handleAutorizar` → `setChangeStateDialogOpen(true)`
   (`useCirugiaActions.ts:295–298`).
5. `ChangeStateDialog` se monta (componente bajo paquete Antigravity,
   sigue PENDING REVIEW para mí).
6. `PresupuestoPanel.tsx:312–317` muestra el botón "Autorizar CX"
   cuando el presupuesto está aprobado y la cirugía no fue autorizada.

La cadena llega al diálogo; el contenido del diálogo (voucher/checkbox,
actor, persistencia) sigue siendo materia del paquete
`DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001`, **sin HANDOFF al cierre
de esta sesión**.

**Qué NO muestra la demo y queda fuera de la evidencia**:

- Las **tarjetas legacy del padre** ya no están en el árbol visible de
  `ComercialTabContent.tsx`; el ítem previo de exclusión de la sección
  "Qué NO mostrar" queda obsoleto.
- El contenido del `ChangeStateDialog` abierto por
  `handleAutorizar` — sigue siendo propiedad de Antigravity sin
  HANDOFF.

### Ruta planeada

1. Con sesión autorizada válida, abrir `/cirugias`.
2. Seleccionar empresa activa (no operar sin `activeCompany`).
3. Abrir Ficha CX de una cirugía con `surgery.backendId` conocido.
4. Tab **Comprobantes** → **scrollear hasta el panel `Comprobantes
   asociados`** (es la sección backend-readonly, **debajo** de las
   tarjetas superiores que se excluyen).
5. Mostrar un presupuesto y una factura con número real, fecha,
   estado, importe y moneda del backend.
6. Filtrar `Presupuestos` / `Facturas`; mostrar "Sin numeración" si
   `visibleNumber` es null; mostrar "No aplica" como saldo del
   presupuesto y el valor del backend como saldo de la factura.
7. Cambiar de cirugía o empresa: la lista debe resetearse y no
   mezclarse.
8. Botón **Recargar**: dispara `revision++` sin fallback local.

### Resultado esperado y evidencia disponible

| Paso | Resultado esperado | Evidencia (validada por Sol) | Estado demo |
| --- | --- | --- | --- |
| Render inicial | Muestra presupuestos/facturas con `surgery.backendId`, no `id` frontend | test `ComprobantesAsociados.http.test.tsx:79-102` (URL canónica `/api/companies/company-a/{presupuestos,invoices}?surgeryId=surgery-a&take=500&skip=0`) | CONFIRMADO código+test; browser PENDIENTE |
| Borrador vs emitida | Distinción visual (badge variant) + texto | test línea 76 + HANDOFF §Changed | CONFIRMADO código+test; browser PENDIENTE |
| Sin numeración | "Sin numeración" si `visibleNumber` null | test línea 104-115 + componente línea 77 | CONFIRMADO código+test; browser PENDIENTE |
| Saldo presupuesto | "No aplica" (no deuda) | test línea 89 + componente línea 81 | CONFIRMADO código+test; browser PENDIENTE |
| Saldo factura | Valor backend (incluido cero) | test línea 92-93 + componente línea 81 | CONFIRMADO código+test; browser PENDIENTE |
| Cambio de scope | Lista nueva reemplaza; no mezcla | test línea 160-176 (descarta tardías, éxito y error) + línea 178-190 (oculta loaded rows) | CONFIRMADO código+test; browser PENDIENTE |
| Recargar | Vuelve a fetch; sin fallback local | test línea 134-144 + hook línea 55 | CONFIRMADO código+test; browser PENDIENTE |
| Backend devuelve scope cruzado | Error "no corresponde a la empresa y cirugía" | test línea 178-190 + hook línea 37-39 | CONFIRMADO código+test; browser PENDIENTE |
| Missing company / missing identity | Estados distintos, sin fetch | test línea 146-158 + hook línea 50 | CONFIRMADO código+test; browser PENDIENTE |
| Numeración inventada | NO mostrar | código: solo `row.number ?? "Sin numeración"` | CONFIRMADO código; browser PENDIENTE |
| Aceptación browser final | Render correcto contra backend real con datos persistidos | `HANDOFF.md:22` declara no corrido; nadie en esta sesión lo corrió | **PENDIENTE — bloqueado por precondición única** |

### Qué NO mostrar

- **Numeración inventada** (`B-001`, `FAC-001`, etc.).
- **Saldos calculados en frontend** sin marca de "estimado".
- **Tratar como deuda** u oferta no funcional (es justamente lo que
  este paquete vino a sacar).
- **Lista de comprobantes globales**: si se ve lista no filtrada por
  `companyId`+`surgeryId`, es regresión.
- **Anunciar la entrega como "runtime certificado"**: la aceptación
  browser final **no** fue ejecutada por Sol ni por mí. Decir
  "implementación validada; browser pendiente" es lo honesto.

### Bloqueo de ensayo visual (2026-10-02)

Ensayo visual del panel interior **no ejecutado en esta sesión** por
**una única precondición faltante**: sesión DEV autorizada disponible
para este reviewer (storageState válido + server DEV en marcha + ventana
exclusiva coordinada). Sin esa pieza no puedo hacer el preflight
mínimo de auth (navegar a ruta protegida o consultar `/api/me/companies`
esperando 200) ni capturar evidencia propia. Reporto y espero; **no
improviso credenciales, no arranco server, no toco Cajas**.

### Alternativa si algo falla en vivo

- Si el panel se queda en "Cargando…" sin respuesta: decir
  honestamente que la lectura backend no terminó; **no** narrar éxito.
- Si el panel muestra "No se pudieron cargar": mostrar el texto tal
  cual y evitar improvisar totales.
- Si las tarjetas superiores no se comportan: no es bloqueante para
  este paquete; **no** improvisar interpretación.

---

## 2. Ingreso → Autorización → Coordinador (Antigravity)

**Estado del paquete**: `released`, HANDOFF de cierre final publicado.
**Implementación validada** (25/25 tests, tsc 0 errores, walk-through
del último delta sin bloqueos nuevos propios). **Aceptación browser
pendiente** (no rerunada por nadie en esta sesión).

### Estado de aceptación

| Dimensión | Estado | Fuente |
| --- | --- | --- |
| LOCK | `released` | `LOCK.md` |
| HANDOFF | cierre final publicado | `HANDOFF.md` |
| Implementación (Vitest 25/25 + tsc 0) | **validada** | `HANDOFF.md:21-22, 41-42` (Antigravity, no rerunada por mí) |
| Último delta (uploading→queued) walk-through | sin bloqueos nuevos propios | `REVIEW.md` (este paquete) |
| Aceptación **browser** sobre runtime persistido | **PENDIENTE** | `HANDOFF.md:43` (no corrido por nadie en esta sesión) |

### Ruta planeada

1. Con sesión autorizada válida, abrir `/cirugias`.
2. Seleccionar empresa activa y cirugía con presupuesto en `Aprobado` y
   `cxStatus` distinto de `authorized`.
3. Tab Ficha → Comercial → `PresupuestoPanel` debe mostrar el botón
   **Autorizar CX** (PresupuestoPanel.tsx:312–317).
4. Click → `useCirugiaActions.handleAutorizar` →
   `setChangeStateDialogOpen(true)` → `ChangeStateDialog` se monta.
5. **Caso A — Autorización con archivo**: adjuntar archivo
   (JPEG/PNG/PDF), esperar a que `status: queued` (NO `uploading`),
   confirmar transición a `authorized`. Backend debe rechazar si
   está en `uploading`.
6. **Caso B — Excepción sin archivo**: marcar `No posee autorizado`
   → comentario literal `El usuario [actor]: confirma que no tiene
   una imagen de autorización`; transición a `authorized`.
7. **Recarga**: tras cualquiera de los dos casos, recargar la ficha;
   la autorización y el comentario deben sobrevivir.
8. **Notificación al coordinador**: verificar 1 inbox hit al
   `SurgeryContactAssignment` específico del coordinador (no broadcast).

### Resultado esperado y evidencia disponible

| Paso | Resultado esperado | Evidencia (validada por Antigravity) | Estado demo |
| --- | --- | --- | --- |
| Botón "Autorizar CX" visible | Aparece sólo con presupuesto `Aprobado` + cirugía no autorizada + `onAutorizar` | `PresupuestoPanel.tsx:312–317` | CONFIRMADO código; browser PENDIENTE |
| Cadena a `ChangeStateDialog` | `useCirugiaActions.handleAutorizar` → `setChangeStateDialogOpen(true)` | `useCirugiaActions.ts:295–298` | CONFIRMADO código; browser PENDIENTE |
| **Adjuntar archivo + autorizar** | Upload → `status: queued` → autorizar acepta; rechazar si `uploading` | `operational-document-upload.service.ts:57–110` + `surgery.service.ts:977–1003` + test caso 5 | CONFIRMADO código+test; browser PENDIENTE |
| **Excepción sin archivo** | Comentario literal `El usuario X: confirma que no tiene una imagen de autorización`; transición a `authorized` | `surgery.service.ts` query `entryType: "note"` con prefijo/contenido literal | CONFIRMADO código; browser PENDIENTE |
| Actor backend | `getApiAuthContext` / `ctx.actorUserId` / `currentUser` server-side; cliente nunca envía actor | walk-through previo | CONFIRMADO código; browser PENDIENTE |
| Notificación al coordinador | 1 inbox hit al `SurgeryContactAssignment` específico | walk-through previo | CONFIRMADO código; browser PENDIENTE |
| Recarga | Ingreso + autorización + comentario sobreviven | walk-through previo + persistencia transaccional | CONFIRMADO código; browser PENDIENTE |
| Retry | 0 comentarios/notificaciones duplicadas | walk-through previo | CONFIRMADO código; browser PENDIENTE |
| Aceptación browser final | Render contra backend real con datos persistidos | `HANDOFF.md:43` declara no corrido; nadie en esta sesión lo corrió | **PENDIENTE** |

### Qué NO mostrar

- **Aprobar presupuesto = autorizar cirugía**. Si el demo exhibe ese
  atajo, está mal.
- **Notificación broadcasteada**. Si no se garantiza el destinatario,
  decir "no se pudo identificar destinatario único; revisar
  manualmente".
- **Mock con `setItem`** mostrado como persistencia real.
- **Anunciar la entrega como "runtime certificado"**: la aceptación
  browser final no fue ejecutada por Antigravity ni por mí. Discurso:
  "implementación validada; browser pendiente".

### Bloqueo de ensayo visual (2026-10-02)

Ensayo visual del flujo completo **no ejecutado en esta sesión** por
**una única precondición faltante**: sesión DEV sintética autorizada
disponible para este reviewer (storageState válido + server DEV en
marcha + ventana exclusiva coordinada). Sin esa pieza no puedo hacer
el preflight mínimo de auth (navegar a una ruta protegida o consultar
`/api/me/companies` esperando 200) ni capturar evidencia runtime.
Reporto y espero; **no improviso credenciales, no arranco server, no
toco Cajas**. Budget 15 min permanece disponible cuando haya sesión.

---

## 3. Pasos comunes a toda demo

- **Sesión autenticada**: `SESSION_HANDOFF_MVP_DEMO_2026-10-02.md`
  indica que la sesión previa fue autenticada. Reutilizar
  `storageState` válido. Si expira: refresh manual headless y nuevo
  `storageState`. **Nunca** escribir usuario/clave/token en este
  checklist o en HANDOFF.
- **Build exclusivo**: ningún server de otra sesión debe caerse
  durante el ensayo. Coordinar ventana.
- **No commit, push, deploy** durante ni después de la demo.

---

## 4. Riesgos conocidos (no bloqueantes para la demo, sí para el discurso)

- Coordinación tiene PARTIAL previo (`RESUME_REVIEW.md`). Si la
  bandeja de coordinador se exhibe, **reconocerlo verbalmente**, no
  presentarlo como terminado.
- Movimientos/Cajas siguen PARTIAL; **no exhibir** como demos.
- DB_TESTS_BLOCKED intacto: no hay runtime DB de Cajas en este ensayo.
- **Sol browser**: implementación validada por tests con HTTP mockeado;
  no se ejecutó browser real sobre datos persistidos en esta sesión.
  Discurso honesto: "validado en código y test; browser pendiente".

---

## 5. Plantilla para completar tras HANDOFF

```md
### Entrega X — paquete YYYYY
- HANDOFF.md presente: ☐ sí / ☐ no
- Hash final OK vs baseline: ☐ sí / ☐ no
- Self-review previa: ☐ sí / ☐ no — veredicto: ...
- Mi delta walk-through: CHECKS …
- Bloqueos nuevos propios: ☐ sí (lista) / ☐ no
- Implementación validada: ☐ sí / ☐ no
- Aceptación browser: ☐ sí / ☐ no
- Pasos confirmados: [lista]
- Pasos NOT confirmed: [lista con alternativa honesta]
```

Esto se completará al cierre de cada paquete, **no antes**.