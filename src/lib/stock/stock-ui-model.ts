import {
  Activity,
  Bone,
  Droplets,
  Layers,
  Package,
  Scissors,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { CX_STATE_CELL_COLORS } from "@/lib/cirugias.constants"

// ─── Types (UI-only model) ────────────────────────────────

export type StockControl = "cantidad" | "lote" | "serie" | "lote-vencimiento" | "serie-vencimiento"
export type MasterStatus = "Activo" | "Inactivo" | "Discontinuado"

/** Estado operativo del artículo — subconjunto de estados de Cirugía. */
export type StockOperationalState = "Disponible" | "Reservado" | "En tránsito" | "Pendiente"
export type Family = "Cadera" | "Rodilla" | "Trauma" | "Columna" | "Instrumental" | "Descartable" | "Insumos"
export type LotStatus = "Disponible" | "Reservado" | "Vencido"

/** Clasificación maestra del artículo: gobierna qué apartados muestra la ficha. */
export type StockArticleType = "Implante" | "Instrumental" | "Equipo" | "Descartable" | "Insumo" | "Otro"

export interface SupplierInfo {
  supplier: string
  code: string
  description: string
}

export interface StockLot {
  id: string
  deposit: string
  location: string
  lot: string
  serial: string
  expiry: string
  available: number
  status: LotStatus
}

export interface StockMovement {
  id: string
  date: string
  type: string
  qty: number
  user: string
  ref: string
}

export interface StockItem {
  id: string
  code: string
  name: string
  descriptionExtra: string
  family: Family
  category: string
  rubro: string
  seccion: string
  linea: string
  brand: string
  type: string
  unit: string
  unitBuy: string
  manufacturer: string
  gtin: string
  pm: string
  sterile: boolean
  preferredSupplier: string
  cost: number
  price: number
  available: number
  reserved: number
  inTransit: number
  min: number
  state: StockOperationalState
  masterStatus: MasterStatus
  control: StockControl
  lots: StockLot[]
  movements: StockMovement[]

  // ── Ficha: clasificación ──
  articleType: StockArticleType
  shortDesc?: string

  // ── Identificación ──
  ean?: string
  manufacturerCode?: string
  importCode?: string
  altCodes?: string[]

  // ── Inventario (configuración) ──
  conversion?: string
  targetStock?: number
  reorderPoint?: number
  defaultDeposit?: string
  defaultLocation?: string
  weight?: string
  dimensions?: string

  // ── Compras ──
  supplierCode?: string
  lastSupplier?: string
  lastCost?: number
  lastPurchaseDate?: string
  leadTime?: string
  suppliers?: SupplierInfo[]

  // ── Comercial ──
  iva?: string
  ivaKey?: string
  vatTreatment?: "GRAVADO" | "EXENTO" | "NO_GRAVADO"
  vatRate?: number
  articleId?: string | null
  priceList?: string
  marginTarget?: number

  // ── Tipo específico ──
  maintenance?: string     // Instrumental / Equipo
  usefulLife?: string      // Equipo
  fixedAsset?: string      // Equipo (activo fijo)

  // ── Auditoría ──
  createdAt?: string
  createdBy?: string
}

// ─── Family thumbnails (representative image per family) ──

export const FAMILY_STYLE: Record<Family, { icon: LucideIcon; thumb: string; label: string }> = {
  Cadera: { icon: Bone, thumb: "bg-blue-50 text-blue-600 ring-blue-200", label: "Cadera" },
  Rodilla: { icon: Bone, thumb: "bg-violet-50 text-violet-600 ring-violet-200", label: "Rodilla" },
  Trauma: { icon: Activity, thumb: "bg-orange-50 text-orange-600 ring-orange-200", label: "Trauma" },
  Columna: { icon: Layers, thumb: "bg-teal-50 text-teal-600 ring-teal-200", label: "Columna" },
  Instrumental: { icon: Scissors, thumb: "bg-slate-100 text-slate-600 ring-slate-200", label: "Instrumental" },
  Descartable: { icon: Package, thumb: "bg-amber-50 text-amber-600 ring-amber-200", label: "Descartable" },
  Insumos: { icon: Droplets, thumb: "bg-rose-50 text-rose-600 ring-rose-200", label: "Insumos" },
}

// ─── Article type metadata ────────────────────────────────

export const ARTICLE_TYPES: StockArticleType[] = ["Implante", "Instrumental", "Descartable", "Insumo", "Equipo", "Otro"]

export const ARTICLE_TYPE_LABEL: Record<StockArticleType, string> = {
  Implante: "Implante",
  Instrumental: "Instrumental",
  Equipo: "Equipo",
  Descartable: "Descartable",
  Insumo: "Insumo",
  Otro: "Otro",
}

/** Sugerencia de trazabilidad derivada del tipo de artículo (no del control elegido). */
export const TRACE_SUGGESTION: Record<StockArticleType, string> = {
  Implante: "Sugerido: lote + serie + vencimiento. Estéril, PM/ANMAT obligatorio.",
  Instrumental: "Sugerido: serie (caja asociada) + mantenimiento.",
  Equipo: "Sugerido: serie + mantenimiento + vida útil.",
  Descartable: "Sugerido: lote + vencimiento. Reposición por punto de pedido.",
  Insumo: "Sugerido: lote + vencimiento. Reposición por punto de pedido.",
  Otro: "Sin trazabilidad específica sugerida.",
}

// ─── Operational states — linked to Cirugía states ────────

/** Colores del estado operativo, reusando los de Cirugía donde el estado coincide. */
export const STOCK_STATE_CELL_COLORS: Record<StockOperationalState, string> = {
  "Pendiente": CX_STATE_CELL_COLORS["Pendiente"],     // bg-yellow-100 text-yellow-800
  "En tránsito": CX_STATE_CELL_COLORS["En tránsito"],  // bg-blue-100 text-blue-800
  "Reservado": "bg-amber-100 text-amber-800",
  "Disponible": "bg-emerald-100 text-emerald-800",
}

export const STOCK_STATE_ORDER: Record<StockOperationalState, number> = {
  "Disponible": 0,
  "Reservado": 1,
  "En tránsito": 2,
  "Pendiente": 3,
}

export const STOCK_STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos los estados" },
  { value: "Disponible", label: "Disponible" },
  { value: "Reservado", label: "Reservado" },
  { value: "En tránsito", label: "En tránsito" },
  { value: "Pendiente", label: "Pendiente" },
]

