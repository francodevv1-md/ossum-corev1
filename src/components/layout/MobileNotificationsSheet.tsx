"use client"

import React, { useState } from "react"
import { Bell, BellOff, Check, ChevronRight, RefreshCw } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/useNotifications"
import { NotificationListItem } from "@/components/notifications/NotificationListItem"
import {
  getNotificationAppearance,
  getNotificationEntryId,
} from "@/components/notifications/notificationAppearance"
import {
  getNotificationEmptyCopy,
  NotificationStateSurface,
} from "@/components/notifications/NotificationStateSurface"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { buildNotificationCirugiaLink, buildNotificationExpedienteLink } from "@/lib/expediente-navigation"

interface MobileNotificationsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseSidebar?: () => void
}

type CategoryKey = "all" | "mention" | "operational"

export function MobileNotificationsSheet({
  open,
  onOpenChange,
  onCloseSidebar,
}: MobileNotificationsSheetProps) {
  const router = useRouter()
  const { features, activeCompany } = useAuth()
  const availabilityRequestsEnabled = features.availabilityRequests
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>("all")
  const {
    items,
    unreadCount,
    loadingList,
    listError,
    refreshList,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ category: "all" })
  const companyId = activeCompany?.id

  const visibleItems = items.filter((notification) => {
    if (categoryFilter === "all") return true
    const appearance = getNotificationAppearance(notification, availabilityRequestsEnabled)
    const label = appearance.label.toLowerCase()
    if (categoryFilter === "mention") return label.includes("menc") || label.includes("mencion")
    if (categoryFilter === "operational") return label.includes("operat")
    return true
  })

  const handleSelect = async (notification: { id: string; sourceEntityId: string; metadata: unknown }) => {
    if (notification.sourceEntityId) {
      await markAsRead(notification.sourceEntityId)
    }
    const entryId = getNotificationEntryId(notification)
    const link =
      buildNotificationExpedienteLink({ surgeryId: notification.sourceEntityId, entryId }) ??
      buildNotificationCirugiaLink(notification.sourceEntityId)
    onOpenChange(false)
    if (onCloseSidebar) onCloseSidebar()
    if (link) {
      if (entryId) router.push(`${link}#seguimiento-${entryId}`)
      else router.push(link)
    } else {
      toast.info("Notificación sin destino directo")
    }
  }

  const handleMarkAll = async () => {
    try {
      await markAllAsRead()
    } catch {
      // surface is via state refresh; no-op here
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0 sm:max-w-md sm:left-1/2 sm:-translate-x-1/2"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <SheetHeader className="flex flex-row items-center justify-between gap-2 px-5 pb-2 pt-3">
          <div>
            <SheetTitle className="text-base">Notificaciones</SheetTitle>
            <SheetDescription className="text-xs">
              {unreadCount > 0
                ? `${unreadCount} sin leer`
                : "Sin pendientes"}
              {companyId ? "" : " · sin empresa"}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarkAll}
                className="h-8 text-xs text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
              >
                <Check className="mr-1 size-3.5" aria-hidden />
                Marcar todas
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => void refreshList()}
              aria-label="Actualizar"
            >
              <RefreshCw className="size-4" aria-hidden />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pb-2 dark:border-slate-800">
          {([
            ["all", "Todas"],
            ["mention", "Menciones"],
            ["operational", "Operativas"],
          ] as const).map(([key, label]) => {
            const isActive = categoryFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                aria-pressed={isActive}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition active:scale-95",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-2">
          {loadingList && items.length === 0 ? (
            <NotificationStateSurface variant="inbox" state="loading" />
          ) : listError ? (
            <NotificationStateSurface
              variant="inbox"
              state="error"
              errorMessage={listError}
              onRetry={() => void refreshList()}
            />
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800/60">
                <BellOff className="size-6 text-slate-400" aria-hidden />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getNotificationEmptyCopy({ categoryFilter, unreadOnly: false }).description}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1" role="list">
              {visibleItems.map((notification) => (
                <li key={notification.id}>
                  <NotificationListItem
                    notification={notification}
                    variant="inbox"
                    availabilityRequestsEnabled={availabilityRequestsEnabled}
                    onOpen={() => void handleSelect(notification)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between border-t border-slate-200 px-5 pt-3 text-xs dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">
            {visibleItems.length === 1 ? "1 notificación" : `${visibleItems.length} notificaciones`}
          </span>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false)
              if (onCloseSidebar) onCloseSidebar()
              router.push("/notificaciones")
            }}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-700 hover:underline dark:text-blue-400"
          >
            Ver todas las notificaciones
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}