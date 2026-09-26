# KNOWLEDGE_INDEX.md — OSSUM COR Knowledge V2

Estado: vigente  
Propósito: índice operativo para que humanos y agentes encuentren la fuente correcta sin cargar todo el contexto.

---

## Principio

Knowledge V2 no es un archivo gigante. Es una estructura modular.

Cada documento debe tener una función clara:

- Producto y estado: `core/`
- Dominio del negocio: `domain/`
- Arquitectura técnica: `architecture/`
- Flujo IA y ejecución: `workflow/`
- Specs de tareas: `specs/`
- Historial de ejecución: `worklog/`
- Histórico no rector: `archive/`

---

## Orden de autoridad

1. Contexto Maestro v8.2 saneado.
2. ADRs vigentes.
3. Este índice.
4. Documentos de Knowledge V2.
5. Specs SDD/OpenSpec.
6. Worklog y handoffs.
7. Engram.
8. Archive.

---

## core/

- `PROJECT_BRIEF.md`: definición corta del producto, problema y objetivo.
- `CURRENT_STATE.md`: estado real del prototipo/repo, límites y riesgos actuales.
- `CANONICAL_DECISIONS.md`: lista corta de decisiones vigentes.
- `GEORREFERENCIACION_ARGENTINA_MASTER.md`: norma maestra de identidad territorial, coordenadas, trazabilidad y auditoría geográfica.
- `REPO_MAP.md`: mapa resumido del repo para ahorrar tokens.
- `GLOSSARY.md`: glosario de términos de negocio y técnicos.

---

## domain/

- `SURGERY_EXPEDIENTE.md`: Cirugía/Expediente como entidad central.
- `CENTRAL_OPERATIONAL_FLOW.md`: flujo V1 completo.
- `CONTACTS_MASTER.md`: contacto global, vínculo por empresa y función contextual.
- `PRESUPUESTOS.md`: presupuestos, versiones, estados y aclaraciones.
- `PREPARACION_REMITOS_CONSUMO.md`: preparación, remitos, consumo, devolución y comparativa.
- `FACTURACION_COBROS.md`: facturación, cobros, imputaciones y cuenta corriente.
- `STOCK_CAJAS_TRAZABILIDAD.md`: artículos, depósitos, cajas, movimientos y trazabilidad.
- `COMPRAS_PROVEEDORES.md`: compras, proveedores y necesidades de reposición.
- `FISCAL_BOUNDARY_TUSFACTURAS.md`: límite entre ERP operativo y motor fiscal.

---

## architecture/

- `ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md`: decisión backend/DB/ORM/Auth/Storage saneada.
- `BACKEND_FOUNDATION_PLAN.md`: plan técnico de GPT-027F.5A.
- `DATA_MODEL_RULES.md`: reglas de modelo de datos.
- `MULTI_COMPANY_ACCESS.md`: multiempresa, permisos y aislamiento.
- `AUDIT_EVENT_POLICY.md`: política de auditoría.
- `ADR-FISCAL-POLICY-TUSFACTURAS-DEV.md`: política fiscal DEV y límite de integración con TusFacturasAPP.

---

## workflow/

- `AI_GENTLE_STACK.md`: configuración IA del proyecto.
- `AGENT_WORKFLOW.md`: flujo de agentes y roles.
- `ENGRAM_POLICY.md`: memoria persistente y Sync.
- `ENGRAM_TAGS.md`: etiquetas sugeridas para memoria.
- `TASK_BRIEF_TEMPLATE.md`: plantilla de tareas.
- `HANDOFF_TEMPLATE.md`: plantilla de cierre.
- `QUALITY_GATES.md`: validaciones obligatorias.
- `SESSION_START_CHECKLIST.md`: checklist de inicio.
- `SESSION_END_CHECKLIST.md`: checklist de cierre.

---

## specs/

- `GPT-027F.0/`: spec de reconstrucción documental y preparación de entorno.

---

## worklog/

- `WORKLOG.md`: historial compacto de cambios y decisiones ejecutadas.

---

## archive/

- `README.md`: criterio para histórico, legacy y obsoleto.
- `legacy-pre-v2/`: documentos previos a Knowledge V2 archivados fuera del flujo activo.

---

## Regla de autoridad

`archive/` no gobierna.

Si un documento archivado contradice `core/`, `domain/`, `architecture/`, `workflow/` o una spec vigente, prevalece Knowledge V2.

---

## Regla para agentes

Antes de tocar código, leer:

1. `AGENTS.md`
2. `knowledge/KNOWLEDGE_INDEX.md`
3. `knowledge/core/PROJECT_BRIEF.md`
4. `knowledge/core/CANONICAL_DECISIONS.md`
5. `knowledge/core/CURRENT_STATE.md`
6. Spec puntual de la tarea

Si la tarea usa ubicación, dirección, coordenadas, mapas, rutas o geometrías, leer además `knowledge/core/GEORREFERENCIACION_ARGENTINA_MASTER.md` antes de diseñar o implementar.

No cargar todo el Contexto Maestro salvo pedido explícito.
