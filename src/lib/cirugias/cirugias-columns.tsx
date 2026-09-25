"use client"

import React from "react"
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table"
import type { Surgery, SurgeryState } from "@/types"
import { formatDate } from "@/lib/formatters"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { CirugiaStatusCell } from "@/components/cirugias/CirugiaStatusCell"
import { CirugiaPreparationCell } from "@/components/cirugias/CirugiaPreparationCell"
import {
  DocStatusBadgeCell,
  ConsumoStatusBadgeCell,
  FacturadoStatusBadgeCell,
} from "@/components/cirugias/CirugiaOperationalBadges"
import { CirugiaActionsCell } from "@/components/cirugias/CirugiaActionsCell"
import { CircuitProgressCell } from "@/components/cirugias/CircuitProgressCell"
import type { CxOperationsClosureSignals } from "@/lib/cx-operations-derived"
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"
import type { CircuitStage } from "@/lib/circuit-progress"
import type { CxStatusVariant } from "@/lib/cirugias.constants"

export interface CirugiasColumnContext {
  getDocStatus: (id: string) => string
  getConsumoState: (id: string) => string | null
  getFacturacionStatus: (s: Surgery) => string
  getPrId: (id: string) => string | undefined
  shipmentDateMap?: Record<string, string | undefined>
  circuitProgressMap?: Record<string, CircuitStage[]>
  coordinatorCaseMap?: Record<string, CoordinatorCase | null>
  closureSignalsMap?: Record<string, CxOperationsClosureSignals>
  cxVariant?: CxStatusVariant
  onOpenExpediente: (id: string) => void
  onOpenPresupuestoDialog: (surgery: Surgery) => void
  onSetExpTab: (tab: string) => void
  onSetDialogSurgery: (s: Surgery) => void
  onSetNewState: (s: SurgeryState) => void
  onSetChangeStateDialogOpen: (open: boolean) => void
  onSetChangeDateDialogOpen: (open: boolean) => void
  onSetSuspendDialogOpen: (open: boolean) => void
  onSetCancelDialogOpen: (open: boolean) => void
  onSetNoteDialogOpen: (open: boolean) => void
  onSetFacturarDialogOpen: (open: boolean) => void
  onRecover: (s: Surgery) => void
  canFacturar: (s: Surgery) => { allowed: boolean; reason?: string }
}

const columnHelper = createColumnHelper<Surgery>()

