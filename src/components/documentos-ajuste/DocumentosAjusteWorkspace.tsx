"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileSearch,
  Filter,
  Layers,
  MoreHorizontal,
  Plus,
  Receipt,
  RotateCcw,
  Scale,
  Search,
  Send,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react"

import type { DocumentoAjuste, AjusteTipo, AjusteState } from "@/types/documentos-ajuste"
import { useDocumentosAjuste } from "@/lib/documentos-ajuste"
import { formatDecimalCurrency, parseDecimalScale4 } from "@/lib/decimal-money"
import { formatDate } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { HelpTip } from "@/components/ui/info-tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StateBadge } from "@/components/shared"
import { DocumentoAjusteDetailDrawer } from "./DocumentoAjusteDetailDrawer"
import { NuevoAjustePaso1Modal } from "./NuevoAjustePaso1Modal"

interface DocumentosAjusteWorkspaceProps {
  initialTab?: "todas" | "credito" | "debito" | "borrador" | "emitidas" | "anuladas"
  initialTipo?: AjusteTipo
  initialFacturaOrigen?: string
}

function docNumber(doc: DocumentoAjuste) {
  const prefix = doc.tipo === "CREDITO" ? "NC" : "ND"
  return doc.visibleNumber == null
    ? `Borrador · ${doc.id.slice(0, 8)}`
    : `${prefix} 0001-${String(doc.visibleNumber).padStart(8, "0")}`
}

function fiscalStatusOf(doc: DocumentoAjuste): { label: string; badgeClass: string } {
  const meta = doc.metadata && typeof doc.metadata === "object" ? doc.metadata as Record<string, unknown> : null
  const fiscalDisplayState = meta?.fiscalDisplayState as string | undefined
  const fiscalState = meta?.fiscalState as string | undefined
  const cae = meta?.cae as string | undefined

  if (fiscalDisplayState === "SIMULATED" || fiscalState === "AUTHORIZED" || cae) {
    return {
      label: cae ? `CAE ${cae}` : "Simulada",
      badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium",
    }
  }
  if (fiscalState === "REJECTED" || fiscalState === "FAILED") {
    return {
      label: "Rechazada",
      badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-medium",
    }
  }
  if (fiscalState === "PENDING" || fiscalState === "SUBMITTED") {
    return {
      label: "Pendiente",
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium",
    }
  }
  return {
    label: "No fiscal",
    badgeClass: "border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400",
  }
}

