import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require("dotenv");
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
});

const { getApiAuthContext } = vi.hoisted(() => ({ getApiAuthContext: vi.fn() }));
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }));

import prisma from "@/lib/prisma";
import { GET as listPresupuestos, POST as createPresupuesto } from "@/app/api/companies/[companyId]/presupuestos/route";
import { DELETE as deletePresupuesto, GET as getPresupuesto, PATCH as replacePresupuesto } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/route";
import { POST as emitPresupuesto } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/emitir/route";
import { POST as createRevision } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/versions/route";
import { PATCH as stateCommand } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/state/route";

const PREFIX = `it-presupuesto-authority-${Date.now()}`;
const ORG_ID = `${PREFIX}-org`;
const COMPANY_ID = `${PREFIX}-company`;
const USER_ID = `${PREFIX}-user`;
const PATIENT_ID = `${PREFIX}-patient`;
const SURGERY_ID = `${PREFIX}-surgery`;
const BRANCH_ID = `${PREFIX}-branch`;

const AUTH = {
  actorUserId: USER_ID,
  supabaseAuthId: `${PREFIX}-supabase`,
  companyId: COMPANY_ID,
  role: "admin",
  source: "dev-header" as const,
};

type Body<T = unknown> = { data?: T; error?: { code?: string; message?: string } };
const json = async <T,>(response: Response) => JSON.parse(await response.text()) as Body<T>;
const params = (values: Record<string, string>) => ({ params: Promise.resolve(values) }) as never;

const commercialBody = (surgeryId = SURGERY_ID) => ({
  surgeryId,
  branchId: BRANCH_ID,
  clientContactId: PATIENT_ID,
  payerContactId: PATIENT_ID,
  title: "Implantes",
  currency: "ARS",
  documentDate: "2026-08-31",
  paymentTerms: "Contado",
  priceListCode: "GENERAL",
  legend: "Cotización firme sujeta a la vigencia indicada.",
  notes: "Test authority",
  validUntil: "2026-09-30",
  generalDiscountRate: "5",
  commercial: {
    pricingMode: "FIRM",
    firmPrice: {
      coordinator: "Coordinación",
      quotationContact: "Cotizaciones",
      includedMaterials: ["Implante"],
      excludedMaterials: [],
      availability: "Sujeta a confirmación",
      operationalClarifications: "Entrega coordinada",
      surgicalAssumptions: "Técnica confirmada",
    },
  },
  items: [{ description: "Implante", quantity: "2", unit: "unidad", unitPrice: "1000", discountRate: "10", taxRate: "21" }],
});

