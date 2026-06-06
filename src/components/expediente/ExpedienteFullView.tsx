"use client"

import React, { useRef, useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { ExpedienteHeader } from "./ExpedienteHeader"
import { ResumenExpediente } from "./ResumenExpediente"
import { FichaCirugia } from "./FichaCirugia"
import { PresupuestoPanel } from "./PresupuestoPanel"
import { RemitosPanel } from "./RemitosPanel"
import { ConsumoPanel } from "./ConsumoPanel"
import { ComprobantesAsociados } from "./ComprobantesAsociados"
import { DocumentacionPanel } from "./DocumentacionPanel"
import { LogisticaPanel } from "./LogisticaPanel"
import { MaterialTransitoPanel } from "./MaterialTransitoPanel"
import { InstrumentadorPanel } from "./InstrumentadorPanel"
import { NotasPanel } from "./NotasPanel"
import { HistorialPanel } from "./HistorialPanel"
import { TrazabilidadPanel } from "./TrazabilidadPanel"
import { EXPEDIENTE_TABS } from "@/lib/cirugias.constants"
import type { Surgery, SurgeryState, Presupuesto, Comprobante, Remito, Consumo, SurgeryNote, HistoryEntry, SurgeryDocumentChecklist, LogisticsDetail, InstrumentadorSurgery, Box, MaterialTransito } from "@/types"
import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"
import { getPendientePrincipal } from "@/lib/cirugias.utils"
import { cn } from "@/lib/utils"

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
  surgery, presupuestos, comprobantes, remitos, consumo, notes, history,
  docChecklist, logistics, docStatus, materialTransito, instrumentadorSurgery,
  box, resumenCobranza, facturacionStatus, expTab, setExpTab,
  onBack, onSetDialogSurgery, onSetFacturarDialogOpen,
  onSetNoteDialogOpen, onSetSuspendDialogOpen, onSetCancelDialogOpen,
  onSetChangeStateDialogOpen, onSetChangeDateDialogOpen, onSetNewState,
  onRecover, onAutorizar, onOpenPresupuestoDialog, editingConsumo, setEditingConsumo,
}: ExpedienteFullViewProps) {
  const presupuestoId = presupuestos[0]?.id
  const remitoId = remitos[0]?.id
  const fvNumber = surgery.facturaNumber || comprobantes.find(c => c.type === "FV")?.number || undefined
  const consumoState = consumo?.state
  const cobrosTotal = resumenCobranza.totalCobrado
  const pendiente = getPendientePrincipal(surgery, docStatus, consumo, box)

  // Split tabs: primary visible tabs + overflow under dropdown
  const PRIMARY_TABS = EXPEDIENTE_TABS.slice(0, 7)
  const MORE_TABS = EXPEDIENTE_TABS.slice(7)

  // Tab scroll ref
  const tabsRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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

  const scrollTabs = (dir: "left" | "right") => {
    if (!tabsRef.current) return
    tabsRef.current.scrollBy({ left: dir === "left" ? -150 : 150, behavior: "smooth" })
  }

  // Check if current tab is in the MORE_TABS list
  const isActiveInMore = MORE_TABS.some(t => t.value === expTab)

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header ── */}
      <ExpedienteHeader
        surgery={surgery}
        docStatus={docStatus}
        presupuestoId={presupuestoId}
        remitoId={remitoId}
        fvNumber={fvNumber}
        consumoState={consumoState}
        facturacionStatus={facturacionStatus}
        cobrosTotal={cobrosTotal}
        pendiente={pendiente}
        onBack={onBack}
        onSetDialogSurgery={onSetDialogSurgery}
        onSetFacturarDialogOpen={onSetFacturarDialogOpen}
        onSetNoteDialogOpen={onSetNoteDialogOpen}
        onSetSuspendDialogOpen={onSetSuspendDialogOpen}
        onSetCancelDialogOpen={onSetCancelDialogOpen}
        onSetChangeStateDialogOpen={onSetChangeStateDialogOpen}
        onSetChangeDateDialogOpen={onSetChangeDateDialogOpen}
        onSetNewState={onSetNewState}
        onRecover={onRecover}
        onAutorizar={onAutorizar}
        onOpenPresupuestoDialog={onOpenPresupuestoDialog}
      />

      {/* ── Tabs ── */}
      <Tabs value={expTab} onValueChange={setExpTab} className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 border-b px-4 flex items-center gap-0">
          {/* Left scroll arrow */}
          {canScrollLeft && (
            <Button variant="ghost" size="sm" className="h-8 w-6 p-0 shrink-0" onClick={() => scrollTabs("left")}>
              <ChevronLeft className="size-3.5" />
            </Button>
          )}

          {/* Scrollable tab list */}
          <div ref={tabsRef} className="flex-1 overflow-x-auto scrollbar-none">
            <TabsList className="h-9 w-max justify-start gap-0 bg-transparent p-0">
              {PRIMARY_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="relative h-9 rounded-none border-b-2 border-transparent px-3 text-xs gap-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none whitespace-nowrap"
                  >
                    <Icon className="size-3.5" />
                    {tab.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {/* Right scroll arrow */}
          {canScrollRight && (
            <Button variant="ghost" size="sm" className="h-8 w-6 p-0 shrink-0" onClick={() => scrollTabs("right")}>
              <ChevronRight className="size-3.5" />
            </Button>
          )}

          {/* "Más tabs" dropdown — replaces the disabled "Más..." tab */}
          {MORE_TABS.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-2 text-xs gap-1 shrink-0 border-b-2 rounded-none",
                    isActiveInMore ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground"
                  )}
                >
                  <MoreHorizontal className="size-3.5" />
                  Más
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {MORE_TABS.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <DropdownMenuItem
                      key={tab.value}
                      onClick={() => setExpTab(tab.value)}
                      className={cn(expTab === tab.value && "bg-accent")}
                    >
                      <Icon className="size-4 mr-2" />
                      {tab.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-5">
            <TabsContent value="resumen" className="mt-0">
              <ResumenExpediente
                surgery={surgery}
                presupuestos={presupuestos}
                comprobantes={comprobantes}
                remitos={remitos}
                consumo={consumo}
                notes={notes}
                docStatus={docStatus}
                facturacionStatus={facturacionStatus}
                box={box}
                resumenCobranza={resumenCobranza}
                pendiente={pendiente}
              />
            </TabsContent>

            <TabsContent value="cirugia" className="mt-0">
              <FichaCirugia surgery={surgery} />
            </TabsContent>

            <TabsContent value="presupuesto" className="mt-0">
              <PresupuestoPanel
                surgery={surgery}
                presupuestos={presupuestos}
                onOpenPresupuestoDialog={onOpenPresupuestoDialog}
              />
            </TabsContent>

            <TabsContent value="remitos" className="mt-0">
              <RemitosPanel
                surgery={surgery}
                remitos={remitos}
                box={box}
              />
            </TabsContent>

            <TabsContent value="consumo" className="mt-0">
              <ConsumoPanel
                surgery={surgery}
                consumo={consumo}
                remitos={remitos}
                box={box}
                editingConsumo={editingConsumo}
                setEditingConsumo={setEditingConsumo}
              />
            </TabsContent>

            <TabsContent value="comprobantes" className="mt-0">
              <ComprobantesAsociados
                surgery={surgery}
                comprobantes={comprobantes}
                resumenCobranza={resumenCobranza}
                presupuestos={presupuestos}
              />
            </TabsContent>

            <TabsContent value="documentacion" className="mt-0">
              <DocumentacionPanel
                surgery={surgery}
                docChecklist={docChecklist}
                docStatus={docStatus}
              />
            </TabsContent>

            <TabsContent value="logistica" className="mt-0">
              <LogisticaPanel
                surgery={surgery}
                logistics={logistics}
                box={box}
              />
            </TabsContent>

            <TabsContent value="transito" className="mt-0">
              <MaterialTransitoPanel
                surgery={surgery}
                materialTransito={materialTransito}
              />
            </TabsContent>

            <TabsContent value="instrumentador" className="mt-0">
              <InstrumentadorPanel
                surgery={surgery}
                instrumentadorSurgery={instrumentadorSurgery}
              />
            </TabsContent>

            <TabsContent value="notas" className="mt-0">
              <NotasPanel
                surgery={surgery}
                notes={notes}
                onAddNote={() => { onSetDialogSurgery(surgery); onSetNoteDialogOpen(true) }}
              />
            </TabsContent>

            <TabsContent value="historial" className="mt-0">
              <HistorialPanel
                surgery={surgery}
                history={history}
              />
            </TabsContent>

            <TabsContent value="trazabilidad" className="mt-0">
              <TrazabilidadPanel
                surgery={surgery}
                remitos={remitos}
                consumo={consumo}
                box={box}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
