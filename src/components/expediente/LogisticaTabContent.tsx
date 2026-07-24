"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import type { Surgery, LogisticsDetail, Box, MaterialTransito, Remito } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Truck } from "lucide-react"
import { LogisticaPanel } from "@/components/expediente/LogisticaPanel"
import { MaterialTransitoPanel } from "@/components/expediente/MaterialTransitoPanel"
import { RemitosPanel, type RemitosPanelRemito } from "@/components/expediente/RemitosPanel"
import { useRemitos } from "@/hooks/useRemitos"
import { getRemitoDestinatarioName, getRemitoVisibleNumber, type RemitoApiItem, type RemitoApiRow } from "@/lib/api/remitos"
import { useTrazabilidad } from "@/hooks/useTrazabilidad"
import type { TraceItemRow } from "@/lib/api/trazabilidad"

type TransitPanelSource = "remitos" | "fallback"

type TransitSummaryItem = MaterialTransito & {
  sentQuantity?: number
  returnedQuantity?: number
  consumedQuantity?: number
  remainingQuantity?: number
  referenceSource?: TransitPanelSource
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export type CanonicalRemitoItemQuantities = Pick<
  TraceItemRow,
  "sentQuantity" | "consumedQuantity" | "returnedQuantity" | "pendingQuantity"
>

export function buildCanonicalRemitoItemQuantities(traceItems: TraceItemRow[]) {
  const quantities = new Map<string, CanonicalRemitoItemQuantities>()

  for (const item of traceItems) {
    if (item.remitoItemId) quantities.set(item.remitoItemId, item)
  }

  return quantities
}

export function mapRemitoApiItemToPanelItem(
  item: RemitoApiItem,
  canonicalQuantities: Map<string, CanonicalRemitoItemQuantities>
) {
  const canonical = canonicalQuantities.get(item.id)

  return {
    stockItemId: item.itemId ?? item.id,
    name: item.description,
    code: item.sku ?? item.itemId ?? "Sin SKU",
    sentQuantity: canonical?.sentQuantity ?? toNumber(item.quantity),
    returnedQuantity: canonical?.returnedQuantity ?? 0,
    consumedQuantity: canonical?.consumedQuantity ?? 0,
  }
}

export function mapRemitoApiToPanelRemito(
  remito: RemitoApiRow,
  canonicalQuantities: Map<string, CanonicalRemitoItemQuantities>
): RemitosPanelRemito {
  return {
    apiId: remito.id,
    id: getRemitoVisibleNumber(remito),
    surgeryId: remito.surgeryId ?? "",
    boxId: remito.boxId,
    destination: getRemitoDestinatarioName(remito),
    date: remito.issuedAt ?? remito.deliveredAt ?? remito.createdAt,
    state: remito.state,
    items: remito.items.map((item) => mapRemitoApiItemToPanelItem(item, canonicalQuantities)),
  }
}

interface LogisticaTabContentProps {
  surgery: Surgery
  logistics?: LogisticsDetail
  box?: Box
  remitos: Remito[]
  materialTransito: MaterialTransito[]
  freshnessKey?: number
}

export function LogisticaTabContent({
  surgery,
  logistics,
  box,
  remitos,
  materialTransito,
  freshnessKey = 0,
}: LogisticaTabContentProps) {
  const hasObservedFreshnessKey = useRef(false)
  const [remitosOpen, setRemitosOpen] = useState(true)
  const [materialOpen, setMaterialOpen] = useState(true)
  const remitoFilters = useMemo(() => ({ surgeryId: surgery.id || "__missing_surgery__", take: 100 }), [surgery.id])
  const {
    remitos: backendRemitos,
    loading: remitosLoading,
    ready: remitosReady,
    error: remitosError,
    blocked: remitosBlocked,
    mutatingId: remitoMutatingId,
    refresh: refreshRemitos,
    emit: emitRemito,
    transition: transitionRemito,
  } = useRemitos(remitoFilters)
  const { trace, refresh: refreshTrace } = useTrazabilidad(surgery.id)

  useEffect(() => {
    if (!hasObservedFreshnessKey.current) {
      hasObservedFreshnessKey.current = true
      return
    }
    void Promise.all([refreshRemitos(), refreshTrace()])
  }, [freshnessKey, refreshRemitos, refreshTrace])

  const canonicalQuantities = useMemo(
    () => buildCanonicalRemitoItemQuantities(trace?.items ?? []),
    [trace]
  )
  const panelRemitos = useMemo(
    () => backendRemitos.map((remito) => mapRemitoApiToPanelRemito(remito, canonicalQuantities)),
    [backendRemitos, canonicalQuantities]
  )

  const transitSummary = useMemo(() => {
    const derivedItems = panelRemitos
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((remito) =>
        remito.items
          .map((item) => {
            const remainingQuantity = item.sentQuantity - item.returnedQuantity - item.consumedQuantity
            if (remainingQuantity <= 0) return null

            return {
              id: `${remito.id}-${item.stockItemId}`,
              stockItemId: item.stockItemId,
              articleName: item.name,
              articleCode: item.code,
              department: "Sin dato",
              section: "Sin dato",
              rubro: "Sin dato",
              type: "En tránsito CX" as const,
              surgeryId: surgery.id,
              surgeryDate: remito.date,
              nrNumber: remito.id,
              institution: remito.destination || surgery.institution,
              institutionCity: surgery.institutionCity,
              surgeon: surgery.surgeon,
              patient: surgery.patient,
              comprobanteSalida: remito.id,
              deposit: box?.name ? `Caja ${box.name}` : "Sin dato",
              consumoId: item.consumedQuantity > 0 || item.returnedQuantity > 0 ? remito.id : undefined,
              sentQuantity: item.sentQuantity,
              returnedQuantity: item.returnedQuantity,
              consumedQuantity: item.consumedQuantity,
              remainingQuantity,
              referenceSource: "remitos" as const,
            }
          })
          .filter(Boolean)
      )
      .map((item) => item as TransitSummaryItem)

    if (derivedItems.length > 0) {
      return {
        items: derivedItems,
        source: "remitos" as const,
      }
    }

    return {
      items: materialTransito.map((item) => ({
        ...item,
        referenceSource: "fallback" as const,
      })) as TransitSummaryItem[],
      source: "fallback" as const,
    }
  }, [box?.name, materialTransito, panelRemitos, surgery.id, surgery.institution, surgery.institutionCity, surgery.patient, surgery.surgeon])

  const remainingUnits = transitSummary.items.reduce((sum, item) => sum + (item.remainingQuantity ?? 1), 0)
  const sourceText = transitSummary.source === "remitos"
    ? "Resumen derivado de remitos abiertos."
    : "Sin remitos abiertos: se muestra fallback prudente del tránsito histórico."

  return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/90">
        <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-slate-100">
            Logística
          </h3>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Vista operativa compacta basada en preparación, remitos y retorno visible.
          </p>
        </div>
        <div className="px-3 py-2.5">
          <LogisticaPanel surgery={surgery} logistics={logistics} box={box} remitos={remitos} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/90">
        <Collapsible open={remitosOpen} onOpenChange={setRemitosOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
                className="flex w-full items-start justify-between gap-3 border-b border-slate-200 px-3 py-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                   <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-slate-100">
                    Remitos
                  </h3>
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {!remitosReady || remitosLoading ? "…" : panelRemitos.length} remito{panelRemitos.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                 <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  Remitos backend filtrados por esta cirugía; impresión usa PDF honesto del navegador.
                </p>
                {remitosBlocked ? (
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Sin empresa activa o CX sin ID server-side.</p>
                ) : remitosError && remitosReady ? (
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">No se pudieron cargar los remitos backend.</p>
                ) : null}
              </div>
               <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <Truck className="size-3" />
                {remitosOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 py-2.5">
              <RemitosPanel
                surgery={surgery}
                remitos={panelRemitos}
                box={box}
                mutatingId={remitoMutatingId}
                onEmit={(remito) => emitRemito(remito.apiId)}
                onTransition={(remito, state) => transitionRemito(remito.apiId, state)}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/90">
        <Collapsible open={materialOpen} onOpenChange={setMaterialOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
                className="flex w-full items-start justify-between gap-3 border-b border-slate-200 px-3 py-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                   <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-slate-100">
                    Material en tránsito
                  </h3>
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {transitSummary.items.length} ítem{transitSummary.items.length !== 1 ? "s" : ""}
                  </Badge>
                  {remainingUnits > 0 && (
                    <Badge variant="outline" className="h-5 text-[10px]">
                      {remainingUnits} abierto{remainingUnits !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                 <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{sourceText}</p>
              </div>
               <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <Truck className="size-3" />
                {materialOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
             <div className="px-3 py-2.5">
               <MaterialTransitoPanel
                 surgery={surgery}
                 materialTransito={transitSummary.items}
                source={transitSummary.source}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
