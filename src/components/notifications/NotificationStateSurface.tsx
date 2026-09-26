import { AlertCircle, Bell, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NotificationCategoryFilter = "all" | "mention" | "operational"
type NotificationSurfaceVariant = "inbox" | "dropdown"

type NotificationStateSurfaceProps = {
  variant: NotificationSurfaceVariant
  state: "loading" | "empty" | "error"
  title?: string
  description?: string
  errorMessage?: string
  onRetry?: () => void
}

export function getNotificationEmptyCopy({
  categoryFilter,
  unreadOnly,
}: {
  categoryFilter: NotificationCategoryFilter
  unreadOnly?: boolean
}) {
  if (unreadOnly) {
    return {
      title:
        categoryFilter === "mention"
          ? "No hay menciones sin leer"
          : categoryFilter === "operational"
            ? "No hay novedades operativas sin leer"
            : "Estás al día",
      description:
        categoryFilter === "mention"
          ? "Cuando alguien te mencione en un seguimiento, aparece acá al instante."
          : categoryFilter === "operational"
            ? "Las novedades operativas nuevas aparecen acá apenas llegan."
            : "Cuando llegue algo nuevo, lo vas a ver primero acá.",
    }
  }

  return {
    title:
      categoryFilter === "mention"
        ? "No hay menciones todavía"
        : categoryFilter === "operational"
          ? "No hay novedades operativas"
          : "No hay notificaciones",
    description:
      categoryFilter === "mention"
        ? "Las menciones de seguimiento van a aparecer acá."
        : categoryFilter === "operational"
          ? "Las novedades operativas van a aparecer acá."
          : "Las menciones y novedades operativas van a aparecer acá.",
  }
}

export function NotificationStateSurface({
  variant,
  state,
  title,
  description,
  errorMessage,
  onRetry,
}: NotificationStateSurfaceProps) {
  if (state === "loading") {
    return variant === "dropdown" ? <DropdownLoadingState /> : <InboxLoadingState />
  }

  const compact = variant === "dropdown"

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact
          ? "gap-2.5 px-4 py-6"
          : "gap-3 rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 py-14"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          state === "error"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
          compact ? "size-10" : "size-12"
        )}
      >
        {state === "error" ? <AlertCircle className={compact ? "size-4.5" : "size-5"} /> : <Bell className={compact ? "size-4.5" : "size-5"} />}
      </div>
      <div className="space-y-1">
        <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{title}</p>
        {state === "error" ? (
          <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>{errorMessage}</p>
        ) : description ? (
          <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>{description}</p>
        ) : null}
      </div>
      {state === "error" && onRetry ? (
        <Button type="button" variant="outline" size="sm" className={cn(compact ? "h-7 rounded-lg px-2.5 text-[11px]" : "rounded-lg")} onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}

function InboxLoadingState() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/85 shadow-sm shadow-black/[0.03]">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 border-b border-border/60 px-4 py-4 last:border-b-0 sm:px-5">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground/70 motion-reduce:animate-none">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="h-2.5 w-40 animate-pulse rounded-full bg-muted/70 motion-reduce:animate-none" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-muted/60 motion-reduce:animate-none" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/5 animate-pulse rounded-full bg-muted/70 motion-reduce:animate-none" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-muted/50 motion-reduce:animate-none" />
            </div>
            <div className="flex justify-end gap-2">
              <div className="h-8 w-28 animate-pulse rounded-lg bg-muted/60 motion-reduce:animate-none" />
              <div className="h-8 w-36 animate-pulse rounded-lg bg-muted/50 motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DropdownLoadingState() {
  return (
    <div className="space-y-2 px-3 py-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
          <div className="mt-0.5 flex size-[2.125rem] shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground/70 motion-reduce:animate-none">
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-muted/70 motion-reduce:animate-none" />
            <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-muted/70 motion-reduce:animate-none" />
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-muted/50 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  )
}
