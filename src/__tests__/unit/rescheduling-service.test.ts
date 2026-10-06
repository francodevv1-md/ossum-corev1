import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Prisma } from "@prisma/client"
import { updateSurgery } from "@/lib/services/surgery.service"
import { emitSurgeryReschedulingNotifications } from "@/lib/services/internal-notifications.service"

const context = { companyId: "company-1", actorUserId: "user-1" }
function fixture(previous: Record<string, unknown> = {}, count = 1, rollback = false, actorRole = "admin") {
  let current = { id: "cx-1", visibleNumber: "CX-0001", companyId: "company-1", cxStatus: "scheduled", createdAt: new Date("2026-08-01T00:00:00Z"), updatedAt: new Date("2026-08-01T00:00:00Z"), surgeryDate: null, surgeryTimeSpecified: null, materialShippingDate: null, ...previous }
  const members = [
    { userId: "admin-1", role: "admin", companyId: "company-1", isActive: true, user: { isActive: true } },
    { userId: "logistics-1", role: "logistics", companyId: "company-1", isActive: true, user: { isActive: true } },
  ]
  const policies: Array<{ role: string; inAppEnabled: boolean }> = []
  const preferences: Array<{ userId: string; inAppMuted: boolean }> = []
  let eventKeys = new Set<string>()
  let auditIds: string[] = []
  const tx = {
    surgery: {
      findFirst: vi.fn(async () => current),
      updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (count === 1) current = { ...current, ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) }
        return { count }
      }),
    },
    auditEvent: { create: vi.fn(async () => { const id = `audit-${auditIds.length + 1}`; auditIds.push(id); return { id } }) },
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ firstName: "Nora", lastName: "Actor", email: "nora@example.test" }) },
    userCompanyAccess: { findMany: vi.fn(async ({ where }: { where: { companyId: string; isActive: boolean; user: { isActive: boolean } } }) => members.filter((member) => member.companyId === where.companyId && member.isActive === where.isActive && member.user.isActive === where.user.isActive)) },
    notificationRolePolicy: { findMany: vi.fn(async () => policies) },
    notificationUserPreference: { findMany: vi.fn(async () => preferences) },
    internalNotification: { createMany: vi.fn(async ({ data }: { data: Array<{ eventKey: string }> }) => {
      const newKeys = data.filter((row) => !eventKeys.has(row.eventKey)).map((row) => row.eventKey)
      newKeys.forEach((key) => eventKeys.add(key))
      return { count: newKeys.length }
    }) },
  }
  const prisma = { userCompanyAccess: { findFirst: vi.fn(async ({ where }: { where: { userId: string; companyId: string; isActive: boolean; role: { in: string[] } } }) =>
    where.userId === context.actorUserId && where.companyId === context.companyId && where.isActive && where.role.in.includes(actorRole) ? { id: "access-1" } : null
  ) }, $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
    const snapshot = { current, eventKeys: new Set(eventKeys), auditIds: [...auditIds] }
    try { const result = await callback(tx); if (rollback) throw new Error("rollback"); return result }
    catch (error) { current = snapshot.current; eventKeys = snapshot.eventKeys; auditIds = snapshot.auditIds; throw error }
  }) }
  return { prisma: prisma as never, tx, members, policies, preferences, persisted: () => ({ current, eventKeys: [...eventKeys], auditIds }) }
}
describe("shared rescheduling validation and transactional in-app notifications (offline)", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-07T02:30:00Z")); vi.spyOn(console, "info").mockImplementation(() => {}) })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
  it.each(["surgeryDate", "materialShippingDate"] as const)("accepts today and future for %s", async (field) => {
    for (const day of ["2026-10-06", "2026-10-07"]) {
      const { prisma, tx } = fixture()
      const value = new Date(`${day}T${field === "surgeryDate" ? "03" : "00"}:00:00Z`)
      await updateSurgery(prisma, context, "cx-1", { [field]: value })
      expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ rescheduling: expect.objectContaining({ mode: "in_app", recipientRoles: ["admin", "logistics"] }) }) }) }))
      expect(tx.internalNotification.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true, data: [
        expect.objectContaining({ recipientUserId: "admin-1", sourceEntityId: "audit-1", eventKey: "rescheduling:audit-1:admin-1" }),
        expect.objectContaining({ recipientUserId: "logistics-1", sourceEntityId: "audit-1", eventKey: "rescheduling:audit-1:logistics-1" }),
      ] }))
      expect(console.info).not.toHaveBeenCalled()
    }
  })
  it.each(["surgeryDate", "materialShippingDate"] as const)("rejects changed past/invalid %s", async (field) => {
    for (const value of [new Date("2026-10-05T15:00:00Z"), new Date("invalid")]) {
      const { prisma, tx } = fixture()
      await expect(updateSurgery(prisma, context, "cx-1", { [field]: value })).rejects.toThrow()
      expect(tx.surgery.updateMany).not.toHaveBeenCalled()
      expect(console.info).not.toHaveBeenCalled()
    }
  })
  it("allows unchanged historical dates and unrelated edits without notifications", async () => {
    const surgeryDate = new Date("2026-01-01T03:00:00Z")
    const { prisma, tx } = fixture({ surgeryDate })
    await updateSurgery(prisma, context, "cx-1", { surgeryDate, notes: "Unrelated edit" })
    await updateSurgery(prisma, context, "cx-1", {})
    expect(tx.internalNotification.createMany).not.toHaveBeenCalled()
    expect(console.info).not.toHaveBeenCalled()
  })
  it.each([[0, false], [1, true]])("propagates conflict or rollback without committed effects %s %s", async (count, rollback) => {
    const { prisma, tx, persisted } = fixture({}, count, rollback)
    await expect(updateSurgery(prisma, context, "cx-1", { surgeryDate: new Date("2026-10-06T03:00:00Z") })).rejects.toThrow()
    expect(persisted()).toMatchObject({ current: { surgeryDate: null }, eventKeys: [], auditIds: [] })
    if (count === 0) expect(tx.internalNotification.createMany).not.toHaveBeenCalled()
    expect(console.info).not.toHaveBeenCalled()
  })

  it("persists combined changes with actor, case, audit source, encoded link and correct day/time semantics", async () => {
    const surgeryDate = new Date("2026-10-07T02:30:00Z")
    const shippingDate = new Date("2026-10-06T00:00:00Z")
    const { prisma, tx } = fixture({ surgeryDate, surgeryTimeSpecified: true, materialShippingDate: shippingDate })
    const nextDate = new Date("2026-10-08T03:00:00Z")
    const nextShipping = new Date("2026-10-08T00:00:00Z")
    await updateSurgery(prisma, context, "cx/1", { surgeryDate: nextDate, surgeryTimeSpecified: false, materialShippingDate: nextShipping })
    expect(tx.internalNotification.createMany).toHaveBeenCalledTimes(1)
    expect(tx.internalNotification.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: ["admin-1", "logistics-1"].map((recipientUserId) => expect.objectContaining({
      companyId: "company-1", recipientUserId, actorUserId: "user-1", surgeryId: "cx/1", sourceEntityId: "audit-1", linkHref: "/expediente?id=cx%2F1",
      title: "Nora Actor registró una reprogramación",
      body: "Caso CX-0001 · Fecha de cirugía: 06/10/2026, 23:30 → 08/10/2026 · Fecha de envío de material: 06/10/2026 → 08/10/2026",
      metadata: { channel: "operational", eventType: "surgery_rescheduled", sourceEntityType: "audit_event", actorUserId: "user-1", actorDisplayName: "Nora Actor", changes: [
        { dateType: "surgery", previousDate: surgeryDate.toISOString(), newDate: nextDate.toISOString() },
        { dateType: "shipping", previousDate: shippingDate.toISOString(), newDate: nextShipping.toISOString() },
      ] },
    })) }))
  })

  it.each([true, false, null])("does not invent surgery time when the persisted marker is %s", async (surgeryTimeSpecified) => {
    const { prisma, tx } = fixture()
    await updateSurgery(prisma, context, "cx-1", { surgeryDate: new Date("2026-10-08T03:00:00Z"), surgeryTimeSpecified })
    expect(tx.internalNotification.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([
      expect.objectContaining({ body: `Caso CX-0001 · Fecha de cirugía: Sin fecha → 08/10/2026${surgeryTimeSpecified === true ? ", 00:00" : ""}` }),
    ]) }))
  })

  it("notifies clearing a shipping date with its previous UTC day and no invented replacement", async () => {
    const { prisma, tx } = fixture({ materialShippingDate: new Date("2026-10-08T00:00:00Z") })
    await updateSurgery(prisma, context, "cx-1", { materialShippingDate: null })
    expect(tx.internalNotification.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([
      expect.objectContaining({ body: "Caso CX-0001 · Fecha de envío de material: 08/10/2026 → Sin fecha", metadata: expect.objectContaining({ changes: [
        { dateType: "shipping", previousDate: "2026-10-08T00:00:00.000Z", newDate: null },
      ] }) }),
    ]) }))
  })

  it("does not notify a time marker-only edit with no actual date change", async () => {
    const { prisma, tx } = fixture({ surgeryDate: new Date("2026-10-08T03:00:00Z"), surgeryTimeSpecified: null })
    await updateSurgery(prisma, context, "cx-1", { surgeryTimeSpecified: true })
    expect(tx.internalNotification.createMany).not.toHaveBeenCalled()
  })

  it("narrows active same-company recipients including aliases despite unrelated role-policy opt-ins", async () => {
    const { prisma, tx, members, policies, preferences } = fixture()
    for (const [userId, role] of [["admin-alias", "administracion"], ["depot", "deposito"], ["depot-accent", "Depósito"], ["log-accent", "Logística"], ["user-1", "admin"], ["muted", "admin"], ["coord", "coordinator"], ["billing", "billing"], ["viewer", "viewer"], ["unknown", "unknown"]]) {
      members.push({ userId, role, companyId: "company-1", isActive: true, user: { isActive: true } })
    }
    members.push({ userId: "foreign", role: "admin", companyId: "company-2", isActive: true, user: { isActive: true } },
      { userId: "inactive-access", role: "admin", companyId: "company-1", isActive: false, user: { isActive: true } },
      { userId: "inactive-user", role: "admin", companyId: "company-1", isActive: true, user: { isActive: false } })
    policies.push(...["coordinator", "billing", "viewer", "unknown"].map((role) => ({ role, inAppEnabled: true })))
    preferences.push({ userId: "muted", inAppMuted: true })
    await updateSurgery(prisma, context, "cx-1", { surgeryDate: new Date("2026-10-07T15:00:00Z") })
    expect(tx.userCompanyAccess.findMany).toHaveBeenCalledWith({ where: { companyId: "company-1", isActive: true, user: { isActive: true } }, select: { userId: true, role: true } })
    expect(tx.notificationRolePolicy.findMany).toHaveBeenCalledWith({ where: { companyId: "company-1", notificationType: "surgery_critical_change" } })
    expect(tx.notificationUserPreference.findMany).toHaveBeenCalledWith({ where: { companyId: "company-1", notificationType: "surgery_critical_change" } })
    expect(tx.internalNotification.createMany.mock.calls[0][0].data).toEqual(["admin-1", "logistics-1", "admin-alias", "depot", "depot-accent", "log-accent"].map((recipientUserId) => expect.objectContaining({ recipientUserId })))
  })

  it("honors canonical alias policy opt-outs and truthfully saves with no eligible recipients", async () => {
    const { prisma, tx, policies, persisted } = fixture()
    policies.push({ role: "Administracion", inAppEnabled: false }, { role: "Depósito", inAppEnabled: false })
    await updateSurgery(prisma, context, "cx-1", { materialShippingDate: new Date("2026-10-06T00:00:00Z") })
    expect(tx.internalNotification.createMany).not.toHaveBeenCalled()
    expect(persisted().auditIds).toEqual(["audit-1"])
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ rescheduling: { mode: "in_app", recipientRoles: ["admin", "logistics"], changes: expect.any(Array) } }) }) }))
  })

  it.each(["admin", "coordinator", "manager", "owner"])("uses the shared path for authorized actor %s and excludes that actor", async (role) => {
    const { prisma, tx, members } = fixture({}, 1, false, role)
    members.push({ userId: "user-1", role, companyId: "company-1", isActive: true, user: { isActive: true } })
    await updateSurgery(prisma, { ...context, source: "any-authorized-caller" }, "cx-1", { materialShippingDate: new Date("2026-10-06T00:00:00Z") })
    expect(tx.internalNotification.createMany.mock.calls[0][0].data).toHaveLength(2)
  })

  it("does not create on unchanged retry, uses distinct audit keys for later changes and deduplicates event replay", async () => {
    const { prisma, tx, persisted } = fixture()
    const surgeryDate = new Date("2026-10-07T15:00:00Z")
    await updateSurgery(prisma, context, "cx-1", { surgeryDate })
    await updateSurgery(prisma, context, "cx-1", { surgeryDate })
    expect(tx.internalNotification.createMany).toHaveBeenCalledTimes(1)
    await updateSurgery(prisma, context, "cx-1", { surgeryDate: new Date("2026-10-08T15:00:00Z") })
    expect(persisted().eventKeys).toEqual(["rescheduling:audit-1:admin-1", "rescheduling:audit-1:logistics-1", "rescheduling:audit-3:admin-1", "rescheduling:audit-3:logistics-1"])
    const result = await emitSurgeryReschedulingNotifications(tx as unknown as Prisma.TransactionClient, { ...context, surgeryId: "cx-1", sourceEntityId: "audit-3", changes: [{ dateType: "surgery", previousDate: surgeryDate.toISOString(), newDate: "2026-10-08T15:00:00.000Z" }] })
    expect(result).toEqual({ createdCount: 0, attemptedCount: 2 })
    expect(persisted().eventKeys).toHaveLength(4)
  })

  it.each(["persistence failure", "P2002 conflict", "P2034 conflict"])("propagates %s and rolls back surgery/audit without reporting success", async (message) => {
    const { prisma, tx, persisted } = fixture()
    const error = Object.assign(new Error(message), { code: message.split(" ")[0] })
    tx.internalNotification.createMany.mockRejectedValueOnce(error)
    await expect(updateSurgery(prisma, context, "cx-1", { surgeryDate: new Date("2026-10-07T15:00:00Z") })).rejects.toBe(error)
    expect(persisted()).toMatchObject({ current: { surgeryDate: null }, auditIds: [], eventKeys: [] })
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(1)
    expect(console.info).not.toHaveBeenCalled()
  })
})
