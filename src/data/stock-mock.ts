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

// ─── Types (UI-only; no persistence) ──────────────────────

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
  family: string
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

export function getFamilyStyle(value?: string | null): { icon: LucideIcon; thumb: string; label: string } {
  const label = value?.trim() || "Sin familia"
  const exact = FAMILY_STYLE[label as Family]
  if (exact) return exact
  const base = FAMILY_STYLE[label.split("·", 1)[0].trim() as Family]
  return base ? { ...base, label } : { icon: Package, thumb: "bg-gray-50 text-gray-600 ring-gray-200", label }
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

// ─── Mock data ────────────────────────────────────────────

function lot(
  id: string, deposit: string, location: string, lotCode: string, serial: string,
  expiry: string, available: number, status: LotStatus = "Disponible",
): StockLot {
  return { id, deposit, location, lot: lotCode, serial, expiry, available, status }
}

function mov(id: string, date: string, type: string, qty: number, ref: string, user = "F. Bianchi"): StockMovement {
  return { id, date, type, qty, user, ref }
}

function sup(supplier: string, code: string, description: string): SupplierInfo {
  return { supplier, code, description }
}

export const STOCK_ITEMS: StockItem[] = [
  {
    id: "ART-001", code: "TORN-3.5-COR", name: "Tornillo cortical 3.5 mm x 24 mm", descriptionExtra: "Tornillo cortical, rosca 3.5 mm, autoperforante",
    family: "Trauma", category: "Implantes", rubro: "Traumatología", seccion: "Tornillos y placas", linea: "Cortical 3.5",
    brand: "DePuy Synthes", type: "Tornillo", unit: "u", unitBuy: "caja x10",
    manufacturer: "DePuy Synthes", gtin: "00888867011234", pm: "PM-1182-1", sterile: true, preferredSupplier: "Distribuidora Ósea SRL", cost: 4800, price: 9200,
    available: 42, reserved: 12, inTransit: 20, min: 15, state: "Disponible", masterStatus: "Activo", control: "lote",
    lots: [
      lot("L1", "Depósito Central", "A-03-B2", "L230415", "", "2027-03-15", 28),
      lot("L2", "Depósito Quirúrgico", "Q-01-A1", "L240110", "", "2028-01-10", 14),
    ],
    movements: [
      mov("M1", "2026-08-10", "Ingreso", 40, "OC-2026-118"),
      mov("M2", "2026-08-08", "Egreso", -6, "REM-0031"),
      mov("M3", "2026-08-05", "Traslado", 8, "TRA-0042"),
    ],
    articleType: "Implante", shortDesc: "Tornillo cortical 3.5×24",
    ean: "00888867011234", manufacturerCode: "DPS-3.5-24", altCodes: ["TORN-3.5"],
    conversion: "1 caja = 10 u", targetStock: 40, reorderPoint: 20, defaultDeposit: "Depósito Central", defaultLocation: "A-03-B2",
    supplierCode: "DOS-001", lastSupplier: "Distribuidora Ósea SRL", lastCost: 4800, lastPurchaseDate: "2026-08-10", leadTime: "72 h",
    suppliers: [sup("Distribuidora Ósea SRL", "DOS-001", "Importadora de implantes traumatológicos")],
    iva: "21%", priceList: "Lista 1", marginTarget: 45,
    createdAt: "2025-11-03", createdBy: "F. Bianchi",
  },
  {
    id: "ART-002", code: "PLAC-LCP-8", name: "Placa LCP 3.5 de 8 orificios", descriptionExtra: "Placa de compresión bloqueada, 8 orificios",
    family: "Trauma", category: "Implantes", rubro: "Traumatología", seccion: "Tornillos y placas", linea: "LCP",
    brand: "DePuy Synthes", type: "Placa", unit: "u", unitBuy: "u",
    manufacturer: "DePuy Synthes", gtin: "00888867011258", pm: "PM-1190-1", sterile: true, preferredSupplier: "Distribuidora Ósea SRL", cost: 18500, price: 34200,
    available: 18, reserved: 4, inTransit: 6, min: 8, state: "Disponible", masterStatus: "Activo", control: "lote",
    lots: [lot("L1", "Depósito Central", "A-03-B3", "L230612", "", "2027-06-12", 18)],
    movements: [
      mov("M1", "2026-08-09", "Ingreso", 12, "OC-2026-124"),
      mov("M2", "2026-08-06", "Egreso", -3, "REM-0034"),
    ],
    articleType: "Implante", shortDesc: "Placa LCP 3.5 8 orificios",
    ean: "00888867011258", manufacturerCode: "DPS-LCP8",
    conversion: "1 u = 1 u", targetStock: 20, reorderPoint: 10, defaultDeposit: "Depósito Central", defaultLocation: "A-03-B3",
    supplierCode: "DOS-001", lastSupplier: "Distribuidora Ósea SRL", lastCost: 18500, lastPurchaseDate: "2026-08-09", leadTime: "72 h",
    suppliers: [sup("Distribuidora Ósea SRL", "DOS-001", "Importadora de implantes traumatológicos")],
    iva: "21%", priceList: "Lista 1", marginTarget: 45,
    createdAt: "2025-11-10", createdBy: "F. Bianchi",
  },
  {
    id: "ART-003", code: "PROX-CAD-32", name: "Prótesis de cadera cementada 32 mm", descriptionExtra: "Cabeza 32 mm, vástago cementado",
    family: "Cadera", category: "Implantes", rubro: "Prótesis", seccion: "Prótesis de cadera", linea: "Cementada",
    brand: "Zimmer Biomet", type: "Prótesis", unit: "u", unitBuy: "u",
    manufacturer: "Zimmer Biomet", gtin: "00889024212279", pm: "PM-2201-3", sterile: true, preferredSupplier: "Implantar S.A.", cost: 98000, price: 172000,
    available: 0, reserved: 0, inTransit: 3, min: 2, state: "En tránsito", masterStatus: "Activo", control: "serie",
    lots: [lot("L1", "Depósito Central", "A-05-C1", "S-88412", "SN-88412", "2030-01-01", 0, "Reservado")],
    movements: [
      mov("M1", "2026-07-28", "Egreso", -2, "CX-2245"),
      mov("M2", "2026-07-20", "Ingreso", 2, "OC-2026-098"),
    ],
    articleType: "Implante", shortDesc: "Prótesis cadera cementada 32 mm",
    ean: "00889024212279", manufacturerCode: "ZB-CAD32",
    conversion: "1 u = 1 u", targetStock: 4, reorderPoint: 2, defaultDeposit: "Depósito Central", defaultLocation: "A-05-C1",
    supplierCode: "IMP-002", lastSupplier: "Implantar S.A.", lastCost: 98000, lastPurchaseDate: "2026-07-20", leadTime: "15 días",
    suppliers: [sup("Implantar S.A.", "IMP-002", "Distribuidor oficial Zimmer Biomet")],
    iva: "21%", priceList: "Lista 1", marginTarget: 43,
    createdAt: "2025-09-02", createdBy: "F. Bianchi",
  },
  {
    id: "ART-004", code: "TORN-ANCL-5", name: "Anclaje de titanio 5.0 mm", descriptionExtra: "Anclaje de sutura titanio 5.0 mm",
    family: "Rodilla", category: "Implantes", rubro: "Artroscopía", seccion: "Anclajes", linea: "Titanio",
    brand: "Arthrex", type: "Anclaje", unit: "u", unitBuy: "caja x5",
    manufacturer: "Arthrex", gtin: "00888867004571", pm: "PM-0451-2", sterile: true, preferredSupplier: "Artro Supply", cost: 7200, price: 13800,
    available: 6, reserved: 1, inTransit: 0, min: 10, state: "Reservado", masterStatus: "Activo", control: "serie",
    lots: [lot("L1", "Depósito Quirúrgico", "Q-02-B1", "S-77102", "SN-77102", "2030-01-01", 6)],
    movements: [
      mov("M1", "2026-08-11", "Egreso", -4, "CX-2260"),
      mov("M2", "2026-08-01", "Ingreso", 10, "OC-2026-131"),
    ],
    articleType: "Implante", shortDesc: "Anclaje titanio 5.0 mm",
    ean: "00888867004571", manufacturerCode: "ARX-ANC5",
    conversion: "1 caja = 5 u", targetStock: 15, reorderPoint: 8, defaultDeposit: "Depósito Quirúrgico", defaultLocation: "Q-02-B1",
    supplierCode: "ART-003", lastSupplier: "Artro Supply", lastCost: 7200, lastPurchaseDate: "2026-08-01", leadTime: "96 h",
    suppliers: [sup("Artro Supply", "ART-003", "Proveedor de artroscopía")],
    iva: "21%", priceList: "Lista 1", marginTarget: 48,
    createdAt: "2025-12-18", createdBy: "F. Bianchi",
  },
  {
    id: "ART-005", code: "AGUJ-KIR-1.6", name: "Aguja de Kirschner 1.6 mm x 150 mm", descriptionExtra: "Aguja K 1.6 mm, 150 mm, punta trocar",
    family: "Trauma", category: "Implantes", rubro: "Traumatología", seccion: "Agujas", linea: "Kirschner",
    brand: "Stryker", type: "Aguja", unit: "u", unitBuy: "caja x20",
    manufacturer: "Stryker", gtin: "00888867009987", pm: "PM-3300-4", sterile: true, preferredSupplier: "Stryker Argentina", cost: 900, price: 2100,
    available: 120, reserved: 0, inTransit: 0, min: 50, state: "Disponible", masterStatus: "Activo", control: "cantidad",
    lots: [lot("L1", "Depósito Central", "A-01-A1", "", "", "", 120)],
    movements: [
      mov("M1", "2026-08-07", "Ingreso", 150, "OC-2026-127"),
      mov("M2", "2026-08-03", "Egreso", -30, "CX-2255"),
    ],
    articleType: "Implante", shortDesc: "Aguja K 1.6×150",
    ean: "00888867009987", manufacturerCode: "STR-K16",
    conversion: "1 caja = 20 u", targetStock: 150, reorderPoint: 60, defaultDeposit: "Depósito Central", defaultLocation: "A-01-A1",
    supplierCode: "STR-001", lastSupplier: "Stryker Argentina", lastCost: 900, lastPurchaseDate: "2026-08-07", leadTime: "7 días",
    suppliers: [sup("Stryker Argentina", "STR-001", "Filial local Stryker")],
    iva: "21%", priceList: "Lista 1", marginTarget: 57,
    createdAt: "2026-01-20", createdBy: "F. Bianchi",
  },
  {
    id: "ART-013", code: "JAULA-LUM", name: "Jaula intersomática lumbar PEEK", descriptionExtra: "Jaula intersomática lumbar, PEEK, 10°",
    family: "Columna", category: "Implantes", rubro: "Columna", seccion: "Cajas intersomáticas", linea: "Lumbar PEEK",
    brand: "Medtronic", type: "Jaula", unit: "u", unitBuy: "u",
    manufacturer: "Medtronic", gtin: "00888867002041", pm: "PM-7201-2", sterile: true, preferredSupplier: "Medtronic", cost: 32000, price: 61000,
    available: 7, reserved: 2, inTransit: 4, min: 5, state: "Disponible", masterStatus: "Activo", control: "lote",
    lots: [lot("L1", "Depósito Central", "A-04-D2", "L231001", "", "2027-10-01", 7)],
    movements: [
      mov("M1", "2026-08-08", "Ingreso", 10, "OC-2026-126"),
      mov("M2", "2026-08-02", "Egreso", -3, "CX-2252"),
    ],
    articleType: "Implante", shortDesc: "Jaula lumbar PEEK 10°",
    ean: "00888867002041", manufacturerCode: "MDT-JL",
    conversion: "1 u = 1 u", targetStock: 10, reorderPoint: 5, defaultDeposit: "Depósito Central", defaultLocation: "A-04-D2",
    supplierCode: "MDT-01", lastSupplier: "Medtronic", lastCost: 32000, lastPurchaseDate: "2026-08-08", leadTime: "10 días",
    suppliers: [sup("Medtronic", "MDT-01", "Medtronic Argentina S.A.")],
    iva: "21%", priceList: "Lista 1", marginTarget: 48,
    createdAt: "2025-10-25", createdBy: "F. Bianchi",
  },
  {
    id: "ART-006", code: "SUT-VIC-2", name: "Sutura Vicryl 2-0 aguja 26 mm", descriptionExtra: "Vicryl 2-0, aguja 26 mm, trenzada",
    family: "Descartable", category: "Descartable", rubro: "Suturas", seccion: "Suturas absorbibles", linea: "Vicryl",
    brand: "Ethicon", type: "Sutura", unit: "u", unitBuy: "caja x12",
    manufacturer: "Ethicon", gtin: "10705031208553", pm: "PM-5501-1", sterile: true, preferredSupplier: "Johnson & Johnson", cost: 2200, price: 5400,
    available: 85, reserved: 20, inTransit: 40, min: 30, state: "Reservado", masterStatus: "Activo", control: "lote-vencimiento",
    lots: [
      lot("L1", "Depósito Central", "D-02-C4", "V-2308", "", "2027-08-31", 55),
      lot("L2", "Depósito Logística", "L-01-A2", "V-2401", "", "2028-01-31", 30),
    ],
    movements: [
      mov("M1", "2026-08-10", "Ingreso", 100, "OC-2026-120"),
      mov("M2", "2026-08-05", "Egreso", -15, "REM-0033"),
    ],
    articleType: "Descartable", shortDesc: "Vicryl 2-0 26 mm",
    ean: "10705031208553", manufacturerCode: "ETH-VIC2",
    conversion: "1 caja = 12 u", targetStock: 120, reorderPoint: 40, defaultDeposit: "Depósito Central", defaultLocation: "D-02-C4",
    supplierCode: "JNJ-001", lastSupplier: "Johnson & Johnson", lastCost: 2200, lastPurchaseDate: "2026-08-10", leadTime: "5 días",
    suppliers: [sup("Johnson & Johnson", "JNJ-001", "Johnson & Johnson Medical Argentina")],
    iva: "21%", priceList: "Lista 1", marginTarget: 59,
    createdAt: "2026-02-11", createdBy: "F. Bianchi",
  },
  {
    id: "ART-007", code: "SUT-PROL-1", name: "Prolene 1-0 aguja 24 mm", descriptionExtra: "Prolene 1-0, aguja 24 mm, monofilamento",
    family: "Descartable", category: "Descartable", rubro: "Suturas", seccion: "Suturas no absorbibles", linea: "Prolene",
    brand: "Ethicon", type: "Sutura", unit: "u", unitBuy: "caja x12",
    manufacturer: "Ethicon", gtin: "10705031208571", pm: "PM-5508-1", sterile: true, preferredSupplier: "Johnson & Johnson", cost: 2400, price: 5800,
    available: 12, reserved: 2, inTransit: 0, min: 20, state: "Reservado", masterStatus: "Activo", control: "lote-vencimiento",
    lots: [lot("L1", "Depósito Central", "D-02-C5", "V-2304", "", "2027-04-30", 12)],
    movements: [mov("M1", "2026-08-09", "Egreso", -8, "CX-2258")],
    articleType: "Descartable", shortDesc: "Prolene 1-0 24 mm",
    ean: "10705031208571", manufacturerCode: "ETH-PRO1",
    conversion: "1 caja = 12 u", targetStock: 60, reorderPoint: 30, defaultDeposit: "Depósito Central", defaultLocation: "D-02-C5",
    supplierCode: "JNJ-001", lastSupplier: "Johnson & Johnson", lastCost: 2400, lastPurchaseDate: "2026-07-12", leadTime: "5 días",
    suppliers: [sup("Johnson & Johnson", "JNJ-001", "Johnson & Johnson Medical Argentina")],
    iva: "21%", priceList: "Lista 1", marginTarget: 59,
    createdAt: "2026-02-11", createdBy: "F. Bianchi",
  },
  {
    id: "ART-008", code: "GUA-SUE-75", name: "Guante quirúrgico estéril N° 7.5", descriptionExtra: "Guante quirúrgico estéril N° 7.5, látex",
    family: "Descartable", category: "Descartable", rubro: "Guantes y campos", seccion: "Guantes", linea: "Estéril",
    brand: "Ansell", type: "Guante", unit: "par", unitBuy: "caja x50",
    manufacturer: "Ansell", gtin: "10705031209963", pm: "PM-6010-2", sterile: true, preferredSupplier: "Ansell Argentina", cost: 600, price: 1450,
    available: 240, reserved: 0, inTransit: 100, min: 60, state: "Disponible", masterStatus: "Activo", control: "lote-vencimiento",
    lots: [lot("L1", "Depósito Central", "D-04-A1", "G-2306", "", "2027-06-30", 240)],
    movements: [
      mov("M1", "2026-08-11", "Ingreso", 200, "OC-2026-133"),
      mov("M2", "2026-08-02", "Egreso", -60, "REM-0030"),
    ],
    articleType: "Descartable", shortDesc: "Guante estéril 7.5",
    ean: "10705031209963", manufacturerCode: "ANS-75",
    conversion: "1 caja = 50 pares", targetStock: 300, reorderPoint: 100, defaultDeposit: "Depósito Central", defaultLocation: "D-04-A1",
    supplierCode: "ANS-001", lastSupplier: "Ansell Argentina", lastCost: 600, lastPurchaseDate: "2026-08-11", leadTime: "10 días",
    suppliers: [sup("Ansell Argentina", "ANS-001", "Ansell Healthcare Products LLC")],
    iva: "21%", priceList: "Lista 1", marginTarget: 59,
    createdAt: "2026-03-02", createdBy: "F. Bianchi",
  },
  {
    id: "ART-009", code: "CAMPO-45x45", name: "Campo quirúrgico 45 x 45 cm", descriptionExtra: "Campo quirúrgico 45x45, SMS",
    family: "Descartable", category: "Descartable", rubro: "Guantes y campos", seccion: "Campos", linea: "Descartable",
    brand: "3M", type: "Campo", unit: "u", unitBuy: "caja x20",
    manufacturer: "3M", gtin: "10705031207754", pm: "PM-7102-1", sterile: true, preferredSupplier: "3M Health", cost: 850, price: 1900,
    available: 0, reserved: 0, inTransit: 0, min: 40, state: "Pendiente", masterStatus: "Inactivo", control: "lote-vencimiento",
    lots: [lot("L1", "Depósito Central", "D-01-B1", "C-2205", "", "2026-11-30", 0, "Vencido")],
    movements: [mov("M1", "2026-06-15", "Ajuste", -12, "AJU-0091")],
    articleType: "Descartable", shortDesc: "Campo quirúrgico 45×45",
    ean: "10705031207754", manufacturerCode: "3M-C45",
    conversion: "1 caja = 20 u", targetStock: 120, reorderPoint: 50, defaultDeposit: "Depósito Central", defaultLocation: "D-01-B1",
    supplierCode: "3MH-001", lastSupplier: "3M Health", lastCost: 850, lastPurchaseDate: "2026-05-20", leadTime: "7 días",
    suppliers: [sup("3M Health", "3MH-001", "3M Health Care Argentina")],
    iva: "21%", priceList: "Lista 1", marginTarget: 55,
    createdAt: "2026-01-05", createdBy: "F. Bianchi",
  },
  {
    id: "ART-010", code: "FRESA-5", name: "Fresa motor 5.0 mm", descriptionExtra: "Fresa motor 5.0 mm, corte rápido",
    family: "Instrumental", category: "Instrumental", rubro: "Motor y consumibles", seccion: "Fresas", linea: "Motor 5.0",
    brand: "Medtronic", type: "Fresa", unit: "u", unitBuy: "u",
    manufacturer: "Medtronic", gtin: "00888867002031", pm: "PM-8105-1", sterile: true, preferredSupplier: "Medtronic", cost: 5400, price: 11500,
    available: 9, reserved: 3, inTransit: 0, min: 5, state: "Reservado", masterStatus: "Activo", control: "cantidad",
    lots: [lot("L1", "Depósito Quirúrgico", "Q-03-C1", "", "", "", 9)],
    movements: [
      mov("M1", "2026-08-08", "Devolución", 3, "DEV-0014"),
      mov("M2", "2026-07-30", "Egreso", -3, "CX-2248"),
    ],
    articleType: "Instrumental", shortDesc: "Fresa motor 5.0 mm",
    ean: "00888867002031", manufacturerCode: "MDT-FR5",
    conversion: "1 u = 1 u", targetStock: 12, reorderPoint: 5, defaultDeposit: "Depósito Quirúrgico", defaultLocation: "Q-03-C1",
    supplierCode: "MDT-01", lastSupplier: "Medtronic", lastCost: 5400, lastPurchaseDate: "2026-07-02", leadTime: "10 días",
    suppliers: [sup("Medtronic", "MDT-01", "Medtronic Argentina S.A.")],
    iva: "21%", priceList: "Lista 1", marginTarget: 53,
    maintenance: "Verificar filo y esterilización tras cada uso",
    createdAt: "2026-03-15", createdBy: "F. Bianchi",
  },
  {
    id: "ART-011", code: "PINZA-ADSON", name: "Pinza Adson con dientes 12 cm", descriptionExtra: "Pinza Adson con dientes 12 cm, acero inox",
    family: "Instrumental", category: "Instrumental", rubro: "Instrumental quirúrgico", seccion: "Pinzas", linea: "Adson",
    brand: "B. Braun", type: "Pinza", unit: "u", unitBuy: "u",
    manufacturer: "B. Braun", gtin: "04046964023002", pm: "PM-9101-1", sterile: true, preferredSupplier: "B. Braun Medical", cost: 3900, price: 8900,
    available: 0, reserved: 0, inTransit: 0, min: 4, state: "Pendiente", masterStatus: "Discontinuado", control: "cantidad",
    lots: [],
    movements: [mov("M1", "2026-03-10", "Baja", -6, "AJU-0071")],
    articleType: "Instrumental", shortDesc: "Pinza Adson 12 cm",
    ean: "04046964023002", manufacturerCode: "BB-AD12",
    conversion: "1 u = 1 u", targetStock: 8, reorderPoint: 4, defaultDeposit: "Depósito Quirúrgico", defaultLocation: "Q-04-A2",
    supplierCode: "BBM-001", lastSupplier: "B. Braun Medical", lastCost: 3900, lastPurchaseDate: "2026-01-10", leadTime: "14 días",
    suppliers: [sup("B. Braun Medical", "BBM-001", "B. Braun Medical Argentina")],
    iva: "21%", priceList: "Lista 1", marginTarget: 56,
    maintenance: "Afilado y alineación de dientes semestral",
    createdAt: "2025-08-14", createdBy: "F. Bianchi",
  },
  {
    id: "ART-012", code: "DREN-RED-24", name: "Drenaje redón 24 Fr", descriptionExtra: "Drenaje redón 24 Fr, silicona",
    family: "Insumos", category: "Insumos", rubro: "Drenajes", seccion: "Drenajes de aspiración", linea: "Redón",
    brand: "B. Braun", type: "Drenaje", unit: "u", unitBuy: "caja x10",
    manufacturer: "B. Braun", gtin: "04046964024123", pm: "PM-9202-1", sterile: true, preferredSupplier: "B. Braun Medical", cost: 1600, price: 3900,
    available: 35, reserved: 0, inTransit: 15, min: 20, state: "Disponible", masterStatus: "Activo", control: "lote",
    lots: [lot("L1", "Depósito Central", "A-02-D1", "R-2402", "", "2028-02-28", 35)],
    movements: [
      mov("M1", "2026-08-06", "Ingreso", 50, "OC-2026-119"),
      mov("M2", "2026-08-01", "Egreso", -15, "CX-2250"),
    ],
    articleType: "Insumo", shortDesc: "Drenaje redón 24 Fr",
    ean: "04046964024123", manufacturerCode: "BB-DR24",
    conversion: "1 caja = 10 u", targetStock: 60, reorderPoint: 25, defaultDeposit: "Depósito Central", defaultLocation: "A-02-D1",
    supplierCode: "BBM-001", lastSupplier: "B. Braun Medical", lastCost: 1600, lastPurchaseDate: "2026-08-06", leadTime: "7 días",
    suppliers: [sup("B. Braun Medical", "BBM-001", "B. Braun Medical Argentina")],
    iva: "21%", priceList: "Lista 1", marginTarget: 59,
    createdAt: "2026-02-22", createdBy: "F. Bianchi",
  },
  {
    id: "ART-014", code: "MOTOR-M4", name: "Motor de fresado quirúrgico M4", descriptionExtra: "Motor de fresado para traumatología, 40.000 rpm",
    family: "Instrumental", category: "Equipos", rubro: "Motor y consumibles", seccion: "Motores", linea: "M4",
    brand: "Medtronic", type: "Motor", unit: "u", unitBuy: "u",
    manufacturer: "Medtronic", gtin: "00888867002055", pm: "PM-8100-9", sterile: false, preferredSupplier: "Medtronic", cost: 450000, price: 820000,
    available: 2, reserved: 1, inTransit: 0, min: 1, state: "Reservado", masterStatus: "Activo", control: "serie",
    lots: [lot("L1", "Depósito Quirúrgico", "Q-05-A1", "SN-M4-201", "SN-M4-201", "", 2)],
    movements: [
      mov("M1", "2026-08-04", "Ingreso", 2, "OC-2026-128"),
      mov("M2", "2026-08-11", "Egreso", -1, "CX-2261"),
    ],
    articleType: "Equipo", shortDesc: "Motor fresado M4",
    ean: "00888867002055", manufacturerCode: "MDT-M4",
    conversion: "1 u = 1 u", targetStock: 2, reorderPoint: 1, defaultDeposit: "Depósito Quirúrgico", defaultLocation: "Q-05-A1",
    supplierCode: "MDT-01", lastSupplier: "Medtronic", lastCost: 450000, lastPurchaseDate: "2026-08-04", leadTime: "30 días",
    suppliers: [sup("Medtronic", "MDT-01", "Medtronic Argentina S.A.")],
    iva: "21%", priceList: "Lista 1", marginTarget: 45,
    usefulLife: "8 años", fixedAsset: "AF-2026-014", maintenance: "Calibración anual + revisión de mandril",
    weight: "1.8 kg", dimensions: "38 × 9 × 9 cm",
    createdAt: "2026-01-15", createdBy: "F. Bianchi",
  },
]

// ─── Filter option catalogs (derived from mock) ───────────

export const DEPOSITS = ["Depósito Central", "Depósito Quirúrgico", "Depósito Logística"]
export const CATEGORIES = [...new Set(STOCK_ITEMS.map((i) => i.category))]
export const BRANDS = [...new Set(STOCK_ITEMS.map((i) => i.brand))]
export const TYPES = [...new Set(STOCK_ITEMS.map((i) => i.type))]
export const RUBROS = [...new Set(STOCK_ITEMS.map((i) => i.rubro))]
export const SECCIONES = [...new Set(STOCK_ITEMS.map((i) => i.seccion))]
export const LINEAS = [...new Set(STOCK_ITEMS.map((i) => i.linea))]
export const FAMILIES = Object.keys(FAMILY_STYLE) as Family[]
export const FABRICANTES = [...new Set(STOCK_ITEMS.map((i) => i.manufacturer))]
export const PROVEEDORES = [...new Set(STOCK_ITEMS.map((i) => i.preferredSupplier))]

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

// ─── Cajas: Artículo ↔ Plantilla de Caja ↔ Caja Física ────
//
// Modelo funcional (mock): el artículo NO apunta a una caja. La relación
// real es: una Plantilla versiona la cantidad IDEAL por artículo, y cada
// Caja Física materializa una VERSIÓN de esa plantilla con su contenido REAL
// (derivado de existencias/movimientos). Un artículo puede estar en múltiples
// cajas y varias cajas pueden compartir la misma plantilla.

export type BoxRelation = "Instrumental fijo" | "Implante" | "Consumible" | "Opcional" | "Reposición"

export interface BoxTemplateItem {
  articleId: string
  relation: BoxRelation
  /** Cantidad ideal por caja — pertenece a la plantilla. */
  quantityIdeal: number
}

export interface BoxTemplateVersion {
  id: string
  version: string
  items: BoxTemplateItem[]
  /** Versión vigente que usan las cajas activas. */
  current: boolean
  createdAt: string
}

export interface BoxTemplate {
  id: string
  name: string
  versions: BoxTemplateVersion[]
}

export interface PhysicalBoxContent {
  articleId: string
  /** Cantidad real — derivada de existencias/movimientos (simulada en el mock). */
  quantityActual: number
  reserved: number
}

export interface PhysicalBox {
  id: string
  templateVersionId: string
  state: string
  contents: PhysicalBoxContent[]
}

export const BOX_TEMPLATES: BoxTemplate[] = [
  {
    id: "LCA-LCP",
    name: "LCA/LCP",
    versions: [
      {
        id: "TPL-LCA-v1", version: "v1", current: false, createdAt: "2025-09-01",
        items: [
          { articleId: "ART-010", relation: "Instrumental fijo", quantityIdeal: 1 },
          { articleId: "ART-011", relation: "Instrumental fijo", quantityIdeal: 1 },
          { articleId: "ART-001", relation: "Implante", quantityIdeal: 12 },
        ],
      },
      {
        id: "TPL-LCA-v2", version: "v2", current: false, createdAt: "2026-01-15",
        items: [
          { articleId: "ART-010", relation: "Instrumental fijo", quantityIdeal: 1 },
          { articleId: "ART-011", relation: "Instrumental fijo", quantityIdeal: 2 },
          { articleId: "ART-001", relation: "Implante", quantityIdeal: 16 },
        ],
      },
      {
        id: "TPL-LCA-v3", version: "v3", current: true, createdAt: "2026-06-10",
        items: [
          { articleId: "ART-010", relation: "Instrumental fijo", quantityIdeal: 1 },
          { articleId: "ART-011", relation: "Instrumental fijo", quantityIdeal: 2 },
          { articleId: "ART-001", relation: "Implante", quantityIdeal: 20 },
        ],
      },
    ],
  },
  {
    id: "INST-BAS",
    name: "Instrumental Básico",
    versions: [
      {
        id: "TPL-INST-BAS-v1", version: "v1", current: false, createdAt: "2025-10-20",
        items: [
          { articleId: "ART-011", relation: "Instrumental fijo", quantityIdeal: 1 },
          { articleId: "ART-012", relation: "Consumible", quantityIdeal: 6 },
        ],
      },
      {
        id: "TPL-INST-BAS-v2", version: "v2", current: true, createdAt: "2026-03-05",
        items: [
          { articleId: "ART-011", relation: "Instrumental fijo", quantityIdeal: 1 },
          { articleId: "ART-012", relation: "Consumible", quantityIdeal: 10 },
        ],
      },
    ],
  },
]

export const PHYSICAL_BOXES: PhysicalBox[] = [
  {
    id: "LC4-01",
    templateVersionId: "TPL-LCA-v3",
    state: "Completa",
    contents: [
      { articleId: "ART-010", quantityActual: 1, reserved: 0 },
      { articleId: "ART-011", quantityActual: 2, reserved: 0 },
      { articleId: "ART-001", quantityActual: 20, reserved: 0 },
    ],
  },
  {
    id: "LC4-02",
    templateVersionId: "TPL-LCA-v3",
    state: "Con faltantes",
    contents: [
      { articleId: "ART-010", quantityActual: 1, reserved: 0 },
      { articleId: "ART-011", quantityActual: 0, reserved: 0 },
      { articleId: "ART-001", quantityActual: 15, reserved: 2 },
    ],
  },
  {
    id: "IB-01",
    templateVersionId: "TPL-INST-BAS-v2",
    state: "Completa",
    contents: [
      { articleId: "ART-011", quantityActual: 1, reserved: 0 },
      { articleId: "ART-012", quantityActual: 10, reserved: 0 },
    ],
  },
]

// ─── Resolución de plantilla / versión ────────────────────

export function findTemplateVersion(versionId: string): { template: BoxTemplate; version: BoxTemplateVersion } | null {
  for (const template of BOX_TEMPLATES) {
    const version = template.versions.find((v) => v.id === versionId)
    if (version) return { template, version }
  }
  return null
}

export function templateById(id: string): BoxTemplate | undefined {
  return BOX_TEMPLATES.find((t) => t.id === id)
}

export function currentVersionOf(templateId: string): BoxTemplateVersion | undefined {
  return templateById(templateId)?.versions.find((v) => v.current)
}

export function boxesUsingVersion(versionId: string): PhysicalBox[] {
  return PHYSICAL_BOXES.filter((b) => b.templateVersionId === versionId)
}

// ─── Vista Artículo → Cajas ───────────────────────────────

export interface ArticleBoxRow {
  boxId: string
  templateName: string
  templateVersion: string
  relation: BoxRelation
  quantityIdeal: number
  quantityActual: number
  reserved: number
  state: "Completa" | "Faltante"
}

/** Cajas en las que participa un artículo (vista derivada de plantillas + cajas físicas). */
export function articleBoxes(articleId: string): ArticleBoxRow[] {
  const rows: ArticleBoxRow[] = []
  for (const box of PHYSICAL_BOXES) {
    const tv = findTemplateVersion(box.templateVersionId)
    if (!tv) continue
    for (const item of tv.version.items) {
      if (item.articleId !== articleId) continue
      const actual = box.contents.find((c) => c.articleId === articleId)
      const quantityActual = actual?.quantityActual ?? 0
      rows.push({
        boxId: box.id,
        templateName: tv.template.name,
        templateVersion: tv.version.version,
        relation: item.relation,
        quantityIdeal: item.quantityIdeal,
        quantityActual,
        reserved: actual?.reserved ?? 0,
        state: quantityActual >= item.quantityIdeal ? "Completa" : "Faltante",
      })
    }
  }
  return rows
}

export function articleBoxSummary(articleId: string): { total: number; complete: number; missing: number } {
  const rows = articleBoxes(articleId)
  const complete = rows.filter((r) => r.state === "Completa").length
  return { total: rows.length, complete, missing: rows.length - complete }
}

// ─── Ficha de Caja (vista inversa de la relación) ─────────

export interface BoxArticleRow {
  articleId: string
  code: string
  name: string
  relation: BoxRelation
  quantityIdeal: number
  quantityActual: number
  reserved: number
  missing: number
  condition: "Completa" | "Faltante" | "Excedente"
}

export function boxInfo(boxId: string): { box: PhysicalBox; template: BoxTemplate; version: BoxTemplateVersion } | null {
  const box = PHYSICAL_BOXES.find((b) => b.id === boxId)
  if (!box) return null
  const tv = findTemplateVersion(box.templateVersionId)
  if (!tv) return null
  return { box, template: tv.template, version: tv.version }
}

/** Artículos de una caja física: ideal (plantilla) vs real (contenido). */
export function boxArticles(boxId: string, overrides?: Record<string, number>): BoxArticleRow[] {
  const info = boxInfo(boxId)
  if (!info) return []
  const { box, version } = info
  return version.items.map((item) => {
    const actual = box.contents.find((c) => c.articleId === item.articleId)
    const quantityActual = overrides?.[item.articleId] ?? actual?.quantityActual ?? 0
    const article = STOCK_ITEMS.find((a) => a.id === item.articleId)
    return {
      articleId: item.articleId,
      code: article?.code ?? item.articleId,
      name: article?.name ?? item.articleId,
      relation: item.relation,
      quantityIdeal: item.quantityIdeal,
      quantityActual,
      reserved: actual?.reserved ?? 0,
      missing: Math.max(0, item.quantityIdeal - quantityActual),
      condition: quantityActual > item.quantityIdeal ? "Excedente" : quantityActual < item.quantityIdeal ? "Faltante" : "Completa",
    }
  })
}

// ─── Plantilla de Caja (contenido ideal versionado) ───────

export interface TemplateArticleRow {
  articleId: string
  code: string
  name: string
  relation: BoxRelation
  quantityIdeal: number
}

/** Contenido ideal de una versión de plantilla (resuelve artículo). */
export function templateVersionArticles(versionId: string): TemplateArticleRow[] {
  const tv = findTemplateVersion(versionId)
  if (!tv) return []
  return tv.version.items.map((item) => {
    const article = STOCK_ITEMS.find((a) => a.id === item.articleId)
    return {
      articleId: item.articleId,
      code: article?.code ?? item.articleId,
      name: article?.name ?? item.articleId,
      relation: item.relation,
      quantityIdeal: item.quantityIdeal,
    }
  })
}
