# TASK_BRIEF_TEMPLATE.md — OSSUM COR

Copiar y completar para cada tarea.

```md
# TASK BRIEF — OSSUM COR

## ID
GPT-027F.x

## Objetivo
Qué se debe lograr.

## Alcance permitido
Archivos, módulos o carpetas que se pueden tocar.

## Fuera de alcance
Qué no se debe tocar.

## Contexto obligatorio
Documentos, ADRs, specs, skills o reglas que deben leerse.

## Reglas de negocio relevantes
Reglas funcionales que no se pueden romper.

## Pasos esperados
1. Explorar.
2. Proponer.
3. Implementar.
4. Validar.
5. Documentar.

## Validaciones obligatorias
- npm run build, si aplica.
- npx tsc --noEmit, si aplica.
- npx prisma format/generate, si aplica.
- tests, si corresponde.
- browser QA, si toca UI.

### Checklist E2E autenticado
- [ ] E2E requiere Auth.
- [ ] Si Auth no es objeto del test, usar sesión manual persistida.
- [ ] `storageState` generado fresco al inicio.
- [ ] Preflight autenticado exitoso antes de ejecutar Playwright.
- [ ] No automatizar ni diagnosticar Auth durante retries del core-flow.

## Entregable
Qué archivos/documentos deben quedar actualizados.

## Handoff esperado
Resumen corto con cambios, archivos, validaciones, riesgos y próximos pasos.
```
