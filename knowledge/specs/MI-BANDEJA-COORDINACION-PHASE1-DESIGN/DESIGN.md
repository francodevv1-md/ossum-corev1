# Design — MI-BANDEJA-COORDINACION-PHASE1-DESIGN

Status: designed  
Change: `MI-BANDEJA-COORDINACION-PHASE1-DESIGN`  
Workspace: `E:/OSSUM_COR_PROJECT`

---

## 1. Goal

Diseñar una vista personal `Mi bandeja de coordinación` para un coordinador puntual, separada de `/coordinadores` como panel admin/global.

Fase 1 debe:

- priorizar operación diaria personal;
- concentrarse en casos a coordinar, programar y seguir;
- reutilizar la lógica actual de buckets, subgrupos, SLA, disponibilidad y seguimiento;
- ser mobile-first con referencia principal `412x915`;
- evitar duplicar lógica o abrir pipelines financieros/documentales.

---

## 2. Positioning UX: admin global vs bandeja personal

### Admin/global `/coordinadores`

Responde:

- dónde está el riesgo global;
- quién está cargado;
- cuántos casos hay por coordinador;
- qué destrabes necesita la operación.

### Personal `/mi-bandeja-coordinacion` o surface equivalente

Responde:

- qué tengo que atender yo ahora;
- qué vence hoy o ya venció;
- qué caso sigue sin fecha, sin disponibilidad o sin gestión;
- qué casos ya pasaron a preparación/tránsito y necesitan seguimiento corto.

### Decisión UX

La vista personal debe sentirse como **inbox operativo** y no como tablero gerencial.

- menos resumen por coordinador;
- menos cards anchas;
- más lista compacta;
- más prioridad por urgencia/pendiente;
- quick actions directas sobre cada caso.

---

## 3. Header y framing

Header exacto Fase 1:

- Título: `Mi bandeja de coordinación`
- Bajada: `Tus casos para coordinar, programar y seguir.`
- Identidad visible: `Nelson · Coordinador CX`

Comportamiento:

- identidad fija arriba;
- sin selector de coordinador en header;
- el ownership ya viene resuelto por `coordinadorCx` del usuario actual.

---

## 4. Layout Fase 1 mobile-first

Orden recomendado en `412x915`:

```txt
Header personal
→ Resumen compacto 2x2
→ Filtros rápidos horizontales
→ Buscador + estado
→ Bloque 1: Requieren coordinación
→ Bloque 2: Programadas / preparadas
→ Bloque 3: En tránsito
→ Bloque 4: Finalizadas recientes (opcional / colapsado)
```

### 4.1 Resumen superior compacto

4 métricas chicas:

1. `Pendientes`
2. `SLA vencido`
3. `Sin disponibilidad`
4. `En tránsito`

Regla:

- métricas cortas, sin quinta tarjeta;
- `Finalizadas recientes` no entra en el resumen principal;
- el resumen debe ocupar poco alto para no empujar la lista fuera de viewport.

### 4.2 Filtros rápidos

Chips prioritarios:

1. `Mi bandeja`
2. `Vence hoy`
3. `Vencidas`
4. `Sin fecha`

Debajo o a continuación:

- buscador;
- filtro por `estado`.

Regla:

- primero quick filters de trabajo real;
- después filtros más genéricos.

### 4.3 Bloques

#### Bloque 1 — `Requieren coordinación`

Bloque dominante.

Incluye primero:

- SLA vencido;
- sin disponibilidad;
- sin fecha CX;
- sin gestión/seguimiento reciente;
- recién asignadas.

#### Bloque 2 — `Programadas / preparadas`

Casos ya encarrilados pero todavía dentro del tramo activo del coordinador.

Incluye:

- programadas sin preparar;
- congeladas;
- congeladas con faltantes;
- preparadas con seguimiento pendiente corto.

#### Bloque 3 — `En tránsito`

Lista resumida para control y continuidad.

Foco:

- fecha CX;
- institución;
- fecha envío material;
- quick access a logística/seguimiento.

#### Bloque 4 — `Finalizadas recientes`

Secundario y opcional.

- colapsado por default en mobile;
- solo cierre operativo reciente;
- no mezclar con documentación/facturación.

---

## 5. Regla de priorización interna

Dentro de `Requieren coordinación`, ordenar por riesgo:

1. `SLA vencido`
2. `Sin disponibilidad`
3. `Sin fecha`
4. `Sin gestión`
5. `Urgente`
6. resto por fecha/hora CX

Nota:

- un mismo caso puede tener varias banderas;
- no duplicar el caso en múltiples listas;
- mostrar badges de motivo, pero una sola fila por cirugía.

---

## 6. Mapping reutilizable sin duplicar lógica

