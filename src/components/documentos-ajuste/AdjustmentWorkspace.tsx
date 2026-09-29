"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  FileCheck,
  HelpCircle,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  Receipt,
  Save,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
} from "lucide-react"

import type {
  AjusteTipo,
  AjusteMotivo,
  DocumentoAjusteItem,
} from "@/types/documentos-ajuste"
import { useInvoices } from "@/hooks/useInvoices"
import { useDocumentosAjuste } from "@/lib/documentos-ajuste"
import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { InfoTooltip } from "@/components/ui/info-tooltip"

const MOTIVOS_NC: AjusteMotivo[] = [
  "Devolución de material",
  "Diferencia de precio",
  "Bonificación comercial",
  "Error administrativo",
  "Otro",
]

const MOTIVOS_ND: AjusteMotivo[] = [
  "Intereses por mora",
  "Recargo por urgencia",
  "Diferencia de precio",
  "Error administrativo",
  "Otro",
]

export const IVA_OPTIONS = [
  { value: "21", label: "21.0%", rate: 21 },
  { value: "10.5", label: "10.5%", rate: 10.5 },
  { value: "0", label: "0.0%", rate: 0 },
  { value: "-1", label: "Exento", rate: -1 },
]

export interface AdjustmentEditorItem {
  id: string
  sourceItemId?: string
  sourceSku?: string
  originalDescription: string
  noteDescription: string
  originalQuantity: number
  quantity: number
  grossUnitPrice: number // Precio final con IVA incluido ingresado por el usuario
  netUnitPrice: number   // Precio neto unitario calculado internamente
  vatUnitPrice: number   // IVA unitario calculado internamente
  vatRate: number        // 21, 10.5, 0, -1
  note?: string
  subtotal: number       // Subtotal neto de la línea
  tax: number            // IVA total de la línea
  total: number          // Total final de la línea (IVA incluido)
}

type CellCol = "noteDescription" | "quantity" | "grossUnitPrice" | "vatRate" | "note"

const CELL_INPUT =
  "w-full h-full bg-transparent border-0 outline-none px-2 py-1 text-xs " +
  "hover:bg-primary/10 focus:bg-primary/15 " +
  "focus:ring-1.5 focus:ring-inset focus:ring-primary dark:focus:ring-primary transition-colors duration-75 text-foreground"

const CELL_INPUT_NUM =
  "w-full h-full bg-transparent border-0 outline-none px-2 py-1 text-xs text-right tabular-nums font-mono font-medium " +
  "hover:bg-primary/10 focus:bg-primary/15 " +
  "focus:ring-1.5 focus:ring-inset focus:ring-primary dark:focus:ring-primary transition-colors duration-75 text-foreground"

const CELL_INPUT_ERROR = "ring-1.5 ring-inset ring-destructive bg-destructive/15 font-medium"

const COL_WIDTHS = {
  sourceRef: "95px",
  descriptions: undefined,
  quantity: "70px",
  grossUnitPrice: "120px",
  vat: "85px",
  total: "120px",
  note: "115px",
  delete: "36px",
} as const

/**
 * Calcula neto, IVA y total a partir del precio final unitario con IVA incluido.
 * Garantiza: totalLinea = cantidad * precioFinal y netoUnitario = precioFinal / (1 + IVA).
 */
export function computeLineTotalsFromGross(
  qty: number,
  grossUnitPrice: number,
  vatRate: number
) {
  const safeQty = Number(qty) || 0
  const safeGrossUnit = Number(grossUnitPrice) || 0

  // Total final exacto de la línea con IVA incluido
  const lineTotal = safeQty * safeGrossUnit

  let netUnitPrice = safeGrossUnit
  let vatUnitPrice = 0

  if (vatRate > 0) {
    netUnitPrice = safeGrossUnit / (1 + vatRate / 100)
    vatUnitPrice = safeGrossUnit - netUnitPrice
  }

  const subtotal = safeQty * netUnitPrice
  const tax = lineTotal - subtotal

  return {
    grossUnitPrice: safeGrossUnit,
    netUnitPrice,
    vatUnitPrice,
    subtotal,
    tax,
    total: lineTotal,
  }
}

