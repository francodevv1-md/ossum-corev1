# PLAN — Arquitectura IA Multi-Provider

## OSSUM COR — Módulo IA de Autorizaciones

**Tipo**: planificación read-only  
**Estado**: propuesta arquitectónica, sin implementación  
**Objetivo**: desacoplar la capa IA de autorizaciones para soportar múltiples proveedores sin atar el sistema a OpenRouter, OpenAI, Gemini, Anthropic o un SDK puntual.

---

## 1. Resumen Ejecutivo

La capa IA actual ya tiene una base válida para avanzar: existe un contrato funcional de extracción (`AutorizacionAIResponse`), un extractor, un provider mock y un endpoint protegido. Sin embargo, todavía está demasiado cerca de una implementación puntual porque:

- `AIProviderName` hoy solo contempla `"mock" | "z-ai"`.
- `AutorizacionAIResponseSchema.provider` es un `enum` cerrado.
- `autorizacion-extractor.ts` resuelve providers con lógica local y casos especiales (`mode=vlm`, `providerName === "z-ai"`).
- No existe separación explícita entre:
  - contrato interno del sistema,
  - adaptación al proveedor externo,
  - prompt,
  - utilidades de parseo,
  - preparación de archivos.

La decisión recomendada es evolucionar la arquitectura a un diseño **provider-agnostic**, donde:

1. El **sistema interno** solo conozca un contrato estable de extracción.
2. Cada proveedor viva en su propio archivo y traduzca su SDK/API al contrato común.
3. OpenRouter sea solo un provider más, no la arquitectura central.
4. El extractor sea un **orquestador/factory**, no un lugar con lógica específica por proveedor.

---

## 2. Estado Actual de la Capa IA

### Archivos existentes

```txt
src/lib/validators/autorizacion-ai.ts
src/lib/services/ai/types.ts
src/lib/services/ai/config.ts
src/lib/services/ai/providers/mock-provider.ts
src/lib/services/ai/autorizacion-extractor.ts
src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts
```

### Qué ya está bien

- Existe un contrato de salida útil: `AutorizacionAIResponse`.
- El endpoint sigue el patrón real de auth del repo (`getApiAuthContext`, `requireCompanyMutationAccess`, `ok`, `errorResponse`).
- La validación de archivos ya está encapsulada en el endpoint.
- El mock provider devuelve una respuesta realista y validada con Zod.
- El sistema ya opera backend-only, sin exponer lógica IA al frontend.

### Qué conviene refactorizar antes de agregar providers reales

- El contrato de types es todavía muy chico y orientado a la fase mock.
- El extractor mezcla:
  - selección de provider,
  - decisión por `mode`,
  - errores de provider no implementado,
  - parseo/validación final.
- `provider` en el schema de respuesta es un `enum` cerrado (`"z-ai" | "mock" | "fallback-regex"`), lo que obliga a editar el schema cada vez que se agrega un provider nuevo.
- No hay todavía carpeta `prompts/` ni `utils/` para aislar responsabilidades.

---

## 3. Decisión Recomendada

### Decisión principal

**Mantener `AutorizacionAIResponse` como contrato de dominio de salida, pero crear un contrato interno más general para providers.**

En otras palabras:

- **NO** conviene que cada provider trabaje directamente con el endpoint o con el wizard.
- **SÍ** conviene agregar una capa intermedia con contratos genéricos:

```ts
AIExtractionProvider
AIProviderRequest
AIProviderResponse
AIProviderCapability
AIProviderName
```

### Motivo

Esto permite que:

- OpenRouter, OpenAI, Gemini, Anthropic o un provider local implementen la misma interfaz.
- El extractor no conozca payloads específicos, headers ni SDKs.
- El contrato de negocio (`AutorizacionAIResponse`) siga estable aunque cambie la infraestructura externa.
- La transición entre providers sea una decisión de configuración, no un refactor transversal.

---

## 4. Contrato IA Interno Recomendado

## 4.1 Qué mantener

Mantener `AutorizacionExtracted` y `AutorizacionAIResponse` como contrato de dominio para el módulo de autorizaciones.

Ese contrato ya representa correctamente lo que el sistema necesita:

- datos estructurados de autorización,
- confidence,
- warnings,
- identificación del provider.

## 4.2 Qué agregar

### `AIProviderName`

```ts
type AIProviderName =
  | "mock"
  | "openrouter"
  | "openai"
  | "gemini"
  | "anthropic"
  | "local";
```

