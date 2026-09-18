import React from "react"
import { cn } from "@/lib/utils"
import type { ReferenceItemModel } from "./expediente-header.model"

interface ExpedienteReferencesStripProps {
  references: ReferenceItemModel[]
}

export function ExpedienteReferencesStrip({ references }: ExpedienteReferencesStripProps) {
  if (references.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin referencias administrativas.</p>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {references.map((reference) => (
        <div key={reference.key} className="inline-flex min-w-0 items-center gap-1 rounded-md border bg-background/80 px-1.5 py-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{reference.label}</span>
          <span className={cn("text-[10px] font-medium", reference.tone === "success" && "text-emerald-700")}>{reference.value}</span>
          {reference.detail && <span className="truncate text-[9px] text-muted-foreground">{reference.detail}</span>}
        </div>
      ))}
    </div>
  )
}
