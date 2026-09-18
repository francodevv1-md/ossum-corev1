# FASE A — Exploración del Wizard Real

## OSSUM COR — IA de Autorizaciones

**Tipo**: Informe de exploración read-only  
**Fecha**: Junio 2026  
**Objetivo**: Confirmar estructura real del wizard, mapeo de campos, flujo de guardado, y puntos exactos de integración antes de escribir código.

---

## 1. Wizard Real — `NewSurgeryDialog.tsx`

### 1.1 Datos generales

| Atributo | Valor |
|---|---|
| **Archivo exacto** | `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` |
| **Líneas totales** | 1053 líneas |
| **Export** | `export function NewSurgeryDialog(props: NewSurgeryDialogProps)` |
| **Tipo de componente** | Dialog modal (shadcn/ui `Dialog`) |
| **Pasos** | 3 pasos (índices 0, 1, 2) |
| **Nombres de pasos** | `STEP_LABELS = ["Datos del caso", "Presupuesto", "Confirmación"] as const` |

### 1.2 Props del componente

```ts
interface NewSurgeryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wizardStep: number
  setWizardStep: (step: number) => void
  newForm: NewSurgeryForm
  setNewForm: React.Dispatch<React.SetStateAction<NewSurgeryForm>>
  createPRNow: boolean
  setCreatePRNow: (v: boolean) => void
  prForm: { ... }   // Objeto completo del hook usePresupuestoForm
  onConfirm: () => boolean
  createdSurgeryId?: string
  instrumentadores: string[]
}
```

**Dato clave**: `setNewForm` es un `Dispatch<SetStateAction<NewSurgeryForm>>`. Esto significa que desde un componente hijo (como un `AiResultsPanel`), se puede llamar directamente a `setNewForm()` para precargar datos. Pero como el estado vive en `useCirugiaActions.ts` (línea 47: `const [newForm, setNewForm] = useState<NewSurgeryForm>(...)`), la integración IA debe recibir `setNewForm` como prop o callback.

### 1.3 Estados internos del dialog

| Estado | Tipo | Uso |
|---|---|---|
| `step0Errors` | `Step0Errors` | Errores de validación del Paso 0 (patient, surgeon, institution, client, classification) |
| `step1Errors` | `Step1Errors` | Errores de validación del Paso 1 (fechaEmision, vigencia, listaPrecios, items) |
| `creationDone` | `boolean` | Controla si se muestra el panel post-creación |
| `cancelConfirmOpen` | `boolean` | Diálogo de confirmación al cancelar con datos sucios |
| `autoFilledProvincia` | `boolean` | Indica si provincia se auto-completo desde institución |
| `autoFilledLocalidad` | `boolean` | Indica si localidad se auto-completo desde institución |
| `step0Ref` | `RefObject` | Ref al contenedor del Paso 0 (para scroll-to-error) |
| `step1Ref` | `RefObject` | Ref al contenedor del Paso 1 (para scroll-to-error) |

### 1.4 Estructura del Paso 0 — "Datos del caso"

El Paso 0 se renderiza en las líneas **348-633** del archivo. Su estructura interna es:

```
Paso 0 (líneas 348-633)
├── Section 1: "Datos principales" (línea 352)
│   ├── Switch Urgente
│   ├── ContactLookupField — Cliente / Pagador *
│   ├── ContactLookupField — Paciente *
│   ├── ContactLookupField — Médico *
│   ├── ContactLookupField — Institución *
│   ├── Clasificación (ClasificacionSelectorModal)
│   ├── Input date — Fecha CX
│   ├── Input time — Hora
│   ├── Input date — Fecha probable
│   └── Input date — Fecha envío material
├── Section 2: "Ubicación y gestión" (línea 507)
│   ├── Select — Provincia
│   ├── Select — Localidad
│   ├── ContactLookupField — Coordinador de CX
│   ├── ContactLookupField — Vendedor
│   └── ContactLookupField — Instrumentador
├── Section 3: "Referencias administrativas" (línea 601)
│   └── ReferenciasAdministrativasEditor
└── Section 4: "Observaciones" (línea 609)
    ├── Textarea — Leyenda
    ├── Checkbox — Destacada
    └── Textarea — Notas internas
```

### 1.5 ¿Dónde conviene insertar la sección "Cargar autorización con IA"?

**Ubicación recomendada**: Al inicio del Paso 0, **inmediatamente después de la apertura del `<div ref={step0Ref}>`** (línea 349), y **antes de `<h3>Datos principales</h3>`** (línea 352).

```tsx
{/* ═══════════ Paso 0 — Datos del caso ═══════════ */}
{wizardStep === 0 && !creationDone && (
  <div ref={step0Ref} className="space-y-1 overflow-y-auto flex-1 px-4 py-3">

+++ {/* ── INSERTAR AQUÍ: Sección IA colapsable ── */}
+++ <Collapsible open={aiSectionOpen} onOpenChange={setAiSectionOpen}>
+++   <CollapsibleTrigger className="flex items-center gap-2 w-full ...">
+++     <Sparkles className="size-4" />
+++     <span>Cargar desde autorización (IA)</span>
+++   </CollapsibleTrigger>
+++   <CollapsibleContent>
+++     {!aiResult ? <AiUploadZone ... /> : <AiResultsPanel ... />}
+++   </CollapsibleContent>
+++ </Collapsible>

    {/* ── Section 1: Datos principales ── */}
    <h3 className="...">Datos principales</h3>
    ...
```

