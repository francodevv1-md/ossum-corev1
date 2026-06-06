"use client"

import React, { useState, useMemo } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { getBadgeVariant, CLIENT_OPTIONS, comprobanteTypeLabels } from "@/lib/statusHelpers"
import {
  ESTADO_COBRANZA_LABELS,
  ESTADO_COBRANZA_BADGE_VARIANT,
} from "@/lib/cobros.constants"
import {
  getSaldoPendienteFactura,
  getTotalCobradoFactura,
  getEstadoCobranzaFactura,
  getVencimientoFV,
} from "@/lib/cobros.utils"
import {
  StatsCard, StateBadge, SearchInput, FilterSelect,
  ConfirmDialog, SurgeryDrawer,
} from "@/components/shared"
import { CobroFormDialog } from "@/components/cobros/CobroFormDialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useExpedienteDrawer } from "@/components/layout/app-shell"
import { toast } from "sonner"
import {
  Receipt, DollarSign, CreditCard, Eye, MoreHorizontal,
  Plus, FileText, Clock, CheckCircle2, FolderOpen,
  Banknote, CircleDollarSign, AlertTriangle, AlertCircle,
} from "lucide-react"
import type { Comprobante } from "@/types"

// ── Filter options ──
const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Emitida", label: "Emitida" },
  { value: "Cobrado", label: "Cobrado" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Anulada", label: "Anulada" },
]

