import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoxAssignmentDetail, PhysicalUnitAssignmentRow } from "@/lib/api/cajas-assignments";
import type { StockPhysicalUnit } from "@/lib/api/stock-physical-units";

const mocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({ getAccessToken: mocks.token }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
// Keep every HTTP client real; isolate the surgery presentation adapter from its service imports.
vi.mock("@/lib/api/surgery-adapter", () => ({
  mapApiSurgeryListToSurgeries: (rows: Array<{ id?: string; visibleNumber: string }>) => rows.map((s) => ({
    id: s.visibleNumber, backendId: s.id, patient: "Paciente de prueba", date: "2026-10-02",
  })),
}));
// Native dialog shell makes command tests independent of Radix portals/focus management.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { CajasPhysicalUnitsSection } from "@/components/stock/CajasPhysicalUnitsSection";

const company = "company-http";
const article = "article-box";
const assignment = "assignment-backend";
const line = "preparation-line-backend";
const base = `/api/companies/${company}`;
const detailPath = `${base}/cajas/assignments/${assignment}`;
const selectionPath = `${base}/cajas/preparation-lines/${line}/selection`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unit(id = "box-unit-backend", articleId = article): StockPhysicalUnit {
  return { id, companyId: company, articleId, unitCode: id, serialNumber: null, location: null, status: "ACTIVE" };
}
function detail(id = assignment): BoxAssignmentDetail {
  return {
    id, companyId: company, surgeryId: "surgery-backend", surgeryVisibleNumber: "CX-77",
    surgeryPatientName: null, surgeryInstitutionName: null, physicalUnitId: "box-unit-backend",
    unitCode: "Caja HTTP", serialNumber: null, boxArticleId: article, boxSku: "BOX", boxDescription: "Caja",
    isActive: true, assignedAt: "2026-10-02T10:00:00Z", assignedById: "actor", assignedByName: null,
    endedAt: null, endedById: null, endedByName: null, endCause: null, createdAt: "2026-10-02T10:00:00Z",
    preparation: {
      id: "preparation-backend", version: 7, formulaVersionId: "formula-backend", formulaVersionNumber: 3,
      formulaCause: null, formulaAcceptedAt: "2026-10-02T10:00:00Z", requiresRecontrol: false,
      lines: [{ id: line, lineKey: "line-1", role: "expected", articleId: "article-component", sku: "COMP",
        description: "Componente", quantity: 2, unit: "u", isActive: true }],
    }, differences: [],
  };
}
function row(id = assignment): PhysicalUnitAssignmentRow {
  return { id, companyId: company, surgeryId: "surgery-backend", surgeryVisibleNumber: "CX-77", surgeryPatientName: null,
    surgeryInstitutionName: null, isActive: true, assignedAt: "2026-10-02T10:00:00Z", assignedByName: null,
    endedAt: null, endCause: null, formulaVersionNumber: 3, lineCount: 1 };
}
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(status >= 400 ? { error: { code: "rejected", message: "Comando rechazado" } } : { data }),
    { status, headers: { "Content-Type": "application/json" } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
type Request = { path: string; method: string; body: Record<string, unknown>; headers: Headers };
let requests: Request[];
let unexpected: string[];
let units: StockPhysicalUnit[];
let assignments: PhysicalUnitAssignmentRow[];
let currentDetail: BoxAssignmentDetail;
let surgeries: Array<{ id?: string; visibleNumber: string }>;
let reads: Map<string, () => Response | Promise<Response>>;
let writes: Map<string, (request: Request) => Response | Promise<Response>>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.token.mockResolvedValue("http-test-token");
  requests = []; unexpected = []; units = [unit()]; assignments = [row()]; currentDetail = detail();
  surgeries = [{ id: "surgery-backend", visibleNumber: "CX-77" }];
  reads = new Map(); writes = new Map();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request: Request = { path: String(input), method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : {}, headers: new Headers(init?.headers) };
    requests.push(request);
    if (request.method !== "GET") {
      const handler = writes.get(`${request.method} ${request.path}`);
      if (handler) return handler(request);
    } else {
      const handler = reads.get(request.path);
      if (handler) return handler();
      if (request.path === `${base}/stock/physical-units?articleId=${article}`) return response(units);
      if (request.path === `${base}/stock/physical-units?articleId=article-component`) return response([unit("component-unit-backend", "article-component")]);
      if (request.path === `${base}/stock/physical-units/box-unit-backend/assignments`) return response(assignments);
      if (request.path === detailPath) return response(currentDetail);
      if (request.path === `${base}/surgeries`) return response(surgeries);
    }
    unexpected.push(`${request.method} ${request.path}`);
    throw new Error(`Unexpected HTTP request: ${request.method} ${request.path}`);
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  expect(unexpected).toEqual([]);
});

