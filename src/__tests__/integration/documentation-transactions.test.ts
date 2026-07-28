import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createAuditEvent } from "@/lib/audit";
import {
  initializeSurgeryDocumentation,
  transitionSurgeryDocumentationItem,
  type SurgeryDocumentationEffects,
} from "@/lib/services/surgery-documentation.service";

const RUN_FLAG = "OSSUM_RUN_DOCUMENTATION_DEV_INTEGRATION";
const EXPECTED_DEV_PROJECT_REF = "yywqcdromnmmelijvspi";
const APPROVED_POOLER_HOST = "aws-1-sa-east-1.pooler.supabase.com";
const enabled = process.env[RUN_FLAG] === "true";
const integrationDescribe = enabled ? describe : describe.skip;

const PREFIX = `it-documentation-${Date.now()}`;
const ORG_ID = `${PREFIX}-org`;
const COMPANY_ID = `${PREFIX}-company`;
const USER_ID = `${PREFIX}-user`;
const PATIENT_ID = `${PREFIX}-patient`;
const REPEATED_SURGERY_ID = `${PREFIX}-repeated`;
const CONCURRENT_SURGERY_ID = `${PREFIX}-concurrent`;
const ROLLBACK_SURGERY_ID = `${PREFIX}-rollback`;
const context = { companyId: COMPANY_ID, actorUserId: USER_ID };

let prisma: PrismaClient | undefined;

type GateEnvironment = Record<string, string | undefined>;
type PrismaModule = { default: PrismaClient };

function assertExplicitDevTarget(environment: GateEnvironment): "direct" | "pooler" {
  if (
    environment[RUN_FLAG] !== "true" ||
    environment.OSSUM_DEPLOYMENT_TIER !== "development" ||
    environment.NODE_ENV === "production"
  ) {
    throw new Error("Documentation integration refused: explicit DEV gate is not satisfied");
  }

  const databaseUrl = environment.DATABASE_URL;
  const supabaseUrl = environment.SUPABASE_URL;
  if (!databaseUrl || !supabaseUrl) {
    throw new Error("Documentation integration refused: DEV target identity is incomplete");
  }

  let database: URL;
  let supabase: URL;
  try {
    database = new URL(databaseUrl);
    supabase = new URL(supabaseUrl.replace(/\/rest\/v1\/?$/, ""));
  } catch {
    throw new Error("Documentation integration refused: DEV target identity is invalid");
  }

  const expectedSupabaseHost = `${EXPECTED_DEV_PROJECT_REF}.supabase.co`;
  if (
    supabase.protocol !== "https:" ||
    supabase.hostname.toLowerCase() !== expectedSupabaseHost ||
    supabase.username !== "" ||
    supabase.password !== "" ||
    supabase.port !== "" ||
    supabase.search !== "" ||
    supabase.hash !== "" ||
    (supabase.pathname !== "" && supabase.pathname !== "/") ||
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    database.password === "" ||
    database.pathname !== "/postgres" ||
    database.search !== "" ||
    database.hash !== ""
  ) {
    throw new Error("Documentation integration refused: database is not the approved Supabase DEV target");
  }

  const hostname = database.hostname.toLowerCase();
  const username = decodeURIComponent(database.username);
  const direct =
    hostname === `db.${EXPECTED_DEV_PROJECT_REF}.supabase.co` &&
    username === "postgres" &&
    database.port === "5432";
  const pooler =
    hostname === APPROVED_POOLER_HOST &&
    username === `postgres.${EXPECTED_DEV_PROJECT_REF}` &&
    database.port === "6543";
  if (!direct && !pooler) {
    throw new Error("Documentation integration refused: database is not the approved Supabase DEV target");
  }
  return direct ? "direct" : "pooler";
}

async function loadPrismaAfterDevPreflight(
  environment: GateEnvironment,
  importer: () => Promise<PrismaModule> = () => import("@/lib/prisma")
): Promise<PrismaClient> {
  assertExplicitDevTarget(environment);
  return (await importer()).default;
}

