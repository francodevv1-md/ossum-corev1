# Design — COMPARTIR-CIRUGIA-WHATSAPP-DESIGN

Status: designed  
Change: `COMPARTIR-CIRUGIA-WHATSAPP-DESIGN`  
Workspace: `E:/OSSUM_COR_PROJECT`

---

## 1. Goal

Reemplazar/complementar la acción `Copiar mensaje` de `Mi bandeja` por `Compartir cirugía`, manteniendo un solo flujo operativo:

- plantilla editable para WhatsApp;
- selección de evidencias ya existentes en seguimiento;
- share nativo cuando exista y fallback estable a WhatsApp URL / copiar;
- registro interno del evento dentro del seguimiento real del expediente.

No se diseña un chat paralelo ni una bandeja externa nueva.

---

## 2. Reuse obligatorio

### UI / surfaces

- `src/components/coordinadores/CoordinatorInboxView.tsx`
  - reemplazar CTA `Copiar mensaje` por `Compartir cirugía`.
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- patrón mobile/desktop ya usado en `CoordinatorManagementDialog`.

### Data / hooks

- `src/components/coordinadores/coordinator-queue.helpers.ts`
  - `buildCoordinatorCaseMessage(entry)` como base de plantilla.
- `src/hooks/useSeguimientoFeed.ts`
  - fuente única para timeline, evidencias y registro interno.
- `src/components/coordinadores/CoordinatorCaseTrackingPreview.tsx`
  - referencia para resumir adjuntos/correo/autorizaciones sin duplicar lógica.
- `src/lib/api/seguimiento-adapter.ts`
  - shape actual de `entries`, `photoMeta`, `mailMeta`, `evidenceRef`.

### Regla

- registrar el evento como `note` dentro de seguimiento con metadata en `evidenceRef`.
- no crear `entryType` nuevo en Fase 1.

---

## 3. Fases 1-3 mapeadas

### Fase 1 — Share básico con plantilla editable

Objetivo:

- abrir una surface dedicada desde la card;
- mostrar mensaje prearmado editable;
- permitir `Compartir`, `Abrir WhatsApp` y `Copiar`.

Diseño:

- CTA principal en la card: `Compartir cirugía`.
- texto inicial basado en `buildCoordinatorCaseMessage(entry)`.
- acciones:
  1. `Compartir` → `navigator.share({ text })` si existe;
  2. `WhatsApp` → `https://wa.me/?text=${encodeURIComponent(text)}`;
  3. `Copiar` → clipboard fallback.

Resultado esperado:

- mejora inmediata sin romper el flujo actual;
- `Copiar mensaje` queda absorbido dentro de la nueva surface.

### Fase 2 — Evidencias seleccionables desde seguimiento

Objetivo:

- enriquecer el mensaje sin inventar otro repositorio de adjuntos.

Diseño:

- usar `useSeguimientoFeed(surgery.id)` dentro de la surface.
- mostrar bloques seleccionables de:
  - notas destacadas / recientes;
  - `authorization_evidence`;
  - `file_photo_evidence`;
  - `mail_evidence`.
- no adjuntar binarios a WhatsApp URL.
- sí incorporar al mensaje:
  - resumen corto;
  - etiquetas tipo `Autorización`, `Foto`, `Correo`;
  - cantidad de archivos cuando aplique.

Regla UX:

- evidencias se “citan” en el mensaje; no se duplican ni se exportan automáticamente.

### Fase 3 — Registro interno del share

Objetivo:

- dejar trazabilidad interna de qué se compartió, por qué canal y con qué snapshot.

Diseño:

- al ejecutar `Compartir`, `WhatsApp` o `Copiar`, crear `note` en seguimiento via `addNote`.
- contenido humano:
  - `Se compartió cirugía por WhatsApp.`
  - o `Se preparó y copió mensaje de cirugía.`
- `summary` sugerido:
  - `Compartido · WhatsApp`
  - `Compartido · Copiado`
