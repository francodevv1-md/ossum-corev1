import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AvailabilityRequestActionDialog } from "@/components/notifications/AvailabilityRequestActionDialog";
import type { AvailabilityRequestView } from "@/lib/api/availability-request-client";

const openView: AvailabilityRequestView = {
  id: "request/1",
  companyId: "company/1",
  surgery: { id: "surgery-secret", visibleNumber: "CX-1042" },
  status: "OPEN",
  requestedAt: "2026-07-22T10:00:00.000Z",
  requester: { id: "user-1", displayName: "María Solís" },
  creatorResolution: "not_identified_or_eligible",
  recipientReasonsForActor: ["creator", "pivot"],
  canComplete: true,
  submittedDate: null,
  completedAt: null,
  completedBy: null,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderDialog(props: Partial<React.ComponentProps<typeof AvailabilityRequestActionDialog>> = {}) {
  const onOpenChange = vi.fn();
  const result = render(
    <AvailabilityRequestActionDialog
      open
      companyId="company/1"
      requestId="request/1"
      actorIdentityToken="actor-token-1"
      onOpenChange={onOpenChange}
      {...props}
    />
  );
  return { ...result, onOpenChange };
}

function FocusHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir disponibilidad</button>
      <AvailabilityRequestActionDialog
        open={open}
        companyId="company/1"
        requestId="request/1"
        actorIdentityToken="actor-token-1"
        onOpenChange={setOpen}
      />
    </>
  );
}

