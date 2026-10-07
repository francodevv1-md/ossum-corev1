"use client"

import Link from "next/link"
import React, { useEffect, useMemo, Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { NovedadesTabContent } from "@/components/expediente/NovedadesTabContent"
import { useBackendActiveSurgeries } from "@/hooks/useBackendActiveSurgeries"
import { useOrtoTrackStore } from "@/lib/store"
import { useCirugiaActions } from "@/hooks/useCirugiaActions"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters"
import { getBadgeVariant, comprobanteTypeLabels, CLIENT_OPTIONS, INSTITUTION_OPTIONS, CLASSIFICATION_OPTIONS, SURGERY_STATE_OPTIONS } from "@/lib/statusHelpers"
import { canAutorizarFV, canRemitirNR, canCargarConsumo, canValidateConsumption } from "@/lib/businessRules"
import { getSaldoPendienteFactura } from "@/lib/cobros.utils"
import { getExpedienteEntryParam, resolveExpedienteLandingTab } from "@/lib/expediente-navigation"
import { StateBadge, StatsCard, SearchInput, FilterSelect } from "@/components/shared"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LegacyStandaloneNotice } from "@/components/legacy/LegacyStandaloneNotice"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  FileText, Receipt, ShoppingCart, Truck, Activity, Link2, BookOpen,
  MapPin, ArrowRightLeft, Stethoscope, CreditCard, AlertTriangle,
  StickyNote, History, Search, ShieldCheck, CheckCircle2, XCircle,
  Clock, Plus, Send, ThumbsUp, ThumbsDown, Lock, RotateCcw, Edit,
  Package, Box, DollarSign, CalendarDays, User, Building2,
  ChevronRight, Info,
} from "lucide-react"
import type {
  Surgery, SurgeryState, ComprobanteType,
  PresupuestoState, SurgeryClassification,
} from "@/types"

// ── Tab definitions ──
const TABS = [
  { value: "resumen", label: "Resumen", icon: FileText },
  { value: "presupuesto", label: "Presupuesto", icon: Receipt },
  { value: "pedido", label: "Pedido", icon: ShoppingCart },
  { value: "remitos", label: "Remitos", icon: Truck },
  { value: "consumo", label: "Consumo", icon: Activity },
  { value: "comprobantes", label: "Comprobantes", icon: Link2 },
  { value: "documentacion", label: "Documentación", icon: BookOpen },
  { value: "logistica", label: "Logística", icon: MapPin },
  { value: "transito", label: "Mat. Tránsito", icon: ArrowRightLeft },
  { value: "instrumentador", label: "Instrumentador", icon: Stethoscope },
  { value: "ventas", label: "Ventas/FV", icon: CreditCard },
  { value: "compras", label: "Compras", icon: AlertTriangle },
  { value: "novedades", label: "Seguimiento", icon: StickyNote },
  { value: "notas", label: "Notas", icon: StickyNote },
  { value: "historial", label: "Historial", icon: History },
  { value: "trazabilidad", label: "Trazabilidad", icon: Search },
] as const

type TabValue = typeof TABS[number]["value"]

export default function ExpedientePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando expediente...</p></div>}>
      <ExpedienteContent />
    </Suspense>
  )
}