export function DocumentosAjusteWorkspace({
  initialTab = "todas",
  initialTipo,
  initialFacturaOrigen,
}: DocumentosAjusteWorkspaceProps) {
  const router = useRouter()
  const { documentos } = useDocumentosAjuste()

  // Tabs
  const [activeTab, setActiveTab] = useState<string>(
    initialTipo === "CREDITO" ? "credito" : initialTipo === "DEBITO" ? "debito" : initialTab
  )

  // Filtros primarios
  const [searchQuery, setSearchQuery] = useState("")
  const [issuedFrom, setIssuedFrom] = useState("")
  const [issuedTo, setIssuedTo] = useState("")
  const [facturaFilter, setFacturaFilter] = useState(initialFacturaOrigen ?? "")

  // Filtros secundarios
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [motivoFilter, setMotivoFilter] = useState("TODOS")
  const [modalidadFilter, setModalidadFilter] = useState("TODAS")

  // Estado del modal y drawer
  const [isPaso1ModalOpen, setIsPaso1ModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentoAjuste | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // KPIs
  const kpis = useMemo(() => {
    let creditCount = 0
    let creditTotalBigInt = BigInt(0)
    let debitCount = 0
    let debitTotalBigInt = BigInt(0)

    for (const doc of documentos) {
      const parsed = parseDecimalScale4(doc.total) ?? BigInt(0)
      if (doc.tipo === "CREDITO") {
        creditCount++
        if (doc.state === "Emitida") creditTotalBigInt += parsed
      } else {
        debitCount++
        if (doc.state === "Emitida") debitTotalBigInt += parsed
      }
    }

    const netImpactBigInt = debitTotalBigInt - creditTotalBigInt
    const netFormatted = (Number(netImpactBigInt) / 10000).toFixed(2)

    return {
      creditCount,
      creditTotal: (Number(creditTotalBigInt) / 10000).toFixed(2),
      debitCount,
      debitTotal: (Number(debitTotalBigInt) / 10000).toFixed(2),
      netImpact: netFormatted,
      netIsPositive: netImpactBigInt >= BigInt(0),
      totalCount: documentos.length,
    }
  }, [documentos])

  // Filtrado de documentos
  const filteredDocs = useMemo(() => {
    return documentos.filter((doc) => {
      // Tab filter
      if (activeTab === "credito" && doc.tipo !== "CREDITO") return false
      if (activeTab === "debito" && doc.tipo !== "DEBITO") return false
      if (activeTab === "borrador" && doc.state !== "Borrador") return false
      if (activeTab === "emitidas" && doc.state !== "Emitida") return false
      if (activeTab === "anuladas" && doc.state !== "Anulada") return false

      // Factura origen específica
      if (facturaFilter && !doc.invoiceId.toLowerCase().includes(facturaFilter.toLowerCase()) && !doc.invoiceNumber.toLowerCase().includes(facturaFilter.toLowerCase())) {
        return false
      }

      // Universal search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const numberStr = doc.visibleNumber ? `NC ${doc.visibleNumber} ND ${doc.visibleNumber}` : "Borrador"
        const matches =
          numberStr.toLowerCase().includes(q) ||
          doc.invoiceNumber.toLowerCase().includes(q) ||
          doc.motivo.toLowerCase().includes(q) ||
          (doc.observaciones && doc.observaciones.toLowerCase().includes(q)) ||
          (doc.clientName && doc.clientName.toLowerCase().includes(q)) ||
          doc.id.toLowerCase().includes(q)

        if (!matches) return false
      }

      // Emisión
      if (issuedFrom) {
        const docDate = (doc.issuedAt ?? doc.createdAt).slice(0, 10)
        if (docDate < issuedFrom) return false
      }
      if (issuedTo) {
        const docDate = (doc.issuedAt ?? doc.createdAt).slice(0, 10)
        if (docDate > issuedTo) return false
      }

      // Motivo
      if (motivoFilter !== "TODOS" && doc.motivo !== motivoFilter) {
        return false
      }

      // Modalidad
      if (modalidadFilter !== "TODAS" && doc.modalidad !== modalidadFilter) {
        return false
      }

      return true
    })
  }, [documentos, activeTab, searchQuery, issuedFrom, issuedTo, facturaFilter, motivoFilter, modalidadFilter])

  const handleRowClick = (doc: DocumentoAjuste) => {
    setSelectedDoc(doc)
    setIsDrawerOpen(true)
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setIssuedFrom("")
    setIssuedTo("")
    setFacturaFilter("")
    setMotivoFilter("TODOS")
    setModalidadFilter("TODAS")
    setActiveTab("todas")
  }

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (issuedFrom || issuedTo ? 1 : 0) +
    (facturaFilter ? 1 : 0) +
    (motivoFilter !== "TODOS" ? 1 : 0) +
    (modalidadFilter !== "TODAS" ? 1 : 0)

  return (
    <div className="flex flex-col gap-4 p-4 max-w-[1600px] mx-auto w-full">
      {/* 1. Header Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="size-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Documentos de ajuste
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
              DEV
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Notas de crédito y débito vinculadas a comprobantes emitidos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsPaso1ModalOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="size-3.5" />
            Nuevo documento de ajuste
          </Button>
        </div>
      </div>

      {/* 2. KPIs Específicos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Notas de Crédito */}
        <Card className="shadow-none border border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                Notas de Crédito (Disminución)
              </span>
              <span className="text-lg font-bold font-mono text-foreground block mt-0.5">
                -{formatDecimalCurrency(kpis.creditTotal)}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                {kpis.creditCount} comprobantes de disminución
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <TrendingDown className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Notas de Débito */}
        <Card className="shadow-none border border-indigo-500/20 bg-indigo-500/5">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider block">
                Notas de Débito (Incremento)
              </span>
              <span className="text-lg font-bold font-mono text-foreground block mt-0.5">
                +{formatDecimalCurrency(kpis.debitTotal)}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                {kpis.debitCount} comprobantes de recargo
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Ajuste Neto */}
        <Card className="shadow-none border border-border bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Ajuste Neto
                <HelpTip text="Impacto comercial neto de comprobantes emitidos: Débitos emitidos menos Créditos emitidos." />
              </span>
              <span
                className={`text-lg font-bold font-mono block mt-0.5 ${
                  kpis.netIsPositive ? "text-indigo-700 dark:text-indigo-400" : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {kpis.netIsPositive ? `+${formatDecimalCurrency(kpis.netImpact)}` : `-${formatDecimalCurrency(kpis.netImpact.replace("-", ""))}`}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Total comprobantes: {kpis.totalCount}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
              <Scale className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Barra Comercial de Filtros Primarios */}
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Buscador Universal */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar documento, concepto, motivo o factura origen..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          {/* Filtro Rango de Emisión */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
            <Calendar className="size-3.5 text-muted-foreground" />
            <span>Emisión:</span>
            <Input
              type="date"
              value={issuedFrom}
              onChange={(e) => setIssuedFrom(e.target.value)}
              className="h-8 w-32 text-xs bg-background font-mono"
            />
            <span>a</span>
            <Input
              type="date"
              value={issuedTo}
              onChange={(e) => setIssuedTo(e.target.value)}
              className="h-8 w-32 text-xs bg-background font-mono"
            />
          </div>

          {/* Botón Más Filtros */}
          <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                <SlidersHorizontal className="size-3.5" />
                Más filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3 space-y-3" align="end">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">Filtros Avanzados</h4>
                <p className="text-[11px] text-muted-foreground">
                  Filtros complementarios de comprobantes de ajuste.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Motivo
                  </label>
                  <select
                    value={motivoFilter}
                    onChange={(e) => setMotivoFilter(e.target.value)}
                    className="w-full h-8 text-xs rounded-md border bg-background px-2 mt-1"
                  >
                    <option value="TODOS">Todos los motivos</option>
                    <option value="Devolución de material">Devolución de material</option>
                    <option value="Diferencia de precio">Diferencia de precio</option>
                    <option value="Bonificación comercial">Bonificación comercial</option>
                    <option value="Error administrativo">Error administrativo</option>
                    <option value="Intereses por mora">Intereses por mora</option>
                    <option value="Recargo por urgencia">Recargo por urgencia</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Modalidad de Ajuste
                  </label>
                  <select
                    value={modalidadFilter}
                    onChange={(e) => setModalidadFilter(e.target.value)}
                    className="w-full h-8 text-xs rounded-md border bg-background px-2 mt-1"
                  >
                    <option value="TODAS">Todas las modalidades</option>
                    <option value="TOTAL">Ajuste total</option>
                    <option value="PARCIAL">Ajuste parcial por ítems</option>
                    <option value="MANUAL">Ajuste manual justificado</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Factura Origen Específica
                  </label>
                  <Input
                    value={facturaFilter}
                    onChange={(e) => setFacturaFilter(e.target.value)}
                    placeholder="Ej. 0001-00009901 o ID..."
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="pt-2 border-t flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs h-7 px-2">
                  Restablecer
                </Button>
                <Button size="sm" onClick={() => setIsFiltersOpen(false)} className="text-xs h-7 px-3">
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Chips de filtros activos */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t text-xs">
            <span className="text-[11px] text-muted-foreground mr-1 font-medium">Activos:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                Búsqueda: {searchQuery}
                <X className="size-3 cursor-pointer" onClick={() => setSearchQuery("")} />
              </Badge>
            )}
            {(issuedFrom || issuedTo) && (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                Emisión: {issuedFrom || "Inicio"} a {issuedTo || "Hoy"}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setIssuedFrom("")
                    setIssuedTo("")
                  }}
                />
              </Badge>
            )}
            {facturaFilter && (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                Factura: {facturaFilter}
                <X className="size-3 cursor-pointer" onClick={() => setFacturaFilter("")} />
              </Badge>
            )}
            {motivoFilter !== "TODOS" && (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                Motivo: {motivoFilter}
                <X className="size-3 cursor-pointer" onClick={() => setMotivoFilter("TODOS")} />
              </Badge>
            )}
            {modalidadFilter !== "TODAS" && (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                Modalidad: {modalidadFilter}
                <X className="size-3 cursor-pointer" onClick={() => setModalidadFilter("TODAS")} />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
            >
              Limpiar todos
            </Button>
          </div>
        )}
      </div>

      {/* 4. Tabs & Tabla */}
      <div className="flex flex-col gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b overflow-x-auto pb-1 text-xs">
          {[
            { id: "todas", label: "Todas" },
            { id: "credito", label: "Notas de crédito" },
            { id: "debito", label: "Notas de débito" },
            { id: "borrador", label: "Borrador" },
            { id: "emitidas", label: "Emitidas" },
            { id: "anuladas", label: "Anuladas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tabla Unificada */}
        <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-3 py-2.5 text-left">Documento</th>
                <th className="px-2 py-2.5 text-left">Tipo</th>
                <th className="px-2 py-2.5 text-left">Emisión</th>
                <th className="px-2 py-2.5 text-left">Factura origen</th>
                <th className="px-2 py-2.5 text-left">Motivo</th>
                <th className="px-2 py-2.5 text-right">Importe</th>
                <th className="px-2 py-2.5 text-right">Impacto</th>
                <th className="px-2 py-2.5 text-center">Estado</th>
                <th className="px-2 py-2.5 text-center">Fiscal</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground text-xs">
                    No se encontraron documentos de ajuste con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const isCredit = doc.tipo === "CREDITO"
                  const fiscal = fiscalStatusOf(doc)
                  const isSelected = selectedDoc?.id === doc.id && isDrawerOpen

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => handleRowClick(doc)}
                      className={`hover:bg-muted/30 cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Documento */}
                      <td className="px-3 py-2.5 font-mono font-bold text-foreground">
                        {docNumber(doc)}
                      </td>

                      {/* Tipo */}
                      <td className="px-2 py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-medium ${
                            isCredit
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                          }`}
                        >
                          {isCredit ? "Nota de crédito" : "Nota de débito"}
                        </Badge>
                      </td>

                      {/* Emisión */}
                      <td className="px-2 py-2.5 font-mono text-muted-foreground">
                        {doc.issuedAt ? formatDate(doc.issuedAt) : "-"}
                      </td>

                      {/* Factura Origen */}
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="size-3 text-muted-foreground shrink-0" />
                          <span className="font-mono text-foreground font-semibold">
                            FV {doc.invoiceNumber}
                          </span>
                        </div>
                      </td>

                      {/* Motivo */}
                      <td className="px-2 py-2.5 text-muted-foreground max-w-[140px] truncate" title={doc.motivo}>
                        {doc.motivo}
                      </td>

                      {/* Importe */}
                      <td className="px-2 py-2.5 text-right font-mono font-semibold text-foreground">
                        {formatDecimalCurrency(doc.total)}
                      </td>

                      {/* Impacto */}
                      <td
                        className={`px-2 py-2.5 text-right font-mono font-bold ${
                          isCredit
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {isCredit ? `-${formatDecimalCurrency(doc.total)}` : `+${formatDecimalCurrency(doc.total)}`}
                      </td>

                      {/* Estado */}
                      <td className="px-2 py-2.5 text-center">
                        <StateBadge status={doc.state} />
                      </td>

                      {/* Fiscal */}
                      <td className="px-2 py-2.5 text-center">
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${fiscal.badgeClass}`}>
                          {fiscal.label}
                        </Badge>
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-7 p-0">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleRowClick(doc)}>
                              <Eye className="size-3.5 mr-2 text-muted-foreground" />
                              Ver Detalle
                            </DropdownMenuItem>
                            {doc.state === "Borrador" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  doc.state = "Emitida"
                                  doc.issuedAt = new Date().toISOString()
                                  setSelectedDoc({ ...doc })
                                }}
                              >
                                <Send className="size-3.5 mr-2 text-primary" />
                                Emitir Comprobante
                              </DropdownMenuItem>
                            )}
                            {doc.state === "Emitida" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  doc.state = "Anulada"
                                  setSelectedDoc({ ...doc })
                                }}
                                className="text-rose-600"
                              >
                                <XCircle className="size-3.5 mr-2" />
                                Anular Ajuste
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Contextual de Detalle */}
      <DocumentoAjusteDetailDrawer
        documento={selectedDoc}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onEmit={(d) => {
          d.state = "Emitida"
          d.issuedAt = new Date().toISOString()
          setSelectedDoc({ ...d })
        }}
        onVoid={(d) => {
          d.state = "Anulada"
          setSelectedDoc({ ...d })
        }}
      />

      {/* Modal Paso 1 de Nuevo Ajuste */}
      <NuevoAjustePaso1Modal
        open={isPaso1ModalOpen}
        onOpenChange={setIsPaso1ModalOpen}
        initialTipo={activeTab === "debito" ? "DEBITO" : "CREDITO"}
      />
    </div>
  )
}
