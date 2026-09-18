/**
 * CHATZAI-017L: Catálogo de stock para lookup desde la grilla del presupuesto.
 *
 * Provee funciones de búsqueda por código y por nombre contra el stock
 * disponible (mockStock). Este módulo es la fuente de lookup para:
 *   - Código → autocompletar artículo
 *   - Artículo → buscar stock / catálogo
 *   - Determinar artículo catalogado vs artículo libre (Z)
 *
 * Reglas:
 *   - Si un ítem tiene `catalogItemId` vinculado → artículo catalogado
 *   - Si un ítem NO tiene vínculo → artículo libre / Z automáticamente
 *   - No se inventan artículos si el código/nombre no matchea
 */
import { mockStock } from "@/data/mock-stock"
import type { StockItem } from "@/types"

/** Resultado de búsqueda en catálogo, con datos necesarios para autocompletar */
export interface CatalogMatch {
  id: string          // StockItem.id — para vincular como catalogItemId
  code: string        // StockItem.code
  name: string        // StockItem.name
  unitPrice: number   // StockItem.unitPrice — precio sugerido
  category: string    // StockItem.category
  section: string     // StockItem.section
  /** CHATZAI-025: Alícuota de IVA del artículo. Key de IVA_OPTIONS. */
  ivaKey: string
}

/** Convierte un StockItem a CatalogMatch (datos mínimos para la grilla) */
function stockToMatch(item: StockItem): CatalogMatch {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    unitPrice: item.unitPrice,
    category: item.category,
    section: item.section,
    ivaKey: item.ivaKey || "21", // CHATZAI-025: default 21% if not specified
  }
}

/**
 * Busca un artículo en el catálogo por código exacto.
 * Retorna el match o undefined si no existe.
 */
export function getCatalogByCode(code: string): CatalogMatch | undefined {
  if (!code.trim()) return undefined
  const item = mockStock.find(
    (s) => s.code.toLowerCase() === code.trim().toLowerCase()
  )
  return item ? stockToMatch(item) : undefined
}

/**
 * Busca artículos en el catálogo por nombre (búsqueda parcial, case-insensitive).
 * Retorna hasta `limit` resultados ordenados por relevancia (match exacto primero,
 * luego startsWith, luego contains).
 */
export function searchCatalogByName(query: string, limit = 10): CatalogMatch[] {
  if (!query.trim()) return []

  const q = query.trim().toLowerCase()

  const exact: CatalogMatch[] = []
  const startsWith: CatalogMatch[] = []
  const contains: CatalogMatch[] = []

  for (const item of mockStock) {
    const nameLower = item.name.toLowerCase()
    if (nameLower === q) {
      exact.push(stockToMatch(item))
    } else if (nameLower.startsWith(q)) {
      startsWith.push(stockToMatch(item))
    } else if (nameLower.includes(q)) {
      contains.push(stockToMatch(item))
    }
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit)
}

/**
 * Busca un artículo en el catálogo por su ID (StockItem.id).
 * Retorna el match o undefined si no existe.
 */
export function getCatalogById(id: string): CatalogMatch | undefined {
  if (!id.trim()) return undefined
  const item = mockStock.find((s) => s.id === id)
  return item ? stockToMatch(item) : undefined
}

/**
 * CHATZAI-017O: Busca artículos por código (prefijo) O nombre (contiene),
 * simultáneamente. Resultados deduplicados, hasta `limit`.
 *
 * Orden: match exacto código → prefijo código → nombre exacto → nombre comienza → nombre contiene
 */
export function searchCatalogByQuery(query: string, limit = 20): CatalogMatch[] {
  if (!query.trim()) return []

  const q = query.trim().toLowerCase()

  const codeExact: CatalogMatch[] = []
  const codePrefix: CatalogMatch[] = []
  const nameExact: CatalogMatch[] = []
  const nameStartsWith: CatalogMatch[] = []
  const nameContains: CatalogMatch[] = []

  const seen = new Set<string>()

  for (const item of mockStock) {
    const codeLower = item.code.toLowerCase()
    const nameLower = item.name.toLowerCase()

    // Skip duplicates
    if (seen.has(item.id)) continue

    if (codeLower === q) {
      seen.add(item.id)
      codeExact.push(stockToMatch(item))
    } else if (codeLower.startsWith(q)) {
      seen.add(item.id)
      codePrefix.push(stockToMatch(item))
    } else if (nameLower === q) {
      if (!seen.has(item.id)) { seen.add(item.id); nameExact.push(stockToMatch(item)) }
    } else if (nameLower.startsWith(q)) {
      if (!seen.has(item.id)) { seen.add(item.id); nameStartsWith.push(stockToMatch(item)) }
    } else if (nameLower.includes(q)) {
      if (!seen.has(item.id)) { seen.add(item.id); nameContains.push(stockToMatch(item)) }
    }
  }

  return [...codeExact, ...codePrefix, ...nameExact, ...nameStartsWith, ...nameContains].slice(0, limit)
}

/**
 * Determina si un ítem de la grilla es artículo libre/Z.
 * Un ítem es libre si NO está vinculado a un artículo del catálogo.
 *
 * @param catalogItemId - ID del artículo en catálogo, o vacío/null si no está vinculado
 * @returns true si es artículo libre (no catalogado)
 */
export function isArticuloLibre(catalogItemId?: string | null): boolean {
  return !catalogItemId || catalogItemId.trim() === ""
}
