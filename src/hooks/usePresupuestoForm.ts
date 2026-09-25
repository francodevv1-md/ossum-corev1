"use client"

import { useState, useMemo, useCallback } from "react"
import type { Surgery, PlantillaPresupuesto } from "@/types"
import { getCatalogByCode } from "@/data/mock-catalog"
import { ivaValueFromKey } from "@/lib/presupuestos.constants"

// ─── Form item type (simpler than PresupuestoItem) ───

export interface FormItem {
  code: string
  name: string
  quantity: number
  unitPrice: number
  /** CHATZAI-017K: Descuento por ítem (porcentaje 0-100). Default 0. */
  discountPercent: number
  /**
   * CHATZAI-017L: ID del artículo en el catálogo/stock.
   * Si está vinculado → artículo catalogado.
   * Si está vacío → artículo libre (Z) automáticamente.
   * Ya NO existe checkbox manual de Z.
   */
  catalogItemId: string
  /**
   * CHATZAI-017L: Derivado automáticamente.
   * true = artículo libre / Z (no vinculado a catálogo)
   * false = artículo catalogado (vinculado a stock)
   * Se deriva de `!catalogItemId`.
   */
  isArticuloLibre: boolean
  descripcionLibre: string
  /**
   * CHATZAI-025: Alícuota de IVA por ítem.
   * Key de IVA_OPTIONS ("21", "10.5", "exento", "0", "27").
   * Default: el IVA global del presupuesto (formData.iva).
   */
  ivaKey: string
  /**
   * CHATZAI-025: True cuando el código fue resuelto a un producto del catálogo.
   * Cuando es true, la columna Artículo muestra el nombre como texto
   * (no editable, no abre búsqueda). Se resetea a false si se limpia/cambia el código.
   */
  codeResolved: boolean
}

export const EMPTY_FORM_ITEM: FormItem = {
  code: "",
  name: "",
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  catalogItemId: "",
  isArticuloLibre: true,
  descripcionLibre: "",
  ivaKey: "21",
  codeResolved: false,
}

// ─── Form data type ───

export interface PresupuestoFormData {
  branchId: string
  clientContactId: string
  payerContactId: string
  client: string
  obraSocial: string
  financiador: string
  vendedor: string
  patient: string
  institution: string
  concepto: string
  fechaEmision: string
  vigencia: string
  listaPrecios: string
  condicionPago: string
  descuento: number
  /** CHATZAI-017J: IVA general del presupuesto. Key de IVA_OPTIONS (string para selector). */
  iva: string
  items: FormItem[]
  observaciones: string
  surgeryId?: string
}

export type PresupuestoFormErrors = Partial<Record<string, string>>

// ─── Default form data ───

function todayStr(): string {
  return new Date().toISOString().split("T")[0]
}

const DEFAULT_FORM_DATA: PresupuestoFormData = {
  branchId: "",
  clientContactId: "",
  payerContactId: "",
  client: "",
  obraSocial: "",
  financiador: "",
  vendedor: "",
  patient: "",
  institution: "",
  concepto: "",
  fechaEmision: todayStr(),
  vigencia: "",
  listaPrecios: "",
  condicionPago: "",
  descuento: 0,
  iva: "21", // CHATZAI-017J: default 21% (alícuota general)
  items: [],
  observaciones: "",
  surgeryId: undefined,
}

// ─── Hook ───

