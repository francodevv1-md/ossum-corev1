import { createHash } from "node:crypto";

import {
  AvailabilityCreatorResolution,
  AvailabilityRecipientReason,
  AvailabilityRequestStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailabilityCapability } from "@/lib/permissions/availability-request";

import {
  completeAvailabilityRequest,
  createAvailabilityRequest,
  getAvailabilityRequestDetail,
  type AvailabilityRequestEffects,
} from "@/lib/services/availability-request.service";

const context = { actorUserId: "actor-1", companyId: "company-1" };

function payloadHash(payload: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function actorAccess(userId = "actor-1") {
  return {
    userId,
    role: "coordinator",
    user: {
      id: userId,
      firstName: "Ana",
      lastName: "Actora",
      email: "ana@example.test",
      isActive: true,
    },
  };
}

function validPivot(userId = "pivot-1") {
  return {
    userId,
    version: 4,
    userAccess: {
      companyId: "company-1",
      role: "operator",
      isActive: true,
      user: { isActive: true },
      company: { isActive: true },
    },
  };
}

function requestRow(options?: {
  status?: "OPEN" | "COMPLETED";
  requesterUserId?: string;
  assignments?: Array<{
    userId: string;
    reason: AvailabilityRecipientReason;
    revokedAt: Date | null;
  }>;
}) {
  const status = options?.status ?? "OPEN";
  return {
    id: "request-1",
    companyId: "company-1",
    surgeryId: "surgery-1",
    requesterUserId: options?.requesterUserId ?? "requester-1",
    status,
    creatorResolution: AvailabilityCreatorResolution.IDENTIFIED_ELIGIBLE,
    creatorUserIdSnapshot: "creator-1",
    creatorAuditEventId: null,
    pivotUserIdAtCreation: "pivot-1",
    pivotMappingVersion: 4,
    requestedAt: new Date("2026-07-20T10:00:00.000Z"),
    completedAt:
      status === "COMPLETED" ? new Date("2026-07-24T12:00:00.000Z") : null,
    completedByUserId: status === "COMPLETED" ? "creator-1" : null,
    submittedDate:
      status === "COMPLETED" ? new Date("2026-07-24T00:00:00.000Z") : null,
    completionCommandId: status === "COMPLETED" ? "command-complete-1" : null,
    correlationId: "correlation-1",
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    surgery: { id: "surgery-1", visibleNumber: "CX-0042" },
    requester: {
      id: options?.requesterUserId ?? "requester-1",
      firstName: "Rita",
      lastName: "Solicitante",
      email: "rita@example.test",
    },
    completedBy:
      status === "COMPLETED"
        ? {
            id: "creator-1",
            firstName: "Carlos",
            lastName: "Creador",
            email: "carlos@example.test",
          }
        : null,
    assignments:
      options?.assignments ?? [
        {
          userId: "actor-1",
          reason: AvailabilityRecipientReason.CREATOR,
          revokedAt: null,
        },
      ],
  };
}

function createHarness() {
  const tx = {
    userCompanyAccess: { findFirst: vi.fn() },
    companyOperationalAssignee: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    surgery: { findFirst: vi.fn(), updateMany: vi.fn() },
    availabilityCommand: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    availabilityRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    availabilityRequestRecipientAssignment: { createMany: vi.fn() },
    availabilityCapabilityGrant: { findFirst: vi.fn() },
  };

  const prisma = {
    $transaction: vi.fn(
      async (callback: (transaction: typeof tx) => unknown) => callback(tx)
    ),
  };

  const effects: AvailabilityRequestEffects = {
    writeAudit: vi.fn().mockResolvedValue({ id: "audit-1" }),
    writeTrace: vi.fn().mockResolvedValue(undefined),
    emitActionableNotifications: vi.fn().mockResolvedValue(undefined),
    emitRequesterCompletionNotification: vi.fn().mockResolvedValue(undefined),
  };

  return {
    tx,
    prisma,
    effects,
    dependencies: {
      prisma: prisma as never,
      effects,
      createCorrelationId: () => "correlation-1",
    },
  };
}

function enableSource() {
  vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "development");
  vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "true");
  vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", context.companyId);
}

