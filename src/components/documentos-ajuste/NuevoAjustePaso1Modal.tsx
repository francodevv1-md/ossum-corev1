"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck,
  FileSearch,
  Filter,
  Layers,
  Receipt,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from "lucide-react"

import type { AjusteTipo } from "@/types/documentos-ajuste"
import { useInvoices } from "@/hooks/useInvoices"
import type { InvoiceApiRow } from "@/lib/api/invoices"
import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"
import { formatDate } from "@/lib/formatters"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { HelpTip } from "@/components/ui/info-tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type OriginMode = "INTERNAL_INVOICE" | "EXTERNAL_INVOICE" | "PERIOD"

interface NuevoAjustePaso1ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTipo?: AjusteTipo
  initialFacturaOrigenId?: string
}

export function NuevoAjustePaso1Modal({
  open,
  onOpenChange,
  initialTipo = "CREDITO",
  initialFacturaOrigenId,
}: NuevoAjustePaso1ModalProps) {
  const router = useRouter()
  const { invoices, loading: isLoading } = useInvoices()

  // 1. Tipo de Documento
  const [tipo, setTipo] = useState<AjusteTipo>(initialTipo)
  const isCredit = tipo === "CREDITO"

  // 2. Origen del Ajuste
  const [originMode, setOriginMode] = useState<OriginMode>("INTERNAL_INVOICE")

  // Origen 1: Factura Interna
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialFacturaOrigenId ?? "")
  const [searchQuery, setSearchQuery] = useState("")
  const [balanceFilter, setBalanceFilter] = useState<"all" | "with_balance" | "zero_balance">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "balance_desc" | "total_desc">("date_desc")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Origen 2: Comprobante Externo
  const [extDocType, setExtDocType] = useState("FACTURA B")
  const [extPtoVta, setExtPtoVta] = useState("1")
  const [extNumber, setExtNumber] = useState("")
  const [extIssueDate, setExtIssueDate] = useState("")
  const [extIssuerCuit, setExtIssuerCuit] = useState("")
  const [extCae, setExtCae] = useState("")
  const [extClientName, setExtClientName] = useState("")

  // Origen 3: Período
  const [periodFrom, setPeriodFrom] = useState("")
  const [periodTo, setPeriodTo] = useState("")

  // Factura interna seleccionada
  const selectedInvoice = useMemo(
    () => invoices.find((inv) => inv.id === selectedInvoiceId),
    [invoices, selectedInvoiceId],
  )

  const isEligibleInvoice =
    selectedInvoice &&
    (selectedInvoice.state === "Emitida" || selectedInvoice.state === "Parcialmente_cobrada")

  // Filtrado y ordenamiento de facturas internas
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // Filtro de texto universal
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase().trim()
          const num = inv.visibleNumber ? `fv ${inv.visibleNumber} ${String(inv.visibleNumber).padStart(8, "0")}` : `borrador ${inv.id}`
          const client = ((inv.metadata as Record<string, unknown>)?.clientName as string || "").toLowerCase()
          const surgery = (inv.surgeryId || "").toLowerCase()
          const id = inv.id.toLowerCase()

          const matches = num.includes(q) || client.includes(q) || surgery.includes(q) || id.includes(q)
          if (!matches) return false
        }

        // Filtro por saldo
        if (balanceFilter === "with_balance") {
          const balance = parseDecimalScale4(inv.balance) ?? BigInt(0)
          if (balance <= BigInt(0)) return false
        } else if (balanceFilter === "zero_balance") {
          const balance = parseDecimalScale4(inv.balance) ?? BigInt(0)
          if (balance > BigInt(0)) return false
        }

        // Filtro por fecha de emisión
        const issuedDate = inv.issuedAt ? inv.issuedAt.slice(0, 10) : inv.createdAt.slice(0, 10)
        if (dateFrom && issuedDate < dateFrom) return false
        if (dateTo && issuedDate > dateTo) return false

        return true
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          const dateA = a.issuedAt ?? a.createdAt
          const dateB = b.issuedAt ?? b.createdAt
          return dateB.localeCompare(dateA)
        }
        if (sortBy === "date_asc") {
          const dateA = a.issuedAt ?? a.createdAt
          const dateB = b.issuedAt ?? b.createdAt
          return dateA.localeCompare(dateB)
        }
        if (sortBy === "balance_desc") {
          const balA = parseDecimalScale4(a.balance) ?? BigInt(0)
          const balB = parseDecimalScale4(b.balance) ?? BigInt(0)
          return balA > balB ? -1 : 1
        }
        if (sortBy === "total_desc") {
          const totA = parseDecimalScale4(a.total) ?? BigInt(0)
          const totB = parseDecimalScale4(b.total) ?? BigInt(0)
          return totA > totB ? -1 : 1
        }
        return 0
      })
  }, [invoices, searchQuery, balanceFilter, dateFrom, dateTo, sortBy])

  // Paginación
  const totalItems = filteredInvoices.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredInvoices.slice(start, start + pageSize)
  }, [filteredInvoices, currentPage, pageSize])

  // Reset de página al buscar o filtrar
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setBalanceFilter("all")
    setDateFrom("")
    setDateTo("")
    setSortBy("date_desc")
    setCurrentPage(1)
  }

  const hasActiveFilters = Boolean(
    searchQuery || balanceFilter !== "all" || dateFrom || dateTo || sortBy !== "date_desc",
  )

  // Continuar al formulario de edición
  const handleContinue = () => {
    const tipoParam = tipo === "CREDITO" ? "credito" : "debito"
    onOpenChange(false)

    if (originMode === "INTERNAL_INVOICE") {
      if (!selectedInvoice || !isEligibleInvoice) return
      router.push(
        `/ventas/documentos-ajuste/nueva/editor?tipo=${tipoParam}&facturaOrigen=${selectedInvoice.id}`,
      )
    } else if (originMode === "EXTERNAL_INVOICE") {
      const params = new URLSearchParams({
        tipo: tipoParam,
        origen: "externo",
        extDocType,
        extPtoVta,
        extNumber,
        extIssueDate,
        extIssuerCuit,
        extCae,
        extClientName,
      })
      router.push(`/ventas/documentos-ajuste/nueva/editor?${params.toString()}`)
    } else if (originMode === "PERIOD") {
      const params = new URLSearchParams({
        tipo: tipoParam,
        origen: "periodo",
        periodFrom,
        periodTo,
      })
      router.push(`/ventas/documentos-ajuste/nueva/editor?${params.toString()}`)
    }
  }

  // Validación de botón continuar
  const isContinueDisabled = useMemo(() => {
    if (originMode === "INTERNAL_INVOICE") {
      return !selectedInvoice || !isEligibleInvoice
    }
    if (originMode === "EXTERNAL_INVOICE") {
      return !extDocType || !extPtoVta || !extNumber || !extIssueDate
    }
    if (originMode === "PERIOD") {
      return !periodFrom || !periodTo || periodFrom > periodTo
    }
    return true
  }, [
    originMode,
    selectedInvoice,
    isEligibleInvoice,
    extDocType,
    extPtoVta,
    extNumber,
    extIssueDate,
    periodFrom,
    periodTo,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl h-[90vh] max-h-[860px] p-0 flex flex-col overflow-hidden bg-background text-foreground shadow-2xl border">
        {/* 1. Header Fijo */}
        <DialogHeader className="p-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  Nuevo documento de ajuste
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                    Paso 1 de 2
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Seleccioná el tipo de nota y el comprobante o período origen para vincular la operación.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 2. Cuerpo Principal */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Bloque A: Tipo de Documento */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
              1. Tipo de documento
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo("CREDITO")}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  isCredit
                    ? "border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/40"
                    : "border-border hover:bg-muted/40 hover:border-muted-foreground/30"
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg shrink-0 ${
                    isCredit
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <TrendingDown className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">Nota de crédito (NC)</p>
                    {isCredit && (
                      <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 h-4">
                        Disminución
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Disminución o bonificación del saldo de la factura origen por devoluciones o diferencias comerciales.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipo("DEBITO")}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  !isCredit
                    ? "border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/40"
                    : "border-border hover:bg-muted/40 hover:border-muted-foreground/30"
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg shrink-0 ${
                    !isCredit
                      ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">Nota de débito (ND)</p>
                    {!isCredit && (
                      <Badge className="bg-indigo-500 text-white text-[9px] px-1.5 py-0 h-4">
                        Incremento
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Incremento o recargo sobre la factura original por mora, gastos administrativos o ajustes financieros.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Bloque B: Selector de Origen (Tabs) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                2. Origen del comprobante
                <HelpTip text="Podés vincular la nota a una factura interna emitida en OSSUM, a un comprobante externo preexistente, o a un período (exclusivo admin)." />
              </label>
              <span className="text-[11px] font-medium text-muted-foreground">
                Inmutable tras la creación
              </span>
            </div>

            {/* Tabs de Origen */}
            <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-lg border w-fit">
              <button
                type="button"
                onClick={() => setOriginMode("INTERNAL_INVOICE")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  originMode === "INTERNAL_INVOICE"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Receipt className="size-3.5" />
                Factura interna OSSUM
              </button>

              <button
                type="button"
                onClick={() => setOriginMode("EXTERNAL_INVOICE")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  originMode === "EXTERNAL_INVOICE"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ExternalLink className="size-3.5" />
                Comprobante externo previo
              </button>

              <button
                type="button"
                onClick={() => setOriginMode("PERIOD")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  originMode === "PERIOD"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="size-3.5" />
                Por período (Admin)
              </button>
            </div>

            {/* CASO 1: BÚSQUEDA AVANZADA EN MILES DE FACTURAS INTERNAS */}
            {originMode === "INTERNAL_INVOICE" && (
              <div className="space-y-3 pt-1">
                {/* Barra de Búsqueda y Filtros Rápidos */}
                <div className="p-3 bg-muted/20 border rounded-xl space-y-2.5">
                  <div className="flex flex-col md:flex-row items-center gap-2.5">
                    {/* Buscador Universal */}
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Buscar por N° factura (ej: 9901), cliente, obra social, ID o cirugía..."
                        className="pl-9 h-9 text-xs bg-background"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => handleSearchChange("")}
                          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>

                    {/* Filtro de Saldo */}
                    <div className="flex items-center gap-1 shrink-0 w-full md:w-auto">
                      <select
                        value={balanceFilter}
                        onChange={(e) => {
                          setBalanceFilter(e.target.value as "all" | "with_balance" | "zero_balance")
                          setCurrentPage(1)
                        }}
                        className="h-9 px-2.5 text-xs bg-background border rounded-lg text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-auto"
                      >
                        <option value="all">Todos los saldos</option>
                        <option value="with_balance">Con saldo pendiente (&gt; $0)</option>
                        <option value="zero_balance">Totalmente cobradas ($0)</option>
                      </select>
                    </div>

                    {/* Ordenamiento */}
                    <div className="flex items-center gap-1 shrink-0 w-full md:w-auto">
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value as any)
                          setCurrentPage(1)
                        }}
                        className="h-9 px-2.5 text-xs bg-background border rounded-lg text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-auto"
                      >
                        <option value="date_desc">Más recientes primero</option>
                        <option value="date_asc">Más antiguas primero</option>
                        <option value="balance_desc">Mayor saldo pendiente</option>
                        <option value="total_desc">Mayor importe total</option>
                      </select>
                    </div>
                  </div>

                  {/* Filtro secundario de fechas y conteo */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        Emisión:
                      </span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="h-7 px-2 text-[11px] bg-background border rounded text-foreground"
                      />
                      <span className="text-muted-foreground text-[11px]">a</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="h-7 px-2 text-[11px] bg-background border rounded text-foreground"
                      />
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearFilters}
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                        >
                          <RotateCcw className="size-3" />
                          Limpiar filtros
                        </Button>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground font-mono">
                      Mostrando <strong className="text-foreground">{totalItems}</strong> facturas emitidas encontradas
                    </div>
                  </div>
                </div>

                {/* Tabla de Facturas Scrolleable de Gran Capacidad */}
                <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                  <div className="max-h-64 overflow-y-auto divide-y divide-border">
                    {isLoading ? (
                      <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                        <Clock className="size-5 animate-spin text-primary" />
                        Cargando catálogo de facturas emitidas...
                      </div>
                    ) : paginatedInvoices.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                        <FileSearch className="size-6 text-muted-foreground/60" />
                        <p className="font-semibold text-foreground">No se encontraron facturas con esos criterios</p>
                        <p className="text-[11px]">Probá ajustando los términos de búsqueda o el rango de fechas.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-muted/40 sticky top-0 z-10 border-b text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          <tr>
                            <th className="py-2 px-3 w-10 text-center">Sel</th>
                            <th className="py-2 px-3">Comprobante</th>
                            <th className="py-2 px-3">Emisión</th>
                            <th className="py-2 px-3">Cliente / Razón Social</th>
                            <th className="py-2 px-3">Expediente CX</th>
                            <th className="py-2 px-3 text-right">Total</th>
                            <th className="py-2 px-3 text-right">Saldo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedInvoices.map((inv) => {
                            const isSelected = inv.id === selectedInvoiceId
                            const client =
                              ((inv.metadata as Record<string, unknown>)?.clientName as string) ||
                              "Cliente General / Salud"
                            const isEmitted = inv.state === "Emitida" || inv.state === "Parcialmente_cobrada"
                            const numStr = inv.visibleNumber
                              ? `FV ${inv.visibleNumber}`
                              : `Borrador (${inv.id.slice(0, 6)})`
                            const hasBalance = (parseDecimalScale4(inv.balance) ?? BigInt(0)) > BigInt(0)

                            return (
                              <tr
                                key={inv.id}
                                onClick={() => setSelectedInvoiceId(inv.id)}
                                onDoubleClick={handleContinue}
                                className={`transition-colors cursor-pointer select-none ${
                                  isSelected
                                    ? "bg-primary/10 border-l-4 border-l-primary font-medium"
                                    : !isEmitted
                                    ? "opacity-60 bg-muted/20"
                                    : "hover:bg-muted/40"
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <div
                                    className={`size-4 rounded-full border flex items-center justify-center mx-auto transition-all ${
                                      isSelected
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-muted-foreground/40 bg-background"
                                    }`}
                                  >
                                    {isSelected && <div className="size-1.5 rounded-full bg-background" />}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                                  <div className="flex items-center gap-1.5">
                                    {numStr}
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1 py-0 font-normal ${
                                        isEmitted
                                          ? "border-emerald-500/30 text-emerald-700 bg-emerald-500/10"
                                          : "border-slate-300 text-slate-500 bg-slate-100"
                                      }`}
                                    >
                                      {inv.state || "Borrador"}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                                  {formatDate(inv.issuedAt ?? inv.createdAt)}
                                </td>
                                <td className="py-2.5 px-3 truncate max-w-[200px] text-foreground font-medium">
                                  {client}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {inv.surgeryId ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1.5 py-0 border-indigo-500/30 text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 font-mono"
                                    >
                                      <Stethoscope className="size-2.5 mr-1 inline" />
                                      {inv.surgeryId}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                                  {formatDecimalCurrency(inv.total)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">
                                  <span
                                    className={
                                      hasBalance
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-emerald-600 dark:text-emerald-400"
                                    }
                                  >
                                    {formatDecimalCurrency(inv.balance)}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Paginación Inferior */}
                  {totalPages > 1 && (
                    <div className="p-2.5 bg-muted/20 border-t flex items-center justify-between text-xs">
                      <span className="text-[11px] text-muted-foreground">
                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> (
                        {totalItems} facturas)
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-7 px-2 text-xs"
                        >
                          <ChevronLeft className="size-3.5 mr-1" />
                          Anterior
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-7 px-2 text-xs"
                        >
                          Siguiente
                          <ChevronRight className="size-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alerta si seleccionó una factura no emitida */}
                {selectedInvoice && !isEligibleInvoice && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-700 dark:text-rose-400 text-xs">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Factura no elegible para ajuste</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Solo las facturas en estado <strong>Emitida</strong> pueden recibir notas de ajuste. Los borradores o comprobantes anulados no pueden ajustarse.
                      </p>
                    </div>
                  </div>
                )}

                {/* Resumen de Factura Seleccionada */}
                {selectedInvoice && isEligibleInvoice && (
                  <div className="p-3 bg-muted/30 rounded-xl border space-y-2 animate-in fade-in-50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        Contexto de Factura Seleccionada (Solo lectura)
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {selectedInvoice.visibleNumber ? `FV ${selectedInvoice.visibleNumber}` : selectedInvoice.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-background border">
                        <span className="text-[10px] text-muted-foreground block">Cliente:</span>
                        <span className="font-semibold text-foreground truncate block">
                          {(selectedInvoice.metadata as Record<string, unknown>)?.clientName as string || "Cliente General"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-background border">
                        <span className="text-[10px] text-muted-foreground block">Total Factura:</span>
                        <span className="font-mono font-bold text-foreground block">
                          {formatDecimalCurrency(selectedInvoice.total)}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-background border">
                        <span className="text-[10px] text-muted-foreground block">Total Cobrado:</span>
                        <span className="font-mono font-bold text-emerald-600 block">
                          {formatDecimalCurrency(selectedInvoice.paidTotal)}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-background border">
                        <span className="text-[10px] text-muted-foreground block">Saldo Pendiente:</span>
                        <span className="font-mono font-bold text-amber-600 block">
                          {formatDecimalCurrency(selectedInvoice.balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CASO 2: COMPROBANTE EXTERNO PREVIO */}
            {originMode === "EXTERNAL_INVOICE" && (
              <div className="p-4 bg-muted/20 border rounded-xl space-y-4 pt-3">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">Comprobante externo inmutable</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      Esta nota se vinculará a un comprobante no registrado en OSSUM. La NC no modificará balances internos ni generará saldos a favor automáticos.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Tipo de Comprobante *
                    </label>
                    <select
                      value={extDocType}
                      onChange={(e) => setExtDocType(e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-background border rounded-lg text-foreground"
                    >
                      <option value="FACTURA A">Factura A (001)</option>
                      <option value="FACTURA B">Factura B (006)</option>
                      <option value="FACTURA C">Factura C (011)</option>
                      <option value="FACTURA E">Factura E (019)</option>
                      <option value="RECIBO A">Recibo A (004)</option>
                      <option value="RECIBO B">Recibo B (009)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Punto de Venta *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={99999}
                      value={extPtoVta}
                      onChange={(e) => setExtPtoVta(e.target.value)}
                      placeholder="Ej: 1"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Número de Comprobante *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={99999999}
                      value={extNumber}
                      onChange={(e) => setExtNumber(e.target.value)}
                      placeholder="Ej: 8841"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Fecha de Emisión *
                    </label>
                    <Input
                      type="date"
                      value={extIssueDate}
                      onChange={(e) => setExtIssueDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      CUIT del Emisor
                    </label>
                    <Input
                      value={extIssuerCuit}
                      onChange={(e) => setExtIssuerCuit(e.target.value)}
                      placeholder="30-XXXXXXXX-X"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      CAE Opcional (Evidencia)
                    </label>
                    <Input
                      value={extCae}
                      onChange={(e) => setExtCae(e.target.value)}
                      placeholder="74019283746501"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Cliente / Razón Social Receptor
                    </label>
                    <Input
                      value={extClientName}
                      onChange={(e) => setExtClientName(e.target.value)}
                      placeholder="Nombre o Razón Social del cliente a asociar"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CASO 3: AJUSTE POR PERÍODO */}
            {originMode === "PERIOD" && (
              <div className="p-4 bg-muted/20 border rounded-xl space-y-4 pt-3">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200">
                  <Calendar className="size-4 shrink-0 mt-0.5 text-indigo-600" />
                  <div>
                    <p className="font-bold">Ajuste global por período (Exclusivo Admin)</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      ARCA permite emitir comprobantes de ajuste vinculados a un período de facturación para tipos A, B y C. Está estrictamente prohibido para comprobantes tipo E.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Fecha Desde *
                    </label>
                    <Input
                      type="date"
                      value={periodFrom}
                      onChange={(e) => setPeriodFrom(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Fecha Hasta *
                    </label>
                    <Input
                      type="date"
                      value={periodTo}
                      onChange={(e) => setPeriodTo(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Footer Fijo */}
        <DialogFooter className="p-3.5 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isContinueDisabled}
            onClick={handleContinue}
            className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 px-4"
          >
            Continuar a edición de ajuste
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
