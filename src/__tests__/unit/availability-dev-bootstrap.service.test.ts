import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));

import { parseAvailabilityBootstrapMode } from "../../../scripts/dev/bootstrap-availability";
import {
  AVAILABILITY_DEV_ACTOR_ID,
  AVAILABILITY_DEV_CAPABILITIES,
  AVAILABILITY_DEV_COMPANY_ID,
  AVAILABILITY_DEV_PIVOT_ID,
  bootstrapAvailabilityDev,
  classifyAvailabilityDevBootstrapState,
} from "@/lib/services/availability-dev-bootstrap.service";

type Snapshot = Parameters<typeof classifyAvailabilityDevBootstrapState>[0];
const validEnv = {
  OSSUM_DEPLOYMENT_TIER: "development",
  OSSUM_ENABLE_AVAILABILITY_DEV_BOOTSTRAP: "true",
  OSSUM_AVAILABILITY_DEV_COMPANY_ID: AVAILABILITY_DEV_COMPANY_ID,
  DATABASE_URL: "postgresql://redacted-dev",
};

function users(pivotRole = "operator", active = true): Snapshot["users"] {
  return [
    {
      id: AVAILABILITY_DEV_ACTOR_ID,
      isActive: active,
      companyAccess: [{ companyId: AVAILABILITY_DEV_COMPANY_ID, isActive: active, role: "coordinator" }],
    },
    {
      id: AVAILABILITY_DEV_PIVOT_ID,
      isActive: active,
      companyAccess: [{ companyId: AVAILABILITY_DEV_COMPANY_ID, isActive: active, role: pivotRole }],
    },
  ];
}

function emptySnapshot(): Snapshot {
  return {
    company: { id: AVAILABILITY_DEV_COMPANY_ID, isActive: true },
    users: users(),
    pivots: [],
    grants: [],
    audits: [],
  };
}

function finalSnapshot(): Snapshot {
  const grants = AVAILABILITY_DEV_CAPABILITIES.map((capability, index) => ({
    id: `grant-${index + 1}`,
    companyId: AVAILABILITY_DEV_COMPANY_ID,
    userId: AVAILABILITY_DEV_ACTOR_ID,
    capability,
    isActive: true,
    revokedById: null,
    revokedAt: null,
    revokeReason: null,
  }));
  return {
    ...emptySnapshot(),
    pivots: [{
      id: "pivot-1", companyId: AVAILABILITY_DEV_COMPANY_ID,
      userId: AVAILABILITY_DEV_PIVOT_ID, version: 1,
    }],
    grants,
    audits: [
      {
        userId: AVAILABILITY_DEV_ACTOR_ID,
        entityType: "Company",
        entityId: AVAILABILITY_DEV_COMPANY_ID,
        action: "availability.pivot_designated",
        module: "availability",
        metadata: { reason: "Approved DEV availability bootstrap" },
      },
      ...grants.map((grant) => ({
        userId: AVAILABILITY_DEV_ACTOR_ID,
        entityType: "AvailabilityCapabilityGrant",
        entityId: grant.id,
        action: "availability.capability_granted",
        module: "availability",
        metadata: { capability: grant.capability, targetUserId: AVAILABILITY_DEV_ACTOR_ID },
      })),
    ],
  };
}

