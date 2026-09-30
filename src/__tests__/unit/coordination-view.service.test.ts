import { describe, expect, it, vi } from "vitest";

import type { ApiAuthContext } from "@/lib/api/auth-context";
import { mapApiSurgeryListToSurgeries } from "@/lib/api/surgery-adapter";
import type { CoordinatorCase } from "@/components/coordinadores/coordinator-queue.helpers";
import { normalizeCoordinationBaseSnapshot, overdue } from "@/components/coordinadores/coordination-filtering";
import { getCoordinationView } from "@/lib/services/coordination-view.service";

const ctx: ApiAuthContext = {
  actorUserId: "actor-real",
  supabaseAuthId: "supabase-real",
  companyId: "company-1",
  role: "admin",
  canonicalRole: "admin",
  rawRole: "admin",
  user: { id: "actor-real", email: "ana@x.test", firstName: "Ana", lastName: "Admin" },
  activeCompany: { id: "company-1", name: "Districorr DEV" },
  source: "supabase-auth",
};

function db() {
  const assignment = (contactId: string, label: string, companyId = "company-1") => ({
    id: `assignment-${contactId}`,
    contactId,
    role: "coordinator",
    isPrimary: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    contact: {
      id: contactId,
      firstName: null,
      lastName: null,
      legalName: label,
      email: null,
      isCompany: false,
      isActive: true,
      companyLinks: [{ companyId, role: "coordinator", isActive: true }],
    },
  });
  const rows = [
    { id: "s1", companyId: "company-1", contactAssignments: [assignment("contact-1", "Uno")] },
    { id: "s2", companyId: "company-1", contactAssignments: [assignment("contact-2", "Dos")] },
    { id: "foreign-same-assignment", companyId: "company-2", contactAssignments: [assignment("contact-1", "Uno", "company-2")] },
  ];
  return {
    surgery: {
      findMany: vi.fn().mockResolvedValue(rows),
      create: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
      delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(),
    },
    surgeryContactAssignment: {
      create: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
      delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(),
    },
    userModuleViewPreference: {
      create: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
      delete: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn(),
    },
    contact: { findMany: vi.fn().mockResolvedValue([
      { id: "contact-1", email: "ana@x.test", firstName: "Ana", lastName: "Admin", legalName: null },
      { id: "contact-2", email: null, firstName: null, lastName: null, legalName: "Dos" },
    ]) },
    company: { findUnique: vi.fn().mockResolvedValue({
      id: "company-1", name: "Districorr DEV", isActive: true,
      organization: { slug: "ossum-dev", isActive: true }, users: [{ id: "access-1" }],
    }) },
    $transaction: vi.fn(),
    auditEvent: { create: vi.fn(), createMany: vi.fn() },
  };
}

function expectNoWrites(prisma: ReturnType<typeof db>) {
  expect(prisma.$transaction).not.toHaveBeenCalled();
  for (const operation of ["create", "update", "updateMany", "delete", "deleteMany", "upsert"] as const) {
    expect(prisma.surgery[operation]).not.toHaveBeenCalled();
    expect(prisma.surgeryContactAssignment[operation]).not.toHaveBeenCalled();
    expect(prisma.userModuleViewPreference[operation]).not.toHaveBeenCalled();
  }
  expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  expect(prisma.auditEvent.createMany).not.toHaveBeenCalled();
}
const env = {
  NODE_ENV: "test",
  OSSUM_DEPLOYMENT_TIER: "development",
  OSSUM_ENABLE_COORDINATOR_PREVIEW: "true",
  OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID: "company-1",
} as NodeJS.ProcessEnv;

