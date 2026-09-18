# SESSION_END_CHECKLIST.md — OSSUM COR

> **Version**: 1.0 · **Creado**: 2026-05-12
> **Proyecto**: OSSUM COR
> **Aplica a**: Todos los agentes (Z.ai, Codex, ChatGPT) al cerrar una sesion de trabajo

---

## Checklist Obligatorio

Cada agente DEBE completar estos pasos antes de considerar la sesion finalizada. Omitir cualquier paso se considera una violacion del protocolo SDD.

### 1. Guardar session summary en Engram

```bash
# Via MCP (Codex)
mem_session_summary
mem_session_end

# Via CLI (Z.ai u otro agente sin MCP)
engram save "Session summary: [tema]" "[resumen]" --type decision --project ossum-cor
```

El summary DEBE incluir:
- [ ] Goal: Que se trabajó esta sesión
- [ ] Accomplished: Que se completó (con detalles clave)
- [ ] Discoveries: Hallazgos técnicos, gotchas, sorpresas
- [ ] Next Steps: Que queda pendiente para la próxima sesión
- [ ] Relevant Files: Archivos modificados con descripcion

### 2. Actualizar worklog

- [ ] Agregar entrada a `worklog.md` con formato estandar:
  ```markdown
  ---
  Task ID: [numero]
  Agent: [nombre del agente]
  Task: [descripcion breve]

  Work Log:
  - [paso 1 concreto]
  - [paso 2 concreto]

  Stage Summary:
  - [resultados clave]
  - [decisiones tomadas]
  - [artefactos producidos]
  ```

### 3. Actualizar specs si aplica

- [ ] Si se trabajo en una feature con spec: actualizar estado en SPEC_STATUS.md
- [ ] Si se descubrieron nuevos requisitos: actualizar la spec correspondiente
- [ ] Si se creo una nueva spec: agregarla a SPEC_STATUS.md y FEATURE_SPECS/README.md
- [ ] Si se completo una spec: cambiar estado a DONE en SPEC_STATUS.md

### 4. Actualizar TRACEABILITY_MATRIX si aplica

- [ ] Si se agregaron o modificaron archivos de codigo: actualizar TRACEABILITY_MATRIX.md
- [ ] Verificar que la trazabilidad spec-modulo-archivo-estado esta correcta
- [ ] Si se detectaron nuevas relaciones o dependencias: documentarlas

### 5. Sincronizar Engram Cloud

```bash
engram sync --cloud --project ossum-cor
```

- [ ] Sync completado sin errores
- [ ] Verificar con `engram stats` que las observaciones estan correctas
- [ ] Verificar con `engram sync --cloud --status --project ossum-cor` que el sync llego al cloud

### 6. Validar build/typecheck/lint

```bash
npm run build
npx tsc --noEmit
npm run lint
```

- [ ] Build exitoso
- [ ] TypeScript sin errores nuevos (errores preexistentes documentados son aceptables)
- [ ] ESLint sin errores nuevos
- [ ] Si hay errores nuevos: documentar en worklog y no marcar la sesion como limpia

### 7. Documentar pendientes

- [ ] Listar todos los pendientes en el worklog o en HANDOFF_RESUMEN.md
- [ ] Clasificar pendientes por prioridad (alta/media/baja)
- [ ] Identificar bloqueadores que impiden avanzar
- [ ] Si hay deudas tecnicas nuevas: documentarlas

### 8. Documentar riesgos detectados

- [ ] Si se detectaron riesgos durante la sesion: documentarlos en Engram y/o /knowledge
- [ ] Clasificar riesgos por probabilidad e impacto
- [ ] Si un riesgo es critico: crear entrada dedicada en DECISIONES_OPERATIVAS.md o ADR
- [ ] Si un riesgo afecta a otros agentes: guardar memoria en Engram con tag `risk`

### 9. Actualizar HANDOFF_RESUMEN.md

- [ ] Escribir resumen de lo que se hizo esta sesion
- [ ] Escribir lo que queda pendiente para el proximo agente
- [ ] Escribir advertencias o contextos que el proximo agente debe saber
- [ ] Incluir lista de archivos creados/modificados

### 10. Commit y push

```bash
git add .
git commit -m "[tipo]: descripcion del cambio"
git push origin main
```

- [ ] Commit realizado con mensaje descriptivo
- [ ] Push exitoso
- [ ] Verificar que no hay archivos temporales o secretos en el commit

---

## Template de Session Summary

```markdown
## Session Summary — [Fecha]

### Goal
[Que se trabajo esta sesion]

### Instructions (preferencias del usuario descubiertas)
- [Preferencia 1]
- [Preferencia 2]

### Discoveries
- [Hallazgo tecnico 1]
- [Hallazgo tecnico 2]

### Accomplished
- [Item completado 1 con detalles]
- [Item completado 2 con detalles]

### Next Steps
- [Pendiente 1]
- [Pendiente 2]

### Relevant Files
- `path/to/file` — [que hace o que cambio]
- `path/to/file` — [que hace o que cambio]

### Risks Detected
- [Riesgo 1] — Probabilidad: [alta/media/baja] — Impacto: [critico/alto/medio/bajo]
```

---

## Casos Especiales

### Si la sesion fue solo analisis (sin cambios de codigo)
No se requiere build/typecheck/lint, pero si se debe guardar el contexto en Engram y actualizar worklog con hallazgos.

### Si la sesion dejo el build roto
Documentar explicitamente en worklog y HANDOFF_RESUMEN.md. El proximo agente debe saber que el build esta roto y por que. No hacer push si el build esta roto salvo que sea un work-in-progress explicito en una rama separada.

### Si se descubrio un bug critico
Guardar memoria en Engram con tipo `bug` y tag `risk`. Documentar en DECISIONES_OPERATIVAS.md si afecta decisiones de negocio. No cerrar la sesion sin reportar el bug al usuario.
