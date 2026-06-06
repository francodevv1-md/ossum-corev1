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
      "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-medium leading-none",
      isCritical
        ? "border-muted-foreground/20 text-foreground"
        : "border-transparent text-muted-foreground"
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
}

export function CirugiaOperationalBadges({ docStatus, consumoState, facturacionStatus, facturado }: CirugiaOperationalBadgesProps) {
  return (
    <>
      <td className="px-2 py-1.5">
        <NeutralBadge status={docStatus} category="doc" />
      </td>
      <td className="px-2 py-1.5">
        {consumoState ? (
          <NeutralBadge status={consumoState} category="consumo" />
        ) : (
          <span className="text-[10px] text-muted-foreground px-2 py-1 inline-block">—</span>
        )}
      </td>
      <td className="px-2 py-1.5">
        <NeutralBadge
          status={facturado ? "Facturada" : facturacionStatus === "Sin facturar" ? "No facturada" : getFacturacionBadgeLabel(facturacionStatus)}
          category="fact"
        />
      </td>
    </>
  )
}
