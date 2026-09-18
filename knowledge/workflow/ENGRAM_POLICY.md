# ENGRAM_POLICY.md — Política de memoria Engram

Estado: vigente para GPT-027F.0B | actualizado 2026-06-05

---

## Principio

Engram es memoria operativa. No es fuente de verdad principal.

Knowledge gobierna. Engram recuerda.

Si hay contradicción entre Engram, worklog o documentos archivados, prevalece Knowledge V2.

---

## Qué guardar

- Resumen de sesión.
- Decisiones tomadas.
- Archivos modificados.
- Validaciones realizadas.
- Bugs encontrados.
- Riesgos abiertos.
- Próximos pasos.
- Aprendizajes técnicos.
- Handoffs.
- Topic keys estables cuando un tema evoluciona en el tiempo.

---

## Qué no guardar

- Secretos.
- Tokens.
- Passwords.
- API keys.
- Datos fiscales sensibles.
- Dumps de base de datos.
- Información privada innecesaria.
- Archivos completos largos.
- Logs gigantes.

---

## Reglas operativas

- Usar un único proyecto canónico por sesión y mantener consistencia de nombre.
- El proyecto canónico de OSSUM COR es **`ossum_cor_project`**.
- Fijado vía `--project ossum_cor_project` en el MCP command de `.opencode/opencode.json`. Esto asegura que todas las tool calls de Engram vía OpenCode usen el mismo proyecto, independientemente del directorio de trabajo o flags explícitos.
- Como safety net para CLI directa (sin OpenCode), se seteo `ENGRAM_PROJECT=ossum_cor_project` como variable de entorno de usuario en Windows.
- Todo uso de `engram` por CLI debe incluir `--project ossum_cor_project` o confiar en la env var.
- La fragmentación de proyectos previa (`ossum_cor`, `e:\ossum_cor_project`) fue resuelta mediante consolidación. Hoy existe **1 único proyecto** con 51 observaciones y 22 sesiones.
- No usar Engram como reemplazo de documentación maestra.
- Si una decisión madura, pasarla a `knowledge/`.
- Si un tema cambia con el tiempo, reutilizar `topic_key` en vez de dispersar observaciones.

---

## Engram Sync

Se usa desde el inicio de 0B para sincronizar memoria.

- Sync local + cloud verificado funcional: `engram sync --status` reporta Local y Remote sincronizados.
- `.engram/` contiene chunks persistidos con datos reales (2 chunks, 51 observaciones).
- El proyecto canónico `ossum_cor_project` está fijado en el MCP command y respaldado por env var `ENGRAM_PROJECT`.
- Fragmentación resuelta: los proyectos `ossum_cor` y `e:\ossum_cor_project` fueron consolidados en `ossum_cor_project`.
- Pendiente opcional: inicializar repositorio git para habilitar versionado del chunk persistido.
- Debe excluir secretos, dumps, backups, claves, `.env`, certificados y logs pesados.

---

## Formato session_summary

```md
# SESSION SUMMARY

Fecha:
Tarea:
Agente principal:

## Done

## Changed files

## Decisions

## Validations

## Risks

## Next steps
```
