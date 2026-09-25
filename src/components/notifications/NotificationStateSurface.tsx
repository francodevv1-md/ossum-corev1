"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, Bell, Loader2, Sparkles, RefreshCw } from "lucide-react"
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
            : "No hay notificaciones sin leer.",
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
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact
          ? "gap-3 px-4 py-8"
          : "gap-4 rounded-3xl border border-dashed border-border/80 bg-gradient-to-b from-muted/30 to-muted/10 px-6 py-16 shadow-2xs"
      )}
    >
      {/* Animated Icon with Glow */}
      <div className="relative">
        <motion.div
          animate={state === "empty" ? { y: [0, -5, 0] } : {}}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          className={cn(
            "relative z-10 flex items-center justify-center rounded-2xl shadow-sm transition-colors",
            state === "error"
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-rose-500/10"
              : "bg-blue-500/10 text-[#1D2FC0] dark:text-blue-400 border border-blue-500/20 shadow-blue-500/10",
            compact ? "size-11" : "size-14"
          )}
        >
          {state === "error" ? (
            <AlertCircle className={compact ? "size-5" : "size-6"} />
          ) : (
            <Bell className={compact ? "size-5" : "size-6"} />
          )}
        </motion.div>

        {/* Ambient pulse background */}
        {state === "empty" && (
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -inset-1 rounded-2xl bg-blue-500/15 blur-md pointer-events-none"
          />
        )}
      </div>

      <div className="space-y-1.5 max-w-sm">
        <p className={cn("font-bold text-foreground", compact ? "text-xs" : "text-sm sm:text-base")}>
          {title}
        </p>
        {state === "error" ? (
          <p className={cn("text-rose-600 dark:text-rose-400 font-medium", compact ? "text-[11px]" : "text-xs")}>
            {errorMessage}
          </p>
        ) : description ? (
          <p className={cn("text-muted-foreground leading-relaxed", compact ? "text-[11px]" : "text-xs")}>
            {description}
          </p>
        ) : null}
      </div>

      {state === "error" && onRetry ? (
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("gap-1.5 rounded-xl border-border/80 shadow-2xs font-semibold", compact ? "h-7.5 px-3 text-[11px]" : "h-9 px-4 text-xs")}
            onClick={onRetry}
          >
            <RefreshCw className="size-3.5" />
            <span>Reintentar</span>
          </Button>
        </motion.div>
      ) : null}
    </motion.div>
  )
}

function InboxLoadingState() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/85 shadow-sm shadow-black/[0.03]">
      {Array.from({ length: 4 }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08, duration: 0.3 }}
          className="flex items-start gap-3.5 border-b border-border/60 px-5 py-4 last:border-b-0"
        >
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground/70">
            <Loader2 className="size-4 animate-spin text-[#1D2FC0] dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="h-3 w-40 animate-pulse rounded-full bg-muted/80" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-muted/60" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/5 animate-pulse rounded-full bg-muted/70" />
              <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-muted/50" />
            </div>
            <div className="flex justify-end gap-2">
              <div className="h-8 w-28 animate-pulse rounded-lg bg-muted/60" />
              <div className="h-8 w-36 animate-pulse rounded-lg bg-muted/50" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function DropdownLoadingState() {
  return (
    <div className="space-y-2 px-3 py-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 px-3 py-3">
          <div className="mt-0.5 flex size-[2.125rem] shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground/70">
            <Loader2 className="size-3.5 animate-spin text-[#1D2FC0] dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-muted/70" />
            <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-muted/70" />
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  )
}

