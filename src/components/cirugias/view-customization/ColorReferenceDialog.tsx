"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ALL_STATES, getCxStateVisual } from "@/lib/cirugias.constants"
import { cn } from "@/lib/utils"
import { Palette, Layers, AlertCircle, PackageCheck } from "lucide-react"

interface ColorReferenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface StateCard {
  state: string
  meaning: string
  category: "Programación" | "Logística y Quirófano" | "Cierre y Facturación" | "Excepciones"
}

const HUMAN_STATES: StateCard[] = [
  {
    state: "Pendiente",
    meaning: "Estado Pendiente: amarillo con fecha quirúrgica; blanco sin fecha. El estado registrado no cambia.",
    category: "Programación",
  },
  {
    state: "Autorizada",
    meaning: "Estado Autorizada: verde con fecha quirúrgica; blanco sin fecha. El estado registrado no cambia.",
    category: "Programación",
  },
  {
    state: "Sin autorizar",
    meaning: "Expediente ingresado para cotización o reserva, pendiente de autorización. También puede no tener fecha quirúrgica; la ausencia de fecha no es un estado de cirugía.",
    category: "Programación",
  },
  {
    state: "En tránsito",
    meaning: "Las cajas de implantes, instrumental o el instrumentador están en viaje hacia el sanatorio o clínica.",
    category: "Logística y Quirófano",
  },
  {
    state: "Realizada",
    meaning: "Estado Realizada. El color no confirma por sí solo la existencia de consumo registrado.",
    category: "Logística y Quirófano",
  },
  {
    state: "Finalizada",
    meaning: "Estado Finalizada. El color no acredita por sí solo una factura emitida.",
    category: "Cierre y Facturación",
  },
  {
    state: "Sin consumo",
    meaning: "Cirugía operada donde no se implantaron materiales ni se utilizaron descartables.",
    category: "Cierre y Facturación",
  },
  {
    state: "Suspendida",
    meaning: "Cirugía postergada temporalmente por el médico o el paciente para ser reprogramada.",
    category: "Excepciones",
  },
  {
    state: "Cancelada",
    meaning: "Cirugía anulada de forma definitiva. No requiere seguimiento.",
    category: "Excepciones",
  },
]

export function ColorReferenceDialog({ open, onOpenChange }: ColorReferenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-3xl flex-col gap-0 overflow-hidden border-slate-300 bg-slate-50 p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl"
        showCloseButton
      >
        {/* ── Header ── */}
        <DialogHeader className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Palette className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-950 dark:text-slate-50">
                Guía de Estados y Colores
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Conocé qué significa cada estado para identificar rápidamente las cirugías en la tabla.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* ── Cómo leer la tabla (Humanizado) ── */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
            <div className="flex items-start gap-2.5">
              <Layers className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  ¿Cómo identificar las cirugías por color?
                </h4>
                <p className="text-[12px] text-slate-600 dark:text-slate-400">
                  Cada cirugía tiene su <strong>etiqueta de estado en color pleno</strong> y la <strong>fila entera con un fondo suave</strong> del mismo tono. Así podés reconocer el momento de cada operación de un vistazo sin cansar la vista.
                </p>
                <p className="text-[12px] text-slate-600 dark:text-slate-400">
                  Los colores reflejan el estado operativo de la cirugía y no verifican por sí solos comprobantes de consumo ni facturas emitidas.
                </p>
              </div>
            </div>
          </div>

          {/* ── Lista de Estados ── */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Estados de la Cirugía
            </h4>

            <div className="grid gap-2">
              {ALL_STATES.map((state) => {
                const { meaning, category } = HUMAN_STATES.find((item) => item.state === state)!
                const visual = getCxStateVisual(state)

                return (
                  <div
                    key={state}
                    style={{
                      "--item-bg": visual.rowTint,
                      "--item-dark-bg": visual.darkRowTint || "#0d131d",
                      borderColor: visual.strong === "#FFFFFF" ? "#94A3B8" : visual.strong + "35",
                    } as React.CSSProperties}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 rounded-xl border bg-[var(--item-bg)] dark:bg-[var(--item-dark-bg)] px-3.5 py-2.5 text-left transition-all"
                  >
                    {/* State Badge */}
                    <div className="flex items-center gap-2.5 min-w-[150px] shrink-0">
                      <span
                        className={cn("h-4 w-1 rounded-sm shrink-0", visual.barClass)}
                        style={{ backgroundColor: visual.strong }}
                      />
                      <span
                        className={cn("px-2.5 py-1 rounded-md text-xs shadow-xs select-none", visual.strongClass)}
                        style={{ backgroundColor: visual.strong }}
                      >
                        {state}
                      </span>
                    </div>

                    {/* Meaning */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-normal">
                        {meaning}
                      </p>
                    </div>

                    {/* Category pill */}
                    <div className="shrink-0 self-end sm:self-center">
                      <span className="inline-block rounded-md border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-2xs dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
                        {category}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Señales visuales adicionales ── */}
          <div className="space-y-2.5 border-t border-slate-200 pt-4 dark:border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Otras señales útiles en la tabla
            </h4>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {/* Urgente */}
              <div className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/40 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded border border-red-300 bg-red-100 px-1.5 py-0.5 text-[9px] font-extrabold text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                      URG
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Cirugía Urgente
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Señaladas con borde rojo a la izquierda para atención y despacho prioritario.
                  </p>
                </div>
              </div>

              {/* Preparación */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <PackageCheck className="size-4 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Preparación de Materiales
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Badges secundarios de depósito: <strong>En preparación</strong> (cyan), <strong>Congelado</strong> (naranja) o <strong>Entregado</strong> (verde).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 text-xs px-5 h-8 font-medium"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