**Justificación**:
- Antes de "Datos principales" para que el usuario pueda cargar la autorización primero y luego ver los datos precargados en las secciones siguientes.
- Colapsable (cerrado por defecto) para no interferir con el flujo normal del wizard.
- Usa el mismo espacio de scroll (`step0Ref`) sin necesidad de refs adicionales.

### 1.6 Partes que NO se deben tocar

| Sección | Razón |
|---|---|
| `validateStep0()` (línea 167) | Lógica de validación crítica. La IA no debe modificar qué campos son obligatorios. |
| `handleNext()` (línea 224) | Navegación entre pasos. |
| `handleConfirm()` (línea 274) | Dispara `onConfirm()` que llama a `handleNewSurgery()` en el hook padre. |
| `handleClose()` / `handleRequestClose()` (líneas 282, 294) | Lógica de cierre con confirmación de datos sucios. |
| `ContactLookupField` internals | Componentes de búsqueda de contactos. Solo se debe modificar el valor de texto sugerido, no su funcionamiento. |
| `prForm` y Paso 1 completos | El presupuesto no debe recibir datos de la IA en MVP. |
| `PostCreationPanel` | Panel post-creación, no relacionado con IA. |

---

## 2. Tipo Real del Formulario — `NewSurgeryForm`

### 2.1 Definición

| Atributo | Valor |
|---|---|
| **Nombre exacto** | `NewSurgeryForm` |
| **Archivo** | `src/lib/cirugias.types.ts` (líneas 107-137) |
| **Tipo** | `interface` (no Zod schema) |
| **Empty constant** | `EMPTY_NEW_FORM` (líneas 143-160) |

### 2.2 Campos completos — con notas de IA

```ts
export interface NewSurgeryForm {
  // ── Datos del paciente/médico (TEXTO SUGERIDO — no ContactLookupField directo) ──
  patient: string              // ← IA: paciente
  surgeon: string              // ← IA: medico
  institution: string          // ← IA: institucion
  client: string               // ← IA: ¿obra_social? (requiere decisión)

  // ── IDs de contacto (asignados por ContactLookupField, NO por IA) ──
  clientContactId?: string     // NO tocar desde IA
  surgeonContactId?: string    // NO tocar desde IA
  patientContactId?: string    // NO tocar desde IA
  institutionContactId?: string // NO tocar desde IA
  vendedorContactId?: string   // NO tocar desde IA
  instrumentadorContactId?: string // NO tocar desde IA
  coordinadorContactId?: string // NO tocar desde IA

  // ── Clasificación ──
  classification: SurgeryClassification | ""  // NO viene de IA

  // ── Fechas ──
  date: string                 // ← IA: fecha_cirugia (YYYY-MM-DD)
  time: string                 // NO viene de IA
  probableDate: string         // ← IA: fecha_autorizacion? o fecha_cirugia? (requiere decisión)
  fechaEnvioMaterial: string   // NO viene de IA

  // ── Ubicación ──
  provincia: string            // NO viene de IA
  localidad: string            // NO viene de IA
  institutionCity: string      // NO viene de IA

  // ── Personal ──
  instrumentador: string       // NO viene de IA
  vendedor: string             // NO viene de IA
  coordinadorCx: string        // NO viene de IA

  // ── Flags ──
  urgente: boolean             // NO viene de IA

  // ── Textos libres ──
  notes: string                // ← IA: observaciones + material_autorizado (concatenado)
  leyenda: string              // NO viene de IA
  leyendaDestacada: boolean    // NO viene de IA

  // ── REFERENCIAS ADMINISTRATIVAS (donde van DNI, autorización, siniestro, póliza) ──
  referenciasAdministrativas: ReferenciaAdministrativa[]
  // ← IA: dni → tipo "DNI"
  // ← IA: numero_autorizacion → tipo "Autorización"
  // ← IA: numero_siniestro → tipo "Siniestro"
  // ← IA: numero_poliza → tipo "Ref" u "Otro" (no existe tipo "Póliza")
  // ← IA: obra_social → tipo "Afiliado" o "Ref" (no existe tipo "Obra Social")
  // ← IA: fecha_autorizacion → tipo "Ref" (no existe tipo específico)
}
```

### 2.3 Campos que NO existen en el wizard (confirmado)

El comentario en `cirugias.types.ts` línea 139-141 lo confirma explícitamente:

```ts
// NOTE: obraSocial, financiador, and patientDni are NOT in the wizard form anymore.
// They still exist on the Surgery model for backward compat and other modules.
// patientDni can be populated from referenciasAdministrativas where tipo === "DNI".
```

**NO existen**: `patientDni`, `obraSocial`, `financiador`, `numeroAutorizacion`, `numeroSiniestro`, `numeroPoliza`, `fechaAutorizacion`, `materialAutorizado`.

### 2.4 Tipo `ReferenciaAdministrativa` y `TipoReferencia`

