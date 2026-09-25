# Resumen Estructurado de Módulos e Implementaciones

Estado: Vigente  
Ubicación: `knowledge/core/MODULOS_IMPLEMENTADOS_RESUMEN.md`  
Propósito: Documentación técnica y funcional exhaustiva de los desarrollos, modularizaciones y refactors realizados en el frontend y servicios operativos de OSSUM COR.

---

## 1. Módulo Cirugías: Grilla Operativa de Alta Densidad & View Customization

### 1.1 Grilla Operativa (`CirugiasDataGrid`)
- **Arquitectura de columnas fijas (sticky):** Implementación de triple anclaje izquierdo (`ID CX`, `Estado CX`, `Paciente`) y columna fija derecha (`Acciones`), garantizando legibilidad y navegación horizontal fluida sobre datasets de alta densidad.
- **Op-Tabs Operativas:** Barra de segmentación instantánea por casuística crítica:
  - *Todas*, *🚨 Urgentes*, *Sin fecha*, *Prep pendiente*, *Requiere atención*, *Sin PR*, *Sin consumo*, *Sin factura*.
- **Bandeja Contextual Sincronizada (`SurgeryContextTray`):** Panel inferior dinámico (105px) que expone en tiempo real al seleccionar cualquier fila: resumen del caso, materiales autorizados (máximo 3 con indicador de remanente) y última novedad registrada con micro-badge de severidad.
- **Paginación y Densidad Operativa:** Pie de paginación (`SurgeryPaginationFooter`) con selector de tamaño de página (25/50/100) y métricas de resultados totales.

### 1.2 Sistema de Personalización de Vistas (`view-customization/`)
- **Modos de Densidad:** Alternancia inmediata entre densidad *Estándar* (32px por fila) y *Compacta* (26px por fila).
- **Variantes de Estado CX:**
  - `Celda coloreada` (fondo tonal distintivo por estado).
  - `Barra lateral` (acento cromático vertical de 4px).
  - `Punto / Indicador sutil` (badge minimalista).
- **Gestor de Columnas:** Configuración granular de visibilidad, reordenamiento y fijación de hasta 22 columnas operativas con persistencia en preferencias locales y presets rápidos (*Operativo*, *Extremo*, *Clínico*, *Logística*).

### 1.3 Diálogos Operativos y Acciones Rápidas
- Modales atómicos desacoplados en `src/components/cirugias/dialogs/`:
  - `NewSurgeryDialog`: Alta de intervención quirúrgica con validación contextual de contactos y fechas.
  - `ChangeStateDialog`: Transición controlada de estados quirúrgicos según el circuito canónico.
  - `ChangeDateDialog`: Reprogramación y asignación de turno quirúrgico.
  - `AddNoteDialog`: Registro directo de novedades operativas.
  - `SuspendDialog` y `CancelDialog`: Protocolo de suspensión y cancelación con motivo tipificado.

---

## 2. Módulo Coordinadores & Tableros Operativos

### 2.1 Clientes de Supervisión y Bandeja Personal
- **Coordinadores Admin Client (`CoordinadoresAdminClient.tsx`):** Panel de control para supervisores con métricas en tiempo real, filtro por coordinador asignado, alertas por estado y distribución de carga.
- **Bandeja Personal (`CoordinatorPersonalClient.tsx` / `CoordinatorInboxView.tsx`):** Espacio enfocado para el coordinador con bandeja de pendientes, tareas asignadas y casos urgentes.

### 2.2 Vistas Temporales y Agrupaciones
- **Vistas Multitemporales (`src/components/coordinadores/views/`):**
  - Vista Día (`DayViewDesktopTable.tsx`).
  - Vista Semana (`WeekViewDesktopGrid.tsx`).
  - Vista Mes / Calendario (`MonthViewDesktopCalendar.tsx`).
- **Sección por Buckets (`CoordinatorBucketSection.tsx` & `CoordinatorCaseCard.tsx`):** Clasificación visual por franjas operativas y criticidad del caso.

### 2.3 Modales Operativos y Gestión de Casos (`modal/`)
- `DefineDateModal`: Definición y ajuste rápido de fecha quirúrgica con feedback accesible (`useSurgeryModalA11y`).
- `EditMaterialsModal`: Modificación de instrumental, prótesis y cajas requeridas para la cirugía.
- `TabPaneSeguimiento` y `TabPaneGestion`: Paneles internos para el registro y trazabilidad de gestiones con prestadores e instituciones.