export function AdjustmentWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { invoices, isLoading: isLoadingInvoices } = useInvoices()
  const { documentos, addDocumento } = useDocumentosAjuste()

  const initialTipoParam = searchParams.get("tipo")
  const initialFacturaParam = searchParams.get("facturaOrigen")
  const origenParam = searchParams.get("origen") || (initialFacturaParam ? "interno" : "interno")

  // Parámetros origen externo
  const extDocType = searchParams.get("extDocType") || "FACTURA B"
  const extPtoVta = searchParams.get("extPtoVta") || "1"
  const extNumber = searchParams.get("extNumber") || ""
  const extIssueDate = searchParams.get("extIssueDate") || ""
  const extIssuerCuit = searchParams.get("extIssuerCuit") || ""
  const extCae = searchParams.get("extCae") || ""
  const extClientName = searchParams.get("extClientName") || "Cliente General"

  // Parámetros origen período
  const periodFrom = searchParams.get("periodFrom") || ""
  const periodTo = searchParams.get("periodTo") || ""

  // Factura Origen
  const originInvoice = useMemo(
    () => invoices.find((inv) => inv.id === initialFacturaParam),
    [invoices, initialFacturaParam]
  )

  // Estado del editor
  const [tipo, setTipo] = useState<AjusteTipo>(
    initialTipoParam === "debito" ? "DEBITO" : "CREDITO"
  )
  const isCredit = tipo === "CREDITO"
  const [motivo, setMotivo] = useState<AjusteMotivo>(
    isCredit ? "Devolución de material" : "Intereses por mora"
  )
  const [observaciones, setObservaciones] = useState("")
  const [items, setItems] = useState<AdjustmentEditorItem[]>([])
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Estados de proceso / Motion
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [draftSavedSuccess, setDraftSavedSuccess] = useState(false)

  // Referencias para navegación por teclado
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const setCellRef = useCallback(
    (rowIdx: number, col: CellCol, el: HTMLInputElement | null) => {
      const key = `${rowIdx}-${col}`
      if (el) cellRefs.current.set(key, el)
      else cellRefs.current.delete(key)
    },
    []
  )

  const focusCell = useCallback((rowIdx: number, col: CellCol) => {
    requestAnimationFrame(() => {
      const key = `${rowIdx}-${col}`
      const el = cellRefs.current.get(key)
      el?.focus()
      el?.select()
    })
  }, [])

  // Inicialización de Ítems según Origen
  useEffect(() => {
    if (originInvoice && items.length === 0) {
      const initialItems: AdjustmentEditorItem[] = originInvoice.items.map((it, idx) => {
        const qty = Number(it.quantity) || 1
        const netUnit = Number(it.unitPrice) || 0
        const vat = 21

        // Deducir el precio final unitario con IVA incluido
        const grossUnit =
          it.total && qty > 0
            ? Number(it.total) / qty
            : netUnit * (1 + vat / 100)

        const calculated = computeLineTotalsFromGross(qty, grossUnit, vat)

        return {
          id: `item-${idx + 1}`,
          sourceItemId: it.id,
          sourceSku: it.sku || `ITEM-${idx + 1}`,
          originalDescription: it.description,
          noteDescription: it.description,
          originalQuantity: qty,
          quantity: qty,
          grossUnitPrice: calculated.grossUnitPrice,
          netUnitPrice: calculated.netUnitPrice,
          vatUnitPrice: calculated.vatUnitPrice,
          vatRate: vat,
          note: "",
          subtotal: calculated.subtotal,
          tax: calculated.tax,
          total: calculated.total,
        }
      })

      setItems(
        initialItems.length > 0
          ? initialItems
          : [
              {
                id: "item-1",
                sourceSku: "FAC-ORIG",
                originalDescription: `Factura ${originInvoice.visibleNumber ? `FV ${originInvoice.visibleNumber}` : originInvoice.id}`,
                noteDescription: `Ajuste comercial s/ Factura ${originInvoice.visibleNumber ? `FV ${originInvoice.visibleNumber}` : originInvoice.id}`,
                originalQuantity: 1,
                quantity: 1,
                ...computeLineTotalsFromGross(1, Number(originInvoice.total) || 0, 21),
                vatRate: 21,
                note: "",
              },
            ]
      )
    } else if (!originInvoice && items.length === 0) {
      const defaultDesc =
        origenParam === "externo"
          ? `Ajuste s/ Comprobante Ext ${extDocType} ${extPtoVta}-${extNumber}`
          : `Ajuste global por período ${periodFrom} al ${periodTo}`

      setItems([
        {
          id: "item-ext-1",
          sourceSku: "MANUAL",
          originalDescription: defaultDesc,
          noteDescription: defaultDesc,
          originalQuantity: 1,
          quantity: 1,
          ...computeLineTotalsFromGross(1, 0, 21),
          vatRate: 21,
          note: "",
        },
      ])
    }
  }, [
    originInvoice,
    origenParam,
    extDocType,
    extPtoVta,
    extNumber,
    periodFrom,
    periodTo,
    items.length,
  ])

  // Detección de cambios sin guardar
  const isDirty = useMemo(() => {
    return items.some(
      (it) =>
        it.noteDescription.trim() !== it.originalDescription.trim() ||
        it.quantity !== it.originalQuantity ||
        it.grossUnitPrice > 0 ||
        Boolean(observaciones.trim())
    )
  }, [items, observaciones])

  const handleBack = () => {
    if (isDirty) {
      setPendingNavigation("/ventas/documentos-ajuste")
      setLeaveDialogOpen(true)
    } else {
      router.push("/ventas/documentos-ajuste")
    }
  }

  const handleConfirmLeave = () => {
    setLeaveDialogOpen(false)
    router.push(pendingNavigation || "/ventas/documentos-ajuste")
  }

  // Modificación de ítems (con recálculo estricto a partir de P. Final)
  const handleUpdateItem = (
    index: number,
    updates: Partial<AdjustmentEditorItem>
  ) => {
    setItems((prev) => {
      const copy = [...prev]
      const current = { ...copy[index], ...updates }

      const calculated = computeLineTotalsFromGross(
        current.quantity,
        current.grossUnitPrice,
        current.vatRate
      )

      current.grossUnitPrice = calculated.grossUnitPrice
      current.netUnitPrice = calculated.netUnitPrice
      current.vatUnitPrice = calculated.vatUnitPrice
      current.subtotal = calculated.subtotal
      current.tax = calculated.tax
      current.total = calculated.total

      copy[index] = current
      return copy
    })
  }

  // Agregar fila libre o concepto de recargo
  const handleAddManualLine = () => {
    const isDebitNote = tipo === "DEBITO"
    const newIdx = items.length
    const newItem: AdjustmentEditorItem = {
      id: `item-manual-${Date.now()}`,
      sourceSku: isDebitNote ? "RECARGO" : "AJUSTE",
      originalDescription: isDebitNote
        ? "Recargo administrativo / comercial"
        : "Concepto de ajuste manual",
      noteDescription: isDebitNote
        ? "Recargo financiero / comercial acordado"
        : "Bonificación / ajuste manual",
      originalQuantity: 1,
      quantity: 1,
      ...computeLineTotalsFromGross(1, 0, 21),
      vatRate: 21,
      note: "",
    }

    setItems((prev) => [...prev, newItem])
    requestAnimationFrame(() => focusCell(newIdx, "noteDescription"))
  }

  // Agregar ítem de la factura origen si no estaba cargado
  const handleAddFromInvoice = (
    invoiceItem: NonNullable<typeof originInvoice>["items"][0]
  ) => {
    const newIdx = items.length
    const qty = Number(invoiceItem.quantity) || 1
    const gross =
      invoiceItem.total && qty > 0
        ? Number(invoiceItem.total) / qty
        : Number(invoiceItem.unitPrice) * 1.21

    const calculated = computeLineTotalsFromGross(qty, gross, 21)

    const newItem: AdjustmentEditorItem = {
      id: `item-inv-${Date.now()}`,
      sourceItemId: invoiceItem.id,
      sourceSku: invoiceItem.sku || `ITEM-${newIdx + 1}`,
      originalDescription: invoiceItem.description,
      noteDescription: invoiceItem.description,
      originalQuantity: qty,
      quantity: qty,
      grossUnitPrice: calculated.grossUnitPrice,
      netUnitPrice: calculated.netUnitPrice,
      vatUnitPrice: calculated.vatUnitPrice,
      vatRate: 21,
      note: "",
      subtotal: calculated.subtotal,
      tax: calculated.tax,
      total: calculated.total,
    }

    setItems((prev) => [...prev, newItem])
    toast.success(`Ítem "${invoiceItem.description}" agregado al ajuste`)
    requestAnimationFrame(() => focusCell(newIdx, "quantity"))
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.info("El documento de ajuste debe contener al menos una línea.")
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Navegación por Teclado Tab / Enter
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    col: CellCol
  ) => {
    const cols: CellCol[] = ["noteDescription", "quantity", "grossUnitPrice", "note"]
    const colIdx = cols.indexOf(col)

    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault()
      if (colIdx < cols.length - 1) {
        focusCell(rowIdx, cols[colIdx + 1])
      } else if (rowIdx < items.length - 1) {
        focusCell(rowIdx + 1, cols[0])
      } else {
        handleAddManualLine()
      }
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault()
      if (colIdx > 0) {
        focusCell(rowIdx, cols[colIdx - 1])
      } else if (rowIdx > 0) {
        focusCell(rowIdx - 1, cols[cols.length - 1])
      }
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (rowIdx < items.length - 1) {
        focusCell(rowIdx + 1, col)
      } else {
        handleAddManualLine()
      }
    }
  }

  // Totales de la Nota actual (Consistencia exacta: Total nota = suma de totales de línea con IVA)
  const noteTotals = useMemo(() => {
    let subtotal = 0
    let tax = 0
    let total = 0

    for (const it of items) {
      subtotal += it.subtotal
      tax += it.tax
      total += it.total
    }

    return {
      subtotal: subtotal.toFixed(4),
      taxTotal: tax.toFixed(4),
      total: total.toFixed(4),
      subtotalNum: subtotal,
      taxNum: tax,
      totalNum: total,
    }
  }, [items])

  // Cálculos Financieros y Límites sobre la Factura Origen (siempre en valores finales con IVA)
  const financialSummary = useMemo(() => {
    if (!originInvoice) {
      return {
        invoiceTotal: "0.0000",
        paidTotal: "0.0000",
        currentBalance: "0.0000",
        previousCreditTotal: "0.0000",
        previousDebitTotal: "0.0000",
        availableToCredit: "0.0000",
        projectedNewBalance: "0.0000",
        pendingResolutionCredit: "0.0000",
        isExceeded: false,
      }
    }

    const relatedDocs = documentos.filter(
      (d) => d.invoiceId === originInvoice.id && d.state === "Emitida"
    )

    let prevCredits = BigInt(0)
    let prevDebits = BigInt(0)

    for (const d of relatedDocs) {
      const parsed = parseDecimalScale4(d.total) ?? BigInt(0)
      if (d.tipo === "CREDITO") {
        prevCredits += parsed
      } else {
        prevDebits += parsed
      }
    }

    const invTotalBigInt = parseDecimalScale4(originInvoice.total) ?? BigInt(0)
    const paidBigInt = parseDecimalScale4(originInvoice.paidTotal) ?? BigInt(0)
    const currentNoteBigInt = parseDecimalScale4(noteTotals.total) ?? BigInt(0)

    // Total original ajustable = Factura + ND previas
    const totalAjustable = invTotalBigInt + prevDebits

    // Disponible para acreditar = Total ajustable - NC previas
    let availableBigInt = totalAjustable - prevCredits
    if (availableBigInt < BigInt(0)) availableBigInt = BigInt(0)

    // Validar si la NC excede el disponible
    const isExceeded = isCredit && currentNoteBigInt > availableBigInt

    // Saldo proyectado y crédito pendiente
    let netTotalAfterThisNote = totalAjustable - prevCredits
    if (isCredit) {
      netTotalAfterThisNote -= currentNoteBigInt
    } else {
      netTotalAfterThisNote += currentNoteBigInt
    }

    let projectedBalanceBigInt = netTotalAfterThisNote - paidBigInt
    if (projectedBalanceBigInt < BigInt(0)) projectedBalanceBigInt = BigInt(0)

    let pendingCreditBigInt = paidBigInt - netTotalAfterThisNote
    if (pendingCreditBigInt < BigInt(0)) pendingCreditBigInt = BigInt(0)

    return {
      invoiceTotal: originInvoice.total,
      paidTotal: originInvoice.paidTotal,
      currentBalance: originInvoice.balance,
      previousCreditTotal: (Number(prevCredits) / 10000).toFixed(4),
      previousDebitTotal: (Number(prevDebits) / 10000).toFixed(4),
      availableToCredit: (Number(availableBigInt) / 10000).toFixed(4),
      projectedNewBalance: (Number(projectedBalanceBigInt) / 10000).toFixed(4),
      pendingResolutionCredit: (Number(pendingCreditBigInt) / 10000).toFixed(4),
      isExceeded,
    }
  }, [originInvoice, documentos, noteTotals.total, isCredit])

  // Navegación al Paso 3: Revisión con transición y validación
  const handleGoToRevision = () => {
    if (financialSummary.isExceeded) {
      toast.error(
        `El total de la Nota de Crédito excede el disponible para acreditar (${formatDecimalCurrency(financialSummary.availableToCredit)}).`
      )
      return
    }
    if (noteTotals.totalNum <= 0) {
      toast.error("El total del ajuste debe ser mayor a cero.")
      return
    }
    if (!motivo) {
      toast.error("Seleccioná un motivo válido para continuar.")
      return
    }

    const draftPayload = {
      tipo,
      motivo,
      observaciones,
      origenParam,
      facturaOrigenId: originInvoice?.id || null,
      extDocType,
      extPtoVta,
      extNumber,
      extIssueDate,
      extIssuerCuit,
      extCae,
      extClientName,
      periodFrom,
      periodTo,
      items: items.map((it) => ({
        ...it,
        subtotal: it.subtotal.toFixed(4),
        tax: it.tax.toFixed(4),
        total: it.total.toFixed(4),
        unitPrice: it.netUnitPrice.toFixed(4), // Se envía neto al backend para compatibilidad
        grossUnitPrice: it.grossUnitPrice.toFixed(4),
      })),
      totals: {
        subtotal: noteTotals.subtotal,
        taxTotal: noteTotals.taxTotal,
        total: noteTotals.total,
      },
      financialSummary,
    }

    sessionStorage.setItem("OSSUM_ADJUSTMENT_DRAFT", JSON.stringify(draftPayload))
    router.push("/ventas/documentos-ajuste/nueva/revision")
  }

  // Guardar como Borrador en BD local con feedback y bloqueo de doble click
  const handleSaveDraft = async () => {
    if (isSavingDraft) return
    setIsSavingDraft(true)

    try {
      let invoiceId = originInvoice?.id || `ext-${Date.now()}`
      let invoiceNumber = originInvoice?.visibleNumber
        ? String(originInvoice.visibleNumber)
        : originInvoice?.id.slice(0, 8) || `${extPtoVta}-${extNumber}`
      let clientName =
        ((originInvoice?.metadata as Record<string, unknown>)?.clientName as string) ||
        extClientName ||
        "Cliente General"

      if (origenParam === "periodo") {
        invoiceId = `period-${Date.now()}`
        invoiceNumber = `PER ${periodFrom} - ${periodTo}`
        clientName = "Ajuste Período General"
      }

      const docItems: DocumentoAjusteItem[] = items.map((it) => ({
        id: it.id,
        description: it.noteDescription,
        quantity: it.quantity,
        unitPrice: it.netUnitPrice.toFixed(4),
        subtotal: it.subtotal.toFixed(4),
        adjustedQuantity: it.quantity,
        adjustedAmount: it.total.toFixed(4),
      }))

      addDocumento({
        visibleNumber: null,
        tipo,
        state: "Borrador",
        invoiceId,
        invoiceNumber,
        surgeryId: originInvoice?.surgeryId ?? null,
        clientName,
        modalidad: "PARCIAL",
        motivo,
        observaciones: observaciones.trim() || undefined,
        total: noteTotals.total,
        impacto: isCredit
          ? `-${formatDecimalCurrency(noteTotals.total)}`
          : `+${formatDecimalCurrency(noteTotals.total)}`,
        issuedAt: null,
        metadata: {
          originType:
            origenParam === "externo"
              ? "EXTERNAL_INVOICE"
              : origenParam === "periodo"
              ? "PERIOD"
              : "INTERNAL_INVOICE",
        },
        items: docItems,
      })

      setDraftSavedSuccess(true)
      toast.success("Borrador guardado exitosamente")

      setTimeout(() => {
        router.push("/ventas/documentos-ajuste")
      }, 180)
    } catch (err) {
      setIsSavingDraft(false)
      toast.error("Ocurrió un error al guardar el borrador.")
    }
  }

  if (isLoadingInvoices) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
        <Clock className="size-6 animate-spin text-primary" />
        Cargando editor de documento de ajuste...
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="space-y-3 pb-16"
    >
      {/* ─── 1. Header Operativo estilo InvoiceWorkspace ─── */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={isSavingDraft}
            className="h-8 gap-1.5 text-xs font-semibold hover:bg-muted"
          >
            <ArrowLeft className="size-3.5" />
            <span>Documentos de ajuste</span>
          </Button>

          <div className="h-4 w-px bg-border/80" />

          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Scale className="size-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Editor de Documento de Ajuste
            </h1>
          </div>

          {/* Selector interactivo de Tipo de Nota */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => {
                setTipo("CREDITO")
                setMotivo("Devolución de material")
              }}
              disabled={isSavingDraft}
              className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all",
                isCredit
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Nota de Crédito
            </button>
            <button
              type="button"
              onClick={() => {
                setTipo("DEBITO")
                setMotivo("Intereses por mora")
              }}
              disabled={isSavingDraft}
              className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all",
                !isCredit
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Nota de Débito
            </button>
          </div>

          <Badge
            variant="outline"
            className="text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 px-2 py-0.5 rounded-full"
          >
            Borrador operativo
          </Badge>

          <Badge
            variant="outline"
            className="text-[10px] font-semibold tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 px-2 py-0.5 rounded-full"
          >
            Fiscal DEV: Sin solicitar
          </Badge>

          <InfoTooltip
            title="Editor de Notas de Crédito / Débito"
            description="La factura original es un snapshot inmutable. El ingreso se realiza en valor final con IVA incluido, calculando el neto y el IVA automáticamente."
            shortcuts={[
              { key: "Tab / Enter", label: "Navegar celdas" },
              { key: "Shift + Tab", label: "Retroceder celda" },
            ]}
            side="right"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={isSavingDraft}
            className="h-8 text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || draftSavedSuccess}
            className="h-8 gap-1.5 text-xs font-semibold border-border hover:bg-muted shadow-2xs min-w-[130px]"
          >
            {isSavingDraft ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>Guardando...</span>
              </>
            ) : draftSavedSuccess ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span>Guardado</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Guardar borrador</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleGoToRevision}
            disabled={isSavingDraft || financialSummary.isExceeded || noteTotals.totalNum <= 0}
            className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-xs"
          >
            <span>Continuar a revisión</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── 2. Bloque Origen Compacto (Snapshot Inmutable) ─── */}
      <div className="rounded-lg border bg-card p-3 shadow-2xs">
        <div className="flex items-center justify-between border-b pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Comprobante / Origen Asociado (Snapshot de Solo Lectura)
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-emerald-500/30 text-emerald-700 bg-emerald-500/10 font-medium"
          >
            {origenParam === "externo"
              ? "Comprobante Externo"
              : origenParam === "periodo"
              ? "Período Admin"
              : "Factura Interna Emitida"}
          </Badge>
        </div>

        {origenParam === "externo" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-2.5 rounded-md border">
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                Comprobante Externo:
              </span>
              <span className="font-mono font-bold text-foreground">
                {extDocType} {String(extPtoVta).padStart(4, "0")}-{String(extNumber).padStart(8, "0")}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                Fecha Emisión:
              </span>
              <span className="font-medium text-foreground">{extIssueDate || "Previa"}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                Cliente / CUIT Emisor:
              </span>
              <span className="font-medium text-foreground truncate block">
                {extClientName} {extIssuerCuit ? `(${extIssuerCuit})` : ""}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                CAE Referencia:
              </span>
              <span className="font-mono text-muted-foreground">{extCae || "—"}</span>
            </div>
          </div>
        ) : origenParam === "periodo" ? (
          <div className="bg-muted/30 p-2.5 rounded-md border text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-foreground block">
                Ajuste por Período: {periodFrom} al {periodTo}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Asociación fiscal global bajo normativa ARCA para comprobantes clase A, B y C.
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Admin Only
            </Badge>
          </div>
        ) : originInvoice ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs bg-muted/30 p-2.5 rounded-md border">
              <div>
                <span className="text-[10px] text-muted-foreground block font-medium">
                  Factura Origen:
                </span>
                <span className="font-mono font-bold text-foreground">
                  {originInvoice.visibleNumber
                    ? `FV 0001-${String(originInvoice.visibleNumber).padStart(8, "0")}`
                    : originInvoice.id.slice(0, 10)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-medium">
                  Cliente:
                </span>
                <span className="font-medium text-foreground truncate block">
                  {((originInvoice.metadata as Record<string, unknown>)?.clientName as string) ||
                    "Cliente General"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-medium">
                  Fecha Emisión:
                </span>
                <span className="text-foreground font-medium">
                  {formatDate(originInvoice.issuedAt ?? originInvoice.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-medium">
                  Total Factura:
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatDecimalCurrency(originInvoice.total)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-medium">
                  Cobrado:
                </span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatDecimalCurrency(originInvoice.paidTotal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-medium">
                  Saldo Actual:
                </span>
                <span className="font-mono font-bold text-amber-600">
                  {formatDecimalCurrency(originInvoice.balance)}
                </span>
              </div>
            </div>

            {originInvoice.surgeryId && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
                <span>Vínculo Cirugía / Expediente:</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-indigo-500/30 text-indigo-700 bg-indigo-500/10"
                >
                  <Stethoscope className="size-3 mr-1 inline" />
                  {originInvoice.surgeryId}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2.5 text-xs text-rose-600 bg-rose-500/10 rounded-md border border-rose-500/30">
            No se ha seleccionado una factura de origen válida.
          </div>
        )}
      </div>

      {/* ─── 3. Tabla Densa de Ítems del Ajuste con P. FINAL (IVA INC.) ─── */}
      <div className="space-y-1 rounded-lg border bg-card p-3 shadow-2xs">
        <div className="flex items-center justify-between px-0.5 pb-1">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Ítems / Detalle del Ajuste
          </span>
          <span className="text-[11px] text-muted-foreground">
            Ingreso en valor final con IVA incluido · Navegación: <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Tab</kbd> /{" "}
            <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Enter</kbd>
          </span>
        </div>

        {/* Barra de Acciones Rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-200/90 dark:bg-slate-800/90 p-1.5 rounded-lg border border-slate-300 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center gap-1.5">
            {/* Selector de Ítems de la Factura Origen */}
            {originInvoice && originInvoice.items.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                    title="Cargar ítem referenciado de la factura origen"
                  >
                    <Plus className="size-3.5" />
                    <span>+ Ítem Factura Origen</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-1 text-xs" align="start">
                  <div className="p-1.5 font-bold border-b text-[11px] text-muted-foreground">
                    Seleccionar ítem a agregar al ajuste:
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y">
                    {originInvoice.items.map((invItem) => (
                      <button
                        key={invItem.id}
                        type="button"
                        onClick={() => handleAddFromInvoice(invItem)}
                        className="w-full text-left p-2 hover:bg-muted/60 flex flex-col gap-0.5 transition-colors"
                      >
                        <div className="font-semibold text-foreground truncate text-xs">
                          {invItem.description}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                          <span>Cant: {invItem.quantity}u</span>
                          <span className="font-mono font-bold">
                            {formatDecimalCurrency(invItem.total || invItem.unitPrice)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Botón Línea Manual / Recargo */}
            <button
              type="button"
              onClick={handleAddManualLine}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs transition-colors"
              title="Cargar línea flexible de ajuste o recargo"
            >
              <Plus className="size-3.5 text-primary" />
              <span>+ Línea de Ajuste</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="hidden sm:inline font-medium text-[11px]">Atajos:</span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 shadow-2xs">
              <kbd className="font-bold text-slate-900 dark:text-slate-100">Tab</kbd> /{" "}
              <kbd className="font-bold text-slate-900 dark:text-slate-100">Enter</kbd> Siguiente
            </span>
          </div>
        </div>

        {/* Grilla Densa */}
        <div className="flex flex-col border border-slate-300 dark:border-slate-700/80 rounded-lg overflow-hidden bg-slate-100/70 dark:bg-slate-900/60 shadow-xs">
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full border-collapse text-xs table-fixed">
              <thead className="sticky top-0 z-10 bg-slate-200/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-300 dark:border-slate-700 select-none shadow-2xs">
                <tr className="text-slate-800 dark:text-slate-200 font-bold text-[10px] uppercase tracking-wider">
                  <th
                    style={{ width: COL_WIDTHS.sourceRef }}
                    className="px-2 py-2 text-left border-r border-slate-300 dark:border-slate-700"
                  >
                    Ref / SKU
                  </th>
                  <th className="px-2.5 py-2 text-left border-r border-slate-300 dark:border-slate-700">
                    Descripción para la Nota (Editable){" "}
                    <span className="text-destructive font-bold">*</span>
                  </th>
                  <th
                    style={{ width: COL_WIDTHS.quantity }}
                    className="px-2 py-2 text-right border-r border-slate-300 dark:border-slate-700"
                  >
                    Cant. <span className="text-destructive font-bold">*</span>
                  </th>
                  <th
                    style={{ width: COL_WIDTHS.grossUnitPrice }}
                    className="px-2 py-2 text-right border-r border-slate-300 dark:border-slate-700 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                  >
                    P. FINAL (IVA INC.){" "}
                    <span className="text-destructive font-bold">*</span>
                  </th>
                  <th
                    style={{ width: COL_WIDTHS.vat }}
                    className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    IVA
                  </th>
                  <th
                    style={{ width: COL_WIDTHS.total }}
                    className="px-2.5 py-2 text-right border-r border-slate-300 dark:border-slate-700 bg-primary/10 text-primary font-bold"
                  >
                    Total línea
                  </th>
                  <th
                    style={{ width: COL_WIDTHS.note }}
                    className="px-2 py-2 text-left border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Nota
                  </th>
                  <th style={{ width: COL_WIDTHS.delete }} className="px-1 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((item, idx) => {
                  const hasDescError = !item.noteDescription.trim()
                  const hasQtyError = item.quantity <= 0
                  const hasPriceError = item.grossUnitPrice <= 0

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "h-8 transition-colors duration-75",
                        idx % 2 === 1
                          ? "bg-slate-50/80 dark:bg-slate-900/50"
                          : "bg-white dark:bg-slate-950",
                        "hover:bg-primary/5 dark:hover:bg-primary/10"
                      )}
                    >
                      {/* Ref / SKU */}
                      <td
                        style={{ width: COL_WIDTHS.sourceRef }}
                        className="border-r border-slate-200 dark:border-slate-800 px-2 py-1"
                      >
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground block truncate">
                          {item.sourceSku || "—"}
                        </span>
                      </td>

                      {/* Descripción para la Nota (Editable) */}
                      <td className="border-r border-slate-200 dark:border-slate-800 p-0">
                        <div className="flex flex-col justify-center h-full px-1">
                          <input
                            ref={(el) => setCellRef(idx, "noteDescription", el)}
                            value={item.noteDescription}
                            onChange={(e) =>
                              handleUpdateItem(idx, { noteDescription: e.target.value })
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, idx, "noteDescription")}
                            placeholder="Descripción de la línea de ajuste..."
                            className={cn(
                              CELL_INPUT,
                              "font-medium",
                              hasDescError && CELL_INPUT_ERROR
                            )}
                          />
                          {item.originalDescription !== item.noteDescription && (
                            <span className="text-[9px] text-muted-foreground px-2 pb-0.5 truncate block">
                              Orig: {item.originalDescription}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cantidad Ajustada */}
                      <td
                        style={{ width: COL_WIDTHS.quantity }}
                        className="border-r border-slate-200 dark:border-slate-800 p-0"
                      >
                        <input
                          ref={(el) => setCellRef(idx, "quantity", el)}
                          type="number"
                          min={0.01}
                          step="any"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            handleUpdateItem(idx, {
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          onKeyDown={(e) => handleCellKeyDown(e, idx, "quantity")}
                          className={cn(CELL_INPUT_NUM, hasQtyError && CELL_INPUT_ERROR)}
                        />
                      </td>

                      {/* Precio Final Unitario con IVA Incluido */}
                      <td
                        style={{ width: COL_WIDTHS.grossUnitPrice }}
                        className="border-r border-slate-200 dark:border-slate-800 p-0 bg-emerald-500/5"
                      >
                        <div className="flex flex-col justify-center h-full">
                          <input
                            ref={(el) => setCellRef(idx, "grossUnitPrice", el)}
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.grossUnitPrice || ""}
                            onChange={(e) =>
                              handleUpdateItem(idx, {
                                grossUnitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            onKeyDown={(e) => handleCellKeyDown(e, idx, "grossUnitPrice")}
                            placeholder="0.00"
                            className={cn(
                              CELL_INPUT_NUM,
                              "font-semibold text-emerald-950 dark:text-emerald-200",
                              hasPriceError && CELL_INPUT_ERROR
                            )}
                          />
                          {item.grossUnitPrice > 0 && item.vatRate > 0 && (
                            <span className="text-[9px] text-muted-foreground text-right px-2 pb-0.5 font-mono block">
                              Neto: {formatDecimalCurrency(item.netUnitPrice)} · IVA {item.vatRate}%: {formatDecimalCurrency(item.vatUnitPrice)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* IVA */}
                      <td
                        style={{ width: COL_WIDTHS.vat }}
                        className="border-r border-slate-200 dark:border-slate-800 p-0"
                      >
                        <div className="flex items-center justify-center h-full px-0.5">
                          <Select
                            value={String(item.vatRate)}
                            onValueChange={(v) =>
                              handleUpdateItem(idx, { vatRate: parseFloat(v) })
                            }
                          >
                            <SelectTrigger className="h-6 text-xs w-full border-0 bg-transparent shadow-none p-0 px-1 hover:bg-primary/10 focus:ring-1.5 focus:ring-primary text-center font-bold text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {IVA_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>

                      {/* Total Línea */}
                      <td
                        style={{ width: COL_WIDTHS.total }}
                        className="border-r border-slate-200 dark:border-slate-800 p-0 bg-primary/5 dark:bg-primary/10"
                      >
                        <div className="px-2.5 py-1 text-right font-mono font-bold text-xs text-primary dark:text-primary-foreground">
                          {formatCurrency(item.total)}
                        </div>
                      </td>

                      {/* Nota de Línea */}
                      <td
                        style={{ width: COL_WIDTHS.note }}
                        className="border-r border-slate-200 dark:border-slate-800 p-0"
                      >
                        <input
                          ref={(el) => setCellRef(idx, "note", el)}
                          value={item.note || ""}
                          onChange={(e) => handleUpdateItem(idx, { note: e.target.value })}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, "note")}
                          placeholder="Nota..."
                          className={cn(CELL_INPUT, "text-[11px] truncate font-normal")}
                        />
                      </td>

                      {/* Delete */}
                      <td style={{ width: COL_WIDTHS.delete }} className="p-0">
                        <div className="flex items-center justify-center h-full">
                          <button
                            type="button"
                            className="size-5.5 flex items-center justify-center rounded-xs text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleRemoveItem(idx)}
                            title="Eliminar fila de ajuste"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-300 dark:border-slate-700/80 bg-slate-200/70 dark:bg-slate-800/70 px-3 py-1.5 flex items-center justify-between">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group"
              onClick={handleAddManualLine}
            >
              <span className="size-4 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Plus className="size-3" />
              </span>
              <span>Agregar fila de ajuste</span>
            </button>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {items.length} {items.length === 1 ? "línea de ajuste" : "líneas de ajuste"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4. Banda Inferior: Solapas Compactas + Resumen Sticky ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
        {/* Solapas de Parámetros (Izquierda en Desktop) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Tabs defaultValue="reason" className="w-full">
            <TabsList className="h-8 w-full justify-start bg-slate-200/80 dark:bg-slate-800/80 p-0.5 border border-slate-300 dark:border-slate-700/80">
              <TabsTrigger
                value="reason"
                className="text-xs font-semibold px-3 py-1 data-[state=active]:bg-background data-[state=active]:shadow-2xs"
              >
                <FileCheck className="size-3.5 mr-1 text-primary" /> Motivo y condiciones
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="text-xs font-semibold px-3 py-1 data-[state=active]:bg-background data-[state=active]:shadow-2xs"
              >
                <MessageSquare className="size-3.5 mr-1 text-amber-600 dark:text-amber-400" />{" "}
                Observaciones al pie
              </TabsTrigger>
              <TabsTrigger
                value="fiscal"
                className="text-xs font-semibold px-3 py-1 data-[state=active]:bg-background data-[state=active]:shadow-2xs"
              >
                <ShieldCheck className="size-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />{" "}
                Evidencia fiscal DEV
              </TabsTrigger>
            </TabsList>

            <div className="rounded-lg border border-slate-300/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-3 mt-1.5 shadow-2xs">
              {/* Tab 1: Motivo y Condiciones */}
              <TabsContent value="reason" className="m-0 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="adj-motivo" className="text-[11px] font-semibold text-muted-foreground">
                      Motivo Principal del Ajuste <span className="text-destructive font-bold">*</span>
                    </Label>
                    <select
                      id="adj-motivo"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value as AjusteMotivo)}
                      className="w-full h-8 px-2 text-xs bg-background border rounded-md text-foreground font-medium"
                    >
                      {(isCredit ? MOTIVOS_NC : MOTIVOS_ND).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Modalidad de la Nota
                    </Label>
                    <div className="flex items-center h-8 px-2.5 rounded-md bg-muted/40 border text-xs font-medium text-foreground">
                      <span>Ajuste Parcial / Renglones Específicos</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Observaciones */}
              <TabsContent value="notes" className="m-0 space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="adj-notes" className="text-[11px] font-semibold text-muted-foreground">
                    Leyenda u Observación al pie del Comprobante
                  </Label>
                  <textarea
                    id="adj-notes"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Texto que figurará en el pie de la nota impresa (justificación comercial, acuerdo, referencia)..."
                    className="w-full h-14 p-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-background resize-none focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
                  />
                </div>
              </TabsContent>

              {/* Tab 3: Evidencia Fiscal */}
              <TabsContent value="fiscal" className="m-0 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border">
                  <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[11px] leading-relaxed">
                    <p className="font-semibold text-foreground">
                      Modo de Emisión y Trazabilidad Fiscal
                    </p>
                    <p>
                      La descripción editada en esta grilla será la que figure en el comprobante fiscal y en el PDF oficial. La factura origen permanece 100% inalterada para auditoría.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Resumen Financiero Sticky (Derecha en Desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          <Card className="border border-slate-300 dark:border-slate-700 shadow-sm bg-card">
            <CardHeader className="p-3.5 pb-2 border-b bg-muted/30 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                Impacto Financiero Proyectado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3 text-xs">
              {/* Desglose Factura Origen */}
              {originInvoice ? (
                <div className="space-y-1.5 border-b pb-2.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total Factura Original:</span>
                    <span className="font-mono font-bold text-foreground">
                      {formatDecimalCurrency(financialSummary.invoiceTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>NC Emitidas Previas:</span>
                    <span className="font-mono text-amber-600">
                      -{formatDecimalCurrency(financialSummary.previousCreditTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>ND Emitidas Previas:</span>
                    <span className="font-mono text-indigo-600">
                      +{formatDecimalCurrency(financialSummary.previousDebitTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-border/40 font-semibold text-foreground">
                    <span>Disponible para Acreditar:</span>
                    <span className="font-mono text-emerald-600">
                      {formatDecimalCurrency(financialSummary.availableToCredit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Cobros Imputados:</span>
                    <span className="font-mono text-emerald-600">
                      {formatDecimalCurrency(financialSummary.paidTotal)}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Total de esta Nota */}
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">
                    Total {isCredit ? "Nota de Crédito" : "Nota de Débito"}:
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm font-bold",
                      isCredit
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-indigo-700 dark:text-indigo-400"
                    )}
                  >
                    {isCredit ? "-" : "+"}
                    {formatDecimalCurrency(noteTotals.total)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Neto: {formatDecimalCurrency(noteTotals.subtotal)}</span>
                  <span>IVA: {formatDecimalCurrency(noteTotals.taxTotal)}</span>
                </div>
              </div>

              {/* Saldo Exigible Proyectado */}
              {originInvoice ? (
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Nuevo Saldo Exigible:
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Saldo a cobrar tras aplicar nota
                      </span>
                    </div>
                    <span className="font-mono text-base font-bold text-foreground">
                      {formatDecimalCurrency(financialSummary.projectedNewBalance)}
                    </span>
                  </div>

                  {/* Alerta de Crédito Pendiente de Resolución */}
                  {Number(financialSummary.pendingResolutionCredit) > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="size-4 text-amber-600 shrink-0" />
                        Crédito pendiente de resolución
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-95">
                        Cobros registrados superan el nuevo saldo exigible en{" "}
                        <strong className="font-mono">
                          {formatDecimalCurrency(financialSummary.pendingResolutionCredit)}
                        </strong>
                        . No se genera saldo a favor automático hasta resolución administrativa.
                      </p>
                    </div>
                  )}

                  {/* Alerta de Límite de NC Excedido */}
                  {financialSummary.isExceeded && (
                    <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
                        <AlertCircle className="size-4 shrink-0" />
                        Límite de crédito excedido
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        El total de esta NC supera el disponible para acreditar (
                        {formatDecimalCurrency(financialSummary.availableToCredit)}). Reducí los
                        importes para continuar.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── 5. Footer Fijo de Acciones estilo InvoiceWorkspace ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-md px-4 py-2.5 shadow-lg flex items-center justify-between sm:justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBack}
          disabled={isSavingDraft}
          className="h-8 text-xs"
        >
          Cancelar
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSaveDraft}
          disabled={isSavingDraft || draftSavedSuccess}
          className="h-8 gap-1.5 text-xs font-semibold border-border hover:bg-muted shadow-2xs min-w-[130px]"
        >
          {isSavingDraft ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>Guardando...</span>
            </>
          ) : draftSavedSuccess ? (
            <>
              <Check className="size-3.5 text-emerald-600" />
              <span>Guardado</span>
            </>
          ) : (
            <>
              <Save className="size-3.5" />
              <span>Guardar borrador</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          onClick={handleGoToRevision}
          disabled={isSavingDraft || financialSummary.isExceeded || noteTotals.totalNum <= 0}
          className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-xs px-4"
        >
          <span>Continuar a revisión</span>
          <ArrowRight className="size-3.5" />
        </Button>
      </div>

      {/* Dialog de Confirmación de Descarte de Cambios */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              ¿Descartar cambios sin guardar?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1 leading-relaxed">
              Tenés modificaciones cargadas en este documento de ajuste que se perderán si salís del formulario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLeaveDialogOpen(false)}
              className="text-xs"
            >
              Continuar editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmLeave}
              className="text-xs"
            >
              Descartar y salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