function request(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function cleanupPresupuestos() {
  await prisma.presupuesto.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.presupuestoFamily.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.auditEvent.deleteMany({ where: { companyId: COMPANY_ID } });
}

async function cleanupBase() {
  await cleanupPresupuestos();
  await prisma.surgery.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.branch.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.contactCompanyLink.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.contact.deleteMany({ where: { id: PATIENT_ID } });
  await prisma.userCompanyAccess.deleteMany({ where: { companyId: COMPANY_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.company.deleteMany({ where: { id: COMPANY_ID } });
  await prisma.organization.deleteMany({ where: { id: ORG_ID } });
}

async function createDraft() {
  const response = await createPresupuesto(
    request(`http://localhost/api/companies/${COMPANY_ID}/presupuestos`, "POST", commercialBody()),
    params({ companyId: COMPANY_ID })
  );
  expect(response.status).toBe(201);
  return (await json<{ id: string; revision: number; state: string; total: string; commercialSnapshot: unknown }>(response)).data!;
}

describe("Presupuesto authority API integration (Supabase DEV)", () => {
  beforeAll(async () => {
    await cleanupBase();
    await prisma.organization.create({ data: { id: ORG_ID, name: "Integration", slug: ORG_ID } });
    await prisma.company.create({ data: { id: COMPANY_ID, organizationId: ORG_ID, name: "Integration" } });
    await prisma.branch.create({ data: { id: BRANCH_ID, companyId: COMPANY_ID, name: "Central" } });
    await prisma.user.create({ data: { id: USER_ID, email: `${PREFIX}@test.invalid`, firstName: "Integration", lastName: "Tester", supabaseAuthId: AUTH.supabaseAuthId } });
    await prisma.userCompanyAccess.create({ data: { userId: USER_ID, companyId: COMPANY_ID, role: "admin" } });
    await prisma.contact.create({ data: { id: PATIENT_ID, legalName: "Cliente Test" } });
    await prisma.contactCompanyLink.create({ data: { contactId: PATIENT_ID, companyId: COMPANY_ID, role: "patient" } });
    await prisma.surgery.create({ data: { id: SURGERY_ID, companyId: COMPANY_ID, patientId: PATIENT_ID, visibleNumber: `${PREFIX}-CX` } });
  });

  beforeEach(async () => {
    await cleanupPresupuestos();
    getApiAuthContext.mockReset();
    getApiAuthContext.mockResolvedValue(AUTH);
  });

  afterAll(async () => {
    await cleanupBase();
    await prisma.$disconnect();
  });

  it("persists server totals and snapshots, edits a draft, and keeps emitted history immutable until replacement emission", async () => {
    const draft = await createDraft();
    expect(draft.state).toBe("Borrador");
    expect(draft.total).toBe("2069.1");
    expect(draft.commercialSnapshot).toMatchObject({ company: { id: COMPANY_ID }, branch: { id: BRANCH_ID } });

    const replaceResponse = await replacePresupuesto(
      request("http://localhost", "PATCH", { ...commercialBody(), surgeryId: undefined, expectedRevision: draft.revision, notes: "Edited" }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    const replaced = (await json<{ revision: number }>(replaceResponse)).data!;
    expect(replaceResponse.status).toBe(200);
    expect(replaced.revision).toBe(2);

    const emittedResponse = await emitPresupuesto(
      request("http://localhost", "POST", { expectedRevision: replaced.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    const emitted = (await json<{ revision: number; state: string }>(emittedResponse)).data!;
    expect(emitted.state).toBe("Emitido");

    const revisionResponse = await createRevision(
      request("http://localhost", "POST", { expectedRevision: emitted.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    const revision = (await json<{ id: string; revision: number; state: string }>(revisionResponse)).data!;
    expect(revisionResponse.status).toBe(201);
    expect(revision.state).toBe("Borrador");
    expect((await prisma.presupuesto.findUnique({ where: { id: draft.id } }))?.state).toBe("Emitido");

    const replacementResponse = await emitPresupuesto(
      request("http://localhost", "POST", { expectedRevision: revision.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: revision.id })
    );
    expect(replacementResponse.status).toBe(200);
    expect((await prisma.presupuesto.findUnique({ where: { id: draft.id } }))?.state).toBe("Reemplazado");
  });

  it("returns 409 for a stale revision and records conflict without changing the draft", async () => {
    const draft = await createDraft();
    const response = await emitPresupuesto(
      request("http://localhost", "POST", { expectedRevision: draft.revision + 1 }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    expect(response.status).toBe(409);
    expect(await json(response)).toMatchObject({ error: { code: "presupuesto_conflict" } });
    expect((await prisma.presupuesto.findUnique({ where: { id: draft.id } }))?.state).toBe("Borrador");
    expect(await prisma.auditEvent.count({ where: { entityId: draft.id, action: "presupuesto_conflict" } })).toBe(1);
  });

  it("allows one winner when two Surgery-linked family creations race", async () => {
    const create = () => createPresupuesto(
      request("http://localhost", "POST", commercialBody()),
      params({ companyId: COMPANY_ID })
    );
    const responses = await Promise.all([create(), create()]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.presupuestoFamily.count({ where: { companyId: COMPANY_ID, surgeryId: SURGERY_ID } })).toBe(1);
    expect(await prisma.auditEvent.count({
      where: { companyId: COMPANY_ID, entityId: SURGERY_ID, action: "presupuesto_conflict" },
    })).toBe(1);
  });

  it("creates independent standalone families without a Surgery", async () => {
    const createStandalone = () => createPresupuesto(
      request("http://localhost", "POST", { ...commercialBody(), surgeryId: undefined }),
      params({ companyId: COMPANY_ID })
    );
    const first = await createStandalone();
    const second = await createStandalone();

    expect([first.status, second.status]).toEqual([201, 201]);
    expect(await prisma.presupuestoFamily.count({ where: { companyId: COMPANY_ID, surgeryId: null } })).toBe(2);
  });

  it("rejects missing mandatory and conditional commercial data", async () => {
    const missingPaymentTerms = { ...commercialBody(), paymentTerms: undefined };
    const missingFirmPrice = { ...commercialBody(), commercial: { pricingMode: "FIRM" } };
    const invalidEstimativeLegend = {
      ...commercialBody(),
      commercial: { pricingMode: "ESTIMATIVE" },
      legend: "Non-canonical legend",
    };

    for (const body of [missingPaymentTerms, missingFirmPrice, invalidEstimativeLegend]) {
      const response = await createPresupuesto(
        request("http://localhost", "POST", body),
        params({ companyId: COMPANY_ID })
      );
      expect(response.status).toBe(400);
      expect(await json(response)).toMatchObject({ error: { code: expect.stringMatching(/^invalid_presupuesto/) } });
    }
    expect(await prisma.presupuestoFamily.count({ where: { companyId: COMPANY_ID } })).toBe(0);
  });

  it("rejects PATCH and DELETE against emitted history without changing it", async () => {
    const draft = await createDraft();
    const emittedResponse = await emitPresupuesto(
      request("http://localhost", "POST", { expectedRevision: draft.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    const emitted = (await json<{ revision: number }>(emittedResponse)).data!;
    const revisionResponse = await createRevision(
      request("http://localhost", "POST", { expectedRevision: emitted.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    const revision = (await json<{ id: string; revision: number }>(revisionResponse)).data!;
    await emitPresupuesto(
      request("http://localhost", "POST", { expectedRevision: revision.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: revision.id })
    );
    const historyBefore = await prisma.presupuesto.findUniqueOrThrow({ where: { id: draft.id } });

    const patch = await replacePresupuesto(
      request("http://localhost", "PATCH", { ...commercialBody(), surgeryId: undefined, expectedRevision: historyBefore.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    const remove = await deletePresupuesto(
      request("http://localhost", "DELETE", { expectedRevision: historyBefore.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );

    expect([patch.status, remove.status]).toEqual([409, 409]);
    expect(await prisma.presupuesto.findUnique({ where: { id: draft.id } })).toEqual(historyBefore);
  });

  it("records complete accepted audit evidence with actor, lineage, header, and items", async () => {
    const draft = await createDraft();
    const audit = await prisma.auditEvent.findFirstOrThrow({
      where: { companyId: COMPANY_ID, entityId: draft.id, action: "presupuesto_draft_created" },
    });

    expect(audit).toMatchObject({ companyId: COMPANY_ID, userId: USER_ID, entityType: "Presupuesto", entityId: draft.id });
    expect(audit.newValue).toMatchObject({
      id: draft.id,
      familyId: expect.any(String),
      surgeryId: SURGERY_ID,
      parentPresupuestoId: null,
      sourcePresupuestoId: null,
      branchId: BRANCH_ID,
      clientContactId: PATIENT_ID,
      payerContactId: PATIENT_ID,
      createdById: USER_ID,
      items: [expect.objectContaining({ description: "Implante", quantity: "2", unitPrice: "1000", taxRate: "21" })],
    });
  });

  it("allows one winner for concurrent emit and revision commands", async () => {
    const draft = await createDraft();
    const emit = () => emitPresupuesto(
      request("http://localhost", "POST", { expectedRevision: draft.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    const emissions = await Promise.all([emit(), emit()]);
    expect(emissions.map((response) => response.status).sort()).toEqual([200, 409]);

    const current = await prisma.presupuesto.findUniqueOrThrow({ where: { id: draft.id } });
    const revise = () => createRevision(
      request("http://localhost", "POST", { expectedRevision: current.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    const revisions = await Promise.all([revise(), revise()]);
    expect(revisions.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.presupuesto.count({ where: { familyId: current.familyId, slot: "DRAFT" } })).toBe(1);
  });

  it("uses authenticated company scope for list/get and explicit state commands", async () => {
    const draft = await createDraft();
    const emittedResponse = await emitPresupuesto(
      request("http://localhost", "POST", { expectedRevision: draft.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    const emitted = (await json<{ revision: number }>(emittedResponse)).data!;
    const approvedResponse = await stateCommand(
      request("http://localhost", "PATCH", { command: "approve", expectedRevision: emitted.revision }),
      params({ companyId: COMPANY_ID, presupuestoId: draft.id })
    );
    expect(approvedResponse.status).toBe(200);

    const listed = await listPresupuestos(new Request(`http://localhost?surgeryId=${SURGERY_ID}`), params({ companyId: COMPANY_ID }));
    expect((await json<Array<{ id: string }>>(listed)).data?.[0].id).toBe(draft.id);

    getApiAuthContext.mockResolvedValueOnce({ ...AUTH, companyId: "foreign-company" });
    const hidden = await getPresupuesto(new Request("http://localhost"), params({ companyId: "foreign-company", presupuestoId: draft.id }));
    expect(hidden.status).toBe(404);
  });

  it("returns non-disclosing 404 responses for every foreign-company mutation", async () => {
    const draft = await createDraft();
    getApiAuthContext.mockResolvedValue({ ...AUTH, companyId: "foreign-company" });
    const routeParams = params({ companyId: "foreign-company", presupuestoId: draft.id });
    const responses = await Promise.all([
      replacePresupuesto(request("http://localhost", "PATCH", { ...commercialBody(), surgeryId: undefined, expectedRevision: draft.revision }), routeParams),
      deletePresupuesto(request("http://localhost", "DELETE", { expectedRevision: draft.revision }), routeParams),
      emitPresupuesto(request("http://localhost", "POST", { expectedRevision: draft.revision }), routeParams),
      createRevision(request("http://localhost", "POST", { expectedRevision: draft.revision }), routeParams),
      stateCommand(request("http://localhost", "PATCH", { command: "approve", expectedRevision: draft.revision }), routeParams),
    ]);

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404, 404]);
    for (const response of responses) {
      expect(JSON.stringify(await json(response))).not.toContain("Implantes");
    }
    expect((await prisma.presupuesto.findUniqueOrThrow({ where: { id: draft.id } })).state).toBe("Borrador");
  });
});
