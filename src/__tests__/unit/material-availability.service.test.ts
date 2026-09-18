import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  correctMaterialAvailability,
  getMaterialAvailability,
  type MaterialAvailabilityEffects,
} from "@/lib/services/material-availability.service";

const context = { actorUserId: "actor-1", companyId: "company-1" };
const command = {
  surgeryId: "surgery-1",
  date: "2026-07-25",
  expectedCurrentDate: "2026-07-24",
  reason: "Fecha confirmada por logística.",
  idempotencyKey: "correct-key-0001",
  origin: "expediente" as const,
};

function hashPayload(payload: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function createHarness() {
  const tx = {
    userCompanyAccess: { findFirst: vi.fn() },
    surgery: { findFirst: vi.fn(), updateMany: vi.fn() },
    availabilityRequest: { findFirst: vi.fn() },
    availabilityCommand: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    availabilityCapabilityGrant: { findFirst: vi.fn() },
  };
  const prisma = {
    userCompanyAccess: { findFirst: vi.fn() },
    surgery: { findFirst: vi.fn() },
    $transaction: vi.fn(
      async (callback: (transaction: typeof tx) => unknown) => callback(tx)
    ),
  };
  const effects: MaterialAvailabilityEffects = {
    writeAudit: vi.fn().mockResolvedValue({ id: "audit-1" }),
    writeTrace: vi.fn().mockResolvedValue(undefined),
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

function grantCorrection(harness: ReturnType<typeof createHarness>) {
  enableSource();
  harness.tx.availabilityCapabilityGrant.findFirst.mockResolvedValue({
    companyId: context.companyId,
    userId: context.actorUserId,
    capability: "availability.date.correct",
  });
}

function prepareCorrection(harness: ReturnType<typeof createHarness>) {
  grantCorrection(harness);
  harness.tx.userCompanyAccess.findFirst.mockResolvedValue({ id: "access-1" });
  harness.tx.availabilityCommand.findUnique.mockResolvedValue(null);
  harness.tx.surgery.findFirst.mockResolvedValue({
    id: "surgery-1",
    materialAvailabilityDate: new Date("2026-07-24T00:00:00.000Z"),
  });
  harness.tx.availabilityRequest.findFirst.mockResolvedValue(null);
  harness.tx.availabilityCommand.create.mockResolvedValue({ id: "command-1" });
  harness.tx.surgery.updateMany.mockResolvedValue({ count: 1 });
  harness.tx.availabilityCommand.update.mockResolvedValue({ id: "command-1" });
}

describe("material-availability.service", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("OSSUM_DEPLOYMENT_TIER", "test");
    vi.stubEnv("OSSUM_ENABLE_AVAILABILITY_REQUESTS", "false");
    vi.stubEnv("OSSUM_AVAILABILITY_DEV_COMPANY_ID", "");
  });

  it("reads the canonical date only after active same-company access", async () => {
    const harness = createHarness();
    enableSource();
    harness.prisma.userCompanyAccess.findFirst.mockResolvedValue({ id: "access-1" });
    harness.prisma.surgery.findFirst.mockResolvedValue({
      id: "surgery-1",
      materialAvailabilityDate: new Date("2026-07-24T00:00:00.000Z"),
    });

    await expect(
      getMaterialAvailability(harness.dependencies, context, "surgery-1")
    ).resolves.toEqual({ surgeryId: "surgery-1", date: "2026-07-24" });
    expect(harness.prisma.surgery.findFirst).toHaveBeenCalledWith({
      where: { id: "surgery-1", companyId: "company-1" },
      select: { id: true, materialAvailabilityDate: true },
    });

    harness.prisma.userCompanyAccess.findFirst.mockResolvedValue(null);
    await expect(
      getMaterialAvailability(harness.dependencies, context, "foreign-surgery")
    ).rejects.toMatchObject({ status: 404 });
  });

  it("denies missing capability and non-Expediente origin before target facts", async () => {
    const denied = createHarness();
    await expect(
      correctMaterialAvailability(denied.dependencies, context, command)
    ).rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
    expect(denied.tx.surgery.findFirst).not.toHaveBeenCalled();

    const wrongOrigin = createHarness();
    await expect(
      correctMaterialAvailability(wrongOrigin.dependencies, context, {
        ...command,
        origin: "api" as never,
      })
    ).rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
    expect(wrongOrigin.prisma.$transaction).not.toHaveBeenCalled();

    for (const result of [null, { companyId: "company-2", userId: context.actorUserId, capability: "availability.date.correct" }]) {
      const harness = createHarness();
      enableSource();
      harness.tx.availabilityCapabilityGrant.findFirst.mockResolvedValue(result);
      await expect(correctMaterialAvailability(harness.dependencies, context, command))
        .rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
    }
    const failed = createHarness();
    enableSource();
    failed.tx.availabilityCapabilityGrant.findFirst.mockRejectedValue(new Error("provider failed"));
    await expect(correctMaterialAvailability(failed.dependencies, context, command))
      .rejects.toMatchObject({ status: 403, code: "availability_forbidden" });
  });

  it("corrects archived, finalized, and cancelled Surgeries without lifecycle predicates", async () => {
    for (const lifecycle of ["archived", "finalized", "cancelled"]) {
      const harness = createHarness();
      prepareCorrection(harness);
      harness.tx.surgery.findFirst.mockResolvedValue({
        id: "surgery-1",
        materialAvailabilityDate: new Date("2026-07-24T00:00:00.000Z"),
        lifecycle,
      });

      await expect(
        correctMaterialAvailability(harness.dependencies, context, command)
      ).resolves.toMatchObject({ surgeryId: "surgery-1", date: "2026-07-25" });
      expect(harness.tx.surgery.updateMany).toHaveBeenCalledWith({
        where: {
          id: "surgery-1",
          companyId: "company-1",
          materialAvailabilityDate: new Date("2026-07-24T00:00:00.000Z"),
        },
        data: {
          materialAvailabilityDate: new Date("2026-07-25T00:00:00.000Z"),
        },
      });
    }
  });

  it("rejects missing, stale, unchanged, and conditionally lost date updates", async () => {
    for (const currentDate of [null, new Date("2026-07-23T00:00:00.000Z")]) {
      const harness = createHarness();
      prepareCorrection(harness);
      harness.tx.surgery.findFirst.mockResolvedValue({
        id: "surgery-1",
        materialAvailabilityDate: currentDate,
      });
      await expect(
        correctMaterialAvailability(harness.dependencies, context, command)
      ).rejects.toMatchObject({
        status: 409,
        code: "availability_expected_date_mismatch",
      });
    }

    const unchanged = createHarness();
    prepareCorrection(unchanged);
    await expect(
      correctMaterialAvailability(unchanged.dependencies, context, {
        ...command,
        date: "2026-07-24",
      })
    ).rejects.toMatchObject({ status: 409, code: "availability_date_unchanged" });

    const lost = createHarness();
    prepareCorrection(lost);
    lost.tx.surgery.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      correctMaterialAvailability(lost.dependencies, context, command)
    ).rejects.toMatchObject({
      status: 409,
      code: "availability_expected_date_mismatch",
    });
    expect(lost.effects.writeAudit).not.toHaveBeenCalled();
  });

  it("rejects correction when inconsistent data still has an OPEN request", async () => {
    const harness = createHarness();
    prepareCorrection(harness);
    harness.tx.availabilityRequest.findFirst.mockResolvedValue({ id: "request-open" });

    await expect(
      correctMaterialAvailability(harness.dependencies, context, command)
    ).rejects.toMatchObject({ status: 409, code: "availability_request_open" });
    expect(harness.tx.surgery.updateMany).not.toHaveBeenCalled();
  });

  it("orders correction audit, protected trace, and receipt without touching requests", async () => {
    const harness = createHarness();
    prepareCorrection(harness);

    await correctMaterialAvailability(harness.dependencies, context, command);

    expect(harness.effects.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "availability.corrected",
        oldDate: "2026-07-24",
        newDate: "2026-07-25",
        reason: command.reason,
      })
    );
    expect(
      vi.mocked(harness.effects.writeAudit).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(harness.effects.writeTrace).mock.invocationCallOrder[0]
    );
    expect(
      vi.mocked(harness.effects.writeTrace).mock.invocationCallOrder[0]
    ).toBeLessThan(harness.tx.availabilityCommand.update.mock.invocationCallOrder[0]);
    expect(harness.tx.availabilityRequest).toEqual({
      findFirst: expect.any(Function),
    });
  });

  it("replays an exact correction and rejects idempotency hash conflicts", async () => {
    const replay = createHarness();
    grantCorrection(replay);
    replay.tx.userCompanyAccess.findFirst.mockResolvedValue({ id: "access-1" });
    replay.tx.availabilityCommand.findUnique.mockResolvedValue({
      payloadHash: hashPayload({
        surgeryId: command.surgeryId,
        date: command.date,
        expectedCurrentDate: command.expectedCurrentDate,
        reason: command.reason,
      }),
      completedAt: new Date(),
      surgeryId: "surgery-1",
    });
    await expect(
      correctMaterialAvailability(replay.dependencies, context, command)
    ).resolves.toEqual({
      surgeryId: "surgery-1",
      date: "2026-07-25",
      replayed: true,
    });
    expect(replay.tx.surgery.updateMany).not.toHaveBeenCalled();

    await expect(
      correctMaterialAvailability(replay.dependencies, context, {
        ...command,
        date: "2026-07-26",
      })
    ).rejects.toMatchObject({ status: 409, code: "idempotency_key_reused" });
  });

  it("propagates trace failure so the receipt cannot complete", async () => {
    const harness = createHarness();
    prepareCorrection(harness);
    vi.mocked(harness.effects.writeTrace).mockRejectedValue(new Error("trace failed"));

    await expect(
      correctMaterialAvailability(harness.dependencies, context, command)
    ).rejects.toThrow("trace failed");
    expect(harness.tx.availabilityCommand.update).not.toHaveBeenCalled();
  });

  it("defers native DATE and correction race proof to FT3", () => {
    expect("PostgreSQL DATE and real conditional races are deferred to FT3").toContain(
      "deferred to FT3"
    );
  });
});