function requirePrisma(): PrismaClient {
  if (!prisma) throw new Error("Documentation integration Prisma client is unavailable");
  return prisma;
}

const databaseEffects: SurgeryDocumentationEffects = {
  writeAudit: (input) => createAuditEvent({
    prisma: input.tx,
    companyId: input.companyId,
    userId: input.actorUserId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    module: "documentation",
    oldValue: input.oldValue,
    newValue: input.newValue,
    metadata: input.metadata,
  }),
};

async function cleanupFixture(): Promise<void> {
  const db = requirePrisma();
  await db.surgeryDocumentItem.deleteMany({ where: { companyId: COMPANY_ID } });
  await db.surgeryDocumentChecklist.deleteMany({ where: { companyId: COMPANY_ID } });
  await db.auditEvent.deleteMany({ where: { companyId: COMPANY_ID } });
  await db.surgery.deleteMany({ where: { companyId: COMPANY_ID } });
  await db.contactCompanyLink.deleteMany({ where: { companyId: COMPANY_ID } });
  await db.contact.deleteMany({ where: { id: PATIENT_ID } });
  await db.userCompanyAccess.deleteMany({ where: { companyId: COMPANY_ID } });
  await db.user.deleteMany({ where: { id: USER_ID } });
  await db.company.deleteMany({ where: { id: COMPANY_ID } });
  await db.organization.deleteMany({ where: { id: ORG_ID } });
}

async function seedFixture(): Promise<void> {
  const db = requirePrisma();
  await db.organization.create({
    data: { id: ORG_ID, name: "Documentation Integration Org", slug: ORG_ID },
  });
  await db.company.create({
    data: { id: COMPANY_ID, organizationId: ORG_ID, name: "Documentation Integration Company" },
  });
  await db.user.create({
    data: {
      id: USER_ID,
      email: `${PREFIX}@ossum.test`,
      firstName: "Documentation",
      lastName: "Tester",
      supabaseAuthId: `${PREFIX}-supabase`,
    },
  });
  await db.userCompanyAccess.create({ data: { userId: USER_ID, companyId: COMPANY_ID, role: "admin" } });
  await db.contact.create({ data: { id: PATIENT_ID, firstName: "Documentation", lastName: "Patient" } });
  await db.contactCompanyLink.create({
    data: { contactId: PATIENT_ID, companyId: COMPANY_ID, role: "patient" },
  });
  await db.surgery.createMany({
    data: [REPEATED_SURGERY_ID, CONCURRENT_SURGERY_ID, ROLLBACK_SURGERY_ID].map((id) => ({
      id,
      companyId: COMPANY_ID,
      patientId: PATIENT_ID,
      visibleNumber: id,
      cxStatus: "pending",
    })),
  });
}

