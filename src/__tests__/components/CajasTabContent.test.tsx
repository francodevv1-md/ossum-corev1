import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: mocks.useAuth }));

import { CajasTabContent } from "@/components/expediente/CajasTabContent";

const available = {
  unitId: "unit-1",
  unitCode: "BOX-001",
  serialNumber: "SER-001",
  boxDescription: "Caja demo",
  formulaVersionNumber: 2,
  expectedLineCount: 3,
  availability: { available: true, code: "available", reason: "Disponible para asignar." },
};

const unavailable = {
  ...available,
  unitId: "unit-2",
  unitCode: "BOX-002",
  availability: { available: false, code: "active_assignment", reason: "La caja ya está asignada a otro expediente." },
};

const eligibleSurgery = { acceptsNewCajasAssignments: true, newCajasAssignmentReason: "La cirugía admite nuevas asignaciones de Cajas." };

function readModel(overrides: Partial<{ surgery: typeof eligibleSurgery; assignments: unknown[]; candidates: unknown[] }> = {}) {
  return { surgery: eligibleSurgery, assignments: [], candidates: [], ...overrides };
}

describe("CajasTabContent", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-1", name: "Demo" }, currentAccess: { role: "operator" }, currentUserLoading: false, isLoading: false });
  });

  it("renders loading, empty assignments, and explicit unavailable reasons", async () => {
    let resolve!: (value: unknown) => void;
    mocks.apiFetch.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<CajasTabContent surgeryId="surgery-1" />);
    expect(screen.getByText(/Cargando cajas disponibles/i)).toBeInTheDocument();

    resolve(readModel({ candidates: [unavailable] }));
    expect(await screen.findByText(/Todavía no hay cajas asignadas/i)).toBeInTheDocument();
    expect(screen.getByText("La caja ya está asignada a otro expediente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Asignar y preparar/i })).toBeDisabled();
  });

  it("shows load errors", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new Error("Surgery not found"));
    render(<CajasTabContent surgeryId="missing" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Surgery not found");
  });

  it("posts the real company/Surgery/unit, refreshes, and reports success", async () => {
    mocks.apiFetch
      .mockResolvedValueOnce(readModel({ candidates: [available] }))
      .mockResolvedValueOnce({ replayed: false, assignment: { id: "assignment-1" } })
      .mockResolvedValueOnce(readModel({ assignments: [{ id: "assignment-1", unitCode: "BOX-001", serialNumber: "SER-001", boxDescription: "Caja demo", active: true, preparation: { id: "prep-1", formulaVersionNumber: 2, lines: [] } }], candidates: [unavailable] }));
    render(<CajasTabContent surgeryId="backend-surgery-1" />);

    fireEvent.click(await screen.findByRole("button", { name: /Asignar y preparar/i }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(3));
    expect(mocks.apiFetch.mock.calls[1][0]).toBe("/api/companies/company-1/surgeries/backend-surgery-1/cajas");
    expect(JSON.parse(mocks.apiFetch.mock.calls[1][1].body)).toEqual({ unitId: "unit-1", idempotencyKey: expect.any(String) });
    expect(await screen.findByRole("status")).toHaveTextContent("BOX-001 quedó asignada y preparada.");
    expect(screen.getByText(/Preparación v2/i)).toBeInTheDocument();
  });

  it("ignores a stale company response", async () => {
    const pending = new Map<string, (value: unknown) => void>();
    mocks.apiFetch.mockImplementation((path: string) => new Promise((resolve) => pending.set(path, resolve)));
    const { rerender } = render(<CajasTabContent surgeryId="surgery-1" />);
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-2", name: "Other" }, currentAccess: { role: "operator" }, currentUserLoading: false, isLoading: false });
    rerender(<CajasTabContent surgeryId="surgery-1" />);

    pending.get("/api/companies/company-2/surgeries/surgery-1/cajas")?.(readModel());
    expect(await screen.findByText(/No hay cajas físicas identificadas/i)).toBeInTheDocument();
    pending.get("/api/companies/company-1/surgeries/surgery-1/cajas")?.(readModel({ candidates: [available] }));
    await Promise.resolve();
    expect(screen.queryByText("BOX-001")).not.toBeInTheDocument();
  });

  it.each([
    ["archivada", "La cirugía está archivada y no admite nuevas asignaciones de Cajas."],
    ["finalizada", "La cirugía está finalizada y no admite nuevas asignaciones de Cajas."],
  ])("disables assignment for a %s Surgery while keeping history readable", async (_state, reason) => {
    mocks.apiFetch.mockResolvedValueOnce(readModel({
      surgery: { acceptsNewCajasAssignments: false, newCajasAssignmentReason: reason },
      assignments: [{ id: "historic-1", unitCode: "BOX-HIST", serialNumber: null, boxDescription: "Caja histórica", active: false, preparation: null }],
      candidates: [available],
    }));
    render(<CajasTabContent surgeryId="surgery-1" />);

    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(screen.getByText("Caja histórica")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Asignar y preparar/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Asignar y preparar/i }));
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
  });

  it.each(["coordinator", "viewer"])("disables Stock mutation controls for the read-only %s role", async (role) => {
    mocks.useAuth.mockReturnValue({ activeCompany: { id: "company-1", name: "Demo" }, currentAccess: { role }, currentUserLoading: false, isLoading: false });
    mocks.apiFetch.mockResolvedValueOnce(readModel({ candidates: [available] }));
    render(<CajasTabContent surgeryId="surgery-1" />);

    expect(await screen.findByText(/Tu rol actual no permite asignar ni preparar Cajas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Asignar y preparar/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Asignar y preparar/i }));
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
  });

  it("has no manual-use input and submits an exception for an assigned physical Box", async () => {
    const assignment = {
      id: "assignment-1",
      unitId: "unit-1",
      unitCode: "BOX-001",
      serialNumber: null,
      boxDescription: "Caja demo",
      active: true,
      preparation: { id: "prep-1", formulaVersionNumber: 2, lines: [{ id: "line-1", articleId: "component-1", description: "Pinza", quantity: "1", stockUnit: "u" }] },
      recentLogEntries: [],
    };
    mocks.apiFetch
      .mockResolvedValueOnce(readModel({ assignments: [assignment] }))
      .mockResolvedValueOnce({ replayed: false, entry: { id: "entry-1" } })
      .mockResolvedValueOnce(readModel({ assignments: [{ ...assignment, recentLogEntries: [{ id: "entry-1", eventKind: "PROBLEM_REPORTED", articleId: "component-1", articleDescription: "Pinza", note: "Punta deformada", occurredAt: "2026-08-26T12:00:00Z" }] }] }));
    render(<CajasTabContent surgeryId="surgery-1" />);

    expect(await screen.findByLabelText("Caja asignada")).toBeInTheDocument();
    expect(screen.queryByLabelText(/uso/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Caja asignada"), { target: { value: "assignment-1" } });
    expect(screen.queryByRole("option", { name: /Caja completa/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Instrumento de la preparación"), { target: { value: "component-1" } });
    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: "Punta deformada" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar excepción" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(3));
    expect(mocks.apiFetch.mock.calls[1][0]).toBe("/api/companies/company-1/surgeries/surgery-1/cajas/log");
    expect(JSON.parse(mocks.apiFetch.mock.calls[1][1].body)).toEqual({ assignmentId: "assignment-1", unitId: "unit-1", eventKind: "PROBLEM_REPORTED", articleId: "component-1", note: "Punta deformada", idempotencyKey: expect.any(String) });
    expect(await screen.findByText(/Punta deformada/)).toBeInTheDocument();
  });

  it("cannot submit an exception when the assignment has no preparation instruments", async () => {
    mocks.apiFetch.mockResolvedValueOnce(readModel({ assignments: [{ id: "assignment-1", unitId: "unit-1", unitCode: "BOX-001", serialNumber: null, boxDescription: "Caja demo", active: true, preparation: null, recentLogEntries: [] }] }));
    render(<CajasTabContent surgeryId="surgery-1" />);

    fireEvent.change(await screen.findByLabelText("Caja asignada"), { target: { value: "assignment-1" } });
    expect(screen.getByLabelText("Instrumento de la preparación")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Registrar excepción" })).toBeDisabled();
    expect(screen.getByText(/no tiene instrumentos de preparación/i)).toBeInTheDocument();
  });
});
