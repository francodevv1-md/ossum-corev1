/**
 * compras-document-ai.ts
 * OSSUM COR — Schemas Zod para el contrato de extracción IA desde documentos
 * de compras (remitos de proveedor y facturas de compra).
 *
 * Estructura espejo de autorizacion-ai.ts:
 *  - Item schemas (campos string para preservar formato original)
 *  - Extracted schemas (datos del documento)
 *  - Response schemas (metadatos del provider + extracted + raw_text_preview)
 *  - Tipos derivados
 *  - Normalizadores (fecha, CUIT, números)
 *  - Mapper IA → tipos del store (RemitoProveedor / FacturaCompra)
 */

import { z } from "zod";
import { parse, format, isValid } from "date-fns";
import type { RemitoProveedor, FacturaCompra, RemitoProveedorItem } from "@/types";

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/** Línea de mercadería extraída de un remito de proveedor. */
export const RemitoProveedorItemSchema = z.object({
  codigo: z.string().default(""),
  descripcion: z.string().default(""),
  /** String (no number) para permitir valores como "2-3", "4 cajas", etc. */
  cantidad: z.string().default(""),
  /** Lote / serie reportado por el proveedor. */
  lote: z.string().default(""),
  /** Vencimiento reportado (formato esperado YYYY-MM-DD). */
  vencimiento: z.string().default(""),
});

