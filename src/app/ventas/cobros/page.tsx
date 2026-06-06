"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import {
  MEDIO_COBRO_LABELS,
  ESTADO_COBRO_LABELS,
  ESTADO_COBRO_COLORS,
  ESTADO_COBRANZA_LABELS,
  ESTADO_COBRANZA_COLORS,
  ESTADO_COBRO_BADGE_VARIANT,
  ESTADO_COBRANZA_BADGE_VARIANT,
} from "@/lib/cobros.constants"
import {
  getSaldoPendienteFactura,
  getTotalCobradoFactura,
  getImporteImputadoCobro,
  getImporteNoImputadoCobro,
  getEstadoCobro,
  getEstadoCobranzaFactura,
  getVencimientoFV,
  isFacturaVencida,
} from "@/lib/cobros.utils"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  SurgeryDrawer,
} from "@/components/shared"
import { CobroFormDialog, ImputarSaldoDialog } from "@/components/cobros/CobroFormDialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  Banknote, Eye, MoreHorizontal, Plus, DollarSign,
  Clock, CheckCircle2, FolderOpen, CreditCard,
  AlertCircle, FileText, ArrowRightLeft,
  TrendingDown, CircleDollarSign, AlertTriangle,
} from "lucide-react"
import type { Comprobante, CobroV2 } from "@/types"

