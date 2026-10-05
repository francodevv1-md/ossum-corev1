# REVIEW — DISTRICORR-DEMO-INDEPENDENT-QA-001

**Estado**: PENDING REVIEW (no certificación propia).
**Effective model**: minimax/MiniMax-M3.
**Fecha**: 2026-10-02.
**HEAD**: `73e3e1b4b930fa0bc4bf44636c78529d73b33208`.

---

## Resumen ejecutivo

| Paquete | Owner | Lock actual | HANDOFF.md | Mi veredicto |
| --- | --- | --- | --- | --- |
| `SURGERY-COMPROBANTES-BACKEND-READ-DEV-001` (Comprobantes backend) | Sol | `released` | sí + VALIDATION + REVIEW propia | **Implementación validada** por Sol + self-review; **aceptación browser pendiente** (no rerunada por mí) |
| `DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001` (Ingreso→Autorización→Coordinador) | Antigravity | `released` | sí (cierre final) | **Implementación validada** (25/25 + tsc 0 errores); **delta final** (uploading→queued) walk-through sin bloqueos nuevos propios; **aceptación browser pendiente** |

Convenciones:
- **PENDING REVIEW** = "todavía no hay nada certificado por mí". No
  implica aceptación. Se usa para evitar tanto el "BLOCKED" veredicto
  funcional (no es lo que pide esta tarea) como un READY/PARTIAL
  prematuro sin HANDOFF.
- No reabro hallazgos ya cerrados por `RESUME_REVIEW.md` salvo
  evidencia nueva del delta actual.
- No reporto "espera administrativa" como hallazgo. Solo bloqueos
  nuevos confirmados en código propio.

---

## Sol — `SURGERY-COMPROBANTES-BACKEND-READ-DEV-001`

### Coordinación con la revisión en curso

