import { describe, expect, it, vi } from "vitest";

import type { ApiAuthContext } from "@/lib/api/auth-context";
import {
  requireCoordinationPreviewCapability,
  requirePreviewTarget,
} from "@/lib/services/coordination-preview-capability.service";

const ctx: ApiAuthContext = {
  actorUserId: "actor-1",
  supabaseAuthId: "supabase-1",
  companyId: "company-1",
  role: "admin",
  user: { id: "actor-1", email: "admin@x.test", firstName: "Ana", lastName: "Admin" },
  activeCompany: { id: "company-1", name: "Districorr DEV" },
  source: "supabase-auth",
};
const env = {
  NODE_ENV: "test",
  OSSUM_DEPLOYMENT_TIER: "development",
  OSSUM_ENABLE_COORDINATOR_PREVIEW: "true",
  OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID: "company-1",
} as NodeJS.ProcessEnv;

function prisma() {
  return {
    company: { findUnique: vi.fn().mockResolvedValue({
      id: "company-1",
      name: "Districorr DEV",
      isActive: true,
      organization: { slug: "ossum-dev", isActive: true },
      users: [{ id: "access-1" }],
    }) },
    contact: { findMany: vi.fn().mockResolvedValue([
      { id: "contact-1", email: null, firstName: null, lastName: null, legalName: "Nelson DEV" },
    ]) },
    surgery: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    surgeryContactAssignment: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userModuleViewPreference: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
    auditEvent: { create: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  };
}

function expectNoReadOrWrites(db: ReturnType<typeof prisma>) {
  expect(db.surgery.findMany).not.toHaveBeenCalled();
  expect(db.$transaction).not.toHaveBeenCalled();
  for (const operation of ["create", "update", "delete"] as const) {
    expect(db.surgery[operation]).not.toHaveBeenCalled();
    expect(db.surgeryContactAssignment[operation]).not.toHaveBeenCalled();
    expect(db.userModuleViewPreference[operation]).not.toHaveBeenCalled();
  }
  expect(db.userModuleViewPreference.upsert).not.toHaveBeenCalled();
  expect(db.auditEvent.create).not.toHaveBeenCalled();
  expect(db.auditEvent.createMany).not.toHaveBeenCalled();
}

describe("coordination preview capability", () => {
  it("requiere todos los gates exactos y deriva targets mínimos", async () => {
    const db = prisma();
    await expect(requireCoordinationPreviewCapability({
      prisma: db as never,
      routeCompanyId: "company-1",
      ctx,
      env,
    })).resolves.toEqual({
      enabled: true,
      targets: [{ contactId: "contact-1", label: "Nelson DEV" }],
    });
    expect(db.company.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "company-1" },
      select: expect.objectContaining({ users: expect.objectContaining({
        where: expect.objectContaining({ userId: "actor-1", role: "admin", isActive: true }),
      }) }),
    }));
  });

  it.each([
    ["env ausente", { NODE_ENV: "test" }, ctx, "company-1"],
    ["tier", { ...env, OSSUM_DEPLOYMENT_TIER: "production" }, ctx, "company-1"],
    ["flag", { ...env, OSSUM_ENABLE_COORDINATOR_PREVIEW: "false" }, ctx, "company-1"],
    ["id vacío", { ...env, OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID: "" }, ctx, "company-1"],
    ["ruta", env, ctx, "company-2"],
    ["contexto", env, { ...ctx, companyId: "company-2" }, "company-1"],
    ["dev header", env, { ...ctx, source: "dev-header", supabaseAuthId: null }, "company-1"],
    ["rol", env, { ...ctx, role: "manager" }, "company-1"],
  ])("deniega sin revelar el gate: %s", async (_name, candidateEnv, candidateCtx, routeCompanyId) => {
    await expect(requireCoordinationPreviewCapability({
      prisma: prisma() as never,
      routeCompanyId,
      ctx: candidateCtx as ApiAuthContext,
      env: candidateEnv as NodeJS.ProcessEnv,
    })).rejects.toMatchObject({ status: 403, code: "coordination_preview_denied" });
  });

  it("deniega marcadores DB copiados con ID/contexto no exactos y accesos inactivos", async () => {
    const db = prisma();
    db.company.findUnique.mockResolvedValue({
      id: "company-1",
      name: "Districorr DEV",
      isActive: true,
      organization: { slug: "ossum-dev", isActive: true },
      users: [],
    });
    await expect(requireCoordinationPreviewCapability({
      prisma: db as never, routeCompanyId: "company-1", ctx, env,
    })).rejects.toMatchObject({ code: "coordination_preview_denied" });
    expect(db.contact.findMany).not.toHaveBeenCalled();
    expectNoReadOrWrites(db);
  });

  it.each([
    ["id DB", { id: "company-2", name: "Districorr DEV", isActive: true, organization: { slug: "ossum-dev", isActive: true }, users: [{ id: "a" }] }],
    ["nombre", { id: "company-1", name: "districorr dev", isActive: true, organization: { slug: "ossum-dev", isActive: true }, users: [{ id: "a" }] }],
    ["compañía inactiva", { id: "company-1", name: "Districorr DEV", isActive: false, organization: { slug: "ossum-dev", isActive: true }, users: [{ id: "a" }] }],
    ["slug", { id: "company-1", name: "Districorr DEV", isActive: true, organization: { slug: "otro", isActive: true }, users: [{ id: "a" }] }],
    ["organización inactiva", { id: "company-1", name: "Districorr DEV", isActive: true, organization: { slug: "ossum-dev", isActive: false }, users: [{ id: "a" }] }],
  ])("deniega marcador exacto inválido: %s", async (_name, company) => {
    const db = prisma();
    db.company.findUnique.mockResolvedValue(company);
    await expect(requireCoordinationPreviewCapability({
      prisma: db as never, routeCompanyId: "company-1", ctx, env,
    })).rejects.toMatchObject({ status: 403, code: "coordination_preview_denied" });
  });

  it("rechaza targets manipulados/cross-company sin distinguirlos", () => {
    const capability = { enabled: true as const, targets: [{ contactId: "contact-1", label: "Uno" }] };
    expect(() => requirePreviewTarget(capability, "foreign-contact"))
      .toThrowError(expect.objectContaining({
        status: 404,
        code: "coordination_preview_target_not_found",
      }));
  });

  it("rechaza un target stale sin cirugía ni writes", () => {
    const db = prisma();
    const staleCapability = {
      enabled: true as const,
      targets: [{ contactId: "contact-current", label: "Actual" }],
    };

    expect(() => requirePreviewTarget(staleCapability, "contact-stale"))
      .toThrowError(expect.objectContaining({
        status: 404,
        code: "coordination_preview_target_not_found",
      }));
    expectNoReadOrWrites(db);
  });
});
