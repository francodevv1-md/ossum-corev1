"use client"

import { useState } from "react"
import {
  CheckCheck,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { SectionHeader } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/useNotifications"
import {
  getAvailabilityRequestCandidate,
  getNotificationEntryId,
  readAvailabilityRequestCandidate,
} from "@/components/notifications/notificationAppearance"
import { AvailabilityRequestActionDialog } from "@/components/notifications/AvailabilityRequestActionDialog"
import { useAuth } from "@/components/auth/AuthProvider"
import { NotificationListItem } from "@/components/notifications/NotificationListItem"
import { buildNotificationExpedienteLink } from "@/lib/expediente-navigation"
import {
  getNotificationEmptyCopy,
  NotificationStateSurface,
} from "@/components/notifications/NotificationStateSurface"
import type { InternalNotificationListItem } from "@/lib/api/notifications"

const PAGE_SIZE = 20

export function NotificationsInbox() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser, features, user } = useAuth()
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "mention" | "operational">("all")
  const [take, setTake] = useState(PAGE_SIZE)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [dismissedQueryId, setDismissedQueryId] = useState<string | null>(null)
  const unreadOnly = filter === "unread"
  const {
    companyId,
    items,
    unreadCount,
    totalCount,
    categoryCounts,
    loadingList,
    listError,
    refreshList,
    markAsRead,
    markAllAsRead,
    isMarking,
    markingAll,
  } = useNotifications({ take, unreadOnly, category: categoryFilter })
  const availabilityRequestsEnabled = features.availabilityRequests
  const queryRequestId = availabilityRequestsEnabled && searchParams.get("accion") === "informar-disponibilidad"
    ? readAvailabilityRequestCandidate(searchParams.get("solicitud"))
    : null
  const activeQueryId = queryRequestId === dismissedQueryId ? null : queryRequestId
  const activeRequestId = availabilityRequestsEnabled ? selectedRequestId ?? activeQueryId : null
  const actorIdentityToken = currentUser?.id ?? user?.id ?? ""

  const selectedCategoryCount = categoryCounts[categoryFilter]
  const hasMore = items.length < totalCount
  const emptyCopy = getNotificationEmptyCopy({ categoryFilter, unreadOnly })
  const visibleCountLabel = unreadOnly ? `${items.length} pendientes visibles` : `${items.length} visibles`
  const totalCountLabel = categoryFilter === "all"
    ? unreadOnly ? `${totalCount} sin leer` : `${totalCount} totales`
    : `${selectedCategoryCount} en esta vista`

  const handleOpenNotification = async (
    notification: InternalNotificationListItem,
    isUnread: boolean
  ) => {
    try {
      if (isUnread) {
        await markAsRead(notification.id)
      }

      const requestCandidate = availabilityRequestsEnabled
        ? getAvailabilityRequestCandidate(notification)
        : null
      if (requestCandidate) {
        setSelectedRequestId(requestCandidate)
        return
      }
      router.push(buildNotificationExpedienteLink({
        surgeryId: notification.surgeryId,
        entryId: getNotificationEntryId(notification),
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir la notificación")
    }
  }

  const handleMarkAll = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron marcar las notificaciones")
    }
  }

  const handleFilterChange = (nextFilter: "all" | "unread") => {
    setFilter(nextFilter)
    setTake(PAGE_SIZE)
  }

  const handleCategoryChange = (nextCategory: "all" | "mention" | "operational") => {
    setCategoryFilter(nextCategory)
    setTake(PAGE_SIZE)
  }

  return (
    <>
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b bg-card/80 px-4 py-4 sm:px-6 sm:py-5">
        <div className="space-y-3.5 sm:space-y-4">
          <SectionHeader
            title="Notificaciones"
            description="Inbox interno de menciones y novedades recientes."
            actions={(
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:px-2.5 sm:text-[11px]">
                  {items.length} visibles
                </Badge>
                <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-2 py-1 text-[10px] font-medium sm:px-2.5 sm:text-[11px]">
                  {unreadCount} sin leer
                </Badge>
              </div>
            )}
          />

          <div className="rounded-3xl border border-border/60 bg-background/75 p-3 shadow-sm shadow-black/[0.03] sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:px-3 sm:text-[11px]">
                  <SlidersHorizontal className="size-3.5" />
                  {visibleCountLabel} · {totalCountLabel}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex w-full items-center gap-1 rounded-xl border border-border/70 bg-muted/30 p-1 sm:w-auto">
                    <Button type="button" variant={filter === "all" ? "default" : "ghost"} size="sm" className="h-7 flex-1 rounded-lg px-2.5 text-[11px] sm:h-8 sm:flex-none sm:px-3" onClick={() => handleFilterChange("all")}>
                      Todas
                    </Button>
                    <Button type="button" variant={filter === "unread" ? "default" : "ghost"} size="sm" className="h-7 flex-1 rounded-lg px-2.5 text-[11px] sm:h-8 sm:flex-none sm:px-3" onClick={() => handleFilterChange("unread")}>
                      No leídas
                    </Button>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full border-border/70 bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                    {filter === "all" ? "Mostrando todo" : "Solo pendientes"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:max-w-[34rem] lg:justify-end">
                <div className="flex w-full items-center gap-1 rounded-xl border border-border/70 bg-muted/30 p-1 sm:w-auto">
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
                      className="h-7 flex-1 rounded-lg px-2.5 text-[11px] sm:h-8 sm:flex-none sm:px-3"
                      onClick={() => handleCategoryChange(option.key as "all" | "mention" | "operational")}
                    >
                      {option.label}
                      <span className="ml-1 text-[11px] opacity-80">
                        {categoryCounts[option.key as "all" | "mention" | "operational"]}
                      </span>
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-[11px]"
                    onClick={() => void refreshList()}
                    disabled={loadingList}
                  >
                    Actualizar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-[11px]"
                    onClick={() => void handleMarkAll()}
                    disabled={markingAll || unreadCount === 0}
                  >
                    <CheckCheck className="size-4" />
                    {markingAll ? "Marcando..." : "Marcar todas como leídas"}
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] text-muted-foreground sm:mt-3 sm:text-xs">
              {unreadCount > 0
                ? `${unreadCount} notificaciones siguen pendientes.`
                : "No hay pendientes por revisar."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6">
        {listError ? (
          <NotificationStateSurface
            variant="inbox"
            state="error"
            title="No pudimos cargar las notificaciones."
            errorMessage={listError}
            onRetry={() => void refreshList()}
          />
        ) : loadingList && items.length === 0 ? (
          <NotificationStateSurface variant="inbox" state="loading" />
        ) : items.length === 0 ? (
          <NotificationStateSurface
            variant="inbox"
            state="empty"
            title={emptyCopy.title}
            description={emptyCopy.description}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/85 shadow-sm shadow-black/[0.03]">
              {items.map((notification) => {
                const unread = !notification.readAt
                const marking = isMarking(notification.id)

                return (
                  <NotificationListItem
                    key={notification.id}
                     notification={notification}
                     variant="inbox"
                     availabilityRequestsEnabled={availabilityRequestsEnabled}
                     marking={marking}
                    onOpen={() => void handleOpenNotification(
                      notification,
                      unread
                    )}
                    onMarkAsRead={unread ? () => {
                      void markAsRead(notification.id).catch((error) => {
                        toast.error(error instanceof Error ? error.message : "No se pudo marcar la notificación")
                      })
                    } : undefined}
                  />
                )
              })}
            </div>

            {hasMore ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-4 transition-transform duration-150 ease-out motion-reduce:transition-none hover:-translate-y-px active:translate-y-0"
                  onClick={() => setTake((current) => current + PAGE_SIZE)}
                  disabled={loadingList}
                >
                  {loadingList ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" />
                      Cargando más
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      Cargar más
                      <ChevronRight className="size-3.5" />
                    </span>
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
    {activeRequestId ? (
      <AvailabilityRequestActionDialog
        open
        companyId={companyId ?? ""}
        requestId={activeRequestId}
        actorIdentityToken={actorIdentityToken}
        onOpenChange={(nextOpen) => {
          if (nextOpen) return
          setSelectedRequestId(null)
          if (activeQueryId) {
            setDismissedQueryId(activeQueryId)
            router.replace("/notificaciones")
          }
        }}
      />
    ) : null}
    </>
  )
}