export default function CobrosPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("pendientes")
  const [cobroDialogOpen, setCobroDialogOpen] = useState(false)
  const [cobroDialogContext, setCobroDialogContext] = useState<"invoice" | "general">("general")
  const [selectedFactura, setSelectedFactura] = useState<Comprobante | undefined>()
  const [imputarDialogOpen, setImputarDialogOpen] = useState(false)
  const [selectedCobro, setSelectedCobro] = useState<CobroV2 | null>(null)

  const imputaciones = store.imputaciones ?? []
  const cobrosV2 = store.cobrosV2 ?? []

  // ── FV comprobantes enriched with cobranza state ──
  const fvComprobantes = useMemo(() => {
    return store.comprobantes
      .filter((c) => c.type === "FV")
      .map((c) => ({
        comprobante: c,
        cobrado: getTotalCobradoFactura(c.number, imputaciones),
        saldo: getSaldoPendienteFactura(c, imputaciones),
        estadoCobranza: getEstadoCobranzaFactura(c, imputaciones),
        vencimiento: getVencimientoFV(c),
        vencida: isFacturaVencida(c, imputaciones),
        surgery: store.surgeries.find((s) => s.id === c.surgeryId),
      }))
  }, [store.comprobantes, imputaciones, store.surgeries])

  // ── CobrosV2 enriched ──
  const cobrosEnriched = useMemo(() => {
    return cobrosV2.map((c) => ({
      cobro: c,
      imputado: getImporteImputadoCobro(c.id, imputaciones),
      noImputado: getImporteNoImputadoCobro(c, imputaciones),
      estado: getEstadoCobro(c, imputaciones),
    }))
  }, [cobrosV2, imputaciones])

  // ── Tab-specific filters ──
  const tabData = useMemo(() => {
    const filteredFV = search
      ? fvComprobantes.filter((f) => {
          const q = search.toLowerCase()
          return (
            f.comprobante.number.toLowerCase().includes(q) ||
            f.comprobante.client.toLowerCase().includes(q) ||
            f.comprobante.concept.toLowerCase().includes(q) ||
            f.surgery?.patient.toLowerCase().includes(q) ||
            f.comprobante.surgeryId.toLowerCase().includes(q)
          )
        })
      : fvComprobantes

    const filteredCobros = search
      ? cobrosEnriched.filter((c) => {
          const q = search.toLowerCase()
          return (
            c.cobro.id.toLowerCase().includes(q) ||
            c.cobro.clienteNombre.toLowerCase().includes(q) ||
            c.cobro.referencia?.toLowerCase().includes(q) ||
            MEDIO_COBRO_LABELS[c.cobro.medioCobro].toLowerCase().includes(q)
          )
        })
      : cobrosEnriched

    return {
      pendientes: filteredFV.filter((f) => f.estadoCobranza === "sin_cobrar"),
      parciales: filteredFV.filter((f) => f.estadoCobranza === "cobro_parcial"),
      cobradas: filteredFV.filter((f) => f.estadoCobranza === "cobrada"),
      vencidas: filteredFV.filter((f) => f.estadoCobranza === "vencida"),
      todos: filteredFV,
      cobros: filteredCobros,
      sinImputar: filteredCobros.filter((c) => c.noImputado > 0),
    }
  }, [fvComprobantes, cobrosEnriched, search])

  // ── Stats ──
  const stats = useMemo(() => {
    const totalPendientes = fvComprobantes.filter(
      (f) => f.estadoCobranza === "sin_cobrar" || f.estadoCobranza === "cobro_parcial"
    ).length
    const totalSaldoPendiente = fvComprobantes
      .filter((f) => f.saldo > 0)
      .reduce((s, f) => s + f.saldo, 0)
    const totalCobrado = fvComprobantes.reduce((s, f) => s + f.cobrado, 0)
    const cobrosSinImputar = cobrosEnriched.filter((c) => c.noImputado > 0).length
    return { totalPendientes, totalSaldoPendiente, totalCobrado, cobrosSinImputar }
  }, [fvComprobantes, cobrosEnriched])

  // ── Handlers ──
  const handleNewCobro = () => {
    setCobroDialogContext("general")
    setSelectedFactura(undefined)
    setCobroDialogOpen(true)
  }

  const handleRegistrarCobroFactura = (factura: Comprobante) => {
    setCobroDialogContext("invoice")
    setSelectedFactura(factura)
    setCobroDialogOpen(true)
  }

  const handleImputarSaldo = (cobro: CobroV2) => {
    setSelectedCobro(cobro)
    setImputarDialogOpen(true)
  }

  // ── Render factura row ──
  const renderFacturaRow = (f: typeof fvComprobantes[0]) => (
    <tr key={f.comprobante.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-3 py-2.5 font-mono text-xs font-medium">{f.comprobante.number}</td>
      <td className="px-3 py-2.5 text-xs">{f.comprobante.surgeryId || "—"}</td>
      <td className="px-3 py-2.5 text-xs">{f.surgery?.patient || "—"}</td>
      <td className="px-3 py-2.5 text-xs">{f.comprobante.client}</td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDate(f.comprobante.date)}</td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDate(f.vencimiento.toISOString().split("T")[0])}</td>
      <td className="px-3 py-2.5 text-right text-xs font-medium">{formatCurrency(f.comprobante.amount)}</td>
      <td className="px-3 py-2.5 text-right text-xs text-emerald-700">{formatCurrency(f.cobrado)}</td>
      <td className="px-3 py-2.5 text-right">
        <span className={`text-xs font-medium ${f.saldo > 0 ? "text-amber-700" : "text-emerald-700"}`}>
          {formatCurrency(f.saldo)}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <Badge
          variant={ESTADO_COBRANZA_BADGE_VARIANT[f.estadoCobranza]}
          className="text-[10px]"
        >
          {ESTADO_COBRANZA_LABELS[f.estadoCobranza]}
        </Badge>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1">
          {f.saldo > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => handleRegistrarCobroFactura(f.comprobante)}
                >
                  <Banknote className="size-3" /> Cobrar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Registrar cobro para esta factura</TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {f.comprobante.surgeryId && (
                <DropdownMenuItem onClick={() => openExpediente(f.comprobante.surgeryId)}>
                  <FolderOpen className="size-4" /> Ver cirugía
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => toast.info(`Detalle FV ${f.comprobante.number}`)}>
                <Eye className="size-4" /> Ver detalle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  )

  // ── Render cobro row ──
  const renderCobroRow = (c: typeof cobrosEnriched[0]) => (
    <tr key={c.cobro.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-3 py-2.5 font-mono text-xs font-medium">{c.cobro.id}</td>
      <td className="px-3 py-2.5 text-xs">{c.cobro.clienteNombre}</td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDate(c.cobro.fecha)}</td>
      <td className="px-3 py-2.5">
        <Badge variant="outline" className="text-[10px]">{MEDIO_COBRO_LABELS[c.cobro.medioCobro]}</Badge>
      </td>
      <td className="px-3 py-2.5 text-right text-xs font-medium">{formatCurrency(c.cobro.importe)}</td>
      <td className="px-3 py-2.5 text-right text-xs text-emerald-700">{formatCurrency(c.imputado)}</td>
      <td className="px-3 py-2.5 text-right">
        <span className={`text-xs font-medium ${c.noImputado > 0 ? "text-amber-700" : "text-emerald-700"}`}>
          {formatCurrency(c.noImputado)}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <Badge
          variant={ESTADO_COBRO_BADGE_VARIANT[c.estado]}
          className="text-[10px]"
        >
          {ESTADO_COBRO_LABELS[c.estado]}
        </Badge>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1">
          {c.noImputado > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px] text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => handleImputarSaldo(c.cobro)}
                >
                  <ArrowRightLeft className="size-3" /> Imputar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Imputar saldo a facturas</TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info(`Detalle cobro ${c.cobro.id}`)}>
                <Eye className="size-4" /> Ver detalle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  )

  // ── Empty state ──
  const emptyState = (colSpan: number, message: string) => (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
        {message}
      </td>
    </tr>
  )

  // Tab counts
  const tabCounts = useMemo(() => ({
    pendientes: tabData.pendientes.length,
    parciales: tabData.parciales.length,
    cobradas: tabData.cobradas.length,
    vencidas: tabData.vencidas.length,
    cobros: tabData.cobros.length,
    sinImputar: tabData.sinImputar.length,
    todos: tabData.todos.length,
  }), [tabData])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Cobros</h1>
          <p className="text-sm text-muted-foreground">Registro, imputación y seguimiento de cobros</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={handleNewCobro}>
          <Plus className="size-4" /> Nuevo Cobro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="FV pendientes" value={stats.totalPendientes} icon={Clock} />
        <StatsCard title="Saldo pendiente" value={formatCurrency(stats.totalSaldoPendiente)} icon={DollarSign} />
        <StatsCard title="Total cobrado" value={formatCurrency(stats.totalCobrado)} icon={CheckCircle2} />
        <StatsCard title="Cobros sin imputar" value={stats.cobrosSinImputar} icon={AlertCircle} />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Factura, cliente, cirugía, paciente..." className="w-full sm:w-80" />
            {search && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => setSearch("")}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-0.5 p-0.5 bg-muted/50">
          <TabsTrigger value="pendientes" className="text-xs gap-1 px-2.5 py-1.5">
            <Clock className="size-3" /> Pendientes <span className="text-[9px] opacity-60">({tabCounts.pendientes})</span>
          </TabsTrigger>
          <TabsTrigger value="parciales" className="text-xs gap-1 px-2.5 py-1.5">
            <CreditCard className="size-3" /> Parciales <span className="text-[9px] opacity-60">({tabCounts.parciales})</span>
          </TabsTrigger>
          <TabsTrigger value="cobradas" className="text-xs gap-1 px-2.5 py-1.5">
            <CheckCircle2 className="size-3" /> Cobradas <span className="text-[9px] opacity-60">({tabCounts.cobradas})</span>
          </TabsTrigger>
          <TabsTrigger value="vencidas" className="text-xs gap-1 px-2.5 py-1.5">
            <AlertTriangle className="size-3" /> Vencidas <span className="text-[9px] opacity-60">({tabCounts.vencidas})</span>
          </TabsTrigger>
          <TabsTrigger value="cobros" className="text-xs gap-1 px-2.5 py-1.5">
            <Banknote className="size-3" /> Cobros <span className="text-[9px] opacity-60">({tabCounts.cobros})</span>
          </TabsTrigger>
          <TabsTrigger value="sinImputar" className="text-xs gap-1 px-2.5 py-1.5">
            <ArrowRightLeft className="size-3" /> Sin imputar <span className="text-[9px] opacity-60">({tabCounts.sinImputar})</span>
          </TabsTrigger>
          <TabsTrigger value="todos" className="text-xs gap-1 px-2.5 py-1.5">
            <FileText className="size-3" /> Todas <span className="text-[9px] opacity-60">({tabCounts.todos})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Factura tabs (1-4, 7) ── */}
        {["pendientes", "parciales", "cobradas", "vencidas", "todos"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="text-sm text-muted-foreground">
                    {tabData[tab as keyof typeof tabData].length} factura{(tabData[tab as keyof typeof tabData] as unknown[]).length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Factura</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Cirugía</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Paciente</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Cliente</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Fecha FV</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Vencimiento</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">Total</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">Cobrado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">Saldo</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Estado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(tabData[tab as keyof typeof tabData] as typeof fvComprobantes).length > 0
                        ? (tabData[tab as keyof typeof tabData] as typeof fvComprobantes).map(renderFacturaRow)
                        : emptyState(11, "No se encontraron facturas en esta categoría")
                      }
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* ── Cobro tabs (5-6) ── */}
        {["cobros", "sinImputar"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="text-sm text-muted-foreground">
                    {(tabData[tab as keyof typeof tabData] as typeof cobrosEnriched).length} cobro{(tabData[tab as keyof typeof tabData] as unknown[]).length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Cobro ID</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Cliente</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Fecha</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Medio</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">Importe recibido</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">Imputado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">Saldo no imputado</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">Estado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(tabData[tab as keyof typeof tabData] as typeof cobrosEnriched).length > 0
                        ? (tabData[tab as keyof typeof tabData] as typeof cobrosEnriched).map(renderCobroRow)
                        : emptyState(9, "No se encontraron cobros en esta categoría")
                      }
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Dialogs ── */}
      <CobroFormDialog
        open={cobroDialogOpen}
        onOpenChange={setCobroDialogOpen}
        context={cobroDialogContext}
        preselectedFactura={selectedFactura}
      />

      <ImputarSaldoDialog
        open={imputarDialogOpen}
        onOpenChange={setImputarDialogOpen}
        cobro={selectedCobro}
      />

      {/* Expediente Drawer */}
      <SurgeryDrawer />
    </div>
  )
}