describe("AvailabilityRequestActionDialog", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("freshly resolves an encoded candidate before revealing trusted detail", async () => {
    let resolveFetch!: (response: Response) => void;
    const fetch = vi.fn<typeof globalThis.fetch>(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal("fetch", fetch);
    renderDialog();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Informar disponibilidad" })).toHaveFocus();
    expect(fetch.mock.calls[0][0]).toBe("/api/companies/company%2F1/availability-requests/request%2F1");
    expect(screen.getByRole("status")).toHaveTextContent("Cargando solicitud");
    expect(screen.queryByText("CX-1042")).not.toBeInTheDocument();

    await act(async () => resolveFetch(json({ data: openView })));
    expect(await screen.findByText("CX-1042")).toBeInTheDocument();
    expect(screen.getByText("María Solís")).toBeInTheDocument();
    expect(screen.getByText("Creador · PÍVOT")).toBeInTheDocument();
    expect(screen.getByText(/no identificado o no habilitado/i)).toBeInTheDocument();
  });

  it("refreshes committed terminal truth after a stale completion conflict", async () => {
    const completed = {
      ...openView,
      status: "COMPLETED" as const,
      canComplete: false,
      submittedDate: "2026-07-24",
      completedAt: "2026-07-23T12:00:00.000Z",
      completedBy: { id: "user-9", displayName: "Carla Díaz" },
    };
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ data: openView }))
      .mockResolvedValueOnce(json({ error: { code: "availability_request_completed" } }, 409))
      .mockResolvedValueOnce(json({ data: completed }));
    vi.stubGlobal("fetch", fetch);
    renderDialog();
    const input = await screen.findByLabelText("Fecha de disponibilidad del material");
    fireEvent.change(input, { target: { value: "2026-07-25" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    expect(await screen.findByText("24/07/2026")).toBeInTheDocument();
    expect(screen.getByText("Carla Díaz")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("La solicitud ya fue completada");
    expect(fetch.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "POST", "GET"]);
  });

  it("blocks and clears stale detail when terminal refresh loses access", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json({ data: openView }))
      .mockResolvedValueOnce(json({ error: { code: "availability_request_completed" } }, 409))
      .mockResolvedValueOnce(json({ error: { code: "availability_request_not_found" } }, 404)));
    renderDialog();
    const input = await screen.findByLabelText("Fecha de disponibilidad del material");
    fireEvent.change(input, { target: { value: "2026-07-25" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo abrir esta solicitud");
    expect(screen.queryByText("CX-1042")).not.toBeInTheDocument();
  });

  it("rejects an unexpected OPEN refresh without claiming terminal truth", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ data: openView }))
      .mockResolvedValueOnce(json({ error: { code: "availability_request_completed" } }, 409))
      .mockResolvedValueOnce(json({ data: openView }));
    vi.stubGlobal("fetch", fetch);
    renderDialog();
    const input = await screen.findByLabelText("Fecha de disponibilidad del material");
    fireEvent.change(input, { target: { value: "2026-07-25" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
    expect(screen.queryByText("La solicitud ya fue completada")).not.toBeInTheDocument();
    expect(screen.queryByText("CX-1042")).not.toBeInTheDocument();
    expect(fetch.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "POST", "GET"]);
  });

  it("keeps refresh network failure non-terminal and free of stale facts", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ data: openView }))
      .mockResolvedValueOnce(json({ error: { code: "availability_request_completed" } }, 409))
      .mockRejectedValueOnce(new TypeError("offline"));
    vi.stubGlobal("fetch", fetch);
    renderDialog();
    const input = await screen.findByLabelText("Fecha de disponibilidad del material");
    fireEvent.change(input, { target: { value: "2026-07-25" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
    expect(screen.queryByText("La solicitud ya fue completada")).not.toBeInTheDocument();
    expect(screen.queryByText("CX-1042")).not.toBeInTheDocument();
    expect(fetch.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "POST", "GET"]);
  });

  it("retains date, reuses a retry key, rotates it after change, and announces success", async () => {
    const completed = { ...openView, status: "COMPLETED" as const, canComplete: false, submittedDate: "2026-07-25" };
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ data: openView }))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(json({ data: completed }));
    vi.stubGlobal("fetch", fetch);
    renderDialog();
    const input = await screen.findByLabelText("Fecha de disponibilidad del material");

    fireEvent.change(input, { target: { value: "2026-07-24" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
    expect(input).toHaveValue("2026-07-24");
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    const firstKey = new Headers(fetch.mock.calls[1][1].headers).get("Idempotency-Key");
    const retryKey = new Headers(fetch.mock.calls[2][1].headers).get("Idempotency-Key");
    expect(retryKey).toBe(firstKey);

    fireEvent.change(input, { target: { value: "2026-07-25" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Disponibilidad informada");
    const changedKey = new Headers(fetch.mock.calls[3][1].headers).get("Idempotency-Key");
    expect(changedKey).not.toBe(firstKey);
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ date: "2026-07-25" });
  });

  it.each([
    ["terminal", json({ data: { ...openView, status: "COMPLETED", canComplete: false, submittedDate: "2026-07-24" } }), "La solicitud ya fue completada", "status"],
    ["blocked", json({ error: { code: "availability_request_not_found", message: "hidden" } }, 404), "No se pudo abrir esta solicitud", "alert"],
  ])("renders a non-actionable %s outcome", async (_name, response, copy, role) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    renderDialog();
    expect(await screen.findByRole(role)).toHaveTextContent(copy);
    expect(screen.queryByRole("button", { name: "Guardar disponibilidad" })).not.toBeInTheDocument();
  });

  it("shows the approved date-conflict copy and keeps the entered date", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json({ data: openView }))
      .mockResolvedValueOnce(json({ error: { code: "availability_date_already_set" } }, 409)));
    renderDialog();
    const input = await screen.findByLabelText("Fecha de disponibilidad del material");
    fireEvent.change(input, { target: { value: "2026-07-24" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    expect(await screen.findByRole("status")).toHaveTextContent("La fecha ya fue informada");
    expect(input).toHaveValue("2026-07-24");
  });

  it("shows validation safely and associates it with the retained date", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json({ data: openView }))
      .mockResolvedValueOnce(json({ error: { code: "invalid_date", message: "hidden" } }, 400)));
    renderDialog();
    const input = await screen.findByLabelText("Fecha de disponibilidad del material");
    fireEvent.change(input, { target: { value: "2026-07-24" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Revisá la fecha ingresada");
    expect(input).toHaveValue("2026-07-24");
    expect(input).toHaveAttribute("aria-describedby", "availability-request-outcome");
    expect(input).toHaveFocus();
  });

  it("focuses the date input when local submission has no date", async () => {
    const fetch = vi.fn().mockResolvedValue(json({ data: openView }));
    vi.stubGlobal("fetch", fetch);
    renderDialog();
    const input = await screen.findByLabelText("Fecha de disponibilidad del material");
    fireEvent.click(screen.getByRole("button", { name: "Guardar disponibilidad" }));
    expect(input).toHaveFocus();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the opener on Escape without submitting", async () => {
    const fetch = vi.fn().mockResolvedValue(json({ data: openView }));
    vi.stubGlobal("fetch", fetch);
    render(<FocusHarness />);
    const trigger = screen.getByRole("button", { name: "Abrir disponibilidad" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByRole("heading", { name: "Informar disponibilidad" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("closes on context change, ignores late detail, and Escape never submits", async () => {
    let resolveFetch!: (response: Response) => void;
    const fetch = vi.fn<typeof globalThis.fetch>(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal("fetch", fetch);
    const { rerender, onOpenChange } = renderDialog();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    rerender(<AvailabilityRequestActionDialog open companyId="company/2" requestId="request/2" actorIdentityToken="actor-token-2" onOpenChange={onOpenChange} />);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await act(async () => resolveFetch(json({ data: openView })));
    expect(screen.queryByText("CX-1042")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses one live outcome region and the mobile-safe dialog contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ data: openView })));
    renderDialog();
    await screen.findByLabelText("Fecha de disponibilidad del material");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-h-[calc(100dvh-2rem)]", "overflow-hidden");
    expect(dialog.querySelector(".overflow-x-hidden")).toBeTruthy();
    expect(screen.getByLabelText("Fecha de disponibilidad del material")).toHaveAttribute("type", "date");
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "Guardar disponibilidad" })).toHaveClass("min-h-11");
    expect(dialog.innerHTML).toContain("env(safe-area-inset-bottom)");
  });
});
