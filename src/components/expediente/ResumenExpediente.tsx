"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { formatDate, formatCurrency } from "@/lib/formatters"
import { CX_STATE_COLORS, PREP_STATE_COLORS, DOC_STATUS_COLORS, FACTURACION_COLORS, CONSUMO_STATE_COLORS } from "@/lib/cirugias.constants"
import { getFacturacionBadgeLabel } from "@/lib/cirugias.utils"
import type { Surgery, Presupuesto, Comprobante, Remito, Consumo, SurgeryNote, Box } from "@/types"
import type { PendientePrincipal } from "@/lib/cirugias.types"
import type { ResumenCobranzaSurgery, FacturaCobranzaDetalle } from "@/lib/cobros.utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface ResumenExpedienteProps {
  surgery: Surgery
  presupuestos: Presupuesto[]
  comprobantes: Comprobante[]
  remitos: Remito[]
  consumo?: Consumo
  notes: SurgeryNote[]
  docStatus: string
  facturacionStatus: string
  box?: Box
  resumenCobranza: ResumenCobranzaSurgery
  pendiente: PendientePrincipal
}

function NeutralCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

function FieldRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex justify-between items-start py-1.5", className)}>
      <span className="text-xs text-muted-foreground shrink-0 pr-3">{label}</span>
      <span className="text-xs font-medium text-right">{value || "—"}</span>
    </div>
  )
}

function StatusBadge({ status, colorMap }: { status: string; colorMap: Record<string, string> }) {
  const colorClass = colorMap[status] || "bg-gray-400 text-white"
  return <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold leading-none", colorClass)}>{status}</span>
}

/** Badge de estado de cobranza para una FV */
const ESTADO_COBRANZA_COLORS: Record<string, string> = {
  sin_cobrar: "bg-amber-100 text-amber-800 border-amber-300",
  cobro_parcial: "bg-blue-100 text-blue-800 border-blue-300",
  cobrada: "bg-emerald-100 text-emerald-800 border-emerald-300",
  vencida: "bg-red-100 text-red-800 border-red-300",
}

const ESTADO_COBRANZA_LABELS: Record<string, string> = {
  sin_cobrar: "Sin cobrar",
  cobro_parcial: "Cobro parcial",
  cobrada: "Cobrada",
  vencida: "Vencida",
}

function EstadoCobranzaBadge({ estado }: { estado: string }) {
  const colorClass = ESTADO_COBRANZA_COLORS[estado] || "bg-gray-100 text-gray-800 border-gray-300"
  const label = ESTADO_COBRANZA_LABELS[estado] || estado
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border", colorClass)}>{label}</span>
}

