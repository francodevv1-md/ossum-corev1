# Design — COORDINADORES-ADMIN-REDESIGN-PHASE1-DESIGN

Status: designed  
Change: `COORDINADORES-ADMIN-REDESIGN-PHASE1-DESIGN`  
Workspace: `E:/OSSUM_COR_PROJECT`

---

## 1. Goal

Redefinir `/coordinadores` como **vista ADMIN/global de supervisión operativa** y no como bandeja personal del coordinador.

Fase 1 debe:

- conservar la lógica actual de clasificación por estado;
- hacer más clara la lectura gerencial/operativa;
- evitar duplicar seguimiento, notas o lógica de expediente;
- dejar una base limpia para Fase 2 y Fase 3.

---

## 2. Relectura del módulo actual

La implementación actual ya tiene la base correcta para Fase 1:

- buckets `Autorizado` / `En tránsito` / `Finalizado`;
- subgrupos operativos dentro de `Autorizado`;
- SLA proxy;
- resumen por coordinador;
- acceso a `Gestión`, `Seguimiento`, `Logística` y `Expediente`.

El cambio principal no es de motor, sino de **jerarquía visual y framing**:

- antes: parece tablero de trabajo del coordinador;
- ahora: debe leerse como **panel de supervisión global** para ver carga, riesgo y distribución.

---

## 3. Positioning UX: admin global vs coordinador personal

### Admin/global

Debe priorizar:

- volumen total visible;
- dónde está el riesgo;
- qué coordinador está cargado o atrasado;
- qué casos necesitan destrabe;
- acceso rápido al caso sin convertir la pantalla en inbox.

### No debe priorizar

- sensación de “mi bandeja”;
- escritura intensiva desde cards;
- notas paralelas;
- pipeline financiero/documental.

### Decisión UX

La home de `/coordinadores` debe responder primero:

1. cuántos casos requieren atención ahora;
2. quién los tiene;
3. en qué tramo operativo están;
4. cuáles están vencidos o sin definición.

Recién después: abrir el caso y operar.

---

## 4. Fase 1 layout propuesto

```txt
Header admin
→ KPIs compactos
→ Resumen por coordinador
→ Filtros compactos
→ Alertas básicas
→ Bloques operativos: Autorizado / En tránsito / Finalizado
```

### 4.1 Header

- Título: `Supervisión de Coordinadores`
- Bajada: `Vista global de casos quirúrgicos coordinables por estado, carga y alertas.`
- Badges chicos a la derecha:
  - `X coordinadores activos`
  - `Y casos visibles`
  - opcional: `Z fuera de foco`

### 4.2 KPIs compactos

Mantener 4 tarjetas chicas, de lectura horizontal y sin protagonismo excesivo:

1. `Autorizado`
2. `SLA vencido`
3. `Disponibilidad sin definir`
4. `Fuera de foco` o `Fuera de vista`

Regla UX:

- KPIs sirven para orientar, no para ocupar la pantalla.
- Deben quedar arriba, compactos, sin competir con los bloques operativos.

### 4.3 Resumen por coordinador

Mantener cards clickeables, pero reinterpretadas como **resumen de carga**, no como selector personal.

Cada card debe mostrar:

- nombre;
- total;
- conteo por bucket;
- SLA vencido si aplica.

Microcopy recomendado:

- `Carga operativa`
- `X en autorizado`
- `Y en tránsito`
- `Z finalizados`

### 4.4 Filtros compactos

Orden recomendado:

1. búsqueda
2. coordinador
3. estado CX
4. limpiar

Decisión:

- coordinador va antes que estado porque esta vista ahora es de supervisión de ownership/carga.
- no sumar filtros nuevos en Fase 1 salvo necesidad real.

### 4.5 Alertas básicas

Agregar una franja compacta antes de los bloques, con 2-3 alertas resumidas:

- `N autorizados con SLA vencido`
- `N casos sin disponibilidad material definida`
- `N casos sin coordinador asignado` si existen visibles/relevantes

Comportamiento:

- alertas como summary chips/callouts, no tabla aparte;
- click futuro puede filtrar, pero en Fase 1 alcanza con visibilidad.

### 4.6 Bloques operativos

Se mantienen los 3 bloques actuales y su orden:

1. `Autorizado` — bloque principal
2. `En tránsito`
3. `Finalizado`

#### Autorizado

Debe ser el bloque dominante.

Subgrupos actuales se mantienen porque ya ordenan bien el trabajo:

- Nueva asignación
- Pendiente de coordinar
- Programada sin preparar
- Congelada
- Congelada con faltantes

Jerarquía interna:

