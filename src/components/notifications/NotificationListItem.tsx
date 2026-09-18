import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  formatRelativeTime,
  getNotificationAppearance,
  getNotificationPreview,
} from "@/components/notifications/notificationAppearance"
import type { InternalNotificationListItem } from "@/lib/api/notifications"
import { cn } from "@/lib/utils"

type NotificationListItemProps = {
  notification: InternalNotificationListItem
  variant: "inbox" | "dropdown"
  availabilityRequestsEnabled: boolean
  marking?: boolean
  className?: string
  onOpen?: () => void
  onMarkAsRead?: () => void
}

export function NotificationListItem({
  notification,
  variant,
  availabilityRequestsEnabled,
  marking = false,
  className,
  onOpen,
  onMarkAsRead,
}: NotificationListItemProps) {
  const unread = !notification.readAt
  const appearance = getNotificationAppearance(notification, availabilityRequestsEnabled)
  const Icon = appearance.icon
  const showBody = Boolean(notification.body && notification.body !== appearance.summary)
  const preview = showBody
    ? appearance.summary
    : getNotificationPreview(appearance.summary, notification.body)
  const statusLabel = unread ? "Sin leer" : "Leída"

  if (variant === "dropdown") {
    return (
      <div className={cn("relative w-full", className)}>
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-2 left-0 w-[2px] rounded-full transition-opacity duration-150 ease-out motion-reduce:transition-none",
            unread ? "opacity-100" : "opacity-0",
            appearance.unreadIndicatorClassName
          )}
        />
        <div className="flex w-full items-start gap-3">
          <div className={cn("mt-0.5 flex size-[2.125rem] shrink-0 items-center justify-center rounded-full border transition-transform duration-150 ease-out motion-reduce:transition-none group-hover:scale-[1.02] group-active:scale-[0.99] group-data-[highlighted]:scale-[0.98]", appearance.iconClassName)}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <span className={appearance.labelClassName}>{appearance.label}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="truncate">Caso {notification.surgeryId}</span>
                </div>
                <div className="mt-1.5 flex items-start gap-2">
                  <span className="line-clamp-2 flex-1 text-sm font-medium leading-5 text-foreground">
                    {notification.title}
                  </span>
                </div>
              </div>
              <div className="flex min-w-[6.25rem] shrink-0 items-center justify-end gap-2 pl-1 text-right">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 size-2 rounded-full transition-opacity duration-150 ease-out motion-reduce:transition-none",
                    unread ? "opacity-100" : "opacity-0",
                    appearance.unreadIndicatorClassName
                  )}
                />
                <span className="pt-0.5 text-[10px] text-muted-foreground transition-opacity duration-150 ease-out motion-reduce:transition-none group-hover:opacity-100 group-data-[highlighted]:opacity-100">
                  {marking ? "Leyendo..." : formatRelativeTime(notification.createdAt)}
                </span>
              </div>
            </div>
            <span className="mt-1 block truncate text-[11px] text-muted-foreground">
              {notification.actorName}
            </span>
            {preview ? (
              <span className="mt-2 line-clamp-2 block text-xs leading-5 text-muted-foreground/90">
                {preview}
              </span>
            ) : null}
            <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors duration-150 ease-out motion-reduce:transition-none",
                  unread ? appearance.badgeClassName : "border-border/70 bg-background text-muted-foreground"
                )}
              >
                {statusLabel}
              </Badge>
              <span className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-transform duration-150 ease-out motion-reduce:transition-none group-hover:translate-x-0.5 group-data-[highlighted]:translate-x-0.5">
                <span>{appearance.actionLabel}</span>
                <ChevronRight className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <article
      className={cn(
        "group relative border-b border-border/60 px-5 py-4 transition-[background-color,border-color,transform,box-shadow,opacity] duration-150 ease-out motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-px hover:shadow-sm hover:shadow-black/[0.03] last:border-b-0",
        unread ? appearance.unreadCardClassName : "bg-background",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-4 left-1.5 w-[2px] rounded-full transition-opacity duration-150 ease-out motion-reduce:transition-none",
          unread ? "opacity-100" : "opacity-0",
          appearance.unreadIndicatorClassName
        )}
      />
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border transition-transform duration-150 ease-out motion-reduce:transition-none group-hover:scale-[1.02] group-active:scale-[0.99]", appearance.iconClassName)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <span className={appearance.labelClassName}>{appearance.label}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>Caso {notification.surgeryId}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>{notification.actorName}</span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 size-2 rounded-full transition-opacity duration-150 ease-out motion-reduce:transition-none",
                    unread ? "opacity-100" : "opacity-0",
                    appearance.unreadIndicatorClassName
                  )}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-semibold leading-5 text-foreground transition-colors duration-150 ease-out motion-reduce:transition-none group-hover:text-foreground/90">
                    {notification.title}
                  </p>
                  {preview ? (
                    <p className="text-sm leading-5 text-muted-foreground transition-colors duration-150 ease-out motion-reduce:transition-none group-hover:text-muted-foreground/90">
                      {preview}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex min-w-[10.5rem] shrink-0 items-center justify-end gap-2 xl:pl-4">
              <span className="min-w-[5.75rem] text-right text-[11px] text-muted-foreground">
                {marking ? "Marcando..." : formatRelativeTime(notification.createdAt)}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "min-w-[4.75rem] justify-center rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors duration-150 ease-out motion-reduce:transition-none",
                  unread ? appearance.badgeClassName : "border-border/70 bg-background text-muted-foreground"
                )}
              >
                  {statusLabel}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 flex-1">
              {showBody ? (
                <p className="text-sm leading-5 text-muted-foreground/95">
                  {notification.body}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
              {onOpen ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg transition-transform duration-150 ease-out motion-reduce:transition-none hover:-translate-y-px active:translate-y-0"
                  onClick={onOpen}
                >
                  {appearance.actionLabel}
                </Button>
              ) : null}
              {unread && onMarkAsRead ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg transition-transform duration-150 ease-out motion-reduce:transition-none hover:-translate-y-px active:translate-y-0"
                  disabled={marking}
                  onClick={onMarkAsRead}
                >
                  {marking ? "Marcando..." : "Marcar como leída"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
