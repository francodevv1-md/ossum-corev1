"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  Banknote,
  Calendar,
  Eye,
  FileSearch,
  FileText,
  Filter,
  FolderOpen,
  Hash,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Receipt,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { CobroFormDialog } from "@/components/cobros/CobroFormDialog"
import { FiscalEvidenceDialog } from "@/components/facturacion/FiscalEvidenceDialog"
import { InvoiceDetailDrawer } from "@/components/facturacion/InvoiceDetailDrawer"
import { SendExistingFinancialDocumentDialog } from "@/components/email/SendExistingFinancialDocumentDialog"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { SearchInput, StateBadge, StatsCard, SurgeryDrawer } from "@/components/shared"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HelpTip, InfoTooltip } from "@/components/ui/info-tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useInvoices } from "@/hooks/useInvoices"
import { usePayments } from "@/hooks/usePayments"
import { fetchBackendActiveSurgeries } from "@/lib/api/backend-surgeries"
import type { InvoiceApiRow, InvoiceBase, InvoiceState } from "@/lib/api/invoices"
import type { CreateInvoicePaymentPayload } from "@/lib/api/payments"
import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"
import { canSendFinancialDocumentEmail } from "@/lib/permissions/financial-document-email"
import { formatDate } from "@/lib/formatters"

type StateTab = "all" | InvoiceState
type OriginFilter = "all" | "with_surgery" | "direct_sale"
type FiscalFilter = "all" | "Sin solicitar" | "Pendiente" | "Simulada" | "Rechazada"
type DateCriterion = "issuedAt" | "createdAt"

const STATE_TABS: Array<{ value: StateTab; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "Borrador", label: "Borrador" },
  { value: "Emitida", label: "Emitida" },
  { value: "Parcialmente_cobrada", label: "Cobro parcial" },
  { value: "Cobrada", label: "Cobrada" },
  { value: "Anulada", label: "Anulada" },
]

type FiscalDisplayStatus = "Sin solicitar" | "Simulada" | "Rechazada" | "Pendiente"

function fiscalStatusOf(invoice: InvoiceApiRow): { label: FiscalDisplayStatus; badgeClass: string; isDiscrete: boolean } {
  const meta = invoice.metadata && typeof invoice.metadata === "object" ? invoice.metadata as Record<string, unknown> : null
  const fiscalDisplayState = meta?.fiscalDisplayState as string | undefined
  const fiscalState = meta?.fiscalState as string | undefined
  const cae = meta?.cae as string | undefined

  if (fiscalDisplayState === "SIMULATED" || fiscalState === "AUTHORIZED" || cae) {
    return {
      label: "Simulada",
      badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold",
      isDiscrete: false,
    }
  }
  if (fiscalState === "REJECTED" || fiscalState === "FAILED") {
    return {
      label: "Rechazada",
      badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold",
      isDiscrete: false,
    }
  }
  if (fiscalState === "PENDING" || fiscalState === "SUBMITTED") {
    return {
      label: "Pendiente",
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold",
      isDiscrete: false,
    }
  }
  return {
    label: "Sin solicitar",
    badgeClass: "border-transparent bg-muted/40 text-muted-foreground/70 font-normal hover:bg-muted/70",
    isDiscrete: true,
  }
}

function referenceOf(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return ""
  const reference = (metadata as Record<string, unknown>).reference
  return typeof reference === "string" ? reference : ""
}

function clientNameOf(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return ""
  const name = (metadata as Record<string, unknown>).clientName
  return typeof name === "string" ? name : ""
}

function invoiceNumber(invoice: InvoiceApiRow) {
  return invoice.visibleNumber == null ? `Borrador · ${invoice.id.slice(0, 8)}` : `FV ${invoice.visibleNumber}`
}

function surgeryLabel(id: string | null) {
  return id ? `Cirugía ${id}` : "Sin cirugía"
}

const BASE_LABELS: Record<InvoiceBase, string> = {
  manual: "Manual",
  presupuesto: "Presupuesto",
  consumo: "Consumo",
  mixto: "Mixto",
}