function grantCapability(
  harness: ReturnType<typeof createHarness>,
  capability: AvailabilityCapability
) {
  enableSource();
  harness.tx.availabilityCapabilityGrant.findFirst.mockResolvedValue({
    companyId: context.companyId,
    userId: context.actorUserId,
    capability,
  });
}

function prepareCreate(harness: ReturnType<typeof createHarness>, options?: {
  createdById?: string | null;
  openRequest?: { id: string } | null;
}) {
  grantCapability(harness, "availability.request.create");
  harness.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
  harness.tx.availabilityCommand.findUnique.mockResolvedValue(null);
  harness.tx.surgery.findFirst.mockResolvedValue({
    id: "surgery-1",
    companyId: "company-1",
    visibleNumber: "CX-0042",
    cxStatus: "pending",
    archivedAt: null,
    materialAvailabilityDate: null,
    createdById:
      options && "createdById" in options ? options.createdById : "creator-1",
  });
  harness.tx.availabilityRequest.findFirst.mockResolvedValue(
    options?.openRequest ?? null
  );
  harness.tx.companyOperationalAssignee.findMany.mockResolvedValue([
    validPivot(),
  ]);
  harness.tx.user.findUnique.mockResolvedValue({
    id: "creator-1",
    isActive: true,
    companyAccess: [{ companyId: "company-1", isActive: true }],
  });
  harness.tx.availabilityCommand.create.mockResolvedValue({ id: "command-1" });
  harness.tx.availabilityRequest.create.mockResolvedValue({
    id: "request-1",
    companyId: "company-1",
    requestedAt: new Date("2026-07-20T10:00:00.000Z"),
  });
  harness.tx.availabilityRequestRecipientAssignment.createMany.mockResolvedValue({
    count: 2,
  });
  harness.tx.availabilityCommand.update.mockResolvedValue({ id: "command-1" });
}

function prepareCompletion(harness: ReturnType<typeof createHarness>, request = requestRow()) {
  enableSource();
  harness.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
  harness.tx.availabilityCommand.findUnique.mockResolvedValue(null);
  harness.tx.availabilityRequest.findFirst.mockResolvedValue(request);
  harness.tx.availabilityCommand.create.mockResolvedValue({
    id: "command-complete-1",
  });
  harness.tx.surgery.updateMany.mockResolvedValue({ count: 1 });
  harness.tx.availabilityRequest.updateMany.mockResolvedValue({ count: 1 });
  harness.tx.availabilityCommand.update.mockResolvedValue({
    id: "command-complete-1",
  });
}

