/**
 * presupuesto-pdf.types.ts
 * CHATZAI-025 (BLOQUE 3) — Presupuesto PDF data model.
 *
 * Defines the types and interfaces for generating a Presupuesto PDF.
 * This is the technical foundation; actual PDF generation (React-to-Print,
 * jsPDF, or similar) will be implemented when the visual design is confirmed.
 */

// ─── Presupuesto PDF data model ───

export interface PresupuestoPdfData {
  // Header info
  numero: string
  fechaEmision: string
  vigencia: string
  listaPrecios: string
  condicionPago: string

  // Client info
  cliente: {
    nombre: string
    cuit?: string
    condicionIva?: string
    domicilio?: string
    localidad?: string
    provincia?: string
  }

  // Surgery context
  cirugia?: {
    paciente: string
    medico: string
    institucion: string
    clasificacion: string
    fechaCx?: string
  }

  // Items
  items: PresupuestoPdfItem[]

  // Totals
  subtotal: number
  descuentoLineasMonto: number
  descuentoGeneral: number
  descuentoMonto: number
  baseNeta: number
  ivaDesglose: Record<string, number>
  ivaMonto: number
  total: number

  // Footer
  leyenda?: string
  leyendaDestacada?: boolean
  observaciones?: string
}

export interface PresupuestoPdfItem {
  codigo: string
  articulo: string
  cantidad: number
  precioUnitario: number
  descuentoPorcentaje: number
  subtotalNeto: number
  ivaKey: string
  ivaLabel: string
}

// ─── Configuration for PDF generation (to be defined when design is confirmed) ───

export interface PresupuestoPdfConfig {
  logo?: string | null // Logo URL or base64 — not yet defined
  colores?: {
    primario?: string
    secundario?: string
  }
  datosEmpresa?: {
    razonSocial?: string
    cuit?: string
    domicilio?: string
    telefono?: string
    email?: string
    inicioActividades?: string
    iibb?: string
  }
}

// ─── Document what's needed for final PDF generation ───

export const PRESUPUESTO_PDF_PENDING = [
  "Modelo visual final del presupuesto (diseño institucional)",
  "Logo de la empresa en formato digital (PNG/SVG)",
  "Colores institucionales (primario, secundario, acentos)",
  "Datos de la empresa (razón social, CUIT, domicilio, IIBB, inicio actividades)",
  "Confirmación de campos exactos a incluir",
  "Decisión sobre formato: A4 carta, membrete, sin membrete",
  "Decisión sobre tratamiento de IVA en PDF (discriminado por ítem vs resumen)",
] as const
