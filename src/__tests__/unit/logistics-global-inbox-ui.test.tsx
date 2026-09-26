import { fireEvent, render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

import { buildLogisticsInboxUrl } from "@/hooks/useLogisticsGlobalInbox"

const mocks = vi.hoisted(() => ({ hook: vi.fn(), refresh: vi.fn(), loadMore: vi.fn() }))
vi.mock("@/hooks/useLogisticsGlobalInbox", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/hooks/useLogisticsGlobalInbox")>()), useLogisticsGlobalInbox: mocks.hook }))
vi.mock("@/components/expediente/LogisticsOperationsWorkspace", () => ({ LogisticsOperationsWorkspace: ({ surgeryId }: { surgeryId: string }) => <p>Detalle operativo {surgeryId}</p> }))

import { LogisticsGlobalInbox, statusLabel } from "@/components/logistica/LogisticsGlobalInbox"

const item = { surgery: { reference: "CX-2041", date: "2026-09-10T00:00:00.000Z", patient: "Ana Pérez", doctor: "Dra. García", client: "Obra Social Central", institution: "Hospital Central", institutionId: "institution-hidden", locality: "Rosario", surgeryStatus: "scheduled", preparationStatus: "ready", logisticsStatus: "En_transito", priority: "urgent" }, logistics: { availability: "available" as const, stages: ["dispatch"], cajas: [{ reference: "Caja trauma" }], materials: { count: 3, availability: "available" }, quantities: { expected: "4", assigned: "4", dispatched: "3", consumed: "1", returned: "1", pending: "1", quarantine: "0" }, indicators: { prepare: "ready", dispatch: "pending", receive: "unavailable" }, blockers: { count: 2, highest: "missing_trace" }, differences: { open: 1, closed: 0 }, alerts: { count: 1, highest: "pending_identification" }, exceptions: { count: 4, highest: "blocker" }, lastNovelty: { label: "Remito en tránsito", at: "2026-09-09T10:00:00.000Z", responsible: "Ana Operadora" }, nextAction: "Verificar entrega" } }

describe("Logistics global inbox UI", () => {
  it("constructs only the Inbox GET URL with validated filter names and cursor", () => {
    const url = buildLogisticsInboxUrl("company/a", { q: "Ana", institutionId: "institution-hidden", hasBlockers: true, logisticsStatus: "En_transito" }, "next-cursor")
    expect(url).toContain("/api/companies/company%2Fa/logistics/inbox?")
    expect(url).toContain("institutionId=institution-hidden")
    expect(url).toContain("cursor=next-cursor")
  })

  it("keeps the logistics surface read-only and free of legacy local authority", () => {
    const page = readFileSync("src/app/logistica/page.tsx", "utf8")
    const hook = readFileSync("src/hooks/useLogisticsGlobalInbox.ts", "utf8")
    expect(`${page}\n${hook}`).not.toMatch(/useOrtoTrackStore|@\/lib\/store|localStorage|method:\s*["'](?:POST|PATCH|PUT|DELETE)/i)
    expect(hook).toContain("/logistics/inbox?")
  })

  it("keeps the 1024px filter grid within the usable width beside the sidebar", () => {
    const inbox = readFileSync("src/components/logistica/LogisticsGlobalInbox.tsx", "utf8")
    expect(inbox).toContain("lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5")
    expect(inbox).toContain('placeholder="Buscar cirugía o paciente"')
  })

  it.each([
    ["unauthorized", "No disponible"], ["frozen with missing", "Congelada con faltantes"], ["frozen_with_missing", "Congelada con faltantes"], ["shipped", "Enviado"], ["preparing", "En preparación"], ["delivered", "Entregado"], ["returned", "Devuelto"], ["finalized", "Finalizado"],
  ])("maps raw %s to the operational label %s", (raw, expected) => {
    expect(statusLabel(raw)).toBe(expected)
  })

  it("renders the normalized preparation badge label instead of the raw API value", () => {
    mocks.hook.mockReturnValue({ data: { counts: { news: 0, urgent: 0, overdue: null, exceptions: 0 }, items: [{ ...item, surgery: { ...item.surgery, preparationStatus: "frozen with missing" } }], page: { hasMore: false, nextCursor: null } }, loading: false, refreshing: false, loadingMore: false, error: null, ready: true, hasCompany: true, refresh: mocks.refresh, loadMore: mocks.loadMore })
    render(<LogisticsGlobalInbox />)
    expect(screen.getAllByText("Congelada con faltantes")).not.toHaveLength(0)
    expect(screen.queryByText("frozen with missing")).not.toBeInTheDocument()
  })

  it("renders the approved Inbox hierarchy without permanent secondary facts", () => {
    mocks.hook.mockReturnValue({ data: { counts: { news: 0, urgent: 0, overdue: null, exceptions: 4 }, items: [item], page: { hasMore: false, nextCursor: null } }, loading: false, refreshing: false, loadingMore: false, error: null, ready: true, hasCompany: true, refresh: mocks.refresh, loadMore: mocks.loadMore })
    render(<LogisticsGlobalInbox />)
    for (const text of ["CX-2041", "Hospital Central", "2 bloqueos · 1 diferencia · 1 alerta", "Verificar entrega"]) expect(screen.getAllByText(text)).not.toHaveLength(0)
    expect(screen.queryByText("Obra Social Central")).not.toBeInTheDocument()
    expect(screen.queryByText("Caja trauma")).not.toBeInTheDocument()
  })

  it("renders separate state dimensions, resets filters, paginates, and keeps IDs out of visible UI", () => {
    mocks.hook.mockReturnValue({ data: { counts: { news: 1, urgent: 1, overdue: null, exceptions: 0 }, items: [item], page: { hasMore: true, nextCursor: "cursor" } }, loading: false, refreshing: false, loadingMore: false, error: null, ready: true, hasCompany: true, refresh: mocks.refresh, loadMore: mocks.loadMore })
    render(<LogisticsGlobalInbox />)
    expect(screen.getAllByText("CX-2041")).not.toHaveLength(0)
    expect(screen.getAllByText("Programada")).not.toHaveLength(0)
    expect(screen.getAllByText("Lista")).not.toHaveLength(0)
    expect(screen.getAllByText("En tránsito")).not.toHaveLength(0)
    expect(screen.queryByText("institution-hidden")).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Buscar cirugía, paciente o institución"), { target: { value: "Ana" } })
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }))
    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }))
    expect(mocks.loadMore).toHaveBeenCalledTimes(1)
    expect(mocks.hook.mock.calls.at(-1)?.[0]).toEqual({})
  })

  it("opens the operational detail from the Inbox with the server-projected surgery ID", () => {
    const detailItem = { ...item, surgery: { ...item.surgery, id: "surgery-2041" } }
    mocks.hook.mockReturnValue({ data: { counts: { news: 0, urgent: 0, overdue: null, exceptions: 0 }, items: [detailItem], page: { hasMore: false, nextCursor: null } }, loading: false, refreshing: false, loadingMore: false, error: null, ready: true, hasCompany: true, companyId: "company-1", refresh: mocks.refresh, loadMore: mocks.loadMore })
    render(<LogisticsGlobalInbox />)
    const row = screen.getAllByRole("row").find((element) => element.textContent?.includes("CX-2041"))!
    expect(row).not.toHaveAttribute("tabindex")
    expect(row).not.toHaveAttribute("aria-label")
    fireEvent.click(screen.getAllByRole("button", { name: "Abrir detalle de CX-2041" })[0])
    expect(screen.getByText("Detalle operativo surgery-2041")).toBeInTheDocument()
  })

  it("keeps secondary filters in an accessible disclosure without clearing an active filter", () => {
    mocks.hook.mockReturnValue({ data: { counts: { news: 0, urgent: 0, overdue: null, exceptions: 0 }, items: [item], page: { hasMore: false, nextCursor: null } }, loading: false, refreshing: false, loadingMore: false, error: null, ready: true, hasCompany: true, refresh: mocks.refresh, loadMore: mocks.loadMore })
    render(<LogisticsGlobalInbox />)
    fireEvent.change(screen.getByLabelText("Preparación"), { target: { value: "ready" } })
    const disclosure = screen.getByText("Más filtros").closest("details")!
    expect(disclosure.open).toBe(false)
    fireEvent.click(screen.getByText("Más filtros"))
    expect(disclosure.open).toBe(true)
    expect(screen.getByLabelText("Institución")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Más filtros"))
    expect(mocks.hook.mock.calls.at(-1)?.[0]).toMatchObject({ prepStatus: "ready" })
  })

  it("uses explicit direct-open controls for the responsive card", () => {
    const detailItem = { ...item, surgery: { ...item.surgery, id: "surgery-2041" } }
    mocks.hook.mockReturnValue({ data: { counts: { news: 0, urgent: 0, overdue: null, exceptions: 0 }, items: [detailItem], page: { hasMore: false, nextCursor: null } }, loading: false, refreshing: false, loadingMore: false, error: null, ready: true, hasCompany: true, companyId: "company-1", refresh: mocks.refresh, loadMore: mocks.loadMore })
    render(<LogisticsGlobalInbox />)
    fireEvent.click(screen.getAllByRole("button", { name: "Abrir detalle de CX-2041" }).at(-1)!)
    expect(screen.getByText("Detalle operativo surgery-2041")).toBeInTheDocument()
  })
})
