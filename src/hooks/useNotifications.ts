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
  fetchNotificationPolicies,
  updateRoleNotificationPolicyApi,
  updateUserNotificationPrefApi,
  type NotificationRolePolicyItem,
  type NotificationUserPrefItem,
  type NotificationCatalogItem,
} from "@/lib/api/notifications"

const DEFAULT_TAKE = 20
const COUNT_POLL_INTERVAL_MS = 60_000
const DEFERRED_INITIAL_COUNT_TIMEOUT_MS = 1_300
const NOTIFICATIONS_SYNC_EVENT = "ossum-notifications-sync"

const EMPTY_CATEGORY_COUNTS: InternalNotificationCategoryCounts = {
  all: 0,
  mention: 0,
  operational: 0,
  cirugias: 0,
  logistica: 0,
  stock: 0,
  consumos: 0,
  comparativa: 0,
  cobros: 0,
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
        cirugias: Math.max(0, data.categoryCounts?.cirugias ?? 0),
        logistica: Math.max(0, data.categoryCounts?.logistica ?? 0),
        stock: Math.max(0, data.categoryCounts?.stock ?? 0),
        consumos: Math.max(0, data.categoryCounts?.consumos ?? 0),
        comparativa: Math.max(0, data.categoryCounts?.comparativa ?? 0),
        cobros: Math.max(0, data.categoryCounts?.cobros ?? 0),
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
        cirugias: Math.max(0, data.categoryCounts?.cirugias ?? 0),
        logistica: Math.max(0, data.categoryCounts?.logistica ?? 0),
        stock: Math.max(0, data.categoryCounts?.stock ?? 0),
        consumos: Math.max(0, data.categoryCounts?.consumos ?? 0),
        comparativa: Math.max(0, data.categoryCounts?.comparativa ?? 0),
        cobros: Math.max(0, data.categoryCounts?.cobros ?? 0),
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
  }, [companyId, items, unreadOnly])

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
  }, [companyId, items, unreadOnly])

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

export function useNotificationPolicies() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [rolePolicies, setRolePolicies] = useState<NotificationRolePolicyItem[]>([])
  const [userPreferences, setUserPreferences] = useState<NotificationUserPrefItem[]>([])
  const [catalog, setCatalog] = useState<NotificationCatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const data = await fetchNotificationPolicies(companyId)
      setIsAdmin(data.isAdmin)
      setUserRole(data.userRole)
      setRolePolicies(data.rolePolicies)
      setUserPreferences(data.userPreferences)
      setCatalog(data.catalog)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar configuración de notificaciones")
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setRolePolicy = useCallback(async (role: string, notificationType: string, inAppEnabled: boolean) => {
    if (!companyId) return
    const key = `role:${role}:${notificationType}`
    setSavingKey(key)
    try {
      await updateRoleNotificationPolicyApi(companyId, { role, notificationType, inAppEnabled })
      setRolePolicies((prev) =>
        prev.map((item) =>
          item.role === role && item.notificationType === notificationType
            ? { ...item, inAppEnabled, isDefault: false }
            : item
        )
      )
    } finally {
      setSavingKey(null)
    }
  }, [companyId])

  const setUserPreference = useCallback(async (notificationType: string, inAppMuted: boolean) => {
    if (!companyId) return
    const key = `user:${notificationType}`
    setSavingKey(key)
    try {
      await updateUserNotificationPrefApi(companyId, { notificationType, inAppMuted })
      setUserPreferences((prev) =>
        prev.map((item) =>
          item.notificationType === notificationType
            ? { ...item, inAppMuted }
            : item
        )
      )
    } finally {
      setSavingKey(null)
    }
  }, [companyId])

  return {
    companyId,
    isAdmin,
    userRole,
    rolePolicies,
    userPreferences,
    catalog,
    loading,
    error,
    savingKey,
    refresh,
    setRolePolicy,
    setUserPreference,
  }
}