Definido en `src/types/index.ts` (líneas 58-67):

```ts
export type TipoReferencia =
  | "Autorización" | "DNI" | "Expediente" | "Siniestro" | "Concurso"
  | "Afiliado" | "CM" | "HC" | "Orden" | "Ref" | "Otro"

export interface ReferenciaAdministrativa {
  id: string
  tipo: TipoReferencia
  valor: string
  observacion?: string
}
```

**Tipos disponibles y su uso para IA**:

| TipoReferencia | Usar para campo IA | Notas |
|---|---|---|
| `"DNI"` | `dni` | ✅ Match perfecto. `normalizeDni()` → valor numérico puro. |
| `"Autorización"` | `numero_autorizacion` | ✅ Match perfecto. |
| `"Siniestro"` | `numero_siniestro` | ✅ Match perfecto. |
| `"Afiliado"` | `obra_social` | ✅ Puede usarse. Nº de afiliado si está disponible. |
| `"Ref"` | `numero_poliza`, `obra_social`, `fecha_autorizacion` | ⚠️ Genérico. Usar con `observacion` para aclarar. |
| `"Otro"` | `numero_poliza`, `fecha_autorizacion` | ⚠️ Último recurso. |
| `"Expediente"` | ❌ NO usar | Ya tiene significado distinto (nº de expediente judicial/ART). |
| `"Concurso"` | ❌ NO usar | Significado específico (concurso de precios). |
| `"CM"` | ❌ NO usar | Historia clínica. |
| `"HC"` | ❌ NO usar | Historia clínica. |
| `"Orden"` | ❌ NO usar | Orden de compra. |

**⚠️ HALLAZGO CRÍTICO**: No existe tipo `"Póliza"` ni `"Obra Social"` en el enum `TipoReferencia`. Deben usarse los tipos existentes:
- `numero_poliza` → `tipo: "Ref"` con `observacion: "Póliza"` o `tipo: "Otro"` con `observacion: "Póliza"`
- `obra_social` → `tipo: "Afiliado"` si es nº de afiliado, o `tipo: "Ref"` con `observacion: "Obra Social"`
- `fecha_autorizacion` → `tipo: "Ref"` con `observacion: "Fecha autorización"`

---

## 3. Mapeo IA → Wizard Real

### 3.1 Tabla de mapeo definitiva

| Campo IA (`AutorizacionExtracted`) | Destino wizard | Tipo de asignación | Transformación | ¿Requiere decisión de Franco? |
|---|---|---|---|---|
| `paciente` | `newForm.patient` (string) | ✅ Directo | Sin transformación. Se asigna como texto sugerido. El `ContactLookupField` de paciente muestra este texto. El usuario debe mapear al contacto real manualmente. | No |
| `dni` | `newForm.referenciasAdministrativas[]` | ✅ Vía referencias | `normalizeDni("28.456.789")` → `"28456789"`. Insertar `{ tipo: "DNI", valor: "28456789" }`. `handleNewSurgery()` ya extrae DNI de referencias. | No |
| `medico` | `newForm.surgeon` (string) | ✅ Directo | Sin transformación. Texto sugerido para `ContactLookupField` de médico. | No |
| `institucion` | `newForm.institution` (string) | ✅ Directo | Sin transformación. Texto sugerido para `ContactLookupField` de institución. | No |
| `obra_social` | **Opción A**: `newForm.client` (string) + **Opción B**: `referenciasAdministrativas` `{ tipo: "Afiliado" o "Ref" }` | ⚠️ Mixto | Sin transformación. | **SÍ — D3 del plan** |
| `numero_autorizacion` | `referenciasAdministrativas` `{ tipo: "Autorización", valor: "..." }` | ✅ Vía referencias | Sin transformación. | No |
| `numero_siniestro` | `referenciasAdministrativas` `{ tipo: "Siniestro", valor: "..." }` | ✅ Vía referencias | Sin transformación. | No |
| `numero_poliza` | `referenciasAdministrativas` `{ tipo: "Ref", valor: "...", observacion: "Póliza" }` | ✅ Vía referencias | Sin transformación. Usar `tipo: "Ref"` porque no existe `"Póliza"`. | No |
| `fecha_autorizacion` | `referenciasAdministrativas` `{ tipo: "Ref", valor: "YYYY-MM-DD", observacion: "Fecha autorización" }` o `newForm.probableDate` | ⚠️ Dual | `normalizeDate()` → YYYY-MM-DD. | **SÍ — decidir si además va a probableDate** |
| `fecha_cirugia` | `newForm.date` (string) | ✅ Directo | `normalizeDate()` → YYYY-MM-DD. Campo `<input type="date">` acepta este formato. | No |
| `material_autorizado` | `newForm.notes` (string) | ✅ Directo (texto) | Formatear array como texto: `"MATERIAL AUTORIZADO (IA):\n• CODE — Desc (xCant) $Precio"`. Concatenar con `observaciones`. | No para MVP |
| `observaciones` | `newForm.notes` (string) | ✅ Directo | Concatenar con material_autorizado si ambos existen. | No |

### 3.2 Campos que la IA NO debe tocar

