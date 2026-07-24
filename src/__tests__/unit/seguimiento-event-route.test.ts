import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getApiAuthContext,
  resolveCompanySurgery,
  editSeguimientoEntry,
  createAuthorizationEvidence,
  createSeguimientoEntry,
} = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  resolveCompanySurgery: vi.fn(),
  editSeguimientoEntry: vi.fn(),
  createAuthorizationEvidence: vi.fn(),
  createSeguimientoEntry: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }));
vi.mock("@/lib/surgery/resolve-company-surgery", () => ({ resolveCompanySurgery }));
vi.mock("@/lib/prisma", () => ({ default: { __mockPrisma: true } }));
vi.mock("@/lib/services/seguimiento.service", () => ({
  editSeguimientoEntry,
  createAuthorizationEvidence,
  createSeguimientoEntry,
  listSeguimientoEntries: vi.fn(),
}));

import { PATCH } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/[entryId]/route";
import { POST as createAuthorization } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/[entryId]/authorization-evidence/route";
import { POST as createSeguimiento } from "@/app/api/companies/[companyId]/surgeries/[surgeryId]/seguimiento/route";

const companyId = "company-1";
const persistedSurgeryId = "surgery-id-1";

function authContext(role = "admin") {
  return {
    companyId,
    actorUserId: "user-1",
    role,
    user: {
      id: "user-1",
      email: "admin@example.com",
      firstName: "Ada",
      lastName: "Admin",
    },
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-2",
    companyId,
    surgeryId: persistedSurgeryId,
    entryType: "note",
    content: "Updated note",
    summary: null,
    authorId: "user-1",
    authorName: "Ada Admin",
    evidenceRef: null,
    createdAt: new Date("2026-07-15T12:00:00.000Z"),
    updatedAt: new Date("2026-07-15T12:00:00.000Z"),
    ...overrides,
  };
}

describe("Seguimiento event mutation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue(authContext());
    resolveCompanySurgery.mockResolvedValue({ id: persistedSurgeryId });
    editSeguimientoEntry.mockResolvedValue(row());
    createAuthorizationEvidence.mockResolvedValue(
      row({ id: "authorization-1", entryType: "authorization_evidence" })
    );
    createSeguimientoEntry.mockResolvedValue(row());
  });

  it("PATCHes a note with the persisted surgery ID and server-derived actor", async () => {
    const response = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ content: " Updated note " }) }),
      { params: Promise.resolve({ companyId, surgeryId: "42", entryId: "entry-1" }) }
    );

    expect(response.status).toBe(200);
    expect(resolveCompanySurgery).toHaveBeenCalledWith(companyId, "42");
    expect(editSeguimientoEntry).toHaveBeenCalledWith(
      { __mockPrisma: true },
      "entry-1",
      companyId,
      expect.objectContaining({
        surgeryId: persistedSurgeryId,
        actor: { userId: "user-1", displayName: "Ada Admin" },
        edits: { content: "Updated note", summary: undefined, priority: undefined, highlighted: undefined, mentions: undefined, imageEvidence: undefined },
      })
    );
  });

  it("creates source-linked authorization evidence only through the guarded nested route", async () => {
    const response = await createAuthorization(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ content: " Approved " }) }),
      { params: Promise.resolve({ companyId, surgeryId: "42", entryId: "source-1" }) }
    );

    expect(response.status).toBe(201);
    expect(createAuthorizationEvidence).toHaveBeenCalledWith(
      { __mockPrisma: true },
      expect.objectContaining({
        sourceEntryId: "source-1",
        surgeryId: persistedSurgeryId,
        companyId,
        actor: { userId: "user-1", displayName: "Ada Admin" },
        input: { content: "Approved", summary: undefined, imageEvidence: undefined },
      })
    );
  });

  it.each(["coordinator", "operator", "other-role"])(
    "denies %s before malformed PATCH body or surgery lookup",
    async (role) => {
      getApiAuthContext.mockResolvedValue(authContext(role));

      const response = await PATCH(
        new Request("http://localhost", { method: "PATCH", body: "{" }),
        { params: Promise.resolve({ companyId, surgeryId: "missing", entryId: "entry-1" }) }
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: { code: "company_mutation_access_denied", message: "Company mutation access denied" },
      });
      expect(resolveCompanySurgery).not.toHaveBeenCalled();
      expect(editSeguimientoEntry).not.toHaveBeenCalled();
    }
  );

  it.each(["coordinator", "operator", "other-role"])(
    "denies %s before malformed authorization body or source lookup",
    async (role) => {
      getApiAuthContext.mockResolvedValue(authContext(role));

      const response = await createAuthorization(
        new Request("http://localhost", { method: "POST", body: "{" }),
        { params: Promise.resolve({ companyId, surgeryId: "missing", entryId: "source-1" }) }
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: { code: "company_mutation_access_denied", message: "Company mutation access denied" },
      });
      expect(resolveCompanySurgery).not.toHaveBeenCalled();
      expect(createAuthorizationEvidence).not.toHaveBeenCalled();
    }
  );

  it("preserves service error envelopes and makes no write for cross-surgery sources", async () => {
    const { notFound } = await import("@/lib/api/errors");
    createAuthorizationEvidence.mockRejectedValueOnce(
      notFound("Seguimiento entry not found", "seguimiento_entry_not_found")
    );

    const response = await createAuthorization(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ content: "Approved" }) }),
      { params: Promise.resolve({ companyId, surgeryId: "42", entryId: "source-in-another-surgery" }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "seguimiento_entry_not_found", message: "Seguimiento entry not found" },
    });
    expect(createAuthorizationEvidence).toHaveBeenCalledTimes(1);
  });

  it("returns the validator 400 envelope before surgery resolution or an authorization write", async () => {
    const response = await createAuthorization(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ content: " " }) }),
      { params: Promise.resolve({ companyId, surgeryId: "42", entryId: "source-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "missing_authorization_content",
        message: "authorization evidence content is required and must be a non-empty string",
      },
    });
    expect(resolveCompanySurgery).not.toHaveBeenCalled();
    expect(createAuthorizationEvidence).not.toHaveBeenCalled();
  });

  it("preserves the immutable-source 409 envelope without a create", async () => {
    const { conflict } = await import("@/lib/api/errors");
    createAuthorizationEvidence.mockRejectedValueOnce(
      conflict("Authorization evidence cannot be its own source", "authorization_evidence_invalid_source")
    );

    const response = await createAuthorization(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ content: "Approved" }) }),
      { params: Promise.resolve({ companyId, surgeryId: "42", entryId: "authorization-source" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "authorization_evidence_invalid_source",
        message: "Authorization evidence cannot be its own source",
      },
    });
  });

  it.each([
    { entryType: "authorization_evidence", content: "Approved" },
    { entryType: "authorization_evidence" },
    { entryType: "authorization_evidence", evidenceRef: { sourceEntryId: "forged" } },
  ])("rejects every client-crafted generic authorization payload", async (body) => {
    const response = await createSeguimiento(
      new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }),
      { params: Promise.resolve({ companyId, surgeryId: "42" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "authorization_evidence_requires_dedicated_route",
        message: "Authorization evidence must use a dedicated authorization endpoint",
      },
    });
    expect(resolveCompanySurgery).not.toHaveBeenCalled();
    expect(createSeguimientoEntry).not.toHaveBeenCalled();
  });
});
