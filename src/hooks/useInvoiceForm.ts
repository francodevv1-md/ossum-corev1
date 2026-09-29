"use client"

import { useState, useMemo, useCallback } from "react"
import type { CreateInvoicePayload, CreateInvoiceItemPayload, InvoiceBase } from "@/lib/api/invoices"

export interface InvoiceFormItem {
  code: string
  description: string
  lote?: string
  quantity: number
  unitPrice: number
  discountPercent: number
  ivaKey: string
  catalogItemId: string
  isArticuloLibre: boolean
  note: string
  codeResolved: boolean
}

export const EMPTY_INVOICE_ITEM: InvoiceFormItem = {
  code: "",
  description: "",
  lote: "",
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  ivaKey: "21",
  catalogItemId: "",
  isArticuloLibre: true,
  note: "",
  codeResolved: false,
}

export interface InvoiceFormData {
  clientContactId: string
  clientName: string
  clientTaxId: string
  clientVatCondition: string
  clientAddress: string
  clientEmail: string
  deliveryAddress: string
  commercialNotes: string
  surgeryId: string
  presupuestoId: string
  consumoId: string
  originType: "directo" | "cirugia" | "presupuesto" | "consumo"
  type: string
  issueDate: string
  dueDate: string
  paymentCondition: string
  currency: string
  reference: string
  observations: string
  percepciones: number
  items: InvoiceFormItem[]
}

export type InvoiceFormErrors = Partial<Record<string, string>>

export const INVOICE_IVA_OPTIONS = [
  { key: "21", label: "21%", rate: 21 },
  { key: "10.5", label: "10.5%", rate: 10.5 },
  { key: "27", label: "27%", rate: 27 },
  { key: "0", label: "0%", rate: 0 },
  { key: "exento", label: "Exento", rate: 0 },
  { key: "no_gravado", label: "No gravado", rate: 0 },
] as const

export function getIvaRate(key: string): number {
  const match = INVOICE_IVA_OPTIONS.find((opt) => opt.key === key)
  return match ? match.rate : 21
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

import { calculateLineFromGrossPrice, calculateNetFromGross } from "@/lib/commercial/vat"

export interface ComputedInvoiceLine {
  netSubtotal: number
  discountAmount: number
  taxableAmount: number
  taxRate: number
  taxAmount: number
  lineTotal: number
}

export function computeLineValues(item: InvoiceFormItem): ComputedInvoiceLine {
  const qty = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0
  const grossPrice = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0
  const discPct = Math.min(Math.max(Number.isFinite(item.discountPercent) ? item.discountPercent : 0, 0), 100)
  const vatRate = getIvaRate(item.ivaKey)

  if (qty <= 0 || grossPrice <= 0) {
    return {
      netSubtotal: 0,
      discountAmount: 0,
      taxableAmount: 0,
      taxRate: vatRate,
      taxAmount: 0,
      lineTotal: 0,
    }
  }

  const vatTreatment = item.ivaKey === "exento" ? "EXENTO" : item.ivaKey === "no_gravado" ? "NO_GRAVADO" : "GRAVADO"

  const lineCalc = calculateLineFromGrossPrice({
    quantity: qty,
    grossUnitPrice: grossPrice,
    discountPercent: discPct,
    vatTreatment,
    vatRate,
  })

  return {
    netSubtotal: round2(lineCalc.subtotalNeto.toNumber()),
    discountAmount: round2(lineCalc.discountAmount.toNumber()),
    taxableAmount: round2(lineCalc.taxableAmount.toNumber()),
    taxRate: vatRate,
    taxAmount: round2(lineCalc.tax.toNumber()),
    lineTotal: round2(lineCalc.total.toNumber()),
  }
}

export interface ComputedInvoiceTotals {
  subtotalNeto: number
  totalDescuento: number
  gravado21: number
  gravado105: number
  gravado27: number
  noGravadoExento: number
  iva21: number
  iva105: number
  iva27: number
  totalIva: number
  totalPercepciones: number
  total: number
  balance: number
}

export function computeInvoiceTotals(items: InvoiceFormItem[], percepciones: number = 0): ComputedInvoiceTotals {
  let subtotalNeto = 0
  let totalDescuento = 0
  let gravado21 = 0
  let gravado105 = 0
  let gravado27 = 0
  let noGravadoExento = 0
  let iva21 = 0
  let iva105 = 0
  let iva27 = 0
  let totalIva = 0

  for (const item of items) {
    const line = computeLineValues(item)
    subtotalNeto = round2(subtotalNeto + line.netSubtotal)
    totalDescuento = round2(totalDescuento + line.discountAmount)

    if (item.ivaKey === "21") {
      gravado21 = round2(gravado21 + line.taxableAmount)
      iva21 = round2(iva21 + line.taxAmount)
    } else if (item.ivaKey === "10.5") {
      gravado105 = round2(gravado105 + line.taxableAmount)
      iva105 = round2(iva105 + line.taxAmount)
    } else if (item.ivaKey === "27") {
      gravado27 = round2(gravado27 + line.taxableAmount)
      iva27 = round2(iva27 + line.taxAmount)
    } else {
      noGravadoExento = round2(noGravadoExento + line.taxableAmount)
    }

    totalIva = round2(totalIva + line.taxAmount)
  }

  const validPercepciones = Number.isFinite(percepciones) && percepciones >= 0 ? round2(percepciones) : 0
  const total = round2(subtotalNeto - totalDescuento + totalIva + validPercepciones)
  const balance = total

  return {
    subtotalNeto,
    totalDescuento,
    gravado21,
    gravado105,
    gravado27,
    noGravadoExento,
    iva21,
    iva105,
    iva27,
    totalIva,
    totalPercepciones: validPercepciones,
    total,
    balance,
  }
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]
}

