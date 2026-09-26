import { ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  AUTHORIZED_SECTION_CONFIG,
  BUCKET_CONFIG,
  type CoordinatorBucketKey,
} from "@/components/coordinadores/coordinator-queue.helpers"
import {
  CoordinatorCaseCard,
  type CoordinatorCaseViewModel,
} from "@/components/coordinadores/CoordinatorCaseCard"
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers"

type BucketEntry = CoordinatorCaseViewModel & {
  entry: CoordinatorCase
}

type Props = {
  bucketKey: CoordinatorBucketKey
  entries: BucketEntry[]
  defaultOpen?: boolean
  onOpenSeguimiento: (entry: CoordinatorCase) => void
  onOpenGestion: (entry: CoordinatorCase) => void
  onOpenLogistica: (surgeryId: string) => void
  onOpenExpediente: (surgeryId: string) => void
}

const BUCKET_THEME: Record<
  CoordinatorBucketKey,
  { border: string; bg: string; text: string; indicator: string; accentBorder: string }
> = {
  autorizado: {
    border: "border-[var(--op-border-default)]",
    bg: "bg-[var(--op-surface)]",
    text: "text-[var(--op-info)]",
    indicator: "bg-[var(--op-info)]",
    accentBorder: "border-sky-300 dark:border-sky-800",
  },
  transito: {
    border: "border-[var(--op-border-default)]",
    bg: "bg-[var(--op-surface)]",
    text: "text-[var(--op-primary-highlight)]",
    indicator: "bg-[var(--op-primary-highlight)]",
    accentBorder: "border-violet-300 dark:border-violet-800",
  },
  finalizado: {
    border: "border-[var(--op-border-default)]",
    bg: "bg-[var(--op-surface)]",
    text: "text-[var(--op-success)]",
    indicator: "bg-[var(--op-success)]",
    accentBorder: "border-emerald-300 dark:border-emerald-800",
  },
}

export function CoordinatorBucketSection({
  bucketKey,
  entries,
  defaultOpen,
  onOpenSeguimiento,
  onOpenGestion,
  onOpenLogistica,
  onOpenExpediente,
}: Props) {
  if (entries.length === 0) return null

  const bucketConfig = BUCKET_CONFIG[bucketKey]
  const BucketIcon = bucketConfig.icon
  const cardHandlers = { onOpenSeguimiento, onOpenGestion, onOpenLogistica, onOpenExpediente }
  const theme = BUCKET_THEME[bucketKey]

  const renderCase = (view: BucketEntry, variant: "autorizado" | "standard") => (
    <CoordinatorCaseCard key={view.entry.surgery.id} view={view} variant={variant} {...cardHandlers} />
  )

  return (
    <section className="space-y-3">
      <details
        open={defaultOpen ?? bucketKey === "autorizado"}
        className={cn(
          "group overflow-hidden rounded-xl border transition-all duration-200",
          theme.border,
          theme.bg
        )}
      >
        <summary 
          className={cn(
            "flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-primary-highlight)] focus-visible:ring-inset",
            "border-b border-[var(--op-border-subtle)] bg-[var(--op-secondary)] hover:bg-[var(--op-hover)] transition-colors"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-[var(--op-surface)] border border-[var(--op-border-default)] shrink-0", theme.text)}>
              <BucketIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight text-[var(--op-text-primary)]">
                {bucketConfig.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Badge 
              variant="outline" 
              className="bg-[var(--op-surface)] border-[var(--op-border-default)] text-[var(--op-text-primary)] text-xs font-semibold px-2.5 py-0.5"
            >
              {entries.length} {entries.length === 1 ? "caso" : "casos"}
            </Badge>
            <ChevronDown className="size-4 text-[var(--op-text-muted)] transition-transform duration-200 group-open:rotate-180" />
          </div>
        </summary>

        <div className="space-y-3.5 p-3.5 bg-[var(--op-surface)]">
          {bucketKey === "autorizado" ? (
            <div className="space-y-3">
              {AUTHORIZED_SECTION_CONFIG.map((section) => {
                const subgroupEntries = entries.filter(
                  (entry) => entry.entry.subgroup && section.matches.has(entry.entry.subgroup),
                )
                if (subgroupEntries.length === 0) return null

                return (
                  <details
                    key={section.key}
                    open={section.key === "pendiente-coordinar"}
                    className="group/sub overflow-hidden rounded-lg border border-[var(--op-border-default)] bg-[var(--op-secondary)]"
                  >
                    <summary 
                      className={cn(
                        "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 select-none",
                        "hover:bg-[var(--op-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-primary-highlight)] focus-visible:ring-inset"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-[var(--op-primary-highlight)]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--op-text-secondary)]">
                          {section.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className="bg-[var(--op-surface)] text-[var(--op-text-primary)] text-[10px] font-bold px-2 py-0"
                        >
                          {subgroupEntries.length}
                        </Badge>
                        <ChevronDown className="size-3.5 text-[var(--op-text-muted)] transition-transform duration-200 group-open/sub:rotate-180" />
                      </div>
                    </summary>

                    <div className="space-y-2 border-t border-[var(--op-border-subtle)] bg-[var(--op-surface)] p-3">
                      {subgroupEntries.map((view) => renderCase(view, "autorizado"))}
                    </div>
                  </details>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((view) => renderCase(view, "standard"))}
            </div>
          )}
        </div>
      </details>
    </section>
  )
}

