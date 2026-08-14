import {
  CompanyOperationalDesignation,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import {
  AVAILABILITY_CAPABILITIES,
  type AvailabilityCapability,
} from "../permissions/availability-request";
import { grantAvailabilityCapability } from "./availability-capability-grant.service";
import { designateInitialPivot } from "./company-operational-assignee.service";

export const AVAILABILITY_DEV_COMPANY_ID = "codevdistricorr100000000000";
export const AVAILABILITY_DEV_ACTOR_ID = "devfxr20actoractorcoordination";
export const AVAILABILITY_DEV_PIVOT_ID = "devfxr20actoractorwarehouse000";
export const AVAILABILITY_DEV_CAPABILITIES = AVAILABILITY_CAPABILITIES;

type BootstrapMode = "check" | "apply";
type BootstrapEnvironment = Readonly<Record<string, string | undefined>>;
type AccessSnapshot = { companyId: string; isActive: boolean; role: string };
type BootstrapSnapshot = {
  company: { id: string; isActive: boolean } | null;
  users: Array<{ id: string; isActive: boolean; companyAccess: AccessSnapshot[] }>;
  pivots: Array<{ id: string; companyId: string; userId: string; version: number }>;
  grants: Array<{
    id: string;
    companyId: string;
    userId: string;
    capability: string;
    isActive: boolean;
    revokedById: string | null;
    revokedAt: Date | null;
    revokeReason: string | null;
  }>;
  audits: Array<{
    userId: string;
    entityType: string;
    entityId: string | null;
    action: string;
    module: string;
    metadata: unknown;
  }>;
};

export type AvailabilityDevBootstrapResult = {
  outcome: "check" | "created" | "noop";
  state: "empty" | "final";
  counts: { pivots: 0 | 1; grants: 0 | 4; audits: 0 | 5 };
};

function rejectBootstrap(): never {
  throw new Error("AVAILABILITY_DEV_BOOTSTRAP_REJECTED");
}

function requireBootstrapEnvironment(
  mode: BootstrapMode,
  env: BootstrapEnvironment
): void {
  if (
    (mode !== "check" && mode !== "apply") ||
    env.OSSUM_DEPLOYMENT_TIER !== "development" ||
    env.OSSUM_ENABLE_AVAILABILITY_DEV_BOOTSTRAP !== "true" ||
    env.OSSUM_AVAILABILITY_DEV_COMPANY_ID !== AVAILABILITY_DEV_COMPANY_ID ||
    !env.DATABASE_URL?.trim()
  ) {
    rejectBootstrap();
  }
}

function metadataValue(metadata: unknown, key: string): unknown {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)[key]
    : undefined;
}

function requireReadiness(snapshot: BootstrapSnapshot): void {
  if (!snapshot.company?.isActive || snapshot.company.id !== AVAILABILITY_DEV_COMPANY_ID) {
    rejectBootstrap();
  }
  if (snapshot.users.length !== 2) rejectBootstrap();
  for (const expectedId of [AVAILABILITY_DEV_ACTOR_ID, AVAILABILITY_DEV_PIVOT_ID]) {
    const user = snapshot.users.find(({ id }) => id === expectedId);
    const access = user?.companyAccess;
    if (
      !user?.isActive ||
      access?.length !== 1 ||
      access[0].companyId !== AVAILABILITY_DEV_COMPANY_ID ||
      !access[0].isActive ||
      (expectedId === AVAILABILITY_DEV_PIVOT_ID && access[0].role !== "operator")
    ) {
      rejectBootstrap();
    }
  }
}

