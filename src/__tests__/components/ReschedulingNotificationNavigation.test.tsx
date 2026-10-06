import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Prisma } from "@prisma/client"
import { NotificationsInbox } from "@/components/notifications/NotificationsInbox"
import { emitSurgeryReschedulingNotifications } from "@/lib/services/internal-notifications.service"
import type { InternalNotificationListItem } from "@/lib/api/notifications"

const { pushMock, markAsReadMock, useNotificationsMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  markAsReadMock: vi.fn().mockResolvedValue(undefined),
  useNotificationsMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ currentUser: { id: "recipient" }, user: null, features: { availabilityRequests: false } }),
}))
vi.mock("@/hooks/useNotifications", () => ({ useNotifications: useNotificationsMock }))

describe("persisted rescheduling notification navigation (offline)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network is excluded from this offline test")))
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    { dateType: "surgery" as const, role: "admin" },
    { dateType: "shipping" as const, role: "deposito" },
  ])("opens the valid Ficha link from the actual $dateType emitter row and marks it read", async ({ dateType, role }) => {
    const surgeryId = "cx/1 & 2"
    const persisted: Prisma.InternalNotificationCreateManyInput[] = []
    const createMany = vi.fn(async ({ data }: { data: Prisma.InternalNotificationCreateManyInput[] }) => {
      persisted.push(...data)
      return { count: data.length }
    })
    const tx = {
      user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ firstName: "Nora", lastName: "Actor", email: "nora@example.test" }) },
      userCompanyAccess: { findMany: vi.fn().mockResolvedValue([{ userId: "recipient", role }]) },
      notificationRolePolicy: { findMany: vi.fn().mockResolvedValue([]) },
      notificationUserPreference: { findMany: vi.fn().mockResolvedValue([]) },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    await expect(emitSurgeryReschedulingNotifications(tx, {
      companyId: "company-1", surgeryId, sourceEntityId: "audit-1", actorUserId: "actor",
      changes: [{ dateType, previousDate: "2026-10-07T15:00:00.000Z", newDate: "2026-10-08T15:00:00.000Z" }],
      previousTimeSpecified: true, newTimeSpecified: true,
    })).resolves.toEqual({ createdCount: 1, attemptedCount: 1 })
    expect(createMany).toHaveBeenCalledTimes(1)
    expect(persisted).toHaveLength(1)
    const row = persisted[0]
    expect(row.metadata).toMatchObject({ eventType: "surgery_rescheduled", sourceEntityType: "audit_event" })

    // Preserve the emitter's link/title/body/metadata; only add inbox response fields.
    const item: InternalNotificationListItem = {
      id: "notification-1", companyId: row.companyId, recipientUserId: row.recipientUserId,
      actorUserId: row.actorUserId, surgeryId: row.surgeryId ?? null, sourceEntityId: row.sourceEntityId,
      domain: row.domain ?? "CIRUGIAS", severity: row.severity ?? "WARNING", linkHref: row.linkHref ?? null,
      type: row.type, title: row.title, body: row.body ?? null,
      metadata: row.metadata as Record<string, unknown>, readAt: null,
      createdAt: "2026-10-06T15:00:00.000Z", updatedAt: "2026-10-06T15:00:00.000Z", actorName: "Nora Actor",
    }
    useNotificationsMock.mockReturnValue({
      companyId: "company-1", items: [item], unreadCount: 1, totalCount: 1,
      categoryCounts: { all: 1, mention: 0, operational: 1, cirugias: 1, logistica: 0, stock: 0, consumos: 0, comparativa: 0, cobros: 0 },
      loadingList: false, listError: null, refreshList: vi.fn(), markAsRead: markAsReadMock,
      markAllAsRead: vi.fn(), isMarking: () => false, markingAll: false,
    })

    render(<NotificationsInbox />)
    expect(screen.getByText(row.title)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Abrir caso" }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/expediente?id=cx%2F1+%26+2"))
    expect(markAsReadMock).toHaveBeenCalledExactlyOnceWith("notification-1")
    expect(markAsReadMock.mock.invocationCallOrder[0]).toBeLessThan(pushMock.mock.invocationCallOrder[0])
    const destination = new URL(pushMock.mock.calls[0][0], "http://offline.test")
    expect(destination.pathname).toBe("/expediente")
    expect([...destination.searchParams.entries()]).toEqual([["id", surgeryId]])
    expect(fetch).not.toHaveBeenCalled()
  })
})