| Campo | Razón |
|---|---|
| `*ContactId` (patient, surgeon, institution, client, etc.) | Son asignados por `ContactLookupField` cuando el usuario selecciona un contacto real. La IA solo sugiere texto. |
| `classification` | Requiere selección manual del usuario vía `ClasificacionSelectorModal`. |
| `time` | No viene en autorizaciones típicamente. |
| `fechaEnvioMaterial` | No es dato de autorización. |
| `provincia`, `localidad`, `institutionCity` | No son datos de autorización. |
| `instrumentador`, `vendedor`, `coordinadorCx` | No son datos de autorización. |
| `urgente` | No es dato de autorización. |
| `leyenda`, `leyendaDestacada` | No son datos de autorización. |

### 3.3 Función de mapeo — firma recomendada

```ts
// src/lib/validators/autorizacion-ai.ts (a crear en Fase B)

import type { NewSurgeryForm } from "@/lib/cirugias.types";
import type { ReferenciaAdministrativa } from "@/types";

export function mapAiToWizardForm(
  extracted: AutorizacionExtracted
): {
  formFields: Partial<NewSurgeryForm>;
  warnings: string[];
}
```

**Comportamiento**:
1. Inicializa `warnings = []`.
2. Si `extracted.paciente` tiene valor → `formFields.patient = extracted.paciente`.
3. Si `extracted.medico` tiene valor → `formFields.surgeon = extracted.medico`.
4. Si `extracted.institucion` tiene valor → `formFields.institution = extracted.institucion`.
5. Si `extracted.dni` tiene valor → normalizar y agregar a `referenciasAdministrativas` con `tipo: "DNI"`.
6. Si `extracted.numero_autorizacion` tiene valor → agregar a `referenciasAdministrativas` con `tipo: "Autorización"`.
7. Si `extracted.numero_siniestro` tiene valor → agregar a `referenciasAdministrativas` con `tipo: "Siniestro"`.
8. Si `extracted.numero_poliza` tiene valor → agregar a `referenciasAdministrativas` con `tipo: "Ref"`, `observacion: "Póliza"`.
9. Si `extracted.obra_social` tiene valor → agregar a `referenciasAdministrativas` con `tipo: "Ref"`, `observacion: "Obra Social: ${valor}"`. Además, si `newForm.client` está vacío, sugerir como `client`.
10. Si `extracted.fecha_cirugia` tiene valor → `normalizeDate()` y asignar a `formFields.date`.
11. Si `extracted.fecha_autorizacion` tiene valor → `normalizeDate()` y agregar a `referenciasAdministrativas` con `tipo: "Ref"`, `observacion: "Fecha autorización"`. Si `probableDate` está vacío, también asignarlo allí.
12. Si `extracted.material_autorizado` tiene items → formatear como texto y concatenar con `observaciones`.
13. Retornar `{ formFields, warnings }`.

---

## 4. Flujo Actual de Guardado

### 4.1 Traza completa

```
Usuario click en "Crear cirugía" (Paso 2 del wizard)
  │
  ▼
NewSurgeryDialog.handleConfirm()                    [línea 274]
  │
  ▼
props.onConfirm()                                   [prop del padre]
  │
  ▼
useCirugiaActions.handleNewSurgery()                [línea 74, src/hooks/useCirugiaActions.ts]
  │
  ├── Extrae DNI de referenciasAdministrativas      [línea 77-78]
  │     const dniRef = newForm.referenciasAdministrativas
  │                    .find(r => r.tipo === "DNI" && r.valor.trim())
  │     const patientDni = dniRef ? dniRef.valor.trim() : ""
  │
  ├── store.createSurgery({...newForm, patientDni, ...})  [línea 80]
  │     │
  │     ▼
  │   store.createSurgery (Zustand)                 [línea 290, src/lib/store.ts]
  │     │
  │     ├── Genera ID: generateId("CX")
  │     ├── Crea objeto Surgery
  │     ├── Agrega a state.surgeries[]
  │     └── store.addAuditEvent(id, "Creación", "Cirugía creada")
  │
  └── Si createPRNow:
        store.createBudgetForSurgery(surgery.id, {...})
```

### 4.2 Dónde se guarda realmente

| Capa | Mecanismo | Persistencia |
|---|---|---|
| **Zustand store** (`src/lib/store.ts`) | `create()` + `persist(middleware)` con `createJSONStorage(() => localStorage)` | ✅ Sobrevive a refrescos de página. Se pierde si se limpia localStorage. |
| **Backend PostgreSQL** (`src/lib/services/surgery.service.ts`) | `createSurgery(prisma, companyId, input)` → Prisma → PostgreSQL | ✅ Persistencia real. **Pero el wizard actual NO lo usa.** |
| **API real** (`POST /api/companies/[companyId]/surgeries`) | Endpoint protegido que usa `surgery.service.ts` | ✅ Listo para migración. |

**⚠️ HALLAZGO CLAVE**: El wizard actual **NO persiste en PostgreSQL**. Usa Zustand con localStorage. El backend `surgery.service.ts` existe pero el flujo `handleNewSurgery()` no lo invoca. Esto es consistente con el estado de transición del proyecto (GPT-027F.0A/0B → 5A Backend Foundation).

