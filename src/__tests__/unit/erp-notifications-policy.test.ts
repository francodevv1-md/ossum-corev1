import { describe, expect, it, vi } from "vitest"
import { InternalNotificationType } from "@prisma/client"
import {
  emitCrossDomainNotification,
  normalizeRole,
  NOTIFICATION_TYPE_CATALOG,
} from "@/lib/services/internal-notifications.service"

describe("ERP Backend - Notificaciones Policy, Isolation and Security", () => {
  const companyA = "company-tenant-alpha"
  const companyB = "company-tenant-beta"
  const actorId = "user-actor-100"

  describe("Role Normalization and Catalog Validation", () => {
    it("normalizes roles and handles unknown/viewer roles safely", () => {
      expect(normalizeRole("admin")).toBe("admin")
      expect(normalizeRole("ADMINISTRADOR")).toBe("admin")
      expect(normalizeRole("coordinador")).toBe("coordinator")
      expect(normalizeRole("depósito")).toBe("logistics")
      expect(normalizeRole("facturacion")).toBe("billing")
      expect(normalizeRole("vendedor")).toBe("commercial")
      expect(normalizeRole("instrumentador")).toBe("technician")
      expect(normalizeRole("viewer")).toBe("viewer")
      expect(normalizeRole("unknown-role-xyz")).toBe("unknown-role-xyz")
      expect(normalizeRole("")).toBe("viewer")
      expect(normalizeRole(null)).toBe("viewer")
    })

    it("has valid catalog items with assigned domains and default roles", () => {
      const receiptType = NOTIFICATION_TYPE_CATALOG[InternalNotificationType.stock_receipt_confirmed]
      expect(receiptType).toBeDefined()
      expect(receiptType.domain).toBe("STOCK")
      expect(receiptType.defaultRoles).toContain("admin")
      expect(receiptType.defaultRoles).toContain("logistics")
      expect(receiptType.defaultRoles).not.toContain("viewer")
    })
  })

  describe("emitCrossDomainNotification security rules", () => {
    it("excludes the actor from receiving their own notification (actor self-exclusion)", async () => {
      const mockFindMembers = vi.fn().mockResolvedValue([
        { userId: actorId, role: "admin" },
        { userId: "user-target-1", role: "admin" },
      ])
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 1 })

      const mockPrisma: any = {
        userCompanyAccess: { findMany: mockFindMembers },
        notificationRolePolicy: { findMany: vi.fn().mockResolvedValue([]) },
        notificationUserPreference: { findMany: vi.fn().mockResolvedValue([]) },
        internalNotification: { createMany: mockCreateMany },
      }

      const result = await emitCrossDomainNotification(mockPrisma, {
        companyId: companyA,
        actorUserId: actorId,
        type: InternalNotificationType.surgery_critical_change,
        title: "Cirugía suspendida",
        sourceEntityId: "surg-1",
        explicitRecipientUserIds: [actorId, "user-target-1"],
      })

      expect(result.createdCount).toBe(1)
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            recipientUserId: "user-target-1",
            actorUserId: actorId,
            companyId: companyA,
          }),
        ],
        skipDuplicates: true,
      })
    })

    it("respects role policy override to deny delivery by default to disabled roles", async () => {
      const mockFindMembers = vi.fn().mockResolvedValue([
        { userId: "user-coord", role: "coordinator" },
        { userId: "user-admin", role: "admin" },
      ])
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 1 })

      // Policy explicitly disables coordinator for surgery_critical_change in companyA
      const mockPrisma: any = {
        userCompanyAccess: { findMany: mockFindMembers },
        notificationRolePolicy: {
          findMany: vi.fn().mockResolvedValue([
            { role: "coordinator", inAppEnabled: false },
            { role: "admin", inAppEnabled: true },
          ]),
        },
        notificationUserPreference: { findMany: vi.fn().mockResolvedValue([]) },
        internalNotification: { createMany: mockCreateMany },
      }

      const result = await emitCrossDomainNotification(mockPrisma, {
        companyId: companyA,
        actorUserId: actorId,
        type: InternalNotificationType.surgery_critical_change,
        title: "Alerta quirúrgica",
        sourceEntityId: "surg-1",
      })

      expect(result.createdCount).toBe(1)
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            recipientUserId: "user-admin",
          }),
        ],
        skipDuplicates: true,
      })
    })

    it("user personal preference can only mute/silence notifications, not bypass role ineligibility", async () => {
      const mockFindMembers = vi.fn().mockResolvedValue([
        { userId: "user-admin-1", role: "admin" },
        { userId: "user-admin-2", role: "admin" },
        { userId: "user-viewer", role: "viewer" },
      ])
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 1 })

      const mockPrisma: any = {
        userCompanyAccess: { findMany: mockFindMembers },
        notificationRolePolicy: { findMany: vi.fn().mockResolvedValue([]) },
        // user-admin-2 has muted this notification type
        // user-viewer tries to set inAppMuted: false (should NOT grant access since role is not in defaultRoles)
        notificationUserPreference: {
          findMany: vi.fn().mockResolvedValue([
            { userId: "user-admin-2", inAppMuted: true },
            { userId: "user-viewer", inAppMuted: false },
          ]),
        },
        internalNotification: { createMany: mockCreateMany },
      }

      const result = await emitCrossDomainNotification(mockPrisma, {
        companyId: companyA,
        actorUserId: actorId,
        type: InternalNotificationType.remito_prepared, // defaultRoles: admin, coordinator, logistics
        title: "Remito listo",
        sourceEntityId: "rem-1",
      })

      expect(result.createdCount).toBe(1)
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            recipientUserId: "user-admin-1",
          }),
        ],
        skipDuplicates: true,
      })
    })

    it("guarantees tenant isolation and eventKey deduplication", async () => {
      const mockFindMembers = vi.fn().mockResolvedValue([
        { userId: "user-logistics", role: "logistics" },
      ])
      const mockCreateMany = vi.fn().mockResolvedValue({ count: 1 })

      const mockPrisma: any = {
        userCompanyAccess: { findMany: mockFindMembers },
        notificationRolePolicy: { findMany: vi.fn().mockResolvedValue([]) },
        notificationUserPreference: { findMany: vi.fn().mockResolvedValue([]) },
        internalNotification: { createMany: mockCreateMany },
      }

      await emitCrossDomainNotification(mockPrisma, {
        companyId: companyB,
        actorUserId: actorId,
        type: InternalNotificationType.stock_receipt_confirmed,
        title: "Recepción de Stock",
        sourceEntityId: "rcp-999",
        eventKeyPrefix: "stock_receipt",
      })

      expect(mockFindMembers).toHaveBeenCalledWith({
        where: expect.objectContaining({
          companyId: companyB,
          isActive: true,
        }),
        select: {
          userId: true,
          role: true,
        },
      })

      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            companyId: companyB,
            recipientUserId: "user-logistics",
            eventKey: "stock_receipt:rcp-999:user-logistics",
            sourceEntityId: "rcp-999",
          }),
        ],
        skipDuplicates: true,
      })
    })
  })
})