function createHarness(
  initial: Snapshot = emptySnapshot(),
  options: { rereadMismatch?: boolean; failAuditAt?: number; failAfterCallback?: boolean } = {}
) {
  let state = structuredClone(initial);
  let snapshotReads = 0;
  const tx = {
    company: {
      findUnique: vi.fn(async () => state.company),
      findFirst: vi.fn(async () => state.company?.isActive ? { id: state.company.id } : null),
    },
    user: { findMany: vi.fn(async () => state.users) },
    userCompanyAccess: {
      findFirst: vi.fn(async ({ where }: { where: { userId: string; role?: string } }) => {
        const user = state.users.find(({ id }) => id === where.userId);
        const access = user?.companyAccess[0];
        return user?.isActive && access?.isActive && (!where.role || access.role === where.role)
          ? { id: `access-${user.id}`, userId: user.id }
          : null;
      }),
      findMany: vi.fn(async ({ where }: { where: { userId: { in: string[] } } }) =>
        where.userId.in.flatMap((userId) => {
          const user = state.users.find(({ id }) => id === userId);
          return user?.isActive && user.companyAccess[0]?.isActive ? [{ userId }] : [];
        })
      ),
    },
    companyOperationalAssignee: {
      findMany: vi.fn(async () => state.pivots),
      findFirst: vi.fn(async () => state.pivots[0] ?? null),
      create: vi.fn(async ({ data }: { data: { companyId: string; userId: string; version: number } }) => {
        const row = { id: "pivot-1", ...data };
        state.pivots.push(row);
        return row;
      }),
    },
    availabilityCapabilityGrant: {
      findMany: vi.fn(async () => state.grants),
      findUnique: vi.fn(async ({ where }: { where: { companyId_userId_capability: { capability: string } } }) =>
        state.grants.find(({ capability }) => capability === where.companyId_userId_capability.capability) ?? null
      ),
      create: vi.fn(async ({ data }: { data: { companyId: string; userId: string; capability: string } }) => {
        const row = {
          id: `grant-${state.grants.length + 1}`,
          ...data,
          isActive: true,
          revokedById: null,
          revokedAt: null,
          revokeReason: null,
        };
        state.grants.push(row);
        return row;
      }),
      update: vi.fn(),
    },
    auditEvent: {
      findMany: vi.fn(async () => {
        snapshotReads += 1;
        return options.rereadMismatch && snapshotReads > 1 ? [] : state.audits;
      }),
      create: vi.fn(async ({ data }: { data: Snapshot["audits"][number] }) => {
        if (options.failAuditAt === state.audits.length + 1) throw new Error("audit failed");
        state.audits.push({
          userId: data.userId,
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          module: data.module,
          metadata: data.metadata,
        });
        return { id: `audit-${state.audits.length}` };
      }),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown, config: unknown) => {
      const before = structuredClone(state);
      try {
        const value = await callback(tx);
        if (options.failAfterCallback) throw new Error("commit failed");
        return value;
      } catch (error) {
        state = before;
        throw error;
      } finally {
        expect(config).toEqual({ isolationLevel: "Serializable" });
      }
    }),
  };
  return { tx, prisma: prisma as never, prismaMock: prisma, state: () => state };
}