**Implicación para IA**: La integración IA es ortogonal al mecanismo de guardado. Si mañana se migra el wizard a `surgery.service.ts`, la IA no necesita cambios porque solo precarga `newForm`. El guardado lo maneja `handleNewSurgery()`.

### 4.3 Qué NO debe modificarse

- `handleNewSurgery()` — la IA no debe alterar cómo se crea la cirugía.
- `store.createSurgery()` — no agregar lógica de IA en el store.
- `surgery.service.ts` — no tocar para este módulo.
- El flujo de guardado es 100% agnóstico a la IA.

---

## 5. Backend/API Real

### 5.1 Rutas existentes de cirugía

| Método | Ruta | Archivo | Función |
|---|---|---|---|
| `GET` | `/api/companies/[companyId]/surgeries` | `src/app/api/companies/[companyId]/surgeries/route.ts` | Listar cirugías |
| `POST` | `/api/companies/[companyId]/surgeries` | ⚠️ No existe aún (solo GET implementado) | Crear cirugía |
| `PATCH` | `/api/companies/[companyId]/surgeries/[surgeryId]` | `src/app/api/companies/[companyId]/surgeries/[surgeryId]/route.ts` | Actualizar cirugía |
| `PATCH` | `/api/companies/[companyId]/surgeries/[surgeryId]/status` | `src/app/api/companies/[companyId]/surgeries/[surgeryId]/status/route.ts` | Cambiar estado |

**⚠️ HALLAZGO**: `GET` está implementado pero `POST` para crear cirugías **no existe aún como endpoint**. Esto refuerza que el wizard actual usa Zustand, no la API.

### 5.2 Patrón de autenticación (confirmado)

Cada endpoint sigue este patrón:

```ts
import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../lib/api/responses";

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);
    // ... lógica
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}
```

**Helpers disponibles**:

| Helper | Archivo | Uso |
|---|---|---|
| `getApiAuthContext(request, companyId)` | `src/lib/api/auth-context.ts` | Resuelve actor desde Bearer token (Supabase) o DEV header. Valida User activo + acceso a la empresa. |
| `requireCompanyReadAccess(ctx)` | `src/lib/api/guards.ts` | No-op defensivo (validación ya hecha en `getApiAuthContext`). |
| `requireCompanyMutationAccess(ctx, roles)` | `src/lib/api/guards.ts` | Verifica que `ctx.role` esté en `allowedRoles`. |
| `ok(data)` | `src/lib/api/responses.ts` | `NextResponse.json({ data }, { status: 200 })`. |
| `errorResponse(error)` | `src/lib/api/responses.ts` | Maneja `ApiError` (con status) o errores genéricos (500). |
| `getStringParam(params, key)` | `src/lib/api/query.ts` | Extrae string de searchParams. |
| `getNonNegativeIntegerParam(params, key)` | `src/lib/api/query.ts` | Extrae integer >= 0 de searchParams. |

### 5.3 Ruta recomendada para ai-extract

```
POST /api/companies/[companyId]/surgeries/ai-extract
```

**Archivo**: `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts`

**Rol requerido**: `requireCompanyMutationAccess(ctx, ["admin", "manager", "coordinator", "owner", "super_admin"])` — mismos roles que pueden crear cirugías.

### 5.4 Cliente HTTP — `apiFetch<T>()`

Definido en `src/lib/api/client.ts`:

```ts
export async function apiFetch<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T>
```

- Adjunta automáticamente `Authorization: Bearer <token>` (desde Supabase Auth).
- Parsea respuesta JSON.
- Lanza `ApiClientError` en errores 4xx/5xx.
- Dispara evento `ossum:auth-expired` en 401.

**⚠️ Para usar en el frontend**: Se necesita el `companyId` para construir la URL. Verificar cómo obtenerlo en el cliente (posiblemente del store `useOrtoTrackStore` o de un contexto).

---

## 6. Dependencias

### 6.1 Confirmadas desde `package.json`

| Paquete | Versión | Estado | Uso en módulo IA |
|---|---|---|---|
| `zod` | `^4.0.2` | ✅ INSTALADO | Schemas de extracción |
| `react-hook-form` | `^7.60.0` | ✅ INSTALADO | Ya usado en el wizard |
| `@hookform/resolvers` | `^5.1.1` | ✅ INSTALADO | Integración Zod + RHF (si se necesita) |
| `@tanstack/react-query` | `^5.82.0` | ✅ INSTALADO | `useMutation` para `useAiExtraction` |
| `sharp` | `^0.34.3` | ✅ INSTALADO | Conversión PDF→imagen (futuro) |
| `date-fns` | `^4.1.0` | ✅ INSTALADO | `parse()` + `format()` para normalizar fechas |
| `lucide-react` | `^0.525.0` | ✅ INSTALADO | Iconos en componentes UI |
| `zustand` | `^5.0.6` | ✅ INSTALADO | Solo lectura (companyId) |
| **`z-ai-web-dev-sdk`** | — | ❌ **NO INSTALADO** | Provider VLM real. **Instalar en Fase F.** |

### 6.2 Dependencias NO estándar detectadas

