import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({
  apiFetch,
  ApiClientError: class ApiClientError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
  },
}));

import { PhysicalUnitDetail } from "@/components/boxes/PhysicalUnitDetail";
import type { BoxPresentationSku, BoxPresentationUnit } from "@/features/boxes/presentation/boxes-presentation-fixtures";
import { ApiClientError } from "@/lib/api/client";

describe("PhysicalUnitDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives Surgery uses, problems, repair sends, and instrument recurrence from loaded evidence", () => {
    const unit: BoxPresentationUnit = {
      code: "BOX-001",
      condition: "Disponible",
      operationReference: "CX-2",
      evidence: [
        { id: "use-1", occurredAt: "2026-08-20T12:00:00Z", displayedAt: "20/08/2026", checkpoint: "Uso / CX", summary: "Instrumental despachado: Pinza", eventKind: "SURGERY_USE", surgeryReference: "CX-1" },
        { id: "use-2", occurredAt: "2026-08-21T12:00:00Z", displayedAt: "21/08/2026", checkpoint: "Uso / CX", summary: "Instrumental despachado: Pinza", eventKind: "SURGERY_USE", surgeryReference: "CX-2" },
        { id: "problem-1", occurredAt: "2026-08-22T12:00:00Z", displayedAt: "22/08/2026", checkpoint: "Problema reportado", summary: "Juego", eventKind: "PROBLEM_REPORTED", articleId: "article-a", articleDescription: "Pinza" },
        { id: "repair-1", occurredAt: "2026-08-23T12:00:00Z", displayedAt: "23/08/2026", checkpoint: "Enviado a reparación", summary: "Primer envío", eventKind: "REPAIR_SENT", articleId: "article-a", articleDescription: "Pinza" },
        { id: "repair-2", occurredAt: "2026-08-24T12:00:00Z", displayedAt: "24/08/2026", checkpoint: "Enviado a reparación", summary: "Segundo envío", eventKind: "REPAIR_SENT", articleId: "article-a", articleDescription: "Pinza" },
        { id: "repair-3", occurredAt: "2026-08-25T12:00:00Z", displayedAt: "25/08/2026", checkpoint: "Enviado a reparación", summary: "Otro artículo homónimo", eventKind: "REPAIR_SENT", articleId: "article-b", articleDescription: "Pinza" },
      ],
    };
    const box: BoxPresentationSku = { id: "BOX", name: "Caja demo", description: "Caja demo", category: "Cajas", expectedContent: { label: "v1", nextLabel: "v2", context: "Vigente", items: [] }, units: [unit] };
    render(<PhysicalUnitDetail box={box} unit={unit} onBack={vi.fn()} />);

    const summary = screen.getByRole("heading", { name: "Bitácora derivada" }).closest("section")!;
    expect(within(summary).getByText("Usos / CX").nextSibling).toHaveTextContent("2");
    expect(within(summary).getByText("Problemas").nextSibling).toHaveTextContent("1");
    expect(within(summary).getByText("Envíos a reparación").nextSibling).toHaveTextContent("3");
    expect(within(summary).getAllByText("Pinza").map((label) => label.nextSibling?.textContent)).toEqual(["2", "1"]);
    expect(screen.getAllByText("Instrumental despachado: Pinza")).toHaveLength(2);
  });

  it("loads independent maintenance history and exposes only legal actions to an allowed role", async () => {
    const unit: BoxPresentationUnit = { unitId: "unit-1", code: "BOX-001", condition: "Disponible", evidence: [] };
    const box: BoxPresentationSku = { id: "BOX", name: "Caja trauma", description: "Caja trauma", category: "Cajas", expectedContent: { label: "v1", nextLabel: "v2", context: "Vigente", items: [{ articleId: "article-1", articleName: "Pinza", expectedQuantity: 1, quantityUnit: "u" }] }, units: [unit] };
    apiFetch.mockResolvedValue({ unit: { id: "unit-1", code: "BOX-001" }, cases: [{
      id: "case-1", articleId: "article-1", kind: "REPAIR", status: "OPEN", description: "Juego en la articulación", version: 1,
      openedAt: "2026-08-27T10:00:00Z", openedBy: { id: "user-1", name: "Ada Lovelace" }, updatedAt: "2026-08-27T10:00:00Z",
      article: { id: "article-1", sku: "PIN-1", description: "Pinza" },
      transitions: [{ id: "transition-1", sequence: 1, fromStatus: null, toStatus: "OPEN", note: null, acceptedAt: "2026-08-27T10:00:00Z", actor: { id: "user-1", name: "Ada Lovelace" } }],
    }] });

    render(<PhysicalUnitDetail box={box} unit={unit} companyId="company-1" currentRole="operator" onBack={vi.fn()} />);

    expect(screen.getByText("Cargando casos de mantenimiento…")).toBeInTheDocument();
    expect(await screen.findByText("Juego en la articulación")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como enviado" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancelar caso" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Cerrar revisión" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Transiciones del caso case-1" })).toHaveTextContent("Abierto");
  });

  it("keeps one create idempotency key across a failed retry and refetches after success", async () => {
    const unit: BoxPresentationUnit = { unitId: "unit-1", code: "BOX-001", condition: null, evidence: [] };
    const box: BoxPresentationSku = { id: "BOX", name: "Caja trauma", description: "Caja trauma", category: "Cajas", expectedContent: { label: "v1", nextLabel: "v2", context: "Vigente", items: [] }, units: [unit] };
    const postedBodies: Array<{ idempotencyKey: string }> = [];
    let createAttempts = 0;
    apiFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (!init) return Promise.resolve({ unit: { id: "unit-1", code: "BOX-001" }, cases: [] });
      postedBodies.push(JSON.parse(String(init.body)));
      createAttempts += 1;
      return createAttempts === 1 ? Promise.reject(new Error("Sin conexión")) : Promise.resolve({ replayed: true, case: { id: "case-1" } });
    });

    render(<PhysicalUnitDetail box={box} unit={unit} companyId="company-1" currentRole="admin" onBack={vi.fn()} />);
    await screen.findByText("Sin casos de mantenimiento");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo caso" }));
    fireEvent.change(screen.getByLabelText("Problema detectado"), { target: { value: "Revisar cierre" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear caso" }));
    expect(await screen.findAllByText("Sin conexión")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Crear caso" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postedBodies).toHaveLength(2);
    expect(postedBodies[0].idempotencyKey).toBe(postedBodies[1].idempotencyKey);
    expect(apiFetch.mock.calls.filter(([, init]) => !init)).toHaveLength(2);
  });

  it("uses clear maintenance motives and searches only components from the current box", async () => {
    const unit: BoxPresentationUnit = { unitId: "unit-1", code: "BOX-001", condition: null, evidence: [] };
    const box: BoxPresentationSku = { id: "BOX", name: "Caja trauma", description: "Caja trauma", category: "Cajas", expectedContent: { label: "v1", nextLabel: "v2", context: "Vigente", items: [
      { articleId: "article-1", articleSku: "PIN-1", articleName: "Pinza", expectedQuantity: 1, quantityUnit: "u" },
      { articleId: "article-2", articleSku: "SEP-2", articleName: "Separador", expectedQuantity: 1, quantityUnit: "u" },
    ] }, units: [unit] };
    let postedBody: Record<string, unknown> | undefined;
    apiFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (!init) return Promise.resolve({ unit: { id: "unit-1", code: "BOX-001" }, cases: [] });
      postedBody = JSON.parse(String(init.body));
      return Promise.resolve({ replayed: false, case: { id: "case-1" } });
    });

    render(<PhysicalUnitDetail box={box} unit={unit} companyId="company-1" currentRole="operator" onBack={vi.fn()} />);
    await screen.findByText("Sin casos de mantenimiento");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo caso" }));
    expect(screen.getByRole("radio", { name: /Reparación correctiva/i })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Mantenimiento preventivo/i }));
    expect(screen.getByLabelText("Motivo específico")).toHaveTextContent("Revisión programada");
    const search = screen.getByPlaceholderText("Buscar por SKU o nombre dentro de esta caja…");
    fireEvent.change(search, { target: { value: "PIN-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Pinza/i }));
    expect(screen.getByText("PIN-1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tarea planificada"), { target: { value: "Revisión anual" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear caso" }));

    await waitFor(() => expect(postedBody).toMatchObject({ kind: "PREVENTIVE_MAINTENANCE", articleId: "article-1", description: "Revisión programada — Revisión anual" }));
  });

  it("keeps maintenance read-only for roles outside the existing Stock operation policy", async () => {
    const unit: BoxPresentationUnit = { unitId: "unit-1", code: "BOX-001", condition: null, evidence: [] };
    const box: BoxPresentationSku = { id: "BOX", name: "Caja trauma", description: "Caja trauma", category: "Cajas", expectedContent: { label: "v1", nextLabel: "v2", context: "Vigente", items: [] }, units: [unit] };
    apiFetch.mockResolvedValue({ unit: { id: "unit-1", code: "BOX-001" }, cases: [] });

    render(<PhysicalUnitDetail box={box} unit={unit} companyId="company-1" currentRole="viewer" onBack={vi.fn()} />);
    await screen.findByText("Sin casos de mantenimiento");
    expect(screen.getByRole("button", { name: "Nuevo caso" })).toBeDisabled();
    expect(screen.getByText(/permite consultar el historial, pero no crear/i)).toBeInTheDocument();
  });

  it("records an optional note when changing maintenance status", async () => {
    const unit: BoxPresentationUnit = { unitId: "unit-1", code: "BOX-001", condition: null, evidence: [] };
    const box: BoxPresentationSku = { id: "BOX", name: "Caja trauma", description: "Caja trauma", category: "Cajas", expectedContent: { label: "v1", nextLabel: "v2", context: "Vigente", items: [] }, units: [unit] };
    const record = {
      id: "case-1", articleId: null, kind: "REPAIR", status: "OPEN", description: "Reparar cierre", version: 1,
      openedAt: "2026-08-27T10:00:00Z", openedBy: { id: "user-1", name: "Ada" }, updatedAt: "2026-08-27T10:00:00Z", article: null,
      transitions: [{ id: "transition-1", sequence: 1, fromStatus: null, toStatus: "OPEN", note: null, acceptedAt: "2026-08-27T10:00:00Z", actor: { id: "user-1", name: "Ada" } }],
    };
    let postedBody: Record<string, unknown> | undefined;
    apiFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (!init) return Promise.resolve({ unit: { id: "unit-1", code: "BOX-001" }, cases: [record] });
      postedBody = JSON.parse(String(init.body));
      return Promise.resolve({ replayed: false, case: { ...record, status: "SENT", version: 2 } });
    });

    render(<PhysicalUnitDetail box={box} unit={unit} companyId="company-1" currentRole="operator" onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar como enviado" }));
    fireEvent.change(screen.getByLabelText("Nota (opcional)"), { target: { value: "  Enviado a Taller Central  " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar movimiento" }));

    await waitFor(() => expect(postedBody).toMatchObject({ toStatus: "SENT", expectedVersion: 1, note: "Enviado a Taller Central" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("reuses a transition key for an unchanged retry and renews it when the note changes", async () => {
    const unit: BoxPresentationUnit = { unitId: "unit-1", code: "BOX-001", condition: null, evidence: [] };
    const box: BoxPresentationSku = { id: "BOX", name: "Caja trauma", description: "Caja trauma", category: "Cajas", expectedContent: { label: "v1", nextLabel: "v2", context: "Vigente", items: [] }, units: [unit] };
    const record = {
      id: "case-1", articleId: null, kind: "REPAIR", status: "OPEN", description: "Reparar cierre", version: 1,
      openedAt: "2026-08-27T10:00:00Z", openedBy: { id: "user-1", name: "Ada" }, updatedAt: "2026-08-27T10:00:00Z", article: null,
      transitions: [{ id: "transition-1", sequence: 1, fromStatus: null, toStatus: "OPEN", note: null, acceptedAt: "2026-08-27T10:00:00Z", actor: { id: "user-1", name: "Ada" } }],
    };
    const postedBodies: Array<{ idempotencyKey: string; note?: string }> = [];
    apiFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (!init) return Promise.resolve({ unit: { id: "unit-1", code: "BOX-001" }, cases: [record] });
      postedBodies.push(JSON.parse(String(init.body)));
      return postedBodies.length < 3 ? Promise.reject(new Error("Sin conexión")) : Promise.resolve({ replayed: false, case: { ...record, status: "SENT", version: 2 } });
    });

    render(<PhysicalUnitDetail box={box} unit={unit} companyId="company-1" currentRole="operator" onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar como enviado" }));
    fireEvent.change(screen.getByLabelText("Nota (opcional)"), { target: { value: "Taller A" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar movimiento" }));
    expect(await screen.findAllByText("Sin conexión")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar movimiento" }));
    await waitFor(() => expect(postedBodies).toHaveLength(2));
    fireEvent.change(screen.getByLabelText("Nota (opcional)"), { target: { value: "Taller B" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar movimiento" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postedBodies[0].idempotencyKey).toBe(postedBodies[1].idempotencyKey);
    expect(postedBodies[2].idempotencyKey).not.toBe(postedBodies[0].idempotencyKey);
    expect(postedBodies[2].note).toBe("Taller B");
  });

  it("offers an honest retry when maintenance cannot be loaded", async () => {
    const unit: BoxPresentationUnit = { unitId: "unit-1", code: "BOX-001", condition: null, evidence: [] };
    const box: BoxPresentationSku = { id: "BOX", name: "Caja trauma", description: "Caja trauma", category: "Cajas", expectedContent: { label: "v1", nextLabel: "v2", context: "Vigente", items: [] }, units: [unit] };
    apiFetch.mockRejectedValueOnce(new Error("Servicio no disponible")).mockResolvedValueOnce({ unit: { id: "unit-1", code: "BOX-001" }, cases: [] });

    render(<PhysicalUnitDetail box={box} unit={unit} companyId="company-1" currentRole="operator" onBack={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Servicio no disponible");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Sin casos de mantenimiento")).toBeInTheDocument();
  });

  it("refetches a case after an optimistic-version conflict", async () => {
    const unit: BoxPresentationUnit = { unitId: "unit-1", code: "BOX-001", condition: null, evidence: [] };
    const box: BoxPresentationSku = { id: "BOX", name: "Caja trauma", description: "Caja trauma", category: "Cajas", expectedContent: { label: "v1", nextLabel: "v2", context: "Vigente", items: [] }, units: [unit] };
    const record = {
      id: "case-1", articleId: null, kind: "REPAIR", status: "OPEN", description: "Reparar cierre", version: 1,
      openedAt: "2026-08-27T10:00:00Z", openedBy: { id: "user-1", name: "Ada" }, updatedAt: "2026-08-27T10:00:00Z", article: null,
      transitions: [{ id: "transition-1", sequence: 1, fromStatus: null, toStatus: "OPEN", note: null, acceptedAt: "2026-08-27T10:00:00Z", actor: { id: "user-1", name: "Ada" } }],
    };
    let reads = 0;
    apiFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (!init) { reads += 1; return Promise.resolve({ unit: { id: "unit-1", code: "BOX-001" }, cases: [record] }); }
      return Promise.reject(new ApiClientError("Version conflict", 409, "cajas_maintenance_version_conflict"));
    });

    render(<PhysicalUnitDetail box={box} unit={unit} companyId="company-1" currentRole="operator" onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar como enviado" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar movimiento" }));
    expect(await screen.findByText(/El caso cambió mientras lo estabas revisando/i)).toBeInTheDocument();
    await waitFor(() => expect(reads).toBe(2));
  });
});
