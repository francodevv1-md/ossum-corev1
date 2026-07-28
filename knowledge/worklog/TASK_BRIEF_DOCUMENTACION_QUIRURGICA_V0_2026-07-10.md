# TASK BRIEF — OSSUM COR

## ID

OPS-DOCUMENTACION-QUIRURGICA-V0-001

## Objetivo

Diseñar e implementar **Documentación quirúrgica V0** dentro de Ficha CX como checklist operativo documental, sin interferir con la sesión paralela que trabaja en Consumo, Devolución, múltiples remitos/consumos y concurrencia de remitos.

La V0 debe ayudar a responder: **qué documentación falta, qué está recibida, qué está observada y qué está aprobada para continuar hacia facturación/cobro**.

## Alcance permitido

### Fase A — segura / design-first

- Documentar reglas V0.
- Definir checklist base.
- Definir estados.
- Preparar contrato futuro frontend/backend.
- Ajustar documentación de worklog/handoff si hace falta.

### Fase B — implementación UI-first, si Franco aprueba

Permitido tocar sólo si la otra sesión no tiene lock sobre Ficha CX completa:

- `src/components/expediente/DocumentacionPanel.tsx`
- `src/components/expediente/DocumentacionTrazabilidadTab.tsx`
- componentes nuevos bajo `src/components/expediente/documentacion/`, si conviene aislar.
- tests UI/unitarios nuevos o específicos de documentación, si existen patrones disponibles.

### Fase C — backend-backed, requiere aprobación explícita

- Nuevo service server-side de documentación.
- Nuevos validators.
- Nuevos API routes company-scoped.
- Nuevo modelo persistente para documentos.
- Auditoría documental.

Esta fase no está aprobada de forma general por este brief, excepto por el slice
aditivo de persistencia autorizado expresamente en la sección siguiente.

### Addendum de autorización — 2026-07-28

Franco aprueba el slice `OPS-DOCUMENTACION-V0-SCHEMA-001` con este alcance
cerrado:

- modificar `prisma/schema.prisma` para agregar los modelos normalizados
  `SurgeryDocumentChecklist` y `SurgeryDocumentItem`;
- agregar la migración SQL aditiva
  `prisma/migrations/20260727200000_add_surgery_documentation_v0/migration.sql`;
- preservar aislamiento multiempresa mediante relaciones compuestas de actores
  contra `UserCompanyAccess(userId, companyId)`;
- crear un commit local que incluya este Task Brief, el schema y la migración.

Esta autorización no permite aplicar la migración a ninguna base de datos ni
incluye seed, API, services, validators, UI, storage, adjuntos, facturación,
cambios de proveedor o archivos PDF no relacionados.

## Fuera de alcance

No tocar en esta tarea:

- `prisma/schema.prisma`, excepto el slice aditivo autorizado en el addendum.
- `prisma/migrations/*`, excepto la migración aditiva autorizada en el addendum.
- Auth, permisos, storage provider o dependencias.
- `src/components/expediente/*Remito*`
- `src/components/expediente/*Consumo*`
- `src/components/expediente/*Devolucion*`
- `src/lib/services/remito*`
- `src/lib/services/consumo*`
- `src/lib/services/devolucion*`
- `src/app/api/**/remito*/**`
- `src/app/api/**/consumo*/**`
- `src/app/api/**/devolucion*/**`
- Refactor amplio de Cirugías/Ficha CX.
- Browser QA por ahora; queda postergado.

## Contexto obligatorio

- `AGENTS.md`
- `knowledge/core/PROJECT_BRIEF.md`
- `knowledge/core/CANONICAL_DECISIONS.md`
- `knowledge/core/CURRENT_STATE.md`
- `knowledge/domain/CENTRAL_OPERATIONAL_FLOW.md`
- `knowledge/domain/SURGERY_EXPEDIENTE.md`
- `knowledge/domain/SURGERY_DB_DESIGN.md`
- `knowledge/domain/FACTURACION_COBROS.md`
- `src/components/expediente/DocumentacionPanel.tsx`
- `src/components/expediente/DocumentacionTrazabilidadTab.tsx`

## Reglas de negocio relevantes

1. La documentación quirúrgica pertenece al expediente/cirugía.
2. V0 debe ser **metadata/checklist-first** salvo aprobación explícita de storage.
3. V0 no debe usar `localStorage`/Zustand como fuente final si se implementa backend-backed.
4. La documentación puede preparar el paso a facturación, pero **no debe bloquear facturación automáticamente** sin aprobación de Franco.
5. La obligatoriedad documental puede variar por empresa, institución, obra social, tipo de cirugía o cliente; V0 no debe hardcodear reglas definitivas si no están aprobadas.
6. Las acciones críticas futuras deben ser auditables: recibido, observado, aprobado, reabierto, solicitado.

