"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Mail, MoreHorizontal } from "lucide-react"
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
import { MobileExpedienteTabs, type ExpTabKey } from "./MobileExpedienteTabs"
import { useIsMobile } from "@/hooks/useIsMobile"
import { EXPEDIENTE_TABS, EXPEDIENTE_MORE_TABS } from "@/lib/cirugias.constants"
import type {
  Surgery,
  SurgeryState,
  Presupuesto,
  Comprobante,
  Remito,
  Consumo,
  SurgeryNote,
  HistoryEntry,
  SurgeryDocumentChecklist,
  LogisticsDetail,
  InstrumentadorSurgery,
  Box,
  MaterialTransito,
} from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"
import { getPendientePrincipal } from "@/lib/cirugias.utils"
import { cn } from "@/lib/utils"
import { buildExpedienteHeaderModel } from "./expediente-header.model"
import { ServerBackedFeatureBlockedState } from "./ServerBackedFeatureBlockedState"
import { isLegacyMockSurgeryId } from "@/lib/store"
import { useAuth } from "@/components/auth/AuthProvider"
import { ApiClientError, apiFetch } from "@/lib/api/client"

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
  onAddNoteToSeguimiento: (s: Surgery) => void
  /** Legacy entry point for surfaces that still own an AddNoteDialog
   *  (e.g. CoordinatorInboxView). Unused in cirugias. */
  onSetNoteDialogOpen?: (open: boolean) => void
  initialAddAction?: "note" | "mail" | "image" | "auth"
  initialAddActionKey?: number
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
  surgery,
  presupuestos,
  comprobantes,
  remitos,
  consumo,
  notes,
  history,
  docChecklist,
  logistics,
  docStatus,
  materialTransito,
  instrumentadorSurgery,
  box,
  resumenCobranza,
  facturacionStatus,
  expTab,
  setExpTab,
  onBack,
  onSetDialogSurgery,
  onSetFacturarDialogOpen,
  onAddNoteToSeguimiento,
  initialAddAction = "note",
  initialAddActionKey = 0,
  onSetSuspendDialogOpen,
  onSetCancelDialogOpen,
  onSetChangeStateDialogOpen,
  onSetChangeDateDialogOpen,
  onSetNewState,
  onRecover,
  onAutorizar: _onAutorizar,
  onOpenPresupuestoDialog,
  editingConsumo,
  setEditingConsumo,
}: ExpedienteFullViewProps) {
  const { activeCompany } = useAuth()
  const isMobile = useIsMobile()
  const [isEditFichaOpen, setIsEditFichaOpen] = useState(false)
  const [operationalFreshnessKey, setOperationalFreshnessKey] = useState(0)
  const [serverBackedAvailabilityBySurgeryId, setServerBackedAvailabilityBySurgeryId] = useState<
    Record<string, ServerBackedAvailabilityState>
  >({})
  const presupuestoId = presupuestos[0]?.id
  const remitoId = remitos[0]?.id
  const fvNumber = surgery.facturaNumber || comprobantes.find((c) => c.type === "FV")?.number || undefined
  const consumoState = consumo?.state
  const cobrosTotal = resumenCobranza.totalCobrado
  const pendiente = getPendientePrincipal(surgery, docStatus, consumo, box)
  const headerModel = buildExpedienteHeaderModel({
    surgery,
    docStatus,
    presupuestoId,
    remitoId,
    fvNumber,
    consumoState,
    facturacionStatus,
    cobrosTotal,
    pendiente,
  })
  const PRIMARY_TABS = EXPEDIENTE_TABS
  const MORE_TABS = EXPEDIENTE_MORE_TABS
  const validTab =
    EXPEDIENTE_TABS.some((t) => t.value === expTab) || EXPEDIENTE_MORE_TABS.some((t) => t.value === expTab)
      ? expTab
      : "ficha"
  const isLegacyMockSurgery = isLegacyMockSurgeryId(surgery.id)
  // ponytail: only Correo is the server-backed tab. Seguimiento mounts
  // immediately and feeds itself via useSeguimientoFeed.
  const isCorreoTab = validTab === "correo"
  const serverBackedAvailability = serverBackedAvailabilityBySurgeryId[surgery.id]
  const shouldVerifyServerBackedAvailability = Boolean(
    activeCompany?.id && isCorreoTab && !serverBackedAvailability
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

        setServerBackedAvailabilityBySurgeryId((current) =>
          current[surgery.id] === "allowed" ? current : { ...current, [surgery.id]: "allowed" }
        )
      })
      .catch((error: unknown) => {
        if (cancelled) return

        const nextState: ServerBackedAvailabilityState =
          error instanceof ApiClientError && error.code === "surgery_not_found" ? "blocked" : "allowed"

        setServerBackedAvailabilityBySurgeryId((current) =>
          current[surgery.id] === nextState ? current : { ...current, [surgery.id]: nextState }
        )
      })

    return () => {
      cancelled = true
    }
  }, [activeCompany?.id, shouldVerifyServerBackedAvailability, surgery.id])

  const scrollTabs = (dir: "left" | "right") => {
    if (!tabsRef.current) return
    tabsRef.current.scrollBy({ left: dir === "left" ? -150 : 150, behavior: "smooth" })
  }

  const isActiveInMore = MORE_TABS.some((t) => t.value === validTab)
  const tabContentClassName = "mt-0 outline-none"

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <Tabs value={validTab} onValueChange={setExpTab} className="flex min-h-0 flex-1 flex-col">
        {/* Scrollable body containing Header at top, Sticky Tabs immediately below, and Tab Contents */}
        <div className={cn("flex-1 overflow-y-auto bg-[#F3F6FA] dark:bg-slate-950", isMobile && "pb-[calc(64px+env(safe-area-inset-bottom))]")}>
          {/* Header compacto de 2 niveles con navegación de regreso */}
          <ExpedienteHeader
            surgery={surgery}
            docStatus={docStatus}
            presupuestoId={presupuestoId}
            consumoState={consumoState}
            model={headerModel}
            onBack={onBack}
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
            onAddNoteToSeguimiento={onAddNoteToSeguimiento}
            onSetSuspendDialogOpen={onSetSuspendDialogOpen}
            onSetCancelDialogOpen={onSetCancelDialogOpen}
            onSetChangeStateDialogOpen={onSetChangeStateDialogOpen}
            onSetChangeDateDialogOpen={onSetChangeDateDialogOpen}
            onSetNewState={onSetNewState}
            onRecover={onRecover}
          />

          {/* Sticky Tab Navigation Bar — desktop only; mobile uses bottom nav */}
          {!isMobile ? (
          <div className="sticky top-0 z-20 flex shrink-0 items-center border-b border-slate-200/90 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 px-1 sm:px-3 shadow-2xs">
            {canScrollLeft && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-5 shrink-0 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={() => scrollTabs("left")}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
            )}

            <div ref={tabsRef} className="flex-1 overflow-x-auto scrollbar-none">
              <TabsList className="h-9 w-max justify-start gap-1 bg-transparent p-0">
                {PRIMARY_TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = validTab === tab.value
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={cn(
                        "group relative flex h-9 items-center gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 text-[12px] font-medium transition-colors hover:text-slate-950 dark:hover:text-slate-100 sm:text-[13px] data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                        isActive
                          ? "font-bold text-slate-950 dark:text-slate-50"
                          : "text-slate-600 dark:text-slate-400"
                      )}
                    >
                      <motion.div
                        className="flex items-center"
                        whileHover={{ scale: 1.15, rotate: -6 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Icon
                          className={cn(
                            "size-3.5 transition-colors",
                            isActive
                              ? "text-primary"
                              : "text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200"
                          )}
                        />
                      </motion.div>
                      <span>{tab.label}</span>

                      {isActive && (
                        <motion.div
                          layoutId="expediente-active-tab-line"
                          className="absolute inset-x-0 bottom-0 h-[2px] bg-primary"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>

            {canScrollRight && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-5 shrink-0 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={() => scrollTabs("right")}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            )}

            {MORE_TABS.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "group relative h-9 shrink-0 gap-1 rounded-none border-b-2 px-2.5 text-[12px] hover:bg-slate-100 dark:hover:bg-slate-800 sm:text-[13px]",
                      isActiveInMore
                        ? "font-bold text-primary"
                        : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    )}
                  >
                    <motion.div
                      className="flex items-center"
                      whileHover={{ rotate: 90 }}
                      transition={{ type: "spring", stiffness: 350, damping: 15 }}
                    >
                      <MoreHorizontal className="size-3.5" />
                    </motion.div>
                    <span>Más</span>
                    {isActiveInMore && (
                      <motion.div
                        layoutId="expediente-active-tab-line"
                        className="absolute inset-x-0 bottom-0 h-[2px] bg-primary"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                >
                  {MORE_TABS.map((tab) => {
                    const Icon = tab.icon
                    const isTabActive = validTab === tab.value
                    return (
                      <DropdownMenuItem
                        key={tab.value}
                        onClick={() => setExpTab(tab.value)}
                        className={cn(
                          "cursor-pointer text-slate-700 focus:bg-slate-100 focus:text-slate-950 dark:text-slate-200 dark:focus:bg-slate-800 dark:focus:text-slate-50",
                          isTabActive && "bg-accent font-bold text-slate-950 dark:bg-slate-800 dark:text-slate-50"
                        )}
                      >
                        <Icon className={cn("mr-2 size-4", isTabActive ? "text-primary" : "text-slate-500")} />
                        {tab.label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          ) : null}

          {/* Tab Contents */}
          <div className="w-full px-2.5 py-2.5 sm:px-4 sm:py-3">
            <TabsContent value="ficha" className={tabContentClassName}>
              <FichaTabContent
                surgery={surgery}
                presupuestos={presupuestos}
                comprobantes={comprobantes}
                remitos={remitos}
                notes={notes}
                history={history}
                resumenCobranza={resumenCobranza}
                onAddNote={() => {
                  onSetDialogSurgery(surgery)
                  onAddNoteToSeguimiento(surgery)
                }}
                onEditFicha={() => setIsEditFichaOpen(true)}
                onViewRemitos={() => setExpTab("logistica")}
              />
            </TabsContent>

            <TabsContent value="novedades" className={tabContentClassName}>
              {/* ponytail: Novedades mounts unconditionally. The /mail-links
                  gate only applies to Correo. useSeguimientoFeed handles its
                  own loading/skeleton state, so the tab feels instant. */}
              <NovedadesTabContent
                surgery={surgery}
                initialAddAction={initialAddAction}
                initialAddActionKey={initialAddActionKey}
              />
            </TabsContent>

            <TabsContent value="comercial" className={tabContentClassName}>
              <ComercialTabContent
                surgery={surgery}
                presupuestos={presupuestos}
                onOpenPresupuestoDialog={onOpenPresupuestoDialog}
                remitos={remitos}
                box={box}
                comprobantes={comprobantes}
                resumenCobranza={resumenCobranza}
              />
            </TabsContent>

            <TabsContent value="consumo" className={tabContentClassName}>
              <ConsumoPanel
                surgery={surgery}
                consumo={consumo}
                remitos={remitos}
                box={box}
                editingConsumo={editingConsumo}
                setEditingConsumo={setEditingConsumo}
                freshnessKey={operationalFreshnessKey}
                onDevolucionConfirmed={refreshOperationalSurfaces}
              />
            </TabsContent>

            <TabsContent value="documentacion" className={tabContentClassName}>
              <DocumentacionTrazabilidadTab
                surgery={surgery}
                docChecklist={docChecklist}
                docStatus={docStatus}
                remitos={remitos}
                consumo={consumo}
                box={box}
                freshnessKey={operationalFreshnessKey}
              />
            </TabsContent>

            <TabsContent value="logistica" className={tabContentClassName}>
              <LogisticaTabContent
                surgery={surgery}
                logistics={logistics}
                box={box}
                remitos={remitos}
                materialTransito={materialTransito}
                freshnessKey={operationalFreshnessKey}
              />
            </TabsContent>

            <TabsContent value="correo" className={tabContentClassName}>
              {/* ponytail: Correo is desktop-only for now. Mobile gets an
                  informational state instead of the full UI. Deep-links or
                  restored tabs that land here must show this state, not the
                  desktop layout. */}
              {isMobile ? (
                <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Mail className="size-6 text-slate-500 dark:text-slate-400" aria-hidden />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Correo en preparación
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Estamos trabajando en la experiencia móvil de este servicio. Por el momento está disponible únicamente desde la versión de escritorio.
                    </p>
                  </div>
                </div>
              ) : shouldBlockServerBackedFeatures ? (
                <ServerBackedFeatureBlockedState
                  featureLabel="Correo"
                  isLegacyMockSurgery={isLegacyMockSurgery}
                />
              ) : isServerBackedAvailabilityPending ? (
                <ServerBackedFeatureBlockedState featureLabel="Correo" state="verifying" />
              ) : (
                <ExpedienteCorreoTab surgery={surgery} />
              )}
            </TabsContent>

            <TabsContent value="instrumentador" className={tabContentClassName}>
              <InstrumentadorPanel surgery={surgery} instrumentadorSurgery={instrumentadorSurgery} />
            </TabsContent>

            <TabsContent value="historial" className={tabContentClassName}>
              <HistorialPanel surgery={surgery} history={history} />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Mobile bottom navigation — only rendered on mobile */}
      {isMobile ? (
        <MobileExpedienteTabs
          value={validTab as ExpTabKey}
          onChange={(tab) => setExpTab(tab)}
        />
      ) : null}

      <EditFichaDrawer surgery={surgery} open={isEditFichaOpen} onOpenChange={setIsEditFichaOpen} />
    </div>
  )
}