describe("coordination view service", () => {
  it.each(["admin", "coordinator"] as const)("permite producción global para %s", async (role) => {
    const prisma = db();
    const view = await getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx: { ...ctx, role, canonicalRole: role, rawRole: role },
      request: { mode: "production", surface: "global" },
    });
    expect(view.context.surface).toBe("global");
    expect(view.surgeries.map((row) => row.id)).toEqual(["s1", "s2"]);
    expect(view.pagination).toEqual({ take: 50, skip: 0, hasMore: false });
  });

  it("returns one bounded page plus hasMore evidence", async () => {
    const prisma = db();
    prisma.surgery.findMany.mockResolvedValue(Array.from({ length: 3 }, (_, index) => ({
      id: `s${index + 1}`,
      companyId: "company-1",
      contactAssignments: [],
    })) as never);

    const view = await getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx,
      request: { mode: "production", surface: "global", take: 2, skip: 10 },
    });

    expect(prisma.surgery.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3, skip: 10 }));
    expect(view.surgeries.map((row) => row.id)).toEqual(["s1", "s2"]);
    expect(view.pagination).toEqual({ take: 2, skip: 10, hasMore: true });
  });

  it("deniega logística global antes de enumerar contactos o cirugías", async () => {
    const prisma = db();
    await expect(getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx: { ...ctx, role: "logistics", canonicalRole: "logistics", rawRole: "logistics" },
      request: { mode: "production", surface: "global" },
    })).rejects.toMatchObject({
      status: 403,
      code: "coordination_global_access_denied",
    });
    expect(prisma.contact.findMany).not.toHaveBeenCalled();
    expect(prisma.surgery.findMany).not.toHaveBeenCalled();
  });

  it("resuelve producción personal server-side y filtra por assignment exacto", async () => {
    const prisma = db();
    const view = await getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx,
      request: { mode: "production", surface: "personal" },
    });
    expect(view.context).toMatchObject({
      mode: "production", readOnly: false,
      actor: { userId: "actor-real" },
      viewSubject: { contactId: "contact-1" },
    });
    expect(view.surgeries.map((row) => row.id)).toEqual(["s1"]);
    expect(view.surgeries.map((row) => row.id)).not.toContain("foreign-same-assignment");
    expect(prisma.surgery.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        contactAssignments: expect.objectContaining({
          some: expect.objectContaining({ contactId: "contact-1", role: "coordinator" }),
        }),
      }),
    }));
    expectNoWrites(prisma);
  });

  it("preserva assignmentId/createdAt exactos hasta la respuesta personal", async () => {
    const prisma = db();
    prisma.surgery.findMany.mockResolvedValue([{
      id: "s-exact",
      companyId: "company-1",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      probableDate: new Date("2020-01-02T00:00:00.000Z"),
      contactAssignments: [{
        id: "assignment-exact",
        contactId: "contact-1",
        role: "coordinator",
        isPrimary: false,
        createdAt: new Date("2026-07-16T10:00:00.000Z"),
        contact: {
          id: "contact-1", firstName: null, lastName: null, legalName: "Uno", email: null,
          isCompany: false, isActive: true,
          companyLinks: [{ companyId: "company-1", role: "coordinator", isActive: true }],
        },
      }],
    }] as never);

    const view = await getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx,
      request: { mode: "production", surface: "personal" },
    });

    expect(view.surgeries).toHaveLength(1);
    expect(view.surgeries[0].coordinatorAssignments).toEqual([expect.objectContaining({
      assignmentId: "assignment-exact",
      contactId: "contact-1",
      isPrimary: false,
      createdAt: "2026-07-16T10:00:00.000Z",
    })]);
    expect(view.surgeries[0].coordinatorAssignment).toMatchObject({ status: "resolved", resolved: { contactId: "contact-1" } });
    expectNoWrites(prisma);
  });

  it("retiene ownership/base para tiempos válidos, ausentes e inválidos y solo vence el exacto válido", () => {
    const now = Date.parse("2026-07-20T12:00:00.000Z");
    const rawRows = [
      { id: "valid", createdAt: "2020-01-01T00:00:00.000Z", assignmentId: "fabricated-root", assignmentCreatedAt: "2020-01-02T00:00:00.000Z", coordinatorAssignments: [{ assignmentId: "a-valid", contactId: "contact-1", label: "Uno", isPrimary: false, createdAt: "2026-07-18T11:59:59.999Z" }] },
      { id: "missing", createdAt: "2020-01-01T00:00:00.000Z", coordinatorAssignments: [{ assignmentId: "a-missing", contactId: "contact-1", label: "Uno", isPrimary: true }] },
      { id: "invalid", probableDate: "2020-01-02T00:00:00.000Z", history: [{ date: "2020-01-03" }], coordinatorAssignments: [{ assignmentId: "a-invalid", contactId: "contact-1", label: "Uno", isPrimary: true, createdAt: "not-an-instant" }] },
    ].map((row) => ({
      ...row,
      companyId: "company-1",
      cxStatus: "Autorizada",
      coordinatorAssignment: { status: "resolved", resolved: { contactId: "contact-1", label: "Uno" } },
    }));
    const cases = mapApiSurgeryListToSurgeries(rawRows).map((surgery): CoordinatorCase => ({
      surgery,
      history: [],
      bucket: "autorizado",
      subgroup: "pendiente-coordinar",
      materialAvailabilityDefined: false,
      materialAvailabilityLabel: "Sin definir",
      sla: { tone: "missing", label: "SLA sin base", hoursElapsed: null },
    }));

    const snapshot = normalizeCoordinationBaseSnapshot({
      hasSuccessfulData: true,
      contextKey: "ctx",
      acceptedContextKey: "ctx",
      subjectContactId: "contact-1",
      cases,
      evaluationNow: now,
    });

    expect(snapshot?.cases.map((entry) => entry.surgery.backendId)).toEqual(["invalid", "missing", "valid"]);
    expect(snapshot?.cases.map((entry) => entry.resolvedAssignmentSlaBasis.status)).toEqual(["invalid", "missing", "valid"]);
    expect(snapshot?.cases.filter((entry) => overdue(entry, now)).map((entry) => entry.surgery.backendId)).toEqual(["valid"]);
    expect(snapshot?.diagnostics.assignmentSlaBasis).toMatchObject({ missing: 1, invalid: 1 });
  });

  it("deriva opciones solo del subject/empresa autorizados y deduplica una cirugía upstream repetida", async () => {
    const prisma = db();
    const exact = {
      id: "s1",
      companyId: "company-1",
      cxStatus: "Autorizada",
      institutionId: "institution-owned",
      payerContactId: "payer-owned",
      institution: { id: "institution-owned", firstName: null, lastName: null, legalName: "Nombre compartido" },
      payer: { id: "payer-owned", firstName: null, lastName: null, legalName: "Cliente compartido" },
      contactAssignments: [{
        id: "assignment-owned", contactId: "contact-1", role: "coordinator", isPrimary: false,
        createdAt: new Date("2026-07-16T10:00:00.000Z"),
        contact: { id: "contact-1", firstName: null, lastName: null, legalName: "Uno", email: null, isCompany: false, isActive: true, companyLinks: [{ companyId: "company-1", role: "coordinator", isActive: true }] },
      }],
    };
    prisma.surgery.findMany.mockResolvedValue([
      exact,
      { ...exact },
      { ...exact, id: "other-subject", institutionId: "institution-other", payerContactId: "payer-other", contactAssignments: [{ ...exact.contactAssignments[0], id: "assignment-other", contactId: "contact-2", contact: { ...exact.contactAssignments[0].contact, id: "contact-2", legalName: "Dos" } }] },
      { ...exact, id: "foreign", companyId: "company-2", institutionId: "institution-foreign", payerContactId: "payer-foreign" },
    ] as never);

    const view = await getCoordinationView({ prisma: prisma as never, routeCompanyId: "company-1", ctx, request: { mode: "production", surface: "personal" } });
    const cases = mapApiSurgeryListToSurgeries(view.surgeries).map((surgery): CoordinatorCase => ({ surgery, history: [], bucket: "autorizado", subgroup: "pendiente-coordinar", materialAvailabilityDefined: false, materialAvailabilityLabel: "Sin definir", sla: { tone: "missing", label: "SLA sin base", hoursElapsed: null } }));
    const snapshot = normalizeCoordinationBaseSnapshot({ hasSuccessfulData: true, contextKey: "ctx", acceptedContextKey: "ctx", subjectContactId: "contact-1", cases, evaluationNow: Date.parse("2026-07-20T12:00:00.000Z") });

    expect(snapshot?.cases).toHaveLength(1);
    expect(snapshot?.institutionOptions).toEqual([{ kind: "id", value: "institution-owned", label: "Nombre compartido" }]);
    expect(snapshot?.clientOptions).toEqual([{ kind: "id", value: "payer-owned", label: "Cliente compartido" }]);
    expect(JSON.stringify(snapshot)).not.toContain("institution-foreign");
    expect(JSON.stringify(snapshot)).not.toContain("payer-other");
    expectNoWrites(prisma);
  });

  it("reemplaza el contexto personal sin conservar filas del subject anterior", async () => {
    const prisma = db();
    const first = await getCoordinationView({ prisma: prisma as never, routeCompanyId: "company-1", ctx, request: { mode: "production", surface: "personal" } });
    prisma.contact.findMany.mockResolvedValue([{ id: "contact-2", email: "dos@x.test", firstName: "Dos", lastName: "User", legalName: null }]);
    const second = await getCoordinationView({ prisma: prisma as never, routeCompanyId: "company-1", ctx: { ...ctx, actorUserId: "actor-2", user: { id: "actor-2", email: "dos@x.test", firstName: "Dos", lastName: "User" } }, request: { mode: "production", surface: "personal" } });

    expect(first.context.viewSubject?.contactId).toBe("contact-1");
    expect(first.surgeries.map((row) => row.id)).toEqual(["s1"]);
    expect(second.context.viewSubject?.contactId).toBe("contact-2");
    expect(second.surgeries.map((row) => row.id)).toEqual(["s2"]);
    expect(second.surgeries.map((row) => row.id)).not.toContain("s1");
    expectNoWrites(prisma);
  });

  it("mantiene coordinator personal limitado a sus casos propios", async () => {
    const prisma = db();
    const view = await getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx: { ...ctx, role: "coordinator" },
      request: { mode: "production", surface: "personal" },
    });
    expect(view.surgeries.map((row) => row.id)).toEqual(["s1"]);
    expect(view.surgeries.map((row) => row.id)).not.toContain("s2");
    expect(view.surgeries.map((row) => row.id)).not.toContain("foreign-same-assignment");
  });

  it("bloquea personal ambiguo sin leer ni filtrar casos", async () => {
    const prisma = db();
    prisma.contact.findMany.mockResolvedValue([
      { id: "c1", email: "ana@x.test", firstName: null, lastName: null, legalName: "Uno" },
      { id: "c2", email: null, firstName: "Ana", lastName: "Admin", legalName: null },
    ]);
    const view = await getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx,
      request: { mode: "production", surface: "personal" },
    });
    expect(view.context.personalResolution).toMatchObject({ status: "ambiguous", subject: null });
    expect(view.surgeries).toEqual([]);
    expect(prisma.surgery.findMany).not.toHaveBeenCalled();
  });

  it("preview cambia solo viewSubject, conserva actor y retorna DTO read-only", async () => {
    const prisma = db();
    const before = structuredClone(ctx);
    const view = await getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx,
      request: { mode: "dev-preview", surface: "personal", subjectContactId: "contact-2" },
      env,
    });
    expect(view.context).toMatchObject({
      mode: "dev-preview", readOnly: true,
      actor: { userId: "actor-real", label: "Ana Admin" },
      viewSubject: { contactId: "contact-2" },
    });
    expect(view.surgeries.map((row) => row.id)).toEqual(["s2"]);
    expect(ctx).toEqual(before);
    expect(JSON.stringify(view)).not.toMatch(/mutation|actionUrl|routeTarget|method/i);
    expectNoWrites(prisma);
  });

  it("sanitiza estructuralmente cada cirugía con una allowlist de presentación", async () => {
    const prisma = db();
    prisma.surgery.findMany.mockResolvedValue([{
      id: "s-sensitive",
      companyId: "company-1",
      contactAssignments: [],
      patient: { id: "patient-1", firstName: "Paz", lastName: "Uno", legalName: null, secret: "nested" },
      materialShippingDate: new Date("2026-08-21T00:00:00.000Z"),
      materialTransport: "Logística Sur",
      unexpectedSecret: "root",
      mutation: { method: "DELETE", routeTarget: "/forbidden" },
    }] as never);

    const view = await getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx,
      request: { mode: "production", surface: "global" },
    });

    expect(view.surgeries).toHaveLength(1);
    expect(view.surgeries[0]).toMatchObject({
      id: "s-sensitive",
      patient: { id: "patient-1", firstName: "Paz", lastName: "Uno", legalName: null },
      materialShippingDate: new Date("2026-08-21T00:00:00.000Z"),
      materialTransport: "Logística Sur",
    });
    expect(view.surgeries[0]).not.toHaveProperty("unexpectedSecret");
    expect(view.surgeries[0]).not.toHaveProperty("mutation");
    expect(view.surgeries[0].patient).not.toHaveProperty("secret");
    expect(Object.keys(view.surgeries[0]).sort()).toEqual([
      "branchId",
      "cancelledDate",
      "classification",
      "companyId",
      "coordinatorAssignment",
      "coordinatorAssignments",
      "createdAt",
      "cxStatus",
      "description",
      "doctor",
      "doctorId",
      "id",
      "institution",
      "institutionId",
      "materialAvailabilityDate",
      "materialShippingDate",
      "materialTransport",
      "notes",
      "patient",
      "patientId",
      "payer",
      "payerContactId",
      "performedDate",
      "prepStatus",
      "priority",
      "probableDate",
      "scheduledDate",
      "source",
      "surgeryDate",
      "updatedAt",
      "visibleNumber",
    ].sort());
    expectNoWrites(prisma);
  });

  it.each([
    { mode: "production" as const, surface: "global" as const },
    { mode: "dev-preview" as const, surface: "global" as const },
  ])("excluye filas upstream de otra empresa en $mode global", async (request) => {
    const prisma = db();
    const view = await getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx,
      request,
      env,
    });

    expect(view.surgeries.map((row) => row.id)).toEqual(["s1", "s2"]);
    expect(view.surgeries.every((row) => row.companyId === ctx.companyId)).toBe(true);
    expectNoWrites(prisma);
  });

  it("rechaza target stale/manipulado antes de leer cirugías y sin writes", async () => {
    const prisma = db();
    await expect(getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx,
      request: { mode: "dev-preview", surface: "personal", subjectContactId: "foreign" },
      env,
    })).rejects.toMatchObject({
      status: 404,
      code: "coordination_preview_target_not_found",
    });
    expect(prisma.surgery.findMany).not.toHaveBeenCalled();
    expectNoWrites(prisma);
  });

  it("falla cerrado ante capability stale antes de targets o cirugías y sin writes", async () => {
    const prisma = db();
    prisma.company.findUnique.mockResolvedValue({
      id: "company-1", name: "Districorr DEV", isActive: true,
      organization: { slug: "ossum-dev", isActive: true }, users: [],
    });

    await expect(getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-1",
      ctx,
      request: { mode: "dev-preview", surface: "personal", subjectContactId: "contact-1" },
      env,
    })).rejects.toMatchObject({ status: 403, code: "coordination_preview_denied" });

    expect(prisma.contact.findMany).not.toHaveBeenCalled();
    expect(prisma.surgery.findMany).not.toHaveBeenCalled();
    expectNoWrites(prisma);
  });

  it("rechaza contexto cross-company antes de enumerar contactos o casos", async () => {
    const prisma = db();
    await expect(getCoordinationView({
      prisma: prisma as never,
      routeCompanyId: "company-2",
      ctx,
      request: { mode: "production", surface: "global" },
    })).rejects.toMatchObject({ status: 403, code: "company_access_denied" });
    expect(prisma.contact.findMany).not.toHaveBeenCalled();
    expect(prisma.surgery.findMany).not.toHaveBeenCalled();
  });
});