function changes() { return requests.filter((r) => r.method !== "GET"); }
function change(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }
async function openDetail() {
  const view = render(<CajasPhysicalUnitsSection companyId={company} articleId={article} />);
  fireEvent.click(await screen.findByRole("button", { name: "Ver Prep" }));
  await screen.findByText("Versión de preparación observada: 7");
  return view;
}
function acceptSelection() {
  writes.set(`PATCH ${selectionPath}`, () => {
    currentDetail.preparation!.version += 1;
    return response({ id: "accepted-selection" });
  });
}
async function waitIdle() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Actualizar preparación" })).toBeEnabled());
}

describe("Cajas preparation callers at the real apiFetch HTTP boundary", () => {
  it("sends physical backend IDs, displayed version and UUID; refreshes accepted version", async () => {
    acceptSelection();
    await openDetail();
    change(`Unidad física ${line}`, "component-unit-backend");
    fireEvent.click(screen.getByRole("button", { name: `Vincular ${line}` }));
    await screen.findByText("Versión de preparación observada: 8");
    expect(changes()).toHaveLength(1);
    expect(changes()[0]).toMatchObject({ path: selectionPath, method: "PATCH", body: {
      physicalUnitId: "component-unit-backend", expectedVersion: 7, quantity: 1, append: false, remove: false, cause: "Preparación de caja",
    } });
    expect(changes()[0].body.idempotencyKey).toMatch(uuid);
    expect(changes()[0].headers.get("Authorization")).toBe("Bearer http-test-token");
    expect(screen.getByLabelText(`Unidad física ${line}`)).toHaveValue("");
    await waitIdle();
    writes.set(`POST ${detailPath}/control`, () => response({ id: "control" }));
    fireEvent.click(screen.getByRole("button", { name: "Ejecutar control" }));
    await waitFor(() => expect(changes()).toHaveLength(2));
    expect(changes()[1].body).toMatchObject({ expectedVersion: 8, kind: "control" });
    await waitIdle();
  });

  it("supports source movement quantity, append and removal without fabricated positions", async () => {
    acceptSelection();
    await openDetail();
    change(`Movimiento de origen ${line}`, "movement-backend");
    change(`Cantidad seleccionada ${line}`, "2.125");
    fireEvent.click(screen.getByLabelText(`Agregar asignación ${line}`));
    fireEvent.click(screen.getByRole("button", { name: `Vincular ${line}` }));
    await screen.findByText("Versión de preparación observada: 8");
    await waitIdle();
    expect(changes()[0].body).toMatchObject({ sourceMovementId: "movement-backend", quantity: 2.125, append: true, remove: false, expectedVersion: 7 });
    expect(changes()[0].body).not.toHaveProperty("physicalUnitId");
    expect(changes()[0].body).not.toHaveProperty("stockPositionId");
    fireEvent.click(screen.getByRole("button", { name: `Quitar ${line}` }));
    await screen.findByText("Versión de preparación observada: 9");
    expect(changes()[1].body).toMatchObject({ expectedVersion: 8, remove: true });
    for (const field of ["physicalUnitId", "sourceMovementId", "append", "quantity"]) expect(changes()[1].body).not.toHaveProperty(field);
    expect(changes()[1].body.idempotencyKey).not.toBe(changes()[0].body.idempotencyKey);
    await waitIdle();
  });

  it("opens observed detail before reservation, then sends the full reservation command", async () => {
    writes.set(`POST ${detailPath}/reservation`, () => response({ id: "reserved" }));
    render(<CajasPhysicalUnitsSection companyId={company} articleId={article} />);
    fireEvent.click(await screen.findByRole("button", { name: "Reservar" }));
    await screen.findByText("Versión de preparación observada: 7");
    expect(changes()).toEqual([]);
    change("Causa de preparación", "Reserva observada");
    fireEvent.click(screen.getByRole("button", { name: "Reservar preparación" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(changes()[0]).toMatchObject({ path: `${detailPath}/reservation`, body: { expectedVersion: 7, cause: "Reserva observada" } });
    expect(changes()[0].body.idempotencyKey).toMatch(uuid);
    await waitIdle();
  });

  it("sends recontrol without downgrading its kind", async () => {
    currentDetail.preparation!.requiresRecontrol = true;
    writes.set(`POST ${detailPath}/control`, () => response({ id: "recontrol" }));
    await openDetail();
    change("Causa de preparación", "Recontrol tras resolución");
    fireEvent.click(screen.getByRole("button", { name: "Recontrolar" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(changes()[0].body).toEqual({ expectedVersion: 7, kind: "recontrol", cause: "Recontrol tras resolución", idempotencyKey: expect.stringMatching(uuid) });
    await waitIdle();
  });

  it.each([
    ["reserve", "Reservar preparación", "reservation"],
    ["control", "Ejecutar control", "control"],
    ["recontrol", "Recontrolar", "control"],
  ])("retains a rejected %s key/version until explicit refreshed intent", async (kind, buttonName, endpoint) => {
    currentDetail.preparation!.requiresRecontrol = kind === "recontrol";
    writes.set(`POST ${detailPath}/${endpoint}`, () => response(null, 409));
    await openDetail();
    fireEvent.click(screen.getByRole("button", { name: buttonName }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: buttonName }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(2));
    expect(changes()[1].body).toEqual(changes()[0].body);
    expect(changes()[0].body.expectedVersion).toBe(7);
    if (kind !== "reserve") expect(changes()[0].body.kind).toBe(kind);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar preparación" }));
    await waitIdle();
    fireEvent.click(screen.getByRole("button", { name: buttonName }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(3));
    expect(changes()[2].body.idempotencyKey).not.toBe(changes()[0].body.idempotencyKey);
    expect(changes()[2].body.expectedVersion).toBe(7);
  });

  it.each(["0", "-1", "0.12345", ""])("rejects invalid selection quantity %s without sending HTTP", async (quantity) => {
    await openDetail();
    change(`Movimiento de origen ${line}`, "movement-backend");
    change(`Cantidad seleccionada ${line}`, quantity);
    fireEvent.click(screen.getByRole("button", { name: `Vincular ${line}` }));
    expect(changes()).toEqual([]);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
    expect(screen.getByLabelText(`Movimiento de origen ${line}`)).toHaveValue("movement-backend");
  });

  it.each(["conflict", "network"])("preserves identical selection payload/key and input after %s rejection", async (failure) => {
    writes.set(`PATCH ${selectionPath}`, () => failure === "conflict" ? response(null, 409) : Promise.reject(new Error("Sin red")));
    await openDetail();
    change(`Movimiento de origen ${line}`, "movement-backend");
    change(`Cantidad seleccionada ${line}`, "3");
    fireEvent.click(screen.getByRole("button", { name: `Vincular ${line}` }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText(`Movimiento de origen ${line}`)).toHaveValue("movement-backend");
    expect(screen.getByLabelText(`Cantidad seleccionada ${line}`)).toHaveValue(3);
    expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: `Vincular ${line}` }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(2));
    expect(changes()[1].body).toEqual(changes()[0].body);
    change(`Cantidad seleccionada ${line}`, "4");
    fireEvent.click(screen.getByRole("button", { name: `Vincular ${line}` }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(3));
    expect(changes()[2].body.idempotencyKey).not.toBe(changes()[0].body.idempotencyKey);
    expect(changes()[2].body.expectedVersion).toBe(7);
    currentDetail.preparation!.version = 11;
    fireEvent.click(screen.getByRole("button", { name: "Actualizar preparación" }));
    await screen.findByText("Versión de preparación observada: 11");
    await waitIdle();
    expect(screen.getByLabelText(`Movimiento de origen ${line}`)).toHaveValue("movement-backend");
    fireEvent.click(screen.getByRole("button", { name: `Vincular ${line}` }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(4));
    expect(changes()[3].body.expectedVersion).toBe(11);
    expect(changes()[3].body.idempotencyKey).not.toBe(changes()[2].body.idempotencyKey);
  });

  it("does not announce success or clear input before acceptance, and blocks pending duplicates", async () => {
    const write = deferred<Response>();
    writes.set(`PATCH ${selectionPath}`, () => write.promise);
    await openDetail();
    change(`Movimiento de origen ${line}`, "movement-backend");
    const button = screen.getByRole("button", { name: `Vincular ${line}` });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(changes()).toHaveLength(1));
    expect(button).toBeDisabled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByLabelText(`Movimiento de origen ${line}`)).toHaveValue("movement-backend");
    await act(async () => write.resolve(response(null, 409)));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByLabelText(`Movimiento de origen ${line}`)).toHaveValue("movement-backend");
    expect(button).toBeEnabled();
  });

  it("keeps an accepted mutation accepted when refresh fails and requires explicit reload", async () => {
    writes.set(`PATCH ${selectionPath}`, () => {
      currentDetail.preparation!.version = 8;
      reads.set(detailPath, () => response(null, 503));
      return response({ id: "accepted" });
    });
    await openDetail();
    change(`Movimiento de origen ${line}`, "movement-backend");
    fireEvent.click(screen.getByRole("button", { name: `Vincular ${line}` }));
    await waitFor(() => expect(screen.getAllByText(/Operación aceptada\. No se pudo actualizar/).length).toBeGreaterThan(0));
    expect(mocks.success).toHaveBeenCalledTimes(1);
    expect(mocks.error).not.toHaveBeenCalled();
    expect(screen.getByLabelText(`Movimiento de origen ${line}`)).toHaveValue("");
    expect(screen.getByRole("button", { name: `Quitar ${line}` })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reservar preparación" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: `Quitar ${line}` }));
    expect(changes()).toHaveLength(1);
    reads.delete(detailPath);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar preparación" }));
    await screen.findByText("Versión de preparación observada: 8");
    await waitIdle();
    expect(screen.getByRole("button", { name: `Quitar ${line}` })).toBeEnabled();
    expect(changes()).toHaveLength(1);
  });

  it.each([0, 4])("uses latest observed resolution sequence %i and retains rejected intent", async (sequence) => {
    currentDetail.differences = [{ id: "difference-backend", kind: "observed", observedFacts: "Diferencia",
      openedAt: "2026-10-02T10:00:00Z", closedAt: null,
      resolutions: sequence ? [2, sequence, 1].map((n) => ({ id: `resolution-${n}`, sequence: n,
        closesDifference: false, explanation: "Anterior", supportingReference: "REF", acceptedAt: "2026-10-02T10:00:00Z" })) : [] }];
    writes.set(`POST ${detailPath}/differences/difference-backend/resolve`, () => response(null, 409));
    await openDetail();
    fireEvent.click(screen.getByRole("button", { name: "Resolver diferencia" }));
    change("Explicación / Causa raíz", "Contenido verificado");
    expect(screen.getByRole("button", { name: "Confirmar resolución" })).toBeDisabled();
    change("Referencia de soporte", "REF-77"); change("Causa de resolución", "Inspección documentada");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar resolución" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1));
    expect(changes()[0].body).toEqual({ expectedResolutionSequence: sequence, closesDifference: true,
      explanation: "Contenido verificado", supportingReference: "REF-77", cause: "Inspección documentada", idempotencyKey: expect.stringMatching(uuid) });
    expect(screen.getByLabelText("Explicación / Causa raíz")).toHaveValue("Contenido verificado");
    expect(screen.getByLabelText("Referencia de soporte")).toHaveValue("REF-77");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar resolución" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(2));
    expect(changes()[1].body).toEqual(changes()[0].body);
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("uses surgery backendId rather than its visible CX number", async () => {
    assignments = [];
    writes.set(`POST ${base}/surgeries/surgery-backend/cajas/assignments`, () => response(currentDetail));
    render(<CajasPhysicalUnitsSection companyId={company} articleId={article} />);
    fireEvent.click(await screen.findByRole("button", { name: "Asignar a Cirugía" }));
    await screen.findByLabelText("Cirugía / Expediente de destino");
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar Asignación" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Confirmar Asignación" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(changes()[0].path).toBe(`${base}/surgeries/surgery-backend/cajas/assignments`);
    expect(changes()[0].body.physicalUnitId).toBe("box-unit-backend");
    expect(changes()[0].path).not.toContain("CX-77");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("clears only accepted resolution data and refreshes its preparation version", async () => {
    currentDetail.differences = [{ id: "difference-backend", kind: "observed", observedFacts: "Diferencia",
      openedAt: "2026-10-02T10:00:00Z", closedAt: null, resolutions: [] }];
    const write = deferred<Response>();
    writes.set(`POST ${detailPath}/differences/difference-backend/resolve`, () => write.promise);
    await openDetail();
    fireEvent.click(screen.getByRole("button", { name: "Resolver diferencia" }));
    change("Explicación / Causa raíz", "Contenido verificado"); change("Referencia de soporte", "REF-77");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar resolución" }));
    await waitFor(() => expect(changes()).toHaveLength(1));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Explicación / Causa raíz")).toHaveValue("Contenido verificado");
    currentDetail.preparation!.version = 8;
    currentDetail.differences[0].resolutions = [{ id: "resolution-1", sequence: 1, closesDifference: true,
      explanation: "Contenido verificado", supportingReference: "REF-77", acceptedAt: "2026-10-02T10:00:00Z" }];
    await act(async () => write.resolve(response({ id: "resolution-1" })));
    await screen.findByText("Versión de preparación observada: 8");
    expect(mocks.success).toHaveBeenCalledWith("Diferencia resuelta");
    expect(screen.queryByLabelText("Explicación / Causa raíz")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resolver diferencia" })).not.toBeInTheDocument();
    await waitIdle();
  });

  it("blocks surgery assignment without a backend ID, including a forced submit", async () => {
    assignments = []; surgeries = [{ visibleNumber: "CX-77" }];
    render(<CajasPhysicalUnitsSection companyId={company} articleId={article} />);
    fireEvent.click(await screen.findByRole("button", { name: "Asignar a Cirugía" }));
    const selector = await screen.findByLabelText("Cirugía / Expediente de destino");
    expect(screen.getByRole("button", { name: "Confirmar Asignación" })).toBeDisabled();
    fireEvent.submit(selector.closest("form")!);
    expect(changes()).toEqual([]);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("La cirugía seleccionada no tiene un ID backend válido");
  });

  it.each(["company", "article"])("ignores mutation completion/toasts after %s context changes", async (context) => {
    const write = deferred<Response>();
    writes.set(`PATCH ${selectionPath}`, () => write.promise);
    const view = await openDetail();
    change(`Movimiento de origen ${line}`, "movement-backend");
    fireEvent.click(screen.getByRole("button", { name: `Vincular ${line}` }));
    await waitFor(() => expect(changes()).toHaveLength(1));
    const nextCompany = context === "company" ? "company-next" : company;
    const nextArticle = context === "article" ? "article-next" : article;
    reads.set(`/api/companies/${nextCompany}/stock/physical-units?articleId=${nextArticle}`, () => response([]));
    const count = requests.length;
    view.rerender(<CajasPhysicalUnitsSection companyId={nextCompany} articleId={nextArticle} />);
    await screen.findByText("Todavía no hay unidades físicas registradas para este artículo.");
    await act(async () => write.resolve(response({ id: "accepted-old-context" })));
    expect(mocks.success).not.toHaveBeenCalled(); expect(mocks.error).not.toHaveBeenCalled();
    expect(requests.slice(count).map((r) => r.path)).toEqual([`/api/companies/${nextCompany}/stock/physical-units?articleId=${nextArticle}`]);
    expect(screen.queryByText("Versión de preparación observada: 7")).not.toBeInTheDocument();
  });

  it("ignores an obsolete assignment detail response and its follow-up reads", async () => {
    const old = deferred<Response>();
    reads.set(detailPath, () => old.promise);
    assignments.push({ ...row("assignment-next"), isActive: false });
    reads.set(`${base}/cajas/assignments/assignment-next`, () => response(detail("assignment-next")));
    render(<CajasPhysicalUnitsSection companyId={company} articleId={article} />);
    fireEvent.click(await screen.findByRole("button", { name: "Historial (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver Prep" }));
    await waitFor(() => expect(requests.some((r) => r.path === detailPath)).toBe(true));
    fireEvent.click(screen.getAllByRole("button", { name: "Detalle" })[1]);
    await screen.findByText("Versión de preparación observada: 7");
    const count = requests.length;
    await act(async () => old.resolve(response(detail())));
    expect(requests).toHaveLength(count);
    writes.set(`POST ${base}/cajas/assignments/assignment-next/control`, () => response({ id: "control-next" }));
    fireEvent.click(screen.getByRole("button", { name: "Ejecutar control" }));
    await waitFor(() => expect(changes()).toHaveLength(1));
    expect(changes()[0].path).toContain("assignment-next/control");
    await waitIdle();
  });
});