- `sonner` (`^2.0.6`): Para toasts (ya usado en `useCirugiaActions`).
- `next-themes` (`^0.4.6`): Theme provider (ya en layout).
- `@prisma/client` + `@prisma/adapter-pg`: Backend ORM (no usado por el wizard actual).

---

## 7. Auditoría y Seguridad

### 7.1 Sistema de auditoría

| Helper | Archivo | Firma |
|---|---|---|
| `createAuditEvent(input)` | `src/lib/audit.ts` | `(input: AuditEventInput) => Promise<AuditEvent>` |
| `store.addAuditEvent(...)` | `src/lib/store.ts` | `(entityId, action, detail, oldValue?, newValue?) => void` |

**`createAuditEvent` (backend)** requiere:
```ts
{
  prisma: PrismaClient | TransactionClient,
  companyId: string,
  userId: string,
  entityType: string,    // ej: "ai_extraction"
  entityId: string,      // ej: surgeyId o requestId
  action: string,        // ej: "ai_extract"
  module: string,        // ej: "ia-autorizaciones"
  detail?: string,
  oldValue?: unknown,
  newValue?: unknown,
  metadata?: unknown,    // ← recomendado para: provider, confidence, mimeType, fileSize, duration
}
```

**`addAuditEvent` (store/Zustand)** ya se usa en `createSurgery`:
```ts
get().addAuditEvent(surgery.id, "Creación", "Cirugía creada")
```

### 7.2 Qué auditar en extracciones IA

| Campo | Valor recomendado | Incluir |
|---|---|---|
| `entityType` | `"ai_extraction"` | ✅ |
| `action` | `"ai_extract"` | ✅ |
| `module` | `"ia-autorizaciones"` | ✅ |
| `metadata.provider` | `"z-ai"` / `"mock"` | ✅ |
| `metadata.confidence` | `0.85` | ✅ |
| `metadata.mimeType` | `"image/jpeg"` | ✅ |
| `metadata.fileSize` | `245760` | ✅ |
| `metadata.durationMs` | `3200` | ✅ |
| `metadata.warningsCount` | `1` | ✅ |
| `detail` | `"Extracción IA completada"` | ✅ |
| `extracted.paciente` | `"Juan Pérez"` | ❌ **NUNCA** — dato personal |
| `extracted.dni` | `"28456789"` | ❌ **NUNCA** — dato personal sensible |
| `base64 del archivo` | — | ❌ **NUNCA** — puede contener datos de salud |
| `raw_text_preview` | — | ❌ **NUNCA** — puede contener datos sensibles |

### 7.3 Regla de logging seguro

- ✅ Loguear: provider, confidence, mimeType, fileSize, duration, warnings count, timestamp.
- ❌ NO loguear: base64 del archivo, extracted data, raw_text_preview, DNI, nombres de pacientes.

---

## 8. Propuesta de Integración Mínima

### 8.1 Archivos nuevos (7 archivos)

| # | Archivo | Fase | Contenido |
|---|---|---|---|
| 1 | `src/lib/validators/autorizacion-ai.ts` | B | Schemas Zod + `mapAiToWizardForm()` + normalizadores |
| 2 | `src/lib/services/ai/types.ts` | C | `AIProvider` interface |
| 3 | `src/lib/services/ai/config.ts` | C | Config desde env vars |
| 4 | `src/lib/services/ai/providers/mock-provider.ts` | C | Datos hardcodeados |
| 5 | `src/lib/services/ai/autorizacion-extractor.ts` | C | Factory + `extractAutorizacion()` |
| 6 | `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts` | C | Endpoint POST protegido |
| 7 | `src/hooks/useAiExtraction.ts` | D | Hook con `useMutation` de React Query |
| 8 | `src/components/cirugias/AiUploadZone.tsx` | D | Drag-and-drop + file picker |
| 9 | `src/components/cirugias/AiResultsPanel.tsx` | D | Panel de resultados + botón Aplicar |

### 8.2 Archivos existentes a modificar (2 archivos)

| # | Archivo | Cambio | Fase |
|---|---|---|---|
| 1 | `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` | Agregar imports + sección colapsable IA en Paso 0 (línea ~351) | E |
| 2 | `.env.local` | Agregar `AI_PROVIDER`, `AI_TIMEOUT_MS`, `AI_MAX_FILE_SIZE_MB`, `AI_CONFIDENCE_THRESHOLD` | C |

### 8.3 Archivos que NO deben tocarse (lista de bloqueo)

```
prisma/schema.prisma
src/lib/db.ts
src/lib/prisma.ts
src/lib/store.ts
src/app/cirugias/page.tsx
src/hooks/useCirugiaActions.ts
src/lib/services/surgery.service.ts
src/lib/validators/surgery.validator.ts
src/lib/api/client.ts
src/lib/api/auth-context.ts
src/lib/api/guards.ts
src/lib/api/responses.ts
src/lib/audit.ts
next.config.ts
```

### 8.4 Punto exacto de inserción en `NewSurgeryDialog.tsx`

**Línea de inserción**: ~349 (inicio del contenido del Paso 0)

**Antes**:
```tsx
{wizardStep === 0 && !creationDone && (
  <div ref={step0Ref} className="space-y-1 overflow-y-auto flex-1 px-4 py-3">

    {/* ── Section 1: Datos principales ── */}
```

