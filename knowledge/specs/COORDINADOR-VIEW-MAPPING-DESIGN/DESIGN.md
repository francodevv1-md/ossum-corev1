# Design — COORDINADOR-VIEW-MAPPING-DESIGN

Status: designed  
Change: `COORDINADOR-VIEW-MAPPING-DESIGN`  
Workspace: `E:/OSSUM_COR_PROJECT`

---

## 1. Goal

Definir una vista futura de Coordinador usando como origen operativo principal del estado CX `surgery.state` y, de forma independiente, `surgery.prepStatus`, sin crear estados nuevos ni cambiar modelo de datos.

La vista debe responder rápido:

- qué casos ya son responsabilidad operativa del coordinador;
- cuáles siguen pendientes de preparar o destrabar;
- cuáles ya salieron / fueron entregados;
- cuáles ya cerraron el tramo coordinable.

---

## 2. Source of truth used in this design

### 2.1 Campos base

- `surgery.state` para el estado CX general
- `surgery.prepStatus` para el subestado de preparación/material
- `surgery.coordinadorCx`

### 2.2 Campos de apoyo permitidos

- `surgery.fechaAutorizacion` para SLA proxy
- `surgery.date` / `time` para priorización operativa
- `surgery.fechaEnvioMaterial` y/o `logistics.fechaEnvioMateriales` para contexto visual

### 2.3 Restricción

No se propone ningún bucket que requiera un estado nuevo en DB o un campo nuevo obligatorio.

---

## 3. Proposed bucket mapping

## 3.1 Reglas de inclusión previas

La vista de Coordinador debe mostrar solo cirugías con:

- `coordinadorCx` asignado y distinto de `"Sin asignar"`; y
- estado no cancelado/suspendido por default.

`Suspendida` y `Cancelada` pueden quedar fuera del tablero principal y entrar en filtro secundario “Detenidas”.

## 3.2 Buckets exactos

`Pendiente` es el estado CX general para los casos que aún no avanzaron por una transición CX. `prepStatus = "preparing"` se presenta únicamente como `Preparación: En preparación`; no cambia el estado CX ni ingresa por sí solo un caso a otro bucket.

### A. `Autorizado`

Incluye cirugías coordinables todavía no cerradas ni efectivamente en tránsito final:

1. `state = "Autorizada"`
2. `state = "Pendiente"` **solo si** `autorizado = true`
3. `state = "Pendiente"` con `prepStatus` ausente, `"preparing"`, `"frozen"` o `"frozen_with_missing"`, cuando corresponda por la autorización real del caso.

### B. `En tránsito`

Incluye casos donde el material/salida ya pasó el punto de preparación local:

1. `state = "En tránsito"`
2. `prepStatus = "delivered"` puede mostrarse como contexto de material, pero no mueve un caso con estado CX `Pendiente` a este bucket. El ingreso requiere el estado CX general `En tránsito`.

### C. `Finalizado`

Incluye cierre del tramo coordinable:

1. `state = "Realizada"`
2. `state = "Sin consumo"`
3. `state = "Finalizada"`
4. `prepStatus = "returned"` puede señalar un pendiente de conciliación, pero no finaliza ni cambia el estado CX general. Un caso `Pendiente` con material retirado debe verse como inconsistencia operativa a corregir, no como una transición automática a `Finalizado`.

---

## 4. Subestados internos dentro de `Autorizado`

Estos no son nuevos estados persistidos. Son labels de priorización derivados:

1. **Recién autorizado**
   - `state = "Autorizada"`

2. **Programado sin preparar**
   - `state = "Pendiente"`
   - `prepStatus` ausente

3. **En preparación**
   - `state = "Pendiente"`
   - `prepStatus = "preparing"`; se muestra como subestado de preparación, nunca como estado CX

4. **Congelado**
   - `prepStatus = "frozen"`

5. **Congelado con faltantes**
   - `prepStatus = "frozen_with_missing"`
   - subestado más crítico del bucket

6. **Material entregado / pendiente de transición CX**
   - `state = "Pendiente"`
   - `prepStatus = "delivered"`
   - visualmente conviene alertarlo como borde operativo, pero debe permanecer en su bucket definido por estado CX hasta una transición CX explícita.

Prioridad sugerida dentro de `Autorizado`:

`Congelado con faltantes` → `Recién autorizado` SLA vencido → `Programado sin preparar` → `Congelado`

---

## 5. SLA logic

## 5.1 SLA que sí puede existir hoy

SLA operativo base: **48 horas corridas desde `fechaAutorizacion`** para todo caso con coordinador asignado que todavía permanezca en bucket `Autorizado`.

