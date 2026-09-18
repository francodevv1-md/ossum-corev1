import Link from "next/link"
import { AlertTriangle, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type LegacyStandaloneNoticeProps = {
  title?: string
  description: string
  tabHint?: string
}

export function LegacyStandaloneNotice({
  title = "Vista legacy/deprecada",
  description,
  tabHint,
}: LegacyStandaloneNoticeProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-sm text-amber-900/80 dark:text-amber-100/80">{description}</p>
            {tabHint && (
              <p className="text-xs text-amber-900/70 dark:text-amber-100/70">{tabHint}</p>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/cirugias">
            Ir a Cirugías / Ficha CX
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