### `AIProviderCapability`

```ts
type AIProviderCapability = {
  vision: boolean;
  pdfDirect: boolean;
  jsonMode: boolean;
  maxFileSizeMb?: number;
};
```

### `AIProviderRequest`

Contrato genérico para lo que el extractor le pasa a cualquier provider.

```ts
type AIProviderRequest = {
  file: {
    buffer: Buffer;
    mimeType: string;
    fileName?: string;
  };
  prompt: string;
  timeoutMs: number;
  model?: string;
  metadata?: {
    companyId?: string;
    actorUserId?: string;
    source?: string;
  };
};
```

### `AIProviderResponse`

Contrato intermedio antes del parseo final al dominio.

```ts
type AIProviderResponse = {
  provider: string;
  rawText: string;
  durationMs?: number;
  warnings?: string[];
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};
```

### `AIExtractionProvider`

```ts
interface AIExtractionProvider {
  readonly name: AIProviderName;
  readonly capability: AIProviderCapability;
  extract(request: AIProviderRequest): Promise<AIProviderResponse>;
}
```

## 4.3 Decisión de diseño

**El provider no debería devolver directamente `AutorizacionAIResponse`.**

### Recomendación

El provider debe devolver un `AIProviderResponse` genérico (`rawText`, `warnings`, metadata técnica), y luego una capa común debe:

1. extraer JSON,
2. parsearlo,
3. validarlo con `AutorizacionAIResponseSchema` o con el schema de extracción del módulo,
4. construir el `AutorizacionAIResponse` final.

### Ventaja

Esto evita duplicar en cada provider:

- regex de extracción JSON,
- manejo de markdown ```json,
- defaults,
- validación Zod,
- normalización de salida.

---

## 5. Diseño de Providers

## 5.1 Providers a soportar

```txt
mock
openrouter
openai
gemini
anthropic
local
```

## 5.2 Regla arquitectónica

Cada provider debe vivir en su propio archivo y ser la única capa que conoce:

- SDK del vendor,
- headers,
- auth,
- shape del payload,
- particularidades de vision/multimodal,
- nombre exacto del modelo remoto.

### El resto del sistema NO debe conocer:

- cómo se llama el endpoint del vendor,
- si usa `messages`, `contents`, `input_image`, `inline_data`, etc.,
- si requiere base64, URL pública o `Blob`.

## 5.3 Responsabilidades por capa

### Provider individual

Debe hacer solo esto:

1. recibir `AIProviderRequest`,
2. traducirlo al SDK/API del proveedor,
3. ejecutar la llamada,
4. devolver `AIProviderResponse` genérico.

### Extractor / orchestrator

Debe hacer:

1. elegir provider,
2. resolver prompt,
3. convertir archivo si hace falta,
4. llamar al provider,
5. parsear respuesta,
6. validar con Zod,
7. devolver `AutorizacionAIResponse`.

### Endpoint

Debe hacer:

1. auth,
2. validación de archivo,
3. invocación del extractor,
4. respuesta HTTP.

No más.

---

## 6. Configuración Recomendada

## 6.1 Variables globales

```env
AI_PROVIDER=mock
AI_MODEL=
AI_TIMEOUT_MS=30000
AI_MAX_FILE_SIZE_MB=20
AI_CONFIDENCE_THRESHOLD=0.3
```

## 6.2 Variables por provider

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=

OPENAI_API_KEY=
OPENAI_MODEL=

GEMINI_API_KEY=
GEMINI_MODEL=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
```

## 6.3 Recomendación concreta

Separar claramente:

- configuración global del módulo IA,
- configuración por provider,
- defaults seguros.

### Reglas

1. `AI_PROVIDER` decide qué provider activo usar.
2. `AI_MODEL` puede existir como override global opcional.
3. Si no hay `AI_MODEL`, cada provider usa su variable específica (`OPENROUTER_MODEL`, etc.).
4. Nunca exponer estas variables al frontend.
5. Nunca leerlas fuera de la capa backend.

## 6.4 Diseño sugerido para `config.ts`

Hoy `config.ts` expone un `aiConfig` plano. Eso sirve para mock, pero para multi-provider conviene evolucionarlo a algo así:

```ts
export const aiConfig = {
  provider: "mock",
  model: process.env.AI_MODEL || undefined,
  timeoutMs: 30000,
  maxFileSizeBytes: 20 * 1024 * 1024,
  confidenceThreshold: 0.3,
  providers: {
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL,
    },
  },
};
```

