/**
 * autorizacion-ai.ts
 * OSSUM COR — Módulo IA de Autorizaciones
 *
 * Schemas Zod para el contrato de extracción IA desde documentos de autorización
 * de cirugía (ART / obras sociales argentinas).
 *
 * Incluye schemas, tipos derivados, normalizadores y función de mapeo
 * desde los datos extraídos por IA hacia el formulario NewSurgeryForm del wizard real.
 *
 * Fase B — Schemas Zod + mapper IA → wizard real
 */

import { z } from "zod";
import { parse, format, isValid } from "date-fns";
import type { NewSurgeryForm } from "@/lib/cirugias.types";
import type { ReferenciaAdministrativa, TipoReferencia } from "@/types";

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS ZOD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ítem individual de material autorizado extraído de la autorización.
 * Todos los campos son strings para preservar el formato original del documento.
 */
export const MaterialAutorizadoItemSchema = z.object({
  codigo: z.string().default(""),
  descripcion: z.string().default(""),
  /** String (no number) para permitir valores como "2-3", "4+", etc. */
  cantidad: z.string().default(""),
  /** String para mantener formato original (ej: "$85.000") */
  precio_referencia: z.string().default(""),
});

/**
 * Datos extraídos del documento de autorización de cirugía.
 * 12 campos de dominio quirúrgico + array de material autorizado.
 * Campos ausentes en la respuesta del VLM se completan con string vacío (defaults de Zod).
 */
export const AutorizacionExtractedSchema = z.object({
  paciente: z.string().default(""),
  dni: z.string().default(""),
  medico: z.string().default(""),
  institucion: z.string().default(""),
  obra_social: z.string().default(""),
  patologia_sugerida: z.string().default(""),
  numero_autorizacion: z.string().default(""),
  numero_siniestro: z.string().default(""),
  numero_poliza: z.string().default(""),
  /** Formato esperado: YYYY-MM-DD (el prompt pide este formato al VLM) */
  fecha_autorizacion: z.string().default(""),
  /** Formato esperado: YYYY-MM-DD */
  fecha_cirugia: z.string().default(""),
  /** Fecha probable detectada en el documento si existe */
  fecha_probable: z.string().default(""),
  provincia_sugerida: z.string().default(""),
  localidad_sugerida: z.string().default(""),
  material_autorizado: z.array(MaterialAutorizadoItemSchema).default([]),
  observaciones: z.string().default(""),
});

/**
 * Respuesta completa del endpoint de extracción IA.
 * Incluye metadatos del provider, nivel de confianza, advertencias,
 * datos extraídos y vista previa del texto crudo.
 */