export function usePresupuestoForm(initialData?: Partial<PresupuestoFormData>) {
  const [formData, setFormData] = useState<PresupuestoFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  })
  const [errors, setErrors] = useState<PresupuestoFormErrors>({})

  // ── Field updater ──
  const updateField = useCallback(<K extends keyof PresupuestoFormData>(key: K, value: PresupuestoFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    // Clear error for this field when user changes it
    setErrors((prev) => {
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return prev
    })
  }, [])

  // ── Items management ──
  // CHATZAI-025: addItem now inherits the current global IVA key as default
  const addItem = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_FORM_ITEM, ivaKey: prev.iva }],
    }))
  }, [])

  const removeItem = useCallback((idx: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }))
  }, [])

  const updateItem = useCallback((idx: number, updates: Partial<FormItem>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== idx) return item
        const merged = { ...item, ...updates }
        // CHATZAI-017L: Derive isArticuloLibre from catalogItemId
        // If catalogItemId is set → cataloged (not libre); if empty → libre/Z
        merged.isArticuloLibre = !merged.catalogItemId || merged.catalogItemId.trim() === ""
        return merged
      }),
    }))
  }, [])

  // ── Computed values ──
  // CHATZAI-017K: Secuencia de cálculo:
  // 1. Cada línea: subtotalBruto = qty × unitPrice; descLínea = subtotalBruto × discount%; subtotalNetoLínea = subtotalBruto - descLínea
  // 2. Subtotal (acumulado) = sum(subtotalNetoLínea) — ya descontado por ítem
  // 3. Descuento general sobre ese subtotal acumulado
  // 4. IVA sobre base neta (subtotal acumulado - descuento general)

  const subtotalBruto = useMemo(
    () => formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [formData.items]
  )

  // CHATZAI-017K: Monto total de descuentos por ítem
  const descuentoLineasMonto = useMemo(
    () => formData.items.reduce((sum, item) => {
      const lineBruto = item.quantity * item.unitPrice
      const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
      return sum + lineBruto * (clampedDiscount / 100)
    }, 0),
    [formData.items]
  )

  const subtotal = useMemo(
    () => subtotalBruto - descuentoLineasMonto,
    [subtotalBruto, descuentoLineasMonto]
  )

  const descuentoMonto = useMemo(
    () => (formData.descuento > 0 ? subtotal * (formData.descuento / 100) : 0),
    [subtotal, formData.descuento]
  )

  const baseNeta = useMemo(() => subtotal - descuentoMonto, [subtotal, descuentoMonto])

  // CHATZAI-025: IVA por ítem — cálculo discriminado con alícuota por línea
  // Cada ítem tiene su propio ivaKey. El IVA total es la suma de los IVAs individuales.
  // Fórmula por ítem: itemBase = item.subtotalNeto * (1 - generalDiscount/100)
  //                   itemIva = itemBase * ivaValueFromKey(item.ivaKey) / 100
  const ivaMonto = useMemo(() => {
    const generalDiscount = formData.descuento
    return formData.items.reduce((sum, item) => {
      const lineBruto = item.quantity * item.unitPrice
      const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
      const lineNeto = lineBruto * (1 - clampedDiscount / 100)
      const itemBase = lineNeto * (1 - generalDiscount / 100)
      const ivaRate = ivaValueFromKey(item.ivaKey)
      return sum + itemBase * (ivaRate / 100)
    }, 0)
  }, [formData.items, formData.descuento])

  // CHATZAI-025: IVA global percentage (kept for backward compat and CondicionesSection display)
  const ivaPercentage = useMemo(() => {
    const val = parseFloat(formData.iva)
    return isNaN(val) ? 0 : val
  }, [formData.iva])

  // CHATZAI-025: IVA desglose — breakdown by rate
  const ivaDesglose = useMemo(() => {
    const generalDiscount = formData.descuento
    const desglose: Record<string, number> = {}
    formData.items.forEach((item) => {
      const lineBruto = item.quantity * item.unitPrice
      const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
      const lineNeto = lineBruto * (1 - clampedDiscount / 100)
      const itemBase = lineNeto * (1 - generalDiscount / 100)
      const ivaRate = ivaValueFromKey(item.ivaKey)
      const itemIva = itemBase * (ivaRate / 100)
      if (itemIva > 0 || item.ivaKey === "exento") {
        desglose[item.ivaKey] = (desglose[item.ivaKey] || 0) + itemIva
      }
    })
    return desglose
  }, [formData.items, formData.descuento])

  const total = useMemo(() => baseNeta + ivaMonto, [baseNeta, ivaMonto])

  // CHATZAI-017L: Cantidad de artículos libres/Z (no vinculados a catálogo)
  const articuloLibreCount = useMemo(
    () => formData.items.filter((item) => item.isArticuloLibre).length,
    [formData.items]
  )

  /** @deprecated Use articuloLibreCount instead. Kept for backward compat. */
  const articuloZCount = articuloLibreCount

  // ── Validation ──
  const validate = useCallback((): boolean => {
    const newErrors: PresupuestoFormErrors = {}

    if (!formData.client.trim()) newErrors.client = "El cliente es obligatorio"
    if (!formData.vendedor.trim()) newErrors.vendedor = "El vendedor es obligatorio"
    if (!formData.fechaEmision) newErrors.fechaEmision = "La fecha de emisión es obligatoria"
    if (!formData.vigencia) newErrors.vigencia = "La vigencia es obligatoria"
    if (!formData.listaPrecios) newErrors.listaPrecios = "La lista de precios es obligatoria"

    // Items validation
    if (formData.items.length === 0) {
      newErrors.items = "Debe agregar al menos un artículo"
    } else {
      const itemErrors: string[] = []
      formData.items.forEach((item, idx) => {
        if (!item.name.trim()) itemErrors.push(`Artículo ${idx + 1}: nombre requerido`)
        if (item.unitPrice <= 0) itemErrors.push(`Artículo ${idx + 1}: precio debe ser mayor a 0`)
      })
      if (itemErrors.length > 0) newErrors.items = itemErrors.join("; ")
    }

    // Discount validation
    if (formData.descuento < 0 || formData.descuento > 100) {
      newErrors.descuento = "El descuento debe estar entre 0 y 100"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // ── Populate from surgery ──
  const populateFromSurgery = useCallback((surgery: Surgery) => {
    setFormData((prev) => ({
      ...prev,
      client: surgery.client || prev.client,
      obraSocial: surgery.obraSocial || prev.obraSocial,
      financiador: surgery.financiador || prev.financiador,
      patient: surgery.patient || prev.patient,
      institution: surgery.institution || prev.institution,
      vendedor: surgery.vendedor || prev.vendedor,
      surgeryId: surgery.id,
    }))
  }, [])

  // ── Load template ──
  // CHATZAI-017P-fix: Attempt catalog lookup by code so template items
  // with valid codes get linked automatically (price/name from catalog).
  const loadTemplate = useCallback((template: PlantillaPresupuesto) => {
    setFormData((prev) => ({
      ...prev,
      items: template.items.map((item) => {
        // If item has a code, try to look it up in the catalog
        const catalogMatch = item.code ? getCatalogByCode(item.code) : undefined
        const isLibre = item.isArticuloZ || !item.code || !catalogMatch
        return {
          code: catalogMatch ? catalogMatch.code : (item.code || ""),
          name: catalogMatch ? catalogMatch.name : item.name,
          quantity: item.quantity,
          unitPrice: catalogMatch ? catalogMatch.unitPrice : item.unitPrice,
          discountPercent: 0,
          catalogItemId: catalogMatch ? catalogMatch.id : "",
          isArticuloLibre: isLibre,
          descripcionLibre: item.descripcionLibre || "",
          ivaKey: catalogMatch ? catalogMatch.ivaKey : prev.iva,
          codeResolved: !!catalogMatch,
        }
      }),
    }))
  }, [])

  // ── Add multiple items at once (for import) ──
  const addItems = useCallback((newItems: FormItem[]) => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, ...newItems],
    }))
  }, [])

  // ── Reset form ──
  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_FORM_DATA, fechaEmision: todayStr() })
    setErrors({})
  }, [])

  return {
    formData,
    setFormData,
    updateField,
    items: formData.items,
    addItem,
    removeItem,
    updateItem,
    errors,
    validate,
    subtotal,
    /** CHATZAI-017K: Monto total de descuentos por ítem */
    descuentoLineasMonto,
    descuento: formData.descuento,
    descuentoMonto,
    iva: formData.iva,
    ivaPercentage,
    ivaMonto,
    /** CHATZAI-025: IVA breakdown by rate (Record<ivaKey, monto>) */
    ivaDesglose,
    /** CHATZAI-025A: Base neta (subtotal - descuento general) for PDF and external consumers */
    baseNeta,
    total,
    articuloZCount,
    /** CHATZAI-017L: Cantidad de artículos libres/Z (replaces articuloZCount) */
    articuloLibreCount,
    resetForm,
    populateFromSurgery,
    loadTemplate,
    addItems,
  }
}