**Después** (con IA):
```tsx
{wizardStep === 0 && !creationDone && (
  <div ref={step0Ref} className="space-y-1 overflow-y-auto flex-1 px-4 py-3">

    {/* ── Section 0: IA Autorización (NUEVO) ── */}
    {aiSectionOpen !== undefined && (
      <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            Cargar desde autorización (IA)
          </h3>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setAiSectionOpen(false)}>
            Ocultar
          </Button>
        </div>
        {!aiResult ? (
          <AiUploadZone onExtract={handleAiExtract} isProcessing={isAiProcessing} />
        ) : (
          <AiResultsPanel
            result={aiResult}
            onApply={(data) => handleAiApply(data)}
            onReset={() => { setAiResult(null); setAiSectionOpen(false); }}
            onRetry={() => setAiResult(null)}
          />
        )}
      </div>
    )}

    {/* Si la sección IA está oculta, mostrar botón para abrirla */}
    {aiSectionOpen === false && (
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs gap-1.5 border-dashed border-muted-foreground/30 mb-3"
        onClick={() => setAiSectionOpen(true)}
      >
        <Sparkles className="size-3.5 text-emerald-600" />
        Cargar desde autorización (IA)
      </Button>
    )}

    {/* ── Section 1: Datos principales ── */}
```

### 8.5 Estados adicionales necesarios en el dialog

```ts
// Estados que deben agregarse al NewSurgeryDialog (o manejarse en el padre):
const [aiSectionOpen, setAiSectionOpen] = useState<boolean | undefined>(undefined)
const [aiResult, setAiResult] = useState<AutorizacionAIResponse | null>(null)
const [isAiProcessing, setIsAiProcessing] = useState(false)
```

### 8.6 Cómo pasar los datos IA al formulario

```ts
const handleAiApply = useCallback((extracted: AutorizacionExtracted) => {
  const { formFields } = mapAiToWizardForm(extracted);

  setNewForm(prev => {
    // Merge: solo sobreescribir campos vacíos
    const merged: NewSurgeryForm = { ...prev };

    // Campos de texto: solo si están vacíos
    if (!prev.patient && formFields.patient) merged.patient = formFields.patient;
    if (!prev.surgeon && formFields.surgeon) merged.surgeon = formFields.surgeon;
    if (!prev.institution && formFields.institution) merged.institution = formFields.institution;
    if (!prev.client && formFields.client) merged.client = formFields.client;
    if (!prev.date && formFields.date) merged.date = formFields.date;
    if (!prev.probableDate && formFields.probableDate) merged.probableDate = formFields.probableDate;
    if (!prev.notes && formFields.notes) merged.notes = formFields.notes;

    // referenciasAdministrativas: merge sin duplicar tipos
    if (formFields.referenciasAdministrativas) {
      const existingTipos = new Set(prev.referenciasAdministrativas.map(r => r.tipo));
      const newRefs = formFields.referenciasAdministrativas.filter(
        r => !existingTipos.has(r.tipo)
      );
      merged.referenciasAdministrativas = [...prev.referenciasAdministrativas, ...newRefs];
    }

    return merged;
  });

  // Cerrar sección IA después de aplicar
  setAiSectionOpen(false);
  toast.success("Datos de autorización aplicados al formulario");
}, [setNewForm]);
```

### 8.7 Cómo evitar tocar la lógica de guardado

La IA no interactúa con `handleNewSurgery()` en absoluto. Solo modifica `newForm` vía `setNewForm`. Cuando el usuario hace clic en "Crear cirugía", `handleNewSurgery()` lee `newForm` (que ya tiene los datos de IA + correcciones manuales) y procede normalmente. **Cero cambios en el flujo de guardado.**

### 8.8 Obtención del `companyId` en el frontend

**⚠️ PENDIENTE DE VERIFICACIÓN**: El `companyId` es necesario para construir la URL del endpoint (`/api/companies/${companyId}/surgeries/ai-extract`). Posibles fuentes:

1. `useOrtoTrackStore()` — si el store tiene `activeCompanyId`.
2. Contexto de React — si existe `CompanyProvider`.
3. `localStorage` — si se guarda al hacer login.
4. Variable de entorno `NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID` — ya existe en `.env.local`.

**Recomendación**: Verificar en Fase A extendida cómo obtiene `companyId` el frontend actual. Si no está disponible, agregar un mecanismo antes de la Fase D.

---

## 9. Riesgos Técnicos

### ALTO

| # | Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|---|
| **R1** | Integración en `NewSurgeryDialog.tsx` (1053 líneas) rompe el wizard existente | Crítico | Media | Sección colapsable independiente. Feature flag implícito: si `aiSectionOpen === undefined`, no se renderiza nada. No tocar validación ni navegación. |
| **R2** | `z-ai-web-dev-sdk` no instalado | Alto | Alta (confirmado: NO está) | Instalar en Fase F. Mientras tanto, mock provider permite desarrollar todo el resto. |
| **R3** | `companyId` no disponible en el frontend | Alto | Media | Verificar en exploración extendida. Si no existe, exponerlo desde el store o contexto antes de la Fase D. |
| **R4** | Mapeo de `TipoReferencia` no cubre todos los campos IA | Medio | Alta | Usar `"Ref"` con `observacion` para campos sin tipo específico (Póliza, Obra Social). Documentar en el código. |