export default function FacturacionPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const invoicesApi = useInvoices()
  const paymentsApi = usePayments(undefined, false)
  const { activeCompany, currentAccess } = useAuth()
  const { openExpediente } = useExpedienteDrawer()

  // Initialize filter state from URL query params
  const [search, setSearch] = useState(() => searchParams?.get("number") ?? searchParams?.get("q") ?? "")
  const [issuedFrom, setIssuedFrom] = useState(() => searchParams?.get("issuedFrom") ?? "")
  const [issuedTo, setIssuedTo] = useState(() => searchParams?.get("issuedTo") ?? "")
  const [activeState, setActiveState] = useState<StateTab>(() => (searchParams?.get("state") as StateTab) ?? "all")
  const [originFilter, setOriginFilter] = useState<OriginFilter>(() => (searchParams?.get("origin") as OriginFilter) ?? "all")
  const [onlyPendingBalance, setOnlyPendingBalance] = useState(() => searchParams?.get("withBalance") === "true")
  const [baseFilter, setBaseFilter] = useState<string>(() => searchParams?.get("base") ?? "all")
  const [typeFilter, setTypeFilter] = useState<string>(() => searchParams?.get("type") ?? "all")
  const [currencyFilter, setCurrencyFilter] = useState<string>(() => searchParams?.get("currency") ?? "all")
  const [fiscalFilter, setFiscalFilter] = useState<FiscalFilter>(() => (searchParams?.get("fiscal") as FiscalFilter) ?? "all")
  const [totalMin, setTotalMin] = useState(() => searchParams?.get("minTot") ?? "")
  const [totalMax, setTotalMax] = useState(() => searchParams?.get("maxTot") ?? "")
  const [balanceMin, setBalanceMin] = useState(() => searchParams?.get("minBal") ?? "")
  const [balanceMax, setBalanceMax] = useState(() => searchParams?.get("maxBal") ?? "")
  const [dateCriterion, setDateCriterion] = useState<DateCriterion>(() => (searchParams?.get("dateCrit") as DateCriterion) ?? "issuedAt")

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Selection / Drawers
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [paymentSelection, setPaymentSelection] = useState<{ companyId: string; invoice: InvoiceApiRow } | null>(null)
  const [fiscalEvidenceSelection, setFiscalEvidenceSelection] = useState<{ companyId: string; invoice: InvoiceApiRow } | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [storedSurgeries, setStoredSurgeries] = useState<{ companyId: string; rows: Awaited<ReturnType<typeof fetchBackendActiveSurgeries>> }>({ companyId: "", rows: [] })

  const surgeries = storedSurgeries.companyId === activeCompany?.id ? storedSurgeries.rows : []
  const paymentInvoice = paymentSelection && paymentSelection.companyId === invoicesApi.companyId ? paymentSelection.invoice : null
  const fiscalEvidenceSelectionForActiveCompany = fiscalEvidenceSelection?.companyId === invoicesApi.companyId ? fiscalEvidenceSelection : null

  useEffect(() => () => setFiscalEvidenceSelection(null), [invoicesApi.companyId])

  useEffect(() => {
    const companyId = activeCompany?.id
    if (!companyId) return
    let active = true
    void fetchBackendActiveSurgeries(companyId)
      .then((rows) => { if (active) setStoredSurgeries({ companyId, rows }) })
      .catch(() => { if (active) setStoredSurgeries({ companyId, rows: [] }) })
    return () => { active = false }
  }, [activeCompany?.id])

  // Sync state to URL Query Params (Persistence)
  const syncUrlParams = useCallback(() => {
    if (!pathname || typeof window === "undefined") return
    const params = new URLSearchParams()

    if (search.trim()) params.set("number", search.trim())
    if (issuedFrom) params.set("issuedFrom", issuedFrom)
    if (issuedTo) params.set("issuedTo", issuedTo)
    if (activeState !== "all") params.set("state", activeState)
    if (originFilter !== "all") params.set("origin", originFilter)
    if (onlyPendingBalance) params.set("withBalance", "true")
    if (baseFilter !== "all") params.set("base", baseFilter)
    if (typeFilter !== "all") params.set("type", typeFilter)
    if (currencyFilter !== "all") params.set("currency", currencyFilter)
    if (fiscalFilter !== "all") params.set("fiscal", fiscalFilter)
    if (totalMin) params.set("minTot", totalMin)
    if (totalMax) params.set("maxTot", totalMax)
    if (balanceMin) params.set("minBal", balanceMin)
    if (balanceMax) params.set("maxBal", balanceMax)
    if (dateCriterion !== "issuedAt") params.set("dateCrit", dateCriterion)

    const queryString = params.toString()
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(targetUrl, { scroll: false })
  }, [
    activeState,
    balanceMax,
    balanceMin,
    baseFilter,
    currencyFilter,
    dateCriterion,
    fiscalFilter,
    issuedFrom,
    issuedTo,
    onlyPendingBalance,
    originFilter,
    pathname,
    router,
    search,
    totalMax,
    totalMin,
    typeFilter,
  ])

  useEffect(() => {
    syncUrlParams()
  }, [syncUrlParams])

  // Detect dynamic variety for optional selectors
  const { availableTypes, availableCurrencies } = useMemo(() => {
    const types = new Set<string>()
    const currencies = new Set<string>()

    invoicesApi.invoices.forEach((inv) => {
      if (inv.type) types.add(inv.type)
      if (inv.currency) currencies.add(inv.currency)
    })

    return {
      availableTypes: Array.from(types),
      availableCurrencies: Array.from(currencies),
    }
  }, [invoicesApi.invoices])

  const showTypeFilter = availableTypes.length > 1
  const showCurrencyFilter = availableCurrencies.length > 1 || (availableCurrencies.length === 1 && availableCurrencies[0] !== "ARS")

  // Count active secondary filters for "Más filtros" badge
  const activeSecondaryCount = useMemo(() => {
    let count = 0
    if (originFilter !== "all") count++
    if (baseFilter !== "all") count++
    if (onlyPendingBalance) count++
    if (showTypeFilter && typeFilter !== "all") count++
    if (showCurrencyFilter && currencyFilter !== "all") count++
    if (totalMin.trim() !== "" || totalMax.trim() !== "") count++
    if (balanceMin.trim() !== "" || balanceMax.trim() !== "") count++
    if (fiscalFilter !== "all") count++
    if (dateCriterion !== "issuedAt") count++
    return count
  }, [
    balanceMax,
    balanceMin,
    baseFilter,
    currencyFilter,
    dateCriterion,
    fiscalFilter,
    onlyPendingBalance,
    originFilter,
    showCurrencyFilter,
    showTypeFilter,
    totalMax,
    totalMin,
    typeFilter,
  ])

  // Filter evaluation on in-memory invoicesApi.invoices
  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es")

    const minTot = totalMin.trim() !== "" ? parseFloat(totalMin.replace(",", ".")) : null
    const maxTot = totalMax.trim() !== "" ? parseFloat(totalMax.replace(",", ".")) : null
    const minBal = balanceMin.trim() !== "" ? parseFloat(balanceMin.replace(",", ".")) : null
    const maxBal = balanceMax.trim() !== "" ? parseFloat(balanceMax.replace(",", ".")) : null

    return invoicesApi.invoices.filter((invoice) => {
      // 1. Estado Operativo Tab
      if (activeState !== "all" && invoice.state !== activeState) return false

      // 2. Origen (Con Cirugía / Venta Directa)
      if (originFilter === "with_surgery" && !invoice.surgeryId) return false
      if (originFilter === "direct_sale" && invoice.surgeryId) return false

      // 3. Saldo pendiente quick filter
      if (onlyPendingBalance) {
        const balanceBigInt = parseDecimalScale4(invoice.balance) ?? BigInt(0)
        if (balanceBigInt <= BigInt(0) || (invoice.state !== "Emitida" && invoice.state !== "Parcialmente_cobrada")) {
          return false
        }
      }

      // 4. Base del Comprobante
      if (baseFilter !== "all" && invoice.base !== baseFilter) return false

      // 5. Tipo
      if (showTypeFilter && typeFilter !== "all" && invoice.type !== typeFilter) return false

      // 6. Moneda
      if (showCurrencyFilter && currencyFilter !== "all" && invoice.currency !== currencyFilter) return false

      // 7. Estado Fiscal
      if (fiscalFilter !== "all") {
        const fiscalStatus = fiscalStatusOf(invoice).label
        if (fiscalFilter === "Simulada" && fiscalStatus !== "Simulada") return false
        if (fiscalFilter === "Pendiente" && fiscalStatus !== "Pendiente") return false
        if (fiscalFilter === "Rechazada" && fiscalStatus !== "Rechazada") return false
        if (fiscalFilter === "Sin solicitar" && fiscalStatus !== "Sin solicitar") return false
      }

      // 8. Rango de Importe (Total)
      const invTotalNum = parseFloat(invoice.total) || 0
      if (minTot !== null && !isNaN(minTot) && invTotalNum < minTot) return false
      if (maxTot !== null && !isNaN(maxTot) && invTotalNum > maxTot) return false

      // 9. Rango de Saldo
      const invBalanceNum = parseFloat(invoice.balance) || 0
      if (minBal !== null && !isNaN(minBal) && invBalanceNum < minBal) return false
      if (maxBal !== null && !isNaN(maxBal) && invBalanceNum > maxBal) return false

      // 10. Rango de Fecha (Emisión o Creación)
      const targetDateStr = dateCriterion === "issuedAt" ? (invoice.issuedAt ?? invoice.createdAt) : invoice.createdAt
      if (issuedFrom.trim() !== "") {
        if (!targetDateStr) return false
        const targetDate = new Date(targetDateStr).toISOString().slice(0, 10)
        if (targetDate < issuedFrom) return false
      }
      if (issuedTo.trim() !== "") {
        if (!targetDateStr) return false
        const targetDate = new Date(targetDateStr).toISOString().slice(0, 10)
        if (targetDate > issuedTo) return false
      }

      // 11. Búsqueda por número / cliente / detalle / cirugía
      if (!query) return true
      return [
        invoice.visibleNumber == null ? "" : String(invoice.visibleNumber),
        clientNameOf(invoice.metadata),
        ...invoice.items.map((item) => item.description),
        referenceOf(invoice.metadata),
        surgeryLabel(invoice.surgeryId),
      ].some((value) => value.toLocaleLowerCase("es").includes(query))
    })
  }, [
    activeState,
    balanceMax,
    balanceMin,
    baseFilter,
    currencyFilter,
    dateCriterion,
    fiscalFilter,
    invoicesApi.invoices,
    issuedFrom,
    issuedTo,
    onlyPendingBalance,
    originFilter,
    search,
    showCurrencyFilter,
    showTypeFilter,
    totalMax,
    totalMin,
    typeFilter,
  ])

  const totals = useMemo(() => invoicesApi.invoices.reduce((result, invoice) => {
    if (invoice.state !== "Borrador" && invoice.state !== "Anulada") result.emitted += parseDecimalScale4(invoice.total) ?? BigInt(0)
    if (invoice.state !== "Anulada") result.collected += parseDecimalScale4(invoice.paidTotal) ?? BigInt(0)
    if (invoice.state === "Emitida" || invoice.state === "Parcialmente_cobrada") result.outstanding += parseDecimalScale4(invoice.balance) ?? BigInt(0)
    return result
  }, { emitted: BigInt(0), collected: BigInt(0), outstanding: BigInt(0) }), [invoicesApi.invoices])

  const collectionRate = useMemo(() => {
    if (totals.emitted === BigInt(0)) return 0
    const emittedNumber = Number(totals.emitted)
    const collectedNumber = Number(totals.collected)
    if (emittedNumber <= 0) return 0
    return Math.min(100, Math.round((collectedNumber / emittedNumber) * 100))
  }, [totals.collected, totals.emitted])

  const counts = useMemo(() => new Map(STATE_TABS.map((tab) => [
    tab.value,
    tab.value === "all" ? invoicesApi.invoices.length : invoicesApi.invoices.filter((invoice) => invoice.state === tab.value).length,
  ])), [invoicesApi.invoices])

  const selectedInvoice = useMemo(() => {
    if (!selectedInvoiceId) return null
    return invoicesApi.invoices.find((inv) => inv.id === selectedInvoiceId) ?? null
  }, [invoicesApi.invoices, selectedInvoiceId])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await invoicesApi.refresh()
      toast.success("Listado de facturación actualizado")
    } catch {
      toast.error("No se pudo actualizar el listado")
    } finally {
      setIsRefreshing(false)
    }
  }

  const emit = async (invoice: InvoiceApiRow) => {
    setActionError(null)
    try {
      await invoicesApi.emit(invoice.id)
      toast.success("Factura operativa emitida; el número fue asignado por el backend")
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No se pudo emitir la factura.")
    }
  }

  const registerPayment = async (payload: CreateInvoicePaymentPayload) => {
    setActionError(null)
    try {
      await paymentsApi.create(payload)
      await invoicesApi.refresh()
      toast.success("Cobro operativo registrado")
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo registrar el cobro."
      setActionError(message)
      throw cause
    }
  }

  const handleRowClick = (invoice: InvoiceApiRow) => {
    setSelectedInvoiceId(invoice.id)
    setDetailDrawerOpen(true)
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    issuedFrom !== "" ||
    issuedTo !== "" ||
    activeState !== "all" ||
    originFilter !== "all" ||
    onlyPendingBalance ||
    baseFilter !== "all" ||
    (showTypeFilter && typeFilter !== "all") ||
    (showCurrencyFilter && currencyFilter !== "all") ||
    fiscalFilter !== "all" ||
    totalMin.trim() !== "" ||
    totalMax.trim() !== "" ||
    balanceMin.trim() !== "" ||
    balanceMax.trim() !== "" ||
    dateCriterion !== "issuedAt"

  const clearAllFilters = () => {
    setSearch("")
    setIssuedFrom("")
    setIssuedTo("")
    setActiveState("all")
    setOriginFilter("all")
    setOnlyPendingBalance(false)
    setBaseFilter("all")
    setTypeFilter("all")
    setCurrencyFilter("all")
    setFiscalFilter("all")
    setTotalMin("")
    setTotalMax("")
    setBalanceMin("")
    setBalanceMax("")
    setDateCriterion("issuedAt")
  }

  const clearSecondaryFilters = () => {
    setOriginFilter("all")
    setOnlyPendingBalance(false)
    setBaseFilter("all")
    setTypeFilter("all")
    setCurrencyFilter("all")
    setFiscalFilter("all")
    setTotalMin("")
    setTotalMax("")
    setBalanceMin("")
    setBalanceMax("")
    setDateCriterion("issuedAt")
  }

  const pageError = actionError ?? invoicesApi.error ?? paymentsApi.error

  return (
    <TooltipProvider delayDuration={150}>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-3 pb-8"
      >
        {/* ─── 1. Header Mínimo Operativo ─── */}
        <div className="flex flex-col gap-2.5 rounded-lg border bg-card px-4 py-2.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">Facturación operativa</h1>
              <InfoTooltip
                title="Facturación Operativa"
                description="Gestión de comprobantes comerciales, cobranzas imputadas y evidencia fiscal sincronizada con el backend."
                size="sm"
              />
              <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                TusFacturas DEV
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Comprobantes, cobranzas y trazabilidad fiscal sincronizados con el backend.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Icon button contextual: Actualizar listado */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing || invoicesApi.loading}
                  aria-label="Actualizar listado"
                  className="size-8 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`size-3.5 ${isRefreshing || invoicesApi.loading ? "animate-spin text-primary" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Actualizar listado
              </TooltipContent>
            </Tooltip>

            {/* Icon button contextual: Enviar existente */}
            {canSendFinancialDocumentEmail(currentAccess?.role) ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEmailOpen(true)}
                    aria-label="Enviar documento existente"
                    className="size-8 text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Enviar documento existente
                </TooltipContent>
              </Tooltip>
            ) : null}

            {/* Acción Primaria: + Nueva factura */}
            <Button
              size="sm"
              onClick={() => router.push("/ventas/facturacion/nueva")}
              className="h-8 gap-1.5 bg-primary text-xs font-semibold shadow-xs hover:bg-primary/90 ml-1"
            >
              <Plus className="size-3.5" /> Nueva factura
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {pageError ? (
          <Alert variant="destructive" className="py-2 animate-in fade-in-50">
            <AlertCircle className="size-4" />
            <AlertTitle className="text-xs font-semibold">No se pudo completar la operación</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2 text-xs">
              <span>{pageError}</span>
              {invoicesApi.error ? (
                <Button size="sm" variant="outline" onClick={() => void invoicesApi.refresh()} className="h-5.5 text-[11px] px-2">
                  Reintentar
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {/* ─── 2. KPI Strip Financiero Compacto ─── */}
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total emitido operativo" value={formatDecimalCurrency(totals.emitted)} icon={Receipt} />
          <StatsCard title="Cobrado registrado" value={formatDecimalCurrency(totals.collected)} icon={Banknote} />
          <StatsCard title="Saldo pendiente" value={formatDecimalCurrency(totals.outstanding)} icon={FileText} />
          <div className="rounded-lg border bg-card p-2.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>Total comprobantes</span>
              <FileText className="size-3.5 text-muted-foreground/70" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold font-mono text-foreground">{invoicesApi.invoices.length}</span>
              {totals.emitted > BigInt(0) && collectionRate > 0 ? (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {collectionRate}% cobrado
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* ─── 3. Barra Comercial de Filtros Primarios ─── */}
        <div className="rounded-lg border bg-card p-2.5 shadow-2xs space-y-2.5">
          {/* Fila de Filtros Primarios Principales */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            {/* 1. Buscador Universal */}
            <div className="relative flex-1 lg:max-w-md">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar comprobante, concepto, referencia o cirugía…"
                className="w-full h-8 text-xs"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            {/* 2. Fechas de Emisión (Desde / Hasta) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <div className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-md border border-border/60">
                <Calendar className="size-3.5 text-muted-foreground mr-0.5" />
                <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Emisión:</span>
                <Input
                  type="date"
                  aria-label="Fecha emisión desde"
                  value={issuedFrom}
                  onChange={(e) => setIssuedFrom(e.target.value)}
                  className="h-6 w-28 text-[11px] px-1.5 border-border/80 bg-background"
                />
                <span className="text-muted-foreground text-[10px]">a</span>
                <Input
                  type="date"
                  aria-label="Fecha emisión hasta"
                  value={issuedTo}
                  onChange={(e) => setIssuedTo(e.target.value)}
                  className="h-6 w-28 text-[11px] px-1.5 border-border/80 bg-background"
                />
                {(issuedFrom || issuedTo) ? (
                  <button
                    type="button"
                    onClick={() => { setIssuedFrom(""); setIssuedTo("") }}
                    className="text-muted-foreground hover:text-foreground ml-0.5"
                    aria-label="Limpiar fechas de emisión"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>

              {/* 3. Botón "Más filtros" (Popover con Origen, Estado, Saldo, Base, Moneda, Fiscal) */}
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={activeSecondaryCount > 0 ? "default" : "outline"}
                    size="sm"
                    className="h-8 rounded-md px-2.5 text-xs font-medium gap-1.5"
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span>Más filtros</span>
                    {activeSecondaryCount > 0 ? (
                      <Badge variant="secondary" className="h-4 px-1 text-[9px] font-bold bg-background text-foreground ml-0.5">
                        {activeSecondaryCount}
                      </Badge>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-84 p-3.5 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-foreground text-xs">Filtros secundarios</span>
                    {activeSecondaryCount > 0 ? (
                      <button
                        type="button"
                        onClick={clearSecondaryFilters}
                        className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Limpiar secundarios
                      </button>
                    ) : null}
                  </div>

                  {/* Origen */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">Origen del comprobante</Label>
                    <Select value={originFilter} onValueChange={(val) => setOriginFilter(val as OriginFilter)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Todos los orígenes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los orígenes</SelectItem>
                        <SelectItem value="with_surgery">Con Cirugía vinculada</SelectItem>
                        <SelectItem value="direct_sale">Venta Directa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Base del Comprobante */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground inline-flex items-center">
                      Base operativa
                      <HelpTip text="Origen documental: presupuesto acordado, consumo quirúrgico confirmado o carga manual." />
                    </Label>
                    <Select value={baseFilter} onValueChange={setBaseFilter}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Todas las bases" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las bases</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="presupuesto">Presupuesto</SelectItem>
                        <SelectItem value="consumo">Consumo</SelectItem>
                        <SelectItem value="mixto">Mixto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Saldo y Criterio */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-foreground">Condición de saldo</Label>
                      <Button
                        type="button"
                        variant={onlyPendingBalance ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOnlyPendingBalance(!onlyPendingBalance)}
                        className="h-6 text-[10px] px-2 font-medium"
                      >
                        Solo con saldo pendiente
                      </Button>
                    </div>
                  </div>

                  {/* Estado Fiscal */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">Estado fiscal</Label>
                    <Select value={fiscalFilter} onValueChange={(val) => setFiscalFilter(val as FiscalFilter)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Todos los estados fiscales" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados fiscales</SelectItem>
                        <SelectItem value="Sin solicitar">Sin solicitar</SelectItem>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="Simulada">Simulada / CAE</SelectItem>
                        <SelectItem value="Rechazada">Rechazada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo y Moneda */}
                  {(showTypeFilter || showCurrencyFilter) ? (
                    <div className="grid grid-cols-2 gap-2">
                      {showTypeFilter ? (
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">Tipo</Label>
                          <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {availableTypes.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}

                      {showCurrencyFilter ? (
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-foreground">Moneda</Label>
                          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {availableCurrencies.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Rango de Importe Total */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">Importe total ($)</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        type="number"
                        placeholder="Mínimo"
                        value={totalMin}
                        onChange={(e) => setTotalMin(e.target.value)}
                        className="h-7 text-[11px] px-2 font-mono"
                      />
                      <Input
                        type="number"
                        placeholder="Máximo"
                        value={totalMax}
                        onChange={(e) => setTotalMax(e.target.value)}
                        className="h-7 text-[11px] px-2 font-mono"
                      />
                    </div>
                  </div>

                  {/* Rango de Saldo */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">Saldo pendiente ($)</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        type="number"
                        placeholder="Mínimo"
                        value={balanceMin}
                        onChange={(e) => setBalanceMin(e.target.value)}
                        className="h-7 text-[11px] px-2 font-mono"
                      />
                      <Input
                        type="number"
                        placeholder="Máximo"
                        value={balanceMax}
                        onChange={(e) => setBalanceMax(e.target.value)}
                        className="h-7 text-[11px] px-2 font-mono"
                      />
                    </div>
                  </div>

                  {/* Alternar Criterio de Fecha a Creación */}
                  <div className="pt-1 border-t flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Criterio de fecha:</span>
                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded text-[10px]">
                      <button
                        type="button"
                        onClick={() => setDateCriterion("issuedAt")}
                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                          dateCriterion === "issuedAt" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                        }`}
                      >
                        Emisión
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateCriterion("createdAt")}
                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                          dateCriterion === "createdAt" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                        }`}
                      >
                        Creación
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
          </div>

          {/* Chips de Filtros Activos Removibles */}
          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground text-[10px] uppercase">Filtros activos:</span>
              {search.trim() ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  Comprobante: &quot;{search}&quot;
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setSearch("")} />
                </Badge>
              ) : null}
              {issuedFrom || issuedTo ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  {dateCriterion === "issuedAt" ? "Emisión" : "Creación"}: {issuedFrom || "Inicio"} a {issuedTo || "Fin"}
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => { setIssuedFrom(""); setIssuedTo("") }} />
                </Badge>
              ) : null}
              {originFilter !== "all" ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  Origen: {originFilter === "with_surgery" ? "Con Cirugía" : "Venta Directa"}
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setOriginFilter("all")} />
                </Badge>
              ) : null}
              {onlyPendingBalance ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  Solo con saldo
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setOnlyPendingBalance(false)} />
                </Badge>
              ) : null}
              {baseFilter !== "all" ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  Base: {BASE_LABELS[baseFilter as InvoiceBase] ?? baseFilter}
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setBaseFilter("all")} />
                </Badge>
              ) : null}
              {fiscalFilter !== "all" ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  Fiscal: {fiscalFilter === "Simulada" ? "Simulada/CAE" : fiscalFilter}
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setFiscalFilter("all")} />
                </Badge>
              ) : null}
              {showTypeFilter && typeFilter !== "all" ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  Tipo: {typeFilter}
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setTypeFilter("all")} />
                </Badge>
              ) : null}
              {showCurrencyFilter && currencyFilter !== "all" ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  Moneda: {currencyFilter}
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setCurrencyFilter("all")} />
                </Badge>
              ) : null}
              {totalMin.trim() !== "" || totalMax.trim() !== "" ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  Total: {totalMin.trim() !== "" ? `$${totalMin}` : "$0"} - {totalMax.trim() !== "" ? `$${totalMax}` : "∞"}
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => { setTotalMin(""); setTotalMax("") }} />
                </Badge>
              ) : null}
              {balanceMin.trim() !== "" || balanceMax.trim() !== "" ? (
                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                  Saldo: {balanceMin.trim() !== "" ? `$${balanceMin}` : "$0"} - {balanceMax.trim() !== "" ? `$${balanceMax}` : "∞"}
                  <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => { setBalanceMin(""); setBalanceMax("") }} />
                </Badge>
              ) : null}
            </div>
          ) : null}

          {/* Solapas de Estado Operativo + Contador de Comprobantes */}
          <div className="border-t pt-1.5 flex items-center justify-between">
            <Tabs value={activeState} onValueChange={(value) => setActiveState(value as StateTab)} className="w-full">
              <div className="flex items-center justify-between w-full">
                <TabsList className="h-6.5 justify-start gap-1 bg-muted/50 p-0.5 overflow-x-auto">
                  {STATE_TABS.map((tab) => {
                    const count = counts.get(tab.value) ?? 0
                    const isSelected = activeState === tab.value
                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="h-5.5 px-2 text-[11px] font-medium data-[state=active]:bg-background data-[state=active]:shadow-2xs gap-1.5"
                      >
                        <span>{tab.label}</span>
                        <span className={`rounded-full px-1 text-[9px] font-bold ${
                          isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {count}
                        </span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {/* Contador de resultados filtrados */}
                <div className="text-[11px] font-medium text-muted-foreground px-2 whitespace-nowrap">
                  <span className="font-bold text-foreground">{filteredInvoices.length}</span> comprobante{filteredInvoices.length === 1 ? "" : "s"}
                </div>
              </div>
            </Tabs>
          </div>
        </div>

        {/* ─── 4. Tabla de Facturación V1 ─── */}
        <div className="rounded-lg border bg-card shadow-2xs overflow-hidden">
          {invoicesApi.loading ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center" role="status">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Cargando facturas operativas…</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 p-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="size-5 opacity-60" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  {invoicesApi.invoices.length === 0
                    ? "No hay facturas operativas registradas."
                    : "No hay resultados para los filtros aplicados."}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {invoicesApi.invoices.length === 0
                    ? "Creá una nueva factura para comenzar."
                    : "Probá cambiando los términos o limpiando los filtros."}
                </p>
              </div>
              {invoicesApi.invoices.length === 0 ? (
                <Button size="sm" onClick={() => router.push("/ventas/facturacion/nueva")} className="mt-1 h-7 text-xs font-medium">
                  <Plus className="size-3.5 mr-1" /> Nueva factura
                </Button>
              ) : hasActiveFilters ? (
                <Button size="sm" variant="outline" onClick={clearAllFilters} className="mt-1 h-7 text-xs font-medium">
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                    <th className="px-3 py-2 text-left font-semibold">Documento</th>
                    <th className="px-2.5 py-2 text-left font-semibold">Emisión</th>
                    <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                    <th className="px-2.5 py-2 text-left font-semibold">
                      <span className="inline-flex items-center">
                        Cirugía / Origen
                        <HelpTip text="Expediente quirúrgico vinculado o venta directa sin cirugía." />
                      </span>
                    </th>
                    <th className="px-2.5 py-2 text-right font-semibold">Total</th>
                    <th className="px-2.5 py-2 text-right font-semibold">Cobrado</th>
                    <th className="px-2.5 py-2 text-right font-semibold">
                      <span className="inline-flex items-center justify-end">
                        Saldo
                        <HelpTip text="Importe pendiente de cobro exigible (Total emitido menos cobros registrados)." />
                      </span>
                    </th>
                    <th className="px-2.5 py-2 text-left font-semibold">Estado</th>
                    <th className="px-2.5 py-2 text-left font-semibold">
                      <span className="inline-flex items-center">
                        Fiscal
                        <HelpTip text="Evidencia fiscal desacoplada (CAE / Sandbox AFIP). No condiciona el estado operativo." />
                      </span>
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <AnimatePresence mode="popLayout">
                    {filteredInvoices.map((invoice, index) => {
                      const balanceBigInt = parseDecimalScale4(invoice.balance) ?? BigInt(0)
                      const canCollect = balanceBigInt > BigInt(0) && (invoice.state === "Emitida" || invoice.state === "Parcialmente_cobrada")
                      const isEmitting = invoicesApi.mutatingId === invoice.id
                      const client = clientNameOf(invoice.metadata)
                      const fiscal = fiscalStatusOf(invoice)
                      const isSelected = selectedInvoiceId === invoice.id

                      return (
                        <motion.tr
                          key={invoice.id}
                          initial={{ opacity: 0, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.99 }}
                          transition={{ duration: 0.12, delay: Math.min(index * 0.01, 0.1) }}
                          className={`group transition-colors cursor-pointer select-none ${
                            isSelected
                              ? "bg-primary/5 hover:bg-primary/8 border-l-2 border-l-primary"
                              : "hover:bg-muted/40"
                          }`}
                          onClick={() => handleRowClick(invoice)}
                        >
                          {/* 1. Documento */}
                          <td className="px-3 py-2 font-medium">
                            <div className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                              {invoiceNumber(invoice)}
                            </div>
                            {referenceOf(invoice.metadata) ? (
                              <div className="text-[10px] font-sans text-muted-foreground/80">
                                Ref. {referenceOf(invoice.metadata)}
                              </div>
                            ) : null}
                          </td>

                          {/* 2. Emisión */}
                          <td className="whitespace-nowrap px-2.5 py-2 text-muted-foreground font-mono text-[11px]">
                            {formatDate(invoice.issuedAt ?? invoice.createdAt)}
                          </td>

                          {/* 3. Descripción */}
                          <td className="max-w-56 px-3 py-2">
                            {client ? (
                              <div className="font-semibold text-foreground truncate text-xs">{client}</div>
                            ) : null}
                            <span className="line-clamp-1 text-muted-foreground text-[11px]">
                              {invoice.items.map((item) => item.description).join(" · ") || "Sin descripción"}
                            </span>
                          </td>

                          {/* 4. Cirugía / Origen */}
                          <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                            {invoice.surgeryId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Ver ${surgeryLabel(invoice.surgeryId)}`}
                                onClick={() => openExpediente(invoice.surgeryId!)}
                                className="h-5.5 px-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 gap-1"
                                title="Abrir expediente de la cirugía"
                              >
                                <FolderOpen className="size-3" />
                                <span>{surgeryLabel(invoice.surgeryId)}</span>
                              </Button>
                            ) : (
                              <span className="inline-flex items-center text-[10px] text-muted-foreground font-normal px-1 py-0.5 rounded bg-muted/40">
                                <Tag className="size-2.5 mr-1 inline opacity-60" /> Venta Directa
                              </span>
                            )}
                          </td>

                          {/* 5. Total */}
                          <td className="whitespace-nowrap px-2.5 py-2 text-right font-mono font-bold text-foreground">
                            {formatDecimalCurrency(invoice.total)}
                          </td>

                          {/* 6. Cobrado */}
                          <td className="whitespace-nowrap px-2.5 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatDecimalCurrency(invoice.paidTotal)}
                          </td>

                          {/* 7. Saldo */}
                          <td className="whitespace-nowrap px-2.5 py-2 text-right font-mono font-bold">
                            <span className={Number(invoice.balance) > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground/60"}>
                              {formatDecimalCurrency(invoice.balance)}
                            </span>
                          </td>

                          {/* 8. Estado Operativo */}
                          <td className="px-2.5 py-2">
                            <StateBadge status={invoice.state} />
                          </td>

                          {/* 9. Evidencia Fiscal */}
                          <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`inline-flex items-center rounded border px-1.5 py-0 text-[10px] transition-colors cursor-pointer ${fiscal.badgeClass}`}
                              onClick={() => invoicesApi.companyId && setFiscalEvidenceSelection({ companyId: invoicesApi.companyId, invoice })}
                              title="Ver evidencia y trazabilidad fiscal Sandbox"
                              aria-label="Evidencia fiscal"
                            >
                              {fiscal.label}
                            </button>
                          </td>

                          {/* 10. Acciones Contextuales y Primarias Visibles */}
                          <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {/* Acción Primaria: Emitir (solo Borrador) */}
                              {invoice.state === "Borrador" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isEmitting}
                                  onClick={() => void emit(invoice)}
                                  className="h-6.5 gap-1 px-2 text-[11px] font-semibold text-primary hover:border-primary hover:bg-primary/5"
                                >
                                  {isEmitting ? <Loader2 className="size-3 animate-spin text-primary" /> : <Send className="size-3" />}
                                  Emitir
                                </Button>
                              ) : null}

                              {/* Acción Primaria: Cobrar (solo Emitida/Parcial con saldo) */}
                              {canCollect ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => invoicesApi.companyId && setPaymentSelection({ companyId: invoicesApi.companyId, invoice })}
                                  className="h-6.5 gap-1 px-2 text-[11px] font-semibold text-emerald-700 hover:border-emerald-500/40 hover:bg-emerald-500/10 dark:text-emerald-400"
                                >
                                  <Banknote className="size-3" /> Cobrar
                                </Button>
                              ) : null}

                              {/* Botón secundario Ver Detalle */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRowClick(invoice)}
                                className="size-6.5 text-muted-foreground hover:text-foreground"
                                title="Ver detalle del comprobante"
                                aria-label="Ver detalle"
                              >
                                <Eye className="size-3.5" />
                              </Button>

                              {/* Dropdown de Más Acciones Contextuales */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-6.5 text-muted-foreground hover:text-foreground"
                                    aria-label="Más acciones"
                                  >
                                    <MoreHorizontal className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 text-xs">
                                  <DropdownMenuItem onClick={() => handleRowClick(invoice)}>
                                    <Eye className="size-3.5 mr-2 text-muted-foreground" /> Ver detalle completo
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => invoicesApi.companyId && setFiscalEvidenceSelection({ companyId: invoicesApi.companyId, invoice })}
                                  >
                                    <FileSearch className="size-3.5 mr-2 text-primary" /> Evidencia fiscal
                                  </DropdownMenuItem>
                                  {invoice.surgeryId ? (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openExpediente(invoice.surgeryId!)}>
                                        <FolderOpen className="size-3.5 mr-2 text-primary" /> Ir al Expediente CX
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── 5. Drawer Contextual Lateral de Detalle ─── */}
        <InvoiceDetailDrawer
          invoice={selectedInvoice}
          open={detailDrawerOpen && selectedInvoice != null}
          onOpenChange={(open) => {
            setDetailDrawerOpen(open)
            if (!open) setSelectedInvoiceId(null)
          }}
          onEmit={(inv) => void emit(inv)}
          onCollect={(inv) => {
            if (invoicesApi.companyId) {
              setPaymentSelection({ companyId: invoicesApi.companyId, invoice: inv })
            }
          }}
          onOpenEvidence={(inv) => {
            if (invoicesApi.companyId) {
              setFiscalEvidenceSelection({ companyId: invoicesApi.companyId, invoice: inv })
            }
          }}
          onOpenSurgery={(surgeryId) => openExpediente(surgeryId)}
          isEmitting={invoicesApi.mutatingId === selectedInvoice?.id}
        />

        {/* Payment Dialog */}
        <CobroFormDialog
          open={paymentInvoice != null}
          onOpenChange={(open) => { if (!open) setPaymentSelection(null) }}
          invoice={paymentInvoice}
          onSubmit={registerPayment}
          submitting={paymentsApi.mutatingId === "__create__"}
        />

        {/* Fiscal Evidence Modal */}
        {fiscalEvidenceSelectionForActiveCompany ? (
          <FiscalEvidenceDialog
            key={fiscalEvidenceSelectionForActiveCompany.invoice.id}
            companyId={fiscalEvidenceSelectionForActiveCompany.companyId}
            invoiceId={fiscalEvidenceSelectionForActiveCompany.invoice.id}
            invoiceLabel={invoiceNumber(fiscalEvidenceSelectionForActiveCompany.invoice)}
            open
            onOpenChange={(open) => { if (!open) setFiscalEvidenceSelection(null) }}
            onSuccess={() => void invoicesApi.refresh()}
          />
        ) : null}

        {/* Financial Document Email Dialog */}
        {emailOpen ? <SendExistingFinancialDocumentDialog kind="invoice" onOpenChange={setEmailOpen} /> : null}

        {/* Surgery Drawer for Full View */}
        <SurgeryDrawer />
      </motion.div>
    </TooltipProvider>
  )
}