### 2.4 Centro de Compartir, Despacho y Notificaciones
- `CoordinatorShareDialog.tsx`: Modal integral para compartir información del caso:
  - Generación dinámica de tarjeta visual de caso en Canvas (`surgery-card-canvas.ts`).
  - Formateo y copia de mensajes predefinidos para WhatsApp (médicos, logística, técnicos).
  - Integración con notificaciones push mediante servicio `ntfy.service.ts` y script auxiliar.

---

## 3. Módulo Expediente Quirúrgico & Novedades

### 3.1 Expediente Unificado
- `ExpedienteFullView.tsx` y `ExpedienteHeader.tsx`: Cabecera enriquecida con estado, alertas de circuito, accesos directos y navegación contextual (`expediente-navigation.ts`).
- `EditFichaDrawer.tsx` y `FichaTabContent.tsx`: Cajón lateral de edición rápida de la ficha de paciente, afiliación, institución, médico y equipo técnico.
- `RemitosSummaryCard.tsx`: Tarjeta resumen de remitos asociados, estado de entrega y preparación de materiales.

### 3.2 Sistema de Novedades y Menciones
- `NovedadesTabContent.tsx`: Muro cronológico de novedades con filtro por severidad, autor y adjuntos.
- `MentionComposer.tsx`: Compositor avanzado con soporte para autocompletado de menciones a usuarios y roles operativos con atajos de teclado.

---

## 4. Presupuestos, Identidad Comercial & Motor de PDF Theming

### 4.1 Identidad Comercial en Presupuestos
- `PresupuestoCommercialIdentityFields.tsx`: Selector y configuración de cabeceras comerciales, logos, condiciones fiscales y leyenda legal según la empresa/sucursal emisora.
- `ClasificacionSelectorModal.tsx`: Clasificación jerárquica de líneas de presupuesto.
- Hook centralizado `usePresupuestoForm.ts` y endpoints asociados.

### 4.2 Motor de Plantillas y Primitives PDF
- `src/lib/pdf-primitives.tsx` y `src/lib/pdf-svg.tsx`: Primitivas tipadas para maquetado de documentos PDF con React-PDF / Print.
- `src/lib/pdf-themes/`: Sistema extensible de temas visuales para comprobantes comerciales (Modern, Classic, Compact).
- `financial-document-email.ts`: Validador de permisos para emisión y envío de comprobantes por correo electrónico.

---

## 5. Layout, App Shell, Notificaciones & UI Compartida

### 5.1 App Shell y Menús de Utilidad
- `src/components/layout/ShellUtilityMenus.tsx`: Menús flotantes de notificaciones, perfil, accesos rápidos y selector de contexto multiempresa.
- `src/components/layout/header.tsx` y `sidebar.tsx`: Navegación principal optimizada con badges de estado.
- `src/app/perfil/page.tsx`: Página de gestión de perfil de usuario.

### 5.2 Centro de Notificaciones
- `NotificationsInbox.tsx`, `NotificationListItem.tsx` y `NotificationStateSurface.tsx`: Bandeja de notificaciones con categorización visual, filtros leídas/no leídas y disparadores de navegación directa al expediente o caso.

### 5.3 UI Primitives Compartidos
- `src/components/ui/form-layout.tsx`: Sistema estándar de grids y espaciados para formularios.
- `src/components/ui/user-avatar.tsx`: Componente de avatar unificado con estados de presencia y fallback de iniciales.
- `src/components/shared/image/ImageViewerDialog.tsx`: Visor modal de imágenes/documentos adjuntos con zoom y rotación.

---

## 6. Testing y Quality Assurance

- **Unit Tests & Component Tests:**
  - `CirugiasDataGrid.test.tsx`: Validación de rendering, ordenamiento, selección de fila y Op-Tabs.
  - `ViewCustomizationDialog.test.tsx`: Comprobación de cambio de variantes de estado, densidad y visibilidad de columnas.
  - `CoordinatorActionConfirmDialog.test.tsx` y `DefineDateModal.test.tsx`: Interacciones y accesibilidad en modales de coordinación.
  - `NotificationMenu.test.tsx` y `NotificationsInbox.test.tsx`: Gestión y marcado de notificaciones.
  - `NovedadesTabContent.test.tsx` y `coordination-view-route.test.ts`: Flujo de novedades y filtros de coordinación.
