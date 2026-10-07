import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, getApiAuthContext, requireCompanyReadAccess, getCoordinationView } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  getApiAuthContext: vi.fn(),
  requireCompanyReadAccess: vi.fn(),
  getCoordinationView: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }));
vi.mock("@/lib/api/client", () => ({ apiFetch }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess }));
vi.mock("@/lib/services/coordination-view.service", () => ({ getCoordinationView }));
vi.mock("@/lib/prisma", () => ({ default: { marker: "prisma" } }));

import * as route from "@/app/api/companies/[companyId]/coordination/view/route";
import { fetchCoordinationView } from "@/lib/api/coordination-view";
import { ApiError } from "@/lib/api/errors";
import { CoordinationMetricFilters } from "@/components/coordinadores/CoordinationMetricFilters";
import { CoordinationAdvancedFilters, createEmptyAdvancedFilters } from "@/components/coordinadores/CoordinationAdvancedFilters";
import type { AdvancedFilters, MetricKey } from "@/components/coordinadores/coordination-filtering";

const ctx = {
  actorUserId: "actor-real",
  supabaseAuthId: "supabase-real",
  companyId: "company-1",
  role: "admin",
  user: { id: "actor-real", email: "a@x.test", firstName: "Ana", lastName: "Admin" },
  activeCompany: { id: "company-1", name: "Districorr DEV" },
  source: "supabase-auth",
};

function call(query: string) {
  return route.GET(
    new Request(`http://localhost/api/companies/company-1/coordination/view?${query}`, {
      headers: { Authorization: "Bearer real-token" },
    }),
    { params: Promise.resolve({ companyId: "company-1" }) }
  );
}

function FilterInteractionHarness() {
  const [metrics, setMetrics] = useState<ReadonlySet<MetricKey>>(() => new Set());
  const [advanced, setAdvanced] = useState<AdvancedFilters>(() => createEmptyAdvancedFilters());
  const toggle = (metric: MetricKey) => setMetrics((current) => {
    const next = new Set(current);
    if (next.has(metric)) next.delete(metric); else next.add(metric);
    return next;
  });
  const clear = () => { setMetrics(new Set()); setAdvanced(createEmptyAdvancedFilters()); };

  return createElement("div", null,
    createElement(CoordinationMetricFilters, { counts: { "put-date": 1, overdue: 1, coordinated: 1, "in-transit": 1 }, selected: metrics, onToggle: toggle }),
    createElement(CoordinationAdvancedFilters, { applied: advanced, institutionOptions: [], clientOptions: [], stateOptions: ["Autorizada"], onApply: setAdvanced, onClearAdvanced: () => setAdvanced(createEmptyAdvancedFilters()) }),
    createElement("button", { type: "button", onClick: clear }, "Limpiar filtros"),
  );
}

