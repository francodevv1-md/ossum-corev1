/**
 * presupuesto-pdf.utils.ts
 * CHATZAI-025 (BLOQUE 3) — Presupuesto PDF conversion utility.
 *
 * Converts presupuesto form data into the PDF data model.
 * Actual PDF generation will be implemented when the visual design is confirmed.
 */

import type { PresupuestoPdfData } from './presupuesto-pdf.types'
import type { FormItem, PresupuestoFormData } from '@/hooks/usePresupuestoForm'
import { ivaValueFromKey, IVA_OPTIONS } from './presupuestos.constants'

/**
 * Computes the net subtotal for a single form item:
 * lineBruto = qty × unitPrice
 * lineNeto = lineBruto × (1 - discountPercent / 100)
 */
function computeItemSubtotalNeto(item: FormItem): number {
  const lineBruto = item.quantity * item.unitPrice
  const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
  return lineBruto * (1 - clampedDiscount / 100)
}

/**
 * Converts presupuesto form data into the PDF data model.
 *
 * @param formData — The presupuesto form state
 * @param items — The array of form items (usually formData.items)
 * @param calculations — Pre-computed totals from usePresupuestoForm
 * @param clientInfo — Optional client details (not captured in current form)
 * @param surgeryInfo — Optional surgery context for PDF header
 */
export function formToPdfData(
  formData: PresupuestoFormData,
  items: FormItem[],
  calculations: {
    subtotal: number
    descuentoLineasMonto: number
    descuento: number
    descuentoMonto: number
    baseNeta: number
    ivaDesglose: Record<string, number>
    ivaMonto: number
    total: number
  },
  clientInfo?: { nombre: string; cuit?: string; condicionIva?: string; domicilio?: string; localidad?: string; provincia?: string },
  surgeryInfo?: { paciente: string; medico: string; institucion: string; clasificacion: string; fechaCx?: string }
): PresupuestoPdfData {
  return {
    numero: formData.surgeryId || 'PR-000000',
    fechaEmision: formData.fechaEmision,
    vigencia: formData.vigencia,
    listaPrecios: formData.listaPrecios,
    condicionPago: formData.condicionPago,
    cliente: clientInfo || { nombre: formData.client || '—' },
    cirugia: surgeryInfo,
    items: items.map(item => ({
      codigo: item.code || '',
      articulo: item.name,
      cantidad: item.quantity,
      precioUnitario: item.unitPrice,
      descuentoPorcentaje: item.discountPercent,
      subtotalNeto: computeItemSubtotalNeto(item),
      ivaKey: item.ivaKey,
      ivaLabel: IVA_OPTIONS.find(o => o.key === item.ivaKey)?.label || item.ivaKey,
    })),
    subtotal: calculations.subtotal,
    descuentoLineasMonto: calculations.descuentoLineasMonto,
    descuentoGeneral: calculations.descuento,
    descuentoMonto: calculations.descuentoMonto,
    baseNeta: calculations.baseNeta,
    ivaDesglose: calculations.ivaDesglose,
    ivaMonto: calculations.ivaMonto,
    total: calculations.total,
  }
}