- primero riesgo/atraso;
- después programación;
- después casos estabilizados.

#### En tránsito

Lectura más resumida, con foco en:

- fecha CX;
- institución;
- preparación/logística;
- acceso a seguimiento/logística/expediente.

#### Finalizado

Bloque de cierre operativo, no de facturación.

Debe comunicar:

- caso ya salió del tramo coordinable activo;
- todavía se puede abrir expediente o seguimiento si quedó algo residual.

---

## 5. Jerarquía visual recomendada

### Nivel 1

- Header
- Alertas críticas
- Bloque `Autorizado`

### Nivel 2

- KPIs compactos
- Resumen por coordinador
- Filtros

### Nivel 3

- `En tránsito`
- `Finalizado`

Razón:

El admin debe ver primero riesgo operativo vivo, no histórico ni cierre.

---

## 6. Reuse plan sin duplicar lógica

## 6.1 Fuente de verdad a reutilizar

Seguir usando:

- `surgery.state`
- `surgery.preparationState`
- `surgery.coordinadorCx`
- `surgery.date` / `time`
- disponibilidad material derivada
- seguimiento real del expediente

## 6.2 Lógica actual que NO debe duplicarse

Reutilizar la lógica ya presente en `src/app/coordinadores/page.tsx` para:

- `getCoordinatorBucket()`
- `getAuthorizedSubgroup()`
- `getSlaMeta()`
- `getMaterialAvailability()`
- `requiresCoordinatorManagement()`

## 6.3 Recomendación de implementación futura

Antes de tocar fuerte la UI, extraer estas reglas a un módulo puro compartido, por ejemplo:

- `src/lib/coordinadores/coordinator-view-model.ts`

Ese módulo debería devolver:

- bucket;
- subgroup;
- sla;
- material availability;
- flags de alerta.

Objetivo:

- cambiar layout sin volver a reescribir reglas;
- preparar Fase 2/3 sobre el mismo view-model;
- evitar divergencia entre cards, KPIs y alertas.

## 6.4 Reuse de surfaces existentes

- `CoordinatorManagementDialog` sigue como surface operativa puntual.
- `NovedadesTabContent` sigue siendo la fuente de seguimiento.
- `ExpedienteFullView` sigue como profundidad máxima.
- `Logística` se abre desde el expediente/tab existente.

No crear:

- notas paralelas;
- chat paralelo;
- lógica separada para “admin” y “coordinador”.

---

## 7. Qué cambia en la experiencia Fase 1

### Mantener

- cards por caso;
- quick actions discretas;
- apertura a gestión/seguimiento/logística;
- filtros simples;
- resumen por coordinador.

### Ajustar

- título y copy para framing admin/global;
- orden visual de módulos;
- alertas explícitas arriba;
- lectura de carga por coordinador como summary de supervisión.

### Evitar

- agregar nuevas entidades;
- expandir acciones comerciales/financieras;
- convertir la card en mini-expediente.

---

## 8. Preparación para Fase 2

Fase 1 debe dejar listo:

1. **alertas clickeables** que activen filtros rápidos;
2. **orden/prioridad configurable** dentro de `Autorizado`;
3. **densidad visual adaptable** (compacta vs cómoda);
4. **resumen por coordinador más analítico**:
   - vencidos;
   - sin fecha CX;
   - sin disponibilidad.

Sin cambiar el modelo de datos.

---

## 9. Preparación para Fase 3

Fase 1 debe no bloquear:

1. apertura de seguimiento embebido más rica;
2. acciones contextuales más finas por bucket;
3. panel lateral o drawer de detalle admin si producto luego lo quiere;
4. SLA más exacto si en el futuro existe `coordinatorAssignedAt` canónico.

---

## 10. Guía corta de implementación para Fase 1

Orden sugerido:

1. reframe textual/visual del módulo a `Supervisión de Coordinadores`;
2. mover alertas básicas arriba de los bloques;
3. compactar KPIs y hacerlos menos protagónicos;
4. mantener resumen por coordinador como filtro de carga;
5. conservar buckets/subgrupos actuales;
6. no tocar seguimiento real ni crear nuevas notas.

---

## 11. Riesgos / decisiones a validar

1. `Sin asignar`: confirmar si debe verse siempre en resumen admin o solo cuando tenga casos visibles.
2. `Fuera de foco`: definir microcopy final (`Fuera de fase`, `Fuera de vista`, `Fuera del tablero`).
3. `Finalizado`: confirmar si producto quiere luego separar “post cirugía” de “cerrado”.
4. Si el layout cambia mucho sin extraer view-model primero, puede duplicarse lógica entre KPIs/alertas/cards.