function ExpedienteContent() {
  const searchParams = useSearchParams()
  const store = useOrtoTrackStore()
  const backendSurgeries = useBackendActiveSurgeries()
  const { persistStatusChange } = useCirugiaActions()

  const [selectedId, setSelectedId] = useState<string>("")
  const [activeTab, setActiveTab] = useState<TabValue>("resumen")
  const [surgerySearch, setSurgerySearch] = useState("")

  // Dialog states
  const [facturarDialogOpen, setFacturarDialogOpen] = useState(false)
  const [facturaNumber, setFacturaNumber] = useState("")
  const [compFilter, setCompFilter] = useState<string>("")
  const [seguimientoAddAction, setSeguimientoAddAction] = useState<"note" | undefined>(undefined)
  const [seguimientoAddActionKey, setSeguimientoAddActionKey] = useState(0)

  // Editing consumo
  const [editingConsumo, setEditingConsumo] = useState<Record<string, { consumed: number; returned: number }>>({})

  // Read URL param — derive initial value rather than setting state in effect
  const urlId = searchParams.get("id")?.trim() ?? ""
  const deepLinkedEntryId = getExpedienteEntryParam(searchParams)
  const urlTab = resolveExpedienteLandingTab(searchParams)
  const effectiveId = selectedId || urlId || ""

  useEffect(() => {
    if (!urlId) return
    setSelectedId((current) => (current === urlId ? current : urlId))
    setActiveTab(urlTab ?? "resumen")
  }, [urlId, urlTab])

  const surgery = store.getSurgeryById(effectiveId)
  const presupuestos = store.getPresupuestosBySurgeryId(effectiveId)
  const comprobantes = store.getComprobantesBySurgeryId(effectiveId)
  const remitos = store.getRemitosBySurgeryId(effectiveId)
  const consumo = store.getConsumoBySurgeryId(effectiveId)
  const notes = store.getNotesBySurgeryId(effectiveId)
  const history = store.getHistoryBySurgeryId(effectiveId)
  const docChecklist = store.getDocumentChecklistBySurgeryId(effectiveId)
  const logistics = store.getLogisticsBySurgeryId(effectiveId)
  const materialTransito = store.getMaterialTransitoBySurgeryId(effectiveId)
  const instrumentadorSurgery = store.getInstrumentadorSurgeryBySurgeryId(effectiveId)
  const box = store.getBoxBySurgeryId(effectiveId)
  const facturas = store.getFacturasBySurgeryId(effectiveId)
  const notasCredito = store.getNotasCreditoBySurgeryId(effectiveId)
  const notasDebito = store.getNotasDebitoBySurgeryId(effectiveId)
  const resumenCobranza = store.getResumenCobranzaBySurgeryId(effectiveId)
  const necesidades = store.getNecesidadesCompraBySurgeryId(effectiveId)
  const docStatus = store.getDocStatus(effectiveId)

  // Filtered surgeries for selector
  const filteredSurgeries = useMemo(() => {
    if (!surgerySearch) return store.surgeries
    const q = surgerySearch.toLowerCase()
    return store.surgeries.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.patient.toLowerCase().includes(q) ||
        s.surgeon.toLowerCase().includes(q) ||
        s.institution.toLowerCase().includes(q)
    )
  }, [store.surgeries, surgerySearch])

  // Filtered comprobantes
  const filteredComprobantes = useMemo(() => {
    if (!compFilter) return comprobantes
    return comprobantes.filter((c) => c.type === compFilter)
  }, [comprobantes, compFilter])

  // ── Actions ──
  const handleAutorizar = async () => {
    if (!surgery) return
    const result = await persistStatusChange(surgery, "Autorizada", { source: "expediente:autorizar" })
    if (result.ok) toast.success("Cirugía autorizada")
  }

  const handleFacturar = () => {
    if (!surgery || !facturaNumber.trim()) return
    store.authorizeInvoice(surgery.id, facturaNumber.trim())
    toast.success(`Factura ${facturaNumber} emitida`)
    setFacturarDialogOpen(false)
    setFacturaNumber("")
  }

  const handleValidateConsumo = () => {
    if (!consumo) return
    store.validateConsumption(consumo.id)
    toast.success("Consumo validado")
  }

  const openSeguimientoNoteComposer = () => {
    setSeguimientoAddAction("note")
    setSeguimientoAddActionKey((current) => current + 1)
    setActiveTab("novedades")
  }

  const handlePresupuestoAction = (prId: string, action: "enviar" | "aprobar" | "rechazar" | "bloquear") => {
    switch (action) {
      case "enviar": store.enviarPresupuesto(prId); toast.success("Presupuesto enviado"); break
      case "aprobar": store.authorizeBudget(prId); toast.success("Presupuesto aprobado"); break
      case "rechazar": store.rechazarPresupuesto(prId); toast.success("Presupuesto rechazado"); break
      case "bloquear": store.bloquearPresupuesto(prId); toast.success("Presupuesto bloqueado"); break
    }
  }

  const handleDocCheck = (itemType: string, completed: boolean) => {
    if (!surgery) return
    store.updateDocumentationChecklist(surgery.id, itemType, completed)
    toast.success(completed ? "Documento completado" : "Documento desmarcado")
  }

  const handleUpdateConsumoItem = (consumoId: string, stockItemId: string, field: "consumed" | "returned", value: number) => {
    store.updateConsumoItem(consumoId, stockItemId, { [field]: value })
  }

  if (!backendSurgeries.ready) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando cirugías desde backend...</p></div>
  }

  if (backendSurgeries.error) {
    return <div className="flex items-center justify-center h-64 px-6 text-center"><p className="text-sm text-red-600">Error al cargar cirugías desde backend: {backendSurgeries.error}</p></div>
  }

  // ── Surgery Selector (no ID selected) ──
  if (!surgery) {
    return (
      <div className="space-y-4">
        <LegacyStandaloneNotice
          description="La superficie real del expediente vive en Ficha CX dentro de Cirugías. Esta ruta standalone queda legacy/deprecada para evitar operar fuera del flujo vigente."
          tabHint="Usá Cirugías para seleccionar una cirugía y abrir su Ficha CX contextual."
        />

        <div>
          <h1 className="text-xl font-bold">Expediente Centro Relacional</h1>
          <p className="text-sm text-muted-foreground">Seleccione una cirugía para ver su expediente completo</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <SearchInput
              value={surgerySearch}
              onChange={setSurgerySearch}
              placeholder="Buscar por ID, paciente, médico, institución..."
              className="w-full sm:w-96"
            />
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Paciente</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">Médico</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden lg:table-cell">Institución</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSurgeries.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedId(s.id)}>
                      <td className="px-4 py-2.5 font-medium">{s.id}</td>
                      <td className="px-4 py-2.5">{s.patient}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell">{s.surgeon}</td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">{s.institution}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(s.date)}</td>
                      <td className="px-4 py-2.5"><StateBadge status={s.state} /></td>
                      <td className="px-4 py-2.5"><ChevronRight className="size-4 text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Main expediente with surgery selected ──
  const canAuthFV = canAutorizarFV(surgery, docStatus, consumo?.state)
  const canRemit = canRemitirNR(surgery)
  const canLoadConsumo = canCargarConsumo(surgery)
  const canValidate = canValidateConsumption(consumo?.state)

  const presupuesto = presupuestos[0]
  const peComprobantes = comprobantes.filter((c) => c.type === "PE")
  const fvComprobantes = comprobantes.filter((c) => c.type === "FV")
  const ncComprobantes = comprobantes.filter((c) => c.type === "NC")

  // Related OCs from necesidades
  const relatedOCIds = necesidades.map((n) => n.ordenCompraId).filter(Boolean)
  const relatedOCs = store.ordenesCompra.filter((oc) => relatedOCIds.includes(oc.id))

  return (
    <div className="space-y-4">
      <LegacyStandaloneNotice
        description="La superficie real del expediente vive en Ficha CX dentro de Cirugías. Esta ruta standalone queda legacy/deprecada para evitar operar fuera del flujo vigente."
        tabHint="Usá Cirugías para seleccionar una cirugía y abrir su Ficha CX contextual."
      />

      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId("")} className="shrink-0">
            ← Volver
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              Expediente {surgery.expedienteNumber || surgery.id}
            </h1>
            <p className="text-sm text-muted-foreground">
              {surgery.patient} • {surgery.classification} • {surgery.institution}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StateBadge status={surgery.state} />
          {surgery.facturado && <Badge variant="success">Facturada</Badge>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="w-full flex-wrap h-auto gap-0.5 p-0.5 bg-muted/50 mb-4">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-[11px] gap-1 px-2 py-1.5 data-[state=active]:shadow-sm"
                >
                  <Icon className="size-3" />
                  <span className="hidden xl:inline">{tab.label}</span>
                  <span className="xl:hidden">{tab.label.slice(0, 3)}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* ────── RESUMEN ────── */}
        <TabsContent value="resumen" className="space-y-4">
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Estado" value={surgery.state} icon={Info} />
            <StatsCard title="Preparación" value={surgery.preparationState} icon={Package} />
            <StatsCard
              title="Presupuesto"
              value={presupuesto ? formatCurrency(presupuesto.total) : "Sin PR"}
              icon={Receipt}
            />
            <StatsCard
              title="Facturado"
              value={surgery.facturado ? surgery.facturaNumber || "Sí" : "No"}
              icon={DollarSign}
            />
          </div>

          {/* Surgery data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Datos de la Cirugía</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "ID", value: surgery.id },
                  { label: "Paciente", value: surgery.patient },
                  { label: "DNI", value: surgery.patientDni || "—" },
                  { label: "Médico", value: surgery.surgeon },
                  { label: "Institución", value: surgery.institution },
                  { label: "Ciudad", value: surgery.institutionCity || "—" },
                  { label: "Procedimiento", value: surgery.procedure },
                  { label: "Fecha CX", value: formatDate(surgery.date) },
                  { label: "Hora", value: surgery.time || "—" },
                  { label: "Cliente", value: surgery.client },
                  { label: "Obra Social", value: surgery.obraSocial || "—" },
                  { label: "Clasificación", value: surgery.classification },
                  { label: "PR Nº", value: surgery.prNumber || "—" },
                  { label: "Expediente", value: surgery.expedienteNumber || "—" },
                  { label: "Instrumentador", value: surgery.instrumentador || "—" },
                  { label: "Vendedor", value: surgery.vendedor || "—" },
                  { label: "Autorizado", value: surgery.autorizado ? `Sí (${surgery.fechaAutorizacion || ""})` : "No" },
                  { label: "Doc. Estado", value: docStatus },
                ].map((item) => (
                  <div key={item.label} className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {!surgery.autorizado && surgery.state !== "Cancelada" && surgery.state !== "Suspendida" && (
                  <Button size="sm" className="gap-1.5" onClick={handleAutorizar}>
                    <ShieldCheck className="size-4" /> Autorizar
                  </Button>
                )}
                {canRemit.allowed && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.info("Generar remito desde pestaña Remitos")}>
                    <Truck className="size-4" /> Remitir
                  </Button>
                )}
                {canLoadConsumo.allowed && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.info("Cargar consumo desde pestaña Consumo")}>
                    <Activity className="size-4" /> Cargar consumo
                  </Button>
                )}
                {canValidate.allowed && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleValidateConsumo}>
                    <CheckCircle2 className="size-4" /> Validar consumo
                  </Button>
                )}
                {canAuthFV.allowed && (
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => setFacturarDialogOpen(true)}>
                    <Receipt className="size-4" /> Autorizar FV
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={openSeguimientoNoteComposer}>
                  <StickyNote className="size-4" /> Agregar nota
                </Button>
              </div>
              {canAuthFV.allowed && !canAuthFV.allowed && canAuthFV.reason && (
                <p className="text-xs text-muted-foreground mt-2">
                  No se puede facturar: {canAuthFV.reason}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────── PRESUPUESTO ────── */}
        <TabsContent value="presupuesto" className="space-y-4">
          {presupuesto ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold">{presupuesto.id}</h3>
                  <StateBadge status={presupuesto.state} />
                  {presupuesto.bloqueado && <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>}
                </div>
                <div className="flex gap-2">
                  {presupuesto.state === "Borrador" && (
                    <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => handlePresupuestoAction(presupuesto.id, "enviar")}>
                      <Send className="size-3" /> Enviar
                    </Button>
                  )}
                  {presupuesto.state === "Enviado" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => handlePresupuestoAction(presupuesto.id, "aprobar")}>
                        <ThumbsUp className="size-3" /> Aprobar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => handlePresupuestoAction(presupuesto.id, "rechazar")}>
                        <ThumbsDown className="size-3" /> Rechazar
                      </Button>
                    </>
                  )}
                  {!presupuesto.bloqueado && (
                    <Button size="sm" variant="ghost" className="gap-1 h-7" onClick={() => handlePresupuestoAction(presupuesto.id, "bloquear")}>
                      <Lock className="size-3" /> Bloquear
                    </Button>
                  )}
                </div>
              </div>
              <Card>
                <CardContent className="pt-4">
                  <div className="grid gap-3 sm:grid-cols-3 mb-4">
                    <div><span className="text-xs text-muted-foreground">Cliente</span><p className="text-sm font-medium">{presupuesto.client}</p></div>
                    <div><span className="text-xs text-muted-foreground">Vigencia</span><p className="text-sm font-medium">{presupuesto.vigencia || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground">Lista de precios</span><p className="text-sm font-medium">{presupuesto.listaPrecios || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground">Creado</span><p className="text-sm font-medium">{formatDate(presupuesto.createdAt)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Aprobado</span><p className="text-sm font-medium">{presupuesto.approvedAt ? formatDate(presupuesto.approvedAt) : "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground">Total</span><p className="text-sm font-bold">{formatCurrency(presupuesto.total)}</p></div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Código</TableHead>
                        <TableHead className="text-xs">Artículo</TableHead>
                        <TableHead className="text-xs text-right">Cant.</TableHead>
                        <TableHead className="text-xs text-right">Precio</TableHead>
                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presupuesto.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{item.code}</TableCell>
                          <TableCell className="text-xs">
                            {item.name}
                            {item.isArticuloZ && <Badge variant="warning" className="ml-2 text-[9px]">Art. Z</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Receipt className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin presupuesto</p>
                <p className="text-xs text-muted-foreground">No hay presupuesto asociado a esta cirugía</p>
                <Button size="sm" className="mt-4 gap-1.5" onClick={() => toast.info("Crear presupuesto desde cirugías")}>
                  <Plus className="size-3" /> Crear presupuesto
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── PEDIDO ────── */}
        <TabsContent value="pedido" className="space-y-4">
          {peComprobantes.length > 0 ? (
            peComprobantes.map((pe) => (
              <Card key={pe.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="info" className="text-[10px]">PE</Badge>
                      <span className="text-sm font-semibold">{pe.number}</span>
                    </div>
                    <StateBadge status={pe.state} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 text-sm">
                    <div><span className="text-xs text-muted-foreground">Fecha</span><p>{formatDate(pe.date)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Cliente</span><p>{pe.client}</p></div>
                    <div><span className="text-xs text-muted-foreground">Monto</span><p className="font-semibold">{formatCurrency(pe.amount)}</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{pe.concept}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <ShoppingCart className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin pedido</p>
                {presupuesto && presupuesto.state === "Aprobado" && (
                  <Button
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => {
                      store.generateOrderFromBudget(presupuesto.id)
                      toast.success("Pedido generado desde presupuesto")
                    }}
                  >
                    <Plus className="size-3" /> Generar pedido desde presupuesto
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── REMITOS ────── */}
        <TabsContent value="remitos" className="space-y-4">
          {remitos.length > 0 ? (
            remitos.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{r.id}</span>
                      <StateBadge status={r.state} />
                    </div>
                    {r.state === "Enviado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-7"
                        onClick={() => {
                          store.devolverRemito(
                            r.id,
                            r.items.map((it) => ({ stockItemId: it.stockItemId, returnedQuantity: it.sentQuantity - it.consumedQuantity }))
                          )
                          toast.success("Devolución registrada")
                        }}
                      >
                        <RotateCcw className="size-3" /> Devolver
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 text-sm mb-3">
                    <div><span className="text-xs text-muted-foreground">Destino</span><p>{r.destination || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground">Fecha</span><p>{formatDate(r.date)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Caja</span><p>{r.boxId}</p></div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Artículo</TableHead>
                        <TableHead className="text-xs text-right">Enviado</TableHead>
                        <TableHead className="text-xs text-right">Consumido</TableHead>
                        <TableHead className="text-xs text-right">Devuelto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.items.map((it, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{it.name}</TableCell>
                          <TableCell className="text-xs text-right">{it.sentQuantity}</TableCell>
                          <TableCell className="text-xs text-right">{it.consumedQuantity}</TableCell>
                          <TableCell className="text-xs text-right">{it.returnedQuantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Truck className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin remitos</p>
                {peComprobantes.length > 0 && box && (
                  <Button
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => {
                      store.generateDeliveryNoteFromOrder(peComprobantes[0].id, box.id)
                      toast.success("Remito generado")
                    }}
                  >
                    <Plus className="size-3" /> Generar remito
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── CONSUMO ────── */}
        <TabsContent value="consumo" className="space-y-4">
          {consumo ? (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{consumo.id}</span>
                    <StateBadge status={consumo.state} />
                  </div>
                  {canValidate.allowed && (
                    <Button size="sm" variant="outline" className="gap-1 h-7" onClick={handleValidateConsumo}>
                      <CheckCircle2 className="size-3" /> Validar
                    </Button>
                  )}
                </div>
                {consumo.validatedAt && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Validado por {consumo.validatedBy} el {formatDate(consumo.validatedAt)}
                  </p>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Artículo</TableHead>
                      <TableHead className="text-xs">Lote</TableHead>
                      <TableHead className="text-xs text-right">Consumido</TableHead>
                      <TableHead className="text-xs text-right">Devuelto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumo.items.map((it) => (
                      <TableRow key={it.stockItemId}>
                        <TableCell className="text-xs">
                          <div>
                            <p>{it.name}</p>
                            <p className="text-[10px] text-muted-foreground">{it.code} • {it.brand}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{it.lot || "—"}</TableCell>
                        <TableCell className="text-xs text-right">
                          {consumo.state === "Pendiente" ? (
                            <Input
                              type="number"
                              min={0}
                              value={editingConsumo[it.stockItemId]?.consumed ?? it.consumed}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0
                                setEditingConsumo((prev) => ({ ...prev, [it.stockItemId]: { ...prev[it.stockItemId], consumed: val } }))
                                handleUpdateConsumoItem(consumo.id, it.stockItemId, "consumed", val)
                              }}
                              className="w-16 h-7 text-xs text-right"
                            />
                          ) : (
                            it.consumed
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {consumo.state === "Pendiente" ? (
                            <Input
                              type="number"
                              min={0}
                              value={editingConsumo[it.stockItemId]?.returned ?? it.returned}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0
                                setEditingConsumo((prev) => ({ ...prev, [it.stockItemId]: { ...prev[it.stockItemId], returned: val } }))
                                handleUpdateConsumoItem(consumo.id, it.stockItemId, "returned", val)
                              }}
                              className="w-16 h-7 text-xs text-right"
                            />
                          ) : (
                            it.returned
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Activity className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin consumo cargado</p>
                {remitos.length > 0 && (
                  <Button
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => {
                      store.createConsumptionFromDeliveryNote(remitos[0].id)
                      toast.success("Consumo cargado desde remito")
                    }}
                  >
                    <Plus className="size-3" /> Cargar consumo
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── COMPROBANTES ────── */}
        <TabsContent value="comprobantes" className="space-y-4">
          <div className="flex items-center gap-2">
            <FilterSelect
              value={compFilter}
              onChange={setCompFilter}
              options={[
                { value: "", label: "Todos los tipos" },
                { value: "PR", label: "Presupuesto" },
                { value: "PE", label: "Pedido" },
                { value: "NR", label: "Nota de remisión" },
                { value: "FV", label: "Factura" },
                { value: "CO", label: "Cobro" },
                { value: "NC", label: "Nota de crédito" },
                { value: "ND", label: "Nota de débito" },
              ]}
            />
            <span className="text-sm text-muted-foreground">{filteredComprobantes.length} comprobante{filteredComprobantes.length !== 1 ? "s" : ""}</span>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Número</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComprobantes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant={getBadgeVariant(c.type)} className="text-[10px]">{c.type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{c.number}</TableCell>
                      <TableCell className="text-xs">{formatDate(c.date)}</TableCell>
                      <TableCell className="text-xs">{c.client}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                      <TableCell><StateBadge status={c.state} className="text-[10px]" /></TableCell>
                    </TableRow>
                  ))}
                  {filteredComprobantes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                        No hay comprobantes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────── DOCUMENTACIÓN ────── */}
        <TabsContent value="documentacion" className="space-y-4">
          {docChecklist ? (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">Checklist de Documentación</h3>
                    <p className="text-xs text-muted-foreground">Estado: <StateBadge status={docChecklist.status} className="text-[10px]" /></p>
                  </div>
                  {canAuthFV.allowed && !docChecklist.items.find((i) => i.type === "Autoriza facturación")?.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-7"
                      onClick={() => {
                        handleDocCheck("Autoriza facturación", true)
                        toast.success("Facturación autorizada")
                      }}
                    >
                      <ShieldCheck className="size-3" /> Autorizar FV
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {docChecklist.items.map((item) => (
                    <label
                      key={item.type}
                      className="flex items-center gap-3 rounded-md p-2.5 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) => handleDocCheck(item.type, !!checked)}
                      />
                      <div className="flex-1">
                        <p className={`text-sm ${item.completed ? "line-through text-muted-foreground" : "font-medium"}`}>
                          {item.type}
                        </p>
                        {item.completed && item.uploadedBy && (
                          <p className="text-[10px] text-muted-foreground">
                            Por {item.uploadedBy} el {item.uploadedAt ? formatDate(item.uploadedAt) : ""}
                          </p>
                        )}
                      </div>
                      {item.completed ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <Clock className="size-4 text-muted-foreground" />
                      )}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <BookOpen className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin checklist de documentación</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── LOGÍSTICA ────── */}
        <TabsContent value="logistica" className="space-y-4">
          {logistics ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">IDA</h4>
                    <StateBadge status={logistics.ida} />
                    {logistics.fechaEnvioMateriales && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Envío: {formatDate(logistics.fechaEnvioMateriales)}
                      </p>
                    )}
                    {logistics.registroSalida && (
                      <p className="text-xs text-muted-foreground">Salida: {logistics.registroSalida}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">VUELTA</h4>
                    <StateBadge status={logistics.vuelta} />
                    {logistics.registroRetiro && (
                      <p className="text-xs text-muted-foreground mt-2">Retiro: {logistics.registroRetiro}</p>
                    )}
                    {logistics.registroDevolucion && (
                      <p className="text-xs text-muted-foreground">Devolución: {logistics.registroDevolucion}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="pt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div><span className="text-xs text-muted-foreground">Preparación</span><p className="mt-1"><StateBadge status={logistics.preparation} /></p></div>
                    <div><span className="text-xs text-muted-foreground">Monto</span><p className="mt-1 text-sm font-semibold">{formatCurrency(logistics.amount)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Estado de caja</span><p className="mt-1"><StateBadge status={logistics.cajaState || "Sin preparar"} /></p></div>
                  </div>
                </CardContent>
              </Card>
              {box && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Caja: {box.name}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Artículo</TableHead>
                          <TableHead className="text-xs text-right">Cant.</TableHead>
                          <TableHead className="text-xs text-right">Consumido</TableHead>
                          <TableHead className="text-xs text-right">Devuelto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {box.contents.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{c.name}</TableCell>
                            <TableCell className="text-xs text-right">{c.quantity}</TableCell>
                            <TableCell className="text-xs text-right">{c.consumed}</TableCell>
                            <TableCell className="text-xs text-right">{c.returned}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <MapPin className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin datos de logística</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── MATERIAL EN TRÁNSITO ────── */}
        <TabsContent value="transito" className="space-y-4">
          {materialTransito.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Artículo</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Institución</TableHead>
                      <TableHead className="text-xs">Comprobante</TableHead>
                      <TableHead className="text-xs">Depósito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialTransito.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">
                          <div><p>{m.articleName}</p><p className="text-[10px] text-muted-foreground">{m.articleCode}</p></div>
                        </TableCell>
                        <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{m.type}</Badge></TableCell>
                        <TableCell className="text-xs">{m.institution}</TableCell>
                        <TableCell className="text-xs font-mono">{m.comprobanteSalida}</TableCell>
                        <TableCell className="text-xs">{m.deposit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <ArrowRightLeft className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin material en tránsito</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── INSTRUMENTADOR ────── */}
        <TabsContent value="instrumentador" className="space-y-4">
          {instrumentadorSurgery ? (
            <Card>
              <CardContent className="pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><span className="text-xs text-muted-foreground">Instrumentador</span><p className="text-sm font-medium">{instrumentadorSurgery.instrumentadorName}</p></div>
                  <div><span className="text-xs text-muted-foreground">Estado</span><p className="mt-1"><StateBadge status={instrumentadorSurgery.state} /></p></div>
                  <div><span className="text-xs text-muted-foreground">Pagada</span><p>{instrumentadorSurgery.pagada ? "Sí" : "No"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Precio</span><p className="font-semibold">{formatCurrency(instrumentadorSurgery.price)}</p></div>
                  <div><span className="text-xs text-muted-foreground">Documentación completa</span><p>{instrumentadorSurgery.documentacionCompleta ? "Sí" : "No"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Autorización OK</span><p>{instrumentadorSurgery.autorizacionOK ? "Sí" : "No"}</p></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Stethoscope className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin instrumentador asignado</p>
                {store.instrumentadores.length > 0 && (
                  <Select onValueChange={(v) => {
                    store.assignInstrumenter(surgery.id, v)
                    toast.success("Instrumentador asignado")
                  }}>
                    <SelectTrigger className="w-64 mt-4"><SelectValue placeholder="Asignar instrumentador" /></SelectTrigger>
                    <SelectContent>
                      {store.instrumentadores.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── VENTAS / FV ────── */}
        <TabsContent value="ventas" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Recibo digital mock</p>
                <p className="text-xs text-muted-foreground">
                  Acceso rápido contextual para esta cirugía desde Ventas/Cobros.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/ventas/recibos?from=expediente&surgeryId=${encodeURIComponent(surgery.id)}`}>
                    <FileText className="size-4" /> Ver recibos
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/ventas/recibos/nuevo?from=expediente&surgeryId=${encodeURIComponent(surgery.id)}`}>
                    <Receipt className="size-4" /> Crear recibo mock
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Facturas */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Facturas de Venta</h3>
            {fvComprobantes.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Número</TableHead>
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-xs text-right">Monto</TableHead>
                        <TableHead className="text-xs text-right">A cobrar</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fvComprobantes.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="text-xs font-mono">{f.number}</TableCell>
                          <TableCell className="text-xs">{formatDate(f.date)}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(f.amount)}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(getSaldoPendienteFactura(f, store.imputaciones))}</TableCell>
                          <TableCell><StateBadge status={f.state} className="text-[10px]" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Sin facturas de venta</p>
            )}
          </div>

          {/* Notas de crédito */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Notas de Crédito</h3>
            {notasCredito.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Motivo</TableHead>
                      <TableHead className="text-xs text-right">Importe</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {notasCredito.map((nc) => (
                        <TableRow key={nc.id}>
                          <TableCell className="text-xs font-mono">{nc.id}</TableCell>
                          <TableCell className="text-xs">{nc.motivo}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(nc.importe)}</TableCell>
                          <TableCell><StateBadge status={nc.state} className="text-[10px]" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Sin notas de crédito</p>
            )}
          </div>

          {/* Notas de débito */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Notas de Débito</h3>
            {notasDebito.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Motivo</TableHead>
                      <TableHead className="text-xs text-right">Importe</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {notasDebito.map((nd) => (
                        <TableRow key={nd.id}>
                          <TableCell className="text-xs font-mono">{nd.id}</TableCell>
                          <TableCell className="text-xs">{nd.motivo}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(nd.importe)}</TableCell>
                          <TableCell><StateBadge status={nd.state} className="text-[10px]" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Sin notas de débito</p>
            )}
          </div>

          {/* Cobros */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Cobros</h3>
            {resumenCobranza.facturas.length > 0 ? (
              <div className="space-y-3">
                {resumenCobranza.facturas.map((fv) => (
                  <Card key={fv.facturaNumber}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="info" className="text-[10px]">FV</Badge>
                          <span className="text-sm font-semibold">{fv.facturaNumber}</span>
                        </div>
                        <StateBadge status={fv.estadoCobranza === "cobrada" ? "Cobrado" : fv.estadoCobranza === "cobro_parcial" ? "Parcial" : fv.estadoCobranza === "vencida" ? "Vencida" : "Pendiente"} className="text-[10px]" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3 text-sm mb-2">
                        <div><span className="text-xs text-muted-foreground">Total</span><p className="font-semibold">{formatCurrency(fv.totalFactura)}</p></div>
                        <div><span className="text-xs text-muted-foreground">Cobrado</span><p className="text-emerald-600 font-medium">{formatCurrency(fv.totalCobrado)}</p></div>
                        <div><span className="text-xs text-muted-foreground">Saldo</span><p className={fv.saldoPendiente > 0 ? "text-amber-600 font-medium" : "font-medium"}>{formatCurrency(fv.saldoPendiente)}</p></div>
                      </div>
                      {fv.cobros.length > 0 && (
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">Medio</TableHead>
                            <TableHead className="text-xs text-right">Importe Imputado</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {fv.cobros.map((co, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{formatDate(co.fecha)}</TableCell>
                                <TableCell className="text-xs">{co.medioCobro}</TableCell>
                                <TableCell className="text-xs text-right">{formatCurrency(co.importeImputado)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Sin cobros registrados</p>
            )}
          </div>
        </TabsContent>

        {/* ────── COMPRAS ────── */}
        <TabsContent value="compras" className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Necesidades de Compra</h3>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7"
                onClick={() => {
                  store.createNecesidadCompra({
                    stockItemId: undefined,
                    articleName: "Artículo por definir",
                    articleCode: "ART-Z-NEW",
                    isArticuloZ: true,
                    descripcionLibre: "Necesidad generada desde expediente",
                    cantidad: 1,
                    priority: "Alta",
                    origin: "Artículo Z",
                    surgeryId: surgery.id,
                    state: "Pendiente",
                  })
                  toast.success("Necesidad de compra generada")
                }}
              >
                <Plus className="size-3" /> Generar necesidad
              </Button>
            </div>
            {necesidades.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Artículo</TableHead>
                      <TableHead className="text-xs">Prioridad</TableHead>
                      <TableHead className="text-xs">Origen</TableHead>
                      <TableHead className="text-xs text-right">Cant.</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs">OC</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {necesidades.map((n) => (
                        <TableRow key={n.id}>
                          <TableCell className="text-xs font-mono">{n.id}</TableCell>
                          <TableCell className="text-xs">
                            {n.articleName}
                            {n.isArticuloZ && <Badge variant="warning" className="ml-1 text-[9px]">Z</Badge>}
                          </TableCell>
                          <TableCell><StateBadge status={n.priority} className="text-[10px]" /></TableCell>
                          <TableCell className="text-xs">{n.origin}</TableCell>
                          <TableCell className="text-xs text-right">{n.cantidad}</TableCell>
                          <TableCell><StateBadge status={n.state} className="text-[10px]" /></TableCell>
                          <TableCell className="text-xs font-mono">{n.ordenCompraId || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Sin necesidades de compra</p>
            )}
          </div>

          {/* Related OCs */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Órdenes de Compra Vinculadas</h3>
            {relatedOCs.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Proveedor</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {relatedOCs.map((oc) => (
                        <TableRow key={oc.id}>
                          <TableCell className="text-xs font-mono">{oc.id}</TableCell>
                          <TableCell className="text-xs">{oc.proveedorName}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(oc.total)}</TableCell>
                          <TableCell><StateBadge status={oc.state} className="text-[10px]" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Sin órdenes de compra vinculadas</p>
            )}
          </div>
        </TabsContent>

        {/* ────── SEGUIMIENTO ────── */}
        <TabsContent value="novedades" className="space-y-4">
          <NovedadesTabContent
            surgery={surgery}
            initialFocusEntryId={deepLinkedEntryId}
            initialAddAction={seguimientoAddAction}
            initialAddActionKey={seguimientoAddActionKey}
          />
        </TabsContent>

        {/* ────── NOTAS ────── */}
        <TabsContent value="notas" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Notas legacy ({notes.length})</h3>
              <p className="text-xs text-muted-foreground">Histórico en solo lectura. Las nuevas novedades, menciones y notificaciones se cargan desde Seguimiento.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1 h-7" onClick={openSeguimientoNoteComposer}>
              <StickyNote className="size-3" /> Ir a Seguimiento
            </Button>
          </div>
          {notes.length > 0 ? (
            <div className="space-y-2">
              {notes.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)).map((n) => (
                <Card key={n.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm">{n.text}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={n.priority === "Alta" ? "destructive" : n.priority === "Media" ? "warning" : "secondary"} className="text-[9px]">
                            {n.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">{n.type}</Badge>
                          {n.isInternal && <Badge variant="outline" className="text-[9px]">Interna</Badge>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs text-muted-foreground">{n.userName}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDateTime(n.date, n.time)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <StickyNote className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin notas legacy</p>
                <p className="text-xs text-muted-foreground">Usá Seguimiento para registrar nuevas novedades del caso.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── HISTORIAL ────── */}
        <TabsContent value="historial" className="space-y-4">
          {history.length > 0 ? (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />
              {history.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)).map((h) => (
                <div key={h.id} className="relative mb-4 last:mb-0">
                  <div className="absolute -left-[13px] top-1.5 size-2.5 rounded-full bg-primary" />
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{h.action}</p>
                          <p className="text-xs text-muted-foreground">{h.details}</p>
                          {h.previousValue && h.newValue && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="secondary" className="text-[9px]">{h.previousValue}</Badge>
                              <span className="text-[10px]">→</span>
                              <Badge variant="info" className="text-[9px]">{h.newValue}</Badge>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xs text-muted-foreground">{h.userName}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(h.date, h.time)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <History className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin historial</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── TRAZABILIDAD ────── */}
        <TabsContent value="trazabilidad" className="space-y-4">
          {store.traceEntries.filter((t) => {
            const consumoItems = consumo?.items.map((ci) => ci.stockItemId) || []
            const boxItems = box?.contents.map((bc) => bc.stockItemId) || []
            return consumoItems.includes(t.stockItemId) || boxItems.includes(t.stockItemId)
          }).length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Artículo</TableHead>
                    <TableHead className="text-xs">Lote</TableHead>
                    <TableHead className="text-xs">Acción</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Usuario</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {store.traceEntries
                      .filter((t) => {
                        const consumoItems = consumo?.items.map((ci) => ci.stockItemId) || []
                        const boxItems = box?.contents.map((bc) => bc.stockItemId) || []
                        return consumoItems.includes(t.stockItemId) || boxItems.includes(t.stockItemId)
                      })
                      .map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">
                            <div><p>{t.itemName}</p><p className="text-[10px] text-muted-foreground">{t.code}</p></div>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{t.lot}</TableCell>
                          <TableCell className="text-xs">{t.action}</TableCell>
                          <TableCell className="text-xs">{formatDateTime(t.timestamp)}</TableCell>
                          <TableCell className="text-xs">{t.userName}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Search className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin registros de trazabilidad</p>
                <p className="text-xs text-muted-foreground">Los registros aparecerán cuando haya movimientos de stock</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Facturar Dialog ── */}
      <Dialog open={facturarDialogOpen} onOpenChange={setFacturarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Autorizar Factura</DialogTitle>
            <DialogDescription>
              Emitir factura para cirugía {surgery.id} — {surgery.patient}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Número de factura *</Label>
            <Input
              className="mt-1.5"
              value={facturaNumber}
              onChange={(e) => setFacturaNumber(e.target.value)}
              placeholder="FV-2026-XXXX"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFacturarDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleFacturar} disabled={!facturaNumber.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              Emitir Factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
