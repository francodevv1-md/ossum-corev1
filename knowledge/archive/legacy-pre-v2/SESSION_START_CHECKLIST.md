# SESSION_START_CHECKLIST.md — OSSUM COR

> **Version**: 1.0 · **Creado**: 2026-05-12
> **Proyecto**: OSSUM COR
> **Aplica a**: Todos los agentes (Z.ai, Codex, ChatGPT) al iniciar una sesion de trabajo

---

## Checklist Obligatorio

Cada agente DEBE completar estos pasos antes de escribir cualquier codigo o tomar cualquier decision.

### 1. Sincronizar Engram Cloud

```bash
engram sync --cloud --project ossum-cor
engram context
engram search "tema relevante a la tarea actual"
```

- [ ] Sync completado sin errores
- [ ] Contexto de sesiones previas revisado
- [ ] Busqueda de memorias relevantes realizada

### 2. Leer KNOWLEDGE_INDEX

- [ ] Leer `/knowledge/KNOWLEDGE_INDEX.md` — indice general de documentacion canonica
- [ ] Identificar que documentos son relevantes a la tarea actual

### 3. Leer CORE_SKILL (habilidades del proyecto)

- [ ] Leer `AGENTS.md` — reglas de trabajo obligatorias
- [ ] Verificar restricciones del modulo que se va a tocar

### 4. Leer CORE_LAWS (leyes del proyecto)

- [ ] Leer `CORE_LAWS.md` (si existe) — leyes inmutables del proyecto
- [ ] Verificar que la tarea no viola ninguna ley

### 5. Revisar SPEC_STATUS

- [ ] Leer `SPEC_STATUS.md` — estado de todas las specs
- [ ] Verificar si la tarea tiene spec aprobada
- [ ] Si no tiene spec: crearla o pedir aprobacion antes de implementar (SDD)

### 6. Revisar spec aplicable

- [ ] Si existe spec para el modulo, leerla completa en `/FEATURE_SPECS/`
- [ ] Verificar que el alcance de la tarea esta dentro de la spec
- [ ] Verificar que no se violan criterios de aceptacion

### 7. Buscar memorias relevantes en Engram

```bash
engram search "bug nombre-modulo"
engram search "decision nombre-modulo"
engram search "risk nombre-modulo"
engram search "architecture nombre-modulo"
```

- [ ] Busqueda por bugs conocidos del modulo
- [ ] Busqueda por decisiones previas
- [ ] Busqueda por riesgos detectados
- [ ] Busqueda por contexto arquitectonico

### 8. Validar archivos permitidos/prohibidos

Segun `AGENTS.md` seccion de reglas intocables:

- [ ] Verificar si la tarea toca Cirugias (`src/components/cirugias/`, `src/hooks/useCirugia*`) — solo con tarea explicita
- [ ] Verificar si la tarea toca store.ts (`src/lib/store.ts`) — solo con justificacion
- [ ] Verificar si la tarea agranda un monolito (>300 lineas) — modularizar primero
- [ ] Verificar si la tarea duplica logica existente — buscar en `src/lib/` antes

### 9. Devolver riesgos antes de implementar

Antes de escribir codigo, el agente DEBE reportar:

- [ ] Riesgos de ruptura identificados (que puede romperse)
- [ ] Archivos afectados con justificacion
- [ ] Mapa de impacto si el cambio afecta mas de 1 archivo
- [ ] Plan de backward compatibility con localStorage existente

---

## Template de Reporte Pre-Implementacion

```markdown
## Pre-Implementation Report

### Tarea
[Descripcion de la tarea]

### Contexto leido
- [ ] KNOWLEDGE_INDEX.md
- [ ] AGENTS.md
- [ ] CORE_LAWS.md
- [ ] SPEC_STATUS.md
- [ ] Spec aplicable: [nombre o "no existe"]
- [ ] Engram memorias relevantes: [resumen o "ninguna"]

### Riesgos
1. [Riesgo 1] — Probabilidad: [alta/media/baja] — Impacto: [critico/alto/medio/bajo]
2. [Riesgo 2] — ...

### Archivos afectados
- `src/...` — [que cambia y por que]
- `src/...` — [que cambia y por que]

### Validaciones
- [ ] No toca Cirugias sin tarea explicita
- [ ] No toca store.ts sin justificacion
- [ ] No agranda monolito >300 lineas
- [ ] No duplica logica existente
- [ ] Backward compatibility verificada

### Aprobacion
- [ ] Agente puede proceder (sin riesgos criticos)
- [ ] Requiere aprobacion humana (riesgos criticos identificados)
```

---

## Casos Especiales

### Si la tarea es solo documentacion
No se requiere mapa de impacto ni validacion de archivos, pero si se debe leer contexto canonico y verificar que no contradice /knowledge existente.

### Si la tarea es un bug fix
Se permite tocar archivos protegidos si el bug esta en ellos, pero se debe documentar en worklog.md con el mapa de impacto.

### Si la tarea es una nueva feature
Debe tener spec en DRAFT como minimo. Si no existe, crearla antes de implementar. No implementar sin spec (SDD).