describe("documentation integration DEV preflight", () => {
  const baseEnvironment = {
    [RUN_FLAG]: "true",
    OSSUM_DEPLOYMENT_TIER: "development",
    NODE_ENV: "test",
    SUPABASE_URL: `https://${EXPECTED_DEV_PROJECT_REF}.supabase.co`,
  };

  it.each([
    ["direct", `postgresql://postgres:synthetic@db.${EXPECTED_DEV_PROJECT_REF}.supabase.co:5432/postgres`],
    ["pooler", `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}:synthetic@${APPROVED_POOLER_HOST}:6543/postgres`],
  ])("accepts only the approved %s target form", (kind, databaseUrl) => {
    expect(assertExplicitDevTarget({ ...baseEnvironment, DATABASE_URL: databaseUrl })).toBe(kind);
  });

  const queryOverrides = ["host=evil.invalid", "port=5432", "user=other", "password=other", "sslmode=disable", "duplicate=one&duplicate=two", "unknown=value", "application_name=documentation"].map((query) => ["query override", `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}:synthetic@${APPROVED_POOLER_HOST}:6543/postgres?${query}`]);
  it.each([
    ["arbitrary host", `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}:synthetic@evil.invalid:6543/postgres`],
    ["embedded ref host", `postgresql://postgres:synthetic@db.${EXPECTED_DEV_PROJECT_REF}.supabase.co.evil.invalid:5432/postgres`],
    ["extra username token", `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}.extra:synthetic@${APPROVED_POOLER_HOST}:6543/postgres`],
    ["reversed username", `postgresql://${EXPECTED_DEV_PROJECT_REF}.postgres:synthetic@${APPROVED_POOLER_HOST}:6543/postgres`],
    ["unapproved pooler", `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}:synthetic@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`],
    ["direct pooler username", `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}:synthetic@db.${EXPECTED_DEV_PROJECT_REF}.supabase.co:5432/postgres`],
    ["wrong port", `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}:synthetic@${APPROVED_POOLER_HOST}:5432/postgres`],
    ["extra path", `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}:synthetic@${APPROVED_POOLER_HOST}:6543/other`],
    ["malformed", "not-a-url"],
    ["fragment", `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}:synthetic@${APPROVED_POOLER_HOST}:6543/postgres#fragment`],
    ...queryOverrides,
  ])("rejects %s before importer execution", async (_label, databaseUrl) => {
    const importer = vi.fn<() => Promise<PrismaModule>>();
    await expect(loadPrismaAfterDevPreflight(
      { ...baseEnvironment, DATABASE_URL: databaseUrl },
      importer
    )).rejects.toThrow(/^Documentation integration refused:/);
    expect(importer).not.toHaveBeenCalled();
  });

  it("rejects production and ambiguous Supabase targets without importer execution", async () => {
    const importer = vi.fn<() => Promise<PrismaModule>>();
    const databaseUrl = `postgresql://postgres.${EXPECTED_DEV_PROJECT_REF}:synthetic@${APPROVED_POOLER_HOST}:6543/postgres`;
    for (const environment of [
      { ...baseEnvironment, DATABASE_URL: databaseUrl, NODE_ENV: "production" },
      { ...baseEnvironment, DATABASE_URL: databaseUrl, SUPABASE_URL: `https://${EXPECTED_DEV_PROJECT_REF}.supabase.co.evil.invalid` },
      ...["?unknown=value", "#fragment"].map((suffix) => ({ ...baseEnvironment, DATABASE_URL: databaseUrl, SUPABASE_URL: `${baseEnvironment.SUPABASE_URL}${suffix}` })),
      { ...baseEnvironment, DATABASE_URL: databaseUrl, [RUN_FLAG]: "false" },
    ]) {
      await expect(loadPrismaAfterDevPreflight(environment, importer)).rejects.toThrow(
        /^Documentation integration refused:/
      );
    }
    expect(importer).not.toHaveBeenCalled();
  });
});