export function createCirugiasColumns(ctx: CirugiasColumnContext): ColumnDef<Surgery, any>[] {
  return [
    columnHelper.accessor("id", {
      id: "id",
      header: "ID CX",
      cell: ({ row }) => {
        const s = row.original
        const displayCode = s.visibleNumber?.trim() || (s.id?.trim() ? `CX ${s.id}` : "CX sin número visible")

        return (
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wide text-slate-800 dark:text-slate-100">
            <span>{displayCode}</span>
            {s.urgente && (
              <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                URG
              </span>
            )}
          </div>
        )
      },
    }),

    columnHelper.accessor("state", {
      id: "state",
      header: "Estado CX",
      cell: ({ row }) => (
        <CirugiaStatusCell
          state={row.original.state}
          variant={ctx.cxVariant ?? "b"}
          asCell={false}
        />
      ),
    }),

    columnHelper.accessor("patient", {
      id: "patient",
      header: "Paciente",
      cell: ({ getValue }) => {
        const val = getValue()
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[160px] truncate text-[13px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {val}
              </span>
            </TooltipTrigger>
            <TooltipContent>{val}</TooltipContent>
          </Tooltip>
        )
      },
    }),

    columnHelper.accessor((row) => `${row.client} ${row.obraSocial || ""}`, {
      id: "clientOs",
      header: "Cliente / OS",
      cell: ({ row }) => {
        const { client, obraSocial } = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[125px] truncate text-[11px] font-normal text-slate-600 dark:text-slate-400">
                {client}{obraSocial ? ` / ${obraSocial}` : ""}
              </span>
            </TooltipTrigger>
            <TooltipContent>{client} / {obraSocial || "—"}</TooltipContent>
          </Tooltip>
        )
      },
    }),

    columnHelper.accessor("institution", {
      id: "institution",
      header: "Institución",
      cell: ({ getValue }) => {
        const val = getValue()
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[125px] truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">{val || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>{val || "Sin institución"}</TooltipContent>
          </Tooltip>
        )
      },
    }),

    columnHelper.accessor("surgeon", {
      id: "surgeon",
      header: "Médico",
      cell: ({ getValue }) => {
        const val = getValue()
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[115px] truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">{val || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>{val || "Sin médico"}</TooltipContent>
          </Tooltip>
        )
      },
    }),

    columnHelper.accessor("classification", {
      id: "classification",
      header: "Clasificación",
      cell: ({ getValue }) => <span className="text-[11px] text-slate-700 dark:text-slate-300">{getValue() || "—"}</span>,
    }),

    columnHelper.accessor("preparationState", {
      id: "preparationState",
      header: "Preparación",
      cell: ({ getValue }) => <CirugiaPreparationCell preparationState={getValue()} asCell={false} />,
    }),

    columnHelper.accessor("date", {
      id: "date",
      header: "Fecha CX",
      cell: ({ row }) => {
        const { date, time } = row.original
        return (
          <div className="leading-tight text-[11px]">
            <span className="block font-semibold text-slate-900 dark:text-slate-100">
              {date ? formatDate(date) : "Sin fecha"}
            </span>
            {time && <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono">{time} hs</span>}
          </div>
        )
      },
    }),

    columnHelper.accessor("time", {
      id: "time",
      header: "Hora",
      cell: ({ getValue }) => <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">{getValue() || "—"}</span>,
    }),

    columnHelper.accessor((row) => ctx.shipmentDateMap?.[row.id], {
      id: "fechaEnvio",
      header: "Fecha envío",
      cell: ({ getValue }) => {
        const val = getValue()
        return (
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            {val ? formatDate(val) : "—"}
          </span>
        )
      },
    }),

    columnHelper.accessor((row) => row.prNumber || ctx.getPrId(row.id), {
      id: "prNumber",
      header: "Remito",
      cell: ({ getValue }) => {
        const val = getValue()
        return (
          <span className={`text-[11px] font-mono ${val ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
            {val || "Sin PR"}
          </span>
        )
      },
    }),

    columnHelper.accessor("expedienteNumber", {
      id: "expedienteNumber",
      header: "Expediente",
      cell: ({ getValue }) => <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{getValue() || "—"}</span>,
    }),

    columnHelper.display({
      id: "doc",
      header: "Doc",
      cell: ({ row }) => <DocStatusBadgeCell docStatus={ctx.getDocStatus(row.original.id)} asCell={false} />,
    }),

    columnHelper.display({
      id: "consumo",
      header: "Consumo",
      cell: ({ row }) => <ConsumoStatusBadgeCell consumoState={ctx.getConsumoState(row.original.id)} asCell={false} />,
    }),

    columnHelper.display({
      id: "facturado",
      header: "Fact",
      cell: ({ row }) => (
        <FacturadoStatusBadgeCell
          facturado={row.original.facturado}
          facturacionStatus={ctx.getFacturacionStatus(row.original)}
          asCell={false}
        />
      ),
    }),

    columnHelper.accessor("probableDate", {
      id: "probableDate",
      header: "Fecha probable",
      cell: ({ getValue }) => {
        const val = getValue()
        return <span className="text-[11px] italic text-slate-500 dark:text-slate-400">{val ? formatDate(val) : "—"}</span>
      },
    }),

    columnHelper.accessor("fechaEnvioMaterial", {
      id: "fechaLogistica",
      header: "Fecha logística",
      cell: ({ getValue }) => {
        const val = getValue()
        return <span className="text-[11px] text-amber-700/80 dark:text-amber-300">{val ? formatDate(val) : "—"}</span>
      },
    }),

    columnHelper.display({
      id: "circuitProgress",
      header: "Circuito",
      cell: ({ row }) => {
        const stages = ctx.circuitProgressMap?.[row.original.id]
        if (!stages) return null
        return <CircuitProgressCell stages={stages} asCell={false} />
      },
    }),

    columnHelper.accessor("coordinadorCx", {
      id: "coordinadorCx",
      header: "Coordinador",
      cell: ({ getValue }) => <span className="text-[11px] text-slate-500 dark:text-slate-400">{getValue() || "Sin asignar"}</span>,
    }),

    columnHelper.accessor("urgente", {
      id: "urgente",
      header: "Urgente",
      cell: ({ getValue }) => getValue() ? <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">URGENTE</Badge> : null,
    }),

    columnHelper.accessor("vendedor", {
      id: "vendedor",
      header: "Vendedor",
      cell: ({ getValue }) => <span className="text-[11px] text-slate-500 dark:text-slate-400">{getValue() || "—"}</span>,
    }),

    columnHelper.accessor("instrumentador", {
      id: "instrumentador",
      header: "Instrumentador",
      cell: ({ getValue }) => <span className="text-[11px] text-slate-500 dark:text-slate-400">{getValue() || "—"}</span>,
    }),

    columnHelper.accessor("provincia", {
      id: "provincia",
      header: "Provincia",
      cell: ({ getValue }) => <span className="text-[11px] text-slate-500 dark:text-slate-400">{getValue() || "—"}</span>,
    }),

    columnHelper.display({
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const s = row.original
        return (
          <CirugiaActionsCell
            surgery={s}
            prId={ctx.getPrId(s.id)}
            docStatus={ctx.getDocStatus(s.id)}
            consumoState={ctx.getConsumoState(s.id)}
            onOpenExpediente={ctx.onOpenExpediente}
            onOpenPresupuestoDialog={ctx.onOpenPresupuestoDialog}
            onSetExpTab={ctx.onSetExpTab}
            onSetDialogSurgery={ctx.onSetDialogSurgery}
            onSetNewState={ctx.onSetNewState}
            onSetChangeStateDialogOpen={ctx.onSetChangeStateDialogOpen}
            onSetChangeDateDialogOpen={ctx.onSetChangeDateDialogOpen}
            onSetSuspendDialogOpen={ctx.onSetSuspendDialogOpen}
            onSetCancelDialogOpen={ctx.onSetCancelDialogOpen}
            onSetNoteDialogOpen={ctx.onSetNoteDialogOpen}
            onSetFacturarDialogOpen={ctx.onSetFacturarDialogOpen}
            onRecover={ctx.onRecover}
            canFacturar={ctx.canFacturar}
            asCell={false}
          />
        )
      },
    }),
  ]
}
