"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { ExpedienteHeader } from "./ExpedienteHeader"
import { FichaTabContent } from "./FichaTabContent"
import { ComercialTabContent } from "./ComercialTabContent"
import { DocumentacionTrazabilidadTab } from "./DocumentacionTrazabilidadTab"
import { LogisticaTabContent } from "./LogisticaTabContent"
import { ConsumoPanel } from "./ConsumoPanel"
import { InstrumentadorPanel } from "./InstrumentadorPanel"
import { HistorialPanel } from "./HistorialPanel"
import { ExpedienteCorreoTab } from "./correo/ExpedienteCorreoTab"
import { EditFichaDrawer } from "./EditFichaDrawer"
import { NovedadesTabContent } from "./NovedadesTabContent"
import { CajasTabContent } from "./CajasTabContent"
import { EXPEDIENTE_TABS, EXPEDIENTE_MORE_TABS } from "@/lib/cirugias.constants"
import type { Surgery, SurgeryState, Presupuesto, Comprobante, Remito, Consumo, SurgeryNote, HistoryEntry, SurgeryDocumentChecklist, LogisticsDetail, InstrumentadorSurgery, Box, MaterialTransito } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"
import { getPendientePrincipal } from "@/lib/cirugias.utils"
import { cn } from "@/lib/utils"
import { buildExpedienteHeaderModel } from "./expediente-header.model"
import { ServerBackedFeatureBlockedState } from "./ServerBackedFeatureBlockedState"
import { isLegacyMockSurgeryId } from "@/lib/store"
import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError, apiFetch } from "@/lib/api/client"
import { usePresupuestos } from "@/hooks/usePresupuestos"
import { toLegacyPresupuestoProjection } from "@/lib/api/presupuestos"

type ServerBackedAvailabilityState = "allowed" | "blocked"

interface ExpedienteFullViewProps {
  surgery: Surgery
  presupuestos: Presupuesto[]
  comprobantes: Comprobante[]
  remitos: Remito[]
  consumo?: Consumo
  notes: SurgeryNote[]
  history: HistoryEntry[]
  docChecklist?: SurgeryDocumentChecklist
  logistics?: LogisticsDetail
  docStatus: string
  materialTransito: MaterialTransito[]
  instrumentadorSurgery?: InstrumentadorSurgery
  box?: Box
  resumenCobranza: ResumenCobranzaSurgery
  facturacionStatus: string
  expTab: string
  setExpTab: (tab: string) => void
  onBack: () => void
  onSetDialogSurgery: (s: Surgery) => void
  onSetFacturarDialogOpen: (open: boolean) => void
  onSetNoteDialogOpen: (open: boolean) => void
  onSetSuspendDialogOpen: (open: boolean) => void
  onSetCancelDialogOpen: (open: boolean) => void
  onSetChangeStateDialogOpen: (open: boolean) => void
  onSetChangeDateDialogOpen: (open: boolean) => void
  onSetNewState: (state: SurgeryState) => void
  onRecover: (s: Surgery) => void
  onAutorizar: (s: Surgery) => void
  onOpenPresupuestoDialog: (s: Surgery) => void
  editingConsumo: Record<string, { consumed: number; returned: number }>
  setEditingConsumo: (v: Record<string, { consumed: number; returned: number }>) => void
}

