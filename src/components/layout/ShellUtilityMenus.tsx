"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getAvailabilityRequestCandidate,
  getNotificationAppearance,
  getNotificationEntryId,
} from "@/components/notifications/notificationAppearance"
import { NotificationListItem } from "@/components/notifications/NotificationListItem"
import { useAuth } from "@/components/auth/AuthProvider"
import {
  getNotificationEmptyCopy,
  NotificationStateSurface,
} from "@/components/notifications/NotificationStateSurface"
import { cn } from "@/lib/utils"
import { buildNotificationExpedienteLink } from "@/lib/expediente-navigation"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotifications } from "@/hooks/useNotifications"
import type { InternalNotificationListItem } from "@/lib/api/notifications"

interface NotificationMenuProps {
  buttonClassName?: string
}

export function NotificationMenu({ buttonClassName }: NotificationMenuProps) {
  const router = useRouter()
  const { features } = useAuth()
  const availabilityRequestsEnabled = features.availabilityRequests
  const [open, setOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<"all" | "mention" | "operational">("all")
  const {
    companyId,
    items,
    unreadCount,
    categoryCounts,
    loadingList,
    listError,
    refreshList,
    markAsRead,
    markAllAsRead,
    isMarking,
    markingAll,
  } = useNotifications({ category: categoryFilter, autoloadList: false, deferInitialCount: true })

  useEffect(() => {
    if (!open || !companyId) return
    void refreshList()
  }, [companyId, open, refreshList])

  const visibleItems = useMemo(() => items.slice(0, 8), [items])
  const resolvedTotalCount = categoryCounts[categoryFilter]
  const hiddenCount = Math.max(resolvedTotalCount - visibleItems.length, 0)
  const emptyCopy = getNotificationEmptyCopy({ categoryFilter })

  const handleNotificationSelect = async (notification: InternalNotificationListItem, isUnread: boolean) => {
    try {
      if (isUnread) {
        await markAsRead(notification.id)
      }
      setOpen(false)
      const requestCandidate = availabilityRequestsEnabled
        ? getAvailabilityRequestCandidate(notification)
        : null
      router.push(requestCandidate
        ? `/notificaciones?accion=informar-disponibilidad&solicitud=${encodeURIComponent(requestCandidate)}`
        : buildNotificationExpedienteLink({
            surgeryId: notification.surgeryId,
            entryId: getNotificationEntryId(notification),
          }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la notificación")
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron marcar las notificaciones")
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative size-8 rounded-sm", buttonClassName)}
          aria-label="Notificaciones"
        >
          <Bell className="size-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm shadow-destructive/30 transition-transform duration-150 ease-out motion-reduce:transition-none">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[20.5rem] rounded-3xl border-border/70 bg-background/95 p-0 shadow-xl shadow-black/5 backdrop-blur sm:w-[22rem]">
          <DropdownMenuLabel className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/20 px-3.5 py-3 sm:px-4 sm:py-3.5">
            <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold">Notificaciones</span>
            <p className="mt-0.5 text-[11px] font-normal leading-4 text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} pendientes para revisar.`
                : "Todo al día en menciones y novedades operativas."}
            </p>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1 h-auto px-0 text-[11px]"
                onClick={() => void handleMarkAllAsRead()}
                disabled={markingAll}
              >
                {markingAll ? "Marcando..." : "Marcar todas como leídas"}
              </Button>
              ) : null}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {[
                  { key: "all", label: "Todas" },
                  { key: "mention", label: "Menciones" },
                  { key: "operational", label: "Operativas" },
                ].map((option) => (
                  <Button
                    key={option.key}
                    type="button"
                    variant={categoryFilter === option.key ? "default" : "ghost"}
                    size="sm"
                    className="h-7 rounded-xl px-2.5 text-[11px]"
                    onClick={() => setCategoryFilter(option.key as "all" | "mention" | "operational")}
                  >
                    {option.label}
                    <span className="ml-1 opacity-80">
                      {categoryCounts[option.key as "all" | "mention" | "operational"]}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
            {unreadCount > 0 ? (
              <span className="shrink-0 rounded-full border border-primary/15 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
              {unreadCount} nuevas
            </span>
          ) : null}
        </DropdownMenuLabel>
        {loadingList ? (
          <NotificationStateSurface variant="dropdown" state="loading" />
        ) : listError ? (
          <NotificationStateSurface
            variant="dropdown"
            state="error"
            title="No pudimos cargar las notificaciones."
            errorMessage={listError}
            onRetry={() => void refreshList()}
          />
        ) : visibleItems.length === 0 ? (
          <NotificationStateSurface
            variant="dropdown"
            state="empty"
            title={emptyCopy.title}
            description={emptyCopy.description}
          />
        ) : (
          <div className="max-h-[28rem] overflow-y-auto p-2">
            {visibleItems.map((notification) => {
              const unread = !notification.readAt
               const appearance = getNotificationAppearance(notification, availabilityRequestsEnabled)

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                     "group mb-1.5 flex cursor-pointer flex-col items-start rounded-2xl border px-3 py-3 text-left transition-[background-color,border-color,transform,box-shadow,opacity] duration-150 ease-out hover:-translate-y-px hover:shadow-sm hover:shadow-black/[0.04] active:scale-[0.995] motion-reduce:transform-none motion-reduce:transition-none last:mb-0 focus:translate-x-px data-[highlighted]:translate-x-px sm:px-3.5",
                     unread ? cn("border-border/70", appearance.unreadCardClassName) : "border-border/50 bg-background/95"
                   )}
                  onSelect={(event) => {
                    event.preventDefault()
                     void handleNotificationSelect(
                       notification,
                       unread
                     )
                  }}
                >
                  <NotificationListItem
                     notification={notification}
                     variant="dropdown"
                     availabilityRequestsEnabled={availabilityRequestsEnabled}
                     marking={isMarking(notification.id)}
                  />
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          className="justify-between rounded-none px-3.5 py-3 text-xs font-medium transition-colors duration-150 ease-out motion-reduce:transition-none sm:px-4"
          onSelect={(event) => {
            event.preventDefault()
            setOpen(false)
            router.push("/notificaciones")
          }}
        >
          <span>Ver inbox completo</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            {hiddenCount > 0 ? `+${hiddenCount}` : `${resolvedTotalCount}`}
            <ChevronRight className="size-3.5" />
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
