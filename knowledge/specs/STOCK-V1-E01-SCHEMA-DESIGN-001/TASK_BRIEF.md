# Task Brief — STOCK-V1 Backend (E01 Schema → E02 Implementación)

- **Estado:** Borrador para aprobación de Franco. No autoriza implementación.
- **ID:** `STOCK-V1-BACKEND-TASK-BRIEF-001`
- **Fecha:** 2026-08-13

---

## 1. Objetivo

Implementar el backend de persistencia del módulo **Stock** (V1), es decir, convertir la UX/mock actual (`src/data/stock-mock.ts` + componentes `src/components/stock/*` + `/stock`) en un backend real con Prisma + servicio + API + validadores + permisos + auditoría, respetando el modelo de dominio ya aprobado:

```
Artículo (maestro compartido + eligibilidad Stock por empresa)
  ↔ Plantilla de Caja (versionada, contenido ideal)
  ↔ Caja Física (contenido real, derivado de inventario/movimientos)
  ↔ Inventario/Movimientos (depósitos, reservas, tránsito, custodia)
  ↔ Trazabilidad híbrida (lote / serie individual / vencimiento)
```

**Regla central heredada:** las cantidades disponibles/reservadas/en-tránsito son **derivadas** de movimientos y reservas reales; nunca se editan directamente. Las diferencias se resuelven con movimiento / reposición / baja / incidencia.

---

## 2. Estado actual (evidencia de por qué el backend no es "directo")

| Artefacto | Estado |
| --- | --- |
| `STOCK-V1-SDD-001` (planning chain, 127 requirements) | Aprobado y cerrado |
| `STOCK-V1-DOMAIN-BLUEPRINT-001` (`DR-01`–`DR-16`) | Aprobado |
| `STOCK-V1-UX-BLUEPRINT-001` (`UXD-01`–`UXD-12`) | Aprobado |
| Arquitectura Stock (`A-01`–`A-12`) + Cajas **Opción A** | Aceptado |
| `STOCK-V1-E01-SCHEMA-DESIGN-001/PROPOSAL.md` (`U-01`–`U-09`) | **APROBADO por Franco — 2026-07-20** |
| `STOCK-V1-E01-SCHEMA-DESIGN-001/SPEC.md` (`S01-SPEC`) | Escrito, **pendiente review + aprobación Franco** |
| `STOCK-V1-E01-SCHEMA-DESIGN-001/DESIGN.md` | **No iniciado (bloqueado)** |
| `STOCK-V1-E01-SCHEMA-DESIGN-001/TASKS.md` | Bloqueado (plan, no implementación) |
| `prisma/schema.prisma` (modelos Stock/Cajas) | **0 modelos** — el schema de Stock no fue escrito ni migrado |
| Gates `G-SCHEMA`, `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION`, `G-APPLY` | **Todos BLOQUEADOS** |

El backend de Stock no puede implementarse de una sola corrida: hay una cadena documental y de gates que debe cerrarse en orden.

---

## 3. Cadena de gates (roadmap hasta implementación)

```text
1. SPEC aprobada (review independiente + Franco)   ← SPEC ya escrita
2. DESIGN (2 reviewers: DB/domain + SDD/governance, read-only/no-fix + Franco)
3. TASKS (readiness review)
4. G-SCHEMA (Franco — modelo/tablas/campos/relaciones/índices/enums)
5. G-MIGRATION (serial, tras evidencia de schema aprobada)
6. G-APPLY (Task Briefs de implementación por slice + Franco, por slice)
```

Cada flecha es un punto de parada. Ningún gate habilita al siguiente de forma implícita.

---

## 4. Alcance de ESTE Task Brief

Este brief **solo** despacha el siguiente paso ejecutable:

> **Paso 1 — E01 DESIGN (diseño de schema Stock/Cajas), exclusivamente documental.**

El writer produce/actualiza `DESIGN.md` traduciendo la `SPEC.md` aprobada (y las decisiones heredadas `DR`/`UXD`/`A`/`U-01`–`U-09`/Cajas Opción A) en un diseño de persistencia revisable: entidades, identidades, grano accionable (empresa + Artículo + depósito/custodia + trazabilidad aplicable), conservación por familia de checkpoint, trazabilidad híbrida (lote con equivalencia por empresa+Artículo+código de lote; serie con historial estable; vencimiento con review de discrepancia), reservas separadas de evidencia física append-only, proyecciones reconstruibles, compatibilidad de soft-references, y límite de apertura fechado/reconciliado.

### Archivos permitidos (este paso)
- `knowledge/specs/STOCK-V1-E01-SCHEMA-DESIGN-001/DESIGN.md` (único archivo de escritura)
- Registro `T00` y handoff (Caveman) como evidencia, sin expandir el write set.

### Fuera de alcance (prohibido en este paso y en la cadena hasta su gate)
- `prisma/schema.prisma`, migraciones, `prisma generate/migrate/db`, seed/import/backfill/apertura, datos, proveedor, entorno, secretos.
- Auth, permisos/RLS, capacidades, roles.
- `src/app/api/*`, `src/lib/services/*`, `src/lib/validators/*`, `src/lib/permissions/*`.
- Cirugías / Expediente / Ficha CX / workflow de Cajas existente (`src/app/cajas`, `src/components/boxes/*`).
- UI (`/stock`, `src/components/stock/*`, `src/data/stock-mock.ts`), shared types/store/mocks.
- `worklog`, dependencias, commit/push/PR/merge, deploy, producción.

---

## 5. Contexto obligatorio (leer antes de escribir)

