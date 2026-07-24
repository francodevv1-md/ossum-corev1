import { describe, expect, it, vi } from "vitest";

import { AVAILABILITY_CAPABILITIES } from "@/lib/permissions/availability-request";
import {
  grantAvailabilityCapability,
  revokeAvailabilityCapability,
} from "@/lib/services/availability-capability-grant.service";

const base = {
  companyId: "company-1",
  actorUserId: "actor-1",
  targetUserId: "target-1",
  capability: "availability.request.create" as const,
};

function harness() {
  const tx = {
    company: { findFirst: vi.fn().mockResolvedValue({ id: base.companyId }) },
    userCompanyAccess: {
      findMany: vi.fn().mockResolvedValue([
        { userId: base.actorUserId },
        { userId: base.targetUserId },
      ]),
    },
    availabilityCapabilityGrant: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: "grant-1", isActive: true, ...data })),
      update: vi.fn(),
    },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
  };
  return tx;
}

describe("availability-capability-grant.service", () => {
  it("creates and audits each exact capability for active same-company participants", async () => {
    for (const capability of AVAILABILITY_CAPABILITIES) {
      const tx = harness();
      await expect(grantAvailabilityCapability(tx as never, { ...base, capability })).resolves.toMatchObject({
        id: "grant-1",
        companyId: base.companyId,
        userId: base.targetUserId,
        capability,
        isActive: true,
      });
      expect(tx.userCompanyAccess.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          companyId: base.companyId,
          userId: { in: [base.actorUserId, base.targetUserId] },
          isActive: true,
          user: { isActive: true },
        }),
      }));
      expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
        companyId: base.companyId,
        userId: base.actorUserId,
        entityType: "AvailabilityCapabilityGrant",
        entityId: "grant-1",
        action: "availability.capability_granted",
        module: "availability",
        oldValue: undefined,
        newValue: { isActive: true },
        metadata: { capability, targetUserId: base.targetUserId },
      }) });
    }
  });

  it("reactivates the exact row, clears revoke fields, and audits old state", async () => {
    const tx = harness();
    tx.availabilityCapabilityGrant.findUnique.mockResolvedValue({ id: "grant-1", isActive: false });
    tx.availabilityCapabilityGrant.update.mockResolvedValue({ id: "grant-1", isActive: true });
    await grantAvailabilityCapability(tx as never, base);
    expect(tx.availabilityCapabilityGrant.update).toHaveBeenCalledWith({
      where: { id: "grant-1" },
      data: expect.objectContaining({
        isActive: true,
        grantedById: base.actorUserId,
        revokedById: null,
        revokedAt: null,
        revokeReason: null,
      }),
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ oldValue: { isActive: false } }),
    });
  });

  it("revokes one active exact row with trimmed reason and same-transaction audit", async () => {
    const tx = harness();
    tx.availabilityCapabilityGrant.findUnique.mockResolvedValue({ id: "grant-1", isActive: true });
    tx.availabilityCapabilityGrant.update.mockImplementation(async ({ data }) => ({ id: "grant-1", ...data }));
    await revokeAvailabilityCapability(tx as never, { ...base, reason: "  Approved removal  " });
    expect(tx.availabilityCapabilityGrant.update).toHaveBeenCalledWith({
      where: { id: "grant-1" },
      data: expect.objectContaining({
        isActive: false,
        revokedById: base.actorUserId,
        revokedAt: expect.any(Date),
        revokeReason: "Approved removal",
      }),
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "availability.capability_revoked",
      oldValue: { isActive: true },
      newValue: { isActive: false },
    }) });
  });

  it("rejects grant/revoke no-ops without writes", async () => {
    const active = harness();
    active.availabilityCapabilityGrant.findUnique.mockResolvedValue({ id: "grant-1", isActive: true });
    await expect(grantAvailabilityCapability(active as never, base)).rejects.toMatchObject({
      status: 409,
      code: "availability_capability_noop",
    });
    const inactive = harness();
    inactive.availabilityCapabilityGrant.findUnique.mockResolvedValue({ id: "grant-1", isActive: false });
    await expect(
      revokeAvailabilityCapability(inactive as never, { ...base, reason: "Approved" })
    ).rejects.toMatchObject({ status: 409, code: "availability_capability_noop" });
    expect(active.auditEvent.create).not.toHaveBeenCalled();
    expect(inactive.auditEvent.create).not.toHaveBeenCalled();
  });

  it("denies malformed, foreign, or inactive participant state", async () => {
    const malformed = harness();
    await expect(
      grantAvailabilityCapability(malformed as never, { ...base, capability: "unknown" as never })
    ).rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
    await expect(
      revokeAvailabilityCapability(malformed as never, { ...base, reason: "   " })
    ).rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
    for (const configure of [
      (tx: ReturnType<typeof harness>) => tx.company.findFirst.mockResolvedValue(null),
      (tx: ReturnType<typeof harness>) => tx.userCompanyAccess.findMany.mockResolvedValue([{ userId: base.actorUserId }]),
    ]) {
      const tx = harness();
      configure(tx);
      await expect(grantAvailabilityCapability(tx as never, base)).rejects.toMatchObject({
        status: 403,
        code: "availability_forbidden",
      });
      expect(tx.availabilityCapabilityGrant.create).not.toHaveBeenCalled();
    }
  });

  it("propagates audit failure so the caller transaction can roll back", async () => {
    const tx = harness();
    tx.auditEvent.create.mockRejectedValue(new Error("audit failed"));
    await expect(grantAvailabilityCapability(tx as never, base)).rejects.toThrow("audit failed");
    expect(tx.availabilityCapabilityGrant.create).toHaveBeenCalledOnce();
  });
});