describe("availability DEV bootstrap", () => {
  it("parses default check and only explicit apply", () => {
    expect(parseAvailabilityBootstrapMode([])).toBe("check");
    expect(parseAvailabilityBootstrapMode(["--check"])).toBe("check");
    expect(parseAvailabilityBootstrapMode(["--apply"])).toBe("apply");
    for (const args of [["--unknown"], ["--check", "--apply"]]) {
      expect(() => parseAvailabilityBootstrapMode(args)).toThrow("AVAILABILITY_DEV_BOOTSTRAP_REJECTED");
    }
  });

  it("rejects every non-exact environment before a transaction", async () => {
    for (const env of [
      {},
      { ...validEnv, OSSUM_DEPLOYMENT_TIER: "production" },
      { ...validEnv, OSSUM_ENABLE_AVAILABILITY_DEV_BOOTSTRAP: "TRUE" },
      { ...validEnv, OSSUM_AVAILABILITY_DEV_COMPANY_ID: "foreign-company" },
      { ...validEnv, DATABASE_URL: " " },
    ]) {
      const harness = createHarness();
      await expect(bootstrapAvailabilityDev(harness.prisma, { mode: "check", env }))
        .rejects.toThrow("AVAILABILITY_DEV_BOOTSTRAP_REJECTED");
      expect(harness.prismaMock.$transaction).not.toHaveBeenCalled();
    }
  });

  it("classifies only exact empty and final states", () => {
    expect(classifyAvailabilityDevBootstrapState(emptySnapshot())).toBe("empty");
    const final = finalSnapshot();
    expect(classifyAvailabilityDevBootstrapState(final)).toBe("final");
    expect(final.grants.every(({ userId }) => userId === AVAILABILITY_DEV_ACTOR_ID)).toBe(true);
    expect(final.grants).toHaveLength(4);
  });

  it("fails closed for invalid state and non-bijective grant audits", async () => {
    const duplicateAuditId = finalSnapshot();
    duplicateAuditId.audits[2].entityId = duplicateAuditId.audits[1].entityId;
    const mismatchedCapability = finalSnapshot();
    mismatchedCapability.audits[1].metadata = {
      capability: AVAILABILITY_DEV_CAPABILITIES[1],
      targetUserId: AVAILABILITY_DEV_ACTOR_ID,
    };
    const missingMapping = finalSnapshot();
    missingMapping.audits[1].entityId = "missing-grant";
    const variants = [
      { ...emptySnapshot(), pivots: finalSnapshot().pivots },
      { ...finalSnapshot(), grants: [...finalSnapshot().grants, { ...finalSnapshot().grants[0], id: "extra", userId: "dev-ingreso" }] },
      { ...finalSnapshot(), grants: finalSnapshot().grants.map((grant, index) => index ? grant : { ...grant, companyId: "foreign" }) },
      { ...emptySnapshot(), users: users("operator", false) },
      { ...emptySnapshot(), users: users("admin") },
      { ...finalSnapshot(), audits: finalSnapshot().audits.slice(0, 4) },
      { ...finalSnapshot(), grants: finalSnapshot().grants.map((grant, index) => index ? grant : { ...grant, userId: "dev-logistica" }) },
      duplicateAuditId,
      mismatchedCapability,
      missingMapping,
    ];
    for (const snapshot of variants) {
      const harness = createHarness(snapshot);
      await expect(bootstrapAvailabilityDev(harness.prisma, { mode: "check", env: validEnv }))
        .rejects.toThrow("AVAILABILITY_DEV_BOOTSTRAP_REJECTED");
      expect(harness.tx.companyOperationalAssignee.create).not.toHaveBeenCalled();
      expect(harness.tx.availabilityCapabilityGrant.create).not.toHaveBeenCalled();
      expect(harness.tx.auditEvent.create).not.toHaveBeenCalled();
    }
  });

  it("checks empty without writes and returns sanitized output", async () => {
    const harness = createHarness();
    const value = await bootstrapAvailabilityDev(harness.prisma, { env: validEnv });
    expect(value).toEqual({ outcome: "check", state: "empty", counts: { pivots: 0, grants: 0, audits: 0 } });
    expect(JSON.stringify(value)).not.toContain(AVAILABILITY_DEV_ACTOR_ID);
    expect(harness.tx.companyOperationalAssignee.create).not.toHaveBeenCalled();
  });

  it("applies empty to exact final with one PÍVOT, four grants, and five audits", async () => {
    const harness = createHarness();
    const value = await bootstrapAvailabilityDev(harness.prisma, { mode: "apply", env: validEnv });
    expect(value).toEqual({ outcome: "created", state: "final", counts: { pivots: 1, grants: 4, audits: 5 } });
    expect(harness.prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(harness.tx.companyOperationalAssignee.create).toHaveBeenCalledOnce();
    expect(harness.tx.availabilityCapabilityGrant.create).toHaveBeenCalledTimes(4);
    expect(harness.tx.auditEvent.create).toHaveBeenCalledTimes(5);
    expect(harness.state().grants.map(({ capability }) => capability).sort())
      .toEqual([...AVAILABILITY_DEV_CAPABILITIES].sort());
    expect(harness.state().pivots[0]).toMatchObject({ userId: AVAILABILITY_DEV_PIVOT_ID, version: 1 });
  });

  it("returns final noop with zero writes", async () => {
    const harness = createHarness(finalSnapshot());
    await expect(bootstrapAvailabilityDev(harness.prisma, { mode: "apply", env: validEnv }))
      .resolves.toEqual({ outcome: "noop", state: "final", counts: { pivots: 1, grants: 4, audits: 5 } });
    expect(harness.tx.companyOperationalAssignee.create).not.toHaveBeenCalled();
    expect(harness.tx.availabilityCapabilityGrant.create).not.toHaveBeenCalled();
    expect(harness.tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("rolls back reread mismatch, audit failure, and transaction failure", async () => {
    for (const options of [
      { rereadMismatch: true },
      { failAuditAt: 3 },
      { failAfterCallback: true },
    ]) {
      const harness = createHarness(emptySnapshot(), options);
      await expect(bootstrapAvailabilityDev(harness.prisma, { mode: "apply", env: validEnv })).rejects.toThrow();
      expect(harness.state()).toEqual(emptySnapshot());
    }
  });
});