export function ExpedienteFullView({
  surgery, comprobantes, remitos, consumo, notes, history,
  docChecklist, logistics, docStatus, materialTransito, instrumentadorSurgery,
  box, resumenCobranza, facturacionStatus, expTab, setExpTab,
  onBack, onSetDialogSurgery, onSetFacturarDialogOpen,
  onSetNoteDialogOpen, onSetSuspendDialogOpen, onSetCancelDialogOpen,
  onSetChangeStateDialogOpen, onSetChangeDateDialogOpen, onSetNewState,
  onRecover, onOpenPresupuestoDialog, editingConsumo, setEditingConsumo,
}: ExpedienteFullViewProps) {
  const { activeCompany } = useAuth()
  const [isEditFichaOpen, setIsEditFichaOpen] = useState(false)
  const [operationalFreshnessKey, setOperationalFreshnessKey] = useState(0)
  const [serverBackedAvailabilityBySurgeryId, setServerBackedAvailabilityBySurgeryId] = useState<Record<string, ServerBackedAvailabilityState>>({})
  const presupuestoAuthority = usePresupuestos({ surgeryId: surgery.backendId ?? surgery.id, take: 100 })
  const presupuestoId = (presupuestoAuthority.current ?? presupuestoAuthority.draft)?.id
  const canonicalPresupuestos = useMemo<Presupuesto[]>(
    () => presupuestoAuthority.presupuestos.map(toLegacyPresupuestoProjection),
    [presupuestoAuthority.presupuestos],
  )
  const remitoId = remitos[0]?.id
  const fvNumber = surgery.facturaNumber || comprobantes.find(c => c.type === "FV")?.number || undefined
  const consumoState = consumo?.state
  const cobrosTotal = resumenCobranza.totalCobrado
  const pendiente = getPendientePrincipal(surgery, docStatus, consumo, box)
  const headerModel = buildExpedienteHeaderModel({ surgery, docStatus, presupuestoId, remitoId, fvNumber, consumoState, facturacionStatus, cobrosTotal, pendiente })
  const PRIMARY_TABS = EXPEDIENTE_TABS
  const MORE_TABS = EXPEDIENTE_MORE_TABS
  const validTab = EXPEDIENTE_TABS.some(t => t.value === expTab) || EXPEDIENTE_MORE_TABS.some(t => t.value === expTab) ? expTab : "ficha"
  const isLegacyMockSurgery = isLegacyMockSurgeryId(surgery.id)
  const isServerBackedTab = validTab === "novedades" || validTab === "correo"
  const serverBackedAvailability = serverBackedAvailabilityBySurgeryId[surgery.id]
  const shouldVerifyServerBackedAvailability = Boolean(
    activeCompany?.id
    && isServerBackedTab
    && !serverBackedAvailability
  )
  const isServerBackedAvailabilityPending = shouldVerifyServerBackedAvailability
  const shouldBlockServerBackedFeatures = serverBackedAvailability === "blocked"

  const tabsRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const refreshOperationalSurfaces = useCallback(() => {
    setOperationalFreshnessKey((current) => current + 1)
  }, [])

  const checkScroll = () => {
    if (!tabsRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = tabsRef.current
    if (el) {
      el.addEventListener("scroll", checkScroll)
      window.addEventListener("resize", checkScroll)
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [])

  useEffect(() => {
    if (!shouldVerifyServerBackedAvailability || !activeCompany?.id) {
      return
    }

    let cancelled = false

    apiFetch(
      `/api/companies/${encodeURIComponent(activeCompany.id)}/surgeries/${encodeURIComponent(surgery.id)}/mail-links`
    )
      .then(() => {
        if (cancelled) return

        setServerBackedAvailabilityBySurgeryId((current) => (
          current[surgery.id] === "allowed" ? current : { ...current, [surgery.id]: "allowed" }
        ))
      })
      .catch((error: unknown) => {
        if (cancelled) return

        const nextState: ServerBackedAvailabilityState = error instanceof ApiClientError && error.code === "surgery_not_found"
          ? "blocked"
          : "allowed"

        setServerBackedAvailabilityBySurgeryId((current) => (
          current[surgery.id] === nextState ? current : { ...current, [surgery.id]: nextState }
        ))
      })

    return () => {
      cancelled = true
    }
  }, [activeCompany?.id, shouldVerifyServerBackedAvailability, surgery.id])

  const scrollTabs = (dir: "left" | "right") => {
    if (!tabsRef.current) return
    tabsRef.current.scrollBy({ left: dir === "left" ? -150 : 150, behavior: "smooth" })
  }

  const isActiveInMore = MORE_TABS.some(t => t.value === validTab)
  const tabContentClassName = "mt-0 outline-none"

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Back — compact, minimal height */}
      <div className="flex shrink-0 items-center px-2 pt-1 pb-0.5 sm:px-3">
        <Button variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800/70 sm:text-xs" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3 w-3" />
          Cirugías
        </Button>
      </div>

      {/* Header + Tabs + Content — one single flex column, no extra wrappers */}
      <ExpedienteHeader
        surgery={surgery}
        docStatus={docStatus}
        presupuestoId={presupuestoId}
        consumoState={consumoState}
        model={headerModel}
        onEditFicha={() => {
          setExpTab("ficha")
          setIsEditFichaOpen(true)
        }}
        onViewPR={() => setExpTab("comercial")}
        onGeneratePR={() => onOpenPresupuestoDialog(surgery)}
        onViewDocumentacion={() => setExpTab("documentacion")}
        onViewRemitos={() => setExpTab("logistica")}
        onViewConsumo={() => setExpTab("consumo")}
        onSetDialogSurgery={onSetDialogSurgery}
        onSetFacturarDialogOpen={onSetFacturarDialogOpen}
        onSetNoteDialogOpen={onSetNoteDialogOpen}
        onSetSuspendDialogOpen={onSetSuspendDialogOpen}
        onSetCancelDialogOpen={onSetCancelDialogOpen}
        onSetChangeStateDialogOpen={onSetChangeStateDialogOpen}
        onSetChangeDateDialogOpen={onSetChangeDateDialogOpen}
        onSetNewState={onSetNewState}
        onRecover={onRecover}
      />

      {/* Tabs — glued directly under header */}
      <Tabs value={validTab} onValueChange={setExpTab} className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center border-b border-slate-200 bg-white px-1 dark:border-slate-800 dark:bg-slate-950/95 sm:px-2">
          {canScrollLeft && <Button variant="ghost" size="sm" className="h-7 w-5 shrink-0 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100" onClick={() => scrollTabs("left")}><ChevronLeft className="size-3" /></Button>}
          <div ref={tabsRef} className="flex-1 overflow-x-auto scrollbar-none">
            <TabsList className="h-8 w-max justify-start gap-0 bg-transparent p-0">
              {PRIMARY_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="relative h-8 gap-1 whitespace-nowrap rounded-none border-b-2 border-transparent px-2.5 text-[11px] text-slate-600 hover:text-slate-950 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-slate-950 data-[state=active]:shadow-none dark:text-slate-400 dark:hover:text-slate-100 dark:data-[state=active]:text-slate-100 sm:text-xs">
                    <Icon className="size-3" />
                    {tab.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>
          {canScrollRight && <Button variant="ghost" size="sm" className="h-7 w-5 shrink-0 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100" onClick={() => scrollTabs("right")}><ChevronRight className="size-3" /></Button>}

          {MORE_TABS.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={cn("h-8 shrink-0 gap-1 rounded-none border-b-2 px-2 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 sm:text-xs", isActiveInMore ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground dark:text-slate-400")}>
                  <MoreHorizontal className="size-3" />
                  Más
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                {MORE_TABS.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <DropdownMenuItem key={tab.value} onClick={() => setExpTab(tab.value)} className={cn("text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50", validTab === tab.value && "bg-accent dark:bg-slate-800")}>
                      <Icon className="mr-2 size-4" />
                      {tab.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content — single scroll, full width, minimal padding */}
        <div className="flex-1 overflow-y-auto bg-slate-50/40 dark:bg-slate-950">
          <div className="w-full px-2 py-2 sm:px-3 sm:py-2.5">
            <TabsContent value="ficha" className={tabContentClassName}>
              <FichaTabContent
                surgery={surgery}
                presupuestos={canonicalPresupuestos}
                comprobantes={comprobantes}
                remitos={remitos}
                notes={notes}
                history={history}
                resumenCobranza={resumenCobranza}
                onAddNote={() => { onSetDialogSurgery(surgery); onSetNoteDialogOpen(true) }}
                onEditFicha={() => setIsEditFichaOpen(true)}
                onViewRemitos={() => setExpTab("logistica")}
              />
            </TabsContent>

            <TabsContent value="novedades" className={tabContentClassName}>
              {shouldBlockServerBackedFeatures ? <ServerBackedFeatureBlockedState featureLabel="Seguimiento" isLegacyMockSurgery={isLegacyMockSurgery} /> : isServerBackedAvailabilityPending ? <ServerBackedFeatureBlockedState featureLabel="Seguimiento" state="verifying" /> : <NovedadesTabContent surgery={surgery} />}
            </TabsContent>

            <TabsContent value="comercial" className={tabContentClassName}><ComercialTabContent surgery={surgery} presupuestos={canonicalPresupuestos} onOpenPresupuestoDialog={onOpenPresupuestoDialog} remitos={remitos} box={box} comprobantes={comprobantes} resumenCobranza={resumenCobranza} /></TabsContent>
            <TabsContent value="consumo" className={tabContentClassName}><ConsumoPanel surgery={surgery} consumo={consumo} remitos={remitos} box={box} editingConsumo={editingConsumo} setEditingConsumo={setEditingConsumo} freshnessKey={operationalFreshnessKey} onDevolucionConfirmed={refreshOperationalSurfaces} /></TabsContent>
            <TabsContent value="documentacion" className={tabContentClassName}><DocumentacionTrazabilidadTab surgery={surgery} docChecklist={docChecklist} docStatus={docStatus} remitos={remitos} consumo={consumo} box={box} freshnessKey={operationalFreshnessKey} /></TabsContent>
            <TabsContent value="logistica" className={tabContentClassName}><LogisticaTabContent surgery={surgery} logistics={logistics} box={box} remitos={remitos} materialTransito={materialTransito} freshnessKey={operationalFreshnessKey} /></TabsContent>
            <TabsContent value="correo" className={tabContentClassName}>
              {shouldBlockServerBackedFeatures ? <ServerBackedFeatureBlockedState featureLabel="Correo" isLegacyMockSurgery={isLegacyMockSurgery} /> : isServerBackedAvailabilityPending ? <ServerBackedFeatureBlockedState featureLabel="Correo" state="verifying" /> : <ExpedienteCorreoTab surgery={surgery} />}
            </TabsContent>
            <TabsContent value="cajas" className={tabContentClassName}><CajasTabContent surgeryId={surgery.id} /></TabsContent>
            <TabsContent value="instrumentador" className={tabContentClassName}><InstrumentadorPanel surgery={surgery} instrumentadorSurgery={instrumentadorSurgery} /></TabsContent>
            <TabsContent value="historial" className={tabContentClassName}><HistorialPanel surgery={surgery} history={history} /></TabsContent>
          </div>
        </div>
      </Tabs>

      <EditFichaDrawer surgery={surgery} open={isEditFichaOpen} onOpenChange={setIsEditFichaOpen} />
    </div>
  )
}