Semáforo:

- **OK**: menos de 24 hs
- **Atención**: 24 a <48 hs
- **Vencido**: 48 hs o más

Cumplimiento del SLA:

- el SLA deja de correr cuando el caso sale de `Autorizado` y entra en `En tránsito` o `Finalizado`.

## 5.2 Limitación importante

Esto mide **demora desde autorización**, no desde la **asignación exacta al coordinador**.

Hoy no existe en `Surgery` un campo explícito tipo `assignedAt/coordinatorAssignedAt`. En el store sí hay audit event de “Cambio de coordinador”, pero no está planteado como fuente canónica estable para una regla SLA futura.

## 5.3 Regla recomendada para validación

- **Versión usable ahora**: SLA 48 hs desde `fechaAutorizacion`.
- **Versión exacta futura**: SLA 48 hs desde fecha/hora real de asignación al coordinador cuando exista fuente canónica persistida.

---

## 6. Suggested CTA/actions

Acciones mínimas por card o quick panel:

1. **Abrir expediente**
2. **Ir a Seguimiento**
3. **Cambiar fecha/hora**
4. **Actualizar preparación**
5. **Ver logística**
6. **Agregar novedad / evidencia**

Acciones contextuales por bucket:

### En `Autorizado`

- Cambiar fecha
- Registrar seguimiento
- Ir a Ficha / Logística
- Editar preparación

### En `En tránsito`

- Abrir logística
- Ver remito/salida
- Registrar novedad o evidencia de entrega

### En `Finalizado`

- Abrir expediente
- Ir a consumo/documentación
- Registrar cierre o pendiente residual

No recomendar como CTA principal en esta vista:

- facturar;
- acciones comerciales profundas;
- edición masiva de datos no operativos.

---

## 7. Reuse plan

## 7.1 Shell / navegación

- Reutilizar `ExpedienteFullView` como vista profunda del caso.
- Mantener apertura directa desde la card del coordinador.

## 7.2 Componentes útiles ya existentes

- `src/components/expediente/ExpedienteFullView.tsx`
- `src/components/expediente/NovedadesTabContent.tsx`
- `src/components/expediente/LogisticaPanel.tsx`
- `src/components/cirugias/dialogs/ChangeDateDialog.tsx`
- acciones ya expuestas desde `useCirugiaActions`

## 7.3 Qué reutilizar para cada necesidad

- **chat/seguimiento** → `NovedadesTabContent` / `useSeguimientoFeed`
- **preparación / salida / retorno** → `LogisticaPanel`
- **cambio de fecha/hora** → `ChangeDateDialog`
- **navegación completa del caso** → `ExpedienteFullView`

No conviene volver al drawer legacy del módulo coordinadores.

---

## 8. Reglas mínimas de visualización para chat interno / seguimiento

La vista de Coordinador no debe inventar un chat paralelo. Debe mostrar una versión resumida del seguimiento real del expediente.

Mínimos visuales:

1. Mostrar **última novedad** en la card o preview.
2. Mostrar si la última entrada fue:
   - nota
   - evidencia de autorización
   - archivo/foto
   - correo destacado
3. Mostrar timestamp relativo o fecha corta.
4. Mostrar highlight si la entrada tiene prioridad alta / destacada.
5. CTA directo: **“Ver seguimiento”** o abrir expediente en tab `novedades`.

Límites:

- no usar Historial técnico como sustituto del seguimiento;
- no duplicar Correo completo dentro de la card;
- no convertir la vista de Coordinador en inbox de chat en tiempo real.

---

## 9. Open risks / validation points

1. `prepStatus = "returned"` es un subestado de material independiente; producto debe confirmar si necesita una vista separada de “Post cirugía” sin convertirlo en cierre CX.
2. El SLA exacto “desde asignación al coordinador” no es medible de forma canónica solo con `Surgery` actual.
3. `Pendiente` hoy puede existir con `autorizado = false`; por eso la regla de bucket debe chequear autorización real y no solo nombre de estado.
4. `prepStatus = "returned"` puede aparecer antes de que el estado CX se actualice; la UI debe marcarlo como inconsistencia operativa visible, sin inferir una transición ni un cierre CX.

---

## 10. Validation recommendation for Franco

Validar solo estas cuatro decisiones antes de implementar:

1. Si `Realizada` ya entra en `Finalizado` para Coordinador.
2. Si `Suspendida/Cancelada` quedan fuera por default.
3. Si el SLA provisional puede correr desde `fechaAutorizacion`.
4. Si la entrada principal a seguimiento debe abrir expediente completo o una surface compacta con `Novedades` + `Logística`.