export default function FacturacionPage() {
  const store = useOrtoTrackStore()
  const { openExpediente } = useExpedienteDrawer()

  // ── Filters ──
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [clientFilter, setClientFilter] = useState("")

  // ── Dialogs ──
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [newFacturaDialogOpen, setNewFacturaDialogOpen] = useState(false)
  const [cobroDialogOpen, setCobroDialogOpen] = useState(false)
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null)
  const [activeTab, setActiveTab] = useState("todas")

  // ── New factura form ──
  const [facturaSurgeryId, setFacturaSurgeryId] = useState("")
  const [facturaNumber, setFacturaNumber] = useState("")
  const [facturaClient, setFacturaClient] = useState("")
  const [facturaAmount, setFacturaAmount] = useState(0)
  const [facturaConcept, setFacturaConcept] = useState("")

  // ── FV comprobantes enriched ──
  const imputaciones = store.imputaciones ?? []

  const fvEnriched = useMemo(() => {
    return store.comprobantes
      .filter((c) => c.type === "FV")
      .map((c) => ({
        comprobante: c,
        cobrado: getTotalCobradoFactura(c.number, imputaciones),
        saldo: getSaldoPendienteFactura(c, imputaciones),
        estadoCobranza: getEstadoCobranzaFactura(c, imputaciones),
        vencimiento: getVencimientoFV(c),
        surgery: store.surgeries.find((s) => s.id === c.surgeryId),
      }))
  }, [store.comprobantes, imputaciones, store.surgeries])

  const filtered = useMemo(() => {
    let data = fvEnriched.slice()
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (f) =>
          f.comprobante.number.toLowerCase().includes(q) ||
          f.comprobante.client.toLowerCase().includes(q) ||
          f.comprobante.concept.toLowerCase().includes(q)
      )
    }
    if (stateFilter) data = data.filter((f) => f.comprobante.state === stateFilter)
    if (clientFilter) data = data.filter((f) => f.comprobante.client === clientFilter)
    return data.sort((a, b) => b.comprobante.date.localeCompare(a.comprobante.date))
  }, [fvEnriched, search, stateFilter, clientFilter])

  // ── Tab-specific data ──
  const tabData = useMemo(() => ({
    todas: filtered,
    sinCobrar: filtered.filter((f) => f.estadoCobranza === "sin_cobrar"),
    cobroParcial: filtered.filter((f) => f.estadoCobranza === "cobro_parcial"),
    cobradas: filtered.filter((f) => f.estadoCobranza === "cobrada"),
    vencidas: filtered.filter((f) => f.estadoCobranza === "vencida"),
  }), [filtered])

  const stats = useMemo(() => {
    const totalFacturado = filtered.reduce((sum, f) => sum + f.comprobante.amount, 0)
    const pendienteCobro = filtered.reduce((sum, f) => sum + f.saldo, 0)
    const cobrado = filtered.reduce((sum, f) => sum + f.cobrado, 0)
    const cantidad = filtered.length
    return { totalFacturado, pendienteCobro, cobrado, cantidad }
  }, [filtered])

  // ── Surgeries available for factura ──
  const availableSurgeries = store.surgeries.filter(
    (s) => !s.facturado && s.state === "Realizada" && s.autorizado
  )

  // ── Handlers ──
  const handleNewFactura = () => {
    if (!facturaNumber.trim() || !facturaClient) {
      toast.error("Complete los campos obligatorios")
      return
    }
    if (facturaSurgeryId) {
      store.authorizeInvoice(facturaSurgeryId, facturaNumber.trim())
    } else {
      store.addComprobante({
        surgeryId: "",
        type: "FV",
        number: facturaNumber.trim(),
        date: new Date().toISOString().split("T")[0],
        client: facturaClient,
        amount: facturaAmount,
        toCollect: facturaAmount,
        concept: facturaConcept,
        state: "Emitida",
      })
    }
    toast.success("Factura creada exitosamente")
    setNewFacturaDialogOpen(false)
    setFacturaSurgeryId("")
    setFacturaNumber("")
    setFacturaClient("")
    setFacturaAmount(0)
    setFacturaConcept("")
  }

  const handleRegistrarCobro = (comp: Comprobante) => {
    setSelectedComprobante(comp)
    setCobroDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Facturación</h1>
          <p className="text-sm text-muted-foreground">Facturas de venta emitidas</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setNewFacturaDialogOpen(true)}>
          <Plus className="size-4" /> Nueva Factura
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total facturado" value={formatCurrency(stats.totalFacturado)} icon={Receipt} />
        <StatsCard title="Pendiente cobro" value={formatCurrency(stats.pendienteCobro)} icon={Clock} />
        <StatsCard title="Cobrado" value={formatCurrency(stats.cobrado)} icon={CheckCircle2} />
        <StatsCard title="Cantidad" value={stats.cantidad} icon={FileText} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Número, cliente, concepto..." className="w-full sm:w-72" />
            <FilterSelect value={stateFilter} onChange={setStateFilter} options={STATE_OPTIONS} />
            <FilterSelect value={clientFilter} onChange={setClientFilter} options={CLIENT_OPTIONS} />
            {(stateFilter || clientFilter || search) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(""); setStateFilter(""); setClientFilter("") }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for cobranza state */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-0.5 p-0.5 bg-muted/50">
          <TabsTrigger value="todas" className="text-xs gap-1 px-2.5 py-1.5">
            <FileText className="size-3" /> Todas <span className="text-[9px] opacity-60">({tabData.todas.length})</span>
          </TabsTrigger>
          <TabsTrigger value="sinCobrar" className="text-xs gap-1 px-2.5 py-1.5">
            <AlertCircle className="size-3" /> Sin cobrar <span className="text-[9px] opacity-60">({tabData.sinCobrar.length})</span>
          </TabsTrigger>
          <TabsTrigger value="cobroParcial" className="text-xs gap-1 px-2.5 py-1.5">
            <CreditCard className="size-3" /> Cobro parcial <span className="text-[9px] opacity-60">({tabData.cobroParcial.length})</span>
          </TabsTrigger>
          <TabsTrigger value="cobradas" className="text-xs gap-1 px-2.5 py-1.5">
            <CheckCircle2 className="size-3" /> Cobradas <span className="text-[9px] opacity-60">({tabData.cobradas.length})</span>
          </TabsTrigger>
          <TabsTrigger value="vencidas" className="text-xs gap-1 px-2.5 py-1.5">
            <AlertTriangle className="size-3" /> Vencidas <span className="text-[9px] opacity-60">({tabData.vencidas.length})</span>
          </TabsTrigger>
        </TabsList>

        {["todas", "sinCobrar", "cobroParcial", "cobradas", "vencidas"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="text-sm text-muted-foreground">{tabData[tab as keyof typeof tabData].length} factura{tabData[tab as keyof typeof tabData].length !== 1 ? "s" : ""}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Número</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cliente</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Monto</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Cobrado</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Saldo</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Concepto</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Cobranza</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabData[tab as keyof typeof tabData].map((f) => (
                        <tr key={f.comprobante.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2.5">
                            <Badge variant={getBadgeVariant(f.comprobante.type)} className="text-[10px]">{f.comprobante.type}</Badge>
                          </td>
                          <td className="px-3 py-2.5 font-mono font-medium">{f.comprobante.number}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(f.comprobante.date)}</td>
                          <td className="px-3 py-2.5">{f.comprobante.client}</td>
                          <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(f.comprobante.amount)}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-700">{formatCurrency(f.cobrado)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={f.saldo > 0 ? "text-amber-700 font-medium" : "text-emerald-700"}>
                              {formatCurrency(f.saldo)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 max-w-[200px] truncate">{f.comprobante.concept}</td>
                          <td className="px-3 py-2.5">
                            <Badge variant={ESTADO_COBRANZA_BADGE_VARIANT[f.estadoCobranza]} className="text-[10px]">
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
                                      onClick={() => handleRegistrarCobro(f.comprobante)}
                                    >
                                      <Banknote className="size-3" /> Cobrar
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Registrar cobro</TooltipContent>
                                </Tooltip>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel className="text-xs">Acciones</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setSelectedComprobante(f.comprobante); setDetailDialogOpen(true) }}>
                                    <Eye className="size-4" /> Ver detalle
                                  </DropdownMenuItem>
                                  {f.comprobante.surgeryId && (
                                    <DropdownMenuItem onClick={() => openExpediente(f.comprobante.surgeryId)}>
                                      <FolderOpen className="size-4" /> Ver cirugía
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tabData[tab as keyof typeof tabData].length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                            No se encontraron facturas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Factura {selectedComprobante?.number}</DialogTitle>
            <DialogDescription>{selectedComprobante?.client} — {selectedComprobante?.concept}</DialogDescription>
          </DialogHeader>
          {selectedComprobante && (() => {
            const cobrado = getTotalCobradoFactura(selectedComprobante.number, store.imputaciones ?? [])
            const saldo = getSaldoPendienteFactura(selectedComprobante, store.imputaciones ?? [])
            const estadoCobranza = getEstadoCobranzaFactura(selectedComprobante, store.imputaciones ?? [])
            const cobrosForFV = store.getCobrosByFacturaId(selectedComprobante.number)
            const imputacionesForFV = store.getImputacionesByFacturaId(selectedComprobante.number)

            return (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Tipo</span>
                    <div className="mt-0.5"><Badge variant={getBadgeVariant(selectedComprobante.type)}>{selectedComprobante.type} — {comprobanteTypeLabels[selectedComprobante.type]}</Badge></div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Estado cobranza</span>
                    <div className="mt-0.5">
                      <Badge variant={ESTADO_COBRANZA_BADGE_VARIANT[estadoCobranza]}>
                        {ESTADO_COBRANZA_LABELS[estadoCobranza]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Fecha</span>
                    <p className="text-sm font-medium">{formatDate(selectedComprobante.date)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Cliente</span>
                    <p className="text-sm font-medium">{selectedComprobante.client}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Monto</span>
                    <p className="text-sm font-bold">{formatCurrency(selectedComprobante.amount)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Cobrado</span>
                    <p className="text-sm font-medium text-emerald-700">{formatCurrency(cobrado)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Saldo pendiente</span>
                    <p className={`text-sm font-medium ${saldo > 0 ? "text-amber-700" : "text-emerald-700"}`}>{formatCurrency(saldo)}</p>
                  </div>
                  {selectedComprobante.expiry && (
                    <div>
                      <span className="text-xs text-muted-foreground">Vencimiento</span>
                      <p className="text-sm">{formatDate(selectedComprobante.expiry)}</p>
                    </div>
                  )}
                </div>

                {/* Imputaciones / Cobros */}
                {imputacionesForFV.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Imputaciones de cobro</h4>
                    <div className="space-y-1">
                      {imputacionesForFV.map((imp) => {
                        const cobro = (store.cobrosV2 ?? []).find((c) => c.id === imp.cobroId)
                        return (
                          <div key={imp.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{imp.cobroId}</span>
                              <span className="text-muted-foreground">{cobro ? formatDate(cobro.fecha) : ""}</span>
                              <span className="text-muted-foreground">{cobro ? cobro.medioCobro : ""}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-emerald-700">{formatCurrency(imp.importeImputado)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {saldo > 0 && (
                  <div className="pt-2">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setCobroDialogOpen(true)
                        setDetailDialogOpen(false)
                      }}
                    >
                      <Banknote className="size-4" /> Registrar cobro
                    </Button>
                  </div>
                )}

                {/* Linked surgery */}
                {selectedComprobante.surgeryId && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Cirugía vinculada</h4>
                    <Button variant="outline" size="sm" onClick={() => { openExpediente(selectedComprobante.surgeryId); setDetailDialogOpen(false) }}>
                      <FolderOpen className="size-4 mr-1" /> {selectedComprobante.surgeryId}
                    </Button>
                  </div>
                )}
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Factura Dialog ── */}
      <Dialog open={newFacturaDialogOpen} onOpenChange={setNewFacturaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Factura</DialogTitle>
            <DialogDescription>Emitir factura de venta</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Cirugía (opcional)</Label>
              <Select value={facturaSurgeryId} onValueChange={(v) => {
                setFacturaSurgeryId(v)
                const s = store.getSurgeryById(v)
                if (s) {
                  setFacturaClient(s.client)
                  setFacturaConcept(`Factura - ${s.patient}`)
                  const presupuesto = store.presupuestos.find((p) => p.surgeryId === v)
                  if (presupuesto) setFacturaAmount(presupuesto.total)
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cirugía" /></SelectTrigger>
                <SelectContent>
                  {availableSurgeries.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.id} — {s.patient}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número de factura *</Label>
              <Input value={facturaNumber} onChange={(e) => setFacturaNumber(e.target.value)} placeholder="FV-2026-XXXX" />
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={facturaClient} onValueChange={setFacturaClient}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {CLIENT_OPTIONS.filter((o) => o.value).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" value={facturaAmount || ""} onChange={(e) => setFacturaAmount(Number(e.target.value) || 0)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input value={facturaConcept} onChange={(e) => setFacturaConcept(e.target.value)} placeholder="Descripción" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFacturaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleNewFactura} disabled={!facturaNumber.trim() || !facturaClient} className="bg-emerald-600 hover:bg-emerald-700">
              Emitir Factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cobro Dialog (uses CobroFormDialog) ── */}
      <CobroFormDialog
        open={cobroDialogOpen}
        onOpenChange={setCobroDialogOpen}
        context="invoice"
        preselectedFactura={selectedComprobante || undefined}
      />

      {/* Expediente Drawer */}
      <SurgeryDrawer />
    </div>
  )
}
