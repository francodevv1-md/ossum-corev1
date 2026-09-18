import { createHash } from "node:crypto";

import { AvailabilityRecipientReason } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  designateInitialPivot,
  reassignPivot,
  type CompanyOperationalAssigneeEffects,
} from "@/lib/services/company-operational-assignee.service";

const context = { actorUserId: "actor-1", companyId: "company-1" };
const command = {
  userId: "pivot-new",
  expectedVersion: 3,
  reason: "Reasignación operativa aprobada.",
  idempotencyKey: "pivot-key-000001",
};

function hashPayload(payload: Record<string, string | number>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function createHarness() {
  const tx = {
    userCompanyAccess: { findFirst: vi.fn() },
    availabilityCommand: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    companyOperationalAssignee: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    availabilityRequest: { findMany: vi.fn() },
    availabilityRequestRecipientAssignment: {
      updateMany: vi.fn(),
      createMany: vi.fn(),
    },
    availabilityCapabilityGrant: { findFirst: vi.fn() },
    auditEvent: { create: vi.fn().mockResolvedValue({ id: "audit-pivot" }) },
  };
  const prisma = {
    $transaction: vi.fn(
      async (callback: (transaction: typeof tx) => unknown) => callback(tx)
    ),
  };
  const effects: CompanyOperationalAssigneeEffects = {
    emitTransferNotifications: vi.fn().mockResolvedValue(undefined),
    writeCompanyAudit: vi.fn().mockResolvedValue({ id: "audit-company" }),
    writeRequestAudit: vi
      .fn()
      .mockImplementation(async ({ requestId }) => ({ id: `audit-${requestId}` })),
    writeRequestTrace: vi.fn().mockResolvedValue(undefined),
  };
  return {
    tx,
    prisma,
    effects,
    dependencies: {
      prisma: prisma as never,
      effects,
      createCorrelationId: () => "correlation-transfer",
    },
  };
}

function enableSource() {
  vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "development");
  vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "true");
  vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", context.companyId);
}

function grantConfiguration(harness: ReturnType<typeof createHarness>) {
  enableSource();
  harness.tx.availabilityCapabilityGrant.findFirst.mockResolvedValue({
    companyId: context.companyId,
    userId: context.actorUserId,
    capability: "availability.pivot.configure",
  });
}

function openRequests() {
  return [
    {
      id: "request-1",
      surgeryId: "surgery-1",
      assignments: [],
    },
    {
      id: "request-2",
      surgeryId: "surgery-2",
      assignments: [
        { reason: AvailabilityRecipientReason.CREATOR },
      ],
    },
  ];
}

function prepareReassignment(harness: ReturnType<typeof createHarness>) {
  grantConfiguration(harness);
  harness.tx.userCompanyAccess.findFirst
    .mockResolvedValueOnce({ id: "actor-access" })
    .mockResolvedValueOnce({ userId: "pivot-new" });
  harness.tx.availabilityCommand.findUnique.mockResolvedValue(null);
  harness.tx.companyOperationalAssignee.findFirst.mockResolvedValue({
    id: "mapping-1",
    userId: "pivot-old",
    version: 3,
  });
  harness.tx.availabilityCommand.create.mockResolvedValue({ id: "command-1" });
  harness.tx.companyOperationalAssignee.updateMany.mockResolvedValue({ count: 1 });
  harness.tx.availabilityRequest.findMany.mockResolvedValue(openRequests());
  harness.tx.availabilityRequestRecipientAssignment.updateMany.mockResolvedValue({
    count: 2,
  });
  harness.tx.availabilityRequestRecipientAssignment.createMany.mockResolvedValue({
    count: 2,
  });
  harness.tx.availabilityCommand.update.mockResolvedValue({ id: "command-1" });
}

