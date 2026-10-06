import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { updateSurgery } from "@/lib/services/surgery.service";

const current = {
  id: "surgery-1",
  companyId: "company-1",
  branchId: null,
  visibleNumber: "CX-0001",
  patientId: "patient-1",
  doctorId: null,
  institutionId: null,
  payerContactId: null,
  classification: null,
  description: null,
  priority: "normal",
  cxStatus: "scheduled",
  prepStatus: null,
  probableDate: null,
  scheduledDate: null,
  surgeryDate: null,
  materialShippingDate: null,
  materialTransport: null,
  performedDate: null,
  cancelledDate: null,
  source: null,
  notes: null,
  archivedAt: null,
  archivedById: null,
  archiveReason: null,
  archivePolicySnapshot: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

describe("surgery management persistence", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-08-20T15:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it("writes shipping and transport in the audited surgery transaction", async () => {
    const updated = {
      ...current,
      materialShippingDate: new Date("2026-08-21T00:00:00.000Z"),
      materialTransport: "Logística Sur",
    };
    const tx = {
      surgery: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValueOnce(current).mockResolvedValueOnce(updated),
      },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
      userCompanyAccess: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ firstName: "Test", lastName: "Actor", email: "actor@example.test" }) },
      internalNotification: { createMany: vi.fn() },
    };
    const prisma = {
      userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "access-1" }) },
      surgery: { findFirst: vi.fn().mockResolvedValue(current) },
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as never;

    await updateSurgery(
      prisma,
      { companyId: "company-1", actorUserId: "user-1", source: "coordination-management" },
      "surgery-1",
      {
        materialShippingDate: new Date("2026-08-21T00:00:00.000Z"),
        materialTransport: "  Logística Sur  ",
      }
    );

    expect(tx.surgery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        materialShippingDate: new Date("2026-08-21T00:00:00.000Z"),
        materialTransport: "Logística Sur",
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "surgery.updated",
        oldValue: expect.objectContaining({ materialShippingDate: null, materialTransport: null }),
        newValue: expect.objectContaining({ materialShippingDate: "2026-08-21T00:00:00.000Z", materialTransport: "Logística Sur" }),
      }),
    }));
  });
});