export const AutorizacionAIResponseSchema = z.object({
  /** Motor que generó la respuesta */
  provider: z.string().min(1),
  /** Nivel de confianza de la extracción (0.0 a 1.0) */
  confidence: z.number().min(0).max(1).default(0),
  /** Si el documento parece realmente una autorización de cirugía */
  looks_like_authorization: z.boolean().default(false),
  /** Advertencias sobre el procesamiento */
  warnings: z.array(z.string()).default([]),
  /** Datos extraídos del documento */
  extracted: AutorizacionExtractedSchema,
  /** Vista previa del texto crudo devuelto por el modelo (max 500 chars) */
  raw_text_preview: z.string().default(""),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DERIVADOS
// ═══════════════════════════════════════════════════════════════════════════════

export type MaterialAutorizadoItem = z.infer<typeof MaterialAutorizadoItemSchema>;
export type AutorizacionExtracted = z.infer<typeof AutorizacionExtractedSchema>;
export type AutorizacionAIResponse = z.infer<typeof AutorizacionAIResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZADORES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normaliza un DNI argentino: elimina puntos, guiones y cualquier carácter no numérico.
 *
 * Ejemplos:
 *   "28.456.789"  → "28456789"
 *   "12.345.678"  → "12345678"
 *   "9.876.543-2" → "98765432"
 */
export function normalizeDni(raw: string): string {
  if (!raw) return "";
  return raw.replace(/[.\-]/g, "").replace(/[^\d]/g, "");
}

/**
 * Normaliza una fecha a formato ISO YYYY-MM-DD.
 *
 * Soporta:
 *   - DD/MM/YYYY (formato argentino estándar)
 *   - YYYY-MM-DD (ya normalizado, se devuelve tal cual)
 *   - Formatos no reconocibles (se devuelve el valor original)
 *
 * Usa date-fns para parseo y formateo robusto.
 *
 * Ejemplos:
 *   normalizeDate("15/03/2024") → "2024-03-15"
 *   normalizeDate("2024-03-15") → "2024-03-15"
 *   normalizeDate("")           → ""
 */
export function normalizeDate(value: string): string {
  if (!value) return "";

  // Intentar DD/MM/YYYY
  try {
    const parsed = parse(value.trim(), "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  } catch {
    // Continuar con el siguiente formato
  }

  // Intentar YYYY-MM-DD (ya normalizado)
  try {
    const parsed = parse(value.trim(), "yyyy-MM-dd", new Date());
    if (isValid(parsed)) {
      return value.trim();
    }
  } catch {
    // Continuar
  }

  // Intentar DD/MM/YY (año corto)
  try {
    const parsed = parse(value.trim(), "dd/MM/yy", new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  } catch {
    // No se pudo parsear
  }

  // Si no se reconoce el formato, devolver el valor original
  return value.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATEADORES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formatea el array de material autorizado como texto legible para incluir en notas.
 *
 * Ejemplo de salida:
 * ```
 * MATERIAL AUTORIZADO (IA):
 * • IMPL-TQ-001 — Tornillo canulado titanio 6.5mm x 50mm (x4) $85.000
 * • IMPL-TQ-002 — Placa LCP 7 orificios (x1) $120.000
 * ```
 */
export function formatMaterialAutorizado(items: MaterialAutorizadoItem[]): string {
  if (!items || items.length === 0) return "";

  const lines = items.map((item) => {
    const code = item.codigo || "—";
    const desc = item.descripcion || "Sin descripción";
    const qty = item.cantidad ? `x${item.cantidad}` : "x?";
    const price = item.precio_referencia ? ` $${item.precio_referencia}` : "";
    return `• ${code} — ${desc} (${qty})${price}`;
  });

  return `MATERIAL AUTORIZADO (IA):\n${lines.join("\n")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPEO IA → WIZARD REAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resultado del mapeo desde los datos extraídos por IA al formulario del wizard.
 */
export interface AiMappingResult {
  /** Campos del NewSurgeryForm que deben precargarse */
  formFields: Partial<NewSurgeryForm>;
  /** Advertencias sobre datos que no pudieron mapearse o requieren atención */
  warnings: string[];
  /**
   * Material autorizado extraído como datos estructurados (aditivo).
   * Se mantiene también el texto formateado en `formFields.notes` por
   * retrocompatibilidad con consumidores que leen las notas.
   */
  materials?: MaterialAutorizadoItem[];
}

/**
 * Genera un ID único para referencias administrativas.
 * En el wizard real (Zustand), los IDs de referencias son strings arbitrarios.
 */
function generateRefId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Mapea los datos extraídos por IA desde una autorización de cirugía
 * a la estructura del formulario NewSurgeryForm del wizard real.
 *
 * Reglas de mapeo:
 *   paciente           → NewSurgeryForm.patient (texto sugerido)
 *   medico             → NewSurgeryForm.surgeon (texto sugerido)
 *   institucion        → NewSurgeryForm.institution (texto sugerido)
 *   fecha_cirugia      → NewSurgeryForm.date (normalizada YYYY-MM-DD)
 *   fecha_probable     → NewSurgeryForm.probableDate (normalizada YYYY-MM-DD)
 *   obra_social        → NewSurgeryForm.client (texto sugerido) + Ref administrativa
 *   dni                → referenciasAdministrativas[] tipo "DNI"
 *   numero_autorizacion → referenciasAdministrativas[] tipo "Autorización"
 *   numero_siniestro   → referenciasAdministrativas[] tipo "Siniestro"
 *   numero_poliza      → referenciasAdministrativas[] tipo "Ref" obs "Póliza"
 *   fecha_autorizacion → referenciasAdministrativas[] tipo "Ref" obs "Fecha autorización"
 *   material_autorizado → NewSurgeryForm.notes (texto formateado)
 *   observaciones      → NewSurgeryForm.notes (concatenado con material)
 *
 * La función no decide si sobrescribir campos ya completados — esa lógica
 * corresponde al componente que invoca este mapeo (el wizard).
 *
 * @param extracted - Datos extraídos por la IA desde el documento
 * @returns Objeto con formFields (Partial<NewSurgeryForm>) y warnings (string[])
 */
export function mapAiToWizardForm(
  extracted: AutorizacionExtracted
): AiMappingResult {
  const warnings: string[] = [];
  const refs: ReferenciaAdministrativa[] = [];

  // ── Campos de texto directo ──

  const formFields: Partial<NewSurgeryForm> = {};

  if (extracted.paciente) {
    formFields.patient = extracted.paciente.trim();
  }

  if (extracted.medico) {
    formFields.surgeon = extracted.medico.trim();
  }

  if (extracted.institucion) {
    formFields.institution = extracted.institucion.trim();
  }

  // ── Obra social → client (texto sugerido) + Ref administrativa ──

  if (extracted.obra_social) {
    formFields.client = extracted.obra_social.trim();
    refs.push({
      id: generateRefId(),
      tipo: "Ref" as TipoReferencia,
      valor: extracted.obra_social.trim(),
      observacion: "Obra Social",
    });
  }

  // ── Fechas ──

  if (extracted.fecha_cirugia) {
    const normalized = normalizeDate(extracted.fecha_cirugia);
    if (normalized) {
      formFields.date = normalized;
    } else {
      warnings.push(`No se pudo normalizar fecha de cirugía: "${extracted.fecha_cirugia}"`);
      formFields.date = extracted.fecha_cirugia;
    }
  }

  if (extracted.fecha_probable) {
    const normalized = normalizeDate(extracted.fecha_probable);
    if (normalized) {
      formFields.probableDate = normalized;
    } else {
      warnings.push(`No se pudo normalizar fecha probable: "${extracted.fecha_probable}"`);
      formFields.probableDate = extracted.fecha_probable;
    }
  }

  if (extracted.fecha_autorizacion) {
    const normalized = normalizeDate(extracted.fecha_autorizacion);
    if (normalized) {
      refs.push({
        id: generateRefId(),
        tipo: "Ref" as TipoReferencia,
        valor: normalized,
        observacion: "Fecha autorización",
      });
    } else {
      warnings.push(`No se pudo normalizar fecha de autorización: "${extracted.fecha_autorizacion}"`);
      refs.push({
        id: generateRefId(),
        tipo: "Ref" as TipoReferencia,
        valor: extracted.fecha_autorizacion.trim(),
        observacion: "Fecha autorización",
      });
    }
  }

  // ── DNI → referenciasAdministrativas tipo "DNI" ──

  if (extracted.dni) {
    const normalizedDni = normalizeDni(extracted.dni);
    if (normalizedDni) {
      refs.push({
        id: generateRefId(),
        tipo: "DNI",
        valor: normalizedDni,
      });
    } else {
      warnings.push(`DNI extraído no contiene dígitos: "${extracted.dni}"`);
    }
  }

  // ── Nº Autorización ──

  if (extracted.numero_autorizacion) {
    refs.push({
      id: generateRefId(),
      tipo: "Autorización",
      valor: extracted.numero_autorizacion.trim(),
    });
  }

  // ── Nº Siniestro ──

  if (extracted.numero_siniestro) {
    refs.push({
      id: generateRefId(),
      tipo: "Siniestro",
      valor: extracted.numero_siniestro.trim(),
    });
  }

  // ── Nº Póliza → Ref con observación ──

  if (extracted.numero_poliza) {
    refs.push({
      id: generateRefId(),
      tipo: "Ref" as TipoReferencia,
      valor: extracted.numero_poliza.trim(),
      observacion: "Póliza",
    });
  }

  // ── Asignar referencias administrativas al form ──

  if (refs.length > 0) {
    formFields.referenciasAdministrativas = refs;
  }

  // ── Observaciones + Material autorizado → notes ──

  const materialText = formatMaterialAutorizado(extracted.material_autorizado);
  const obsText = extracted.observaciones?.trim() || "";

  if (materialText && obsText) {
    formFields.notes = `${obsText}\n\n${materialText}`;
  } else if (materialText) {
    formFields.notes = materialText;
  } else if (obsText) {
    formFields.notes = obsText;
  }

  // ── Advertencias generales ──

  const camposExtraidos = [
    extracted.paciente, extracted.dni, extracted.medico, extracted.institucion,
    extracted.obra_social, extracted.numero_autorizacion, extracted.numero_siniestro,
    extracted.numero_poliza, extracted.fecha_autorizacion, extracted.fecha_cirugia,
    extracted.fecha_probable, extracted.patologia_sugerida,
  ].filter(Boolean);

  if (camposExtraidos.length === 0) {
    warnings.push("La IA no extrajo ningún campo del documento. Verifique que sea una autorización de cirugía.");
  }

  if (extracted.material_autorizado.length === 0) {
    warnings.push("No se detectó material autorizado en el documento. Verifique manualmente.");
  }

  return { formFields, warnings, materials: extracted.material_autorizado };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea una respuesta de extracción vacía (para manejo de errores).
 * Útil cuando el provider falla y se necesita devolver una respuesta controlada.
 */
export function emptyAutorizacionResponse(
  provider: AutorizacionAIResponse["provider"] = "fallback-regex",
  warnings: string[] = []
): AutorizacionAIResponse {
  return {
    provider,
    confidence: 0,
    looks_like_authorization: false,
    warnings,
    extracted: {
      paciente: "",
      dni: "",
      medico: "",
      institucion: "",
      obra_social: "",
      patologia_sugerida: "",
      numero_autorizacion: "",
      numero_siniestro: "",
      numero_poliza: "",
      fecha_autorizacion: "",
      fecha_cirugia: "",
      fecha_probable: "",
      provincia_sugerida: "",
      localidad_sugerida: "",
      material_autorizado: [],
      observaciones: "",
    },
    raw_text_preview: "",
  };
}
