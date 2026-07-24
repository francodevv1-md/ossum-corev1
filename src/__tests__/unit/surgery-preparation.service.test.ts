import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAuditEvent } = vi.hoisted(() => ({ createAuditEvent: vi.fn() }));
vi.mock("@/lib/audit", () => ({ createAuditEvent }));

import { updateSurgeryPrepStatus } from "@/lib/services/surgery.service";

const companyId = "company-1";
const actorUserId = "user-1";
const surgeryId = "surgery-1";

function surgery(prepStatus: string | null = null) {
  return { id: surgeryId, companyId, cxStatus: "scheduled", prepStatus, archivedAt: null };
}

function prismaFor(current = surgery()) {
  const tx = {
    surgery: {
      findFirst: vi.fn().mockResolvedValueOnce(current).mockResolvedValueOnce({ ...current, prepStatus: "preparing" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return {
    userCompanyAccess: { findFirst: vi.fn().mockResolvedValue({ id: "access-1" }) },
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    tx,
  };
}

describe("updateSurgeryPrepStatus", () => {
  beforeEach(() => {
    createAuditEvent.mockReset();
    createAuditEvent.mockResolvedValue(undefined);
  });

  it("updates exactly prepStatus, preserves cxStatus, and emits only the prep audit", async () => {
    const prisma = prismaFor();

    await updateSurgeryPrepStatus(prisma as never, { companyId, actorUserId }, surgeryId, "preparing");

    expect(prisma.tx.surgery.updateMany).toHaveBeenCalledWith({
      where: { id: surgeryId, companyId, archivedAt: null },
      data: { prepStatus: "preparing" },
    });
    expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "surgery.prep_status_changed",
      oldValue: { prepStatus: null },
      newValue: { prepStatus: "preparing" },
    }));
  });

  it("rejects an unchanged or invalid preparation value without a write", async () => {
    const unchanged = prismaFor(surgery("preparing"));
    await expect(updateSurgeryPrepStatus(unchanged as never, { companyId, actorUserId }, surgeryId, "preparing"))
      .rejects.toMatchObject({ code: "prep_status_unchanged", status: 400 });
    expect(unchanged.tx.surgery.updateMany).not.toHaveBeenCalled();

    const invalid = prismaFor();
    await expect(updateSurgeryPrepStatus(invalid as never, { companyId, actorUserId }, surgeryId, "scheduled"))
      .rejects.toMatchObject({ code: "invalid_surgery_prep_status", status: 400 });
    expect(invalid.$transaction).not.toHaveBeenCalled();
  });
});
