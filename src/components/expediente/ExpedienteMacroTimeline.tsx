import React from "react"
import { cn } from "@/lib/utils"
import type { MacroTimelineModel } from "./expediente-macro-timeline"

interface ExpedienteMacroTimelineProps {
  model: MacroTimelineModel
}

export function ExpedienteMacroTimeline({ model }: ExpedienteMacroTimelineProps) {
  return (
    <div className="flex min-w-[42rem] gap-1.5 sm:min-w-0" aria-label="Progreso macro de la cirugía">
      {model.stages.map((stage, index) => {
        const isLast = index === model.stages.length - 1

        return (
          <div key={stage.key} className="min-w-[6.25rem] flex-1" aria-current={stage.current ? "step" : undefined}>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-2.5 shrink-0 rounded-full border-2",
                  stage.current && "border-primary bg-primary",
                  stage.done && !stage.current && "border-emerald-600 bg-emerald-600",
                  !stage.done && !stage.current && "border-border bg-background"
                )}
              />
              {!isLast && (
                <span
                  className={cn(
                    "h-px flex-1",
                    stage.done || stage.current ? "bg-primary/60" : "bg-border"
                  )}
                />
              )}
            </div>
            <p
              className={cn(
                "mt-1 text-xs leading-tight",
                stage.current && "font-semibold text-foreground",
                stage.done && !stage.current && "text-foreground/80",
                !stage.done && !stage.current && "text-muted-foreground"
              )}
            >
              {stage.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}
