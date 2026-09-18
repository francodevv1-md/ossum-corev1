/**
 * compras-matching.ts
 * Matching de items OCR contra el catálogo de StockItem.
 * Reusa las funciones de normalización y similitud de comparativa.utils.ts.
 *
 * Cascada de matching:
 *   1. Código exacto (normalizado) — filtrado por proveedor si hay uno seleccionado
 *   2. Código exacto sin filtro de proveedor
 *   3. Descripción similar (Jaccard ≥ threshold) — filtrado por proveedor
 *   4. Descripción similar sin filtro de proveedor
 *   5. Sugerencias top-3 por similitud si no hay match confidente
 */

import type { StockItem } from "@/types";
import { normalizarDescripcion, similitudDescripcion } from "@/lib/comparativa.utils";

export type MatchMethod = "codigo" | "descripcion" | "none";

export interface ItemMatchResult {
  /** Mejor match encontrado, o null si no hay. */
  match: StockItem | null;
  /** Método usado para el match. */
  method: MatchMethod;
  /** 0..1 — confianza del match (1 = código exacto, similitud para descripción). */
  confidence: number;
  /** Top 3 sugerencias cuando no hay match confidente. */
  suggestions: StockItem[];
}

const SIMILARITY_THRESHOLD = 0.6;
const SUGGESTION_THRESHOLD = 0.3;
const MAX_SUGGESTIONS = 3;

/** Normaliza un código: uppercase, sin espacios ni guiones. */
function normalizeCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[\s\-_]/g, "")
    .trim();
}

/** Filtra stockItems por proveedor (match text contra supplier, case-insensitive). */
function filterByProveedor(
  stockItems: StockItem[],
  proveedorName: string | undefined
): StockItem[] | null {
  if (!proveedorName) return null;
  const normalized = normalizarDescripcion(proveedorName);
  if (!normalized) return null;
  const filtered = stockItems.filter(
    (s) => normalizarDescripcion(s.supplier) === normalized
  );
  return filtered.length > 0 ? filtered : null;
}

export interface OcrItemInput {
  code: string;
  descripcion: string;
}

/**
 * Matchea un item del OCR contra el catálogo de stock.
 *
 * @param item Item OCR con code y descripcion
 * @param stockItems Catálogo completo de stock
 * @param proveedorName Nombre del proveedor seleccionado (para narrowing)
 */
export function matchOcrItemToStock(
  item: OcrItemInput,
  stockItems: StockItem[],
  proveedorName?: string
): ItemMatchResult {
  const code = normalizeCode(item.code);
  const desc = normalizarDescripcion(item.descripcion);
  const byProveedor = filterByProveedor(stockItems, proveedorName);

  // 1. Código exacto dentro del proveedor
  if (code && byProveedor) {
    const found = byProveedor.find((s) => normalizeCode(s.code) === code);
    if (found) {
      return { match: found, method: "codigo", confidence: 1, suggestions: [] };
    }
  }

  // 2. Código exacto en todo el catálogo
  if (code) {
    const found = stockItems.find((s) => normalizeCode(s.code) === code);
    if (found) {
      return { match: found, method: "codigo", confidence: 0.9, suggestions: [] };
    }
  }

  // 3. Descripción similar dentro del proveedor
  if (desc && byProveedor) {
    let best: StockItem | null = null;
    let bestSim = 0;
    for (const s of byProveedor) {
      const sim = similitudDescripcion(s.name, item.descripcion);
      if (sim > bestSim) {
        bestSim = sim;
        best = s;
      }
    }
    if (best && bestSim >= SIMILARITY_THRESHOLD) {
      return {
        match: best,
        method: "descripcion",
        confidence: bestSim,
        suggestions: [],
      };
    }
  }

  // 4. Descripción similar en todo el catálogo
  if (desc) {
    const scored = stockItems
      .map((s) => ({ item: s, sim: similitudDescripcion(s.name, item.descripcion) }))
      .filter((x) => x.sim >= SUGGESTION_THRESHOLD)
      .sort((a, b) => b.sim - a.sim);

    const topMatch = scored.find((x) => x.sim >= SIMILARITY_THRESHOLD);
    if (topMatch) {
      return {
        match: topMatch.item,
        method: "descripcion",
        confidence: topMatch.sim,
        suggestions: scored
          .filter((x) => x.item.id !== topMatch.item.id)
          .slice(0, MAX_SUGGESTIONS)
          .map((x) => x.item),
      };
    }

    // 5. No hay match confidente — devolver sugerencias
    if (scored.length > 0) {
      return {
        match: null,
        method: "none",
        confidence: 0,
        suggestions: scored.slice(0, MAX_SUGGESTIONS).map((x) => x.item),
      };
    }
  }

  return { match: null, method: "none", confidence: 0, suggestions: [] };
}

/**
 * Matchea un lote completo de items OCR.
 * Devuelve un array paralelo con el resultado de cada item.
 */
export function matchOcrItems(
  items: OcrItemInput[],
  stockItems: StockItem[],
  proveedorName?: string
): ItemMatchResult[] {
  return items.map((item) => matchOcrItemToStock(item, stockItems, proveedorName));
}