## Checklist documental V0

Checklist base sugerido:

- `medical_order` — Orden médica.
- `authorization` — Autorización.
- `signed_delivery_note` — Remito firmado.
- `signed_consumption` — Consumo firmado.
- `implant_documentation` — Documentación de implantes.
- `technical_sheet` — Ficha técnica.
- `box_photos` — Fotos de caja/material.
- `surgical_report` — Parte quirúrgico.
- `billing_support` — Soporte requerido para facturación.

## Estados V0

### Estado por documento

- `pending`: falta documentación.
- `received`: recibida/cargada, pendiente de validación.
- `observed`: observada o con problema.
- `approved`: aprobada.

### Estado agregado del expediente

- `incomplete`: hay documentos obligatorios pendientes.
- `observed`: hay al menos un obligatorio observado.
- `ready`: todos los obligatorios están aprobados.
- `not_required`: no hay documentación mínima configurada o no aplica.

## UX esperada

- Mostrar bloque de Documentación dentro de Ficha CX.
- Mostrar progreso: aprobados / requeridos.
- Mostrar estado agregado con color discreto.
- Cada ítem debe mostrar:
  - nombre;
  - estado;
  - requerido/no requerido;
  - última actualización;
  - observación, si existe.
- Acciones V0:
  - marcar recibido;
  - aprobar;
  - observar con texto obligatorio;
  - volver a pendiente;
  - preparar acción futura de solicitar documentación.

## Contrato backend futuro

Endpoints propuestos, no implementados por este brief:

- `GET /api/companies/[companyId]/surgeries/[surgeryId]/documents`
- `PATCH /api/companies/[companyId]/surgeries/[surgeryId]/documents/[documentId]`
- `POST /api/companies/[companyId]/surgeries/[surgeryId]/documents/requirements`
- `POST /api/companies/[companyId]/surgeries/[surgeryId]/documents/[documentId]/request`

Modelo conceptual futuro:

```ts
type SurgeryDocument = {
  id: string
  companyId: string
  surgeryId: string
  documentType: string
  status: "pending" | "received" | "observed" | "approved"
  required: boolean
  fileName?: string
  mimeType?: string
  storageProvider?: string
  storageKey?: string
  uploadedByUserId?: string
  uploadedAt?: string
  reviewedByUserId?: string
  reviewedAt?: string
  observations?: string
  createdAt: string
  updatedAt: string
}
```

Eventos auditables futuros:

- `document.received`
- `document.approved`
- `document.observed`
- `document.reopened`
- `document.requested`

## Pasos esperados

1. Confirmar con Franco el checklist base y qué documentos son obligatorios.
2. Confirmar si V0 será sólo checklist/metadata o si incluirá adjuntos reales.
3. Confirmar si Documentación alerta o bloquea Facturación.
4. Si es UI-first:
   - aislar componentes de documentación;
   - evitar tocar Remito/Consumo/Devolución;
   - mantener datos mock/prototipo claramente marcados como no fuente final.
5. Si es backend-backed:
   - abrir Task Brief separado;
   - pedir aprobación de schema/storage/API;
   - implementar service/validators/API/tests.
6. Validar.
7. Documentar handoff.

## Validaciones obligatorias

Si sólo se modifica documentación:

- Revisión de diff.

Si se toca UI:

- `npm run typecheck` o validación TypeScript equivalente del repo.
- Tests relevantes si existen.
- Browser QA queda postergado salvo aprobación posterior.

Si se toca backend en tarea futura:

- Tests unitarios de service/validators.
- Tests de API company-scoped.
- Validación de permisos/auditoría.
- Prisma format/generate sólo si schema aprobado.

## Preguntas pendientes para Franco

1. ¿Qué documentos son obligatorios para facturar en V0?
2. ¿La obligatoriedad cambia por empresa, institución, obra social o tipo de cirugía?
3. ¿Documentación debe bloquear facturación o sólo alertar?
4. ¿Quién puede aprobar documentación?
5. ¿Una observación invalida automáticamente el documento?
6. ¿Hace falta adjunto real ahora o alcanza metadata/checklist?
7. ¿Se necesita historial visible dentro de Ficha CX?

## Entregable

- Este Task Brief queda como guía de ejecución.
- La próxima tarea debe elegir explícitamente una de estas rutas:
  - **UI-first no persistente**;
  - **metadata backend-backed**;
  - **metadata + storage**;
  - **documentación como bloqueo de facturación**.

## Handoff esperado

Usar Caveman:

```md
## Handoff
### Done
### Changed
### Files
### Validations
### Risks
### Next
```
