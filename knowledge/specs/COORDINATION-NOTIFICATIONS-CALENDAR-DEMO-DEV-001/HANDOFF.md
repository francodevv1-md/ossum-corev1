# HANDOFF — COORDINATION-NOTIFICATIONS-CALENDAR-DEMO-DEV-001

## Task ID
COORDINATION-NOTIFICATIONS-CALENDAR-DEMO-DEV-001

## Status
- **Bloque 1 (Coordinación y Estados)**: **READY** (conectado a backend, identidad exacta de coordinador, gestión durable, feedback parcial en fallas de notas, filtrado temporal).
- **Bloque 2 (Notificaciones)**: **READY** (markAsRead por ID real, resolución de destino con surgeryId + context, protección contra respuestas en vuelo de scopes anteriores).
- **Bloque 3 (Calendario Personal V1)**: **READY** (migración versionada `20261002110500_add_personal_calendar_events` aplicada exitosamente en PostgreSQL DEV, endpoints REST, validadores, UI CRUD completa, ciclo de aceptación real validado con test PostgreSQL "Visitar al Dr. Colman").

---

## Done
1. **Calendario Personal V1**:
   - Creada y aplicada la migración versionada `prisma/migrations/20261002110500_add_personal_calendar_events/migration.sql` en PostgreSQL DEV.
   - Implementado el servicio `src/lib/services/personal-calendar.service.ts` con aislamiento estricto por `companyId` + `userId`.
   - Implementadas las rutas REST `/api/companies/[companyId]/personal-events` (GET, POST) y `/api/companies/[companyId]/personal-events/[eventId]` (GET, PATCH, DELETE).
   - Conectada la pantalla `src/app/calendario/page.tsx` a la lectura directa de Cirugías backend e integrado el modal CRUD para eventos personales ("Visitar al Dr. Colman") con diferenciación visual índigo.
   - Protegida la lectura y mutación contra respuestas tardías de cambio de empresa/usuario mediante `eventsRequestIdRef` y `activeScopeRef`.
   - Validación integral en PostgreSQL real: ciclo crear → listar/recargar → editar → verificar → cancelar verificado en test de integración.

2. **Coordinación y Estados**:
   - Conectadas las vistas global y personal a la lectura backend duradera con `fetchBackendActiveSurgeries`.
   - Resuelta la identidad del coordinador sin substrings ni fallback "Nelson", mapeando usuarios y contactos por IDs reales.
   - Reutilizadas las mutaciones de gestión y estado (`updateBackendSurgeryManagement`, `updateBackendSurgeryState`, `addBackendSurgeryNote`).
   - Implementado manejo de éxito parcial con advertencia si la nota falla en el servidor pero la fecha/estado se guardan correctamente, preservando el input y evitando repeticiones silenciosas.
   - Corregido el filtrado temporal por día/período.

3. **Notificaciones & Scope asíncrono**:
   - Corregido `markAsRead` en `MobileNotificationsSheet.tsx` para usar `notification.id`.
   - Resueltos los destinos de navegación usando `notification.surgeryId` y `getNotificationEntryId` en vez de confundir `sourceEntityId`.
   - Añadida protección estricta en `src/hooks/useNotifications.ts` contra respuestas tardías (in-flight) cuando el usuario cambia de empresa o usuario durante la solicitud.

---

## Changed Files
- `prisma/schema.prisma`
- `prisma/migrations/20261002110500_add_personal_calendar_events/migration.sql`
- `src/lib/validators/personal-calendar.validator.ts`
- `src/lib/services/personal-calendar.service.ts`
- `src/app/api/companies/[companyId]/personal-events/route.ts`
- `src/app/api/companies/[companyId]/personal-events/[eventId]/route.ts`
- `src/lib/api/personal-calendar.ts`
- `src/lib/api/backend-surgeries.ts`
- `src/components/coordinadores/CoordinadoresAdminClient.tsx`
- `src/components/coordinadores/CoordinatorPersonalClient.tsx`
- `src/components/layout/MobileNotificationsSheet.tsx`
- `src/hooks/useNotifications.ts`
- `src/app/calendario/page.tsx`
- `src/__tests__/unit/personal-calendar.validator.test.ts`
- `src/__tests__/unit/personal-calendar.service.test.ts`
- `src/__tests__/unit/personal-calendar-routes.test.ts`
- `src/__tests__/unit/notifications-scope-race.test.tsx`
- `src/__tests__/integration/personal-calendar-postgres.test.ts`

---

## Validations
- **Migración PostgreSQL**: `prisma migrate deploy` -> `20261002110500_add_personal_calendar_events` aplicada exitosamente.
- **Test de Integración PostgreSQL Real**: `src/__tests__/integration/personal-calendar-postgres.test.ts` -> PASÓ (1/1, ciclo completo "Visitar al Dr. Colman").
- **Unit & Regression Suites**: `npx vitest run` -> 37/37 tests pasados en 6 suites:
  - `personal-calendar.validator.test.ts` (5/5)
  - `personal-calendar.service.test.ts` (5/5)
  - `personal-calendar-routes.test.ts` (4/4)
  - `notifications-scope-race.test.tsx` (1/1)
  - `internal-notifications.service.test.ts` (12/12)
  - `useCoordinationView.test.tsx` (10/10)
- **TypeScript**: `npx tsc --noEmit --incremental false` -> 0 errores.

---

## Risks
- Ninguno pendiente en el alcance DEV delimitado.

---

## Next
- Paquete completado y validado. Listo para revisión de cierre.