describe("coordination view route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue(ctx);
    getCoordinationView.mockResolvedValue({
      context: { mode: "production", surface: "global", actor: { userId: "actor-real" } },
      surgeries: [],
    });
  });

  it("exporta GET solamente y aplica private no-store en éxito", async () => {
    expect(Object.keys(route).sort()).toEqual(["GET"]);
    const response = await call("surface=global");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Vary")).toBe("Authorization");
    expect(getCoordinationView).toHaveBeenCalledWith(expect.objectContaining({
      routeCompanyId: "company-1",
      ctx,
      request: { mode: "production", surface: "global", take: 50, skip: 0 },
    }));
  });

  it("permite coordinator global según la política central", async () => {
    getApiAuthContext.mockResolvedValueOnce({ ...ctx, role: "coordinator" });
    const response = await call("surface=global");
    expect(response.status).toBe(200);
    expect(getCoordinationView).toHaveBeenCalledWith(expect.objectContaining({ request: expect.objectContaining({ surface: "global" }) }));
  });

  it("deniega operator global según la política central", async () => {
    const operatorCtx = { ...ctx, role: "operator" };
    getApiAuthContext.mockResolvedValueOnce(operatorCtx);
    const response = await call("surface=global");
    expect(response.status).toBe(403);
    expect(getCoordinationView).not.toHaveBeenCalled();
  });

  it("el cliente usa GET autenticado, no envía subject en producción y no persiste estado", async () => {
    apiFetch.mockResolvedValue({ context: {}, surgeries: [] });
    await fetchCoordinationView("company-1", { surface: "personal" });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/companies/company-1/coordination/view?surface=personal",
      { method: "GET", cache: "no-store" }
    );

    await fetchCoordinationView("company-1", {
      surface: "personal",
      preview: true,
      target: { contactId: "contact-1", label: "Uno" },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/companies/company-1/coordination/view?surface=personal&preview=true&subjectContactId=contact-1",
      { method: "GET", cache: "no-store" }
    );

    await fetchCoordinationView("company-1", { surface: "global", take: 50, skip: 100 });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/companies/company-1/coordination/view?surface=global&take=50&skip=100",
      { method: "GET", cache: "no-store" }
    );
  });

  it("transporta assignmentId/createdAt sin alterarlos por route y cliente GET", async () => {
    const payload = {
      context: { mode: "production", surface: "personal", actor: { userId: "actor-real" } },
      surgeries: [{
        id: "s1",
        coordinatorAssignments: [{ assignmentId: "assignment-1", contactId: "contact-1", label: "Uno", isPrimary: false, createdAt: "2026-07-16T10:00:00.000Z" }],
        coordinatorAssignment: { status: "resolved", resolved: { contactId: "contact-1", label: "Uno" } },
      }],
    };
    getCoordinationView.mockResolvedValueOnce(payload);
    const response = await call("surface=personal");
    await expect(response.json()).resolves.toEqual({ data: payload });

    apiFetch.mockResolvedValueOnce(payload);
    await expect(fetchCoordinationView("company-1", { surface: "personal" })).resolves.toEqual(payload);
    expect(apiFetch).toHaveBeenLastCalledWith("/api/companies/company-1/coordination/view?surface=personal", { method: "GET", cache: "no-store" });
  });

  it("mantiene todas las interacciones de filtros locales sin request ni persistencia", () => {
    const nativeFetch = vi.spyOn(globalThis, "fetch");
    const persist = vi.spyOn(Storage.prototype, "setItem");
    render(createElement(FilterInteractionHarness));

    fireEvent.click(screen.getByRole("button", { name: /Poner fecha/ }));
    fireEvent.click(screen.getByRole("button", { name: "Más filtros" }));
    fireEvent.change(screen.getByLabelText("CX"), { target: { value: "cancelado" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Más filtros" }));
    fireEvent.change(screen.getByLabelText("CX"), { target: { value: "1042" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtro CX: 1042" }));
    fireEvent.click(screen.getByRole("button", { name: "Más filtros" }));
    fireEvent.change(screen.getByLabelText("CX"), { target: { value: "limpiar" } });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(nativeFetch).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    nativeFetch.mockRestore();
    persist.mockRestore();
  });

  it("mantiene el grafo de filtros libre de mutaciones, requests globales y AvailabilityRequest", () => {
    const paths = [
      "src/components/coordinadores/CoordinationMetricFilters.tsx",
      "src/components/coordinadores/CoordinationAdvancedFilters.tsx",
      "src/components/coordinadores/coordination-filtering.ts",
    ];
    const source = paths.map((path) => readFileSync(resolve(process.cwd(), path), "utf8")).join("\n");
    expect(source).not.toMatch(/AvailabilityRequest|localStorage|sessionStorage|apiFetch|fetch\s*\(|\.post\s*\(|\.put\s*\(|\.patch\s*\(|\.delete\s*\(/i);
    expect(source).not.toMatch(/@\/lib\/store|@\/lib\/services|@\/app\/api/);

    const inbox = readFileSync(resolve(process.cwd(), "src/components/coordinadores/CoordinatorInboxView.tsx"), "utf8");
    expect(inbox).toContain("setSelectedMetrics(new Set())");
    expect(inbox).toContain("setAppliedAdvanced(createEmptyAdvancedFilters())");
    expect(inbox).not.toContain("AvailabilityRequest");
  });

  it.each([
    "surface=personal&subjectContactId=contact-1",
    "surface=personal&preview=false",
    "surface=personal&preview=true",
    "surface=global&preview=true&subjectContactId=contact-1",
    "surface=personal&preview=true&subjectContactId=a&subjectContactId=b",
    "surface=global&extra=true",
    "surface=global&take=0",
    "surface=global&take=101",
    "surface=global&skip=-1",
    "surface=global&skip=2147483648",
    "surface=global&take=50&take=25",
  ])("rechaza query manipulada/duplicada: %s", async (query) => {
    const response = await call(query);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_coordination_view_request" },
    });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(getCoordinationView).not.toHaveBeenCalled();
  });

  it("preserva errores Auth y convierte fallas inesperadas sin filtrar detalles", async () => {
    getApiAuthContext.mockRejectedValueOnce(new ApiError(401, "invalid_auth_token", "token"));
    const unauthorized = await call("surface=global");
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("Cache-Control")).toContain("no-store");

    getCoordinationView.mockRejectedValueOnce(new Error("database secret"));
    const failed = await call("surface=global");
    expect(failed.status).toBe(500);
    await expect(failed.json()).resolves.toMatchObject({
      error: { code: "coordination_view_failed" },
    });
  });
});