/** Línea de mercadería extraída de una factura de compra. */
export const FacturaCompraItemSchema = z.object({
  codigo: z.string().default(""),
  descripcion: z.string().default(""),
  cantidad: z.string().default(""),
  /** String para mantener formato original (ej: "$95.000"). */
  precio_unitario: z.string().default(""),
  subtotal: z.string().default(""),
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTED SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const RemitoProveedorExtractedSchema = z.object({
  proveedor_name: z.string().default(""),
  cuit_proveedor: z.string().default(""),
  numero_remito: z.string().default(""),
  fecha_remito: z.string().default(""),
  orden_compra_ref: z.string().default(""),
  items: z.array(RemitoProveedorItemSchema).default([]),
  observaciones: z.string().default(""),
});

export const FacturaCompraExtractedSchema = z.object({
  proveedor_name: z.string().default(""),
  cuit_proveedor: z.string().default(""),
  tipo_factura: z.string().default(""),
  numero_factura: z.string().default(""),
  fecha_factura: z.string().default(""),
  orden_compra_ref: z.string().default(""),
  items: z.array(FacturaCompraItemSchema).default([]),
  total: z.string().default(""),
  observaciones: z.string().default(""),
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const RemitoProveedorAIResponseSchema = z.object({
  provider: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0),
  looks_like_remito_proveedor: z.boolean().default(false),
  warnings: z.array(z.string()).default([]),
  extracted: RemitoProveedorExtractedSchema,
  raw_text_preview: z.string().default(""),
});

export const FacturaCompraAIResponseSchema = z.object({
  provider: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0),
  looks_like_factura_compra: z.boolean().default(false),
  warnings: z.array(z.string()).default([]),
  extracted: FacturaCompraExtractedSchema,
  raw_text_preview: z.string().default(""),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DERIVADOS
// ═══════════════════════════════════════════════════════════════════════════════

export type RemitoProveedorItemAI = z.infer<typeof RemitoProveedorItemSchema>;
export type FacturaCompraItemAI = z.infer<typeof FacturaCompraItemSchema>;
export type RemitoProveedorExtracted = z.infer<typeof RemitoProveedorExtractedSchema>;
export type FacturaCompraExtracted = z.infer<typeof FacturaCompraExtractedSchema>;
export type RemitoProveedorAIResponse = z.infer<typeof RemitoProveedorAIResponseSchema>;
export type FacturaCompraAIResponse = z.infer<typeof FacturaCompraAIResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZADORES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normaliza una fecha a formato ISO YYYY-MM-DD.
 * Soporta DD/MM/YYYY, YYYY-MM-DD, DD/MM/YY.
 */
export function normalizeDate(value: string): string {
  if (!value) return "";

  for (const fmt of ["dd/MM/yyyy", "yyyy-MM-dd", "dd/MM/yy"]) {
    try {
      const parsed = parse(value.trim(), fmt, new Date());
      if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
    } catch {
      // probar siguiente formato
    }
  }

  return "";
}

/**
 * Normaliza un CUIT argentino: elimina todo lo que no sea dígito.
 * Ej: "30-71234567-3" → "30712345673"
 */
export function normalizeCuit(raw: string): string {
  if (!raw) return "";
  return raw.replace(/[^\d]/g, "");
}

/**
 * Parsea un string numérico argentino a number.
 * Soporta formatos: "1.234,56", "1234.56", "1234,56", "$95.000".
 * Devuelve 0 si no se puede parsear.
 */
export function parseArgNumber(raw: string): number {
  if (!raw) return 0;
  // Eliminar símbolos de moneda y espacios.
  let s = raw.replace(/[$\s]/g, "");
  if (!s) return 0;
  // Detectar formato argentino: usa punto como separador de miles y coma decimal.
  // Si hay coma y punto: "1.234,56" → asumir formato AR (quitar puntos, coma→punto).
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && !s.includes(".")) {
    // Solo coma: "1234,56" → coma decimal.
    s = s.replace(",", ".");
  } else if (s.includes(".") && !s.includes(",")) {
    // Solo punto: ambiguo. "95.000" → AR miles (95000) vs US decimal (95.000).
    // Heurística: si el punto está seguido de exactamente 3 dígitos y no hay
    // más puntos, asumir separador de miles argentino.
    const match = s.match(/^(\d+)\.(\d{3})$/);
    if (match) {
      s = match[1] + match[2];
    }
  }
  const num = Number.parseFloat(s);
  return Number.isFinite(num) ? num : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPEO IA → STORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Datos listos para createRemitoProveedor del store, SIN id (lo genera el store).
 * proveedorId queda vacío si no se resuelve contra el catálogo; la UI lo resuelve.
 */
export interface RemitoProveedorMappingResult {
  payload: Omit<RemitoProveedor, "id">;
  warnings: string[];
}

/**
 * Mapea los datos extraídos por IA desde un remito de proveedor
 * a la estructura esperada por createRemitoProveedor del store.
 */
export function mapAiToRemitoProveedor(
  extracted: RemitoProveedorExtracted,
  options?: { proveedorId?: string; ordenCompraId?: string }
): RemitoProveedorMappingResult {
  const warnings: string[] = [];

  const items: RemitoProveedorItem[] = extracted.items.map((it) => {
    const qty = parseArgNumber(it.cantidad);
    return {
      name: it.descripcion.trim(),
      code: it.codigo.trim(),
      quantity: qty,
      received: qty,
      lot: it.lote.trim() || undefined,
      expiry: normalizeDate(it.vencimiento) || undefined,
    };
  });

  if (extracted.items.length > 0 && items.every((i) => i.quantity === 0)) {
    warnings.push("Las cantidades de los items no se pudieron parsear. Revisalas manualmente.");
  }

  const payload: Omit<RemitoProveedor, "id"> = {
    proveedorId: options?.proveedorId ?? "",
    proveedorName: extracted.proveedor_name.trim(),
    number: extracted.numero_remito.trim(),
    date: normalizeDate(extracted.fecha_remito),
    items,
    state: "Pendiente",
    ordenCompraId: options?.ordenCompraId ?? (extracted.orden_compra_ref.trim() || undefined),
    observaciones: extracted.observaciones.trim() || undefined,
  };

  if (!payload.proveedorName) warnings.push("No se detectó el nombre del proveedor.");
  if (!payload.number) warnings.push("No se detectó el número de remito.");
  if (!payload.date) warnings.push("No se detectó la fecha del remito.");
  if (items.length === 0) warnings.push("No se detectaron items en el remito.");

  return { payload, warnings };
}

/** Resultado del mapeo de factura de compra. */
export interface FacturaCompraMappingResult {
  payload: Omit<FacturaCompra, "id">;
  warnings: string[];
}

/**
 * Mapea los datos extraídos por IA desde una factura de compra
 * a la estructura esperada por createFacturaCompra del store.
 */
export function mapAiToFacturaCompra(
  extracted: FacturaCompraExtracted,
  options?: { proveedorId?: string; ordenCompraId?: string }
): FacturaCompraMappingResult {
  const warnings: string[] = [];

  const items = extracted.items.map((it) => {
    const qty = parseArgNumber(it.cantidad);
    const unitPrice = parseArgNumber(it.precio_unitario);
    const subtotal = parseArgNumber(it.subtotal);
    return {
      name: it.descripcion.trim(),
      code: it.codigo.trim(),
      quantity: qty,
      unitPrice,
      subtotal,
    };
  });

  // Recalcular total desde items si no se extrajo explícitamente.
  const totalFromItems = items.reduce((sum, it) => sum + it.subtotal, 0);
  const totalExplicit = parseArgNumber(extracted.total);
  const total = totalExplicit > 0 ? totalExplicit : totalFromItems;

  if (extracted.items.length > 0 && items.every((i) => i.quantity === 0)) {
    warnings.push("Las cantidades de los items no se pudieron parsear. Revisalas manualmente.");
  }
  if (totalExplicit > 0 && totalFromItems > 0 && Math.abs(totalExplicit - totalFromItems) > 0.01) {
    warnings.push("El total extraído no coincide con la suma de subtotales. Revisá los importes.");
  }

  const payload: Omit<FacturaCompra, "id"> = {
    proveedorId: options?.proveedorId ?? "",
    proveedorName: extracted.proveedor_name.trim(),
    number: extracted.numero_factura.trim(),
    date: normalizeDate(extracted.fecha_factura),
    items,
    total,
    state: "Pendiente",
    ordenCompraId: options?.ordenCompraId ?? (extracted.orden_compra_ref.trim() || undefined),
  };

  if (!payload.proveedorName) warnings.push("No se detectó el nombre del proveedor.");
  if (!payload.number) warnings.push("No se detectó el número de factura.");
  if (!payload.date) warnings.push("No se detectó la fecha de la factura.");
  if (items.length === 0) warnings.push("No se detectaron items en la factura.");

  return { payload, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPUESTAS VACÍAS (manejo de errores controlado)
// ═══════════════════════════════════════════════════════════════════════════════

export function emptyRemitoProveedorResponse(
  provider: string = "fallback",
  warnings: string[] = []
): RemitoProveedorAIResponse {
  return {
    provider,
    confidence: 0,
    looks_like_remito_proveedor: false,
    warnings,
    extracted: {
      proveedor_name: "",
      cuit_proveedor: "",
      numero_remito: "",
      fecha_remito: "",
      orden_compra_ref: "",
      items: [],
      observaciones: "",
    },
    raw_text_preview: "",
  };
}

export function emptyFacturaCompraResponse(
  provider: string = "fallback",
  warnings: string[] = []
): FacturaCompraAIResponse {
  return {
    provider,
    confidence: 0,
    looks_like_factura_compra: false,
    warnings,
    extracted: {
      proveedor_name: "",
      cuit_proveedor: "",
      tipo_factura: "",
      numero_factura: "",
      fecha_factura: "",
      orden_compra_ref: "",
      items: [],
      total: "",
      observaciones: "",
    },
    raw_text_preview: "",
  };
}
