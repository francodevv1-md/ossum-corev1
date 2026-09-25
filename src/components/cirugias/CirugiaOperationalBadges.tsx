"use client"
import { cn } from "@/lib/utils"
import { getFacturacionBadgeLabel } from "@/lib/cirugias.utils"

/**
 * Neutral secondary indicator: small dot + text.
 * - Green = correct/complete
 * - Yellow/amber = pending
 * - Red = incomplete/blocked
 * - Gray = not applicable
 * - "No facturada" must NOT appear in green (would be misleading)
 */
function NeutralBadge({ status, category }: { status: string; category: "doc" | "consumo" | "fact" }) {
  // Determine dot color based on status semantics
  const dotColor = getDotColor(status, category)

  // Determine text styling — neutral for all, slightly muted
  const isCritical = status === "Incompleta" || status === "Observada" || status === "Vencida" || status === "No facturada"

  return (
    <span className={cn(
      "inline-flex min-h-6 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
      isCritical
        ? "border-slate-300/70 bg-slate-100/80 text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/85 dark:text-slate-100"
        : "border-slate-200/70 bg-white/85 text-slate-700 dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-300"
    )}>
      <span className={cn("size-1.5 rounded-full shrink-0", dotColor)} />
      {status}
    </span>
  )
}

function getDotColor(status: string, category: "doc" | "consumo" | "fact"): string {
  // ── Documentación ──
  if (category === "doc") {
    switch (status) {
      case "Completa": return "bg-emerald-500"          // green = complete
      case "Apta para facturar": return "bg-emerald-500" // green = complete
      case "Pendiente": return "bg-amber-500"           // amber = pending
      case "Observada": return "bg-orange-500"          // orange = issue
      case "Incompleta": return "bg-red-500"            // red = incomplete
      default: return "bg-gray-400"                     // gray = N/A
    }
  }

  // ── Consumo ──
  if (category === "consumo") {
    switch (status) {
      case "Validado": return "bg-emerald-500"          // green = complete
      case "Facturado": return "bg-emerald-500"         // green = complete
      case "Pendiente": return "bg-amber-500"           // amber = pending
      default: return "bg-gray-400"
    }
  }

  // ── Facturación ──
  if (category === "fact") {
    switch (status) {
      case "Facturada": return "bg-emerald-500"         // green = complete
      case "No facturada": return "bg-amber-500"        // amber = pending (NOT green!)
      case "Pendiente de cobro": return "bg-amber-500"  // amber = pending
      case "Autorizada para facturar": return "bg-sky-500" // light blue = ready
      case "Vencida": return "bg-red-500"               // red = blocked
      default: return "bg-gray-400"
    }
  }

  return "bg-gray-400"
}

interface CirugiaOperationalBadgesProps {
  docStatus: string
  consumoState: string | null
  facturacionStatus: string
  facturado: boolean
  cellClassName?: string
}

export function DocStatusBadgeCell({ docStatus, cellClassName, asCell = true }: { docStatus: string; cellClassName?: string; asCell?: boolean }) {
  const badge = <NeutralBadge status={docStatus} category="doc" />
  if (!asCell) return badge
  return (
    <td className={cn("px-2 py-1.5", cellClassName)}>
      {badge}
    </td>
  )
}

export function ConsumoStatusBadgeCell({ consumoState, cellClassName, asCell = true }: { consumoState: string | null; cellClassName?: string; asCell?: boolean }) {
  const badge = consumoState ? (
    <NeutralBadge status={consumoState} category="consumo" />
  ) : (
    <span className="inline-flex min-h-6 items-center rounded-md border border-dashed border-slate-200/80 px-2 py-1 text-[10px] text-slate-400 dark:border-slate-800/80 dark:text-slate-500">—</span>
  )
  if (!asCell) return badge
  return (
    <td className={cn("px-2 py-1.5", cellClassName)}>
      {badge}
    </td>
  )
}

export function FacturadoStatusBadgeCell({ facturado, facturacionStatus, cellClassName, asCell = true }: { facturado: boolean; facturacionStatus: string; cellClassName?: string; asCell?: boolean }) {
  const badge = (
    <NeutralBadge
      status={facturado ? "Facturada" : facturacionStatus === "Sin facturar" ? "No facturada" : getFacturacionBadgeLabel(facturacionStatus)}
      category="fact"
    />
  )
  if (!asCell) return badge
  return (
    <td className={cn("px-2 py-1.5", cellClassName)}>
      {badge}
    </td>
  )
}

export function CirugiaOperationalBadges({ docStatus, consumoState, facturacionStatus, facturado }: CirugiaOperationalBadgesProps) {
  return (
    <>
      <DocStatusBadgeCell docStatus={docStatus} />
      <ConsumoStatusBadgeCell consumoState={consumoState} />
      <FacturadoStatusBadgeCell facturado={facturado} facturacionStatus={facturacionStatus} />
    </>
  )
}
