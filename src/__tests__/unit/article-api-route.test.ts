import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyReadAccess: vi.fn(),
  requireArticleMutationAccess: vi.fn(),
  getArticle: vi.fn(),
  updateArticle: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({
  requireCompanyReadAccess: mocks.requireCompanyReadAccess,
}));
vi.mock("@/lib/permissions/article", () => ({
  requireArticleMutationAccess: mocks.requireArticleMutationAccess,
}));
vi.mock("@/lib/services/article.service", () => ({
  getArticle: mocks.getArticle,
  updateArticle: mocks.updateArticle,
}));
vi.mock("@/lib/prisma", () => ({ default: { marker: "prisma-db" } }));

import { GET, PATCH } from "@/app/api/companies/[companyId]/articles/[articleId]/route";

describe("Article API Routes — GET and PATCH /api/companies/[companyId]/articles/[articleId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/companies/[companyId]/articles/[articleId]", () => {
    it("returns 200 and article data when authenticated and authorized", async () => {
      mocks.getApiAuthContext.mockResolvedValue({
        companyId: "comp-sa-01",
        actorUserId: "user-1",
      });
      mocks.getArticle.mockResolvedValue({
        id: "art-001",
        sku: "PROT-01",
        description: "Prótesis Rodilla",
        vatTreatment: "GRAVADO",
        vatRate: 10.5,
        ivaKey: "10.5",
      });

      const req = new Request("http://localhost/api/companies/comp-sa-01/articles/art-001", {
        method: "GET",
      });
      const res = await GET(req, {
        params: Promise.resolve({ companyId: "comp-sa-01", articleId: "art-001" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe("art-001");
      expect(body.data.vatTreatment).toBe("GRAVADO");
      expect(body.data.vatRate).toBe(10.5);
      expect(body.data.ivaKey).toBe("10.5");
      expect(mocks.requireCompanyReadAccess).toHaveBeenCalled();
      expect(mocks.getArticle).toHaveBeenCalledWith({ marker: "prisma-db" }, "comp-sa-01", "art-001");
    });

    it("rejects unauthorized or alien company reading article with 403", async () => {
      mocks.getApiAuthContext.mockResolvedValueOnce({
        companyId: "comp-alien",
        actorUserId: "user-alien",
      });
      mocks.requireCompanyReadAccess.mockImplementationOnce(() => {
        throw new ApiError(403, "forbidden", "Forbidden");
      });

      const req = new Request("http://localhost/api/companies/comp-alien/articles/art-001", {
        method: "GET",
      });
      const res = await GET(req, {
        params: Promise.resolve({ companyId: "comp-alien", articleId: "art-001" }),
      });

      expect(res.status).toBe(403);
      expect(mocks.getArticle).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/companies/[companyId]/articles/[articleId]", () => {
    it("updates article VAT rate to GRAVADO 10.5% and returns 200", async () => {
      mocks.getApiAuthContext.mockResolvedValue({
        companyId: "comp-sa-01",
        actorUserId: "user-editor",
      });
      mocks.updateArticle.mockResolvedValue({
        id: "art-001",
        sku: "PROT-01",
        vatTreatment: "GRAVADO",
        vatRate: 10.5,
        ivaKey: "10.5",
      });

      const req = new Request("http://localhost/api/companies/comp-sa-01/articles/art-001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vatTreatment: "GRAVADO",
          vatRate: 10.5,
        }),
      });

      const res = await PATCH(req, {
        params: Promise.resolve({ companyId: "comp-sa-01", articleId: "art-001" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.vatTreatment).toBe("GRAVADO");
      expect(body.data.vatRate).toBe(10.5);
      expect(mocks.requireArticleMutationAccess).toHaveBeenCalled();
      expect(mocks.updateArticle).toHaveBeenCalledWith(
        { marker: "prisma-db" },
        "comp-sa-01",
        "art-001",
        expect.objectContaining({ vatTreatment: "GRAVADO", vatRate: 10.5 }),
        "user-editor"
      );
    });

    it("rejects alien company or user without mutation permission on PATCH", async () => {
      mocks.getApiAuthContext.mockResolvedValueOnce({
        companyId: "comp-alien",
        actorUserId: "user-read-only",
      });
      mocks.requireArticleMutationAccess.mockImplementationOnce(() => {
        throw new ApiError(403, "forbidden", "Mutation forbidden");
      });

      const req = new Request("http://localhost/api/companies/comp-alien/articles/art-001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vatTreatment: "GRAVADO",
          vatRate: 10.5,
        }),
      });

      const res = await PATCH(req, {
        params: Promise.resolve({ companyId: "comp-alien", articleId: "art-001" }),
      });

      expect(res.status).toBe(403);
      expect(mocks.updateArticle).not.toHaveBeenCalled();
    });

    it("rejects unsupported VAT rate in schema validator with 400 bad request", async () => {
      mocks.getApiAuthContext.mockResolvedValue({
        companyId: "comp-sa-01",
        actorUserId: "user-editor",
      });

      const req = new Request("http://localhost/api/companies/comp-sa-01/articles/art-001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vatTreatment: "GRAVADO",
          vatRate: 15, // Unsupported rate
        }),
      });

      const res = await PATCH(req, {
        params: Promise.resolve({ companyId: "comp-sa-01", articleId: "art-001" }),
      });

      expect(res.status).toBe(400);
      const err = await res.json();
      expect(err.error).toBeDefined();
      expect(mocks.updateArticle).not.toHaveBeenCalled();
    });

    it("rejects EXENTO with non-zero rate with 400 bad request", async () => {
      mocks.getApiAuthContext.mockResolvedValue({
        companyId: "comp-sa-01",
        actorUserId: "user-editor",
      });

      const req = new Request("http://localhost/api/companies/comp-sa-01/articles/art-001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vatTreatment: "EXENTO",
          vatRate: 21, // Non-zero rate for EXENTO is invalid
        }),
      });

      const res = await PATCH(req, {
        params: Promise.resolve({ companyId: "comp-sa-01", articleId: "art-001" }),
      });

      expect(res.status).toBe(400);
      expect(mocks.updateArticle).not.toHaveBeenCalled();
    });

    it("returns 400 on malformed JSON body", async () => {
      mocks.getApiAuthContext.mockResolvedValue({
        companyId: "comp-sa-01",
        actorUserId: "user-editor",
      });

      const req = new Request("http://localhost/api/companies/comp-sa-01/articles/art-001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{",
      });

      const res = await PATCH(req, {
        params: Promise.resolve({ companyId: "comp-sa-01", articleId: "art-001" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("invalid_json_body");
    });
  });
});