---

## 7. Decisión sobre `provider` en el Schema

## Problema actual

Hoy `AutorizacionAIResponseSchema.provider` es:

```ts
z.enum(["z-ai", "mock", "fallback-regex"])
```

Esto obliga a editar el schema cada vez que se agregue:

- `openrouter`,
- `openai`,
- `gemini`,
- `anthropic`,
- `local`.

## Opciones

### Opción A — mantener enum estricto

**Pros**
- control total,
- typos detectables,
- contratos cerrados.

**Contras**
- cada nuevo provider obliga a tocar schema,
- más fricción para experimentar,
- menos extensible.

### Opción B — pasar a string validado

Ejemplo:

```ts
provider: z.string().min(1)
```

**Pros**
- extensible,
- no obliga a tocar el schema por cada provider nuevo,
- mejor para arquitectura plugin/provider-based.

**Contras**
- menor control estático,
- posibles typos si no hay validación adicional.

## Decisión recomendada

**Usar `provider` como string validado en el schema de dominio y mantener `AIProviderName` como tipo interno estricto en la capa de services.**

### Forma recomendada

- En `types.ts`: `AIProviderName` sigue siendo unión estricta.
- En `AutorizacionAIResponseSchema`: `provider` pasa a `z.string().min(1)`.
- En providers reales: cada adapter devuelve `provider: this.name`.

### Ventaja

Separa:

- **dominio de salida**: flexible,
- **infraestructura interna**: estricta.

Eso permite registrar `openrouter` mañana sin romper el contrato del módulo.

---

## 8. OpenRouter como Provider, no como Arquitectura

## 8.1 Posicionamiento correcto

OpenRouter debe ser solo un adapter más.

**NO** debe ser:

- el contrato interno,
- la forma en que el frontend piensa la IA,
- el naming dominante de la arquitectura,
- el único flujo soportado.

## 8.2 Requisitos para `openrouter-provider.ts`

Debe:

- vivir en `src/lib/services/ai/providers/openrouter-provider.ts`
- usar `OPENROUTER_API_KEY`
- usar `OPENROUTER_MODEL`
- ejecutarse solo en backend
- devolver siempre `AIProviderResponse` genérico
- dejar el parse/validación final a la capa común
- no loguear datos sensibles

## 8.3 Qué no debe pasar

No debe ocurrir que:

- el endpoint conozca headers de OpenRouter,
- el extractor arme payload específico de OpenRouter,
- el frontend sepa qué provider está activo,
- `AutorizacionAIResponseSchema` dependa del naming de OpenRouter.

---

## 9. Arquitectura Final Sugerida

```txt
src/lib/services/ai/
  config.ts
  types.ts
  autorizacion-extractor.ts
  providers/
    mock-provider.ts
    openrouter-provider.ts
    openai-provider.ts
    gemini-provider.ts
    anthropic-provider.ts
    local-provider.ts
  prompts/
    autorizacion-prompt.ts
  utils/
    parse-json-response.ts
    file-to-ai-input.ts
    provider-factory.ts
    validate-provider-config.ts
```

## 9.1 Qué crear ahora

En la próxima fase arquitectónica (C.5) conviene crear:

- `prompts/autorizacion-prompt.ts`
- `utils/parse-json-response.ts`
- `utils/provider-factory.ts`
- refactor de `types.ts`
- refactor de `config.ts`
- refactor de `autorizacion-extractor.ts`

## 9.2 Qué puede esperar

Puede esperar para fases posteriores:

- `openai-provider.ts`
- `gemini-provider.ts`
- `anthropic-provider.ts`
- `local-provider.ts`
- `file-to-ai-input.ts` si todavía no se implementa PDF complejo

## 9.3 Orden recomendado

1. estabilizar contrato provider-agnostic,
2. refactor factory,
3. externalizar prompt,
4. agregar OpenRouter,
5. luego sumar otros providers.

---

## 10. Cambios Necesarios Antes de Fase D

Antes de construir hook/UI aislada conviene hacer estos cambios arquitectónicos:

1. **Refactor de `types.ts`**
   - pasar de `AIProvider` mínimo a `AIExtractionProvider` más general.

2. **Refactor de `config.ts`**
   - agregar estructura por provider,
   - soportar `AI_MODEL` global y modelos específicos.

