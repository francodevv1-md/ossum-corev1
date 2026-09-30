import { describe, expect, it, vi } from "vitest"
import type { Prisma } from "@prisma/client"
import { InternalNotificationType } from "@prisma/client"
import { notFound } from "@/lib/api/errors"
import {
  emitAvailabilityActionableNotifications,
  emitAvailabilityPivotTransferNotifications,
  emitAvailabilityRequesterCompletionNotification,
  emitOperationalInternalNotifications,
  emitSeguimientoMentionNotifications,
  getUnreadInternalNotificationsCount,
  listInternalNotifications,
  markAllInternalNotificationsRead,
  markInternalNotificationRead,
} from "@/lib/services/internal-notifications.service"

describe("internal-notifications.service", () => {
  it("emits one notification per valid recipient and excludes self-mentions", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 })
    const prisma = {
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([
          {
            userId: "user-2",
            role: "coordinator",
          },
        ]),
      },
      notificationRolePolicy: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      notificationUserPreference: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    const result = await emitSeguimientoMentionNotifications(prisma, {
      companyId: "co-1",
      surgeryId: "sx-1",
      sourceEntityId: "seg-1",
      actorUserId: "user-1",
      actorDisplayName: "Nora Test",
      entryType: "note",
      content: "Coordinar con @Ana y conmigo",
      mentions: [
        { userId: "user-2", displayName: "Ana Test", companyId: "co-1" },
        { userId: "user-1", displayName: "Nora Test", companyId: "co-1" },
      ],
      trigger: "create",
    })

    expect(result).toEqual({ createdCount: 1, attemptedCount: 1 })
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            recipientUserId: "user-2",
            actorUserId: "user-1",
            eventKey: "seguimiento_mention:seg-1:user-2",
            title: "Nora Test te mencionó en Seguimiento",
          }),
        ],
      })
    )
  })

  it("short-circuits mention notifications when there are no valid recipients", async () => {
    const prisma = {
      userCompanyAccess: {
        findMany: vi.fn(),
      },
      internalNotification: {
        createMany: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient

    const result = await emitSeguimientoMentionNotifications(prisma, {
      companyId: "co-1",
      surgeryId: "sx-1",
      sourceEntityId: "seg-1",
      actorUserId: "user-1",
      actorDisplayName: "Nora Test",
      entryType: "note",
      content: "Sin destinatarios válidos",
      mentions: [{ userId: "user-1", displayName: "Nora Test", companyId: "co-1" }],
      trigger: "create",
    })

    expect(result).toEqual({ createdCount: 0, attemptedCount: 0 })
    expect(prisma.userCompanyAccess.findMany).not.toHaveBeenCalled()
    expect(prisma.internalNotification.createMany).not.toHaveBeenCalled()
  })

  it("lists notifications with unread count and category counts", async () => {
    const count = vi.fn().mockImplementation(async (args) => {
      if (args?.where?.type === InternalNotificationType.seguimiento_mention) return 1
      return 3
    })

    const prisma = {
      internalNotification: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "notif-1",
            companyId: "co-1",
            recipientUserId: "user-2",
            actorUserId: "user-1",
            surgeryId: "sx-1",
            sourceEntityId: "seg-1",
            domain: "CIRUGIAS",
            severity: "INFO",
            linkHref: "/cirugias/sx-1",
            type: InternalNotificationType.seguimiento_mention,
            title: "Nora Test te mencionó en Seguimiento",
            body: "Coordinar con @Ana",
            metadata: { trigger: "create" },
            readAt: null,
            createdAt: new Date("2026-07-03T13:00:00.000Z"),
            updatedAt: new Date("2026-07-03T13:00:00.000Z"),
            actor: { firstName: "Nora", lastName: "Test", email: "nora@test.com" },
          },
        ]),
        count,
      },
    } as unknown as Prisma.TransactionClient

    const result = await listInternalNotifications(prisma, {
      companyId: "co-1",
      recipientUserId: "user-2",
      take: 10,
    })

    expect(result.unreadCount).toBe(3)
    expect(result.totalCount).toBe(3)
    expect(result.categoryCounts.all).toBe(3)
    expect(result.categoryCounts.mention).toBe(1)
    expect(result.items[0]).toMatchObject({
      id: "notif-1",
      actorName: "Nora Test",
      type: InternalNotificationType.seguimiento_mention,
    })
  })

  it("clamps take between 1 and 100 when listing notifications", async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    const prisma = {
      internalNotification: {
        findMany,
        count,
      },
    } as unknown as Prisma.TransactionClient

    await listInternalNotifications(prisma, {
      companyId: "co-1",
      recipientUserId: "user-2",
      take: 999,
    })

    await listInternalNotifications(prisma, {
      companyId: "co-1",
      recipientUserId: "user-2",
      take: 0,
    })

    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ take: 100 }))
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ take: 1 }))
  })

  it("marks a notification as read idempotently", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({
        id: "notif-1",
        companyId: "co-1",
        recipientUserId: "user-2",
        actorUserId: "user-1",
        surgeryId: "sx-1",
        sourceEntityId: "seg-1",
        domain: "CIRUGIAS",
        severity: "INFO",
        linkHref: "/cirugias/sx-1",
        type: InternalNotificationType.seguimiento_mention,
        title: "Nora Test te mencionó en Seguimiento",
        body: "Coordinar con @Ana",
        metadata: null,
        readAt: null,
        createdAt: new Date("2026-07-03T13:00:00.000Z"),
        updatedAt: new Date("2026-07-03T13:00:00.000Z"),
        actor: { firstName: "Nora", lastName: "Test", email: "nora@test.com" },
      })

    const update = vi.fn().mockResolvedValue({
      id: "notif-1",
      companyId: "co-1",
      recipientUserId: "user-2",
      actorUserId: "user-1",
      surgeryId: "sx-1",
      sourceEntityId: "seg-1",
      domain: "CIRUGIAS",
      severity: "INFO",
      linkHref: "/cirugias/sx-1",
      type: InternalNotificationType.seguimiento_mention,
      title: "Nora Test te mencionó en Seguimiento",
      body: "Coordinar con @Ana",
      metadata: null,
      readAt: new Date("2026-07-03T13:05:00.000Z"),
      createdAt: new Date("2026-07-03T13:00:00.000Z"),
      updatedAt: new Date("2026-07-03T13:05:00.000Z"),
      actor: { firstName: "Nora", lastName: "Test", email: "nora@test.com" },
    })

    const prisma = {
      internalNotification: {
        findFirst,
        update,
        count: vi.fn().mockResolvedValue(2),
      },
    } as unknown as Prisma.TransactionClient

    const first = await markInternalNotificationRead(prisma, {
      companyId: "co-1",
      recipientUserId: "user-2",
      notificationId: "notif-1",
    })

    expect(first.readAt).not.toBeNull()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it("throws not found when trying to mark an unknown notification", async () => {
    const prisma = {
      internalNotification: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as Prisma.TransactionClient

    await expect(markInternalNotificationRead(prisma, {
      companyId: "co-1",
      recipientUserId: "user-2",
      notificationId: "missing",
    })).rejects.toMatchObject(notFound("Notification not found", "notification_not_found"))
  })

  it("marks all unread notifications as read", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 4 })
    const prisma = {
      internalNotification: {
        updateMany,
      },
    } as unknown as Prisma.TransactionClient

    const result = await markAllInternalNotificationsRead(prisma, {
      companyId: "co-1",
      recipientUserId: "user-2",
    })

    expect(result.updatedCount).toBe(4)
    expect(result.readAt).toBeInstanceOf(Date)
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        companyId: "co-1",
        recipientUserId: "user-2",
        readAt: null,
      },
      data: {
        readAt: expect.any(Date),
      },
    })
  })

  it("emits coordinator assignment notification to eligible members", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 })
    const prisma = {
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          firstName: "Nora",
          lastName: "Admin",
          email: "nora@test.com",
        }),
      },
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([
          {
            userId: "user-coord-1",
            role: "coordinator",
          },
        ]),
      },
      notificationRolePolicy: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      notificationUserPreference: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    const result = await emitOperationalInternalNotifications(prisma, {
      companyId: "co-1",
      surgeryId: "sx-1",
      sourceEntityId: "evt-1",
      actorUserId: "user-1",
      eventType: "coordinator_assigned",
      coordinatorName: "Nelson",
    })

    expect(result).toEqual({ createdCount: 1, attemptedCount: 1 })
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            recipientUserId: "user-coord-1",
            type: InternalNotificationType.surgery_reassigned,
            title: "Nora Admin asignó coordinador",
          }),
        ],
      })
    )
  })

  it("emits surgery rescheduled notifications to admin/coordinator recipients", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 })
    const prisma = {
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          firstName: "Nora",
          lastName: "Admin",
          email: "nora@test.com",
        }),
      },
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "admin-1", role: "admin" },
          { userId: "admin-2", role: "coordinator" },
        ]),
      },
      notificationRolePolicy: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      notificationUserPreference: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    const result = await emitOperationalInternalNotifications(prisma, {
      companyId: "co-1",
      surgeryId: "sx-1",
      sourceEntityId: "seg-9",
      actorUserId: "user-1",
      eventType: "surgery_rescheduled",
      scheduledDate: "2026-07-10",
      scheduledTime: "08:30",
      previousScheduledDate: "2026-07-08",
      previousScheduledTime: "07:00",
    })

    expect(result).toEqual({ createdCount: 2, attemptedCount: 2 })
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            recipientUserId: "admin-1",
            sourceEntityId: "seg-9",
            title: "Nora Admin registró una reprogramación",
          }),
        ],
      )}
    ))
  })

  it("emits actionable availability row per distinct recipient", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 })
    const tx = {
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    await emitAvailabilityActionableNotifications({
      tx,
      companyId: "co-1",
      surgeryId: "sx-1",
      requestId: "request-1",
      actorUserId: "requester-1",
      correlationId: "correlation-1",
      recipientUserIds: ["creator-1", "pivot-1", "creator-1"],
      requesterDisplayName: "Nora Test",
      surgeryVisibleNumber: "CX-0042",
    })

    const data = createMany.mock.calls[0][0].data
    expect(data).toHaveLength(2)
    expect(data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        recipientUserId: "creator-1",
        availabilityRequestId: "request-1",
        type: InternalNotificationType.availability_request_actionable,
        eventKey: "availability:request:request-1:actionable:creator-1",
      }),
      expect.objectContaining({ recipientUserId: "pivot-1" }),
    ]))
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }))
  })

  it("always emits exactly one non-actionable requester completion row", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 })
    const tx = { internalNotification: { createMany } } as unknown as Prisma.TransactionClient

    await emitAvailabilityRequesterCompletionNotification({
      tx,
      companyId: "co-1",
      surgeryId: "sx-1",
      requestId: "request-1",
      actorUserId: "user-same",
      correlationId: "correlation-1",
      requesterUserId: "user-same",
      completerDisplayName: "Nora Test",
      date: "2026-07-24",
    })

    expect(createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        recipientUserId: "user-same",
        actorUserId: "user-same",
        eventKey: "availability:request:request-1:completed:user-same",
        title: "Disponibilidad informada: 24/07/2026",
        metadata: expect.objectContaining({ actionable: false }),
      })],
      skipDuplicates: true,
    })
  })

  it("upserts actionable delivery when PÍVOT is transferred", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "notification-actionable" })
    const createMany = vi.fn().mockResolvedValue({ count: 2 })
    const tx = {
      internalNotification: { upsert, createMany },
    } as unknown as Prisma.TransactionClient
    const duplicatedRequest = {
      requestId: "request-1",
      surgeryId: "sx-1",
      recipientReasons: ["pivot", "creator", "pivot"] as Array<"pivot" | "creator">,
    }

    await emitAvailabilityPivotTransferNotifications({
      tx,
      companyId: "co-1",
      actorUserId: "admin-1",
      correlationId: "transfer-1",
      formerPivotUserId: "pivot-old",
      newPivotUserId: "pivot-new",
      requests: [
        duplicatedRequest,
        duplicatedRequest,
        { requestId: "request-2", surgeryId: "sx-2", recipientReasons: ["pivot"] },
      ],
    })

    expect(upsert).toHaveBeenCalledTimes(2)
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }))
  })
})