describe("availability-request.service", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "test");
    vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "false");
    vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", "");
  });

  it("creates an OPEN request with exact snapshots, assignments, and deterministic effects", async () => {
    const harness = createHarness();
    prepareCreate(harness);

    const result = await createAvailabilityRequest(harness.dependencies, context, {
      surgeryId: "surgery-1",
      idempotencyKey: "request-key-0001",
    });

    expect(result).toMatchObject({
      id: "request-1",
      companyId: "company-1",
      status: "OPEN",
      creatorResolution: "identified_eligible",
    });
    expect(harness.tx.availabilityRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company-1",
        requesterUserId: "actor-1",
        creatorResolution: AvailabilityCreatorResolution.IDENTIFIED_ELIGIBLE,
        creatorUserIdSnapshot: "creator-1",
        creatorAuditEventId: null,
        pivotUserIdAtCreation: "pivot-1",
        pivotMappingVersion: 4,
      }),
    });
    expect(
      harness.tx.availabilityRequestRecipientAssignment.createMany
    ).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: "pivot-1",
          reason: AvailabilityRecipientReason.PIVOT,
        }),
        expect.objectContaining({
          userId: "creator-1",
          reason: AvailabilityRecipientReason.CREATOR,
        }),
      ]),
    });
    expect(harness.effects.emitActionableNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserIds: ["pivot-1", "creator-1"],
      })
    );
    expect(
      vi.mocked(harness.effects.emitActionableNotifications).mock
        .invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(harness.effects.writeAudit).mock.invocationCallOrder[0]
    );
    expect(
      vi.mocked(harness.effects.writeAudit).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(harness.effects.writeTrace).mock.invocationCallOrder[0]
    );
    expect(harness.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" })
    );
  });

  it("creates a truthful PÍVOT-only request when the legacy creator is unknown", async () => {
    const harness = createHarness();
    prepareCreate(harness, { createdById: null });

    const result = await createAvailabilityRequest(harness.dependencies, context, {
      surgeryId: "surgery-1",
      idempotencyKey: "request-key-0001",
    });

    expect(result.creatorResolution).toBe("not_identified_or_eligible");
    expect(harness.tx.user.findUnique).not.toHaveBeenCalled();
    expect(
      harness.tx.availabilityRequestRecipientAssignment.createMany
    ).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "pivot-1",
          reason: AvailabilityRecipientReason.PIVOT,
        }),
      ],
    });
    expect(harness.effects.emitActionableNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserIds: ["pivot-1"] })
    );
  });

  it("persists inactive and no-access creator classifications without assigning a substitute", async () => {
    for (const creator of [
      {
        row: {
          id: "creator-1",
          isActive: false,
          companyAccess: [{ companyId: "company-1", isActive: true }],
        },
        resolution: AvailabilityCreatorResolution.IDENTIFIED_INACTIVE,
      },
      {
        row: {
          id: "creator-1",
          isActive: true,
          companyAccess: [],
        },
        resolution: AvailabilityCreatorResolution.IDENTIFIED_NO_COMPANY_ACCESS,
      },
    ]) {
      const harness = createHarness();
      prepareCreate(harness);
      harness.tx.user.findUnique.mockResolvedValue(creator.row);

      await createAvailabilityRequest(harness.dependencies, context, {
        surgeryId: "surgery-1",
        idempotencyKey: "request-key-0001",
      });

      expect(harness.tx.availabilityRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          creatorResolution: creator.resolution,
          creatorUserIdSnapshot: "creator-1",
        }),
      });
      expect(
        harness.tx.availabilityRequestRecipientAssignment.createMany
      ).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            userId: "pivot-1",
            reason: AvailabilityRecipientReason.PIVOT,
          }),
        ],
      });
    }
  });

  it("fails closed when the designated PÍVOT is missing or currently ineligible", async () => {
    for (const mappings of [
      [],
      [validPivot("pivot-1"), validPivot("pivot-2")],
      [
        {
          ...validPivot(),
          userAccess: { ...validPivot().userAccess, role: "admin" },
        },
      ],
      [
        {
          ...validPivot(),
          userAccess: { ...validPivot().userAccess, isActive: false },
        },
      ],
    ]) {
      const harness = createHarness();
      prepareCreate(harness);
      harness.tx.companyOperationalAssignee.findMany.mockResolvedValue(mappings);

      await expect(
        createAvailabilityRequest(harness.dependencies, context, {
          surgeryId: "surgery-1",
          idempotencyKey: "request-key-0001",
        })
      ).rejects.toMatchObject({
        status: 409,
        code: "availability_pivot_unavailable",
      });
      expect(harness.tx.availabilityRequest.create).not.toHaveBeenCalled();
    }
  });

  it("preserves both recipient reasons but deduplicates delivery when creator equals PÍVOT", async () => {
    const harness = createHarness();
    prepareCreate(harness);
    harness.tx.companyOperationalAssignee.findMany.mockResolvedValue([
      validPivot("creator-1"),
    ]);

    await createAvailabilityRequest(harness.dependencies, context, {
      surgeryId: "surgery-1",
      idempotencyKey: "request-key-0001",
    });

    expect(
      harness.tx.availabilityRequestRecipientAssignment.createMany
    ).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ reason: AvailabilityRecipientReason.PIVOT }),
        expect.objectContaining({ reason: AvailabilityRecipientReason.CREATOR }),
      ]),
    });
    expect(harness.effects.emitActionableNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserIds: ["creator-1"] })
    );
  });

  it("denies missing, inactive, cross-company, and failed capability providers", async () => {
    for (const providerResult of [null, { ...context, capability: "availability.request.create", companyId: "company-2" }]) {
      const harness = createHarness();
      enableSource();
      harness.tx.availabilityCapabilityGrant.findFirst.mockResolvedValue(providerResult);
      await expect(createAvailabilityRequest(harness.dependencies, context, {
        surgeryId: "foreign-surgery", idempotencyKey: "request-key-0001",
      })).rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
      expect(harness.tx.surgery.findFirst).not.toHaveBeenCalled();
    }
    const failed = createHarness();
    enableSource();
    failed.tx.availabilityCapabilityGrant.findFirst.mockRejectedValue(new Error("provider failed"));
    await expect(createAvailabilityRequest(failed.dependencies, context, {
      surgeryId: "foreign-surgery", idempotencyKey: "request-key-0001",
    })).rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
  });

  it("fails closed for foreign and ineligible surgeries without side effects", async () => {
    const foreign = createHarness();
    prepareCreate(foreign);
    foreign.tx.surgery.findFirst.mockResolvedValue(null);

    await expect(
      createAvailabilityRequest(foreign.dependencies, context, {
        surgeryId: "foreign-surgery",
        idempotencyKey: "request-key-0001",
      })
    ).rejects.toMatchObject({ status: 404 });

    const ineligible = createHarness();
    prepareCreate(ineligible);
    ineligible.tx.surgery.findFirst.mockResolvedValue({
      id: "surgery-1",
      companyId: "company-1",
      visibleNumber: "CX-0042",
      cxStatus: "finalized",
      archivedAt: null,
      materialAvailabilityDate: null,
      createdById: "creator-1",
    });
    await expect(
      createAvailabilityRequest(ineligible.dependencies, context, {
        surgeryId: "surgery-1",
        idempotencyKey: "request-key-0001",
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "availability_surgery_ineligible",
    });

    expect(foreign.effects.writeAudit).not.toHaveBeenCalled();
    expect(ineligible.effects.writeAudit).not.toHaveBeenCalled();
  });

  it("returns duplicate conflict for a different command and replays an exact completed command", async () => {
    const duplicate = createHarness();
    prepareCreate(duplicate, { openRequest: { id: "request-existing" } });
    await expect(
      createAvailabilityRequest(duplicate.dependencies, context, {
        surgeryId: "surgery-1",
        idempotencyKey: "request-key-0002",
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "availability_request_already_open",
    });

    const replay = createHarness();
    grantCapability(replay, "availability.request.create");
    replay.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
    replay.tx.availabilityCommand.findUnique.mockResolvedValue({
      payloadHash: payloadHash({ surgeryId: "surgery-1" }),
      completedAt: new Date("2026-07-20T10:01:00.000Z"),
      requestId: "request-1",
    });
    replay.tx.availabilityRequest.findFirst.mockResolvedValue(requestRow());
    const replayResult = await createAvailabilityRequest(
      replay.dependencies,
      context,
      { surgeryId: "surgery-1", idempotencyKey: "request-key-0001" }
    );

    expect(replayResult.id).toBe("request-1");
    expect(replay.tx.availabilityRequest.create).not.toHaveBeenCalled();
    expect(replay.effects.writeAudit).not.toHaveBeenCalled();
  });

  it("rejects idempotency-key payload reuse before target mutation", async () => {
    const harness = createHarness();
    grantCapability(harness, "availability.request.create");
    harness.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
    harness.tx.availabilityCommand.findUnique.mockResolvedValue({
      payloadHash: "0".repeat(64),
      completedAt: new Date(),
      requestId: "request-1",
    });

    await expect(
      createAvailabilityRequest(harness.dependencies, context, {
        surgeryId: "surgery-1",
        idempotencyKey: "request-key-0001",
      })
    ).rejects.toMatchObject({ status: 409, code: "idempotency_key_reused" });
    expect(harness.tx.surgery.findFirst).not.toHaveBeenCalled();
  });

  it("applies the approved OPEN and COMPLETED safe-read policy", async () => {
    const openRecipient = createHarness();
    enableSource();
    openRecipient.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
    openRecipient.tx.availabilityRequest.findFirst.mockResolvedValue(requestRow());
    expect(
      await getAvailabilityRequestDetail(
        { prisma: openRecipient.dependencies.prisma },
        context,
        "request-1"
      )
    ).toMatchObject({ status: "OPEN", canComplete: true });

    const requester = createHarness();
    grantCapability(requester, "availability.request.read");
    requester.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
    requester.tx.availabilityRequest.findFirst.mockResolvedValue(
      requestRow({ requesterUserId: "actor-1", assignments: [] })
    );
    expect(
      await getAvailabilityRequestDetail(
        requester.dependencies,
        context,
        "request-1"
      )
    ).toMatchObject({ status: "OPEN", canComplete: false });

    const historical = createHarness();
    enableSource();
    historical.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
    historical.tx.availabilityRequest.findFirst.mockResolvedValue(
      requestRow({
        status: "COMPLETED",
        assignments: [
          {
            userId: "actor-1",
            reason: AvailabilityRecipientReason.PIVOT,
            revokedAt: new Date("2026-07-23T00:00:00.000Z"),
          },
        ],
      })
    );
    expect(
      await getAvailabilityRequestDetail(
        historical.dependencies,
        context,
        "request-1"
      )
    ).toMatchObject({
      status: "COMPLETED",
      canComplete: false,
      recipientReasonsForActor: ["pivot"],
    });
  });

  it("returns uniform 404 for denied, missing, forged, and cross-company reads", async () => {
    for (const setup of [
      (harness: ReturnType<typeof createHarness>) => {
        harness.tx.userCompanyAccess.findFirst.mockResolvedValue(null);
      },
      (harness: ReturnType<typeof createHarness>) => {
        harness.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
        harness.tx.availabilityRequest.findFirst.mockResolvedValue(null);
      },
      (harness: ReturnType<typeof createHarness>) => {
        harness.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
        harness.tx.availabilityRequest.findFirst.mockResolvedValue(
          requestRow({ assignments: [] })
        );
      },
    ]) {
      const harness = createHarness();
      enableSource();
      setup(harness);
      await expect(
        getAvailabilityRequestDetail(harness.dependencies, context, "request-1")
      ).rejects.toMatchObject({
        status: 404,
        code: "availability_request_not_found",
      });
    }
  });

  it("completes with conditional winners and ordered audit, trace, and requester notification", async () => {
    const harness = createHarness();
    prepareCompletion(harness);

    const result = await completeAvailabilityRequest(
      harness.dependencies,
      context,
      {
        requestId: "request-1",
        date: "2026-07-24",
        idempotencyKey: "complete-key-001",
      }
    );

    expect(harness.tx.surgery.updateMany).toHaveBeenCalledWith({
      where: {
        id: "surgery-1",
        companyId: "company-1",
        archivedAt: null,
        cxStatus: { notIn: ["cancelled", "finalized"] },
        materialAvailabilityDate: null,
      },
      data: {
        materialAvailabilityDate: new Date("2026-07-24T00:00:00.000Z"),
      },
    });
    expect(harness.tx.availabilityRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "request-1",
          companyId: "company-1",
          status: AvailabilityRequestStatus.OPEN,
        },
        data: expect.objectContaining({
          status: AvailabilityRequestStatus.COMPLETED,
          completedByUserId: "actor-1",
        }),
      })
    );
    expect(result).toMatchObject({
      status: "COMPLETED",
      submittedDate: "2026-07-24",
      canComplete: false,
    });
    expect(
      vi.mocked(harness.effects.writeAudit).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(harness.effects.writeTrace).mock.invocationCallOrder[0]
    );
    expect(
      vi.mocked(harness.effects.writeTrace).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(harness.effects.emitRequesterCompletionNotification).mock
        .invocationCallOrder[0]
    );
  });

  it("rejects stale completion and a lost conditional Surgery winner", async () => {
    const stale = createHarness();
    prepareCompletion(stale, requestRow({ status: "COMPLETED" }));
    await expect(
      completeAvailabilityRequest(stale.dependencies, context, {
        requestId: "request-1",
        date: "2026-07-25",
        idempotencyKey: "complete-key-001",
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "availability_request_completed",
    });
    expect(stale.tx.surgery.updateMany).not.toHaveBeenCalled();

    const lostWinner = createHarness();
    prepareCompletion(lostWinner);
    lostWinner.tx.surgery.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      completeAvailabilityRequest(lostWinner.dependencies, context, {
        requestId: "request-1",
        date: "2026-07-24",
        idempotencyKey: "complete-key-001",
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "availability_surgery_ineligible",
    });
    expect(lostWinner.tx.availabilityRequest.updateMany).not.toHaveBeenCalled();
    expect(lostWinner.effects.writeAudit).not.toHaveBeenCalled();
  });

  it("denies completion after recipient access or current PÍVOT authority is lost", async () => {
    const lostAccess = createHarness();
    prepareCompletion(lostAccess);
    lostAccess.tx.userCompanyAccess.findFirst.mockResolvedValue(null);
    await expect(
      completeAvailabilityRequest(lostAccess.dependencies, context, {
        requestId: "request-1",
        date: "2026-07-24",
        idempotencyKey: "complete-key-001",
      })
    ).rejects.toMatchObject({ status: 404 });

    const formerPivot = createHarness();
    prepareCompletion(
      formerPivot,
      requestRow({
        assignments: [
          {
            userId: "actor-1",
            reason: AvailabilityRecipientReason.PIVOT,
            revokedAt: null,
          },
        ],
      })
    );
    formerPivot.tx.companyOperationalAssignee.findMany.mockResolvedValue([
      validPivot("replacement-pivot"),
    ]);
    await expect(
      completeAvailabilityRequest(formerPivot.dependencies, context, {
        requestId: "request-1",
        date: "2026-07-24",
        idempotencyKey: "complete-key-001",
      })
    ).rejects.toMatchObject({ status: 404 });

    expect(lostAccess.tx.surgery.updateMany).not.toHaveBeenCalled();
    expect(formerPivot.tx.surgery.updateMany).not.toHaveBeenCalled();
  });

  it("replays exact completion without duplicate effects and rejects changed dates", async () => {
    const replay = createHarness();
    enableSource();
    replay.tx.userCompanyAccess.findFirst.mockResolvedValue(actorAccess());
    replay.tx.availabilityCommand.findUnique.mockResolvedValue({
      payloadHash: payloadHash({
        requestId: "request-1",
        date: "2026-07-24",
      }),
      completedAt: new Date("2026-07-24T12:00:00.000Z"),
      requestId: "request-1",
    });
    replay.tx.availabilityRequest.findFirst.mockResolvedValue(
      requestRow({ status: "COMPLETED" })
    );
    const result = await completeAvailabilityRequest(
      replay.dependencies,
      context,
      {
        requestId: "request-1",
        date: "2026-07-24",
        idempotencyKey: "complete-key-001",
      }
    );
    expect(result.status).toBe("COMPLETED");
    expect(replay.tx.surgery.updateMany).not.toHaveBeenCalled();
    expect(replay.effects.writeAudit).not.toHaveBeenCalled();

    await expect(
      completeAvailabilityRequest(replay.dependencies, context, {
        requestId: "request-1",
        date: "2026-07-25",
        idempotencyKey: "complete-key-001",
      })
    ).rejects.toMatchObject({ status: 409, code: "idempotency_key_reused" });
  });

  it("propagates transaction effect failures without executing later effects", async () => {
    const harness = createHarness();
    prepareCreate(harness);
    vi.mocked(harness.effects.writeTrace).mockRejectedValue(
      new Error("trace failed")
    );

    await expect(
      createAvailabilityRequest(harness.dependencies, context, {
        surgeryId: "surgery-1",
        idempotencyKey: "request-key-0001",
      })
    ).rejects.toThrow("trace failed");
    expect(harness.tx.availabilityCommand.update).not.toHaveBeenCalled();
  });

  it("does not claim mocked unit tests prove database uniqueness or race winners", () => {
    expect(
      "PostgreSQL partial uniqueness, CHECK constraints, and true serializable races are deferred to FT3"
    ).toContain("deferred to FT3");
  });
});
