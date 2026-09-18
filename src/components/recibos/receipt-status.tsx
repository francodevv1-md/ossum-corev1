import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  RECEIPT_ROLE_LABELS,
  RECEIPT_STATUS_LABELS,
  type ReceiptUiStatus,
} from "@/lib/digital-receipts/ui"
import type { DigitalReceiptSignerRole } from "@/lib/digital-receipts"

const STATUS_VARIANTS: Record<ReceiptUiStatus, "secondary" | "warning" | "success" | "outline" | "destructive" | "info"> = {
  draft: "secondary",
  sent: "info",
  viewed: "warning",
  signed: "success",
  expired: "destructive",
  revoked: "outline",
}

export function ReceiptStatusBadge({ status, className }: { status: ReceiptUiStatus; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={cn("text-[11px]", className)}>
      {RECEIPT_STATUS_LABELS[status]}
    </Badge>
  )
}

export function ReceiptSignerBadge({ role, className }: { role: DigitalReceiptSignerRole; className?: string }) {
  return (
    <Badge variant="outline" className={cn("text-[11px]", className)}>
      Firmante: {RECEIPT_ROLE_LABELS[role]}
    </Badge>
  )
}
