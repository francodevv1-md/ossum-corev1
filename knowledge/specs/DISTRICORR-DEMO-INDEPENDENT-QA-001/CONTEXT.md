# Criterios de revisión — CHECKS PRIORITARIOS

Mapeo de cada ítem del task → archivos a inspeccionar → evidencia
mínima esperada → patrones rojos. **Se aplica cuando el owner libera
archivos.** Sin HANDOFF.md no se certifica nada.

---

## A. Coordinador persistido por ID, sin confusión User/Contact

**Antigravity** — `NewSurgeryDialog.tsx`, `backend-surgeries.ts`,
`surgery.service.ts`, `surgery.validator.ts`.

- ¿Las relaciones usan `SurgeryContactAssignment` / `contactAssignments` /
  `coordinadorContactId` por **id**?
- ¿Hay `requireCompanyReadAccess` en los routes?
- Patrones rojos:
  - Comparación `currentUser.id === s.coordinadorContactId` (User vs Contact).
  - `coordinadorContactoId` o nombres (label match) en lugar de ID.
  - Lookup de coordinador por substring de nombre.
- Referencia cruzada: `RESUME_REVIEW.md` §"Coordinator identity
  unresolved" — antecedente directo.

---

## B. Autorizar cirugía ≠ aprobar presupuesto

**Antigravity** — `ChangeStateDialog.tsx`, hook de autorización,
endpoint `surgeries/[s]/status`.

- ¿El camino a estado `Autorizada` exige evidencia/checkbox de excepción?
- ¿Aprobar un presupuesto dispara `Autorizada`? (NO debe.)
- Patrones rojos:
  - Botón "Aprobar presupuesto" que cambia estado de cirugía.
  - Status update sin exigir archivo o excepción.
  - Mensaje de éxito en presupuesto que dice "Cirugía autorizada".

---

## C. Archivo guardado o excepción explícita antes de autorizar

**Antigravity** — `ChangeStateDialog.tsx`, `seguimiento/[entryId]/
authorization-evidence` route, validador.

- ¿El cliente exige voucher **o** checkbox `No posee autorizado` antes
  de enviar?
- ¿Backend revalida evidencia o excepción antes de transicionar?
- Patrones rojos:
  - "Autorizar" habilitado sin archivo ni checkbox.
  - Éxito local con `fetch` que dio 4xx/5xx.
  - Backend acepta transición sin evidencia si cliente miente.

---

## D. Historial/comentario atribuidos al actor backend

**Antigravity** — `ChangeStateDialog.tsx`, `useCirugiaActions.ts`,
route POST de comentario.

- ¿Actor proviene de `getApiAuthContext` / `ctx.actorUserId` /
  `currentUser` **server-side**?
- ¿Cliente nunca envía `actorUserId`/`actorName` que el backend
  reescribiría?
- Patrones rojos:
  - Body con `actorUserId`/`actorContactId` controlado por el cliente.
  - Comentario sin actor (autor = sistema o null).

---

## E. Fallos no producen éxito local ni pérdida del formulario

**Antigravity** — `useCirugiaActions.ts`, dialogs, hooks de mutación.

- ¿Si fetch falla: se muestra error y se preserva el form?
- ¿Post-fallo: NO se marca autorizado localmente?
- Patrones rojos:
  - `onSuccess` corre antes que `response.ok`.
  - Cierre del modal sin esperar respuesta.
  - Estado de éxito actualizado con respuesta parcial/error.
- Antecedente directo: `RESUME_REVIEW.md` §"Partial-note feedback
  incomplete" — `CaseDetailModal.tsx:86–90`, `DefineDateModal.tsx:310–327`.

---

## F. Notificación al destinatario correcto, sin inventar políticas

**Antigravity** — handler de autorización, integración con
notificaciones.