- `knowledge/specs/STOCK-V1-E01-SCHEMA-DESIGN-001/{PROPOSAL,SPEC}.md`
- `knowledge/specs/STOCK-V1-{SDD-001,DOMAIN-BLUEPRINT-001,UX-BLUEPRINT-001}/*`
- `knowledge/architecture/ADR-STOCK-{CORE-PERSISTENCE,EFFECTS-RESERVATIONS-PROJECTIONS,AUTHORIZATION-AUDIT,OPERATIONAL-INTEGRATION-ADOPTION}.md`
- `knowledge/architecture/ADR-CAJAS-{CORE-PERSISTENCE,STOCK-TRANSACTIONS,AUTHORIZATION,OPERATIONAL-INTEGRATIONS}.md`
- `knowledge/architecture/BACKEND_PHASE2_PLAN.md` (Stock = Fase 3A)
- `AGENTS.md` §9–§13, `knowledge/workflow/QUALITY_GATES.md`

---

## 6. Reglas de negocio que no se pueden romper

1. **Identidad compartida de Artículo + eligibilidad Stock por empresa** (`DR-01`, `U-01`): el catálogo no se convierte en Stock compartido entre empresas.
2. **Depósito, tránsito y custodia externa son conceptos distintos** (`U-02`); sin expansión de ubicación interna en V1.
3. **Trazabilidad híbrida** (`U-03`, `U-04`): lote = empresa+Artículo+código normalizado; discrepancia de vencimiento bloquea equivalencia automática; historial de unidad identificada estable; cambios de configuración solo prospectivos sin reserva/asignación pendiente.
4. **Decimal exacto por Artículo (escala 0–4)** (`U-06`): sin redondeo implícito en operaciones críticas.
5. **Conservación por familia de checkpoint** (`U-07`): apertura/recepción → alcance contable; reserva/liberación reclasifica sin cambiar cantidad física; despacho → tránsito/custodia; consumo/devolución reparte el remanente despachado una sola vez; transferencia conserva total; conteo es observacional; corrección/reversa requiere evidencia vinculada.
6. **Límite de apertura fechado y reconciliado** (`U-08`, `U-09`): sin backfill histórico; legado no resuelto queda read-only, no accionable.
7. **Soft-references**: una sola disposición de compatibilidad por familia (mapeable determinístico / snapshot descriptivo / legado no resuelto / incompatible), sin inventar relaciones.
8. **Cajas Opción A**: reservas explícitas + transacciones de Stock append-only con proyecciones de disponibilidad server-side.

---

## 7. Rol, modo y ownership

- **Rol:** Backend/Data Architect — Stock E01 DESIGN.
- **Modo:** `docs` (escritura limitada a `DESIGN.md`).
- **LLM:** a asignar por el Orchestrator según riesgo (Codex preferido para schema/DB crítico).
- **Lock:** `task=STOCK-V1-E01-DESIGN · role=Backend/Data Architect · files=DESIGN.md · status=reserved → editing → review → released`.
- **Reviewers:** uno DB/domain y uno SDD/governance, **read-only/no-fix**.

---

## 8. Validaciones obligatorias (este paso)

- Integridad documental: coherencia con `SPEC.md` y decisiones heredadas, sin seleccionar modelo/tabla/campo final más allá de lo que el gate permita.
- Reporte de los dos reviewers (PASS / PASS WITH CONCERNS / FAIL).
- Hash del blob de `DESIGN.md` + whitespace check.
- **No** se requieren (ni se autorizan): tsc, build, Prisma, DB, network.

---

## 9. Entregable

- `knowledge/specs/STOCK-V1-E01-SCHEMA-DESIGN-001/DESIGN.md` (actualizado/completado).
- Handoff Caveman con: Done / Changed / Files / Validations / Risks / Next.

---

## 10. Handoff esperado (tras cada paso)

```txt
Done:
Changed:
Files:
Validations:
Risks:
Next:
```

---

## 11. Riesgos y decisiones pendientes

- El schema actual de `prisma/schema.prisma` no contiene modelos Stock/Cajas; todo el diseño es greenfield sobre el baseline candidato.
- **G-SCHEMA / G-MIGRATION / G-APPLY siguen bloqueados** y requieren aprobaciones separadas de Franco.
- Backend fase 3A convive con el circuito troncal (Remito/Consumo/Presupuesto/Facturación) ya en curso; Stock debe integrarse sin duplicar verdad ni tocar Cirugías.

---

## 12. Stop y escalar si

- cambia un hash/provenance congelado o el estado de un artefacto upstream;
- el scope o write set se expande (p. ej. se necesita tocar `schema.prisma`, una API, un validator, o un archivo de Cirugías);
- un gate protegido está ausente, vencido o ambiguo;
- una decisión de negocio/arquitectura/seguridad no está aprobada;
- un reviewer intenta corregir el artefacto en vez de reportar.

---

## 13. Declaración explícita de no-autorización

Este Task Brief **no autoriza** ninguna escritura fuera de `DESIGN.md` (paso 1), ni schema, migración, código, API, Auth, permisos, Cirugías, datos, commit, deploy o producción. Los gates `G-SCHEMA`, `G-MIGRATION`, `G-AUTH`, `G-PERMISSIONS`, `G-CIRUGIAS`, `G-PRODUCTION` y `G-APPLY` permanecen bloqueados y requieren aprobaciones separadas de Franco con sus propios Task Briefs exactos.

**Próximos Task Briefs derivados (a pedir por separado cuando corresponda):**
1. `G-SCHEMA` — edición de `prisma/schema.prisma` (allowlist exacta + lock).
2. `G-MIGRATION` — autoría y aplicación de migración (serial, tras G-SCHEMA).
3. `G-APPLY` por slice — implementación `src/lib/services/*` + `src/app/api/*` + validadores + permisos + auditoría, slice por slice (Artículo → Plantilla → Caja → Inventario/Reservas → Trazabilidad).