## 6.1 Source of truth

Usar solo:

- `surgery.state`
- `surgery.preparationState`
- `surgery.coordinadorCx`
- `surgery.date` / `time`
- disponibilidad material derivada
- `surgery.fechaEnvioMaterial`
- seguimiento real del expediente

No sumar:

- pipeline financiero/documental;
- notas paralelas;
- estados nuevos.

## 6.2 Reglas a reutilizar tal como existen hoy

Reusar del módulo actual:

- `getCoordinatorBucket()`
- `getAuthorizedSubgroup()`
- `getSlaMeta()`
- `getMaterialAvailability()`
- `requiresCoordinatorManagement()`
- `getIncidentReasons()` como base de alertas

## 6.3 Reinterpretación para bandeja personal

### `Autorizado` admin/global

Se divide visualmente en personal como:

- `Requieren coordinación`
- `Programadas / preparadas`

### Mapping sugerido

- `nueva-asignacion` → `Requieren coordinación`
- `pendiente-coordinar` → `Requieren coordinación`
- `programada-sin-preparar` → `Programadas / preparadas`
- `congelada` → `Programadas / preparadas`
- `congelada-con-faltantes` → `Programadas / preparadas` con alerta alta
- `transito` → `En tránsito`
- `finalizado` → `Finalizadas recientes`

## 6.4 Reuse de surfaces existentes

- `CoordinatorManagementDialog` = gestión puntual
- `NovedadesTabContent` = seguimiento real
- `ExpedienteFullView` = profundidad máxima
- `Logística` existente = continuidad operativa
- acción copiar mensaje = mantenerla como quick action contextual, no como sistema aparte

Decisión:

- misma lógica, distinto framing;
- mismo stack operativo, distinta jerarquía visual;
- la bandeja personal no debe forkear reglas del admin.

---

## 7. Patrón de fila/card para mobile

Fase 1 debe usar **fila compacta expandible** antes que card pesada.

Cada fila debería mostrar, en este orden:

1. paciente + CX
2. institución
3. fecha/hora o `Sin fecha`
4. badges cortos:
   - estado
   - prep
   - SLA
   - disponibilidad
5. última novedad resumida o estado de gestión
6. quick actions

Quick actions mínimas:

- `Gestionar`
- `Seguimiento`
- `Copiar mensaje`
- `Expediente`

Acción secundaria según bloque:

- `Logística` para `En tránsito`

---

## 8. Diferencias concretas admin vs personal

1. **Owner visible**
   - Admin: todos los coordinadores
   - Personal: un solo coordinador activo

2. **Métrica principal**
   - Admin: carga y distribución
   - Personal: prioridad de trabajo inmediata

3. **Bloque principal**
   - Admin: `Autorizado`
   - Personal: `Requieren coordinación`

4. **Resumen por coordinador**
   - Admin: sí
   - Personal: no

5. **Densidad visual**
   - Admin: cards/resúmenes amplios
   - Personal: lista compacta mobile-first

6. **Filtros**
   - Admin: coordinador + estado + visión global
   - Personal: vence hoy / vencidas / sin fecha / mi bandeja

7. **Lectura del riesgo**
   - Admin: por operación total
   - Personal: por siguiente acción concreta.

---

## 9. Guía corta para implementación Fase 1

Orden sugerido:

1. crear shell textual/visual de `Mi bandeja de coordinación`;
2. filtrar por `coordinadorCx` del usuario actual;
3. reutilizar el mismo motor de bucket/subgroup/SLA/disponibilidad;
4. remapear `autorizado` en dos bloques personales;
5. cambiar cards grandes por lista compacta mobile-first;
6. mantener `Gestión`, `Seguimiento`, `Copiar mensaje`, `Expediente`;
7. dejar `Finalizadas recientes` colapsado/opcional;
8. no tocar lógica financiera/documental ni crear notas nuevas fuera de seguimiento.

---

## 10. Riesgos / validaciones

1. `Sin gestión` necesita definición exacta de ventana temporal si se quiere automatizar la alerta.
2. `Copiar mensaje` debe reutilizar contenido actual o definirse template mínimo para no divergir.
3. `congelada-con-faltantes` puede necesitar verse arriba de `programada-sin-preparar` aunque ambas vivan en `Programadas / preparadas`.
4. Si no se extrae un view-model compartido, admin y personal pueden divergir en KPIs, alertas y conteos.

---

## 11. Entregable esperado de Fase 1

La implementación debe dejar:

- una bandeja personal clara y distinta del admin;
- foco real en pendientes y vencimientos;
- reuse completo de lógica actual;
- experiencia usable en mobile sin mini-expediente ni sobrecarga visual.