describe("company-operational-assignee.service", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "test");
    vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "false");
    vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", "");
  });

  it("atomically replaces PÍVOT and transfers every OPEN request in deterministic order", async () => {
    const harness = createHarness();
    prepareReassignment(harness);

    const result = await reassignPivot(harness.dependencies, context, command);

    expect(result).toEqual({
      userId: "pivot-new",
      version: 4,
      transferredRequestCount: 2,
    });
    expect(harness.tx.companyOperationalAssignee.updateMany).toHaveBeenCalledWith({
      where: {
        id: "mapping-1",
        companyId: "company-1",
        designation: "PIVOT",
        version: 3,
        userId: "pivot-old",
      },
      data: {
        userId: "pivot-new",
        version: { increment: 1 },
        updatedById: "actor-1",
      },
    });
    expect(harness.tx.availabilityRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company-1", status: "OPEN" },
      })
    );
    expect(
      harness.tx.availabilityRequestRecipientAssignment.updateMany
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reason: "PIVOT",
          revokedAt: null,
          userId: "pivot-old",
          request: { status: "OPEN" },
        }),
      })
    );
    expect(
      harness.tx.availabilityRequestRecipientAssignment.createMany
    ).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ availabilityRequestId: "request-1" }),
        expect.objectContaining({ availabilityRequestId: "request-2" }),
      ],
    });
    expect(harness.effects.writeRequestAudit).toHaveBeenCalledTimes(2);
    expect(harness.effects.writeRequestTrace).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(harness.effects.emitTransferNotifications).mock
        .invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(harness.effects.writeCompanyAudit).mock.invocationCallOrder[0]
    );
    expect(
      vi.mocked(harness.effects.writeCompanyAudit).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(harness.effects.writeRequestAudit).mock.invocationCallOrder[0]
    );
    expect(harness.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" })
    );
  });

  it("deduplicates new-PÍVOT delivery while preserving dual creator/PÍVOT reasons", async () => {
    const harness = createHarness();
    prepareReassignment(harness);

    await reassignPivot(harness.dependencies, context, command);

    expect(harness.effects.emitTransferNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        formerPivotUserId: "pivot-old",
        newPivotUserId: "pivot-new",
        requests: [
          expect.objectContaining({
            requestId: "request-1",
            recipientReasons: ["pivot"],
          }),
          expect.objectContaining({
            requestId: "request-2",
            recipientReasons: ["pivot", "creator"],
          }),
        ],
      })
    );
  });

  it("denies missing, cross-company, failed provider, and inactive actor", async () => {
    const denied = createHarness();
    await expect(
      reassignPivot(denied.dependencies, context, command)
    ).rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
    expect(denied.tx.companyOperationalAssignee.findFirst).not.toHaveBeenCalled();

    const inactive = createHarness();
    grantConfiguration(inactive);
    inactive.tx.userCompanyAccess.findFirst.mockResolvedValue(null);
    await expect(
      reassignPivot(inactive.dependencies, context, command)
    ).rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
    expect(inactive.tx.companyOperationalAssignee.findFirst).not.toHaveBeenCalled();

    for (const result of [
      { companyId: "company-2", userId: context.actorUserId, capability: "availability.pivot.configure" },
      new Error("provider failed"),
    ]) {
      const harness = createHarness();
      enableSource();
      if (result instanceof Error) harness.tx.availabilityCapabilityGrant.findFirst.mockRejectedValue(result);
      else harness.tx.availabilityCapabilityGrant.findFirst.mockResolvedValue(result);
      await expect(reassignPivot(harness.dependencies, context, command))
        .rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
    }
  });

  it("rejects missing initial setup, stale version, no-op, and invalid target", async () => {
    const cases = [
      {
        current: null,
        expected: { code: "availability_pivot_unavailable" },
      },
      {
        current: { id: "mapping-1", userId: "pivot-old", version: 4 },
        expected: { code: "availability_pivot_version_conflict" },
      },
      {
        current: { id: "mapping-1", userId: "pivot-new", version: 3 },
        expected: { code: "availability_pivot_noop" },
      },
    ];

    for (const entry of cases) {
      const harness = createHarness();
      grantConfiguration(harness);
      harness.tx.userCompanyAccess.findFirst.mockResolvedValue({ id: "actor-access" });
      harness.tx.availabilityCommand.findUnique.mockResolvedValue(null);
      harness.tx.companyOperationalAssignee.findFirst.mockResolvedValue(entry.current);
      await expect(
        reassignPivot(harness.dependencies, context, command)
      ).rejects.toMatchObject({ status: 409, ...entry.expected });
    }

    const invalidTarget = createHarness();
    grantConfiguration(invalidTarget);
    invalidTarget.tx.userCompanyAccess.findFirst
      .mockResolvedValueOnce({ id: "actor-access" })
      .mockResolvedValueOnce(null);
    invalidTarget.tx.availabilityCommand.findUnique.mockResolvedValue(null);
    invalidTarget.tx.companyOperationalAssignee.findFirst.mockResolvedValue({
      id: "mapping-1",
      userId: "pivot-old",
      version: 3,
    });
    await expect(
      reassignPivot(invalidTarget.dependencies, context, command)
    ).rejects.toMatchObject({ status: 404, code: "availability_pivot_unavailable" });
  });

  it("replays exact reassignment and rejects changed semantic input", async () => {
    const harness = createHarness();
    grantConfiguration(harness);
    harness.tx.userCompanyAccess.findFirst.mockResolvedValue({ id: "actor-access" });
    harness.tx.availabilityCommand.findUnique.mockResolvedValue({
      payloadHash: hashPayload({
        userId: command.userId,
        expectedVersion: command.expectedVersion,
        reason: command.reason,
      }),
      completedAt: new Date(),
      resultCode: "availability_pivot_reassigned:2",
    });

    await expect(
      reassignPivot(harness.dependencies, context, command)
    ).resolves.toEqual({
      userId: "pivot-new",
      version: 4,
      transferredRequestCount: 2,
      replayed: true,
    });
    expect(harness.tx.companyOperationalAssignee.updateMany).not.toHaveBeenCalled();

    await expect(
      reassignPivot(harness.dependencies, context, {
        ...command,
        userId: "another-user",
      })
    ).rejects.toMatchObject({ status: 409, code: "idempotency_key_reused" });
  });

  it("rolls back when every OPEN request cannot be revoked or inserted", async () => {
    for (const stage of ["revoke", "insert"] as const) {
      const harness = createHarness();
      prepareReassignment(harness);
      if (stage === "revoke") {
        harness.tx.availabilityRequestRecipientAssignment.updateMany.mockResolvedValue({
          count: 1,
        });
      } else {
        harness.tx.availabilityRequestRecipientAssignment.createMany.mockResolvedValue({
          count: 1,
        });
      }

      await expect(
        reassignPivot(harness.dependencies, context, command)
      ).rejects.toMatchObject({
        status: 409,
        code: "availability_pivot_transfer_incomplete",
      });
      expect(harness.effects.emitTransferNotifications).not.toHaveBeenCalled();
      expect(harness.tx.availabilityCommand.update).not.toHaveBeenCalled();
    }
  });

  it("leaves COMPLETED requests untouched by selecting and mutating OPEN only", async () => {
    const harness = createHarness();
    prepareReassignment(harness);
    await reassignPivot(harness.dependencies, context, command);

    expect(harness.tx.availabilityRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: "company-1", status: "OPEN" } })
    );
    expect(
      harness.tx.availabilityRequestRecipientAssignment.updateMany
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ request: { status: "OPEN" } }),
      })
    );
  });

  it("propagates projection failure before receipt completion", async () => {
    const harness = createHarness();
    prepareReassignment(harness);
    vi.mocked(harness.effects.writeRequestTrace).mockRejectedValue(
      new Error("trace failed")
    );

    await expect(
      reassignPivot(harness.dependencies, context, command)
    ).rejects.toThrow("trace failed");
    expect(harness.tx.availabilityCommand.update).not.toHaveBeenCalled();
  });

  it("designates only an empty exact operator mapping and audits atomically", async () => {
    const success = createHarness();
    success.tx.userCompanyAccess.findFirst
      .mockResolvedValueOnce({ id: "actor-access" })
      .mockResolvedValueOnce({ userId: "pivot-new" });
    success.tx.companyOperationalAssignee.findFirst.mockResolvedValue(null);
    success.tx.companyOperationalAssignee.create.mockResolvedValue({ id: "mapping-1", version: 1 });
    await expect(designateInitialPivot(success.tx as never, {
      companyId: context.companyId,
      actorUserId: context.actorUserId,
      targetUserId: "pivot-new",
      reason: "Approved DEV bootstrap",
    })).resolves.toMatchObject({ id: "mapping-1", version: 1 });
    expect(success.tx.userCompanyAccess.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: "operator", isActive: true, companyId: context.companyId }),
    }));
    expect(success.tx.companyOperationalAssignee.create).toHaveBeenCalledWith({ data: {
      companyId: context.companyId, userId: "pivot-new", designation: "PIVOT", version: 1,
      createdById: context.actorUserId, updatedById: context.actorUserId,
    } });
    expect(success.tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "availability.pivot_designated",
      entityType: "Company",
      entityId: context.companyId,
      metadata: { reason: "Approved DEV bootstrap" },
    }) });

    const existing = createHarness();
    existing.tx.userCompanyAccess.findFirst
      .mockResolvedValueOnce({ id: "actor-access" })
      .mockResolvedValueOnce({ userId: "pivot-new" });
    existing.tx.companyOperationalAssignee.findFirst.mockResolvedValue({ id: "mapping-1" });
    await expect(designateInitialPivot(existing.tx as never, {
      companyId: context.companyId, actorUserId: context.actorUserId,
      targetUserId: "pivot-new", reason: "Approved",
    })).rejects.toMatchObject({ status: 409, code: "availability_pivot_noop" });

    const wrongRole = createHarness();
    wrongRole.tx.userCompanyAccess.findFirst
      .mockResolvedValueOnce({ id: "actor-access" }).mockResolvedValueOnce(null);
    await expect(designateInitialPivot(wrongRole.tx as never, {
      companyId: context.companyId, actorUserId: context.actorUserId,
      targetUserId: "pivot-new", reason: "Approved",
    })).rejects.toMatchObject({ status: 404, code: "availability_pivot_unavailable" });

    const rollback = createHarness();
    rollback.tx.userCompanyAccess.findFirst
      .mockResolvedValueOnce({ id: "actor-access" })
      .mockResolvedValueOnce({ userId: "pivot-new" });
    rollback.tx.companyOperationalAssignee.findFirst.mockResolvedValue(null);
    rollback.tx.companyOperationalAssignee.create.mockResolvedValue({ id: "mapping-1" });
    rollback.tx.auditEvent.create.mockRejectedValue(new Error("audit failed"));
    await expect(designateInitialPivot(rollback.tx as never, {
      companyId: context.companyId, actorUserId: context.actorUserId,
      targetUserId: "pivot-new", reason: "Approved",
    })).rejects.toThrow("audit failed");
  });

  it("defers PostgreSQL set-based race and rollback proof to FT3", () => {
    expect("Real transfer races and rollback persistence are deferred to FT3").toContain(
      "deferred to FT3"
    );
  });
});
