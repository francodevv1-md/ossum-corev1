"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import {
  type InternalNotificationCategory,
  fetchInternalNotifications,
  fetchInternalNotificationsUnreadCount,
  type InternalNotificationCategoryCounts,
  markAllInternalNotificationsAsRead,
  markInternalNotificationAsRead,
  type InternalNotificationListItem,
} from "@/lib/api/notifications"

const DEFAULT_TAKE = 8
const COUNT_POLL_INTERVAL_MS = 60_000
const DEFERRED_INITIAL_COUNT_TIMEOUT_MS = 1_300
const NOTIFICATIONS_SYNC_EVENT = "ossum-notifications-sync"
const EMPTY_CATEGORY_COUNTS: InternalNotificationCategoryCounts = {
  all: 0,
  mention: 0,
  operational: 0,
}

type UseNotificationsOptions = {
  take?: number
  unreadOnly?: boolean
  category?: InternalNotificationCategory
  autoloadList?: boolean
  deferInitialCount?: boolean
}

type RequestIdleCallback = (
  callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
  options?: { timeout?: number }
) => number

type CancelIdleCallback = (handle: number) => void

type WindowWithIdleCallback = Window & typeof globalThis & {
  requestIdleCallback?: RequestIdleCallback
  cancelIdleCallback?: CancelIdleCallback
}