- `evidenceRef` sugerido:
  - `eventKind: "share_surgery"`
  - `channel: "web_share" | "whatsapp_url" | "clipboard"`
  - `selectedEntryIds: string[]`
  - `messageSnapshot: string`
  - `source: "coordinator_inbox"`

Así el seguimiento sigue siendo la fuente única de verdad.

---

## 4. Surface propuesta

### Mobile

- `Sheet` bottom, alto casi completo (`90-100dvh`).
- orden:
  1. resumen corto del caso;
  2. editor del mensaje;
  3. selector de evidencias;
  4. acciones sticky al pie.

### Desktop

- `Dialog` ancho medio (`max-w-3xl` aprox).
- layout 2 columnas:
  - izquierda: mensaje editable;
  - derecha: evidencias seleccionables + resumen del caso.
- footer persistente con acciones.

### Jerarquía recomendada

```txt
Header caso
→ Mensaje WhatsApp editable
→ Evidencias a incluir
→ Preview final
→ Compartir / WhatsApp / Copiar
```

No conviene abrir expediente completo para esta acción porque frena una tarea corta.

---

## 5. Fuente de datos por bloque

### Plantilla base

Fuente:

- `buildCoordinatorCaseMessage(entry)`
- campos de `CoordinatorCase` ya calculados: fecha, hora, estado, preparación, disponibilidad, SLA.

Evolución mínima sugerida:

- extraer helper nuevo tipo `buildCoordinatorShareMessage({ entry, selectedEvidence })`;
- dejar `buildCoordinatorCaseMessage` como base legacy/simple.

### Evidencias

Fuente:

- `useSeguimientoFeed(surgery.id).entries`

Priorización visual:

1. destacadas;
2. autorizaciones;
3. fotos/adjuntos;
4. correo;
5. notas generales.

### Registro interno

Fuente / mecanismo:

- `useSeguimientoFeed(surgery.id).addNote(...)`
- `entryType: "note"`
- `noteType: "coordinacion"`
- metadata en `evidenceRef`.

---

## 6. Comportamiento de fallback

Orden recomendado:

1. si existe `navigator.share` con texto → usar share nativo;
2. si el usuario toca CTA específico WhatsApp → abrir `wa.me` con texto encoded;
3. si share nativo falla/no existe → mantener CTA `Copiar` siempre disponible;
4. mostrar toast claro según canal usado.

Importante:

- Web Share API no garantiza WhatsApp;
- WhatsApp URL no soporta adjuntos reales desde web;
- por eso el fallback canónico debe ser texto + referencias a evidencias internas.

---

## 7. Riesgos y límites

1. **Registro prematuro**: si se registra al abrir la surface, ensucia seguimiento. Registrar solo al disparar acción final.
2. **Duplicación de texto**: snapshot largo puede volver ruidoso el timeline. Usar `summary` corto y guardar snapshot en metadata.
3. **Expectativa de adjuntar imágenes a WhatsApp web**: no prometerlo en Fase 1-2.
4. **Ruido por demasiadas evidencias**: limitar selección visible inicial a destacadas + últimas relevantes.
5. **Canal ambiguo**: `navigator.share` no asegura WhatsApp; guardar `web_share` como canal real cuando no haya certeza.

---

## 8. Recomendación concreta de implementación posterior

1. crear `CoordinatorShareSurgeryDialog` o nombre similar;
2. mover el botón de `Copiar mensaje` a `Compartir cirugía` en `CoordinatorInboxView`;
3. reutilizar helper actual de mensaje como semilla;
4. leer seguimiento con `useSeguimientoFeed`;
5. registrar share como `note` con metadata, sin endpoint nuevo en primera iteración.

---

## 9. Validación funcional esperada

Franco debería validar:

1. si la acción principal debe llamarse solo `Compartir cirugía` o `Compartir / WhatsApp`;
2. si el registro interno debe ocurrir también cuando solo se copia;
3. cuántas evidencias máximas conviene citar por mensaje;
4. si el timeline luego debe renderizar badge específico para eventos de share.