export const CONTROL_LABEL: Record<StockControl, string> = {
  cantidad: "Solo cantidad",
  lote: "Lote",
  serie: "Serie",
  "lote-vencimiento": "Lote + vencimiento",
  "serie-vencimiento": "Serie + vencimiento",
}

export const STOCK_CONTROL_OPTIONS: Array<{ value: StockControl; label: string; hint: string }> = [
  { value: "cantidad", label: "Solo cantidad", hint: "Un total por artículo" },
  { value: "lote", label: "Lote", hint: "Segmenta stock por lote" },
  { value: "lote-vencimiento", label: "Lote + vencimiento", hint: "Lote con alerta por fecha" },
  { value: "serie", label: "Serie", hint: "Unidad individual trazable" },
  { value: "serie-vencimiento", label: "Serie + vencimiento", hint: "Serie con alerta por fecha" },
]

// ─── Derived helpers ──────────────────────────────────────

/** Trazabilidad requerida derivada del modo de control. */
export function controlFlags(control: StockControl): { lot: boolean; serial: boolean; expiry: boolean } {
  switch (control) {
    case "cantidad": return { lot: false, serial: false, expiry: false }
    case "lote": return { lot: true, serial: false, expiry: false }
    case "serie": return { lot: false, serial: true, expiry: false }
    case "lote-vencimiento": return { lot: true, serial: false, expiry: true }
    case "serie-vencimiento": return { lot: false, serial: true, expiry: true }
  }
}

// ─── Nuevo modelo de control (UI): método + vencimiento ───

export type TraceMethod = "cantidad" | "lote" | "serie" | "lote-serie"

export interface TraceControl {
  method: TraceMethod
  expiry: boolean
}

/** Método de trazabilidad (opciones visibles de la UI). */
export const TRACE_METHODS: Array<{ id: TraceMethod; label: string; hint: string }> = [
  { id: "cantidad", label: "Cantidad", hint: "Controla únicamente unidades." },
  { id: "lote", label: "Lote", hint: "Varias unidades comparten identificación." },
  { id: "serie", label: "Serie individual", hint: "Cada unidad posee identificación propia." },
  { id: "lote-serie", label: "Lote + serie", hint: "Controla lote, serie y vencimiento cuando corresponde." },
]

