# PLAN DE IMPLEMENTACIÓN — Módulo IA de Autorizaciones

## OSSUM COR — ERP de Instrumentación Quirúrgica

**Tipo**: Plan de implementación adaptado al repositorio real  
**Origen**: Sandbox validado (Junio 2026) + análisis del repo real (Junio 2026)  
**Destino**: Repositorio principal OSSUM COR — `E:\OSSUM_COR_PROJECT`  
**Stack real**: Next.js 16 · TypeScript · React 19 · Prisma 7 · PostgreSQL/Supabase · Supabase Auth · Zustand · react-hook-form 7.60 · zod 4.0 · @tanstack/react-query 5.82 · Tailwind 4  

**⚠️ ESTADO: PLANIFICACIÓN — NO IMPLEMENTAR HASTA APROBACIÓN DE FRANCO**

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Decisión de Alcance MVP](#2-decisión-de-alcance-mvp)
3. [Relación con el Repo Real](#3-relación-con-el-repo-real)
4. [Arquitectura Propuesta](#4-arquitectura-propuesta)
5. [Ruta Backend Recomendada](#5-ruta-backend-recomendada)
6. [Mapeo IA → Wizard Real](#6-mapeo-ia--wizard-real)
7. [Plan por Fases](#7-plan-por-fases)
8. [Riesgos](#8-riesgos)
9. [Decisiones Abiertas para Franco](#9-decisiones-abiertas-para-franco)
10. [Checklist Ejecutable para Codex/OpenCode](#10-checklist-ejecutable-para-codexopencode)
11. [Validaciones Recomendadas](#11-validaciones-recomendadas)

---

## 1. Resumen Ejecutivo

El módulo IA de Autorizaciones permitirá que un usuario, dentro del wizard de **Nueva Cirugía**, cargue un PDF o imagen escaneada de una autorización de ART/obra social argentina. Un Vision-Language Model (VLM) extraerá automáticamente los datos clave (paciente, DNI, médico, institución, obra social, nº de autorización, siniestro, póliza, fechas, material autorizado) y los mostrará en un panel de resultados. El usuario revisará los datos, hará clic en "Aplicar al formulario", y los campos del wizard se precargarán con los valores extraídos. El usuario podrá corregir cualquier campo antes de confirmar la creación de la cirugía por el flujo normal ya existente.

**Principio fundamental**: La IA solo sugiere. El usuario valida y decide. No se crea ninguna cirugía automáticamente.

### Problema que resuelve

En la operativa diaria de Districorr S.R.L., las autorizaciones de cirugía llegan como PDFs o imágenes escaneadas con formatos inconsistentes entre 300+ obras sociales y ART argentinas. El personal administrativo transcribe manualmente entre 12 y 20 campos por cada cirugía, un proceso lento (3-5 minutos por documento), propenso a errores de tipeo, y que no escala con el volumen de cirugías.

### Qué se construye

Un pipeline de extracción IA especializado en autorizaciones de cirugía ortopédica, integrado como **componente opcional dentro del wizard de Nueva Cirugía existente**, no como página separada. El módulo consta de:

- **Schemas Zod** como contrato de datos entre IA y aplicación.
- **Servicio server-side** con Strategy Pattern para providers de IA (mock para desarrollo, z-ai para producción, OpenAI/Anthropic como alternativas futuras).
- **Endpoint API** protegido por autenticación y multiempresa.
- **Componentes UI** desacoplados: zona de upload, panel de resultados, botón "Aplicar".
- **Mapeo** desde los datos extraídos a la estructura real del formulario `NewSurgeryForm`.

---

## 2. Decisión de Alcance MVP

### ✅ DENTRO del MVP

| Componente | Descripción |
|---|---|
| Schemas Zod (`autorizacion-ai.ts`) | `MaterialAutorizadoItemSchema`, `AutorizacionExtractedSchema`, `AutorizacionAIResponseSchema` + tipos derivados |
| Provider mock (`mock-provider.ts`) | Datos de prueba hardcodeados para desarrollo sin consumo de IA |
| Provider z-ai (`z-ai-provider.ts`) | Llamada real al VLM vía `z-ai-web-dev-sdk` con prompt especializado |
| Config centralizada (`config.ts`) | `AI_PROVIDER`, `AI_TIMEOUT_MS`, `AI_MAX_FILE_SIZE_MB`, `AI_CONFIDENCE_THRESHOLD` desde variables de entorno |
| Extractor (`autorizacion-extractor.ts`) | Factory de providers, orquestación de extracción |
| Endpoint `POST /api/companies/[companyId]/surgeries/ai-extract` | Recibe archivo, valida tipo/tamaño, invoca extractor, retorna JSON validado |
| Hook `useAiExtraction.ts` | Encapsula fetch al endpoint, estados idle/loading/success/error |
| Componente `AiUploadZone.tsx` | Zona de drag-and-drop + file picker, feedback visual de procesamiento |
| Componente `AiResultsPanel.tsx` | Muestra confianza, warnings, preview de datos, botón "Aplicar al formulario" |
| Función `mapAiToWizardForm()` | Mapea `AutorizacionExtracted` → `Partial<NewSurgeryForm>` con normalizadores |
| Integración en `NewSurgeryDialog.tsx` | Sección colapsable "Cargar desde autorización" en el Paso 0 (Datos del caso) |
| Auditoría | `createAuditEvent()` para registrar uso de IA (solo metadata, nunca datos sensibles) |

### ❌ FUERA del MVP

| Componente excluido | Razón |
|---|---|
| OCR Inbox universal | Fase futura del roadmap, no parte de este módulo |
| Extracción de facturas de proveedor | Roadmap posterior, requiere schemas y prompts diferentes |
| Extracción de remitos | Roadmap posterior, requiere integración con stock |
| Modelo `Autorizacion` en Prisma | No necesario en MVP: los datos extraídos van al formulario, no se persiste el documento |
| Migraciones de Prisma | Bloqueado por secuencia GPT-027F.0A/0B |
| Página `/cirugias/nueva` separada | El wizard YA existe en `NewSurgeryDialog.tsx` — no duplicar |
| Endpoint de guardado paralelo | Ya existe `POST /api/companies/[companyId]/surgeries` + `surgery.service.ts` |
| Creación automática de cirugía | Violaría el principio "IA solo sugiere, usuario decide" |
| Persistencia del documento subido | El archivo se procesa en memoria y se descarta |
| Regex fallback con OCR | No implementar hasta tener capa OCR real (Tesseract/sharp) |
| Procesamiento asincrónico con cola | Complejidad innecesaria para MVP (~2-5s por documento) |

---

## 3. Relación con el Repo Real

### 3.1 `NewSurgeryDialog.tsx`

- **Ubicación real**: `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` (1053 líneas)
- **Estructura**: Dialog modal con 3 pasos (Datos del caso → Presupuesto → Confirmación)
- **Paso 0 (Datos del caso)**: paciente, médico, institución, cliente/pagador, clasificación, fechas, provincia/localidad, coordinador, vendedor, instrumentador, referencias administrativas, observaciones
- **Campos como `ContactLookupField`**: paciente, médico, institución, cliente usan búsqueda de contactos con IDs (`patientContactId`, `surgeonContactId`, `institutionContactId`, `clientContactId`)
- **Punto de integración**: Agregar una sección colapsable al inicio del Paso 0 (antes de "Datos principales"), con un `AiUploadZone` + `AiResultsPanel`. Al aplicar, los datos se mapean al `newForm` state vía `setNewForm`.
- **⚠️ No modificar la lógica existente** del wizard. Solo agregar componentes hijos que emiten datos hacia arriba.

### 3.2 `useCirugiaActions.ts`

- **Ubicación real**: `src/hooks/useCirugiaActions.ts` (340 líneas)
- **Maneja**: `newForm` state (`useState<NewSurgeryForm>`), `wizardStep`, `createPRNow`, `handleNewSurgery()`, apertura/cierre del dialog
- **`handleNewSurgery()`**: Llama a `store.createSurgery()` con datos del formulario. Extrae DNI de `referenciasAdministrativas`. Crea la cirugía vía Zustand store (transición a Prisma en progreso).
- **⚠️ No modificar este hook**. La integración IA debe ser transparente: solo precarga `newForm` antes de que el usuario llegue al botón "Crear cirugía".

### 3.3 `NewSurgeryForm` (tipo real)

- **Ubicación real**: `src/lib/cirugias.types.ts` (líneas 107-137)
- **Campos reales**:
  ```ts
  interface NewSurgeryForm {
    patient: string            // nombre del paciente
    surgeon: string            // nombre del médico
    institution: string        // nombre de la institución
    client: string             // nombre del cliente/pagador
    classification: string     // clasificación quirúrgica
    date: string               // fecha CX (YYYY-MM-DD)
    time: string               // hora
    probableDate: string       // fecha probable
    fechaEnvioMaterial: string // fecha envío material
    provincia: string
    localidad: string
    instrumentador: string
    vendedor: string
    coordinadorCx: string
    urgente: boolean
    leyenda: string
    leyendaDestacada: boolean
    notes: string
    referenciasAdministrativas: ReferenciaAdministrativa[]
    // IDs de contacto:
    patientContactId?: string
    surgeonContactId?: string
    institutionContactId?: string
    clientContactId?: string
    vendedorContactId?: string
    instrumentadorContactId?: string
    coordinadorContactId?: string
  }
  ```
- **Campos que NO existen en el form**: `dni`, `obraSocial`, `numeroAutorizacion`, `numeroSiniestro`, `numeroPoliza`, `fechaAutorizacion`, `materialAutorizado`
- **Dónde van esos datos**: `referenciasAdministrativas[]` (array de `{id, tipo, valor, observacion}`)

### 3.4 `referenciasAdministrativas[]`

- **Tipo**: `ReferenciaAdministrativa` (definido en `@/types`)
- **Uso actual**: Almacena pares tipo/valor como "DNI", "NR", "FV", etc.
- **Uso propuesto para IA**: Agregar tipos "AUTORIZACION", "SINIESTRO", "POLIZA", "OBRA_SOCIAL" para los datos extraídos que no tienen campo directo en el form.
- **El DNI extraído**: se inserta como `{ tipo: "DNI", valor: "28456789" }`. El `handleNewSurgery()` ya busca DNI en referenciasAdministrativas para pasarlo al modelo Surgery.

### 3.5 API protegida por `companyId`

- **Patrón real**: `src/app/api/companies/[companyId]/surgeries/route.ts`
- **Auth**: `getApiAuthContext(request, companyId)` → resuelve actor desde Supabase Bearer token, valida empresa y rol
- **Guards**: `requireCompanyReadAccess(ctx)` / `requireCompanyMutationAccess(ctx, roles)`
- **Response helpers**: `ok(data)`, `errorResponse(error)` de `src/lib/api/responses.ts`
- **Prisma**: Singleton en `src/lib/prisma.ts` (PostgreSQL vía Supabase pooler)
- **⚠️ El endpoint IA debe seguir exactamente este patrón**

### 3.6 Auditoría

- **Helper real**: `createAuditEvent()` en `src/lib/audit.ts`
- **Requiere**: `prisma`, `companyId`, `userId`, `entityType`, `entityId`, `action`, `module`, `detail?`, `oldValue?`, `newValue?`, `metadata?`
- **Uso propuesto**: Auditar cada extracción IA con `entityType: "ai_extraction"`, `module: "ia-autorizaciones"`, metadata con provider, confidence, tipo de archivo, duración. NUNCA incluir base64 ni datos extraídos en el detail/metadata.

---

## 4. Arquitectura Propuesta

### 4.1 Estructura de archivos a crear

```
src/
├── lib/
│   ├── validators/
│   │   └── autorizacion-ai.ts          # Schemas Zod + tipos + normalizeDni + mapAiToWizardForm
│   └── services/
│       └── ai/
│           ├── types.ts                 # AIProvider interface + AIProviderConfig
│           ├── config.ts                # Config desde env vars (AI_PROVIDER, timeout, etc.)
│           ├── autorizacion-extractor.ts # Factory de providers + extractAutorizacion()
│           ├── providers/
│           │   ├── mock-provider.ts     # Datos de prueba para desarrollo
│           │   └── z-ai-provider.ts     # VLM real con z-ai-web-dev-sdk
│           └── README.md               # Documentación del módulo
├── app/
│   └── api/
│       └── companies/
│           └── [companyId]/
│               └── surgeries/
│                   └── ai-extract/
│                       └── route.ts     # POST endpoint protegido
├── hooks/
│   └── useAiExtraction.ts              # Hook para consumir el endpoint desde el frontend
└── components/
    └── cirugias/
        ├── AiUploadZone.tsx             # Zona de drag-and-drop + file picker
        └── AiResultsPanel.tsx           # Panel de resultados + botón "Aplicar"
```

### 4.2 Archivos existentes a tocar (mínimamente)

| Archivo | Cambio | Riesgo |
|---|---|---|
| `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` | Agregar sección colapsable "Cargar desde autorización" en Paso 0. Agregar prop `onAiDataApplied?: (data: Partial<NewSurgeryForm>) => void` o manejar internamente. | **ALTO** — componente de 1053 líneas. Cambio mínimo: insertar 2 componentes hijos al inicio del Paso 0. |
| `src/app/cirugias/page.tsx` | Pasar props adicionales al `NewSurgeryDialog` si el estado de IA se maneja en el padre. Alternativa: manejar estado IA dentro del dialog. | **MEDIO** — la página ya pasa muchas props. Evaluar si es necesario. |
| `.env.local` | Agregar `AI_PROVIDER=mock`, `AI_TIMEOUT_MS=30000`, `AI_MAX_FILE_SIZE_MB=20`, `AI_CONFIDENCE_THRESHOLD=0.3` | **BAJO** — solo agregar, nunca eliminar variables existentes |
| `package.json` | Posiblemente instalar `z-ai-web-dev-sdk` (verificar si ya está) | **BAJO** — `z-ai-web-dev-sdk` NO está en package.json actual |

### 4.3 Diagrama de flujo

```
Usuario en Paso 0 del wizard
  │
  ▼
[AiUploadZone] — click o drag-and-drop de archivo (PDF/JPG/PNG)
  │
  ▼
useAiExtraction.extract(file)
  │
  ▼
POST /api/companies/[companyId]/surgeries/ai-extract
  │ Bearer token (Supabase Auth)
  ▼
getApiAuthContext() → requireCompanyMutationAccess()
  │
  ▼
extractAutorizacion(buffer, mimeType, mode)
  │
  ├── mode=mock → MockProvider.extract() → datos hardcoded
  │
  └── mode=vlm  → ZAiProvider.extract()
                    │
                    ▼
                  z-ai-web-dev-sdk.createVision()
                    │ prompt especializado + imagen base64
                    ▼
                  JSON parseado + validado con Zod
  │
  ▼
Response 200: AutorizacionAIResponse (JSON)
  │
  ▼
[AiResultsPanel] — muestra confidence, warnings, datos extraídos
  │
  ▼
Usuario click en "Aplicar al formulario"
  │
  ▼
mapAiToWizardForm(extracted) → Partial<NewSurgeryForm>
  │  - paciente → patient (texto sugerido)
  │  - dni → referenciasAdministrativas [{tipo:"DNI", valor:"28456789"}]
  │  - medico → surgeon (texto sugerido)
  │  - institucion → institution (texto sugerido)
  │  - obra_social → referenciasAdministrativas [{tipo:"OBRA_SOCIAL", valor:"..."}]
  │  - numero_autorizacion → referenciasAdministrativas [{tipo:"AUTORIZACION", valor:"..."}]
  │  - fechas → date, probableDate (normalizadas YYYY-MM-DD)
  │  - material_autorizado → notes (como texto formateado)
  │  - observaciones → notes (concatenado)
  │
  ▼
setNewForm({...newForm, ...aiData})
  │
  ▼
Usuario revisa, corrige, completa el wizard normalmente
  │
  ▼
Usuario confirma → handleNewSurgery() → store.createSurgery()
  │
  ▼
Cirugía creada (flujo normal, sin cambios)
```

---

## 5. Ruta Backend Recomendada

### Recomendación: `POST /api/companies/[companyId]/surgeries/ai-extract`

**Justificación**:

1. **Convención del repo real**: Todos los endpoints de cirugía están bajo `/api/companies/[companyId]/surgeries/`. Incluye `GET` (listar), `POST` (crear), `PATCH /[surgeryId]` (actualizar), `PATCH /[surgeryId]/status` (cambiar estado). La extracción IA es una operación auxiliar sobre cirugías.

2. **Multiempresa**: El `companyId` en la URL es obligatorio. `getApiAuthContext(request, companyId)` valida que el usuario pertenece a esa empresa. Sin esto, cualquier usuario autenticado podría extraer datos para cualquier empresa.

3. **Auth integrada**: Reutiliza `getApiAuthContext` → Supabase Bearer token → User + CompanyAccess. No reinventar autenticación.

4. **Guards reutilizables**: `requireCompanyMutationAccess(ctx, ['admin', 'manager', 'coordinator', 'owner', 'super_admin'])` para restringir quién puede usar la IA (mismos roles que pueden crear cirugías).

5. **Patrón consistente**: Misma estructura de carpeta, mismos helpers (`ok()`, `errorResponse()`), mismo `prisma` singleton.

### ❌ NO usar: `/api/cirugias/ai-extract`

Esta ruta fue propuesta en el plan de reconstrucción del sandbox pero **no coincide con la estructura real del repo**:
- No existe el prefijo `/api/cirugias/` en el repo real.
- No tendría `companyId` en la URL → requeriría resolver la empresa de otra forma (header, cookie, etc.).
- Rompe la convención de rutas anidadas por empresa.

### Implementación de referencia (patrón a seguir)

```ts
// src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts

import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import { extractAutorizacion } from "../../../../../../lib/services/ai/autorizacion-extractor";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const SURGERY_MUTATION_ROLES = ["admin", "manager", "coordinator", "owner", "super_admin"];

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, SURGERY_MUTATION_ROLES);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || undefined;

    if (!file) {
      return errorResponse({ message: "No se proporcionó archivo", status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse({ message: "Tipo de archivo no soportado", status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return errorResponse({ message: "El archivo supera el límite de 20MB", status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractAutorizacion(buffer, file.type, mode);

    // Validar respuesta con Zod (se hace dentro de extractAutorizacion)

    // ⚠️ Auditoría: solo metadata, NUNCA el contenido extraído
    // createAuditEvent({ ... }) — ver sección de auditoría

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
```

---

## 6. Mapeo IA → Wizard Real

### 6.1 Tabla de mapeo conceptual

| Campo extraído por IA (`AutorizacionExtracted`) | Destino en wizard (`NewSurgeryForm`) | Transformación | Verificar en repo |
|---|---|---|---|
| `paciente` | `patient` (string) | Se asigna como texto sugerido. El usuario puede luego buscar el contacto real con `ContactLookupField`. | ✅ `patient: string` existe |
| `dni` | `referenciasAdministrativas[]` | `normalizeDni()` → quita puntos y guiones → `{ tipo: "DNI", valor: "28456789" }` | ✅ `referenciasAdministrativas` existe. `handleNewSurgery()` ya extrae DNI de ahí |
| `medico` | `surgeon` (string) | Se asigna como texto sugerido. El usuario mapea a contacto real. | ✅ `surgeon: string` existe |
| `institucion` | `institution` (string) | Se asigna como texto sugerido. | ✅ `institution: string` existe |
| `obra_social` | `referenciasAdministrativas[]` | `{ tipo: "OBRA_SOCIAL", valor: "..." }` y/o `client` como texto sugerido si coincide con pagador | ⚠️ No existe campo `obraSocial` directo. Verificar si `client` debe ser la obra social o el pagador |
| `numero_autorizacion` | `referenciasAdministrativas[]` | `{ tipo: "AUTORIZACION", valor: "..." }` | ✅ Ya existe filtro `numeroAutorizacionFilter` en la página |
| `numero_siniestro` | `referenciasAdministrativas[]` | `{ tipo: "SINIESTRO", valor: "..." }` | ⚠️ Verificar si ya se usa este tipo |
| `numero_poliza` | `referenciasAdministrativas[]` | `{ tipo: "POLIZA", valor: "..." }` | ⚠️ Verificar si ya se usa este tipo |
| `fecha_autorizacion` | `referenciasAdministrativas[]` o `probableDate` | `normalizeDate()` → DD/MM/YYYY a YYYY-MM-DD. Si no hay campo directo, va a referencias con `tipo: "FECHA_AUTORIZACION"` | ⚠️ No hay campo `fechaAutorizacion` directo |
| `fecha_cirugia` | `date` o `probableDate` | `normalizeDate()` → YYYY-MM-DD. `date` = fecha programada, `probableDate` = fecha probable | ✅ Ambos campos existen como `<input type="date">` |
| `material_autorizado` | `notes` o `leyenda` | Array de items formateado como texto: "Material autorizado: IMPL-TQ-001 (x2), ..." | ⚠️ No hay tabla de material en el wizard actual. El material va en el presupuesto (Paso 1) |
| `observaciones` | `notes` | Concatenar con observaciones existentes si las hay | ✅ `notes: string` existe |

### 6.2 Función de mapeo propuesta

```ts
// src/lib/validators/autorizacion-ai.ts

export function mapAiToWizardForm(
  extracted: AutorizacionExtracted
): Partial<NewSurgeryForm> {
  const refs: ReferenciaAdministrativa[] = [];

  // DNI → referenciasAdministrativas
  if (extracted.dni) {
    refs.push({
      id: crypto.randomUUID(),
      tipo: "DNI",
      valor: normalizeDni(extracted.dni),
    });
  }

  // Obra social → referenciasAdministrativas
  if (extracted.obra_social) {
    refs.push({
      id: crypto.randomUUID(),
      tipo: "OBRA_SOCIAL",
      valor: extracted.obra_social,
    });
  }

  // Nº autorización → referenciasAdministrativas
  if (extracted.numero_autorizacion) {
    refs.push({
      id: crypto.randomUUID(),
      tipo: "AUTORIZACION",
      valor: extracted.numero_autorizacion,
    });
  }

  // Nº siniestro → referenciasAdministrativas
  if (extracted.numero_siniestro) {
    refs.push({
      id: crypto.randomUUID(),
      tipo: "SINIESTRO",
      valor: extracted.numero_siniestro,
    });
  }

  // Nº póliza → referenciasAdministrativas
  if (extracted.numero_poliza) {
    refs.push({
      id: crypto.randomUUID(),
      tipo: "POLIZA",
      valor: extracted.numero_poliza,
    });
  }

  // Fecha autorización → referenciasAdministrativas (no hay campo directo)
  if (extracted.fecha_autorizacion) {
    refs.push({
      id: crypto.randomUUID(),
      tipo: "FECHA_AUTORIZACION",
      valor: normalizeDate(extracted.fecha_autorizacion),
    });
  }

  // Material autorizado → notas formateadas
  let materialText = "";
  if (extracted.material_autorizado.length > 0) {
    materialText = "MATERIAL AUTORIZADO (IA):\n" +
      extracted.material_autorizado
        .map(m => `• ${m.codigo || "—"} — ${m.descripcion} (x${m.cantidad || "?"}) ${m.precio_referencia ? "$" + m.precio_referencia : ""}`)
        .join("\n");
  }

  // Observaciones → concatenar
  let notesText = extracted.observaciones || "";
  if (materialText) {
    notesText = notesText ? `${notesText}\n\n${materialText}` : materialText;
  }

  return {
    patient: extracted.paciente || undefined,
    surgeon: extracted.medico || undefined,
    institution: extracted.institucion || undefined,
    // client: ¿mapear obra_social como cliente/pagador? — requiere decisión de Franco
    date: extracted.fecha_cirugia ? normalizeDate(extracted.fecha_cirugia) : undefined,
    probableDate: extracted.fecha_autorizacion ? normalizeDate(extracted.fecha_autorizacion) : undefined,
    notes: notesText || undefined,
    referenciasAdministrativas: refs,
  };
}
```

### 6.3 Campos que requieren verificación en el repo

| Campo | Pregunta | Prioridad |
|---|---|---|
| `client` vs `obra_social` | ¿La obra social extraída debe mapearse al campo `client` (cliente/pagador) o solo a `referenciasAdministrativas`? | **ALTA** — impacto directo en flujo de facturación |
| `fecha_autorizacion` | ¿Existe algún campo en el wizard o en el modelo Surgery para fecha de autorización? En el modelo `Surgery` de Prisma no hay campo `authorizationDate`. | **ALTA** — decidir si va a `referenciasAdministrativas` o se agrega al modelo |
| `material_autorizado` | El Paso 1 (Presupuesto) ya tiene tabla de ítems. ¿Se deberían precargar ítems del presupuesto desde el material extraído? Esto requeriría modificar `prForm`. | **MEDIA** — posiblemente fuera del MVP |
| `ContactLookupField` | ¿Los textos sugeridos (paciente, médico) deberían disparar una búsqueda automática de contacto? ¿O solo quedar como placeholder hasta que el usuario busque manualmente? | **MEDIA** — afecta la UX |

---

## 7. Plan por Fases

### Fase A — Exploración real del wizard

| Item | Detalle |
|---|---|
| **Objetivo** | Confirmar todos los puntos de integración exactos, props disponibles, y campos del formulario real. Verificar dependencias instaladas. |
| **Archivos a explorar** | `NewSurgeryDialog.tsx` (completo), `useCirugiaActions.ts` (completo), `cirugias.types.ts`, `package.json` (deps), `api/client.ts`, `api/auth-context.ts`, `api/guards.ts`, `api/responses.ts`, `api/errors.ts`, `audit.ts`, `prisma.ts` |
| **Fuera de alcance** | No crear archivos. No modificar código. No instalar dependencias. |
| **Riesgos** | Ninguno — es solo lectura |
| **Validaciones** | Documento de hallazgos con: lista de dependencias confirmadas, props exactas del wizard, campos del form mapeados uno a uno, decisión sobre cada campo |
| **Criterio de éxito** | Handoff con mapeo definitivo de campos IA → wizard, confirmación de todas las dependencias |
| **Handoff esperado** | `## Handoff Fase A\n### Done: Exploración del wizard completada\n### Discoveries: [hallazgos clave]\n### Next: Fase B — Schemas Zod` |

### Fase B — Schemas Zod + mapper

| Item | Detalle |
|---|---|
| **Objetivo** | Crear schemas Zod para el contrato de extracción IA y función de mapeo al `NewSurgeryForm` real, con normalizadores. |
| **Archivos a crear** | `src/lib/validators/autorizacion-ai.ts` |
| **Archivos a modificar** | Ninguno |
| **Fuera de alcance** | No crear servicios, no crear endpoints, no tocar UI |
| **Riesgos** | BAJO — `zod` v4.0.2 ya está instalado. Solo riesgo de que el tipo `ReferenciaAdministrativa` no se importe correctamente. |
| **Validaciones** | Tests unitarios con Vitest: (1) parse de JSON de ejemplo válido, (2) rechazo de JSON con provider inválido, (3) `mapAiToWizardForm()` con datos completos verifica cada campo, (4) `normalizeDni("28.456.789") === "28456789"`, (5) `normalizeDate("15/03/2024") === "2024-03-15"` |
| **Criterio de éxito** | `npx vitest run` pasa todos los tests. `npx tsc --noEmit` sin errores en el nuevo archivo. |
| **Handoff esperado** | `## Handoff Fase B\n### Done: Schemas Zod creados y testeados\n### Files: src/lib/validators/autorizacion-ai.ts\n### Validations: 5 tests unitarios pasando\n### Next: Fase C — Mock provider + endpoint` |

### Fase C — Mock provider + endpoint protegido

| Item | Detalle |
|---|---|
| **Objetivo** | Provider mock funcional, factory de providers, y endpoint API protegido que acepta archivos y devuelve datos mock. |
| **Archivos a crear** | `src/lib/services/ai/types.ts`, `src/lib/services/ai/config.ts`, `src/lib/services/ai/providers/mock-provider.ts`, `src/lib/services/ai/autorizacion-extractor.ts`, `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts` |
| **Archivos a modificar** | `.env.local` (agregar `AI_PROVIDER=mock`, `AI_TIMEOUT_MS=30000`, `AI_MAX_FILE_SIZE_MB=20`, `AI_CONFIDENCE_THRESHOLD=0.3`) |
| **Fuera de alcance** | No provider real (z-ai). No UI. No hook. |
| **Riesgos** | MEDIO — La ruta debe seguir exactamente el patrón de `companies/[companyId]/surgeries`. La autenticación debe usar `getApiAuthContext`. Posible error 401/403 si el token no se pasa correctamente en pruebas. |
| **Validaciones** | `curl` con token Bearer: (1) POST con archivo JPG + mode=mock → 200 con JSON válido, (2) POST sin archivo → 400, (3) POST sin token → 401, (4) POST con .txt → 400, (5) POST con archivo >20MB → 400 |
| **Criterio de éxito** | Endpoint responde 200 con datos mock. Build sin errores. |
| **Handoff esperado** | `## Handoff Fase C\n### Done: Mock provider + endpoint funcionando\n### Files: 5 archivos creados, .env.local modificado\n### Validations: curl tests pasando\n### Next: Fase D — Hook + UI aislada` |

### Fase D — Hook + UI aislada

| Item | Detalle |
|---|---|
| **Objetivo** | Hook `useAiExtraction` y componentes UI (`AiUploadZone`, `AiResultsPanel`) funcionando de forma aislada, sin integrar aún en el wizard. |
| **Archivos a crear** | `src/hooks/useAiExtraction.ts`, `src/components/cirugias/AiUploadZone.tsx`, `src/components/cirugias/AiResultsPanel.tsx` |
| **Archivos a modificar** | Ninguno (los componentes se prueban en una página de prueba o story) |
| **Fuera de alcance** | No modificar `NewSurgeryDialog`. No modificar `page.tsx`. No provider real. |
| **Riesgos** | MEDIO — `useAiExtraction` debe usar `apiFetch` del cliente real (con Bearer token). Si el token no está disponible en el cliente, fallará. El `companyId` debe obtenerse del contexto (verificar si hay hook `useCompany` o se pasa como prop). |
| **Validaciones** | Prueba visual en una ruta temporal (ej: agregar los componentes en `page.tsx` del dashboard solo para test). O tests con React Testing Library. Verificar: (1) upload de archivo muestra progreso, (2) respuesta mock se muestra en panel, (3) botón "Aplicar" emite datos, (4) estados de error se manejan. |
| **Criterio de éxito** | Componentes renderizan correctamente. Hook maneja ciclo idle→loading→success→reset. |
| **Handoff esperado** | `## Handoff Fase D\n### Done: Hook y componentes UI aislados\n### Files: useAiExtraction.ts, AiUploadZone.tsx, AiResultsPanel.tsx\n### Validations: Estados idle/loading/success/error testeados\n### Next: Fase E — Integración en NewSurgeryDialog` |

### Fase E — Integración mínima en NewSurgeryDialog

| Item | Detalle |
|---|---|
| **Objetivo** | Insertar `AiUploadZone` + `AiResultsPanel` como sección colapsable en el Paso 0 del `NewSurgeryDialog`. El botón "Aplicar" precarga el `newForm` vía `setNewForm`. |
| **Archivos a modificar** | `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` (agregar imports + sección colapsable al inicio del Paso 0), posiblemente `src/app/cirugias/page.tsx` (si se necesita pasar `companyId`) |
| **Fuera de alcance** | No modificar lógica de validación del wizard. No modificar `handleNewSurgery`. No modificar el store. No provider real. |
| **Riesgos** | **ALTO** — `NewSurgeryDialog.tsx` es un componente complejo de 1053 líneas con lógica de validación, estado, y múltiples secciones. Cualquier cambio debe ser mínimamente invasivo. Posibles problemas: (1) conflicto con `ContactLookupField` si se pisan valores, (2) `setNewForm` llamado desde la IA puede disparar efectos no deseados, (3) `referenciasAdministrativas` merge con valores existentes. |
| **Mitigaciones** | (1) Agregar una sección colapsable al INICIO del Paso 0, antes de "Datos principales". (2) El botón "Aplicar" solo modifica campos vacíos o pregunta si sobrescribir. (3) Merge de `referenciasAdministrativas`: conservar las existentes, agregar las nuevas sin duplicar por tipo. (4) No tocar `validateStep0` ni la lógica de navegación. |
| **Validaciones** | Flujo manual completo: (1) Abrir wizard → ver sección "Cargar autorización", (2) Subir archivo → ver resultados, (3) Aplicar → ver campos precargados (paciente, médico, etc.), (4) Ver referencias administrativas con DNI, AUTORIZACION, etc., (5) Editar cualquier campo manualmente, (6) Completar el wizard y crear cirugía, (7) Verificar que la cirugía se crea correctamente con los datos. |
| **Criterio de éxito** | El flujo existente del wizard no se rompe. Los datos de IA se aplican correctamente. La cirugía se crea sin errores. `npm run build` sin errores. |
| **Handoff esperado** | `## Handoff Fase E\n### Done: IA integrada en wizard\n### Changed: NewSurgeryDialog.tsx (sección colapsable agregada)\n### Validations: Flujo completo manual testeado, build limpio\n### Next: Fase F — Provider real` |

### Fase F — Provider real (z-ai)

| Item | Detalle |
|---|---|
| **Objetivo** | Activar el provider VLM real con `z-ai-web-dev-sdk` para extracción desde documentos reales. |
| **Archivos a crear** | `src/lib/services/ai/providers/z-ai-provider.ts` |
| **Archivos a modificar** | `src/lib/services/ai/autorizacion-extractor.ts` (agregar `zAiProvider` al factory), `.env.local` (cambiar `AI_PROVIDER=z-ai` o mantener `mock` como default) |
| **Fuera de alcance** | No provider OpenAI/Anthropic. No OCR fallback. |
| **Riesgos** | **ALTO** — `z-ai-web-dev-sdk` NO está instalado en el repo real. Debe instalarse (`npm install z-ai-web-dev-sdk`). La autenticación automática solo funciona en sandbox Z.ai; en producción puede requerir API key. Timeout debe implementarse con `AbortController`. Costos de prueba con documentos reales. |
| **Validaciones** | Prueba con imagen real de autorización: verificar que extrae paciente, DNI, médico, institución, obra social, nº autorización con confianza > 0.5. Verificar timeout (30s). Verificar que modo mock sigue funcionando con `AI_PROVIDER=mock`. |
| **Criterio de éxito** | Extracción real funciona con al menos 3 documentos de prueba diferentes. Confianza reportada > 0.5. Build sin errores. |
| **Handoff esperado** | `## Handoff Fase F\n### Done: Provider z-ai funcionando\n### Files: z-ai-provider.ts creado, extractor actualizado\n### Validations: 3 documentos reales procesados correctamente\n### Next: Fase G — Auditoría y docs` |

### Fase G — Auditoría y documentación

| Item | Detalle |
|---|---|
| **Objetivo** | Agregar auditoría a las extracciones IA, documentar el módulo, escribir ADR. |
| **Archivos a crear** | `src/lib/services/ai/README.md`, `knowledge/architecture/ADR-IA-AUTORIZACIONES.md` |
| **Archivos a modificar** | `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts` (agregar `createAuditEvent`) |
| **Fuera de alcance** | No modificar el modelo `AuditEvent` en Prisma. |
| **Riesgos** | BAJO — solo documentación y logs de auditoría. Verificar que `createAuditEvent` no requiere migración. |
| **Validaciones** | (1) Verificar en BD que se crea `AuditEvent` por cada extracción. (2) `README.md` cubre propósito, archivos, variables de entorno, cómo agregar providers. (3) ADR documenta la decisión de usar VLM + Strategy Pattern. |
| **Criterio de éxito** | Auditoría funcional, documentación completa, ADR registrado. |
| **Handoff esperado** | `## Handoff Fase G\n### Done: Auditoría y documentación completas\n### Files: README.md, ADR creado, endpoint actualizado con audit\n### Validations: AuditEvent registrado en BD\n### Next: Revisión final + aprobación de Franco` |

---

## 8. Riesgos

### 8.1 Riesgos de frontend

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Integración en `NewSurgeryDialog.tsx` rompe el wizard** | Media | Alto | Sección colapsable independiente. No modificar validación ni navegación. Feature flag para desactivar si falla. |
| **Conflicto con `ContactLookupField`** | Media | Medio | La IA solo sugiere texto. No asigna `contactId`. El usuario debe mapear manualmente al contacto real. |
| **`setNewForm` dispara efectos no deseados** | Baja | Medio | Usar `useCallback` para el handler de "Aplicar". Solo actualizar campos que están vacíos (o preguntar si sobrescribir). |
| **Estado de IA no se limpia al cerrar el wizard** | Baja | Bajo | Resetear estado IA en `handleClose()`. |
| **`referenciasAdministrativas` se duplican** | Media | Bajo | Merge inteligente: si ya existe una referencia del mismo tipo, preguntar si reemplazar. |

### 8.2 Riesgos de backend

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Ruta no sigue convención del repo** | Baja | Alto | Ya definida como `/api/companies/[companyId]/surgeries/ai-extract` — validada contra rutas existentes. |
| **Timeout en llamada IA cuelga el worker** | Media | Alto | `AbortController` + `Promise.race` contra 30s. Timeout configurable por `AI_TIMEOUT_MS`. |
| **`getApiAuthContext` requiere token Bearer válido** | Baja | Medio | Ya probado en endpoints existentes. El frontend usa `apiFetch` que adjunta token automáticamente. |
| **`companyId` no disponible en el frontend** | Media | Alto | Verificar cómo se obtiene `companyId` en el cliente (probablemente `useOrtoTrackStore` o contexto). Si no está disponible, se debe exponer. |
| **No loggear datos sensibles** | Media | Crítico | El endpoint NUNCA debe loggear el base64 ni el contenido extraído. Solo metadata: tamaño, tipo MIME, provider, confidence, duración. |

### 8.3 Riesgos con archivos PDF/imagen

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **PDF multi-página o vectorial** | Media | Medio | Para MVP, solo aceptar imágenes (JPG/PNG/WebP/BMP). Si se acepta PDF, convertir página 1 con `sharp` (ya instalado v0.34.3). |
| **Archivo corrupto consume tokens** | Baja | Medio | Validar que el buffer sea decodificable antes de enviar al VLM. |
| **Archivo >20MB** | Baja | Bajo | Validación temprana en el endpoint → 400. |
| **Tipo MIME falso** | Baja | Medio | Validar por extensión + magic bytes si es necesario. |

### 8.4 Riesgos de IA

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **`z-ai-web-dev-sdk` no disponible en producción** | Media | Alto | Strategy Pattern permite cambiar a OpenAI/Anthropic con solo crear un adaptador y cambiar `AI_PROVIDER`. |
| **Confianza del VLM no calibrada** | Alta | Bajo | No automatizar decisiones basadas en confidence. Solo mostrar advertencia visual si < 0.3. |
| **VLM devuelve JSON malformado** | Media | Medio | Extraer con regex `{...}` del texto. Validar con Zod. Si falla, devolver respuesta vacía con warning. |
| **Costo acumulativo en producción** | Baja | Bajo | ~USD 0.01 por documento. 1000 docs/mes ≈ USD 10. Modo mock para desarrollo. |
| **Alucinaciones del VLM** | Media | Medio | La validación humana es obligatoria. El botón "Aplicar" es explícito. El usuario siempre revisa antes de guardar. |

### 8.5 Riesgos de seguridad

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Datos de salud en tránsito** | Media | Crítico | HTTPS obligatorio. No almacenar archivo post-procesamiento. No loggear contenido. |
| **API key hardcodeada** | Baja | Crítico | Variables de entorno exclusivamente. `.env.local` en `.gitignore`. |
| **Endpoint sin autenticación** | Baja | Crítico | `getApiAuthContext` + `requireCompanyMutationAccess` obligatorios. |
| **Inyección vía nombre de archivo** | Baja | Bajo | No usar el nombre del archivo para nada en el backend. |
| **CSRF en upload** | Baja | Medio | Next.js App Router con SameSite cookies. El token Bearer agrega capa adicional. |

### 8.6 Riesgos de tocar Cirugías

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **`/cirugias/page.tsx` modificado innecesariamente** | Media | Alto | No tocar. Si se necesita pasar `companyId`, usar contexto o store existente. |
| **`useCirugiaActions.ts` modificado** | Media | Alto | No tocar. La IA solo precarga `newForm` antes de que el hook lo use. |
| **Store de Zustand afectado** | Baja | Alto | No escribir en el store desde la IA. Solo leer para obtener `companyId` si es necesario. |
| **`NewSurgeryDialog.tsx` se vuelve inmantenible** | Media | Medio | Agregar sección colapsable independiente. Si el componente crece demasiado, refactorizar en fase separada. |

### 8.7 Riesgos de duplicar guardado

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Crear endpoint de guardado paralelo** | Baja | Crítico | Explícitamente PROHIBIDO. El guardado usa el flujo existente: `handleNewSurgery()` → `store.createSurgery()` → `surgery.service.ts`. |
| **Crear modelo `Autorizacion` en Prisma** | Baja | Alto | Explícitamente PROHIBIDO en MVP. No necesario: los datos van al formulario, no se persiste el documento. |

---

## 9. Decisiones Abiertas para Franco

Las siguientes preguntas requieren decisión humana antes de continuar con la implementación:

### 9.1 Decisiones de alcance

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| **D1** | ¿Aceptamos PDF en MVP o solo imágenes (JPG/PNG/WebP)? | A: Solo imágenes (más seguro, sin conversión). B: Imágenes + PDF 1 página (requiere sharp para convertir). | **Recomendación A** — MVP con solo imágenes. PDF se agrega en iteración siguiente. |
| **D2** | ¿El material autorizado extraído debe precargar ítems en el presupuesto (Paso 1) o solo ir como texto en observaciones? | A: Solo texto en observaciones (MVP simple). B: Precargar ítems en `prForm.items[]` (requiere modificar `usePresupuestoForm`). | **Recomendación A** — el material va a `notes` como texto formateado. Precargar presupuesto es Fase 2. |
| **D3** | ¿La obra social extraída debe mapearse al campo `client` (cliente/pagador) del wizard? | A: Sí, como texto sugerido en `client`. B: Solo a `referenciasAdministrativas`. C: Ambas. | **Pendiente decisión de Franco** — impacto directo en flujo de facturación. |
| **D4** | ¿Se debe auditar la extracción IA desde el primer MVP? | A: Sí, `createAuditEvent` en cada extracción. B: No, agregar después. | **Recomendación A** — bajo costo, alto valor de trazabilidad. |

### 9.2 Decisiones técnicas

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| **D5** | ¿Qué provider de IA usamos primero? | A: `z-ai-web-dev-sdk` (sandbox validado). B: OpenAI directo (más control, requiere API key). C: Mock hasta decidir. | **Recomendación A** — ya validado en sandbox. Fácil migración a OpenAI después. |
| **D6** | ¿El `companyId` para el endpoint se obtiene del contexto de auth (ya validado) o se pasa explícitamente en el body? | A: De la URL (`[companyId]`), validado por `getApiAuthContext`. B: Del body del request. | **Recomendación A** — consistente con todas las rutas existentes. |
| **D7** | ¿Los textos sugeridos por IA (paciente, médico) deben disparar búsqueda automática de contactos? | A: No, solo texto. El usuario busca manualmente. B: Sí, auto-buscar y sugerir matches. | **Recomendación A** para MVP — más simple, menos riesgos. |

### 9.3 Decisiones de producto

| # | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| **D8** | ¿El botón "Aplicar al formulario" debe sobrescribir campos ya completados o solo llenar los vacíos? | A: Solo llenar vacíos. B: Sobrescribir todo (con confirmación). C: El usuario elige por campo. | **Recomendación A** para MVP — más seguro, no pisa trabajo manual previo. |
| **D9** | ¿La sección de IA debe ser colapsable (abierta por defecto o cerrada)? | A: Colapsable, cerrada por defecto. B: Colapsable, abierta por defecto. C: Siempre visible. | **Recomendación A** — no impone el flujo IA, el wizard funciona igual sin ella. |

---

## 10. Checklist Ejecutable para Codex/OpenCode

Cada task debe ejecutarse en orden. No avanzar sin verificar el task anterior.

### Fase A — Exploración

```
[ ] TASK-A1 — Leer NewSurgeryDialog.tsx completo y documentar props, estado, y estructura del Paso 0
[ ] TASK-A2 — Leer useCirugiaActions.ts y documentar handleNewSurgery, setNewForm, wizardStep
[ ] TASK-A3 — Leer cirugias.types.ts y mapear cada campo de NewSurgeryForm
[ ] TASK-A4 — Leer ReferenciaAdministrativa (en @/types) y documentar estructura exacta
[ ] TASK-A5 — Verificar package.json: zod, react-hook-form, @hookform/resolvers, sharp, @tanstack/react-query, z-ai-web-dev-sdk
[ ] TASK-A6 — Verificar api/client.ts (apiFetch), api/auth-context.ts (getApiAuthContext), api/guards.ts
[ ] TASK-A7 — Verificar audit.ts (createAuditEvent) y api/responses.ts (ok, errorResponse)
[ ] TASK-A8 — Verificar si existe useCompany o cómo se obtiene companyId en el frontend
[ ] TASK-A9 — Handoff Fase A: documento de hallazgos con mapeo definitivo
```

### Fase B — Schemas Zod + mapper

```
[ ] TASK-B1 — Crear src/lib/validators/autorizacion-ai.ts con MaterialAutorizadoItemSchema
[ ] TASK-B2 — Agregar AutorizacionExtractedSchema (12 campos + material array)
[ ] TASK-B3 — Agregar AutorizacionAIResponseSchema (provider, confidence, warnings, extracted, raw_text_preview)
[ ] TASK-B4 — Agregar tipos derivados con z.infer
[ ] TASK-B5 — Implementar normalizeDni() — quita puntos, guiones, caracteres no numéricos
[ ] TASK-B6 — Implementar normalizeDate() — DD/MM/YYYY → YYYY-MM-DD (usar date-fns si está disponible)
[ ] TASK-B7 — Implementar mapAiToWizardForm() con mapeo declarativo según sección 6
[ ] TASK-B8 — Escribir tests unitarios: (a) parse JSON válido, (b) rechazar provider inválido, (c) normalizar DNI, (d) normalizar fecha, (e) mapeo completo a NewSurgeryForm
[ ] TASK-B9 — Ejecutar npx vitest run y verificar que todos los tests pasan
[ ] TASK-B10 — Ejecutar npx tsc --noEmit y verificar sin errores
[ ] TASK-B11 — Handoff Fase B
```

### Fase C — Mock provider + endpoint protegido

```
[ ] TASK-C1 — Crear src/lib/services/ai/types.ts con interface AIProvider + AIProviderConfig
[ ] TASK-C2 — Crear src/lib/services/ai/config.ts con lectura de env vars (AI_PROVIDER, AI_TIMEOUT_MS, AI_MAX_FILE_SIZE_MB, AI_CONFIDENCE_THRESHOLD)
[ ] TASK-C3 — Crear src/lib/services/ai/providers/mock-provider.ts con datos de prueba hardcodeados
[ ] TASK-C4 — Crear src/lib/services/ai/autorizacion-extractor.ts con factory de providers + extractAutorizacion()
[ ] TASK-C5 — Crear src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts
[ ] TASK-C6 — Implementar validación de archivo (tipo MIME, tamaño 20MB, archivo presente)
[ ] TASK-C7 — Implementar timeout con AbortController (30s default)
[ ] TASK-C8 — Agregar variables al .env.local: AI_PROVIDER=mock, AI_TIMEOUT_MS=30000, AI_MAX_FILE_SIZE_MB=20, AI_CONFIDENCE_THRESHOLD=0.3
[ ] TASK-C9 — Probar con curl: (a) 200 con archivo válido, (b) 400 sin archivo, (c) 400 tipo no soportado, (d) 401 sin token
[ ] TASK-C10 — Ejecutar npm run build y verificar sin errores
[ ] TASK-C11 — Handoff Fase C
```

### Fase D — Hook + UI aislada

```
[ ] TASK-D1 — Crear src/hooks/useAiExtraction.ts con estados idle/uploading/processing/success/error
[ ] TASK-D2 — Implementar extract(file: File, mode?: string) → Promise<void>
[ ] TASK-D3 — Usar apiFetch<T>() de src/lib/api/client.ts con POST multipart/form-data
[ ] TASK-D4 — Implementar reset() para limpiar estado
[ ] TASK-D5 — Crear src/components/cirugias/AiUploadZone.tsx con drag-and-drop + file picker
[ ] TASK-D6 — Implementar feedback visual: idle (zona de drop), uploading (spinner), processing (barra), error (mensaje)
[ ] TASK-D7 — Crear src/components/cirugias/AiResultsPanel.tsx
[ ] TASK-D8 — Mostrar: looks_like_authorization, confidence (barra), warnings, resumen de datos extraídos
[ ] TASK-D9 — Implementar botón "Aplicar al formulario" que emite datos vía callback onApply(data)
[ ] TASK-D10 — Implementar botón "Descartar" / "Procesar otro archivo"
[ ] TASK-D11 — Verificar que componentes compilan y renderizan (prueba visual en ruta temporal o story)
[ ] TASK-D12 — Ejecutar npm run build y verificar sin errores
[ ] TASK-D13 — Handoff Fase D
```

### Fase E — Integración mínima en NewSurgeryDialog

```
[ ] TASK-E1 — Importar AiUploadZone y AiResultsPanel en NewSurgeryDialog.tsx
[ ] TASK-E2 — Agregar estado local para manejar el resultado de IA (aiResult, showAiSection)
[ ] TASK-E3 — Insertar sección colapsable al inicio del Paso 0 (antes de "Datos principales")
[ ] TASK-E4 — Sección colapsable: título "Cargar desde autorización (IA)" + ícono
[ ] TASK-E5 — Si showAiSection=true y no hay aiResult → mostrar AiUploadZone
[ ] TASK-E6 — Si hay aiResult → mostrar AiResultsPanel
[ ] TASK-E7 — Implementar onApply: llamar mapAiToWizardForm() + merge con newForm existente
[ ] TASK-E8 — Merge de referenciasAdministrativas: no duplicar tipos existentes, agregar nuevos
[ ] TASK-E9 — No sobrescribir campos ya completados (solo llenar vacíos) — o preguntar
[ ] TASK-E10 — Limpiar estado IA en handleClose/handleRequestClose
[ ] TASK-E11 — Prueba manual: flujo completo upload → revisar → aplicar → editar → confirmar
[ ] TASK-E12 — Verificar que el wizard funciona normalmente SIN usar la sección IA
[ ] TASK-E13 — Ejecutar npm run build y verificar sin errores
[ ] TASK-E14 — Handoff Fase E
```

### Fase F — Provider real (z-ai)

```
[ ] TASK-F1 — Verificar si z-ai-web-dev-sdk está instalado (npm list z-ai-web-dev-sdk)
[ ] TASK-F2 — Si no está: npm install z-ai-web-dev-sdk (verificar versión >= 0.0.17)
[ ] TASK-F3 — Crear src/lib/services/ai/providers/z-ai-provider.ts
[ ] TASK-F4 — Implementar extract() con createVision() y el prompt mejorado del sandbox (sección 9.3 del Plan de Reconstrucción)
[ ] TASK-F5 — Implementar parsing robusto: regex para extraer {...} del texto, parsear JSON, validar con Zod
[ ] TASK-F6 — Implementar manejo de errores: timeout, JSON malformado, provider caído → devolver emptyResponse con warning
[ ] TASK-F7 — Agregar zAiProvider al factory en autorizacion-extractor.ts
[ ] TASK-F8 — Cambiar AI_PROVIDER=z-ai en .env.local (o mantener mock como default y pasar mode=vlm)
[ ] TASK-F9 — Probar con al menos 3 imágenes reales de autorizaciones
[ ] TASK-F10 — Verificar que modo mock sigue funcionando con AI_PROVIDER=mock
[ ] TASK-F11 — Ejecutar npm run build y verificar sin errores
[ ] TASK-F12 — Handoff Fase F
```

### Fase G — Auditoría y documentación

```
[ ] TASK-G1 — Agregar createAuditEvent en el endpoint ai-extract (solo metadata)
[ ] TASK-G2 — Metadata de auditoría: provider, confidence, mimeType, fileSize, duration, warnings count
[ ] TASK-G3 — NUNCA incluir base64 ni extracted data en el evento de auditoría
[ ] TASK-G4 — Crear src/lib/services/ai/README.md
[ ] TASK-G5 — README: propósito, archivos, variables de entorno, cómo testear, cómo agregar provider
[ ] TASK-G6 — Crear knowledge/architecture/ADR-IA-AUTORIZACIONES.md
[ ] TASK-G7 — ADR: contexto (300+ formatos de prestadores), decisión (VLM + Strategy Pattern), consecuencias
[ ] TASK-G8 — Actualizar worklog con todas las fases completadas
[ ] TASK-G9 — Ejecutar npm run build final y verificar sin errores
[ ] TASK-G10 — Handoff Fase G + cierre del módulo
```

---

## 11. Validaciones Recomendadas

### 11.1 Validaciones por fase

| Fase | Comando / Acción | Qué verifica |
|---|---|---|
| A | `git status --short` | Solo se leyeron archivos, nada modificado |
| B | `npx vitest run` | Tests de schemas Zod + mapper pasan |
| B | `npx tsc --noEmit` | Sin errores de TypeScript |
| C | `curl -X POST .../ai-extract -F "file=@test.jpg" -F "mode=mock"` | Endpoint responde 200 con JSON válido |
| C | `curl -X POST .../ai-extract -F "file=@test.txt"` | Endpoint responde 400 |
| C | `curl -X POST .../ai-extract` (sin token) | Endpoint responde 401 |
| C | `npm run build` | Build de producción sin errores |
| D | Prueba visual en navegador | Componentes renderizan, hook funciona |
| D | `npm run build` | Sin errores de compilación |
| E | Prueba manual: flujo completo del wizard | Wizard funciona con y sin IA |
| E | `npm run build` | Sin errores |
| F | Prueba con 3 documentos reales | Extracción correcta |
| F | `npm run build` | Sin errores |
| G | Verificar `AuditEvent` en BD | Auditoría registrada |
| G | `npm run build` | Build final limpio |

### 11.2 Reglas de seguridad para validación

```txt
[ ] No hay API keys hardcodeadas en el código fuente
[ ] No se loguea base64 ni contenido extraído
[ ] El endpoint requiere autenticación (401 sin token)
[ ] El endpoint valida pertenencia a la empresa (companyId en URL)
[ ] No se persiste el archivo subido en disco ni en BD
[ ] No se crearon migraciones de Prisma
[ ] No se modificó prisma/schema.prisma
[ ] No se creó modelo Autorizacion
```

### 11.3 Si se toca Prisma por error

```bash
git checkout prisma/schema.prisma
npx prisma generate
```

### 11.4 Si el build falla

Ejecutar el ciclo Diagnose (Reproduce / Scope / Evidence / Hypothesis / Minimal Fix / Validate / Regression Check / Handoff) antes de aplicar cualquier fix. No aplicar fixes a ciegas.

---

## Apéndice A: Dependencias confirmadas en el repo real

| Paquete | Versión | Instalado | Uso en el módulo |
|---|---|---|---|
| `zod` | ^4.0.2 | ✅ SÍ | Schemas de extracción IA |
| `react-hook-form` | ^7.60.0 | ✅ SÍ | Formulario del wizard (ya en uso) |
| `@hookform/resolvers` | ^5.1.1 | ✅ SÍ | Integración Zod + RHF |
| `@tanstack/react-query` | ^5.82.0 | ✅ SÍ | Hook useAiExtraction (useMutation) |
| `sharp` | ^0.34.3 | ✅ SÍ | Conversión PDF→imagen (futuro) |
| `date-fns` | ^4.1.0 | ✅ SÍ | Normalización de fechas |
| `lucide-react` | ^0.525.0 | ✅ SÍ | Iconos en componentes UI |
| `zustand` | ^5.0.6 | ✅ SÍ | Store (solo lectura para companyId) |
| `z-ai-web-dev-sdk` | — | ❌ NO | Provider VLM real — instalar en Fase F |

---

## Apéndice B: Variables de entorno necesarias

```bash
# Agregar a .env.local (NUNCA eliminar variables existentes)
AI_PROVIDER=mock                           # mock | z-ai | openai | anthropic
AI_TIMEOUT_MS=30000                        # Timeout en ms para llamadas IA
AI_MAX_FILE_SIZE_MB=20                     # Tamaño máximo de archivo
AI_CONFIDENCE_THRESHOLD=0.3                # Umbral de confianza para warning

# Solo cuando AI_PROVIDER=z-ai (en sandbox Z.ai se autodescubre)
# ZAI_API_KEY=

# Solo cuando AI_PROVIDER=openai
# OPENAI_API_KEY=

# Solo cuando AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=
```

---

## Apéndice C: Referencia rápida de archivos

### Archivos a crear (14 archivos nuevos)

| # | Archivo | Fase |
|---|---|---|
| 1 | `src/lib/validators/autorizacion-ai.ts` | B |
| 2 | `src/lib/services/ai/types.ts` | C |
| 3 | `src/lib/services/ai/config.ts` | C |
| 4 | `src/lib/services/ai/providers/mock-provider.ts` | C |
| 5 | `src/lib/services/ai/autorizacion-extractor.ts` | C |
| 6 | `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts` | C |
| 7 | `src/hooks/useAiExtraction.ts` | D |
| 8 | `src/components/cirugias/AiUploadZone.tsx` | D |
| 9 | `src/components/cirugias/AiResultsPanel.tsx` | D |
| 10 | `src/lib/services/ai/providers/z-ai-provider.ts` | F |
| 11 | `src/lib/services/ai/README.md` | G |
| 12 | `knowledge/architecture/ADR-IA-AUTORIZACIONES.md` | G |

### Archivos a modificar (3 archivos existentes)

| # | Archivo | Cambio | Fase |
|---|---|---|---|
| 1 | `.env.local` | Agregar 4 variables de entorno | C |
| 2 | `src/components/cirugias/dialogs/NewSurgeryDialog.tsx` | Agregar sección colapsable IA en Paso 0 | E |
| 3 | `src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts` | Agregar createAuditEvent | G |

### Archivos que NO se tocan

- `prisma/schema.prisma`
- `src/lib/db.ts`
- `src/lib/prisma.ts`
- `src/lib/store.ts`
- `src/app/cirugias/page.tsx`
- `src/hooks/useCirugiaActions.ts`
- `src/lib/services/surgery.service.ts`
- `src/lib/validators/surgery.validator.ts`
- `src/lib/api/client.ts`
- `src/lib/api/auth-context.ts`
- `next.config.ts`
- `package.json` (salvo `npm install z-ai-web-dev-sdk` en Fase F)

---

**Versión**: 1.0 — Junio 2026  
**Estado**: PENDIENTE APROBACIÓN DE FRANCO  
**Próximo paso**: Fase A — Exploración real del wizard (read-only)