- ¿Notifica al `SurgeryContactAssignment` específico del coordinador?
- ¿Si no hay assignment seguro, reporta bloqueo en vez de broadcastear?
- Patrones rojos:
  - Broadcast a "todos los coordinadores".
  - Lookup de coordinador por rol/perfil permisivo.
  - Inventar destinatario cuando el assignment falta.

---

## G. Retries no duplican efectos

**Antigravity** — hooks de mutación, route.

- ¿Backend idempotency-key o deduplicación de comentarios?
- ¿Cliente evita doble POST (botón disabled mientras pending)?
- Patrones rojos:
  - `onClick` no previene doble submit.
  - Comentario duplicado por retry de red.
  - Notificación duplicada al reintentar.

---

## H. Comprobantes usan empresa + ID backend de cirugía

**Sol** — `ComprobantesAsociados.tsx`, `useSurgeryComprobantes.ts`,
cliente HTTP usado.

- ¿URL incluye `[companyId]` y `surgeryId`?
- ¿Lista filtrada por empresa y cirugía, no global?
- Patrones rojos:
  - Fetch sin `companyId` o sin `surgeryId`.
  - Cache compartido entre cirugías distintas.
  - Lista del panel mezcla resultados de otra cirugía.

---

## I. Borrador/Emitida diferenciados; sin numeración/saldos inventados

**Sol** — `ComprobantesAsociados.tsx`, hook.

- ¿Estados `borrador` vs `emitida` mostrados con su distinción visual
  o semántica?
- ¿Numeración mostrada solo si viene del backend?
- ¿Saldos/totales no son calculados en frontend?
- Patrones rojos:
  - Numeración hardcodeada o `B-${i+1}`.
  - Total calculado en cliente.
  - Mostrar "Pagada" sin evidencia backend.

---

## J. Cambio de empresa/cirugía no mezcla respuestas anteriores

**Sol** — `useSurgeryComprobantes.ts`.

- ¿Hook reinicia estado cuando cambia `companyId`/`surgeryId`?
- ¿Hay cleanup de request en flight al cambiar contexto?
- Patrones rojos:
  - Race condition: respuesta vieja gana sobre nueva.
  - Lista persiste al cambiar de cirugía.
- Antecedente directo: `RESUME_REVIEW.md` §"Calendar mutation scope
  unguarded", "Notification rollback unguarded".

---

## K. Ningún fallback mock se presenta como persistencia real

**Ambos paquetes**.

- ¿Hay `localStorage`/Zustand/`mock` reemplazando backend real?
- ¿Si backend falla: UI dice "no se pudo guardar" (no "guardado")?
- Patrones rojos:
  - `setItem(...)` simulando persistencia.
  - Mensaje verde tras error.
  - "Guardado localmente" mostrado como éxito.

---

## Otros antecedentes a respetar

- `RESUME_REVIEW.md` ya dejó Coordinadores con identidad, filtros
  temporales, feedback de notas y scope asíncrono PARTIAL. **No reabro
  esos hallazgos sin evidencia nueva**; pero si el delta de
  Ingreso/Autorización/Coordinador los toca, queda observado.
- `MVP-DEMO-RUNBOOK-001/RESUME_REVIEW.md`/`RESUME_HANDOFF.md`
  certificaron `Movements/Cajas` PARTIAL y `DB_TESTS_BLOCKED` intacto.
  No investigo el incidente Cajas.

---

## Veredicto por paquete

| Estado | Significado |
| --- | --- |
| **READY** | Lock = released, HANDOFF presente, hashes final == baseline, hallazgos de checks A–K cerrados o no aplican con justificación. |
| **PARTIAL** | Lock = released, HANDOFF existe; hay hallazgos abiertos en A–K; bloqueos acotados documentados. |
| **BLOCKED** | Lock ≠ released, OR no hay HANDOFF, OR hashes cambian post-release, OR hallazgo crítico sin workaround honesto. |

Hoy, **ambos son los paquetes BLOCKED por owner-state**: edición y
reservación sin HANDOFF.md.