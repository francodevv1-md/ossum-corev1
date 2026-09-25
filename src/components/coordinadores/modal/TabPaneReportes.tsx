"use client"

import React, { useMemo } from "react"
import type { Surgery } from "@/types"
import { useOrtoTrackStore } from "@/lib/store"
import {
  FileBarChart2,
  Download,
  Printer,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Stethoscope,
  Boxes,
  Receipt,
  Sparkles,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { toast } from "sonner"

interface TabPaneReportesProps {
  surgery: Surgery
}

export function TabPaneReportes({ surgery }: TabPaneReportesProps) {
  const store = useOrtoTrackStore()

  const comprobantes = useMemo(() => {
    return store.getComprobantesBySurgeryId(surgery.id) || []
  }, [store, surgery.id])

  const presupuestos = useMemo(() => {
    return store.getPresupuestosBySurgeryId(surgery.id) || []
  }, [store, surgery.id])

  const resumenCobranza = useMemo(() => {
    return store.getResumenCobranzaBySurgeryId(surgery.id) || {
      totalFacturado: 0,
      totalCobrado: 0,
      saldoPendiente: 0,
      facturas: [],
    }
  }, [store, surgery.id])

  const history = useMemo(() => {
    return store.getHistoryBySurgeryId(surgery.id) || []
  }, [store, surgery.id])

  const handleGenerateReport = (reportName: string) => {
    toast.info(`Generando ${reportName} para CX ${surgery.visibleNumber || surgery.id}...`, {
      description: "Módulo de exportación y reportes configurado.",
    })
  }

  const reports = [
    {
      id: "resumen-ejecutivo",
      title: "Resumen Ejecutivo del Caso",
      description: "Ficha integral con datos del paciente, médico, sanatorio, cronograma y novedades.",
      icon: <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      tag: "Ficha PDF",
    },
    {
      id: "logistica-trazabilidad",
      title: "Planilla de Logística y Trazabilidad",
      description: "Desglose de cajas de instrumental, remitos de despacho, transporte y devolución.",
      icon: <Boxes className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      tag: "Logística",
    },
    {
      id: "informe-economico",
      title: "Informe Económico y Cobranzas",
      description: "Detalle de presupuestos emitidos, facturas asociadas, recibos de cobro y saldo pendiente.",
      icon: <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      tag: "Financiero",
    },
    {
      id: "auditoria-trazabilidad",
      title: "Historial de Auditoría y Eventos",
      description: "Registro cronológico completo de cambios de estado, notas y acciones operativas.",
      icon: <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      tag: "Auditoría",
    },
  ]

  return (
    <div className="flex flex-col gap-5 text-xs">
      {/* Banner / Header Informativo */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-blue-900/10 via-slate-50 to-transparent dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900/50 border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileBarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Centro de Reportes del Expediente
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3 h-3" />
                Vigente
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Consolidación de informes, planillas operativas y exportación de datos del caso.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleGenerateReport("Resumen Completo")}
            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer bg-white dark:bg-slate-900"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Ficha</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleGenerateReport("Exportación General")}
            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer bg-[#1D2FC0] hover:bg-[#152399] text-white shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Todo</span>
          </Button>
        </div>
      </div>

      {/* Métricas Resumidas del Caso */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Estado Quirúrgico
          </span>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
            {surgery.state}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {surgery.date ? `Fecha: ${formatDate(surgery.date)}` : "Sin fecha asignada"}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Preparación
          </span>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
            {surgery.preparationState || "Sin preparar"}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {surgery.materialAvailabilityDate || "A coordinar"}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Total Facturado
          </span>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(resumenCobranza.totalFacturado)}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Cobrado: {formatCurrency(resumenCobranza.totalCobrado)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Saldo Pendiente
          </span>
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(resumenCobranza.saldoPendiente)}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {comprobantes.length} comprobantes vinculados
          </span>
        </div>
      </div>

      {/* Catálogo de Reportes Disponibles */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
          Informes Disponibles para Descarga
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs flex flex-col justify-between gap-3 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 shrink-0">
                  {report.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {report.title}
                    </h5>
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                      {report.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenerateReport(report.title)}
                  className="h-7 px-2.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                >
                  <Printer className="w-3 h-3 mr-1" />
                  Imprimir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateReport(report.title)}
                  className="h-7 px-3 text-[11px] font-semibold text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100 cursor-pointer"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Generar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