/** Mapea el modelo interno (5 combos) al nuevo modelo de UI (método + vencimiento). */
export function traceControlOf(control: StockControl): TraceControl {
  switch (control) {
    case "cantidad": return { method: "cantidad", expiry: false }
    case "lote": return { method: "lote", expiry: false }
    case "serie": return { method: "serie", expiry: false }
    case "lote-vencimiento": return { method: "lote", expiry: true }
    case "serie-vencimiento": return { method: "serie", expiry: true }
    default: return { method: "lote", expiry: false }
  }
}

export function traceFlags(method: TraceMethod, expiry: boolean): { lot: boolean; serial: boolean; expiry: boolean } {
  return { lot: method === "lote" || method === "lote-serie", serial: method === "serie" || method === "lote-serie", expiry }
}

export function traceControlLabel(method: TraceMethod, expiry: boolean): string {
  const base = method === "cantidad" ? "Solo cantidad" : method === "lote" ? "Lote" : method === "serie" ? "Serie individual" : "Lote + serie"
  return expiry ? `${base} + vencimiento` : base
}

/** Último movimiento registrado (historial) — fuente de "último movimiento" y "modificador". */
export function lastMovement(item: StockItem): StockMovement | undefined {
  if (item.movements.length === 0) return undefined
  return [...item.movements].sort((a, b) => b.date.localeCompare(a.date))[0]
}

/** Precio sugerido = costo × (1 + margen objetivo). */
export function suggestedPrice(item: StockItem): number {
  const margin = item.marginTarget ?? 40
  return Math.round((item.cost * (1 + margin / 100)) / 10) * 10
}

/** Bajo stock = disponible > 0 y disponible ≤ mínimo. */
export function isLowStock(item: StockItem): boolean {
  return item.available > 0 && item.available <= item.min
}

// ─── Filter option catalogs ───────────────────────────────

export const DEPOSITS = ["Depósito Central", "Depósito Quirúrgico", "Depósito Logística"]
export const CATEGORIES = ["Implantes", "Descartable", "Instrumental", "Insumos", "Equipos"]
export const BRANDS = ["DePuy Synthes", "Zimmer Biomet", "Arthrex", "Stryker", "Medtronic", "Ethicon", "Ansell", "3M", "B. Braun"]
export const TYPES = ["Tornillo", "Placa", "Prótesis", "Anclaje", "Aguja", "Jaula", "Sutura", "Guante", "Campo", "Fresa", "Pinza", "Drenaje", "Motor"]
export const RUBROS = ["Traumatología", "Artroscopía", "Columna", "Suturas", "Guantes y campos", "Motor y consumibles", "Instrumental quirúrgico", "Drenajes"]
export const SECCIONES = ["Tornillos y placas", "Prótesis", "Prótesis de cadera", "Anclajes", "Agujas", "Cajas intersomáticas", "Suturas absorbibles", "Suturas no absorbibles", "Guantes", "Campos", "Fresas", "Pinzas", "Drenajes de aspiración", "Motores"]
export const LINEAS = ["Cortical 3.5", "LCP", "Cementada", "Titanio", "Kirschner", "Lumbar PEEK", "Vicryl", "Prolene", "Estéril", "Descartable", "Motor 5.0", "Adson", "Redón", "M4"]
export const FAMILIES = Object.keys(FAMILY_STYLE) as Family[]
export const FABRICANTES = ["DePuy Synthes", "Zimmer Biomet", "Arthrex", "Stryker", "Medtronic", "Ethicon", "Ansell", "3M", "B. Braun"]
export const PROVEEDORES = ["Distribuidora Ósea SRL", "Implantar S.A.", "Artro Supply", "Stryker Argentina", "Medtronic", "Johnson & Johnson", "Ansell Argentina", "3M Health", "B. Braun Medical"]

// ─── Helpers ──────────────────────────────────────────────

export function nearestExpiryOf(item: StockItem): string | null {
  const dates = item.lots.map((l) => l.expiry).filter(Boolean)
  if (dates.length === 0) return null
  return [...dates].sort()[0]
}

// ─── Format helpers ───────────────────────────────────────

export function fmtQty(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(value)
}

export function fmtMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value)
}

export function fmtDate(value: string | null | undefined) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(d)
}