function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split("T")[0]
}

export const DEFAULT_INVOICE_FORM_DATA: InvoiceFormData = {
  clientContactId: "",
  clientName: "",
  clientTaxId: "",
  clientVatCondition: "IVA Responsable Inscripto",
  clientAddress: "",
  clientEmail: "",
  deliveryAddress: "",
  commercialNotes: "",
  surgeryId: "",
  presupuestoId: "",
  consumoId: "",
  originType: "directo",
  type: "FV",
  issueDate: todayStr(),
  dueDate: defaultDueDate(),
  paymentCondition: "Cuenta Corriente 30 días",
  currency: "ARS",
  reference: "",
  observations: "",
  percepciones: 0,
  items: [],
}

export function useInvoiceForm(initialData?: Partial<InvoiceFormData>) {
  const [formData, setFormData] = useState<InvoiceFormData>({
    ...DEFAULT_INVOICE_FORM_DATA,
    ...initialData,
    items: initialData?.items?.length ? initialData.items : [{ ...EMPTY_INVOICE_ITEM }],
  })
  const [errors, setErrors] = useState<InvoiceFormErrors>({})

  const updateField = useCallback(<K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return prev
    })
  }, [])

  const addItem = useCallback((itemPatch?: Partial<InvoiceFormItem>) => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_INVOICE_ITEM, ...itemPatch }],
    }))
  }, [])

  const removeItem = useCallback((idx: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== idx) : [{ ...EMPTY_INVOICE_ITEM }],
    }))
    setErrors((prev) => {
      const next: InvoiceFormErrors = {}
      for (const [key, msg] of Object.entries(prev)) {
        if (!key.startsWith(`items[${idx}]`)) {
          next[key] = msg
        }
      }
      return next
    })
  }, [])

  const updateItem = useCallback((idx: number, updates: Partial<InvoiceFormItem>) => {
    setFormData((prev) => {
      const newItems = [...prev.items]
      if (!newItems[idx]) return prev
      newItems[idx] = { ...newItems[idx], ...updates }
      return { ...prev, items: newItems }
    })

    // Clear specific item cell errors
    setErrors((prev) => {
      let changed = false
      const next = { ...prev }
      if (updates.description && next[`items[${idx}].description`]) {
        delete next[`items[${idx}].description`]
        changed = true
      }
      if (updates.quantity !== undefined && next[`items[${idx}].quantity`]) {
        delete next[`items[${idx}].quantity`]
        changed = true
      }
      if (updates.unitPrice !== undefined && next[`items[${idx}].unitPrice`]) {
        delete next[`items[${idx}].unitPrice`]
        changed = true
      }
      if (next.items) {
        delete next.items
        changed = true
      }
      return changed ? next : prev
    })
  }, [])

  const resetForm = useCallback((newData?: Partial<InvoiceFormData>) => {
    setFormData({
      ...DEFAULT_INVOICE_FORM_DATA,
      issueDate: todayStr(),
      dueDate: defaultDueDate(),
      ...newData,
      items: newData?.items?.length ? newData.items : [{ ...EMPTY_INVOICE_ITEM }],
    })
    setErrors({})
  }, [])

  const totals = useMemo(
    () => computeInvoiceTotals(formData.items, formData.percepciones),
    [formData.items, formData.percepciones]
  )

  const validate = useCallback((): boolean => {
    const newErrors: InvoiceFormErrors = {}

    if (!formData.items || formData.items.length === 0) {
      newErrors.items = "Debe incluir al menos un ítem en la factura."
    } else {
      let hasValidItem = false
      formData.items.forEach((item, idx) => {
        if (!item.description.trim()) {
          newErrors[`items[${idx}].description`] = "La descripción es requerida."
        }
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          newErrors[`items[${idx}].quantity`] = "Cantidad debe ser mayor a 0."
        }
        if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
          newErrors[`items[${idx}].unitPrice`] = "Precio unitario no puede ser negativo."
        }
        if (item.description.trim() && item.quantity > 0 && item.unitPrice >= 0) {
          hasValidItem = true
        }
      })

      if (!hasValidItem && !newErrors.items) {
        newErrors.items = "Complete al menos un ítem válido."
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData.items])

  const toApiPayload = useCallback((): CreateInvoicePayload => {
    const base: InvoiceBase = formData.presupuestoId && formData.consumoId
      ? "mixto"
      : formData.presupuestoId
      ? "presupuesto"
      : formData.consumoId
      ? "consumo"
      : "manual"

    const items: CreateInvoiceItemPayload[] = formData.items.map((item) => {
      const line = computeLineValues(item)
      const vatTreatment = item.ivaKey === "exento" ? "EXENTO" : item.ivaKey === "no_gravado" ? "NO_GRAVADO" : "GRAVADO"
      const netUnitPrice = calculateNetFromGross(item.unitPrice, line.taxRate, vatTreatment).netUnitPrice.toNumber()
      return {
        sku: item.code.trim() || undefined,
        description: item.description.trim(),
        quantity: String(item.quantity),
        unit: "u",
        unitPrice: String(netUnitPrice),
        discount: String(line.discountAmount),
        tax: String(line.taxAmount),
        vatTreatment,
        vatRate: line.taxRate,
        metadata: {
          grossUnitPrice: item.unitPrice,
          lote: item.lote?.trim() || undefined,
          discountPercent: item.discountPercent,
          ivaKey: item.ivaKey,
          vatTreatment,
          taxRate: line.taxRate,
          note: item.note?.trim() || undefined,
          catalogItemId: item.catalogItemId || undefined,
          isArticuloLibre: item.isArticuloLibre,
        },
      }
    })

    return {
      surgeryId: formData.surgeryId ? formData.surgeryId : undefined,
      base,
      type: formData.type || "FV",
      currency: formData.currency || "ARS",
      items,
      metadata: {
        clientContactId: formData.clientContactId || undefined,
        clientName: formData.clientName || undefined,
        clientTaxId: formData.clientTaxId || undefined,
        clientVatCondition: formData.clientVatCondition || undefined,
        clientAddress: formData.clientAddress || undefined,
        clientEmail: formData.clientEmail || undefined,
        deliveryAddress: formData.deliveryAddress || undefined,
        commercialNotes: formData.commercialNotes || undefined,
        percepciones: formData.percepciones || undefined,
        dueDate: formData.dueDate || undefined,
        paymentCondition: formData.paymentCondition || undefined,
        reference: formData.reference.trim() || undefined,
        observations: formData.observations.trim() || undefined,
      },
    }
  }, [formData])

  return {
    formData,
    errors,
    totals,
    updateField,
    addItem,
    removeItem,
    updateItem,
    resetForm,
    validate,
    toApiPayload,
  }
}
