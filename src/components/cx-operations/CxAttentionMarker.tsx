import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type CxAttentionMarkerProps = {
  attentionReasons?: readonly string[] | null
  className?: string
}

export function CxAttentionMarker({ attentionReasons, className }: CxAttentionMarkerProps) {
  if (!attentionReasons?.length) return null

  const accessibleReasons = attentionReasons.join("; ")

  return (
    <Badge
      variant="outline"
      className={`h-auto max-w-full whitespace-normal border-amber-300 bg-amber-50 px-2 py-1 text-left text-amber-900 ${className ?? ""}`}
      aria-label={`Atención: ${accessibleReasons}`}
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" />
      <span className="min-w-0 break-words">Atención: {attentionReasons[0]}</span>
    </Badge>
  )
}
