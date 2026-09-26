import { describe, expect, it, vi } from "vitest"
import type { Prisma } from "@prisma/client"
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
            user: { firstName: "Ana", lastName: "Test", email: "ana@test.com" },
          },
        ]),
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

  it("lists notifications with unread count", async () => {
    const count = vi
      .fn()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)

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
            type: "seguimiento_mention",
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
    expect(result.categoryCounts).toEqual({ all: 3, mention: 2, operational: 1 })
    expect(result.items[0]).toMatchObject({
      id: "notif-1",
      actorName: "Nora Test",
      type: "seguimiento_mention",
    })
    expect(prisma.internalNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "co-1",
          recipientUserId: "user-2",
        }),
      })
    )
  })

  it("filters listed notifications by mention category server-side while keeping metadata-based counts", async () => {
    const count = vi
      .fn()
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2)

    const findMany = vi.fn().mockResolvedValue([
      {
        id: "notif-mention-1",
        companyId: "co-1",
        recipientUserId: "user-2",
        actorUserId: "user-1",
        surgeryId: "sx-1",
        sourceEntityId: "seg-1",
        type: "seguimiento_mention",
        title: "Nora Test te mencionó en Seguimiento",
        body: "Coordinar con @Ana",
        metadata: { trigger: "create" },
        readAt: null,
        createdAt: new Date("2026-07-03T13:00:00.000Z"),
        updatedAt: new Date("2026-07-03T13:00:00.000Z"),
        actor: { firstName: "Nora", lastName: "Test", email: "nora@test.com" },
        surgery: { patient: { firstName: "Ana", lastName: "Paciente", legalName: null } },
      },
    ])

    const prisma = {
      internalNotification: {
        findMany,
        count,
      },
    } as unknown as Prisma.TransactionClient

    const result = await listInternalNotifications(prisma, {
      companyId: "co-1",
      recipientUserId: "user-2",
      take: 10,
      category: "mention",
    })

    expect(result.totalCount).toBe(4)
    expect(result.unreadCount).toBe(5)
    expect(result.categoryCounts).toEqual({ all: 6, mention: 4, operational: 2 })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ companyId: "co-1", recipientUserId: "user-2" }),
            expect.objectContaining({
              NOT: expect.objectContaining({
                OR: expect.arrayContaining([
                  { metadata: { path: ["channel"], equals: "operational" } },
                  { metadata: { path: ["eventType"], equals: "coordinator_assigned" } },
                ]),
              }),
            }),
          ]),
        }),
      })
    )
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
        type: "seguimiento_mention",
        title: "Nora Test te mencionó en Seguimiento",
        body: "Coordinar con @Ana",
        metadata: null,
        readAt: null,
        createdAt: new Date("2026-07-03T13:00:00.000Z"),
        updatedAt: new Date("2026-07-03T13:00:00.000Z"),
        actor: { firstName: "Nora", lastName: "Test", email: "nora@test.com" },
      })
      .mockResolvedValueOnce({
        id: "notif-1",
        companyId: "co-1",
        recipientUserId: "user-2",
        actorUserId: "user-1",
        surgeryId: "sx-1",
        sourceEntityId: "seg-1",
        type: "seguimiento_mention",
        title: "Nora Test te mencionó en Seguimiento",
        body: "Coordinar con @Ana",
        metadata: null,
        readAt: new Date("2026-07-03T13:05:00.000Z"),
        createdAt: new Date("2026-07-03T13:00:00.000Z"),
        updatedAt: new Date("2026-07-03T13:05:00.000Z"),
        actor: { firstName: "Nora", lastName: "Test", email: "nora@test.com" },
        surgery: { patient: { firstName: "Ana", lastName: "Paciente", legalName: null } },
      })

    const update = vi.fn().mockResolvedValue({
      id: "notif-1",
      companyId: "co-1",
      recipientUserId: "user-2",
      actorUserId: "user-1",
      surgeryId: "sx-1",
      sourceEntityId: "seg-1",
      type: "seguimiento_mention",
      title: "Nora Test te mencionó en Seguimiento",
      body: "Coordinar con @Ana",
      metadata: null,
      readAt: new Date("2026-07-03T13:05:00.000Z"),
      createdAt: new Date("2026-07-03T13:00:00.000Z"),
      updatedAt: new Date("2026-07-03T13:05:00.000Z"),
      actor: { firstName: "Nora", lastName: "Test", email: "nora@test.com" },
      surgery: { patient: { firstName: "Ana", lastName: "Paciente", legalName: null } },
    })

    const prisma = {
      internalNotification: {
        findFirst,
        update,
        count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
      },
    } as unknown as Prisma.TransactionClient

    const first = await markInternalNotificationRead(prisma, {
      companyId: "co-1",
      recipientUserId: "user-2",
      notificationId: "notif-1",
    })
    const second = await markInternalNotificationRead(prisma, {
      companyId: "co-1",
      recipientUserId: "user-2",
      notificationId: "notif-1",
    })
    const count = await getUnreadInternalNotificationsCount(prisma, "co-1", "user-2")

    expect(first.readAt).not.toBeNull()
    expect(first.patientName).toBe("Ana Paciente")
    expect(second.readAt).not.toBeNull()
    expect(second.patientName).toBe("Ana Paciente")
    expect(update).toHaveBeenCalledTimes(1)
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ surgery: expect.any(Object) }),
    }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ surgery: expect.any(Object) }),
    }))
    expect(count).toEqual({ all: 2, mention: 1, operational: 1 })
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

  it("classifies operational counts by metadata instead of notification type", async () => {
    const count = vi
      .fn()
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)

    const prisma = {
      internalNotification: {
        count,
      },
    } as unknown as Prisma.TransactionClient

    const result = await getUnreadInternalNotificationsCount(prisma, "co-1", "user-2")

    expect(result).toEqual({ all: 4, mention: 2, operational: 2 })
    expect(count).toHaveBeenNthCalledWith(2, {
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({ companyId: "co-1", recipientUserId: "user-2", readAt: null }),
          expect.objectContaining({
            OR: expect.arrayContaining([
              { metadata: { path: ["channel"], equals: "operational" } },
              { metadata: { path: ["eventType"], equals: "coordinator_assigned" } },
            ]),
          }),
        ]),
      }),
    })
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

  it("emits coordinator assignment notification to the uniquely matched coordinator", async () => {
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
            user: { firstName: "Nelson", lastName: "Ricardo", email: "nelson@test.com" },
          },
        ]),
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
            eventKey: "operational:coordinator_assigned:evt-1:user-coord-1",
            title: "Nora Admin te asignó una cirugía",
          }),
        ],
      })
    )
  })

  it("emits date request notification to the uniquely matched coordinator", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 })
    const prisma = {
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ firstName: "Nora", lastName: "Admin", email: "nora@test.com" }),
      },
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([{ userId: "user-coord-1", user: { firstName: "Nelson", lastName: "Ricardo", email: "nelson@test.com" } }]),
      },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    const result = await emitOperationalInternalNotifications(prisma, {
      companyId: "co-1",
      surgeryId: "sx-1",
      sourceEntityId: "seg-date-request-1",
      actorUserId: "user-1",
      eventType: "surgery_date_requested",
      coordinatorName: "Nelson",
    })

    expect(result).toEqual({ createdCount: 1, attemptedCount: 1 })
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({
        recipientUserId: "user-coord-1",
        eventKey: "operational:surgery_date_requested:seg-date-request-1:user-coord-1",
        title: "Nora Admin solicitó definir fecha de cirugía",
      })],
    }))
  })

  it("emits surgery rescheduled notifications to admin recipients", async () => {
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
          { userId: "admin-1" },
          { userId: "admin-2" },
        ]),
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
            body: "Caso sx-1 · Nueva fecha 10/07/2026 · 08:30 · Antes 08/07/2026 · 07:00",
          }),
        ]),
      })
    )
  })

  it("short-circuits operational notifications when no recipient is resolved", async () => {
    const prisma = {
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          firstName: "Nora",
          lastName: "Admin",
          email: "nora@test.com",
        }),
      },
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      internalNotification: {
        createMany: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient

    const result = await emitOperationalInternalNotifications(prisma, {
      companyId: "co-1",
      surgeryId: "sx-1",
      sourceEntityId: "evt-1",
      actorUserId: "user-1",
      eventType: "surgery_rescheduled",
      scheduledDate: "2026-07-10",
      scheduledTime: "08:30",
      previousScheduledDate: "2026-07-08",
      previousScheduledTime: "07:00",
    })

    expect(result).toEqual({ createdCount: 0, attemptedCount: 0 })
    expect(prisma.internalNotification.createMany).not.toHaveBeenCalled()
  })

  it("emits one deterministic actionable availability row per distinct recipient", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 })
    const tx = {
      availabilityRequestRecipientAssignment: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "creator-1", reason: "CREATOR" },
          { userId: "creator-1", reason: "PIVOT" },
          { userId: "pivot-1", reason: "PIVOT" },
        ]),
      },
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
        type: "availability_request_actionable",
        eventKey: "availability:request:request-1:actionable:creator-1",
        metadata: expect.objectContaining({
          eventType: "availability_request_actionable",
          availabilityRequestId: "request-1",
          recipientReasons: ["creator", "pivot"],
          actionable: true,
        }),
      }),
      expect.objectContaining({ recipientUserId: "pivot-1" }),
    ]))
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }))
    expect(data[0].metadata).not.toHaveProperty("actorUserId")
    expect(data[0].metadata).not.toHaveProperty("companyId")
    expect(tx).not.toHaveProperty("$transaction")
  })

  it("fails closed instead of delivering to a user without an active request assignment", async () => {
    const createMany = vi.fn()
    const tx = {
      availabilityRequestRecipientAssignment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    await expect(emitAvailabilityActionableNotifications({
      tx,
      companyId: "co-1",
      surgeryId: "sx-1",
      requestId: "request-1",
      actorUserId: "requester-1",
      correlationId: "correlation-1",
      recipientUserIds: ["forged-recipient"],
      requesterDisplayName: "Nora Test",
      surgeryVisibleNumber: "CX-0042",
    })).rejects.toMatchObject({
      status: 409,
      code: "availability_notification_recipient_invariant",
    })
    expect(createMany).not.toHaveBeenCalled()
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

  it("upserts one canonical actionable delivery when a creator is promoted to PÍVOT", async () => {
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
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        companyId_eventKey: {
          companyId: "co-1",
          eventKey: "availability:request:request-1:actionable:pivot-new",
        },
      },
      create: expect.objectContaining({
        recipientUserId: "pivot-new",
        type: "availability_request_actionable",
        metadata: expect.objectContaining({
          actionable: true,
          recipientReasons: ["pivot", "creator"],
        }),
      }),
      update: expect.objectContaining({
        recipientUserId: "pivot-new",
        type: "availability_request_actionable",
        metadata: expect.objectContaining({
          actionable: true,
          recipientReasons: ["pivot", "creator"],
        }),
      }),
    }))
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        companyId_eventKey: {
          companyId: "co-1",
          eventKey: "availability:request:request-2:actionable:pivot-new",
        },
      },
      create: expect.objectContaining({
        recipientUserId: "pivot-new",
        metadata: expect.objectContaining({ recipientReasons: ["pivot"] }),
      }),
    }))
    expect(upsert.mock.calls).not.toEqual(expect.arrayContaining([
      [expect.objectContaining({
        create: expect.objectContaining({ recipientUserId: "pivot-old" }),
      })],
    ]))

    const revokedRows = createMany.mock.calls[0][0].data
    expect(revokedRows).toHaveLength(2)
    expect(revokedRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        recipientUserId: "pivot-old",
        eventKey: "availability:request:request-1:pivot-revoked:pivot-old:transfer-1",
        metadata: expect.objectContaining({
          eventType: "availability_pivot_revoked",
          actionable: false,
        }),
      }),
    ]))
    expect(revokedRows).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ recipientUserId: "pivot-new" }),
    ]))
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }))
  })
})