function emitNotificationsSync() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_SYNC_EVENT))
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const take = options.take ?? DEFAULT_TAKE
  const unreadOnly = options.unreadOnly ?? false
  const category = options.category ?? "all"
  const autoloadList = options.autoloadList ?? true
  const deferInitialCount = options.deferInitialCount ?? false

  const [items, setItems] = useState<InternalNotificationListItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [categoryCounts, setCategoryCounts] = useState<InternalNotificationCategoryCounts>(EMPTY_CATEGORY_COUNTS)
  const [unreadCategoryCounts, setUnreadCategoryCounts] = useState<InternalNotificationCategoryCounts>(EMPTY_CATEGORY_COUNTS)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingCount, setLoadingCount] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [countError, setCountError] = useState<string | null>(null)
  const [markingIds, setMarkingIds] = useState<Record<string, boolean>>({})
  const [markingAll, setMarkingAll] = useState(false)

  const refreshUnreadCount = useCallback(async () => {
    if (!companyId) {
      setUnreadCount(0)
      setUnreadCategoryCounts(EMPTY_CATEGORY_COUNTS)
      setCountError(null)
      return
    }

    setLoadingCount(true)
    try {
      const data = await fetchInternalNotificationsUnreadCount(companyId)
      setUnreadCount(Math.max(0, data.unreadCount ?? 0))
      setUnreadCategoryCounts({
        all: Math.max(0, data.categoryCounts?.all ?? data.unreadCount ?? 0),
        mention: Math.max(0, data.categoryCounts?.mention ?? 0),
        operational: Math.max(0, data.categoryCounts?.operational ?? 0),
      })
      setCountError(null)
    } catch (error) {
      setCountError(error instanceof Error ? error.message : "Error al cargar notificaciones")
    } finally {
      setLoadingCount(false)
    }
  }, [companyId])

  const refreshList = useCallback(async () => {
    if (!companyId) {
      setItems([])
      setUnreadCount(0)
      setTotalCount(0)
      setCategoryCounts(EMPTY_CATEGORY_COUNTS)
      setListError(null)
      return
    }

    setLoadingList(true)
    try {
      const data = await fetchInternalNotifications(companyId, take, unreadOnly, category)
      setItems(data.items ?? [])
      setUnreadCount(Math.max(0, data.unreadCount ?? 0))
      setTotalCount(Math.max(0, data.totalCount ?? 0))
      setCategoryCounts({
        all: Math.max(0, data.categoryCounts?.all ?? data.totalCount ?? 0),
        mention: Math.max(0, data.categoryCounts?.mention ?? 0),
        operational: Math.max(0, data.categoryCounts?.operational ?? 0),
      })
      setListError(null)
      setCountError(null)
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Error al cargar notificaciones")
    } finally {
      setLoadingList(false)
    }
  }, [category, companyId, take, unreadOnly])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!companyId) {
      throw new Error("Missing company context")
    }

    const previousItems = items
    const target = previousItems.find((item) => item.id === notificationId)
    const wasUnread = Boolean(target && !target.readAt)
    const optimisticReadAt = new Date().toISOString()

    if (target && !target.readAt) {
      setItems((current) => (
        unreadOnly
          ? current.filter((item) => item.id !== notificationId)
          : current.map((item) => (
            item.id === notificationId ? { ...item, readAt: optimisticReadAt, updatedAt: optimisticReadAt } : item
          ))
      ))
      setUnreadCount((current) => Math.max(0, current - 1))
      if (unreadOnly) {
        setTotalCount((current) => Math.max(0, current - 1))
      }
    }

    setMarkingIds((current) => ({ ...current, [notificationId]: true }))

    try {
      const updated = await markInternalNotificationAsRead(companyId, notificationId)
      setItems((current) => (
        unreadOnly
          ? current.filter((item) => item.id !== notificationId)
          : current.map((item) => (item.id === notificationId ? updated : item))
      ))
      emitNotificationsSync()
      return updated
    } catch (error) {
      if (wasUnread) {
        setItems(previousItems)
        setUnreadCount((current) => current + 1)
      }
      throw error
    } finally {
      setMarkingIds((current) => {
        const next = { ...current }
        delete next[notificationId]
        return next
      })
    }
  }, [companyId, items])

  const markAllAsRead = useCallback(async () => {
    if (!companyId) {
      throw new Error("Missing company context")
    }

    const previousItems = items
    const optimisticReadAt = new Date().toISOString()
    const unreadBefore = previousItems.filter((item) => !item.readAt).length

    if (unreadBefore > 0) {
      setItems((current) => (
        unreadOnly
          ? []
          : current.map((item) => (
            item.readAt ? item : { ...item, readAt: optimisticReadAt, updatedAt: optimisticReadAt }
          ))
      ))
      setUnreadCount(0)
      if (unreadOnly) {
        setTotalCount(0)
      }
    }

    setMarkingAll(true)

    try {
      const result = await markAllInternalNotificationsAsRead(companyId)
      emitNotificationsSync()
      return result
    } catch (error) {
      if (unreadBefore > 0) {
        setItems(previousItems)
        setUnreadCount(unreadBefore)
      }
      throw error
    } finally {
      setMarkingAll(false)
    }
  }, [companyId, items])

  useEffect(() => {
    if (autoloadList) {
      void refreshList()
      return
    }

    if (deferInitialCount && companyId) {
      const idleWindow = window as WindowWithIdleCallback
      let timeoutId: number | null = null
      let idleCallbackId: number | null = null

      if (idleWindow.requestIdleCallback) {
        idleCallbackId = idleWindow.requestIdleCallback(() => {
          void refreshUnreadCount()
        }, { timeout: DEFERRED_INITIAL_COUNT_TIMEOUT_MS })
      } else {
        timeoutId = window.setTimeout(() => {
          void refreshUnreadCount()
        }, DEFERRED_INITIAL_COUNT_TIMEOUT_MS)
      }

      return () => {
        if (idleCallbackId !== null) {
          idleWindow.cancelIdleCallback?.(idleCallbackId)
        }
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
      }
    }

    void refreshUnreadCount()
  }, [autoloadList, companyId, deferInitialCount, refreshList, refreshUnreadCount])

  useEffect(() => {
    if (!companyId) return

    const intervalId = window.setInterval(() => {
      void refreshUnreadCount()
    }, COUNT_POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [companyId, refreshUnreadCount])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleSync = () => {
      void refreshUnreadCount()
      if (autoloadList) {
        void refreshList()
      }
    }

    window.addEventListener(NOTIFICATIONS_SYNC_EVENT, handleSync)
    return () => window.removeEventListener(NOTIFICATIONS_SYNC_EVENT, handleSync)
  }, [autoloadList, refreshList, refreshUnreadCount])

  useEffect(() => {
    if (!companyId) {
      setItems([])
      setUnreadCount(0)
      setTotalCount(0)
      setCategoryCounts(EMPTY_CATEGORY_COUNTS)
      setUnreadCategoryCounts(EMPTY_CATEGORY_COUNTS)
      setListError(null)
      setCountError(null)
      setMarkingIds({})
      setMarkingAll(false)
    }
  }, [companyId])

  return useMemo(() => ({
    companyId,
    items,
    unreadCount,
    totalCount,
    categoryCounts,
    unreadCategoryCounts,
    loadingList,
    loadingCount,
    listError,
    countError,
    markingAll,
    refreshList,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    isMarking: (notificationId: string) => Boolean(markingIds[notificationId]),
  }), [categoryCounts, companyId, countError, items, listError, loadingCount, loadingList, markAllAsRead, markAsRead, markingAll, markingIds, refreshList, refreshUnreadCount, totalCount, unreadCategoryCounts, unreadCount])
}