3. **Refactor de `autorizacion-extractor.ts`**
   - convertirlo en orquestador real,
   - mover selección de provider a `provider-factory.ts`,
   - quitar lógica especial hardcodeada de `z-ai` / `vlm`.

4. **Refactor de `AutorizacionAIResponseSchema.provider`**
   - cambiar enum cerrado por string validado.

5. **Extraer prompt a archivo propio**
   - para no duplicarlo cuando se agreguen providers.

### Motivo

Si la UI se construye encima de una capa demasiado acoplada, después habrá que refactorizar endpoint + hook + UI a la vez. Conviene estabilizar la arquitectura backend primero.

---

## 11. Cambios que Pueden Esperar

Estos cambios no bloquean la fase UI:

- provider OpenAI real,
- provider Gemini real,
- provider Anthropic real,
- provider local,
- auditoría detallada por token usage,
- optimización de PDFs multi-página,
- OCR fallback real.

OpenRouter puede ser el primer provider real, pero **después** del refactor provider-agnostic, no antes.

---

## 12. Plan de Implementación por Fases

## Fase C.5 — Refactor provider-agnostic

### Objetivo

Refactorizar la capa IA actual para desacoplarla del provider mock y dejarla preparada para múltiples adapters sin tocar endpoint/UI todavía.

### Archivos a tocar

```txt
src/lib/services/ai/types.ts
src/lib/services/ai/config.ts
src/lib/services/ai/autorizacion-extractor.ts
src/lib/validators/autorizacion-ai.ts
```

### Archivos a crear

```txt
src/lib/services/ai/prompts/autorizacion-prompt.ts
src/lib/services/ai/utils/parse-json-response.ts
src/lib/services/ai/utils/provider-factory.ts
```

### Archivos a no tocar

```txt
src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts
NewSurgeryDialog.tsx
useCirugiaActions.ts
store.ts
prisma/schema.prisma
.env.local
```

### Riesgos

- romper compatibilidad con mock,
- sobrediseñar demasiado temprano,
- mover demasiadas piezas a la vez.

### Validaciones

- `npx next typegen`
- `npx tsc --noEmit`
- `npm run build`
- `git status --short`

### Criterio de éxito

- mock sigue funcionando sin cambios de comportamiento,
- extractor ya no está hardcodeado para un provider puntual,
- se puede agregar OpenRouter sin tocar endpoint ni contrato del wizard.

---

## Fase D — Hook + UI aislada

### Objetivo

Construir el hook frontend y los componentes aislados (`AiUploadZone`, `AiResultsPanel`) consumiendo el endpoint existente.

### Archivos a tocar

```txt
src/hooks/useAiExtraction.ts
src/components/cirugias/AiUploadZone.tsx
src/components/cirugias/AiResultsPanel.tsx
```

### Archivos a no tocar

```txt
NewSurgeryDialog.tsx
useCirugiaActions.ts
store.ts
prisma/schema.prisma
```

### Riesgos

- companyId no disponible en frontend,
- UX prematura si el backend todavía cambia,
- manejo incorrecto de estados loading/error.

### Validaciones

- `npx tsc --noEmit`
- `npm run build`
- prueba visual aislada con modo mock

### Criterio de éxito

- el hook puede subir un archivo y recibir un `AutorizacionAIResponse`,
- la UI funciona sin tocar todavía el wizard real.

---

## Fase E — Integración mínima en wizard

### Objetivo

Insertar la sección IA en `NewSurgeryDialog.tsx` sin tocar el flujo de guardado.

### Archivos a tocar

```txt
src/components/cirugias/dialogs/NewSurgeryDialog.tsx
```

### Archivos a no tocar

```txt
useCirugiaActions.ts
store.ts
surgery.service.ts
prisma/schema.prisma
```

### Riesgos

- romper validación del wizard,
- mal merge de `referenciasAdministrativas`,
- sobrescribir datos manuales.

### Validaciones

- `npx tsc --noEmit`
- `npm run build`
- prueba manual del flujo upload → aplicar → editar → guardar

### Criterio de éxito

- la IA precarga `newForm` correctamente,
- el guardado sigue usando el flujo actual sin cambios.

---

## Fase F — Provider real OpenRouter

### Objetivo

Agregar `openrouter-provider.ts` como primer provider real, sobre la arquitectura ya desacoplada.

### Archivos a tocar

```txt
src/lib/services/ai/providers/openrouter-provider.ts
src/lib/services/ai/utils/provider-factory.ts
src/lib/services/ai/config.ts
```

### Archivos a no tocar

