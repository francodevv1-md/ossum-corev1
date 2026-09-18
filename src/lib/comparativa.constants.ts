/**
 * comparativa.constants.ts
 * Constantes visuales y de configuración para la Comparativa de Materiales.
 * CHATZAI-024: Implementación V1.
 */

import type { EstadoLineaComparativa, MetodoMatchComparativa } from "@/types"

export const ESTADO_LINEA_COMPARATIVA_LABELS: Record<EstadoLineaComparativa, string> = {
  coincidente: "Coincidente",
  pendiente_remitir: "Pendiente remitir",
  remitido_de_mas: "Remitido de más",
  consumido_de_mas: "Consumido de más",
  consumido_de_menos: "Consumido de menos",
  devuelto: "Devuelto",
  no_presupuestado: "No presupuestado",
  revision_manual: "Revisión manual",
}

export const ESTADO_LINEA_COMPARATIVA_COLORS: Record<EstadoLineaComparativa, { bg: string; border: string; text: string; badge: string }> = {
  coincidente: {
    bg: "",
    border: "",
    text: "",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pendiente_remitir: {
    bg: "bg-amber-50/50",
    border: "border-l-amber-400",
    text: "",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  remitido_de_mas: {
    bg: "bg-blue-50/50",
    border: "border-l-blue-400",
    text: "",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  consumido_de_mas: {
    bg: "bg-red-50/50",
    border: "border-l-red-400",
    text: "",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  consumido_de_menos: {
    bg: "bg-gray-50/50",
    border: "border-l-gray-400",
    text: "",
    badge: "bg-gray-50 text-gray-700 border-gray-200",
  },
  devuelto: {
    bg: "bg-green-50/50",
    border: "border-l-green-400",
    text: "",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  no_presupuestado: {
    bg: "bg-orange-50/50",
    border: "border-l-orange-400",
    text: "",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  },
  revision_manual: {
    bg: "bg-purple-50/50",
    border: "border-l-purple-400",
    text: "text-purple-700",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
}

export const METODO_MATCH_LABELS: Record<MetodoMatchComparativa, string> = {
  stockItemId: "Stock ID",
  codigo: "Código",
  descripcion: "Descripción (aprox.)",
  sin_match: "Sin match",
}

export const COMPARATIVA_EMPTY_MESSAGES = {
  sinPresupuesto: "No hay presupuesto vigente para esta cirugía.",
  sinRemitos: "No hay remitos registrados.",
  sinConsumo: "No hay consumo registrado.",
  sinDatos: "No hay datos suficientes para comparar.",
} as const