export function classifyAvailabilityDevBootstrapState(
  snapshot: BootstrapSnapshot
): "empty" | "final" {
  requireReadiness(snapshot);
  if (
    snapshot.pivots.length === 0 &&
    snapshot.grants.length === 0 &&
    snapshot.audits.length === 0
  ) {
    return "empty";
  }

  const pivot = snapshot.pivots[0];
  const capabilities = new Set<AvailabilityCapability>();
  const grantsById = new Map(snapshot.grants.map((grant) => [grant.id, grant]));
  for (const grant of snapshot.grants) {
    if (
      !AVAILABILITY_DEV_CAPABILITIES.includes(grant.capability as AvailabilityCapability) ||
      grant.companyId !== AVAILABILITY_DEV_COMPANY_ID ||
      grant.userId !== AVAILABILITY_DEV_ACTOR_ID ||
      !grant.isActive ||
      grant.revokedById !== null ||
      grant.revokedAt !== null ||
      grant.revokeReason !== null
    ) {
      rejectBootstrap();
    }
    capabilities.add(grant.capability as AvailabilityCapability);
  }
  const pivotAudits = snapshot.audits.filter(
    (audit) => audit.action === "availability.pivot_designated"
  );
  const grantAudits = snapshot.audits.filter(
    (audit) => audit.action === "availability.capability_granted"
  );
  const auditedGrantIds = new Set<string>();
  const grantAuditMappingExact = grantAudits.every((audit) => {
    const entityId = audit.entityId;
    const grant = entityId ? grantsById.get(entityId) : undefined;
    if (
      !entityId ||
      !grant ||
      auditedGrantIds.has(entityId) ||
      audit.userId !== AVAILABILITY_DEV_ACTOR_ID ||
      audit.entityType !== "AvailabilityCapabilityGrant" ||
      audit.module !== "availability" ||
      metadataValue(audit.metadata, "targetUserId") !== AVAILABILITY_DEV_ACTOR_ID ||
      metadataValue(audit.metadata, "capability") !== grant.capability
    ) {
      return false;
    }
    auditedGrantIds.add(entityId);
    return true;
  });
  const final =
    snapshot.pivots.length === 1 &&
    pivot.companyId === AVAILABILITY_DEV_COMPANY_ID &&
    pivot.userId === AVAILABILITY_DEV_PIVOT_ID &&
    pivot.version === 1 &&
    snapshot.grants.length === 4 &&
    capabilities.size === 4 &&
    snapshot.audits.length === 5 &&
    pivotAudits.length === 1 &&
    grantAudits.length === 4 &&
    pivotAudits[0].userId === AVAILABILITY_DEV_ACTOR_ID &&
    pivotAudits[0].entityType === "Company" &&
    pivotAudits[0].entityId === AVAILABILITY_DEV_COMPANY_ID &&
    pivotAudits[0].module === "availability" &&
    grantAuditMappingExact &&
    auditedGrantIds.size === snapshot.grants.length;
  if (!final) rejectBootstrap();
  return "final";
}

async function readSnapshot(
  tx: Prisma.TransactionClient
): Promise<BootstrapSnapshot> {
  const [company, users, pivots, grants, audits] = await Promise.all([
    tx.company.findUnique({
      where: { id: AVAILABILITY_DEV_COMPANY_ID },
      select: { id: true, isActive: true },
    }),
    tx.user.findMany({
      where: { id: { in: [AVAILABILITY_DEV_ACTOR_ID, AVAILABILITY_DEV_PIVOT_ID] } },
      select: {
        id: true,
        isActive: true,
        companyAccess: {
          where: { companyId: AVAILABILITY_DEV_COMPANY_ID },
          select: { companyId: true, isActive: true, role: true },
        },
      },
    }),
    tx.companyOperationalAssignee.findMany({
      where: {
        companyId: AVAILABILITY_DEV_COMPANY_ID,
        designation: CompanyOperationalDesignation.PIVOT,
      },
      select: { id: true, companyId: true, userId: true, version: true },
    }),
    tx.availabilityCapabilityGrant.findMany({
      where: { companyId: AVAILABILITY_DEV_COMPANY_ID },
      select: {
        id: true, companyId: true, userId: true, capability: true, isActive: true,
        revokedById: true, revokedAt: true, revokeReason: true,
      },
    }),
    tx.auditEvent.findMany({
      where: {
        companyId: AVAILABILITY_DEV_COMPANY_ID,
        action: { in: ["availability.pivot_designated", "availability.capability_granted"] },
      },
      select: {
        userId: true, entityType: true, entityId: true, action: true, module: true,
        metadata: true,
      },
    }),
  ]);
  return { company, users, pivots, grants, audits };
}

function result(outcome: AvailabilityDevBootstrapResult["outcome"], state: "empty" | "final") {
  return {
    outcome,
    state,
    counts: state === "final"
      ? { pivots: 1, grants: 4, audits: 5 } as const
      : { pivots: 0, grants: 0, audits: 0 } as const,
  };
}

export async function bootstrapAvailabilityDev(
  prisma: PrismaClient,
  input: { mode?: BootstrapMode; env?: BootstrapEnvironment } = {}
): Promise<AvailabilityDevBootstrapResult> {
  const mode = input.mode ?? "check";
  requireBootstrapEnvironment(mode, input.env ?? process.env);
  return prisma.$transaction(async (tx) => {
    const before = classifyAvailabilityDevBootstrapState(await readSnapshot(tx));
    if (before === "final") return result("noop", "final");
    if (mode === "check") return result("check", "empty");

    await designateInitialPivot(tx, {
      companyId: AVAILABILITY_DEV_COMPANY_ID,
      actorUserId: AVAILABILITY_DEV_ACTOR_ID,
      targetUserId: AVAILABILITY_DEV_PIVOT_ID,
      reason: "Approved DEV availability bootstrap",
    });
    for (const capability of AVAILABILITY_DEV_CAPABILITIES) {
      await grantAvailabilityCapability(tx, {
        companyId: AVAILABILITY_DEV_COMPANY_ID,
        actorUserId: AVAILABILITY_DEV_ACTOR_ID,
        targetUserId: AVAILABILITY_DEV_ACTOR_ID,
        capability,
      });
    }
    if (classifyAvailabilityDevBootstrapState(await readSnapshot(tx)) !== "final") {
      rejectBootstrap();
    }
    return result("created", "final");
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