export function ResumenExpediente({
  surgery: s, presupuestos, comprobantes, remitos, consumo, notes,
  docStatus, facturacionStatus, box, resumenCobranza, pendiente,
}: ResumenExpedienteProps) {
  const pr = presupuestos[0]
  const remito = remitos[0]
  const fvComp = comprobantes.find(c => c.type === "FV")
  const peComp = comprobantes.find(c => c.type === "PE")
  const cobrosTotal = resumenCobranza.totalCobrado
  const saldoPendiente = resumenCobranza.saldoPendiente
  const lastNotes = notes.slice(-3).reverse()

  return (
    <div className="space-y-5">
      {/* ── A. Datos principales ── */}
      <NeutralCard title="Datos principales">
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <FieldRow label="Paciente" value={s.patient} />
          <FieldRow label="Médico" value={s.surgeon} />
          <FieldRow label="DNI" value={s.patientDni} />
          <FieldRow label="Institución" value={s.institution} />
          <FieldRow label="Obra social" value={s.obraSocial} />
          <FieldRow label="Cliente / Financiador" value={s.client || s.financiador} />
          <FieldRow label="Clasificación" value={s.classification} />
          <FieldRow label="Provincia" value={s.provincia} />
          <FieldRow label="Localidad" value={s.localidad} />
          <FieldRow label="Fecha CX" value={formatDate(s.date)} />
          <FieldRow label="Hora" value={s.time || "—"} />
          <FieldRow label="Urgente" value={s.urgente ? <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">URGENTE</Badge> : "No"} />
          <FieldRow label="Vendedor" value={s.vendedor} />
          <FieldRow label="Coordinador de CX" value={s.coordinadorCx || "Sin asignar"} />
          <FieldRow label="Instrumentador" value={s.instrumentador} />
          {s.fechaEnvioMaterial && <FieldRow label="Fecha envío material" value={formatDate(s.fechaEnvioMaterial)} />}
        </div>
      </NeutralCard>

      {/* ── Leyenda destacada ── */}
      {s.leyendaDestacada && s.leyenda && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Leyenda destacada</p>
          <p className="text-sm text-amber-900">{s.leyenda}</p>
        </div>
      )}

      {/* ── Referencias administrativas ── */}
      {s.referenciasAdministrativas && s.referenciasAdministrativas.length > 0 && (
        <NeutralCard title="Referencias administrativas">
          <div className="flex flex-wrap gap-2">
            {s.referenciasAdministrativas.map((ref) => (
              <div key={ref.id} className="inline-flex flex-col rounded-md border px-2.5 py-1.5 bg-muted/40">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {ref.tipo}
                  {ref.valor ? <span className="text-foreground ml-1 font-normal">{ref.valor}</span> : ""}
                </span>
                {ref.observacion && (
                  <span className="text-[10px] text-muted-foreground mt-0.5">{ref.observacion}</span>
                )}
              </div>
            ))}
          </div>
        </NeutralCard>
      )}

      {/* ── B. Estado operativo ── */}
      <NeutralCard title="Estado operativo">
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <FieldRow label="Estado CX" value={<StatusBadge status={s.state} colorMap={CX_STATE_COLORS} />} />
          <FieldRow label="Preparación" value={<StatusBadge status={s.preparationState} colorMap={PREP_STATE_COLORS} />} />
          <FieldRow label="Documentación" value={<StatusBadge status={docStatus} colorMap={DOC_STATUS_COLORS} />} />
          <FieldRow label="Consumo" value={consumo ? <StatusBadge status={consumo.state} colorMap={CONSUMO_STATE_COLORS} /> : "Sin consumo"} />
          <FieldRow label="Facturación" value={<StatusBadge status={s.facturado ? "Facturada" : getFacturacionBadgeLabel(facturacionStatus)} colorMap={FACTURACION_COLORS} />} />
          <FieldRow
            label="Cobranza"
            value={
              cobrosTotal > 0
                ? <span className="text-emerald-700 font-semibold">{formatCurrency(cobrosTotal)}</span>
                : "Sin cobros"
            }
          />
          {saldoPendiente > 0 && (
            <FieldRow
              label="Saldo pendiente"
              value={<span className="text-amber-700 font-semibold">{formatCurrency(saldoPendiente)}</span>}
            />
          )}
        </div>
      </NeutralCard>

      {/* ── C. Pendiente principal ── */}
      <div className={cn("rounded-lg border px-4 py-3", pendiente.color)}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-0.5 opacity-70">Pendiente principal</p>
        <p className="text-sm font-semibold">{pendiente.text}</p>
      </div>

      {/* ── D. Comprobantes principales ── */}
      <NeutralCard title="Comprobantes principales">
        <div className="space-y-1.5">
          {pr && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold">PR</Badge>
                <span className="text-xs font-medium">{pr.id}</span>
                <span className="text-xs text-muted-foreground">{formatDate(pr.createdAt)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{pr.state}</span>
                <span className="text-xs font-semibold">{formatCurrency(pr.total)}</span>
              </div>
            </div>
          )}
          {peComp && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold">PE</Badge>
                <span className="text-xs font-medium">{peComp.number}</span>
                <span className="text-xs text-muted-foreground">{formatDate(peComp.date)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{peComp.state}</span>
                <span className="text-xs font-semibold">{formatCurrency(peComp.amount)}</span>
              </div>
            </div>
          )}
          {remito && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold">NR</Badge>
                <span className="text-xs font-medium">{remito.id}</span>
                <span className="text-xs text-muted-foreground">{formatDate(remito.date)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{remito.state}</span>
              </div>
            </div>
          )}

          {/* ── FV con estado de cobranza V2 ── */}
          {resumenCobranza.facturas.length > 0 && resumenCobranza.facturas.map((fv) => (
            <FVCard key={fv.facturaNumber} fv={fv} />
          ))}

          {!pr && !peComp && !remito && resumenCobranza.facturas.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">Sin comprobantes asociados</p>
          )}
        </div>
      </NeutralCard>

      {/* ── E. Últimas novedades ── */}
      <NeutralCard title="Últimas novedades">
        {lastNotes.length > 0 ? (
          <div className="space-y-2">
            {lastNotes.map(n => (
              <div key={n.id} className="flex items-start gap-3 rounded-md border px-3 py-2">
                <div className="shrink-0 mt-0.5">
                  <Badge variant="outline" className="text-[9px] font-semibold">{n.type}</Badge>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">{n.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{n.userName} — {formatDate(n.date)} {n.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">Sin notas recientes</p>
        )}
      </NeutralCard>
    </div>
  )
}

/** Sub-componente: tarjeta de FV con detalle de cobranza */
function FVCard({ fv }: { fv: FacturaCobranzaDetalle }) {
  const [expanded, setExpanded] = React.useState(false)
  const hasCobros = fv.cobros.length > 0

  return (
    <div className="rounded-md border">
      {/* FV header row */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 cursor-pointer select-none",
          hasCobros && "hover:bg-muted/40"
        )}
        onClick={() => hasCobros && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-bold">FV</Badge>
          <span className="text-xs font-medium">{fv.facturaNumber}</span>
          <span className="text-xs text-muted-foreground">{formatDate(fv.fecha)}</span>
        </div>
        <div className="flex items-center gap-2">
          <EstadoCobranzaBadge estado={fv.estadoCobranza} />
          <span className="text-xs font-semibold">{formatCurrency(fv.totalFactura)}</span>
          {hasCobros && (
            <span className={cn("text-[10px] transition-transform", expanded && "rotate-180")}>▾</span>
          )}
        </div>
      </div>

      {/* Cobranza summary row */}
      <div className="flex items-center justify-between px-3 pb-2 text-[10px] text-muted-foreground">
        <span>Cobrado: <strong className="text-emerald-700">{formatCurrency(fv.totalCobrado)}</strong></span>
        <span>Saldo: <strong className={fv.saldoPendiente > 0 ? "text-amber-700" : "text-muted-foreground"}>{formatCurrency(fv.saldoPendiente)}</strong></span>
        {fv.vencida && <span className="text-red-600 font-medium">Vencida</span>}
      </div>

      {/* Expanded: cobros imputados */}
      {expanded && hasCobros && (
        <div className="border-t bg-muted/20 px-4 py-2 space-y-1.5">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cobros aplicados</p>
          {fv.cobros.map((co) => (
            <div key={co.cobroId} className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{formatDate(co.fecha)}</span>
                <span>{co.medioCobro}</span>
                {co.referencia && <span className="text-muted-foreground font-mono">Ref. {co.referencia}</span>}
              </div>
              <span className="font-medium text-emerald-700">{formatCurrency(co.importeImputado)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