- Sol ya entregó HANDOFF + VALIDATION (Vitest 11/11, TypeScript
  Diagnose cycle 1 OK.
- Self-review `characteristic-purple-nightingale` (read-only) → "No
  blocking findings" sobre panel, hook, contrato de clientes y
  allowlist GET-only.
- Mi rol: revisar el delta contra mis CHECKS H/I/J/K y reportar
  bloqueos nuevos no cubiertos por esa previa. **No duplico** QA de
  tests ni reruns.

### Delta observado (working tree vs baseline)

| Archivo | Cambio |
| --- | --- |
| `src/components/expediente/ComprobantesAsociados.tsx` | −369 / +62 líneas. Reemplaza panel legacy por vista backend-readonly. Retiene firma del caller; ignora props legacy (`comprobantes`, `presupuestos`, `resumenCobranza`). |
| `src/hooks/useSurgeryComprobantes.ts` (nuevo) | 57 líneas. Snapshot keyed `[companyId, surgeryId, revision]`. Validación por fila de scope. Stale-response cleanup. |
| `src/__tests__/components/ComprobantesAsociados.http.test.tsx` (nuevo) | 191 líneas. 11 tests sobre HTTP mockeado + clientes reales. |

Hashes finales working tree coinciden con `VALIDATION.md` línea 36-38.

### Walk-through contra CHECKS PRIORITARIOS (mi delta)

#### CHECK H — Comprobantes usan empresa + ID backend de cirugía

- Componente línea 30: `useSurgeryComprobantes(activeCompany?.id, surgery.backendId)` — usa `backendId`, no `id` frontend.
- Hook línea 21: `if (!companyId || !surgeryId) return` — sin ambos IDs no fetcha.
- Hook línea 37: valida que `row.companyId === companyId && row.surgeryId === surgeryId` y **falla con error explícito** si backend devuelve datos cruzados.
- Test línea 178-190 cubre explícitamente "rejects mismatched response scope".

**Resultado H: cubierto por delta + test.**

#### CHECK I — Borrador/Emitida diferenciados; sin numeración/saldos inventados

- Componente línea 79: `<Badge variant={row.state === "Borrador" ? "outline" : "secondary"}>{row.state}</Badge>` — distinción visual + texto.
- Componente línea 77: `row.number == null ? "Sin numeración" : row.number` — sin numeración inventada.
- Componente línea 81: presupuestos → "No aplica" (no deuda); facturas → `money(fv.balance, currency)`.
- Componente línea 22-26 `money()`: si valor es null/undefined/vacío/no-finito → "No disponible"; si es número válido, lo formatea. **No inventa**.
- Test línea 104-115 cubre "drafts, ausencia de numeración, saldo ausente vs cero".

**Resultado I: cubierto por delta + test.**

#### CHECK J — Cambio de empresa/cirugía no mezcla respuestas anteriores

- Hook línea 17: `key = JSON.stringify([companyId, surgeryId, revision])` — scope en la clave del snapshot.
- Hook línea 23: al entrar al effect, `setSnapshot({ key, status: "loading", ... })` — reset sincrónico.
- Hook línea 22, 36, 43: `cancelled` flag para descartar respuestas tardías.
- Hook línea 49: `snapshot.key === key ? snapshot : { status: "loading", ... }` — oculta snapshot previo antes del effect.
- Test línea 160-176 cubre "discards late responses after changing %s (error=%s)" — incluye respuestas tardías exitosas **y** errores tardíos.
- Test línea 178-190 cubre "hides already loaded rows on scope change".

**Resultado J: cubierto por delta + test.**

#### CHECK K — Ningún fallback mock se presenta como persistencia real

- Sin `localStorage`/`Zustand`/`setItem`.
- Componente línea 62: `<div role="alert">No se pudieron cargar los comprobantes.</div>` — error honesto.
- Test línea 134-144 cubre "fails closed for %s errors and retries without local fallback".
- HANDOFF línea 9: "No legacy-prop fallback, mixed-stage aggregate debt, fake actions, or fiscal-evidence action."

**Resultado K: cubierto por delta + test.**

### Bloqueos nuevos confirmados propios

**Ninguno**.

Las observaciones que pude haber profundizado (sincronización del
`cancelled` en paginación budgets; diferenciación visual por variantes
de badge; tolerancias a `state` inesperado del backend) son **detalles
no bloqueantes** ya cubiertos o son materia de la previa.

### Notas honestas sobre los límites de mi revisión

- **No reruné tests, TypeScript, ni browser**. Cito los del HANDOFF de
  Sol como ejecución ajena, no mía.
- **No ejecuté DB**. El paquete es read-only contra backend real; su
  runtime browser/ruta no está certificada por mí.
- Mi certificación queda en "**PENDING REVIEW**" porque no hay entrega
  aceptada runtime por nadie de esta sesión; el panel puede exhibirse
  como lectura en demo pero el dato persistido sigue siendo
  responsabilidad del flujo Presupuestación/Facturación que no es
  materia de esta entrega.

### Snapshot integrado (posterior al release de Sol)

Re-leí el árbol del expediente por una versión posterior al snapshot
de Sol. Esto **no** toca el paquete Sol (hashes de los 3 archivos ownados
siguen iguales a `VALIDATION.md:36-38`) pero sí cambia el contexto
donde se exhibe.

#### Cambios observados (working tree, dirty)

| Archivo | Estado | Cambio relevante |
| --- | --- | --- |
| `src/components/expediente/ComercialTabContent.tsx` | dirty | Ahora monta `PresupuestoPanel` con `onAutorizar` y `ComprobantesAsociados` en un `SectionCard` titulado "Comprobantes asociados". **Tarjetas legacy retiradas** (ya no aplica la exclusión del HANDOFF de Sol §Risks). |
| `src/components/expediente/PresupuestoPanel.tsx` | dirty | Botón **Autorizar CX** en `PresupuestoPanel.tsx:312–317`. Aparece sólo si presupuesto `Aprobado` + cirugía `!autorizado` + se pasó `onAutorizar`. |
| `src/components/expediente/ExpedienteFullView.tsx` | dirty | Propaga `onAutorizar` → `ComercialTabContent` → `PresupuestoPanel`. |
| `src/components/expediente/ExpedienteHeader.tsx` | dirty | `setChangeStateDialogOpen(true)` en línea 314 — botón legacy de cambio de estado (genérico), **distinto** del botón "Autorizar CX" del PresupuestoPanel. |
| `src/components/expediente/LogisticaTabContent.tsx` | dirty | No relevante a este paquete. |

#### Ruta trazada a "Autorizar CX" (conexiones, no runtime)

```
/cirugias → ExpedienteFullView (cirugias/page.tsx:434)
  ├─ onAutorizar={actions.handleAutorizar} (línea 464)
  ├─ ComercialTabContent (ExpedienteFullView:425–429)
  │   └─ PresupuestoPanel (ComercialTabContent:57–62)
  │       └─ Button onClick={() => onAutorizar?.(surgery)} (PresupuestoPanel:313)
  └─ actions.handleAutorizar (useCirugiaActions.ts:295–298)
      └─ setChangeStateDialogOpen(true)
          └─ <ChangeStateDialog /> abierto
```

La cadena llega al diálogo. El **contenido** del diálogo (voucher,
checkbox de excepción, actor backend, persistencia) sigue bajo el
paquete `DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001` (Antigravity,
sin HANDOFF al cierre de esta sesión). No certifico ese tramo.

#### Bloqueos nuevos confirmados propios (en este snapshot integrado)

**Ninguno sobre el panel de Comprobantes**. Las modificaciones del
padre son compatibles con el contrato de props retenido por Sol
(`comprobantes`, `presupuestos`, `resumenCobranza` siguen siendo
aceptados aunque el panel interior los ignora).

**Sobre el flujo "Autorizar CX"**: el botón y la cadena están
conectados en código; no hay nada en el árbol integrado que rompa el
camino al `ChangeStateDialog`. El paquete Antigravity sigue siendo
PENDING REVIEW propio — sin HANDOFF ni diff estable.

---

## Antigravity — `DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001`

### Estado

- LOCK.md status: **`released`**.
- HANDOFF publicado (cierre final, mtime 2026-10-02 13:25).
- Implementación declarada: 25/25 tests pasando en 5 suites, tsc 0 errores.

### Delta del cierre (lo único que revisé, por instrucción de Franco)

Comparé el último delta contra hashes baseline registrados en
`OWNERSHIP.md`. Cambios detectados:

| Archivo | Hash baseline | Hash working tree | Cambio |
| --- | --- | --- | --- |
| `src/components/cirugias/dialogs/ChangeStateDialog.tsx` | `3d304601...` | `5100a33b...` | modificado |
| `src/hooks/useCirugiaActions.ts` | `dc81ad8c...` | `cef9f919...` | modificado |
| `src/lib/services/surgery.service.ts` | `3b1eb22b...` | `ef0feb2a...` | modificado |
| `src/lib/validators/surgery.validator.ts` | `66b2ce7...` | `c334445e...` | modificado |
| `src/__tests__/unit/surgeries-intake-authorization.test.ts` | (no existía) | `6960f097...` | nuevo |
| `src/__tests__/unit/authorization-producer-consumer.test.ts` | (no existía) | `85d59247...` | nuevo |
| `src/lib/services/operational-document-upload.service.ts` | (no existía) | `23970634...` | nuevo |
| `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` | `0ef50866...` | `0ef50866...` | sin cambio |
| `src/lib/api/backend-surgeries.ts` | `008104db...` | `008104db...` | sin cambio |

### Walk-through del delta

#### Cambio A — `operational-document-upload.service.ts` (nuevo)

Líneas 57–71: la entrada inicial de seguimiento se crea como
`entryType: "document_evidence"` con `status: "uploading"`. **No**
 se marca como `authorization_evidence`.

Líneas 73–95: sólo cuando `storage.upload()` retorna con éxito (`etag`
presente), la entrada se promueve a `authorization_evidence` con
`status: "queued"`, `action: "authorization_recorded"`,
`documentType: "authorization"`, y persiste `objectKey`/`etag`.

Líneas 102–110: si storage falla, la entrada queda como
`document_evidence` con `status: "upload_failed"`. **Nunca**
 se promueve a `authorization_evidence`.

#### Cambio B — `surgery.service.ts` (modificado)

Líneas 977, 983, 997, 1003: la query de "evidencia previa a autorizar"
ahora excluye explícitamente tanto `upload_failed` como `uploading`
(antes solo excluía `upload_failed`). Esto cierra el bug: una entrada
en `uploading` ya **no** cuenta como evidencia para autorizar.

#### Cambio C — `authorization-producer-consumer.test.ts` (nuevo)

Prueba conectada productor-consumidor. Caso 5 (mencionado en HANDOFF):
1. `uploadOperationalDocument` en `uploading` → autorizar rechaza con
   `surgery_authorization_evidence_required`.
2. Storage completa → `status: "queued"` + `etag` → autorizar acepta.

### Cobertura contra CHECKS del paquete

| Check | Estado | Evidencia |
| --- | --- | --- |
| A (User/Contact) | sin cambio en este delta | walk-through previo |
| B (aprobar presupuesto ≠ autorizar) | sin cambio en este delta | walk-through previo |
| **C (archivo guardado o excepción)** | **reforzado** | `surgery.service.ts:977/983/997/1003` excluye `uploading`/`upload_failed`; `operational-document-upload.service.ts` solo promueve a `authorization_evidence` con `status: queued` |
| D (actor backend) | sin cambio en este delta | walk-through previo |
| **E (fallos no producen éxito local ni pérdida del form)** | **reforzado** | si `storage.upload` falla, entrada queda `upload_failed` y NO cuenta como evidencia; autorización es rechazada |
| F (notificación al coordinador correcto) | sin cambio en este delta | walk-through previo |
| G (retries no duplican efectos) | sin cambio en este delta | walk-through previo |
| K (sin fallback mock) | **sin `localStorage`/`setItem` en dialogs** | `grep` en `cirugias/dialogs/*.tsx` no encuentra |

### Bloqueos nuevos confirmados propios

**Ninguno**. El fix del uploading es coherente: cierra el bug sin
introducir mocks, mantiene la atomicidad con backend Prisma, conserva
el camino de excepción por nota, y queda con test que cubre el caso
conectado (productor que sube + consumidor que autoriza).

### Notas honestas sobre los límites de mi revisión

- **No reruné los 25 tests de Antigravity ni tsc**. Cito los del
  HANDOFF como ejecución ajena, no mía.
- **No ejecuté browser real ni DB**. La implementación queda
  **validada** por suites unitarias + productor-consumidor con storage
  diferido y mocks transaccionales (HANDOFF §Validations).
- **El bloqueo de Cajas se respeta** (HANDOFF §Validations): suites
  Cajas DB intactas y bloqueadas.

---

## Decisión final de esta sesión

- **Sol**: **implementación validada** por Sol (11/11 Vitest +
  TypeScript) y por self-review `characteristic-purple-nightingale`
  (sin bloqueantes). Mi walk-through de los CHECKS H/I/J/K no
  encontró bloqueos nuevos propios. **Aceptación browser final sobre
  datos persistidos queda PENDIENTE** (no rerunada por nadie en esta
  sesión, declarado por Sol en `HANDOFF.md:22`). Snapshot estable:
  hashes working tree coinciden con `VALIDATION.md:36-38`.
- **Antigravity**: **implementación validada** por Antigravity (25/25
  tests, tsc 0 errores). Mi walk-through del **último delta** (uploading
  → queued) confirma el fix coherente del bloqueo y la prueba
  conectada; **sin bloqueos nuevos propios**. Aceptación browser
  final **PENDIENTE** (no rerunada por nadie en esta sesión).
- **Ensayo visual solicitado** (autorización con archivo, excepción
  sin archivo, recarga, notificación al coordinador, Comprobantes):
  **no ejecutado en esta sesión**. **Una única precondición
  faltante**: sesión DEV sintética autorizada disponible para este
  reviewer (storageState válido + server DEV en marcha + ventana
  exclusiva coordinada). Sin eso no se puede superar el preflight
  mínimo de auth (ruta protegida o `/api/me/companies` esperando 200)
  ni capturar evidencia runtime. No improviso credenciales, no
  arranco server, no toco Cajas. Budget 15 min permanece disponible
  cuando haya sesión.

---

## Evidencia propia separada de resultados reportados por el owner

- **Para Sol**: mi walk-through cubre los 4 CHECKS del paquete contra
  código y test reales del working tree. Las verificaciones a nivel
  test (línea 188 `rejects mismatched response scope`, línea 174
  `discards late responses`) son evidencia propia leída del código,
  no reportadas por el owner.
- **Para Antigravity**: sin evidencia propia; sólo baseline.
- No cito `RESUME_REVIEW.md` como hallazgo nuevo; lo respeto como
  antecedente cerrado.

---

## Riesgos

- **R1**: Si el árbol dirty que afecta archivos shared
  (`backend-surgeries.ts`, `useCirugiaActions.ts`,
  `surgery.validator.ts`) cambia antes del release de Antigravity, los
  hashes baseline quedan obsoletos. Política: recapturar al inicio
  de la sesión de certificación.
- **R2**: Si el owner de Antigravity entrega READY sin HANDOFF,
  mantengo "PENDING REVIEW" hasta ver diff estable + HANDOFF.
- **R3**: Coordinación tiene PARTIAL previo (`RESUME_REVIEW.md` §1)
  que **no reabro** salvo evidencia nueva. Si el delta toca
  identidad User/Contact del coordinador, queda observado como
  antecedente.
- **R4**: En el demo, **no improvisar**: si el paquete sigue sin
  HANDOFF, exhibir la versión previa con disclaimer; nunca inventar
  destinatarios, números ni totales.

---

## Decisión final de esta sesión

- **Sol**: **implementación validada** por Sol (11/11 Vitest +
  TypeScript) y por self-review `characteristic-purple-nightingale`
  (sin bloqueantes). Mi walk-through de los CHECKS H/I/J/K no
  encontró bloqueos nuevos propios. **Aceptación browser final sobre
  datos persistidos queda PENDIENTE** (no rerunada por nadie en esta
  sesión, declarado por Sol en `HANDOFF.md:22`). Snapshot estable:
  hashes working tree coinciden con `VALIDATION.md:36-38`.
- **Ensayo visual solicitado**: **no ejecutado en esta sesión**.
  **Una única precondición faltante**: sesión DEV autorizada
  disponible para este reviewer (storageState válido + server DEV en
  marcha + ventana exclusiva coordinada). Sin eso no se puede
  superar el preflight mínimo de auth (ruta protegida o
  `/api/me/companies` esperando 200) ni capturar evidencia propia.
  No he improviso credenciales, no arranco server, no toco Cajas.
  Budget 20 min permanece disponible cuando haya sesión.
- **Antigravity**: PENDING REVIEW. Sin HANDOFF, sin delta revisable.
- Próxima acción: cuando el owner de Antigravity entregue
  correcciones + libere HANDOFF + hashes coincidan con baseline
  capturado, ejecutar walk-through de CHECKS A-G + K y reportar
  hallazgos nuevos.