### MEDIO

| # | Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|---|
| **R5** | `ContactLookupField` no muestra texto sugerido por IA | Medio | Media | El campo `patient` del `NewSurgeryForm` es un string. El `ContactLookupField` lo usa como valor inicial. Verificar que funcione en test visual. |
| **R6** | `referenciasAdministrativas` se duplican al aplicar IA múltiples veces | Bajo | Media | Merge con `Set` de tipos existentes. No duplicar tipo "DNI" si ya existe. |
| **R7** | Endpoint `ai-extract` sin `POST /api/companies/[companyId]/surgeries` existente | Bajo | Baja | La extracción IA es independiente de la creación de cirugía. Son endpoints separados. |
| **R8** | `setNewForm` desde callback de IA causa re-renders no deseados | Medio | Baja | Usar `useCallback` estable. El `setNewForm` ya se pasa como prop y es estable. |

### BAJO

| # | Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|---|
| **R9** | PDFs multi-página no procesables | Bajo | Media | MVP: solo imágenes (JPG/PNG/WebP). PDF en iteración siguiente con sharp. |
| **R10** | Timeout de IA en entorno real | Bajo | Baja | `AbortController` + `Promise.race` contra `AI_TIMEOUT_MS` (30s default). |
| **R11** | Migración futura del wizard a `surgery.service.ts` rompe la integración IA | Bajo | Baja | La IA es ortogonal al guardado. Solo precarga `newForm`. Funciona igual con Zustand o con API. |

---

## 10. Siguiente Task Recomendado

### Task Brief — Fase B: Schemas Zod + Mapper IA → Wizard Real

**Objetivo**: Crear el archivo `src/lib/validators/autorizacion-ai.ts` con:
- Schemas Zod para `MaterialAutorizadoItem`, `AutorizacionExtracted`, `AutorizacionAIResponse`.
- Tipos TypeScript derivados (`z.infer`).
- Funciones normalizadoras: `normalizeDni()`, `normalizeDate()` (usando `date-fns`).
- Función `mapAiToWizardForm(extracted: AutorizacionExtracted): { formFields: Partial<NewSurgeryForm>; warnings: string[] }` con mapeo declarativo según tabla de la sección 3.1.

**Archivos a crear**:
- `src/lib/validators/autorizacion-ai.ts`

**Archivos a NO tocar**:
- Lista de bloqueo completa (sección 8.3)

**Validaciones**:
1. Test unitario: `AutorizacionAIResponseSchema.parse(validJson)` funciona.
2. Test unitario: `AutorizacionAIResponseSchema.parse({ provider: "invalid" })` lanza error.
3. Test unitario: `normalizeDni("28.456.789") === "28456789"`.
4. Test unitario: `normalizeDate("15/03/2024") === "2024-03-15"`.
5. Test unitario: `mapAiToWizardForm(mockExtracted)` devuelve `patient`, `surgeon`, `institution`, `date`, `referenciasAdministrativas` con entradas correctas.
6. `npx tsc --noEmit` sin errores.
7. `npx vitest run` todos los tests pasan.

**Criterio de éxito**:
- Schemas Zod compilan y validan correctamente.
- `mapAiToWizardForm()` produce un `Partial<NewSurgeryForm>` con los campos correctos.
- Las fechas se normalizan a YYYY-MM-DD.
- El DNI se normaliza a solo dígitos.
- Las referencias administrativas usan los tipos correctos del enum `TipoReferencia`.

---

## Apéndice: Resumen de Hallazgos Clave

1. ✅ **Wizard es `NewSurgeryDialog.tsx`** (1053 líneas, 3 pasos, dialog modal). NO es una página separada.
2. ✅ **Punto de inserción exacto**: línea ~349 del archivo, antes de `<h3>Datos principales</h3>`.
3. ✅ **`NewSurgeryForm` NO tiene campos directos** para DNI, obra social, autorización, siniestro, póliza. Todos van a `referenciasAdministrativas[]`.
4. ⚠️ **`TipoReferencia` no incluye "Póliza" ni "Obra Social"**. Usar `"Ref"` con `observacion` o `"Afiliado"` para obra social.
5. ✅ **Flujo de guardado**: `handleNewSurgery()` → `store.createSurgery()` (Zustand). NO tocar.
6. ✅ **Ruta endpoint**: `POST /api/companies/[companyId]/surgeries/ai-extract`.
7. ❌ **`z-ai-web-dev-sdk` NO instalado**. Instalar en Fase F.
8. ✅ **Todas las demás dependencias instaladas**: zod 4.0, react-hook-form 7.60, sharp 0.34, date-fns 4.1, @tanstack/react-query 5.82.
9. ⚠️ **`companyId` en frontend**: pendiente de verificar disponibilidad.
10. ✅ **Auditoría**: `createAuditEvent()` disponible. NUNCA loguear datos extraídos ni base64.

---

**Versión**: 1.0 — Fase A completada  
**Próximo paso**: Fase B — Schemas Zod + mapper IA → wizard real