```txt
endpoint
wizard
UI
store
Prisma
```

### Riesgos

- parseo de JSON inconsistente,
- diferencias entre modelo y prompt,
- costos y límites del proveedor,
- payload multimodal específico.

### Validaciones

- `npx tsc --noEmit`
- `npm run build`
- curl al endpoint con `mode`/config OpenRouter
- prueba con al menos 3 documentos reales

### Criterio de éxito

- OpenRouter funciona sin modificar el endpoint ni la UI,
- mock sigue funcionando,
- el contrato de salida sigue estable.

---

## Fase G — Otros providers

### Objetivo

Agregar providers secundarios (`openai`, `gemini`, `anthropic`, `local`) como adapters equivalentes.

### Archivos a tocar

```txt
src/lib/services/ai/providers/openai-provider.ts
src/lib/services/ai/providers/gemini-provider.ts
src/lib/services/ai/providers/anthropic-provider.ts
src/lib/services/ai/providers/local-provider.ts
src/lib/services/ai/utils/provider-factory.ts
src/lib/services/ai/config.ts
```

### Archivos a no tocar

```txt
wizard
hook
UI
endpoint
Prisma
```

### Riesgos

- explosion de combinaciones de config,
- diferencias de calidad entre modelos,
- mantenimiento de prompts específicos.

### Validaciones

- cada provider compila,
- cada provider puede devolver `AutorizacionAIResponse` válido,
- mock sigue siendo fallback seguro.

### Criterio de éxito

- cambiar provider activo solo requiere config,
- el resto del sistema permanece intacto.

---

## 13. Riesgos Principales

### Riesgo alto

1. **Agregar OpenRouter antes del refactor provider-agnostic**
   - dejaría el extractor y el endpoint acoplados a un proveedor puntual.

2. **Mantener `provider` como enum cerrado**
   - obligará a tocar el schema cada vez que se sume un adapter nuevo.

3. **Hacer que cada provider devuelva directamente `AutorizacionAIResponse`**
   - duplicaría parseo y validación en todos los adapters.

### Riesgo medio

4. **Sobrediseñar demasiado temprano**
   - agregar demasiadas abstracciones antes del primer provider real.

5. **Confundir contrato de dominio con contrato de infraestructura**
   - mezclar `AutorizacionAIResponse` con payloads de vendors.

### Riesgo bajo

6. **Dejar OpenRouter como primer provider real**
   - es razonable, siempre que entre como adapter aislado.

---

## 14. Recomendación Final

### Recomendación principal

**Antes de Fase D conviene ejecutar una Fase C.5 de refactor provider-agnostic.**

### Porque

Hoy la base funciona, pero todavía está demasiado cerca de una implementación puntual. Si se agrega OpenRouter ya mismo, el sistema quedará condicionado por ese provider y luego habrá que refactorizar mientras ya exista UI montada encima.

### Estrategia recomendada

1. refactor del contrato interno,
2. factoría de providers,
3. utilidades compartidas,
4. prompt externo,
5. recién entonces agregar OpenRouter,
6. después construir la UI estable sobre esa capa.

---

## 15. Siguiente Task Recomendado

**Fase C.5 — Refactor provider-agnostic**

Task brief sugerido:

```txt
Objetivo:
Refactorizar la capa IA actual para soportar múltiples providers sin tocar endpoint, wizard ni frontend.

Archivos a tocar:
- src/lib/services/ai/types.ts
- src/lib/services/ai/config.ts
- src/lib/services/ai/autorizacion-extractor.ts
- src/lib/validators/autorizacion-ai.ts

Archivos a crear:
- src/lib/services/ai/prompts/autorizacion-prompt.ts
- src/lib/services/ai/utils/parse-json-response.ts
- src/lib/services/ai/utils/provider-factory.ts

Archivos a no tocar:
- src/app/api/companies/[companyId]/surgeries/ai-extract/route.ts
- NewSurgeryDialog.tsx
- useCirugiaActions.ts
- store.ts
- prisma/schema.prisma
- .env.local

Validaciones:
- npx next typegen
- npx tsc --noEmit
- npm run build
- git status --short

Criterio de éxito:
- mock sigue funcionando
- extractor ya no tiene lógica hardcodeada por provider
- se puede agregar openrouter-provider.ts sin tocar endpoint ni UI
```

---

**Estado**: listo para revisión  
**Próximo paso recomendado**: Fase C.5 — Refactor provider-agnostic
