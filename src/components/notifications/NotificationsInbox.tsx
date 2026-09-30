"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCheck,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  Bell,
  Sparkles,
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
  isCoordinatorAssignmentNotification,
  readAvailabilityRequestCandidate,
} from "@/components/notifications/notificationAppearance"
import { AvailabilityRequestActionDialog } from "@/components/notifications/AvailabilityRequestActionDialog"
import { useAuth } from "@/components/auth/AuthProvider"
import { NotificationListItem } from "@/components/notifications/NotificationListItem"
import { buildNotificationCirugiaLink, buildNotificationExpedienteLink } from "@/lib/expediente-navigation"
import {
  getNotificationEmptyCopy,
  NotificationStateSurface,
} from "@/components/notifications/NotificationStateSurface"
import type { InternalNotificationCategory, InternalNotificationListItem } from "@/lib/api/notifications"

const PAGE_SIZE = 20

const DOMAIN_TABS: Array<{ key: InternalNotificationCategory; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "cirugias", label: "Cirugías" },
  { key: "logistica", label: "Logística" },
  { key: "stock", label: "Stock" },
  { key: "consumos", label: "Consumos" },
  { key: "comparativa", label: "Comparativa" },
  { key: "cobros", label: "Cobros" },
  { key: "mention", label: "Menciones" },
  { key: "operational", label: "Operativas" },
]

export function NotificationsInbox() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser, features, user } = useAuth()
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [categoryFilter, setCategoryFilter] = useState<InternalNotificationCategory>("all")
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

  const selectedCategoryCount = categoryCounts[categoryFilter] ?? 0
  const hasMore = items.length < totalCount
  const emptyCopy = getNotificationEmptyCopy({ categoryFilter: categoryFilter as any, unreadOnly })
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

      // 1. Availability dialog if applicable
      const requestCandidate = availabilityRequestsEnabled
        ? getAvailabilityRequestCandidate(notification)
        : null
      if (requestCandidate) {
        setSelectedRequestId(requestCandidate)
        return
      }

      // 2. Direct deep link if available
      if (notification.linkHref) {
        router.push(notification.linkHref)
        return
      }

      // 3. Fallback to surgery navigation if surgeryId exists
      if (notification.surgeryId) {
        router.push(isCoordinatorAssignmentNotification(notification)
          ? buildNotificationCirugiaLink(notification.surgeryId)
          : buildNotificationExpedienteLink({ surgeryId: notification.surgeryId, entryId: getNotificationEntryId(notification) }))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir la notificación")
    }
  }

  const handleMarkAll = async () => {
    try {
      await markAllAsRead()
      toast.success("Todas las notificaciones marcadas como leídas")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron marcar las notificaciones")
    }
  }

  const handleFilterChange = (nextFilter: "all" | "unread") => {
    setFilter(nextFilter)
    setTake(PAGE_SIZE)
  }

  const handleCategoryChange = (nextCategory: InternalNotificationCategory) => {
    setCategoryFilter(nextCategory)
    setTake(PAGE_SIZE)
  }

  return (
    <>
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border/80 bg-card/90 backdrop-blur-md px-4 py-4 sm:px-6 sm:py-5">
        <div className="space-y-3.5 sm:space-y-4">
          <SectionHeader
            title="Centro de Notificaciones"
            description="Novedades transversales de Cirugías, Stock, Logística, Consumos, Comparativa y Cobros."
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

          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-border/70 bg-background/80 backdrop-blur-xs p-3.5 shadow-sm shadow-black/[0.02] sm:p-4.5"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
                  <SlidersHorizontal className="size-3.5 text-slate-400" />
                  <span>{visibleCountLabel} · {totalCountLabel}</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  {/* Status Toggle Switcher */}
                  <div className="relative flex w-full items-center gap-1 rounded-xl border border-border/70 bg-muted/40 p-1 sm:w-auto">
                    <Button
                      type="button"
                      variant={filter === "all" ? "default" : "ghost"}
                      size="sm"
                      className="relative z-10 h-7.5 flex-1 rounded-lg px-3 text-[11px] font-semibold sm:flex-none transition-colors"
                      onClick={() => handleFilterChange("all")}
                    >
                      <span>Todas</span>
                      <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.2 text-[10px] font-bold">
                        {categoryCounts.all}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant={filter === "unread" ? "default" : "ghost"}
                      size="sm"
                      className="relative z-10 h-7.5 flex-1 rounded-lg px-3 text-[11px] font-semibold sm:flex-none transition-colors"
                      onClick={() => handleFilterChange("unread")}
                    >
                      <span>Sin leer</span>
                      {unreadCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* Domain Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
                    {DOMAIN_TABS.map((tab) => {
                      const count = categoryCounts[tab.key] ?? 0
                      const active = categoryFilter === tab.key
                      return (
                        <Button
                          key={tab.key}
                          type="button"
                          variant={active ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7.5 rounded-lg px-2.5 text-[11px] font-medium"
                          onClick={() => handleCategoryChange(tab.key)}
                        >
                          <span>{tab.label}</span>
                          {count > 0 && (
                            <span className="ml-1 text-[10px] opacity-70">
                              ({count})
                            </span>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl border-border/70 bg-background/80 text-xs shadow-xs hover:bg-muted/50"
                  disabled={loadingList}
                  onClick={() => refreshList()}
                >
                  <RefreshCw className={`mr-1.5 size-3.5 ${loadingList ? "animate-spin" : ""}`} />
                  <span>Actualizar</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl border-border/70 bg-background/80 text-xs shadow-xs hover:bg-muted/50"
                  disabled={markingAll || unreadCount === 0}
                  onClick={handleMarkAll}
                >
                  <CheckCheck className="mr-1.5 size-3.5 text-primary" />
                  <span>{markingAll ? "Marcando..." : "Marcar todo como leído"}</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto">
        {loadingList && items.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : listError ? (
          <div className="m-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm font-medium text-destructive">{listError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => refreshList()}
            >
              Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center px-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-3">
              <Bell className="size-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">{emptyCopy.title}</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">{emptyCopy.description}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            <AnimatePresence initial={false}>
              {items.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  variant="inbox"
                  availabilityRequestsEnabled={availabilityRequestsEnabled}
                  marking={isMarking(notification.id)}
                  onOpen={() => handleOpenNotification(notification, !notification.readAt)}
                  onMarkAsRead={() => markAsRead(notification.id)}
                />
              ))}
            </AnimatePresence>

            {hasMore && (
              <div className="p-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={() => setTake((prev) => prev + PAGE_SIZE)}
                >
                  Cargar más notificaciones
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {activeRequestId && companyId && (
      <AvailabilityRequestActionDialog
        open={Boolean(activeRequestId)}
        companyId={companyId}
        requestId={activeRequestId}
        actorIdentityToken={user?.id ?? currentUser?.id ?? ""}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequestId(null)
            if (queryRequestId) setDismissedQueryId(queryRequestId)
          }
        }}
      />
    )}
    </>
  )
}