integrationDescribe("documentation transactions (explicit Supabase DEV)", () => {
  beforeAll(async () => {
    prisma = await loadPrismaAfterDevPreflight(process.env);
    await cleanupFixture();
    await seedFixture();
  });

  afterAll(async () => {
    if (!prisma) return;
    await cleanupFixture();
    await prisma.$disconnect();
    prisma = undefined;
  });

  it("persists one template across repeated initialization and preserves values", async () => {
    const db = requirePrisma();
    const dependencies = { prisma: db, effects: databaseEffects };
    const first = await initializeSurgeryDocumentation(dependencies, context, REPEATED_SURGERY_ID);
    const medicalOrder = await db.surgeryDocumentItem.findFirstOrThrow({
      where: { companyId: COMPANY_ID, checklist: { surgeryId: REPEATED_SURGERY_ID }, type: "medical_order" },
    });
    await db.surgeryDocumentItem.update({
      where: { id: medicalOrder.id },
      data: { state: "observed", observation: "Keep persisted value", updatedById: USER_ID },
    });

    const repeated = await initializeSurgeryDocumentation(dependencies, context, REPEATED_SURGERY_ID);
    expect(first).toMatchObject({ createdChecklist: true });
    expect(first.insertedTypes).toHaveLength(9);
    expect(repeated).toMatchObject({ createdChecklist: false, insertedTypes: [] });
    expect(repeated.documentation.items.find((entry) => entry.type === "medical_order")).toMatchObject({
      state: "observed",
      observation: "Keep persisted value",
    });
    expect(await db.surgeryDocumentChecklist.count({
      where: { companyId: COMPANY_ID, surgeryId: REPEATED_SURGERY_ID },
    })).toBe(1);
    expect(await db.surgeryDocumentItem.count({
      where: { companyId: COMPANY_ID, checklist: { surgeryId: REPEATED_SURGERY_ID } },
    })).toBe(9);
    expect(await db.auditEvent.count({
      where: { companyId: COMPANY_ID, action: "documentation.checklist_initialized", entityId: first.documentation.checklist!.id },
    })).toBe(1);
  });

  it("commits one checklist and nine unique items under concurrent initialization", async () => {
    const db = requirePrisma();
    const dependencies = { prisma: db, effects: databaseEffects };
    const results = await Promise.all([
      initializeSurgeryDocumentation(dependencies, context, CONCURRENT_SURGERY_ID),
      initializeSurgeryDocumentation(dependencies, context, CONCURRENT_SURGERY_ID),
    ]);
    expect(results.filter((result) => result.createdChecklist)).toHaveLength(1);
    expect(results.map((result) => result.insertedTypes.length).sort((a, b) => a - b)).toEqual([0, 9]);

    const persisted = await db.surgeryDocumentChecklist.findMany({
      where: { companyId: COMPANY_ID, surgeryId: CONCURRENT_SURGERY_ID },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    expect(persisted).toHaveLength(1);
    expect(persisted[0].items).toHaveLength(9);
    expect(new Set(persisted[0].items.map((entry) => entry.type)).size).toBe(9);
    expect(await db.auditEvent.count({
      where: { companyId: COMPANY_ID, action: "documentation.checklist_initialized", entityId: persisted[0].id },
    })).toBe(1);
  });

  it("rolls item, checklist, and audit writes back when audit insertion fails", async () => {
    const db = requirePrisma();
    const initialized = await initializeSurgeryDocumentation(
      { prisma: db, effects: databaseEffects },
      context,
      ROLLBACK_SURGERY_ID
    );
    const itemBefore = await db.surgeryDocumentItem.update({
      where: { id: initialized.documentation.items.find((entry) => entry.type === "medical_order")!.id },
      data: { state: "received", observation: null, updatedById: USER_ID },
    });
    const checklistBefore = await db.surgeryDocumentChecklist.findUniqueOrThrow({
      where: { id: initialized.documentation.checklist!.id },
    });
    const forcedAuditId = `${PREFIX}-forced-audit`;
    const failingEffects: SurgeryDocumentationEffects = {
      async writeAudit(input) {
        const data = {
          id: forcedAuditId,
          companyId: input.companyId,
          userId: input.actorUserId,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          module: "documentation",
        };
        await input.tx.auditEvent.create({ data });
        await input.tx.auditEvent.create({ data });
        return { id: forcedAuditId };
      },
    };

    await expect(transitionSurgeryDocumentationItem(
      { prisma: db, effects: failingEffects },
      context,
      {
        surgeryId: ROLLBACK_SURGERY_ID,
        itemId: itemBefore.id,
        state: "approved",
        expectedUpdatedAt: itemBefore.updatedAt.toISOString(),
      }
    )).rejects.toMatchObject({ status: 409, code: "documentation_write_conflict" });

    const itemAfter = await db.surgeryDocumentItem.findUniqueOrThrow({ where: { id: itemBefore.id } });
    const checklistAfter = await db.surgeryDocumentChecklist.findUniqueOrThrow({ where: { id: checklistBefore.id } });
    expect(itemAfter).toMatchObject({
      state: itemBefore.state,
      observation: itemBefore.observation,
      updatedById: itemBefore.updatedById,
      updatedAt: itemBefore.updatedAt,
    });
    expect(checklistAfter).toMatchObject({
      updatedById: checklistBefore.updatedById,
      updatedAt: checklistBefore.updatedAt,
    });
    expect(await db.auditEvent.count({ where: { id: forcedAuditId } })).toBe(0);
  });
});
