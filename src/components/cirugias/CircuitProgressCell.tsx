"use client"

import { Fragment } from "react"
import type { CircuitStage } from "@/lib/circuit-progress"
import { cn } from "@/lib/utils"

interface CircuitProgressCellProps {
  stages: CircuitStage[]
}

const STAGE_ORDER: CircuitStage["key"][] = ["cx", "pr", "nr", "consumo", "doc", "fact", "cobro"]

function Dot({ stage }: { stage: CircuitStage }) {
  return (
    <span
      data-slot="circuit-dot"
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full transition-colors",
        stage.done && "bg-emerald-500",
        stage.current && !stage.done && "animate-pulse bg-blue-500 ring-2 ring-blue-500/30 dark:bg-sky-400 dark:ring-sky-400/35",
        !stage.done && !stage.current && "border border-slate-300/80 bg-slate-100/65 dark:border-slate-700/80 dark:bg-slate-900/70",
      )}
    />
  )
}

function Connector({ done }: { done: boolean }) {
  return (
    <span
      data-slot="circuit-connector"
      className={cn("inline-block h-px w-3 shrink-0", done ? "bg-emerald-400 dark:bg-emerald-500/80" : "bg-slate-300/80 dark:bg-slate-700/85")}
    />
  )
}

export function CircuitProgressCell({ stages }: CircuitProgressCellProps) {
  const stageMap = new Map(stages.map((stage) => [stage.key, stage]))

  return (
    <td className="px-2 py-1.5">
      <div className="flex h-5 min-w-[120px] items-center gap-0 rounded-md border border-slate-200/70 bg-slate-50/70 px-2 dark:border-slate-800/80 dark:bg-slate-950/80">
        {STAGE_ORDER.map((key, index) => {
          const stage = stageMap.get(key)
          if (!stage) return null

          return (
            <Fragment key={key}>
              <Dot stage={stage} />
              {index < STAGE_ORDER.length - 1 && <Connector done={stage.done} />}
            </Fragment>
          )
        })}
      </div>
    </td>
  )
}
