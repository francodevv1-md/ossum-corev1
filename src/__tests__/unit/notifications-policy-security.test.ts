import { describe, expect, it, vi } from "vitest"
import { InternalNotificationType, Prisma } from "@prisma/client"
import {
  emitCrossDomainNotification,
  updateUserNotificationPreference,
} from "@/lib/services/internal-notifications.service"

describe("notifications-policy-security", () => {
  it("destinatario explícito sin política habilitada → no recibe (deny-by-default)", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 0 })
    const prisma = {
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "user-explicit", role: "viewer" },
        ]),
      },
      notificationRolePolicy: {
        findMany: vi.fn().mockResolvedValue([
          { role: "viewer", inAppEnabled: false },
        ]),
      },
      notificationUserPreference: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    const result = await emitCrossDomainNotification(prisma, {
      companyId: "company-1",
      actorUserId: "actor-1",
      type: InternalNotificationType.surgery_authorized,
      sourceEntityId: "sx-123",
      title: "Cirugía autorizada",
      explicitRecipientUserIds: ["user-explicit"],
    })

    // Because 'viewer' has inAppEnabled: false for surgery_authorized, explicitRecipientUserIds CANNOT bypass policy
    expect(result.createdCount).toBe(0)
    expect(createMany).not.toHaveBeenCalled()
  })

  it("destinatario explícito de otra empresa → no recibe (requiere membresía activa en companyId)", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 0 })
    const prisma = {
      userCompanyAccess: {
        // user-other-company is NOT in company-1 active memberships
        findMany: vi.fn().mockResolvedValue([]),
      },
      notificationRolePolicy: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      notificationUserPreference: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    const result = await emitCrossDomainNotification(prisma, {
      companyId: "company-1",
      actorUserId: "actor-1",
      type: InternalNotificationType.surgery_authorized,
      sourceEntityId: "sx-123",
      title: "Cirugía autorizada",
      explicitRecipientUserIds: ["user-other-company"],
    })

    expect(result.createdCount).toBe(0)
    expect(createMany).not.toHaveBeenCalled()
  })

  it("usuario silenciado por preferencia personal → no recibe", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 0 })
    const prisma = {
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "user-coordinator", role: "coordinator" },
        ]),
      },
      notificationRolePolicy: {
        findMany: vi.fn().mockResolvedValue([
          { role: "coordinator", inAppEnabled: true },
        ]),
      },
      notificationUserPreference: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "user-coordinator", inAppMuted: true },
        ]),
      },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    const result = await emitCrossDomainNotification(prisma, {
      companyId: "company-1",
      actorUserId: "actor-1",
      type: InternalNotificationType.surgery_authorized,
      sourceEntityId: "sx-123",
      title: "Cirugía autorizada",
    })

    expect(result.createdCount).toBe(0)
    expect(createMany).not.toHaveBeenCalled()
  })

  it("preferencia sobre tipo no habilitado para el rol → rechazada con role_policy_disabled", async () => {
    const prisma = {
      notificationRolePolicy: {
        findUnique: vi.fn().mockResolvedValue({
          role: "viewer",
          notificationType: InternalNotificationType.remito_prepared,
          inAppEnabled: false,
        }),
      },
      notificationUserPreference: {
        upsert: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient

    await expect(
      updateUserNotificationPreference(prisma, {
        companyId: "company-1",
        userId: "user-viewer",
        userRole: "viewer",
        notificationType: InternalNotificationType.remito_prepared,
        inAppMuted: false,
      })
    ).rejects.toMatchObject({
      code: "role_policy_disabled",
      status: 400,
    })

    expect(prisma.notificationUserPreference.upsert).not.toHaveBeenCalled()
  })

  it("admin habilitado → recibe y puede configurar preferencias", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 })
    const prisma = {
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "user-admin", role: "admin" },
        ]),
      },
      notificationRolePolicy: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      notificationUserPreference: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({
          id: "pref-1",
          companyId: "company-1",
          userId: "user-admin",
          notificationType: InternalNotificationType.surgery_authorized,
          inAppMuted: true,
        }),
      },
      internalNotification: { createMany },
    } as unknown as Prisma.TransactionClient

    const result = await emitCrossDomainNotification(prisma, {
      companyId: "company-1",
      actorUserId: "actor-1",
      type: InternalNotificationType.surgery_authorized,
      sourceEntityId: "sx-123",
      title: "Cirugía autorizada",
    })

    expect(result.createdCount).toBe(1)
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            recipientUserId: "user-admin",
            actorUserId: "actor-1",
            type: InternalNotificationType.surgery_authorized,
          }),
        ],
      })
    )

    // Admin can also set preference
    const prefResult = await updateUserNotificationPreference(prisma, {
      companyId: "company-1",
      userId: "user-admin",
      userRole: "admin",
      notificationType: InternalNotificationType.surgery_authorized,
      inAppMuted: true,
    })
    expect(prefResult.inAppMuted).toBe(true)
  })

  it("deduplicación por mismo eventKey usa skipDuplicates", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 })
    const prisma = {
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "user-admin", role: "admin" },
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

    await emitCrossDomainNotification(prisma, {
      companyId: "company-1",
      actorUserId: "actor-1",
      type: InternalNotificationType.remito_prepared,
      eventKeyPrefix: "remito_custom_prefix",
      sourceEntityId: "remito-99",
      title: "Remito preparado",
    })

    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            eventKey: "remito_custom_prefix:remito-99:user-admin",
          }),
        ],
      })
    )
  })

  it("actor autoexcluido → el actor no recibe su propia notificación", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 0 })
    const prisma = {
      userCompanyAccess: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "actor-user", role: "admin" },
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

    const result = await emitCrossDomainNotification(prisma, {
      companyId: "company-1",
      actorUserId: "actor-user",
      type: InternalNotificationType.surgery_authorized,
      sourceEntityId: "sx-123",
      title: "Cirugía autorizada",
    })

    expect(result.createdCount).toBe(0)
    expect(createMany).not.toHaveBeenCalled()
  })
})
